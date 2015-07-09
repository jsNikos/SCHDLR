define(['weekDayBar/WeekDayBarView',
        'libs/timeZoneUtils',
        'underscore'],
function(WeekDayBarView, timeZoneUtils){
	return WeekDayBarController;
	
	/**
	 * @param : args {currentDay: string,
	 * 				  week: Week,
	 * 		startOfWeekDay:  int,
	 * 				$el : the context the bar is attached
	 * 				DAY_COORD_FORMAT : string,
	 * 				 onChangePeriod: function(requestedWeek : Date (date in requested week),
	 * 										  requestedDay : String (like currentDay-format, if data for a day is requested),
	 * 				onChangeWeek: function({requestedWeek: selectedDate Long})
	 */
	function WeekDayBarController(args){
		var scope = this;
		var weekDayBarView = undefined;
		this.DAY_COORD_FORMAT = args.DAY_COORD_FORMAT;
		
		// model		
		this.currentDay = args.currentDay || ''; // String, the current selected day, '' means week
		this.week = args.week; // Week, the selected week
		this.startOfWeekDay = args.startOfWeekDay;		
		this.onChangePeriod = args.onChangePeriod || function(){}; 
		this.onChangeWeek = args.onChangeWeek || function(){};
		
		function init(){			
			weekDayBarView = new WeekDayBarView({controller: scope, $el: args.$el});
		}	
		
		/**
		 * Sets the 'dateInWeek' to the selected (server time-zone) and triggers 'changeWeek'
		 * @param selectedDate : Date
		 */
		this.handleWeekSelect = function(selectedDate){						
			return this.onChangeWeek({requestedWeek : selectedDate.getTime()});
		};		
		
		/**
		 * Sets the 'dateInWeek' to one week before/after and triggers 'changeWeek'.
		 * @param weeks : integer, -1 indicates 'prevous week', 1 'next week'
		 */
		this.handleWeekArrowClick = function(weeks){			
			return this.onChangeWeek(createChangeWeekParams(weeks))
					   .then(function(){
							weekDayBarView.weekPicker.setWeek(scope.week.startOfWeek);
						});
		};	
		
		/**
		 * Creates parameter for requesting data for next/previous week.
		 * Contains logic to fix the selected day, if any.
		 * @param addWeeks : integer, number of week to add
		 */
		function createChangeWeekParams(addWeeks) {
			return {
				requestedDay : scope.currentDay
								&& timeZoneUtils.parseInServerTimeAsMoment(scope.currentDay, scope.DAY_COORD_FORMAT)
									.add('weeks', addWeeks)
									.format(scope.DAY_COORD_FORMAT),
				requestedWeek : !scope.currentDay ? 
									timeZoneUtils.parseInServerTimeAsMoment(scope.week.startOfWeek).add('weeks', addWeeks).valueOf() 
									: null
			};
		}
		
		this.updateDateSelectors = function(){
			weekDayBarView.updateDateSelectors();
		};
		
		/**
		 * Triggers rendering weekDay-bar.
		 */
		this.show = function(){
			weekDayBarView.show();
			return this;
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
			weekDayBarView.selectPeriod(weekDay);
			this.onChangePeriod(!weekDay ? scope.week.startOfWeek : null, weekDay);						
		};
		
		init();
	}
});