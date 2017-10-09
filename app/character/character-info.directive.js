angular
	.module('fireTeam.common')
	.controller('characterInfoCtrl', characterInfoCtrl)
	.directive('characterInfo', characterInfo);

	characterInfo.$inject = ['$rootScope', '$timeout', '$window', '$filter'];

	function characterInfo($rootScope, $timeout, $window, $filter) {
		return {
			restrict: 'E',
			scope: {},
			templateUrl: '/character/character-info.html',
			controller: characterInfoCtrl,
			controllerAs: 'ctrl',
			transclude: true,
			replace: true,
			link: function(scope, element, attrs, ctrl){	
				
			}
		};
};

characterInfoCtrl.$inject = ['$rootScope', '$scope', '$state', 'CharacterModelFactory'];

function characterInfoCtrl($rootScope, $scope, $state, characterModelFactory){
	var self = this;
	self.m = $scope;
	self.m.isLoadingCharacterInfo = false;
	self.m.characterLookupInfo = {
		membershipId: $scope.$parent.m.currentStateParams.membershipId,
		characterId: $scope.$parent.m.currentStateParams.characterId
	};

	init();

	function init(){
		if(self.m.characterLookupInfo.membershipId && self.m.characterLookupInfo.characterId){
			lookupCharacterStats();
		}
	}

	function lookupCharacterStats(){
		self.m.isLoadingCharacterInfo = true;
		characterModelFactory.getCharacterInformationById(self.m.characterLookupInfo).then(function(response){
			self.m.characterInfo = response.Response;
			self.m.isLoadingCharacterInfo = false;
			console.log(self.m.characterInfo)
		});
	}
	
}

