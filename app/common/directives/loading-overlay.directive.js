angular
.module('fireTeam.common')
.directive('loadingOverlay', loadingOverlay);

loadingOverlay.$inject = [];

function loadingOverlay() {
    return {
        restrict: 'E',
        scope: {
            message: '@'
        },
        transclude: true,
        replace: true,
        template: '<div id="loading-overlay-container">' + 
                    '<div class="bg"></div>' +
                    '<div class="loading-overlay-content">' + 
                        '{{message}}' + 
                        '<ng-transclude></ng-transclude>' +
                    '</div>' +
                  '</div>',
        link: function(scope, element, attrs){
            
        }		
    }
};