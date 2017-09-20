"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var request = require('request');
var config = require('../config')
var async = require('async');

class PlayerProfileService {
    appendActivityPlayersCharacterInformation(activityMatchModel, doneFn){
        async.each(activityMatchModel.entries, function(player, next){
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
                        player.characterInfo = jsonBody.Response.characters.data[player.characterId];
                    }
                }
                next();
            });
        }, function(err){
            doneFn(err, activityMatchModel);
        });
    };

}
exports.PlayerProfileService = new PlayerProfileService();