const fs = require("fs");
const Docxtemplater = require("docxtemplater");
const https = require("https");
const http = require("http");
const Stream = require("stream").Transform;
const ImageModule = require("docxtemplater-image-module");
const PizZip = require("pizzip");

const content = fs.readFileSync("demo_template.docx");

const data = { image: "https://docxtemplater.com/xt-pro.png" };

const imageOpts = {
    getImage: function (tagValue, tagName) {
        console.log(tagValue, tagName);
        const base64Value = base64Parser(tagValue);
        if (base64Value) {
            return base64Value;
        }
        // tagValue is "https://docxtemplater.com/xt-pro-white.png"
        // tagName is "image"
        return new Promise(function (resolve, reject) {
            getHttpData(tagValue, function (err, data) {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        });
    },
    getSize: function (img, tagValue, tagName) {
        console.log(tagValue, tagName);
        // img is the value that was returned by getImage
        // This is to force the width to 600px, but keep the same aspect ratio
        const sizeOf = require("image-size");
        const sizeObj = sizeOf(img);
        console.log(sizeObj);
        const forceWidth = 600;
        const ratio = forceWidth / sizeObj.width;
        return [
            forceWidth,
            // calculate height taking into account aspect ratio
            Math.round(sizeObj.height * ratio),
        ];
    },
};

const zip = new PizZip(content);
const doc = new Docxtemplater(zip, {
    modules: [new ImageModule(imageOpts)],
});

doc.renderAsync(data)
    .then(function () {
        const buffer = doc.getZip().generate({
            type: "nodebuffer",
            compression: "DEFLATE",
        });

        fs.writeFileSync("test.docx", buffer);
        console.log("rendered");
    })
    .catch(function (error) {
        console.log("An error occured", error);
    });

function getHttpData(url, callback) {
    (url.substr(0, 5) === "https" ? https : http)
        .request(url, function (response) {
            if (response.statusCode !== 200) {
                return callback(
                    new Error(
                        `Request to ${url} failed, status code: ${response.statusCode}`
                    )
                );
            }

            const data = new Stream();
            response.on("data", function (chunk) {
                data.push(chunk);
            });
            response.on("end", function () {
                callback(null, data.read());
            });
            response.on("error", function (e) {
                callback(e);
            });
        })
        .end();
}
