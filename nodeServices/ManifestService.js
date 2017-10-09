"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var request = require('request');
var fs = require('fs');
var sqlite = require('sqlite3').verbose();
var SZIP = require('node-stream-zip'); //use this
var config = require('../config');
var manifestConfig = require('../manifests/manifestConfig');

class ManifestService {
    //makes a request to the destiny manifest endpoint and 
    //extracts it to the current directory as 'manifest.content'
    //@manifest.zip: this is the compressed manifest downloaded from the destiny man endpoint
    //@manifest.content: uncompressed manifest sqlite file which can be queried

    checkManifestVersion(doneFn){
        var options = {
            url: 'https://www.bungie.net/Platform/Destiny2/Manifest',
            port: 443,
            method: 'GET',
            encoding: null,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config.default.credentials.apiKey
            }
        };

        request.get(options, (err, resp, body) => {
            var jsonBody = null; 
            try{
                jsonBody = JSON.parse(body);
            }
            catch(e){
                console.log('failed to parse manifest request');
            }
            if(jsonBody && (manifestConfig.default.version != jsonBody.Response.version)){
                manifestConfig.default = jsonBody.Response;
                this.getManifests(function(err, response){
                    doneFn(err, response);
                });
            }else{
                doneFn(err, {success: 'Manifests up-to-date'});
            }
        });
    }

    getManifests(doneFn){
        var instance = this;
        //the urls are hard coded for simplicity's sake
        var man = 'https://www.bungie.net/';
        var en = manifestConfig.default.mobileWorldContentPaths.en;

        //this is the entry name for the english manifest
        //contained in the zip file that we need to extract
        var en_path = en.split('/')[en.split('/').length-1];

        var options = {
            url: man + en,
            port: 443,
            method: 'GET',
            encoding: null,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config.default.credentials.apiKey
            }
        };

        var outStream = fs.createWriteStream('manifests/world.zip');

        request(options)
        .on('response', function(res, body){
            console.log(res.statusCode);
        }).pipe(outStream)
        .on('finish', function(){
            var zip = new SZIP({
                file: './manifests/world.zip',
                storeEntries: true
            });

            zip.on('ready', function(){
                zip.extract(en_path, './manifests/world.content', function(err, count){
                    doneFn(err, {success: 'Manifests up-to-date'});
                });
            });
        });
    };

    //queries manifes.content, can be modified to accept parameters
    //mostly just to demo that this can use the .content file 
    //as a sqlite db for queries
    queryManifest(manifest, query, nextFn){
        var db = new sqlite.Database('./manifests/' + manifest);
        var results = [];

        db.serialize(function(){
            db.each(query, function(err, row){
                try{
                    results.push(JSON.parse(row.json));
                }catch(e){
                    console.log(e);
                }
            }, function(err){
                db.close(); //closing connection
                nextFn(err, results);
            });
        });
    }
}
exports.ManifestService = new ManifestService();