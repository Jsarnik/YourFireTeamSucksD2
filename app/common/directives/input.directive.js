angular
	.module('fireTeam.common')
	.directive('inputDirective', inputDirective)
	.controller('inputDirectiveCtrl', inputDirectiveCtrl);

	inputDirective.$inject = ['$timeout','$parse'];

	function inputDirective($timeout,$parse) {
		return {
			restrict: 'E',
			scope: {
				inputModel: '=',
				tabIndex: '@',
				recentSearch: '=',
				onClick: '&'
			},
			controller:inputDirectiveCtrl,
			replace: true,
			template: '<div class="input-container">' + 
					    '<input class="text" ng-focus="initialFocus=true" ng-blur="initialFocus=false" type="text" placeholder="Gamertag or PSN" ng-model="inputModel.displayName"' +
						'tabindex="tabIndex" ng-class="{\'placeholder\' : inputModel.isPlaceHolder && !initialFocus}" />' + 
						'<div class="recent-search-container" ng-if="recentSearch.length > 0 && initialFocus === true && 1==-1">' + 
							'<div class="recent-search-table">' + 
								'<ul>' + 
									'<li>Recent Searches:</li>' + 
								'</ul>' + 
								'<ul class="recent-search" ng-repeat="search in recentSearch track by $index" ng-mouseover="selectRecentSearch($index)" ng-mouseout="selectRecentSearch(-1)">' + 
									'<li class="recent-search-platform">' + 
										'<img ng-src="/img/{{search.platformType.id === 1 && \'xbox_icon.png\' || \'psn_icon.png\'}}">' + 
									'</li>' + 
									'<li class="recent-search-mode">' + 
										'<span>{{search.mode.itemName}}</span>' + 
									'</li>' + 
									'<li class="recent-search-player" ng-repeat="player in search.players track by $index">' + 
										'<span>{{player}}</span>' + 
									'</li>' + 
								'</ul>' + 
							'</div>' + 
						'</div>' + 
						'<div class="clear-text-button" ng-show="!inputModel.isPlaceHolder" ng-click="clearText()">X</div>' +
					'</div>',
			link: function(scope, element, attrs){
				scope.initialFocus = false;
				scope.clickFn = $parse(attrs.onClick)(scope.$parent);
				scope.keyDownFn = $parse(attrs.onKeyDown)(scope.$parent);
				$element = angular.element(element);
				var blurKeyCode = null;
				var inputElement = $element.find('input');	
				var inputValLength = 0;

				inputElement.on('keypress', function(e){
			        var regex = new RegExp(/^[a-zA-Z0-9._-]+$/);
			        var key = String.fromCharCode(!e.charCode ? e.which : e.charCode);

			        if (!regex.test(key)) {
			           e.preventDefault();
			           return false;
			        }
			        scope.initialFocus = false;
				});

				inputElement.on('keydown', function(e){
					blurKeyCode = e.keyCode;
			        if(e.keyCode === 13 || e.keyCode === 27){
		        		this.blur();
			        }
			  		scope.initialFocus = false;
				});

				inputElement.on('keyup', function(e){
					var inputValLength = scope.inputModel.displayName.length;
					if(inputValLength > -1){
						scope.inputModel.isPlaceHolder = inputValLength < 1 ? true : false;
						scope.$apply();
					}
				});

				inputElement.on('blur', function(e){
					if(scope.selectedIndex !== -1 && !blurKeyCode){
						scope.loadRecent(scope.selectedIndex);
					}	
				});

				scope.clearText = function(){
					scope.inputModel.displayName = '';
					scope.inputModel.isPlaceHolder = true;
					//scope.$apply();
				}
			}		
		}
	};

	inputDirectiveCtrl.inject = ['$scope'];

	function inputDirectiveCtrl($scope){
		$scope.loadRecent = loadRecent;
		$scope.selectedIndex = -1;
		$scope.selectRecentSearch = selectRecentSearch;

		function selectRecentSearch(i){
			$scope.selectedIndex = i;
		}

		function loadRecent(){
			if($scope.clickFn){
				$scope.clickFn($scope.selectedIndex);
			}
		}
	}