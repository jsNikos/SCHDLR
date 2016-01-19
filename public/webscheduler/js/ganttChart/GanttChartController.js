define(['ganttChart/GanttChartModel',
        'ganttChart/GanttChartView',
        'gantt-decor/jQuery.decor.gantt'], function(GanttChartModel, GanttChartView){
	return GanttChartController;

	/**
	 * Intended to support gantt-view of a day.
	 * @args : {tableController : ScheduleTableCtrl}
	 */
	function GanttChartController(args){
		var scope = this;
		this.tableController = args.tableController;
		var ganttChartView = undefined;
		this.ganttChartModel = undefined;

		// custom cell states
		this.customCellStates = {
			green : 'green', /* shift overwriting forecasted shift */
			yellow : 'yellow', /* shift without forecasted shift */
			red : 'red' /* forecasted shift */
		};

		function init(){
			ganttChartView = new GanttChartView({controller: scope});
		}

		/**
		 * Triggers to fetch data from server and to show gantt-chart.
		 */
		this.showGanttView = function(weekDay){
			ganttChartView.show({weekDay : weekDay});
			// fetch timeSlots fro the day
			fetchGanttChartInit(weekDay, function(resp){
				ganttChartView.hideLoading();
				var schedule = scope.tableController.findScheduleByWeekDay(weekDay);
				// create gantt-model
				scope.ganttChartModel = new GanttChartModel({
					scheduleDetails : schedule != null ? schedule.scheduleDetailHolders : [],
					shiftForecasts : resp.shiftForecasts,
					timeSlots : resp.timeSlots,
					labelGranularity : resp.labelGranularity
				});

				// render the gantt-chart
				ganttChartView.renderGanttChart();
			});
		};


		/**
		 * Handles resize-events by triggering to re-render the gantt-chart.
		 */
		this.handleResize = function(){
			ganttChartView.clearGanttChart();
			this.renderDuringResize();
		}.bind(this);

		/**
		 * Render-call to be used during resizing-events.
		 */
		this.renderDuringResize = _ext.waitAtLeast(function(){
			ganttChartView.renderGanttChart();
		}, 500);

		/**
		 * Fetches init-data for gantt-chart, for given weekDay.
		 *
		 * @param weekDay {String}
		 * @param callback: function({columnModels : [TimeSlotHolder]})
		 */
		function fetchGanttChartInit(weekDay, callback) {
			return jQuery.ajax({
				url : scope.tableController.CONTROLLER_URL + '/findGanttChartInit',
				dataType : 'json',
				type : 'GET',
				data : {
					weekDay : weekDay
				},
				success : callback
			});
		}

		init();

	}

});
