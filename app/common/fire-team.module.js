
angular.module('fireTeam', [
	'fireTeam.common',
    'ui.router'
])
.run(function ($rootScope) {
  $rootScope.const = {
	 bungieRoot: 'http://www.bungie.net'
  }
})
.config(['$stateProvider', function ($stateProvider) {
	    'use strict';

      $stateProvider
              .state('search', {
                url: '/search/?platform:members:mode:instanceId',
                templateUrl: 'search-results.html',
                params : { platform : null, members: null, mode: null, instanceId: null },
                reloadOnSearch: false
            }).state('about', {
                url: '/about',
                templateUrl: 'about.html'
            }).state('character', {
                url: '/character/?membershipId:characterId',
                template: "<character-info>",
                params : { membershipId : null, characterId: null },
                reloadOnSearch: false
            });
	}]);

var fireTeamApp = angular.module('fireTeam');