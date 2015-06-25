define(['text!../statisticsTemplates.html',
        'libs/timeZoneUtils',
        'libs/WeekPicker',
        'table-decor/jQuery.decor.hierarchyTable'],
function(statisticsTmpls, timeZoneUtils, WeekPicker){
	return StatisticsView;
	
	function StatisticsView(args){
		var scope = this;
		var controller = args.controller;
		var popupTemplateSelector = '.statistics.popup.tmpl';
		this.weekPicker = undefined; // WeekPicker, initialized in 'show'
		
		// el
		var $statisticsPopup = undefined;
		var $statisticsContainer = undefined;	
		var $selectedWeek = undefined; // points to the week header
		
		// templates		
		var statisticsDataTmpl = undefined;
		var periodSelectTmpl = undefined;
		
		function init(){	
			addTemplates();			
			initTemplates();
		}
		
		function initTemplates(){
			statisticsDataTmpl = _.template(jQuery('.statistics.data.tmpl').text());
			periodSelectTmpl = _.template(jQuery('.statistics.period-select.tmpl').text());
		}
		
		/**
		 * Adds templates to dom if not already there.
		 */
		function addTemplates(){
			if(jQuery(popupTemplateSelector).size() > 0){
				// already added to dom
				return;
			}
			jQuery('body').append(statisticsTmpls);
		}
		
		/**
		 * Triggers to show popup in loading-state.
		 */
		this.show = function(){			
			var dialogDecor = jQuery.decor.dialogDecor({
				$el : jQuery(createFromTemplate()),
				options : {					
					editorHeight : 580,				
					onTheFly : true,
					showClosing : true,
					onClosing : onClosing
				}
			});
			$statisticsPopup = dialogDecor.$el;
			$statisticsContainer = $statisticsPopup.find('.statistics.container');
			initPeriodSelect();		
			
			// custom positioning and styling			
			dialogDecor.$wrapper.addClass('statistics').append('body'); // it's big - needs scrolling			
			$statisticsPopup.css({top: jQuery('html').scrollTop()+20+'px',
								width: '98%',
							   height: 'auto',
						'margin-left': '-49%'});
			$statisticsPopup.children('.content').css({height : 'auto'});
			
			// attach resize-handler 
			jQuery(window).on('resize', controller.handleResize);
			
			// render popup-container
			dialogDecor.showDialog();						
			$statisticsContainer = jQuery('.statistics.container', $statisticsPopup);
			this.showLoadingState();
			initWeekSelect();
		};
		
		/**
		 * Inits the week-selection.
		 */
		function initWeekSelect(){			
			scope.weekPicker = new WeekPicker({
				$el : jQuery('.datePicker', $statisticsPopup),
				selectedDate : new Date(controller.tableController.week.startOfWeek),
				startOfWeekDay: controller.tableController.startOfWeekDay
			});	
			$selectedWeek = jQuery('.week .change', $statisticsPopup);
			$selectedWeek.on('click', function(){
				scope.weekPicker.getEl().slideToggle();
			});
			
			scope.weekPicker.on('dateSelected', function(weekPicker){
				weekPicker.getEl().slideToggle(function(){
					controller.handleWeekSelect(weekPicker.selectedDate);	
				});				
			});			
			
			jQuery('.week .previous', $statisticsPopup).on('click', onArrowClicked);
			jQuery('.week .next', $statisticsPopup).on('click', onArrowClicked);	
			function onArrowClicked(event){
				var $target = jQuery(event.target);						
				controller.handleWeekArrowClick($target.hasClass('previous') ? -1 : 1);
			}
			
		}
		
		/**
		 * Inits period selection by registering click-listeners and pre-selecting.
		 */
		function initPeriodSelect(){
			$statisticsPopup.on('click', '.period-select', function(event){
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
			jQuery('.period-select', $statisticsPopup).removeClass('selected');
			jQuery('.period-select[data-weekday="'+day+'"]', $statisticsPopup).addClass('selected');
		};
		
		/**
		 * Show statistics container in loading-state.
		 */
		this.showLoadingState = function(){
			$statisticsContainer.addClass('loading');
			return this;
		};
		
		/**
		 * Removes loading state from statistics container.
		 */
		this.removeLoadingState = function(){
			$statisticsContainer.removeClass('loading');
			return this;
		};
		
		/**
		 * Clears the statistics-container by removing all content. Delegating listeners remain!
		 */
		this.clearStatisticsContainer = function(){
			$statisticsContainer.empty();
			return this;
		};
		
		/**
		 * Renders statistics-data into container corresponding to model of current selected
		 * day.
		 */
		this.renderStatistics = function() {
			var rowHeight = 30; 
			var columnHeight = 30;
			
			// clear container
			this.clearStatisticsContainer();

			// render model of current selection
			var statisticsData = controller.findCurrentModel();
			if(!statisticsData){return;}
			$statisticsContainer.append(statisticsDataTmpl(statisticsData));
			var $bigFigures = jQuery('.big-figures', $statisticsContainer);
			var maxFontSize = parseInt(jQuery('body').css('font-size'));
			$bigFigures.css('font-size', Math.min(jQuery(':first', $bigFigures).width()/15, maxFontSize));
			var $tableContainer = jQuery('.table-container', $statisticsContainer);
			var statisticsData = controller.findCurrentModel(); 
			$tableContainer.hierarchyTableDecor(_.chain(statisticsData).extend({
					fixFooter : true,
					tableWidth : $tableContainer.width() - 70,
					tableHeight : findOptTableHeight(statisticsData, rowHeight, columnHeight),
					rowHeight : rowHeight,
					columnWidth : 100,
					columnHeight : columnHeight,
					fixedColumnWidth : 150,
					onRenderDataCell : onRenderDataCell
				}).value());
			return this;
		};
		
		/**
		 * Called when cell is rendered. In case cell belongs to fixed-cells (column-id 'Roles') 
		 * adds the content as title to cell.
		 * @param args : {row: RowModel, column: ColumnModel, colidx: integer, $cell}		
		 */ 
		function onRenderDataCell(args){
			if(args.column.id === 'Role'){
				var $content = args.$cell.children('.content');
				$content.attr('title', $content.text());
			}
			return args.$cell;
		}
		
		/**
		 * Based on given parameters together with the given view-ports height, this 
		 * tries to optimize the table-height.
		 * @param statisticsData : StatisticsDataHolder
		 * @param rowHeight : integer
		 */
		function findOptTableHeight(statisticsData, rowHeight, columnHeight){
			var minHeight =180;
			var maxHeight = jQuery(window).height() - 280;			
			var computed = statisticsData.rows.length * rowHeight + 2*columnHeight;			
			computed = Math.min(maxHeight, computed);
			computed = Math.max(minHeight, computed);						
			return computed;			
		}
		

		/**
		 * Creates popup-html fragment from template.
		 * 
		 * @returns
		 */
		function createFromTemplate() {					
			return _.template(jQuery('.statistics.popup.tmpl').text(), {
				week : 'Week of ' + formatSelectedWeek(),
				renderPeriods : renderPeriods				
			});
		}
		
		/**
		 * Formats week (selected week) for displaying in header.
		 * @returns
		 */
		function formatSelectedWeek(){
			return timeZoneUtils.parseInServerTimeAsMoment(controller.week.startOfWeek).format('dddd, MMMM D YYYY');
		}
		
		/**
		 * Updates week-container and period-select container with current model. 
		 */
		this.updateDateSelectors = function(){
			$selectedWeek.text('Week of '+formatSelectedWeek());
			jQuery('.periods', $statisticsPopup)
				.empty()
				.append(renderPeriods());
			scope.selectPeriod(controller.currentDay);
			return this;
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
								  	label : timeZoneUtils.parseInServerTimeAsMoment(weekDay, controller.tableController.DAY_COORD_FORMAT)
								  				.format('dddd D')
								   };
						 })
					.each(function(info){ /* render in template */
						$holder.append(periodSelectTmpl(info));					
					});					
			return $holder.html();
		}
		
		/**
		 * Invoked when dialog is closed. Cleans-up global listeners.
		 */
		function onClosing(){
			jQuery(window).off('resize', controller.handleResize);
		}
		
		init();
		
	}	
	
});