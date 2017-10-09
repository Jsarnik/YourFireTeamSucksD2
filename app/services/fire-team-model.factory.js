angular.module('fireTeam.common')
	.factory('FireTeamModelFactory', ['$q','PlayerOptionsService', function ($q, playerOptionsService) {
    'use strict';

	var fireTeamModel, playerPromises, currentDeferred;

	var fireTeamModelObject = {
		getFireTeam: function(fireTeamOptions) {
			return $q.when(fireTeamModel || playerPromises || getFireTeamMembers(fireTeamOptions));
		},
		clear: clear,
		cancelAllPromises: function(){
			if(currentDeferred){
				currentDeferred.resolve({Message: 'user cancelled'});
			}
			else{
				currentDeferred = $q.defer();
				currentDeferred.resolve({Message: 'nothing to resolve'});
			}

			return currentDeferred.promise;
		},
	};	

	function clear() {
		fireTeamModel = null;
		playerPromises = null;
	}

	function getFireTeamMembers(options) {
		var deferred = currentDeferred = $q.defer();
		var playerPromises = [];

		angular.forEach(options.userNames, function(user){
			if(user.displayName && user.displayName !== ''){
				playerPromises.push(getPlayerData(options.memberType, user.displayName));
			}
		});

		return fireTeamModel = $q.all(playerPromises);
	};

    function getPlayerData(memberType, userName) {
		var deferred = currentDeferred = $q.defer();
		playerOptionsService.getMembershipId({memberType: memberType, userName: userName}).then(function (response) {	
			var membershipModel = response;

			if (!membershipModel || membershipModel.ErrorCode){
				var customErrorResponse = {
					ErrorCode: 101,
					Error: "Could not find player: " + userName
				};
				deferred.resolve(customErrorResponse);
				return deferred.promise;
			}

			playerOptionsService.getBaseCharacterInfo({membershipId: response.membershipId}).then(function (response) {
				if(response.ErrorCode > 1){
					deferred.resolve(response);
					return deferred.promise;
				}

				response = response.Response;
				response.membershipInfo = membershipModel;

				deferred.resolve(response);
			});
		}, function (error){
			deferred.resolve(error);
			return deferred.promise;
		});
		return deferred.promise;
	};

	function getBaseCharacterInfo(membershipId){
		playerOptionsService.getBaseCharacterInfo({membershipId: membershipId}).then(function (response) {	
			return response.Response.data;
		});
	};		

	return fireTeamModelObject;
}]);