define(['statistics/StatisticsView', 'timeZoneUtils', 'weekDayBar/WeekDayBarController'],
function(StatisticsView, timeZoneUtils, WeekDayBarController){
	return StatisticsController;
	
	function StatisticsController(args){
		var scope = this;
		var statisticsView = undefined;		
		this.tableController = args.tableController;
		
		// model
		this.statisticsDataList = {}; // {weekDay -> StatisticsDataHolder} map		
		
		function init(){			
			statisticsView = new StatisticsView({controller : scope});
		}	
		
		/**
		 * Triggers the view to re-render content based on the current-model's week.
		 * First fetches data for this week.		 
		 * @param args : {requestedWeek : Date (date in requested week for week-data only),
		 * 				   requestedDay : String (like currentDay-format, if data for a day is requested)
		 */
		this.handleChangeWeek = function(args){			
			scope.statisticsDataList = {};
			statisticsView.clearStatisticsContainer()
			  			  .showLoadingState();		
			return findStatisticsData(args)
					.then(handleResponse)
					.then(function(){
						statisticsView.updateDateSelectors();
					});			
		};
		
		function handleResponse(resp){
			// update model 
			updateModel(resp);
			statisticsView.weekDayBarController.currentDay = resp.statisticsData.weekDay;
			statisticsView.weekDayBarController.week = resp.week;

			// show audits
			statisticsView.removeLoadingState();
			statisticsView.renderStatistics();
		}						
		
		/**
		 * Based on the 'currentDay', returns the data-model to be rendered
		 * corresponding to this selection.
		 * @return StatisticsDataHolder
		 */
		this.findCurrentModel = function(){
			return this.statisticsDataList[statisticsView.weekDayBarController.currentDay];
		};
		
		/**
		 * Triggers to show statistics. Loads necessary data from server.
		 * Data will be week-statistic.
		 */
		this.show = function(){
			statisticsView.show();	
			statisticsView.showLoadingState();
			findStatisticsData({requestedWeek : scope.tableController.week.startOfWeek}).then(handleResponse);								
		};		
				
		this.handleChangePeriod = function(requestedWeek, requestedDay){					
			statisticsView.clearStatisticsContainer(); 
			
			// check if data already loaded
			if(scope.statisticsDataList[requestedDay]){
				statisticsView.renderStatistics();
				return;
			}
			
			// otherwise load and show loading state
			statisticsView.showLoadingState();			
			findStatisticsData({requestedDay : requestedDay, requestedWeek : requestedWeek}).then(handleResponse);
		};
		
		/**
		 * Updates model with data from given response.
		 * Only updates week if coming in response.
		 * @param resp : {week : Week (optional), statisticsData : StatisticsDataHolder}
		 */
		function updateModel(resp){
			var statisticsData = resp.statisticsData;
			scope.statisticsDataList[statisticsData.weekDay] = statisticsData;			
		}
		
		/**
		 * Fetches data to show-up statistics. Depending on if week or scheduleDate is given
		 * this fetches from server weekly statistics or daily.
		 * @param args : {requestedWeek : Date (date in requested week) for week-data only,
		 * 				   requestedDay : String (like currentDay-format, if data for a day is requested)
		 */
		function findStatisticsData(args){		
			return jQuery.ajax({
				url : scope.tableController.CONTROLLER_URL + '/findStatisticsData',
				type : 'POST',
				data : {
					requestedWeek : args.requestedWeek,
					requestedDay : args.requestedDay
				}
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
				timeout = setTimeout(function() {
					statisticsView.renderStatistics();
					timeout = undefined;
				}, 300);
			};
		}	
		
		init();
		
	}
	
});