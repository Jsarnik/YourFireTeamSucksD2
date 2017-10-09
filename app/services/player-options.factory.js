angular.module('fireTeam.common')
	.factory('PlayerOptionsService', ['BaseHttpService', function (baseHttpService) {
    'use strict';

    return {
        getUpdatedManifest: baseHttpService.get.bind(this, '../api/getUpdatedManifest'),
        getMembershipId: baseHttpService.get.bind(this, '../api/getMembershipIdByUserName'),
        getBaseCharacterInfo: baseHttpService.get.bind(this, '../api/getCharacterInfoByMembershipId'),
        getCharacterStatsData: baseHttpService.get.bind(this, '../api/getCharacterStatsById'),
        getCharacterActivityHistoryData: baseHttpService.post.bind(this, '../api/getCharacterActivityHistoryData'),
        getPlayerActivityHistoryData: baseHttpService.get.bind(this, '../api/getPlayerActivityHistoryData'),
        getPostGameCarnageReport: baseHttpService.get.bind(this, '../api/getPostGameCarnageReport'),
        getWeaponDefinitionById: baseHttpService.get.bind(this, '../api/getWeaponDefinitionById'),
        getCharacterInfoDetails: baseHttpService.get.bind(this, '../api/getCharacterInfoDetails'),
    };
}]);