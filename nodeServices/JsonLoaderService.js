"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require('fs');
var config = require('../config');

class JsonLoaderService {
    GetJson(filePath, doneFn){
        var rawJson = "";
        var parsedJson = {};
        if (fs.existsSync(filePath)) {
            var readableStream = fs.createReadStream(filePath);
            readableStream.on('data', function (chunk) {
                rawJson += chunk.toString();
            });

            readableStream.on('end', function () {
                try {
                    parsedJson = JSON.parse(rawJson);
                }
                catch (e) {
                    console.log(e);
                }
                doneFn(null, parsedJson);
            });
        } else {
            doneFn("File " + filePath + " was not found!");
        }
    }

    WriteJson(filePath, content, doneFn){
        fs.writeFile(filePath, JSON.stringify(content), 'utf8', function (err) {
            if (err) {
                return console.log(err);
            }
        
            doneFn(err, filePath + " was saved!")
        });
    }
}
exports.JsonLoaderService = new JsonLoaderService();