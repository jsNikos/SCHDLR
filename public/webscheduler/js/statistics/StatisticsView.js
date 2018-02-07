define(['timeZoneUtils',
        'libs/WeekPicker',
        'weekDayBar/WeekDayBarController',
        'text!statistics/statisticsPopup.html',
        'text!statistics/statisticsData.html',
        'table-decor/jQuery.decor.hierarchyTable',
        'css!statistics/statistics.css',
        'animo'],
        function(timeZoneUtils, WeekPicker, WeekDayBarController,
        	statisticsPopupHtml, statisticsDataHtml){
    return StatisticsView;

    function StatisticsView(args){
	var scope = this;
	var controller = args.controller;
	this.weekDayBarController = undefined; // WeekDayBarController

	// el
	var $statisticsPopup = undefined;
	var $statisticsContainer = undefined;

	// templates
	var statisticsDataTmpl =  _.template(statisticsDataHtml);

	/**
	 * Triggers to show popup in loading-state.
	 */
	this.show = function(){
	    var dialogDecor = jQuery.decor.dialogDecor({
		$el : jQuery(_.template(statisticsPopupHtml)()),
		options : {
		    editorHeight : 580,
		    onTheFly : true,
		    showClosing : true,
		    onClosing : onClosing
		}
	    });
	    $statisticsPopup = dialogDecor.$el;
	    $statisticsContainer = $statisticsPopup.find('.statistics.container');

	    // custom positioning and styling
	    dialogDecor.$wrapper.addClass('statistics').append('body'); // it's big - needs scrolling
	    $statisticsPopup.css({top: jQuery('html').scrollTop() + 'px',
		width: '98%',
		height: 'auto',
		'margin-left': '-49%'});
	    $statisticsPopup.children('.content').css({height : 'auto'});

	    // attach resize-handler
	    jQuery(window).on('resize', controller.handleResize);

	    // adding weekDay-bar
	    scope.weekDayBarController = (new WeekDayBarController({
		week: controller.webSchedulerController.vueScope.$data.week,
		DAY_COORD_FORMAT : controller.tableController.DAY_COORD_FORMAT,
		startOfWeekDay: controller.tableController.startOfWeekDay,
		$el: $statisticsPopup.find('.week-day-container'),
		onChangePeriod: controller.handleChangePeriod,
		onChangeWeek: controller.handleChangeWeek
	    })).show();

	    // render popup-container
	    dialogDecor.showDialog();
	    dialogDecor.$el.animo( { animation: 'flipInX' } );
	    $statisticsContainer = jQuery('.statistics.container', $statisticsPopup);
	    this.showLoadingState();
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

		// creating template and rendering big-data
		const getBigDataLabel = v => v.includes(':') ? v.split(':')[0] : '';
		const getBigDataValue = v => v.substr(v.indexOf(':') + 1).trim();
		let statisticsDataExt = {getBigDataLabel, getBigDataValue, ...statisticsData};
	    $statisticsContainer.append(statisticsDataTmpl(statisticsDataExt));
	    var $tableContainer = jQuery('.table-container', $statisticsContainer);

		// rendering data-table
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

	this.updateDateSelectors = function(){
	    scope.weekDayBarController.updateDateSelectors();
	};

	/**
	 * Invoked when dialog is closed. Cleans-up global listeners.
	 */
	function onClosing(){
	    jQuery(window).off('resize', controller.handleResize);
	}

    }

});
