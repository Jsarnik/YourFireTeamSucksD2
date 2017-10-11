"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var request = require('request');
var config = require('../config')
var async = require('async');
var appCache = require('./AppCache');

class PlayerProfileService {
    appendActivityPlayersCharacterInformation(activityMatchModel, doneFn){
        var instance = this;
        async.each(activityMatchModel.entries, function(player, next){
            var cacheKey = instance.getCacheKey(player.player.destinyUserInfo.membershipId);
            appCache.AppCache.Get(cacheKey, function(err, cachedPlayerInfo){
                if(!err && cachedPlayerInfo){
                    player.characterInfo = cachedPlayerInfo[player.characterId];
                    next();
                }else{
                    instance.characterInfoRequest(player, function(err, characterInfo){
                        player.characterInfo = characterInfo;
                        if(!err){
                            appCache.AppCache.Set(cacheKey, characterInfo, 3600, (err, data) => { });
                        }
                        next();
                    });
                }
            });
        }, function(err){
            doneFn(err, activityMatchModel);
        });
    };

    characterInfoRequest(player, nextFn){
        var characterInfo = {};
        var requestUrl = config.default.destiny2_host + config.default.credentials.defaultMemberType + '/Profile/' + player.player.destinyUserInfo.membershipId + '/?components=100,200';
        var options = {
            url: requestUrl,
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
                if (jsonBody && jsonBody.Response && jsonBody.Response.characters && jsonBody.Response.characters.data[player.characterId]){
                    characterInfo = jsonBody.Response.characters.data[player.characterId];
                }
            }
            nextFn(err, characterInfo);
        });
    }

    getCacheKey(membershipId) {
        return "profile_" + membershipId;
    }

}
exports.PlayerProfileService = new PlayerProfileService();