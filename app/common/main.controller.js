angular.module('fireTeam.common')
	.controller('mainCtrl', MainCtrl);

	MainCtrl.$inject = ['$rootScope','$scope', '$state', '$location', 'GoogleAnalyticsService', 'FireTeamModelFactory', 'ActivityModelFactory', '$timeout', '$cookies'];

	function MainCtrl($rootScope, $scope, $state, $location, googleAnalyticsService, fireTeamModelFactory, activityModelFactory, $timeout, $cookies) {

		var m = $scope.m = {
			fireTeamActivityResults: [],
			playersArrays: [{
				displayName: '',
				isPlaceHolder: true
			}],
			fireTeamMembers: {},
			maxMembers: 6,
			gameModes: buildGameModeObj(),
			selectedGameMode:{
				itemName: "None",
				itemValue: 0
			},
			platformTypes: {
				xbox: {
					id: 1,
					displayValue: 'xbox'
				},
				ps4: {
					id: 2,
					displayValue: 'ps4'
				}
			},
			selectedPlatform: null,
			errorMessage: null
		}
		m.showDropDown = false;
		m.pollingTimeout;
		m.activityLookupPerSearch = 10;
		m.activitiesDisplayed = m.activityLookupPerSearch;
		m.hidePlaceHolder = false;
		m.isShowActivityList = false;
		m.showProgressMessage = false;
		m.showRecentSearches = false;
		m.activityListProgress = {};
		m.recentSearches = [];
		m.isNewSearch = true;
		m.selectedPlatform = m.platformTypes.ps4;
		m.pageInitialized = false;
		m.searchCriteria = null;
		m.lastSuccessSearchCriteria = null;
		m.maxMatchAttempts = 10;
		m.matchAttempts = 0;
		m.hoveredActivity = null;
		m.currentStateParams = null;
		m.deepLink = '';
		m.copyrightYear = getDate();
		m.activitySort = 'dateTime';
		m.loadingStatusMessage = '';
		m.warningMessage = '';
		m.showWarningMessage = false;
		m.showLoadingStatusMessages = false;
		m.showErrorMessage = false;

		$scope.selectPlatform = selectPlatform;
		$scope.selectActivity = selectActivity;
		$scope.getFireTeamModel = getFireTeamModel;
		$scope.getMoreResults = getMoreResults;
		$scope.formatDate = formatDate;
		$scope.addPlayer= addPlayer;
		$scope.keyDownEvt = keyDownEvt;
		$scope.loadRecentSearch = loadRecentSearch;
		$scope.cancelSearch = cancelSearch;
		$scope.search = search;
		$scope.selectMode = selectMode;
		$scope.showMoreResults = showMoreResults;
		$scope.orderByDate = orderByDate;

		function updateCurrentStateParams(params){
			var absUrl = $location.absUrl() + '?';
			var statParams = {};
			angular.forEach(params, function(val, key){
				if(val !== null){
					absUrl += key + '=' + val + '&';
				}
				statParams[key] = val;
			});

			m.deepLink = absUrl.substring(0, absUrl.length-1);
			m.currentStateParams = statParams;
		}

		$rootScope.$on("$stateChangeSuccess", function (event, toState, toParams, fromState, fromParams){
			updateCurrentStateParams(toParams);
			var recentSearch = {
				players: m.playersArrays,
				platformType: m.selectedPlatform,
				mode: m.selectedGameMode
			}
			googleAnalyticsService.pageLoad($location.absUrl(), toState.name);
			$location.url($location.path());
			updateRecentSearches(recentSearch);
		})

		$rootScope.$on("$stateChangeStart", function (event, toState, toParams, fromState, fromParams) {
			switch(toState.name){
				case 'search':
					var membersArray = toParams.members ? toParams.members.split(';') : null;
					if(!membersArray){ return };
					m.playersArrays = [];
					angular.forEach(membersArray, function(player){
						m.playersArrays.push({displayName: player, isPlaceHolder : false});
					});
					if(toParams.instanceId){
						loadActivityByInstanceId(toParams.instanceId);
					}
					$timeout(function(){
						var fireTeamModelOptions = {
							memberType: m.selectedPlatform.id,
							gameMode: m.selectedGameMode.itemValue,
							userNames: m.playersArrays
						}
						getFireTeamModel(fireTeamModelOptions);
					},10);
				break;
				case 'character':
					console.log(toState.name);
				break;
			}
		});

		$scope.$watch('m.playersArrays', function(newVal, oldVal){
			if(newVal.length <= 1 && newVal[0].isPlaceHolder){
				return;
			}

			if(!angular.equals(newVal,oldVal)){
				setSearchCriteria();
			}

			$timeout(function(){
				inputDetectionFn(newVal);
			},10);
			
		}, true);

		init();

		function init(){
			//buildGameModeObj();
			checkRecentSearches();
			m.pageInitialized = true;
		}

		function setSearchCriteria(){
			var membersNameArray = [];
			angular.forEach(m.playersArrays, function(players){
				if(!players.isPlaceHolder){
					membersNameArray.push(players.displayName);
				}
			});

			m.searchCriteria = {
				members: membersNameArray,
				platform: m.selectedPlatform,
				mode: m.selectedGameMode
			};

			m.errorMessage = '';
			m.showErrorMessage = false;
			m.isNewSearch = !angular.equals(m.searchCriteria, m.lastSuccessSearchCriteria);

			setCookie('searchCriteria', m.searchCriteria);
		}

		function buildGameModeObj(){
			var modesEnum = {
				'None': 0,
				'Story': 2,
				'Strike': 3,
				'Raid': 4,
				'All PvP': 5,
				'Patrol': 6,
				'All PvE': 7,
				'Reserved 9': 9,
				'Control': 10,
				'Reserved 11': 11,
				'Clash': 12,
				'Reserved 13': 13,
				'Reserved 15': 15,
				'Nightfall': 16,
				'Heroic Nightfall': 17,
				'All Strikes': 18,
				'Iron Banner': 19,
				'Reserved 20': 20,
				'Reserved 21': 21,
				'Reserved 22': 22,
				'Reserved 24': 24,
				'Reserved 25': 25,
				'Reserved 26': 26,
				'Reserved 27': 27,
				'Reserved 28': 28,
				'Reserved 29': 29,
				'Reserved 30': 30,
				'Supremacy': 31,
				'Reserved 32': 32,
				'Survival': 37,
				'Countdown': 38,
				'Trials Of The Nine': 39,
				'Social': 40
			};

			var modesArray = [];

			angular.forEach(modesEnum, function(val, key){
				modesArray.push(
					{
						itemName: key,
						itemValue: val
					}
				);
			});
			return modesArray;
		}

		function selectPlatform(platform){
			m.selectedPlatform = platform;
			setSearchCriteria();
		}

		function selectMode(mode){
			m.selectedGameMode = mode;
			setSearchCriteria();
		}

		function inputDetectionFn(model){
			var firstPlaceHolderIndex = null;
			var placeHolderCount = 0;

			angular.forEach(model, function(input, index){
				if(input.isPlaceHolder){
					placeHolderCount += 1;
			  		if(!firstPlaceHolderIndex){
						firstPlaceHolderIndex = index;
					}				
				}
			});

			if(placeHolderCount < 1){
				addPlayer();
			}

			if(placeHolderCount > 1 && firstPlaceHolderIndex){
				m.playersArrays.splice(firstPlaceHolderIndex, 1);
			}
		}

		function checkRecentSearches(){
			var recentSearchCookie = $cookies.get('recentSearches');
			if(recentSearchCookie){
				m.recentSearches = angular.fromJson(recentSearchCookie);
			}
		}

		function loadRecentSearch(index){
			m.playersArrays = m.recentSearches[index].players;
			m.selectedPlatform = m.recentSearches[index].platformType || m.selectedPlatform;
			m.selectedGameMode = m.recentSearches[index].mode || m.selectedGameMode;
			$scope.$apply();
			setSearchCriteria();
		}

		function addPlayer(){
			if(m.playersArrays.length < m.maxMembers){
				m.playersArrays.push({displayName:'', isPlaceHolder: true});
			}
		}

		function search(){
			if(m.playersArrays[0].isPlaceHolder){
				throwError({ErrorCode: 101, Error: 'Please enter a player name.'});
				return;
			}
			m.selectedActivity = null;
			m.isNewSearch = true;

			var newSearchParams = {
				platform: m.selectedPlatform.displayValue,
				members: '',
				mode: m.selectedGameMode.itemValue,
				instanceId: null
			}

			var membersString = '';
			angular.forEach(m.playersArrays, function(p){
				if(!p.isPlaceHolder){
					newSearchParams.members = newSearchParams.members + p.displayName + ';'
			 	}
			});

			newSearchParams.members = newSearchParams.members.replace(/;+$/, "");
			if(angular.equals(newSearchParams, m.currentStateParams)){
				$state.reload();
			}

			googleAnalyticsService.eventClick('click', 'search');
			$state.go('search', newSearchParams);
		}

		function getFireTeamModel(fireTeamModelOptions){
			if(m.isLoadingData){
				return;
			}

			if(!m.isNewSearch){
				return;
			}

			fireTeamModelFactory.clear();

			m.isShowActivityList = true;
			m.errorMessage = '';
			m.showErrorMessage = false;
			m.fireTeamActivityResults = [];
			m.isLoadingData = true;
			m.warningMessage = '';
			m.showWarningMessage = false;

			fireTeamModelFactory.getFireTeam(fireTeamModelOptions).then(function(response){
				var playerResponseError = false;
				angular.forEach(response, function(playerResponse){
					if((playerResponse.Error)){
						playerResponseError = true;
						throwError(playerResponse);
					}
				});

				if(playerResponseError){
					return;
				}

				m.fireTeamMembers.players = response;
				m.fireTeamMembers.gameMode = fireTeamModelOptions.gameMode;
				m.fireTeamMembers.pageNum = 0;

				setSearchCriteria();
				m.isNewSearch = false;

				getMembersActivitiesMatchList(m.fireTeamMembers);
			}, function(error){
				throwError(error);
			});
		};

		function cancelSearch(){
			m.fireTeamActivityResults = [];
			m.isNewSearch = true;
			m.isLoadingData = false;
			m.lastSuccessSearchCriteria = null;
			m.loadingStatusMessage = '';
			m.showLoadingStatusMessages = false;
			m.showWarningMessage = true;
			m.warningMessage = 'User cancelled search.'
			m.isLoadingData = false;
			activityModelFactory.cancelAllPromises().then(function(response){
				console.log(response);
			});
			activityModelFactory.cancelAllPromises().then(function(response){
				console.log(response);	
			});
			clearData();
		}

		function throwError(data){
			if(!data.Error && !data.Error){
				data.ErrorCode = 100;
			}

			//Custom Error Handling
			switch (data.ErrorCode){
				case 100:
					data.Error = 'A system error occurred. Please try again';
					break;		
				case 401:	
					data.Error = 'Failed to reach Destiny Servers. Please try again in a few minutes.';
					break;		
				case 500:	
					data.Error = 'A critical error occured. Please try again.';
					break;	
			}

			m.errorMessage = data.Error;
			m.showErrorMessage = true;
			m.isLoadingData = false;	
			m.isNewSearch = true;
			clearData();
		}

		function getMoreResults(){
			if(m.isLoadingData){
				return;
			}

			m.isLoadingData = true;
			m.fireTeamMembers.pageNum += 1;
			getMembersActivitiesMatchList(m.fireTeamMembers);
		}

		function getMembersActivitiesMatchList(membersOptions){
			m.showLoadingStatusMessages = true;
			m.showWarningMessage = false;
			m.loadingStatusMessage = 'Checking for updates to the Destiny manifest...';
		
			activityModelFactory.getUpdatedManifest().then(function(response){
				m.loadingStatusMessage = 'Getting activity match results...';

				if(response.ErrorCode){
					m.warningMessage = 'Unable to get current Destiny manifests.';
					m.showWarningMessage = true;
				}

				activityModelFactory.getPostGameCarnageReportActivitiesForFireteam(membersOptions).then(function(response){
					m.loadingStatusMessage = '';
					m.showLoadingStatusMessages = false;
					m.isLoadingData = false;

					if(!response){return;}

					if(response.ErrorCode){
						throwError({Error: "An error occured while fetching results"});
					}

					if(response.Response && response.Response.activityMatchListResults){
						activityResultsValidation(response.Response.activityMatchListResults);
					}
				});
			});
		}

		function activityResultsValidation(activityMembersMatchedResults){
			if (!activityMembersMatchedResults || activityMembersMatchedResults == 'undefined' || activityMembersMatchedResults == undefined || activityMembersMatchedResults.length < 1){
				m.matchAttempts += 1;
				m.warningMessage = 'No activity match results were found.'
				m.showWarningMessage = true;
				if(m.matchAttempts <= m.maxMatchAttempts){
					getMoreResults();
					clearData();
					return;
				}
			}

			angular.extend(m.fireTeamActivityResults, activityMembersMatchedResults);
			console.log(activityMembersMatchedResults);
			m.activitiesDisplayed = m.fireTeamActivityResults.length < m.activityLookupPerSearch ? m.fireTeamActivityResults.length : m.activityLookupPerSearch;
			if(!m.isNewSearch){
				m.lastSuccessSearchCriteria = m.searchCriteria;
			}
			clearData();
		}

		function loadActivityByInstanceId(id){
			activityModelFactory.getPostGameCarnageReportForActivityById(id).then(function(response){
				if(response.ErrorCode > 1){
					throwError({Error: "An error occured while fetching results"});
				}
				m.isLoadingData = false;
				$location.search('instanceId', response.Response.activityDetails.instanceId);
				m.selectedActivity = response.Response;
				activityResultsValidation(response.Response);
			});
		}

		function selectActivity(activity){
			$location.search('instanceId', activity.activityDetails.instanceId);
			m.selectedActivity = activity;
			m.isShowActivityList = false;
		}

		function showMoreResults(amt){
			m.activitiesDisplayed += amt;
			if(m.activitiesDisplayed > m.fireTeamActivityResults.length){
				m.activitiesDisplayed = m.fireTeamActivityResults.length;
			}
		}

		function formatDate(inputDate){
			var outputDate = new Date(inputDate);
			return outputDate;
		}

		function keyDownEvt(e){
			switch(e.keyCode){
				case 13:
					e.preventDefault();
					search();
				break;
			}
		}

		function updateRecentSearches(obj){
			var recentMatch = false;
			angular.forEach(m.recentSearches, function(item){
				if(angular.equals(item, obj)){
					recentMatch = true;
				}
			});
			
			if(recentMatch){
				return;
			}

			if(m.recentSearches.length >= 10){
				m.recentSearches.splice(0,1);
			}

			m.recentSearches.push(obj);
			setCookie('recentSearches', m.recentSearches)
		}

		function setCookie(name, val, exp){
  			$cookies.put(name, JSON.stringify(val));
		}

		function clearData(){
			if(m.pollingTimeout){
				$timeout.cancel(m.pollingTimeout);
			}

			m.activitiesDisplayed = m.fireTeamActivityResults.length < m.activityLookupPerSearch ? m.fireTeamActivityResults.length : m.activitiesDisplayed;
			m.matchAttempts = m.maxMatchAttempts;
			// m.showProgressMessage = false;
			// m.activityListProgress = {
			// 		totalActivities: 0,
			// 		activitiesLoaded: 0,
			// 		percentComplete: 0
			// 	}

			// activityModelFactory.clearProgress();
		}

		function getDate(){
			var date = new Date();
			return date.getFullYear();
		}

		function orderByDate(item) {
		    return -new Date(item.period);
		};
	};


