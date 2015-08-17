define(['EventEmitter', 'timeZoneUtils'], function(EventEmitter, timeZoneUtils){
	return function(args){
		WeekPicker.prototype = new EventEmitter();
		return new WeekPicker(args);
	};
	
	/**
	 * Adds a datepicker to the given $el and changes its behaviour by making
	 * entire weeks selectable only.
	 * 
	 * @class WeekPicker
	 * @constructor
	 */
	function WeekPicker(args) {
		var scope = this;
		var $el = args.$el;
		/* Exposing the data-picker's method. */
		this.datepicker = undefined;
		/* events */
		var DATE_SELECTED = 'dateSelected';

		// holds selected week dates {Date}
		this.firstDate = undefined;
		this.lastDate = undefined;
		// {Date}
		this.selectedDate = args.selectedDate;
		this.startOfWeekDay = args.startOfWeekDay == undefined ? 0 : args.startOfWeekDay;

		function init() {
			$el.datepicker({
				firstDay : scope.startOfWeekDay, 
				selectOtherMonths : true,
				showOtherMonths : true,
				showWeek : true,
				showAnim : 'slideDown',
				onSelect : function(dayStrg, datePicker) {
					scope.selectedDate = new Date(timeZoneUtils.parseInServerTime($el.datepicker('getDate')));
					scope.firstDate = findFirstOfWeek(scope.selectedDate);
					scope.lastDate = findLastOfWeek(scope.firstDate);
					selectWeek(function() {
						scope.fire(DATE_SELECTED, scope);
					});
				},
				beforeShowDay : function(date) {
					var styleClass = ''; 
					var dateMoment = timeZoneUtils.parseInServerTimeAsMoment(timeZoneUtils.parseInServerTime(date));
					if (dateMoment.isBefore(scope.lastDate, 'day')
							&& dateMoment.isAfter(scope.firstDate, 'day')
							|| dateMoment.isSame(scope.firstDate, 'day')
							|| dateMoment.isSame(scope.lastDate, 'day')) {
						styleClass = 'active-week';
					}
					return [ true, styleClass ];
				},
				onChangeMonthYear : selectWeek
			});
			scope.datepicker = $el.datepicker.bind($el);
			scope.selectedDate && scope.setWeek(scope.selectedDate);
		}

		/**
		 * Sets a week in datapicker corresponding to given dateInWeek.
		 * Sets selectedDate, firstDate, lastDate.
		 * @param dateInWeek : Date or integer
		 */
		this.setWeek = function(dateInWeek){
			if(_.isNumber(dateInWeek)){
				dateInWeek = new Date(dateInWeek);
			}
			scope.selectedDate = dateInWeek;
			scope.firstDate = findFirstOfWeek(scope.selectedDate);
			scope.lastDate = findLastOfWeek(scope.firstDate);
			scope.datepicker('setDate', timeZoneUtils.inServerTime(dateInWeek.getTime()));
			syncSelectWeek();
		};
		

		function findLastOfWeek(selectedDate) {
			return timeZoneUtils.parseInServerTimeAsMoment(findFirstOfWeek(selectedDate))
								.add('days', 6).toDate();			
		}	
		
		function findFirstOfWeek(date) {
			var mom = timeZoneUtils.parseInServerTimeAsMoment(date); 
			var deltaToStart = mom.day() - scope.startOfWeekDay;
			var daysFromStart = deltaToStart >= 0 ? deltaToStart : deltaToStart + 7;
			return mom.subtract('days', daysFromStart).toDate();
		}
		
		
		/**
		 * Exposing the wrapped date-picker.
		 * 
		 * @method getEl *
		 * @returns
		 */
		this.getEl = function() {
			return $el;
		};

		/**
		 * Async selects the week corresponding to the current selected day.
		 * 
		 * @param callback
		 */
		function selectWeek(callback) {
			setTimeout(function() {
				syncSelectWeek();
				if (typeof callback === 'function') {
					callback();
				}
			}, 0);
		}
		
		/**
		 * Synchronous version of 'selectWeek'
		 */
		function syncSelectWeek(){
			var $calendar = jQuery('.ui-datepicker-calendar', $el);
			jQuery('td.active-week a', $calendar).addClass(
					'ui-state-active');
		}	

		init();

	}

});