define(['text!weekDayBar/weekDayBar.html',
        'libs/timeZoneUtils',
        'libs/WeekPicker',
        'underscore',
        'css!weekDayBar/weekDayBar.css'],
function(weekDayBarHtml, timeZoneUtils, WeekPicker){
	return WeekDayBarView;
	
	/**
	 * @param : args {controller: WeekDayBarController, $el : dom-context)
	 */
	function WeekDayBarView(args){
		var scope = this;
		var controller = args.controller;		
		this.weekPicker = undefined; // WeekPicker
		var $el = args.$el; // el which this component is attached		
		
		var periodSelectTmpl = _.template('<div class="period-select" data-weekday="<%- day %>"><%- label %></div>');
				
		/**
		 * Adds weekDayBar to el.
		 */
		this.show = function(){			
			$el.append(_.template(weekDayBarHtml, {
				week : 'Week of ' + formatSelectedWeek(),
				renderPeriods : renderPeriods		
			}));
			initPeriodSelect();
			initWeekSelect();
		};
		
		/**
		 * Inits the week-selection.
		 */
		function initWeekSelect(){			
			scope.weekPicker = new WeekPicker({
				$el : $el.find('.datePicker'),
				selectedDate : new Date(controller.week.startOfWeek),
				startOfWeekDay: controller.startOfWeekDay
			});	 
			$el.find('.week .change').on('click', function(){
				scope.weekPicker.getEl().slideToggle();
			});
			
			scope.weekPicker.on('dateSelected', function(weekPicker){
				weekPicker.getEl().slideToggle(function(){
					controller.handleWeekSelect(weekPicker.selectedDate);	
				});				
			});			
			
			$el.find('.week .previous').on('click', onArrowClicked);
			$el.find('.week .next').on('click', onArrowClicked);	
			function onArrowClicked(event){
				var $target = jQuery(event.target); 					
				controller.handleWeekArrowClick($target.hasClass('previous') ? -1 : 1);
			}			
		}
		
		/**
		 * Updates week-container and period-select container with current model. 
		 */
		this.updateDateSelectors = function(){
			$el.find('.week .change').text('Week of '+formatSelectedWeek());
			$el.find('.periods')
				.empty()
				.append(renderPeriods());
			scope.selectPeriod(controller.currentDay);
			return this;
		};
		
		/**
		 * Inits period selection by registering click-listeners and pre-selecting.
		 */
		function initPeriodSelect(){ 
			$el.on('click', '.period-select', function(event){
				var weekDay = jQuery(event.target).attr('data-weekday');				
				controller.handleChangePeriod(weekDay);
			});
			scope.selectPeriod(controller.currentDay);
		}		
		
		/**
		 * Changes selection-status on given day, '' is week.
		 * @param day : String
		 */
		this.selectPeriod = function(day){
			$el.find('.period-select').removeClass('selected');
			$el.find('.period-select[data-weekday="'+day+'"]').addClass('selected');
		};
		
		/**
		 * Returns html for selectable perdios (week, days)
		 */
		function renderPeriods(){			
			var $holder = jQuery('<div></div>');
			$holder.append(periodSelectTmpl({day: '', label: 'Week'}));
			_.chain(controller.week.weekDays)
					.map(function(weekDay){ /* extract week-days for display */
							return {day : weekDay,
								  	label : timeZoneUtils.parseInServerTimeAsMoment(weekDay, controller.DAY_COORD_FORMAT)
								  				.format('dddd D')
								   };
						 })
					.each(function(info){ /* render in template */
						$holder.append(periodSelectTmpl(info));					
					});					
			return $holder.html();
		}
		
		/**
		 * Formats week (selected week) for displaying in header.
		 * @returns
		 */
		function formatSelectedWeek(){
			return timeZoneUtils.parseInServerTimeAsMoment(controller.week.startOfWeek).format('dddd, MMMM D YYYY');
		}
	}
});