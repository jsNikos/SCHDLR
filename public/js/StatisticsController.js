define(['StatisticsView', 'libs/timeZoneUtils'], function(StatisticsView, timeZoneUtils){
	return StatisticsController;
	
	function StatisticsController(args){
		var scope = this;
		var statisticsView = undefined;		
		this.tableController = args.tableController;
		
		// model
		this.statisticsDataList = {}; // {weekDay -> StatisticsDataHolder} map
		this.currentDay = ''; // String, the current selected day, '' means week
		this.week = scope.tableController.week; // Week, the selected week		
		
		function init(){			
			statisticsView = new StatisticsView({controller : scope});
		}		
		
		/**
		 * Sets the 'dateInWeek' to the selected (server time-zone) and triggers 'changeWeek'
		 * @param selectedDate : Date
		 */
		this.handleWeekSelect = function(selectedDate){						
			return changeWeek({requestedWeek : selectedDate.getTime()});
		};
		
		/**
		 * Sets the 'dateInWeek' to one week before/after and triggers 'changeWeek'.
		 * @param weeks : integer, -1 indicates 'prevous week', 1 'next week'
		 */
		this.handleWeekArrowClick = function(weeks){	
			function onModelUpdated(){
				statisticsView.weekPicker.setWeek(scope.week.startOfWeek);
			}
			return changeWeek(createChangeWeekParams(weeks), onModelUpdated);
		};		
		
		/**
		 * Creates parameter for requesting data for next/previous week.
		 * Contains logic to fix the selected day, if any.
		 * @param addWeeks : integer, number of week to add
		 */
		function createChangeWeekParams(addWeeks) {
			return {
				requestedDay : scope.currentDay
								&& timeZoneUtils.parseInServerTimeAsMoment(scope.currentDay, scope.tableController.DAY_COORD_FORMAT)
									.add('weeks', addWeeks)
									.format(scope.tableController.DAY_COORD_FORMAT),
				requestedWeek : !scope.currentDay ? 
									timeZoneUtils.parseInServerTimeAsMoment(scope.week.startOfWeek).add('weeks', addWeeks).valueOf() 
									: null
			};
		}
		
		/**
		 * Triggers the view to re-render content based on the current-model's week.
		 * First fetches data for this week.		 
		 * @param args : {requestedWeek : Date (date in requested week for week-data only),
		 * 				   requestedDay : String (like currentDay-format, if data for a day is requested),
		 * 				  ready : function() ready-callback
		 */
		function changeWeek(args, ready){			
			scope.statisticsDataList = {};
			statisticsView.clearStatisticsContainer()
						  .showLoadingState();			
			findStatisticsData(args, function(resp){
				// update model 
				updateModel(resp);
				
				// show statistics
				statisticsView.removeLoadingState()
							  .updateDateSelectors()
							  .renderStatistics();
				ready && ready();
			});		
		}
				
		
		/**
		 * Based on the 'currentDay', returns the data-model to be rendered
		 * corresponding to this selection.
		 * @return StatisticsDataHolder
		 */
		this.findCurrentModel = function(){
			return this.statisticsDataList[this.currentDay];
		};
		
		/**
		 * Triggers to show statistics. Loads necessary data from server.
		 * Data will be week-statistic.
		 */
		this.show = function(){
			statisticsView.show();			
			findStatisticsData({requestedWeek : scope.week.startOfWeek},	function(resp){
				// update model 
				updateModel(resp);
				
				// show statistics
				statisticsView.removeLoadingState();
				statisticsView.renderStatistics();
			});								
		};		
		
		/**
		 * Handles period-click to change day.
		 * @param weekDay : String
		 */
		this.handleChangePeriod = function(weekDay){
			if(weekDay === this.currentDay){
				return;
			}
			this.currentDay = weekDay;
			statisticsView.selectPeriod(weekDay);			
			statisticsView.clearStatisticsContainer(); 
			
			// check if data already loaded
			if(this.statisticsDataList[weekDay]){
				statisticsView.renderStatistics();
				return;
			}
			
			// otherwise load and show loading state
			statisticsView.showLoadingState();			
			findStatisticsData({requestedDay : weekDay, requestedWeek : !weekDay ? scope.week.startOfWeek : null}, function(resp){
				// update model 
				updateModel(resp);

				// show statistics
				statisticsView.removeLoadingState();
				statisticsView.renderStatistics();
			});					
		};
		
		/**
		 * Updates model with data from given response.
		 * Only updates week if coming in response.
		 * @param resp : {week : Week (optional), statisticsData : StatisticsDataHolder}
		 */
		function updateModel(resp){
			var statisticsData = resp.statisticsData;
			scope.statisticsDataList[statisticsData.weekDay] = statisticsData;		
			scope.week = resp.week || scope.week;
			scope.currentDay = statisticsData.weekDay;
		}
		
		/**
		 * Fetches data to show-up statistics. Depending on if week or scheduleDate is given
		 * this fetches from server weekly statistics or daily.
		 * @param args : {requestedWeek : Date (date in requested week) for week-data only,
		 * 				   requestedDay : String (like currentDay-format, if data for a day is requested)
		 * @param callback : function({statisticsData : StatisticsDataHolder, week: Week})
		 */
		function findStatisticsData(args, callback){			
			jQuery.ajax({
				url : scope.tableController.CONTROLLER_URL + '/findStatisticsData',
				type : 'POST',
				data : {
					requestedWeek : args.requestedWeek,
					requestedDay : args.requestedDay
				},
				success : callback
			});
		}
		
		/**
		 * Handles resize-events by triggering to re-render the content.
		 */
		this.handleResize = createHandleResize(); 
		
		/**
		 * Creates a resize-handler which delays execution for 300ms
		 * and clears task if invoked twice within waiting time.
		 */
		function createHandleResize() {
			var timeout = undefined;
			return function() {
				statisticsView.clearStatisticsContainer();
				if (timeout) {
					clearTimeout(timeout);
				}
				timout = setTimeout(function() {
					statisticsView.renderStatistics();
					timeout = undefined;
				}, 300);
			};
		}	
		
		init();
		
	}
	
});