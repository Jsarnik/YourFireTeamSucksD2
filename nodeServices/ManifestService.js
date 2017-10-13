"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var request = require('request');
var fs = require('fs');
var sqlite = require('sqlite3').verbose();
var SZIP = require('node-stream-zip'); //use this
var config = require('../config');
var jsonLoaderService = require('./JsonLoaderService');
var path = require('path');
var async = require('async');

var manifestConfigPath = path.join(__dirname, "../manifests/manifestConfig.json");
var manifestConfig = null;

class ManifestService {
    //makes a request to the destiny manifest endpoint and 
    //extracts it to the current directory as 'manifest.content'
    //@manifest.zip: this is the compressed manifest downloaded from the destiny man endpoint
    //@manifest.content: uncompressed manifest sqlite file which can be queried

    initialize(){
        var instance = this;
        if(!manifestConfig){
            jsonLoaderService.JsonLoaderService.GetJson(manifestConfigPath, function(err, obj){
                manifestConfig = obj;
                instance.checkManifestData();
            });
        }else{
            instance.checkManifestData();
        }
    }
    
    checkManifestData(){
        var instance = this;
        var manifestPath = path.join(__dirname, "../manifests", "world.content");
        var modelsDirPath = path.join(__dirname, "../models");

        if(!fs.existsSync(modelsDirPath)){
            fs.mkdirSync(modelsDirPath);
        };

        if(!fs.existsSync(manifestPath)){
            instance.getManifests(function(err, response){
                if(err){
                    console.log(err);
                }else{
                    console.log(response.message);
                }
            });
        }else{
            instance.checkJsonManifestObjects('world.content', false, function(err, response){
                if(err){
                    console.log(err);
                }else{
                    console.log(response.message);
                }
            });
        };
    }

    checkManifestVersion(doneFn){
        if(!manifestConfig){
            jsonLoaderService.JsonLoaderService.GetJson(manifestConfigPath, function(err, obj){
                manifestConfig = obj;
            });
        };

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

            if(jsonBody && manifestConfig && (manifestConfig.version != jsonBody.Response.version)){
                manifestConfig = jsonBody.Response;
                fs.writeFile(manifestConfigPath, JSON.stringify(manifestConfig), 'utf8', function (err) {
                    if (err) {
                        return console.log(err);
                    }
                
                    console.log("manifest config was saved!");
                });
                this.getManifests(function(err, response){
                    doneFn(err, response);
                });
            }else{
                doneFn(err, {updated: false, message: 'Manifests up-to-date'});
            }
        });
    }

    getManifests(doneFn){
        var instance = this;
        //the urls are hard coded for simplicity's sake
        var man = 'https://www.bungie.net/';
        var en = manifestConfig.mobileWorldContentPaths.en;

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
                    if(!err){
                        instance.checkJsonManifestObjects('world.content', true, function(err, response){
                            doneFn(err, response);
                        });
                    }else{
                        doneFn(err, response);              
                    }                      
                });
            });
        });
    };

    checkJsonManifestObjects(manifest, updateIfExists, doneFn){
        var instance = this;
        var queryString = "Select name from sqlite_master";
        var manifest = 'world.content';
        var failed = [];
        var skipped = [];
        var tableCount = 0;
        instance.queryManifest(manifest, queryString, function(err, tableArray){
            async.each(tableArray, function(table, next){
                tableCount ++;
                instance.createJsonFromManifest(manifest, table.name, updateIfExists, function(err, response){
                    if(err){
                        console.log(err);
                        failed.push(table.name);
                    }
                    if(response.skipped){
                        skipped.push(table.name);
                    }
                    next();
                });
            }, function(err){
                var message = "Manifest Objects Created: " + (tableCount - skipped.length - failed.length) + "; skipped: " +  skipped.length + "; failed: " + failed.length + ";";
                doneFn(err, {message: message, skipped: skipped, failed: failed});
            });
        });
    }

    createJsonFromManifest(manifest, tableName, updateIfExists, doneFn){
        var qstring = "Select json from " + tableName;
        var tableObject = {};
        tableObject[tableName] = {};
        this.queryManifest(manifest, qstring, function(err, tableRows){
            tableRows.forEach(function(row){
                try{
                    row = JSON.parse(row.json);
                    if(row.hash && !tableObject[tableName][row.hash]){
                        tableObject[tableName][row.hash] = {};
                        tableObject[tableName][row.hash] = row;
                    }                            
                }
                catch(e){
                    console.log(e);
                }
            });
            
            var modelsDirPath = path.join(__dirname, "../models");
            var filePath = path.join(modelsDirPath, tableName+".json");

            if(!fs.existsSync(modelsDirPath)){
                fs.mkdirSync(modelsDirPath);
            }

            if(!fs.existsSync(filePath) || (fs.existsSync(filePath) && updateIfExists)){
                jsonLoaderService.JsonLoaderService.WriteJson(filePath, tableObject, function(err, response){
                    if(err){
                        console.log(err);
                    }
                    doneFn(err, response);
                });
            }else{
                doneFn(null, {skipped: true});
            }
        });
    }

    //queries manifes.content, can be modified to accept parameters
    //mostly just to demo that this can use the .content file 
    //as a sqlite db for queries
    queryManifest(manifest, query, nextFn){
        var db = new sqlite.Database('./manifests/' + manifest);
        var results = [];

        db.serialize(function(){
            db.each(query, function(err, row){
                try{
                    results.push(row);
                }catch(e){
                    console.log('ManifestService: line 100: ' + e);
                }
            }, function(err){
                db.close(); //closing connection
                nextFn(err, results);
            });
        });
    }
}
exports.ManifestService = new ManifestService();