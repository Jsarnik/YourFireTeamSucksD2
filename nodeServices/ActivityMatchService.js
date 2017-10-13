"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var request = require('request');
var config = require('../config')
var async = require('async');
var manifestService = require('./ManifestService');
var playerProfile = require('./PlayerProfileService');
var jsonLoaderService = require('./JsonLoaderService');
var path = require('path');

var startSeconds;

class ActivityMatchService {
    getActivities(activitySearchOptions, doneFn){
        startSeconds = new Date().getTime() / 1000;
        var instance = this;
        var memberLookups = [];

        activitySearchOptions.activityMembers.forEach(function(member) {
            member.characterIds.forEach(function(charId) {
                var url = config.default.destiny2_host + 
                config.default.credentials.defaultMemberType + '/Account/' + 
                member.membershipId + '/Character/' + 
                charId + '/Stats/Activities/' + 
                '?mode=' + activitySearchOptions.mode + '&page=' + activitySearchOptions.page;

                var characterLookup = {
                    memberId: member.membershipId,
                    characterId: charId,
                    apiEndpoint: url
                }
                memberLookups.push(characterLookup);
            });
        });

        this.sendActivityRequestPerCharacter(memberLookups, function(activityListResults){
            var timeStamp = new Date().getTime() / 1000;
            console.log('sendActivityRequestPerCharacter Response:' + (timeStamp - startSeconds));


            if(!activityListResults || activityListResults.length < 1){
                doneFn(null, activityListResults);
                return;
            }
            var matchResults = instance.compareMemberActivityInstances(activityListResults);
            instance.getPostGameCarnageReport(matchResults, function(err, activityPostGameCarnageResults){
                var timeStamp = new Date().getTime() / 1000;
                console.log('getPostGameCarnageReport Response:' + (timeStamp - startSeconds));
                instance.getActivityDefinitions(activityPostGameCarnageResults, function(err, activityMatchResults){
                    var timeStamp = new Date().getTime() / 1000;
                    console.log('getActivityDefinitions Response:' + (timeStamp - startSeconds));
                    var response = {
                        activityMatchListResults: activityMatchResults
                    };
                    doneFn(err, response);
                });  
            });
        });
    };

    sendActivityRequestPerCharacter(requests, doneFn){
        var activityList = [];
        var membersActivities = {};
        async.each(requests, function(req, next){

            if(!membersActivities[req.memberId]){
                membersActivities[req.memberId] = [];
            }

            var options = {
                url: req.apiEndpoint,
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
                    
                    if (jsonBody && jsonBody.Response && jsonBody.Response.activities){
                        jsonBody.Response.activities.forEach(function(activity){
                            activity.characterId = req.characterId
                            membersActivities[req.memberId].push(activity);
                        });
                    }
                }
                next();
            });
        }, function(err){
            for (var key in membersActivities) {
                activityList.push(membersActivities[key]);
            }
            doneFn(activityList);
        });
    }

    compareMemberActivityInstances(memberActivitiesObjectArray){
        var checkArray = memberActivitiesObjectArray[0];
        var matchArray = [];

        for (var i = 0; i < checkArray.length; i++){
            var activity = checkArray[i];
            var instanceId = activity.activityDetails.instanceId;
            var activityIncludesAllMembers = true;

            async.each(memberActivitiesObjectArray, function(membersActivities, next){
                activityIncludesAllMembers = recursiveInstanceMatch(instanceId, membersActivities);
                next();
            }, function(err){
                if(activityIncludesAllMembers){
                    matchArray.push(instanceId);
                }
            });
        }

        return matchArray;     

        function recursiveInstanceMatch(val, memberActivitiesObjectArray){
            var exists = false;
        
            memberActivitiesObjectArray.forEach(function(activity){
                if(activity.activityDetails.instanceId === val){
                    exists = true;
                }
            });
            return exists;
        }
    }

    getPostGameCarnageReport(matchesInstancesArray, doneFn){
        var activityPostGameCarnageResults = [];

        async.each(matchesInstancesArray, function(instanceId, next){   
            var options = {
                url: 'https://www.bungie.net/Platform/Destiny2/Stats/PostGameCarnageReport/' + instanceId,
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
                        console.log('activityMatchService: line 151: ' + e)
                    }
                    if(jsonBody && jsonBody.Response){
                        playerProfile.PlayerProfileService.appendActivityPlayersCharacterInformation(jsonBody.Response, function(err, activityDetailsWithCharacterProfiles){
                            activityPostGameCarnageResults.push(activityDetailsWithCharacterProfiles);
                            next();
                        });
                    }else{
                        next();
                    }
                }
            });
        }, function(err){
            doneFn(err, activityPostGameCarnageResults);
        });
    }

    getActivityDefinitions(activityMatchList, nextFn){
        if(!activityMatchList || activityMatchList == undefined || activityMatchList == 'undefined' || activityMatchList.length < 1){
            nextFn(null, activityMatchList); return;
        };

        var DestinyActivityDefinitionTable = {};
        var tableJsonPath = path.join(__dirname, '../models/DestinyActivityDefinition.json');
        jsonLoaderService.JsonLoaderService.GetJson(tableJsonPath, function(err, obj){
            DestinyActivityDefinitionTable = obj.DestinyActivityDefinition;
            activityMatchList.forEach(function(activity){
                var hashId = activity.activityDetails.referenceId;
                var definition = {};

                if(DestinyActivityDefinitionTable[hashId]){
                    definition = DestinyActivityDefinitionTable[hashId];
                };
                
                activity.definitions = definition;
            });
            nextFn(null, activityMatchList); 
        });
    }
}
exports.ActivityMatchService = new ActivityMatchService();