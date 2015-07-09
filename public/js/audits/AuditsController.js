define(['audits/AuditsView'], function(AuditsView){
	return AuditsController;
	
	function AuditsController(args){
		var scope = this;
		var auditsView = undefined;
		this.tableController = args.tableController;
		
		// model
		this.auditDataList = {}; // {weekDay -> [AuditDataHolder]} map
		
		function init(){			
			auditsView = new AuditsView({controller : scope});
		}	
		
		/**
		 * Triggers to show audit. Loads necessary data from server.
		 * Data will be week-audits.
		 */
		this.show = function(){
			auditsView.show();	
			auditsView.showLoadingState();
			findAuditData(scope.tableController.week.startOfWeek)
				 .then(handleResponse);								
		};
		
		/**
		 * Updates model with data from given response.
		 * Only updates week if coming in response.
		 * @param resp : {week : Week (optional), auditData : [AuditDataHolder], weekDay: string}
		 */
		function updateModel(resp){
			var auditData = resp.auditData;
			scope.auditDataList[resp.weekDay] = auditData;					
		}
		
		this.handleChangePeriod = function(requestedWeek, requestedDay){			
			auditsView.clearAuditsContainer();		
			
			// check if data already loaded
			if(scope.auditDataList[requestedDay]){
				auditsView.renderAudits();
				return;
			}
			
			// otherwise load and show loading state
			auditsView.showLoadingState();			
			findAuditData(requestedWeek, requestedDay).then(handleResponse);		
		};
		
		/**
		 * Based on the 'currentDay', returns the data-model to be rendered
		 * corresponding to this selection.
		 * @return [AuditDataHolder]
		 */
		this.findCurrentModel = function(){
			return this.auditDataList[auditsView.weekDayBarController.currentDay];
		};
		
		/**
		 * Triggers the view to re-render content based on the current-model's week.
		 * First fetches data for this week.		 
		 * @param args : {requestedWeek : Date (date in requested week for week-data only),
		 * 				   requestedDay : String (like currentDay-format, if data for a day is requested)
		 */
		this.handleChangeWeek = function(args){			
			scope.auditsDataList = {};
			auditsView.clearAuditsContainer()
					  .showLoadingState();	
			return findAuditData(args.requestedWeek, args.requestedDay)
					.then(handleResponse)
					.then(function(){
						auditsView.updateDateSelectors();
					});			
		};		
		
		function handleResponse(resp){
			// update model 
			updateModel(resp);
			auditsView.weekDayBarController.currentDay = resp.weekDay;
			auditsView.weekDayBarController.week = resp.week;

			// show audits
			auditsView.removeLoadingState();
			auditsView.renderAudits();
		}		
		
		/** @param args : {requestedWeek : Date (date in requested week) for week-data only,
		 * 				   requestedDay : String (like currentDay-format, if data for a day is requested)
		 * @return Promise resolving to {auditData : [AuditDataHolder], week: Week, weekDay: string}
		 */
		function findAuditData(requestedWeek, requestedDay){			
			return jQuery.ajax({
				url : scope.tableController.CONTROLLER_URL + '/findAuditData',
				type : 'GET',
				data : {
					requestedWeek : requestedWeek,
					requestedDay : requestedDay
				}
			});
		}
		
		/**
		 * Handles resize-events by triggering to re-render the content.
		 */
		this.handleResize = (function() {
			var timeout = undefined;
			return function() {
				auditsView.clearAuditsContainer();
				if (timeout) {
					clearTimeout(timeout);
				}
				timout = setTimeout(function() {
					auditsView.clearAuditsContainer();
					auditsView.renderAudits();
					timeout = undefined;
				}, 300);
			};
		})();
		
		init();
	}
});