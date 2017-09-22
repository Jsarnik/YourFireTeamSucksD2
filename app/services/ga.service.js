angular.module('fireTeam.common')
		.service('GoogleAnalyticsService', GoogleAnalyticsService);

GoogleAnalyticsService.$inject = ['$window'];

function GoogleAnalyticsService($window) {
	return {
        pageLoad: function (scope, locationPath, title){
    			$window.ga('send', {'hitType' : 'pageview', 'page': locationPath, 'title': title});
        },
				eventClick: function (action, label){
    			$window.ga('send', 'event', action, label);
        }      
    }
};