angular
	.module('fireTeam.common')
	.directive('dropDownDirective', dropDownDirective)
	.controller('dropDownDirectiveCtrl', dropDownDirectiveCtrl);

	dropDownDirective.$inject = ['$timeout','$parse'];

	function dropDownDirective($timeout,$parse) {
		return {
			restrict: 'E',
			scope: {
				inputModel: '=',
				tabIndex: '@',
				onClick: '&',
				defaultValue: '=',
				selectedItemName: '='
			},
			controller:dropDownDirectiveCtrl,
			replace: true,
			template: '<div class="dropdown-container" tabIndex="{{tabIndex}}" ng-click="toggleDropDown()">' +
							'<div class="selected-option" >{{selectedItemName}}</div>' +
							'<div class="dropdown-select" ng-show="showDropDown">' +
								'<ul class="select-category" ng-repeat="option in inputModel track by $index">' +
									'<li class="category" ng-click="select(option)">' +
										'<span>{{option.itemName.toUpperCase()}}</span>'  +
									'</li>' +
								'</ul>' +
							'</div>' +
							'<div class="dropdown-button">+</div>' +
						'</div>',
			link: function(scope, element, attrs){
				scope.clickFn = $parse(attrs.onClick)(scope.$parent);
				scope.showDropDown = false;
				$element = angular.element(element);

				scope.$watch('showDropDown', function(newVal){
					if(newVal){
						$timeout(function() {
							$element.focus();
						}, 0);	
					}
				})

				$element.on('blur', function(e){
					scope.showDropDown = false;
					scope.$apply();
				});

				$element.on('keydown', function(e){
					if(e.keyCode === 13 || e.keyCode === 27 || e.keyCode === 9){
		        		this.blur();
			        };
				});

				scope.select = function(item){
					//$element.blur();
					scope.selectItem(item);
				};
			}		
		}
	};

	dropDownDirectiveCtrl.inject = ['$scope'];

	function dropDownDirectiveCtrl($scope){
		$scope.selectItem = selectItem;
		$scope.toggleDropDown = toggleDropDown;
		$scope.selectedObject = $scope.defaultValue;

		function toggleDropDown(){
			$scope.showDropDown = !$scope.showDropDown;
		}

		function selectItem(item){
			$scope.selectedObject = item;
			$scope.selectedItemName = item.itemName;
			if($scope.clickFn){
				$scope.clickFn(item);
			}
		}
	}