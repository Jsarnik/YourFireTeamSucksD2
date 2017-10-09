angular
	.module('fireTeam.common')
	.controller('activityInfoCtrl', activityInfoCtrl)
	.directive('activityInfo', activityInfo);

	activityInfo.$inject = ['$rootScope', '$timeout', '$window','$filter'];

	function activityInfo($rootScope, $timeout, $window, $filter) {
		return {
			restrict: 'E',
			scope: {
				activityInfo: '='
			},
			templateUrl: '/activities/activity-info.html',
			controller: activityInfoCtrl,
			controllerAs: 'ctrl',
			transclude: true,
			replace: true,
			link: function(scope, element, attrs, ctrl){
				scope.isLoadingCarnageReport = false;
				scope.showLegand = false;

				angular.element($window).on('click', function(e){
					if(scope.legandIsOpen){
						e.stopPropagation();
						scope.toggleLegend();
						return;
					}
					scope.$apply();
				});

				scope.$watch('activityInfo', function(newVal){
					if(newVal){
						getFireTeam();
					}
				});

				function getFireTeam(){
					scope.activityMembers = {};
					scope.isLoadingCarnageReport = true;
					generateStatRanks();
					updateActivityInfoWithOrderedValues(scope.activityInfo.playerStatsByOrderedList);
					scope.activityInfo.medalLegend = buildMedalLegend(scope.activityInfo);
					scope.activityInfo.topMedalList = bestPlayerAlgorithm(scope.activityInfo.medalLegend);
					updateEntryPropWithScore();
					scope.selectPlayer(0);
					console.log(scope.activityInfo);
				}

				function generateStatRanks(){
					var entriesArray = scope.activityInfo.entries;
					var statsObject = {};

					angular.forEach(entriesArray, function(entryValue, entryKey){
						buildStatsObject(entryValue, entryValue.values);
						buildStatsObject(entryValue, entryValue.extended.values);
					});
					scope.activityInfo.playerStatsByOrderedList = orderStats(statsObject);

					function buildStatsObject(entryValue, statsArray){						
						angular.forEach(statsArray, function(statValue, statKey){
							if(!statsObject[statKey]){
								statsObject[statKey] = [];
							}
							var playerValue = {
								characterId: entryValue.characterId,
								destinyUserInfo: entryValue.player.destinyUserInfo,
								basic: {
									value: statValue.basic.value,
									rank: 0,
									displayName: statStringDisplayFormat(statKey),
									displayValue: statValue.basic.displayValue,
								}
							}
							statsObject[statKey].push(playerValue);
						});
					}
				}

				function orderStats(unOrderedStatRanksObject){
					var orderedList = {};
					angular.forEach(unOrderedStatRanksObject, function(val, key){
						if(isReverseOrder(key)){
							val.ordered = $filter('orderBy')(val, 'basic.value');
						}else{
							val.ordered = $filter('orderBy')(val, '-basic.value');
						}
						val = buildOrderedObject(val);
					});	

					return unOrderedStatRanksObject;
				}

				function buildOrderedObject(entriesObject){
					var rankIndex = 1;
					var totalMembers = entriesObject.ordered.length;
					var prevValue = null;
					entriesObject.hasMedal = false;
					angular.forEach(entriesObject.ordered, function(player){
						player.basic.rank = rankIndex;
						player.basic.outOf = totalMembers;
						player.basic.className = scope.getDisplayValue(rankIndex, totalMembers);
						rankIndex++;
						prevValue = prevValue == null ? player.basic.value : prevValue;
						if(entriesObject.hasMedal === false){
							entriesObject.hasMedal = !areSameValues(prevValue, player.basic.value)
						}
						prevValue = player.basic.value;
					});
					//if a activity time stat no medals given
					entriesObject.hasMedal = entriesObject.hasMedal == true ? isMedalStatOverride(entriesObject[0].basic.displayName) : false;
					return entriesObject;

					function isMedalStatOverride(statName){
						return statName.toLowerCase().indexOf('seconds') === -1;
					}

					function areSameValues(check1, check2){
						return check1 == check2;
					}
				}

				function updateActivityInfoWithOrderedValues(orderedStatsObject){
					angular.forEach(scope.activityInfo.entries, function(entry){
						var currentCharacterId = entry.characterId;
						extendOrderedStats(entry.values, orderedStatsObject, currentCharacterId);
						extendOrderedStats(entry.extended.values, orderedStatsObject, currentCharacterId);
					});

					function extendOrderedStats(entriesArray, orderedStatsObject, currentCharacterId){
						angular.forEach(entriesArray, function(entryValue, entryKey){
							angular.forEach(orderedStatsObject, function(statValue, statKey){
								if(entryKey.toLowerCase() === statKey.toLowerCase()){
									entryValue.hasMedal = statValue.hasMedal;
									angular.forEach(statValue.ordered, function(player){
										if(currentCharacterId == player.characterId){
											angular.extend(entryValue.basic = player.basic);
										}
									});
								}
							});
						});
					}
				}

				function isReverseOrder(val){
					var comparisonEnum = ['deaths'];

					return comparisonEnum.indexOf(val.toLowerCase()) != -1;
				}

				function statStringDisplayFormat(string) {
					return string.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase();});
				}

				function buildMedalLegend(activityInfoObj){
					var medalLegend = [];

					angular.forEach(activityInfoObj.entries, function(playerEntry){
						var characterObject = {
							playerName: playerEntry.player.destinyUserInfo.displayName,
							characterId: playerEntry.characterId,
							medals: {
								gold: {
									className: 'gold',
									weight: 5,
									count: 0,
									stats: []
								},
								silver: {
									className: 'silver',
									weight: 2,
									count: 0,
									stats: []
								},
								bronze: {
									className: 'bronze',
									weight: 1,
									count: 0,
									stats: []
								},
								last: {
									className: 'last',
									weight: -1,
									count: 0,
									stats: []
								},
							}
						}
						angular.extend(characterObject, countMedals(playerEntry.values, characterObject));
						angular.extend(characterObject, countMedals(playerEntry.extended.values, characterObject));
						medalLegend.push(characterObject);
					});
					
					function countMedals(statsArray, charObj){
						angular.forEach(statsArray, function(statValue){
							if(statValue.hasMedal){
								var statObject = {
									displayName: statValue.basic.displayName,
									value: statValue.basic.displayValue
								}
								switch(statValue.basic.rank){
									case 1:
										charObj.medals.gold.count += 1;
										charObj.medals.gold.stats.push(statObject);
									break;
									case 2:
										charObj.medals.silver.count += 1;
										charObj.medals.silver.stats.push(statObject);
									break;
									case 3:
										charObj.medals.bronze.count += 1;
										charObj.medals.bronze.stats.push(statObject);
									break;
									case (activityInfoObj.entries.length):
										charObj.medals.last.count += 1;
										charObj.medals.last.stats.push(statObject);
									break;
									default:
								}
							}
						});
						return charObj;
					}
					return medalLegend;
				}

				function bestPlayerAlgorithm(medalLegend){
					angular.forEach(medalLegend, function(playerMedals){
						var playersMedalScore = 0;
						angular.forEach(playerMedals.medals, function(medal){
							playersMedalScore += (medal.count * medal.weight);
						});
						playerMedals.playersMedalScore = playersMedalScore < 0 ? 0 : playersMedalScore;
					});

					medalLegend = $filter('orderBy')(medalLegend, '-playersMedalScore');
					return medalLegend;
				}

				function updateEntryPropWithScore(){ 
					var index = 1;
					angular.forEach(scope.activityInfo.topMedalList, function(topMedal){
						angular.forEach(scope.activityInfo.entries, function(player){
							if (topMedal.characterId === player.characterId){
								player.rankOrder = index;
								player.rankClassName = scope.getDisplayValue(index, scope.activityInfo.topMedalList.length)
							} 
						});
						index++;
					});
				}
			}
		};
};

