"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var request = require('request');
var config = require('../config')
var async = require('async');
var manifestService = require('./ManifestService');

class ItemsService {
    getItems(membershipId, itemsArray, doneFn){
        var instance = this;
        var itemsResultObject = {};

        instance.LookupItemsStats(membershipId, itemsArray, function(err, itemsData){
            doneFn(err, itemsData);
        });

    };

    LookupItemsStats(membershipId, itemsArray, doneFn){
        var instance = this;
        async.each(itemsArray, function(item, next){
            var options = {
                url: "https://www.bungie.net/Platform/Destiny2/2/Profile/"+membershipId+"/Item/"+item.itemInstanceId+"/?components=300,302,304,305",
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': config.default.credentials.apiKey
                }
            };
            request.get(options, (err, resp, body) => {
                if (!err){
                    var jsonBody = null;
                    try{
                        jsonBody = JSON.parse(body);
                    }catch(e){
                        console.log(e);
                    }
                    
                    if (jsonBody && jsonBody.Response && jsonBody.Response){
                        item.instancedData = jsonBody.Response;
                    }

                    instance.QueryManifestForItemDescription(item.itemHash, function(err, queryResults){
                        item.instancedData.description = queryResults;
                        if(item.instancedData.perks){
                            instance.QueryManifestForItemPerks(item.instancedData.perks, function(err, perksResults){
                                item.instancedData.perks = perksResults;
                                instance.QueryManifestForItemStats(item.instancedData.stats, function(err, statsResults){
                                    item.instancedData.stats = statsResults;
                                    next();
                                });
                            });
                        }else if(item.instancedData.stats){
                            instance.QueryManifestForItemStats(item.instancedData.stats, function(err, statsResults){
                                item.instancedData.stats = statsResults;  
                                next();
                            });
                        }
                        else{
                            next();
                        }
                    });
                }else{
                    next();
                }
            });
        }, function(err){
            doneFn(err, itemsArray);
        });
    }


    QueryManifestForItemPerks(perks, doneFn){
        if(perks.data && perks.data.perks && perks.data.perks && perks.data.perks.length > 0){
            async.each(perks.data.perks, function(perk, next){
                if(perk.visible == true){
                    var queryString = "SELECT DISTINCT json FROM DestinySandboxPerkDefinition WHERE json LIKE '%" + perk.perkHash + "%'";
                    manifestService.ManifestService.queryManifest('world.content', queryString, function(err, data){
                            perk.displayProperties = data[0].displayProperties;
                            next();
                        });
                }else{
                    next();
                }
            },
            function(err){
                doneFn(err, perks);
            });
        }else{
            doneFn(null, perks);
        }
        
    };

    QueryManifestForItemStats(stats, doneFn){
        if(stats.data && stats.data.stats && stats.data.stats){
            async.each(stats.data.stats, function(stat, next){
                var queryString = "SELECT DISTINCT json FROM DestinyStatDefinition WHERE json LIKE '%" + stat.statHash + "%'";
                manifestService.ManifestService.queryManifest('world.content', queryString, function(err, data){
                    stat.displayProperties = data[0].displayProperties;
                    next();
                });
            },
            function(err){
                doneFn(err, stats);
            });
        }else{
            doneFn(null, stats);
        }
    }

    QueryManifestForItemDescription(itemHash, doneFn){
        var queryString = "SELECT DISTINCT json FROM DestinyInventoryItemDefinition WHERE json LIKE '%" + itemHash + "%' ";
        manifestService.ManifestService.queryManifest('world.content', queryString, function(err, data){
            var itemDetailsResult = data;
            doneFn(null, itemDetailsResult);
        });
    }
}
exports.ItemsService = new ItemsService();