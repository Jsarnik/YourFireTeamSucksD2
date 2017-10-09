angular.module('fireTeam.common')
	.factory('CharacterModelFactory', ['$q','PlayerOptionsService', function ($q, playerOptionsService) {
    'use strict';

    var currentDeferred;
	var characaterModel;
	var progress = 0;
	var characterPromises;

	var characterModelObject = {
		getCharacterInformationById: function(characterOptions) {
			return getCharacterInformationById(characterOptions);
		},
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
		clear: clearCharacterModel
	};

	function clearCharacterModel() {
		characaterModel = null;
	}

	function getCharacterInformationById(characterOptions) {
		var deferred = currentDeferred = $q.defer();

		playerOptionsService.getCharacterInfoDetails(characterOptions).then(function (response) {	
			if(response.ErrorCode && response.ErrorCode > 1){
				deferred.resolve(response);
				return deferred.promise;
			}

			deferred.resolve(response);
			
		});
		return deferred.promise;
	};	

	return characterModelObject;
}]);