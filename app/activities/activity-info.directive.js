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

				angular.element($window).on('click', function(e){
					if(scope.legandIsOpen){
						e.stopPropagation();
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
					var statsObject = defineStatRanksObject();			
					calculateRankTypes(statsObject);
					updateActivityInfoWithOrderedValues(scope.activityInfo.playerStatsByOrderedList);
					scope.activityInfo.medalLegend = buildMedalLegend(scope.activityInfo);
					//scope.activityInfo.topMedalList = bestPlayerAlgorithm(scope.activityInfo.medalLegend);
					scope.selectPlayer(0);
					console.log(scope.activityInfo);
				}

				function defineStatRanksObject(){
					var entriesArray = scope.activityInfo.entries;
					var statsObject = {};

					angular.forEach(entriesArray, function(entry){
						buildStatsObject(entry, entry.values);
						buildStatsObject(entry, entry.extended.values);
					});

					function buildStatsObject(entryValue, statsArray){		
						angular.forEach(statsArray, function(statValue, statKey){
							if(!statsObject[statKey]){
								statsObject[statKey] = {};
								statsObject[statKey].players = [];
								statsObject[statKey].displayName = statStringDisplayFormat(statKey);
								statsObject[statKey].bestValues = {
									overAll: {
										value: 0,
										displayValue: null
									},
									percentOfHighest: {
										value: 1,
										displayValue: '100%'
									},
									avgStatPerMinuteValue: {
										value: 0,
										displayValue: null
									},
									avgStatPerMinuteValueAsPercentOfHighest: {
										value: 0,
										displayValue: null
									}
								}
							}

							var avgStatPerMinuteValue = (statValue.basic.value / entryValue.values.timePlayedSeconds.basic.value) * 60;
							statsObject[statKey].bestValues.overAll.value = statValue.basic.value > statsObject[statKey].bestValues.overAll.value ? statValue.basic.value : statsObject[statKey].bestValues.overAll.value;
							statsObject[statKey].bestValues.avgStatPerMinuteValue.value = avgStatPerMinuteValue > statsObject[statKey].bestValues.avgStatPerMinuteValue.value ? avgStatPerMinuteValue : statsObject[statKey].bestValues.avgStatPerMinuteValue.value;

							var playerValue = {
								characterId: entryValue.characterId,
								destinyUserInfo: entryValue.player.destinyUserInfo,
								timePlayedSeconds: entryValue.values.timePlayedSeconds.basic.value,
								rankTypes: {
									overAll:{
										value: statValue.basic.value,
										rank: 0,
										displayValue: ""
									},
									percentOfHighest: {
										value: 0,
										rank: 0,
										displayValue: ""
									},
									avgStatPerMinuteValue: {
										value: avgStatPerMinuteValue,
										rank: 0,
										displayValue: ""
									},
									avgStatPerMinuteValueAsPercentOfHighest: {
										value: 0,
										rank: 0,
										displayValue: ""
									}
								},
							}
							statsObject[statKey].players.push(playerValue);
						});
					}
					return statsObject;
				}

				function calculateRankTypes(unOrderedStatRanksObject){
					angular.forEach(unOrderedStatRanksObject, function(statVal, statKey){
						var reverseOrder = isReverseOrder(statKey);
						var prevValue = null;
						var bestAvgStatPerMinuteValueAsPercentOfHighest = 0;

						statVal.hasMedal = false;
						angular.forEach(statVal.players, function(playerRankObject){
							prevValue = prevValue == null ? playerRankObject.rankTypes.overAll.value : prevValue;
							if(statVal.hasMedal === false){
								statVal.hasMedal = !areSameValues(prevValue, playerRankObject.rankTypes.overAll.value);
							}
							prevValue = playerRankObject.rankTypes.overAll.value;
							statVal.hasMedal = statVal.hasMedal == true ? isMedalStatOverride(statKey) : false;
							playerRankObject.rankTypes.percentOfHighest.value = playerRankObject.rankTypes.overAll.value / statVal.bestValues.overAll.value;
							playerRankObject.rankTypes.avgStatPerMinuteValueAsPercentOfHighest.value = playerRankObject.rankTypes.avgStatPerMinuteValue.value / statVal.bestValues.avgStatPerMinuteValue.value;
							statVal.bestValues.avgStatPerMinuteValueAsPercentOfHighest.value = playerRankObject.rankTypes.avgStatPerMinuteValueAsPercentOfHighest.value > bestAvgStatPerMinuteValueAsPercentOfHighest ? playerRankObject.rankTypes.avgStatPerMinuteValueAsPercentOfHighest.value : bestAvgStatPerMinuteValueAsPercentOfHighest;
						});
						statVal = orderAndRank(statVal, reverseOrder);
					});
					scope.activityInfo.playerStatsByOrderedList = unOrderedStatRanksObject;

					function isMedalStatOverride(statName){
						var excludedStatsEnum = [
							"activityDurationSeconds",
							"combatRating",
							"completed",
							"completionReason",
							"fireteamId",
							"team",
							"timePlayedSeconds",
							"playerCount",
							"startSeconds"
						];

						return excludedStatsEnum.indexOf(statName) === -1;
					}

					function areSameValues(check1, check2){
						return check1 == check2;
					}
				}

				function orderAndRank(statUnrankedPlayersList, reverseOrder){
					angular.forEach(statUnrankedPlayersList.players[0].rankTypes, function(val, key){
						statUnrankedPlayersList.bestValues[key].displayValue = formatRankTypeDisplayValue(key, statUnrankedPlayersList.bestValues[key].value);
						var orderByString = reverseOrder ? 'rankTypes.' + key + '.value' : '-rankTypes.' + key + '.value';
						var orderedList = $filter('orderBy')(statUnrankedPlayersList.players, orderByString);

						angular.extend(statUnrankedPlayersList.players, buildOrderedObject(orderedList, key));
						return statUnrankedPlayersList;
					})
				}

				function buildOrderedObject(entriesObject, rankTypeKey){
					var rankIndex = 1;
					var totalMembers = entriesObject.length;
					angular.forEach(entriesObject, function(player){
						player.rankTypes[rankTypeKey].rank = rankIndex;
						player.rankTypes[rankTypeKey].outOf = totalMembers;
						player.rankTypes[rankTypeKey].displayValue = formatRankTypeDisplayValue(rankTypeKey, player.rankTypes[rankTypeKey].value);
						player.rankTypes[rankTypeKey].className = scope.getDisplayValue(rankIndex, totalMembers);
						rankIndex++;
					});

					return entriesObject;
				}

				function formatRankTypeDisplayValue(key, value){
					var displayValue = "";
					switch(key){
						case 'overAll':
							displayValue = (Math.round(value * 100) / 100);
						break;
						case 'avgStatPerMinuteValue':
							displayValue = (Math.round(value * 100) / 100) + '/min';
						break;
						default:
							displayValue = Math.round(((value * 100) * 100) / 100) + '%';
						break;
					}

					return displayValue;
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
									angular.extend(entryValue, statValue);
									delete entryValue.players;
									angular.forEach(statValue.players, function(player){
										if(currentCharacterId == player.characterId){
											angular.extend(entryValue, player);
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
									weight: 14,
									overAll: {
										count: 0,
										score: 0,
										stats: []
									},
									percentOfHighest: {
										count: 0,
										score: 0,
										stats: []
									},
									avgStatPerMinuteValue: {
										count: 0,
										score: 0,
										stats: []
									},
									avgStatPerMinuteValueAsPercentOfHighest: {
										count: 0,
										score: 0,
										stats: []
									}
								},
								silver: {
									className: 'silver',
									weight: 9,
									overAll: {
										count: 0,
										score: 0,
										stats: []
									},
									percentOfHighest: {
										count: 0,
										score: 0,
										stats: []
									},
									avgStatPerMinuteValue: {
										count: 0,
										score: 0,
										stats: []
									},
									avgStatPerMinuteValueAsPercentOfHighest: {
										count: 0,
										score: 0,
										stats: []
									}
								},
								bronze: {
									className: 'bronze',
									weight: 8,
									overAll: {
										count: 0,
										score: 0,
										stats: []
									},
									percentOfHighest: {
										count: 0,
										score: 0,
										stats: []
									},
									avgStatPerMinuteValue: {
										count: 0,
										score: 0,
										stats: []
									},
									avgStatPerMinuteValueAsPercentOfHighest: {
										count: 0,
										score: 0,
										stats: []
									}
								},
								average: {
									className: 'average',
									weight: 1,
									overAll: {
										count: 0,
										score: 0,
										stats: []
									},
									percentOfHighest: {
										count: 0,
										score: 0,
										stats: []
									},
									avgStatPerMinuteValue: {
										count: 0,
										score: 0,
										stats: []
									},
									avgStatPerMinuteValueAsPercentOfHighest: {
										count: 0,
										score: 0,
										stats: []
									}
								},
								last: {
									className: 'last',
									weight: -2,
									overAll: {
										count: 0,
										score: 0,
										stats: []
									},
									percentOfHighest: {
										count: 0,
										score: 0,
										stats: []
									},
									avgStatPerMinuteValue: {
										count: 0,
										score: 0,
										stats: []
									},
									avgStatPerMinuteValueAsPercentOfHighest: {
										count: 0,
										score: 0,
										stats: []
									}
								}
							},
							aggregateMedalScores:{
								overAll: 0,
								percentOfHighest: 0,
								avgStatPerMinuteValue: 0,
								avgStatPerMinuteValueAsPercentOfHighest: 0
							}
						}
						angular.extend(characterObject, countMedals(playerEntry.values, characterObject));
						angular.extend(characterObject, countMedals(playerEntry.extended.values, characterObject));
						playerEntry.orderByRankTypes = characterObject;
						medalLegend.push(characterObject);
					});
					
					function countMedals(statsArray, charObj){
						angular.forEach(statsArray, function(statValue, statKey){
							var statObject = {
								displayValue: statKey,
								displayName: statStringDisplayFormat(statKey)
							}
							angular.forEach(statValue.rankTypes, function(rankValues, rankKey){
								if(statValue.hasMedal){
									switch(rankValues.rank){
										case 1:
											charObj.medals.gold[rankKey].count += 1;
											charObj.medals.gold[rankKey].score = charObj.medals.gold[rankKey].count * charObj.medals.gold.weight;
											charObj.medals.gold[rankKey].stats.push(statObject);
										break;
										case 2:
											charObj.medals.silver[rankKey].count += 1;
											charObj.medals.silver[rankKey].score = charObj.medals.silver[rankKey].count * charObj.medals.silver.weight;
											charObj.medals.silver[rankKey].stats.push(statObject);
										break;
										case 3:
											charObj.medals.bronze[rankKey].count += 1;
											charObj.medals.bronze[rankKey].score = charObj.medals.bronze[rankKey].count * charObj.medals.bronze.weight;
											charObj.medals.bronze[rankKey].stats.push(statObject);
										break;
										case (activityInfoObj.entries.length):
											charObj.medals.last[rankKey].count += 1;
											charObj.medals.last[rankKey].score = charObj.medals.last[rankKey].count * charObj.medals.last.weight;
											charObj.medals.last[rankKey].stats.push(statObject);
										break;
										default:
											charObj.medals.average[rankKey].count += 1;
											charObj.medals.average[rankKey].score = charObj.medals.average[rankKey].count * charObj.medals.average.weight;
											charObj.medals.average[rankKey].stats.push(statObject);
										break;
									}
									charObj.aggregateMedalScores[rankKey] = (charObj.medals.gold[rankKey].score + charObj.medals.silver[rankKey].score + charObj.medals.bronze[rankKey].score + charObj.medals.last[rankKey].score + charObj.medals.average[rankKey].score);
								}
							});
						});
						return charObj;
					}
					return medalLegend;
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
	$scope.goToPlayer = goToPlayer;
	$scope.getDisplayValue = getDisplayValue;
	$scope.selectStat = selectStat;
	$scope.selectView = selectView;
	$scope.selectPlayer = selectPlayer;
	$scope.goToCharacterPage = goToCharacterPage;
	$scope.setOrder = setOrder;
	$scope.sortedBy = 'overAll';

	function setOrder(val){
		$scope.sortedBy = val;
	}

	function goToCharacterPage(characterScope){
		var characterParams = {
			membershipId: characterScope.player.destinyUserInfo.membershipId,
			characterId: characterScope.characterId
		}
		$state.go('character', characterParams);
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