activityInfoCtrl.$inject = ['$scope','$anchorScroll', '$state'];

function activityInfoCtrl($scope, $anchorScroll, $state){
	var self = this;
	self.m = $scope;
	self.m.selectedStat = null;
	self.m.selectedView = 'player';
	self.m.showLegend = false;
	$scope.goToPlayer = goToPlayer;
	$scope.getDisplayValue = getDisplayValue;
	$scope.selectStat = selectStat;
	$scope.toggleLegend = toggleLegend;
	$scope.selectView = selectView;
	$scope.selectPlayer = selectPlayer;
	$scope.goToCharacterPage = goToCharacterPage;

	function goToCharacterPage(characterScope){
		var characterParams = {
			membershipId: characterScope.player.destinyUserInfo.membershipId,
			characterId: characterScope.characterId
		}
		$state.go('character', characterParams);
	}
	
	function toggleLegend(){
		self.m.showLegend = !self.m.showLegend;
	}

	function goToPlayer(val){
		$anchorScroll(val);
	}

	function selectStat(statIndex){
		self.m.selectedStat = statIndex; 
	}

	function selectPlayer(playerIndex){
		if(self.m.selectedPlayerIndex == playerIndex){
			self.m.selectedPlayerIndex = null;
			return;
		}
		self.m.selectedPlayerIndex = playerIndex;
	}

	function selectView(view){
		self.m.selectedView = view;
	}

	function getDisplayValue(rank, total){
	
		switch(rank){
			case 1:
				return 'gold';
			break;
			case 2:
				return 'silver';
			break;
			case 3:
				return 'bronze';
			break;
			case total:
				return 'last';
			break;
			default:
				return 'average'
		}
	}
}

