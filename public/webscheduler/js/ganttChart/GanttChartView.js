define(['timeZoneUtils',
        'text!ganttChart/ganttChartPopup.html',
        'animo',
        'css!ganttChart/ganttChart.css'],
function(timeZoneUtils, ganttChartPopupHtml){
	return GanttChartView;
	
	/**
	 * View overseeing gantt-chart popup.
	 * Note: the pop-up is of type on-the-fly, that is on closing all el's are not valid anymore
	 * and listeners removed.
	 * 
	 * @constructor
	 * param args : {controller: GanttChartController}
	 */
	function GanttChartView(args){
		var controller = args.controller;
		
		// el's, view is based on on-the-fly popup - thus el's are temporaly always
		var $ganttPopup = undefined;
		var $ganttContainer = undefined;
		
		// templates
		var ganttChartPopup = _.template(ganttChartPopupHtml);
		var lineInfoTmpl = _.template('<div class="line-info" title="<%- info %>"></div>');
		
		// parameter
		var rowWidth = 200;		
		
		/**
		 * Hides loading state on view.
		 */
		this.hideLoading = function(){
			$ganttContainer.removeClass('loading');
		};
		
		/**
		 *	Opens pop-up which intends to hold gantt-chart and registers listener.
		 * @param args : {weekDay : String}
		 */
		this.show = function(args){
			var formattedDay = timeZoneUtils.parseInServerTimeAsMoment(args.weekDay, controller.tableController.DAY_COORD_FORMAT)
											.format('dddd, MMMM D YYYY');	
			var dialogDecor = jQuery.decor.dialogDecor({
				$el : jQuery(ganttChartPopup({day : formattedDay})),
				options : {					
					editorHeight : 500,
					onTheFly : true,
					showClosing : true,
					onClosing : onClosing
				}
			});
			// custom positioning and styling
			dialogDecor.$wrapper.addClass('gantt').append('body'); // it's big - needs scrolling			
			$ganttPopup = dialogDecor.$el.css({top: jQuery('html').scrollTop()+20+'px',
											 width: '98%',
									 'margin-left': '-49%'});			
			
			// attach resize-handler 
			jQuery(window).on('resize', controller.handleResize);
			
			// render gantt-container
			dialogDecor.showDialog();	
			dialogDecor.$el.animo( { animation: 'flipInX' } );
			$ganttContainer = jQuery('.gantt.container', $ganttPopup).addClass('loading');
		};
		
		
		
		/**
		 * Invoked when dialog is closed. Cleans-up global listeners.
		 */
		function onClosing(){
			jQuery(window).off('resize', controller.handleResize);
		}
		
		/**
		 * Renders gantt-chart into view based on controller's model.
		 */
		this.renderGanttChart = function(){
			var options = _.extend({
				cellWidth : findOptimalCellWidth(),
				cellHeight : 20,
				rowWidth : rowWidth,
				readonly : true,
				customCellStates : controller.customCellStates,
				onLineDrawn : onLineDrawn,
				addCellState : addCellState,
				formatColumnLabel : createColLabelFormatter(),
				headerColumnHeight : controller.tableController.weeklyScheduleInRegularTimeFormat ? '75px' : '55px'
			}, controller.ganttChartModel);
			$ganttContainer.ganttDecor(options);
		};
		
		/**
		 * Computes the cell-width being optimal for the current container-size.
		 */
		function findOptimalCellWidth(){			
			var computed = ($ganttContainer.width() - rowWidth) / controller.ganttChartModel.columns.length;
			return Math.max(20, Math.floor(computed) - 2);			
		}
		
		/**
		 * Creates a formatting function to be used to format column-labels.
		 */
		function createColLabelFormatter() {
			var lastShown; // startTime which was labeled lastly
			return function(column) {
				if (lastShown == undefined) {
					lastShown = column.startTime;
					return column.label;
				}
				if (column.startTime - lastShown >= controller.ganttChartModel.labelGranularity * 60 * 1000) {
					lastShown = column.startTime;
					return column.label;
				}
				return '';
			};
		}
		
		this.clearGanttChart = function(){
			$ganttContainer.empty().off();			
		};
		
		/**
		 * Changes cell's state by taking into account forecast.
		 * If cell is resolved in the sense that a forcasted shift is covered by
		 * a real shift - the cell is flagged 'green', ... 
		 * @param ganttController
		 * @param $cell
		 * @param line
		 * @param columnIdx : column-idx relative to line's columns
		 */
		function addCellState(ganttController, $cell, line, columnIdx){			
			var column = line.columns[columnIdx];
			var isResolved = line.resolved[column.id];
			var isForecastShift = line.forecast;			
			if(isForecastShift){
				// red-flagged
				!isResolved && addStates([ganttController.cellStates.red, ganttController.cellStates.marked]);
				!isResolved && addLineId();
				applyBoundaryStyles(ganttController, $cell, line, columnIdx);
			} else{
				// green-flagged
				isResolved && addStates([ganttController.cellStates.green, ganttController.cellStates.marked]);
				!isResolved && addStates([ganttController.cellStates.yellow, ganttController.cellStates.marked]);
				addLineId();				
				applyBoundaryStyles(ganttController, $cell, line, columnIdx);				
			} 
			
			// adds the given state-classes
			function addStates(states){
				if(!(states instanceof Array)){
					states = [states];
				}
				$cell.addClass(states.join(' '));
			}
			
			// adds line-id to cell's data-attr
			function addLineId(){
				$cell.attr('data-lineid', line && line.id);
			}
		}
		
		/**
		 * Contains logic to add start/end styling to given cell.
		 * @param ganttController
		 * @param $cell
		 * @param line
		 * @param columnIdx : column-idx relative to line's columns
		 */
		function applyBoundaryStyles(ganttController, $cell, line, columnIdx) {
			if (!line.forecast) {
				// a real shift	
				cleanBoundaryStyle();
				checkToApplyStart();
				checkToApplyEnd();				
			} else {
				// a forecast shift
				var column = line.columns[columnIdx];
				// only if forecast is not resolved by shift 
				if(line.resolved[column.id]){
					return;
				}
				cleanBoundaryStyle();
				if(!checkToApplyStart()){
					// if previous is resolved - it's a start
					var prevCol = line.columns[columnIdx - 1];					
					line.resolved[prevCol.id] && $cell.addClass(ganttController.cellStates.start);
				}
				if(!checkToApplyEnd()){
					// if next is resolved - it's an end
					var nextCol = line.columns[columnIdx + 1];
					line.resolved[nextCol.id] && $cell.addClass(ganttController.cellStates.end);
				}
			}
			
			// checks if its start of line and applies style in case
			function checkToApplyStart(){
				if (columnIdx === 0) {
					$cell.addClass(ganttController.cellStates.start);
					return true;
				}
			}
			
			// checks if its end of line and applies style in case
			function checkToApplyEnd(){
				if (columnIdx === line.columns.length - 1) {
					$cell.addClass(ganttController.cellStates.end);
					return true;
				}
			}
			
			// removes start/end styles
			function cleanBoundaryStyle(){
				$cell.removeClass([ganttController.cellStates.start, ganttController.cellStates.end].join(' '));
			}
		}
		
		/**
		 * Wraps line into info-container.
		 * @param ganttController
		 * @param lineModel
		 */
		function onLineDrawn(ganttController, lineModel){
			if(lineModel.forecast){
				return;
			}
			var info = controller.tableController.findEmployee(lineModel.employeeName).displayName;
			info += ' (' + formatShiftTime(lineModel.startTime) + ' - ' + formatShiftTime(lineModel.endTime + 1000) + ')';
			var $lineInfo = jQuery(lineInfoTmpl({info: info})).data('scheduleDetail', lineModel);			
			controller.tableController.tableView.reRenderValidIssues($lineInfo);
			jQuery('[data-lineid="'+lineModel.id+'"]', $ganttContainer)
				.wrapAll($lineInfo)
				.first()
				.parent()
				.prepend(_.template('<div class="info"><%- info %></div>')({info: info}));
		}
		
		/**
		 * Intends to format shift-time as presented on lines.
		 * @return String
		 */
		function formatShiftTime(time){
			var formatStrg = controller.tableController.weeklyScheduleInRegularTimeFormat ? 'h:mm a' : 'HH:mm';
			return timeZoneUtils.parseInServerTimeAsMoment(time).format(formatStrg);
		}
		
	}
	
});
