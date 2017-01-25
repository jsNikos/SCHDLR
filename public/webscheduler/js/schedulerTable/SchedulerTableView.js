define(['vue', 'q', 'EventEmitter', 'timeZoneUtils', 'css!schedulerTable/schedulerTable.css', 'css!fontawsome'],
	function(Vue, q, EventEmitter, timeZoneUtils){
    return function(args){
	SchedulerTableView.prototype = new EventEmitter();
	return new SchedulerTableView(args);
    };

    /**
     * The view manages the pure table, the week-day header and all totals.
     * It is ABSTRACT and serves for both 'byEmployees' and 'byRoles'.
     * @param args : {$schedulerEl}, the scheduler-table context used for this instance
     * @constructor
     */
    function SchedulerTableView(args) {
	var scope = undefined;
	this.tableController = undefined;
	this.flagOverhours = true;

	// events
	var DROP = 'drop';
	var REMOVE = 'remove';
	var CREATE = 'create';
	var EDIT = 'edit';

	// el's
	this.$scheduler = args.$schedulerEl;
	var $schedulerWrapper = this.$scheduler.parent();
	var $weekDaysHeader = jQuery('.week-days-header', $schedulerWrapper);
	var $totalsFooter = jQuery('.totals-footer', $schedulerWrapper);
	var $loadingOverlay = jQuery('.loading-overlay', $schedulerWrapper);

	// template
	var weekDayTmpl = _.template(jQuery('#weekDateTmpl').text());
	var weeklyTotalTmpl = _.template(jQuery('#weeklyTotalTmpl').text());
	var rowTotalTmpl = _.template(jQuery('#rowTotalTmpl').text());
	var shiftsBlockerTmpl = _.template(jQuery('#shiftsBlockerTmpl').text());
	var errorPopupTmpl = _.template(jQuery('#errorPopupTmpl').text());
	var shiftCellTotalTmpl = _.template(jQuery('#shiftCellTotalTmpl').text());
	var overwriteIssuesTmpl = _.template(jQuery('#overwriteIssuesTmpl').text());

	this.init = function() {
	    scope = this;
	    initShiftRemove();
	    initShiftCreate();
	    initShiftEdit();
	    initWeekDays();
	    initVerticalScroll();
	    initSyncTableWidth();
	};

	/**
	 * Registers delegating click-listener on week-days. Intended
	 * to trigger gantt-chart view.
	 */
	function initWeekDays(){
	    $weekDaysHeader
	    .on('click', '.week-day', function(event){
		scope.tableController.handleWeekDayClicked(jQuery(event.target));
	    })
	    .on('click', '.event-creator', function(event){
		var weekDay = jQuery(event.target).attr('data-weekday');
		showCalendarEventEditor(weekDay)
		.then(function(calendarEvent){
		    if(calendarEvent){
			var calendarEventWeek = scope.tableController.webSchedulerController.vueScope.$data.calendarEventWeek;
			calendarEventWeek[weekDay].push(calendarEvent);
			renderCalendarEvents(jQuery('tr.calendar-events'));
		    }
		})
		.catch(console.log);
	    })
	    .on('click', '[data-role="remove-event"]', function(event){
		var $calendarEvent = jQuery(event.target).closest('.calendar-event');
		var weekDay = $calendarEvent.attr('data-weekday');
		var event = $calendarEvent.attr('data-event');
		var calendarEvent = findCalendarEvent(weekDay, event);
		deleteCalendarEvent(calendarEvent)
		.then(function(){
		    var calendarEventWeek = scope.tableController.webSchedulerController.vueScope.$data.calendarEventWeek;
		    var idx = _.findIndex(calendarEventWeek[weekDay], function(elem){
			return elem.event = calendarEvent.event;
		    });
		    calendarEventWeek[weekDay].splice(idx, 1);
		    renderCalendarEvents(jQuery('tr.calendar-events'));
		})
		.catch(console.log);
	    });
	}

	function findCalendarEvent(weekDay, event){
	    var calendarEventWeek = scope.tableController.webSchedulerController.vueScope.$data.calendarEventWeek;
	    return _.findWhere(calendarEventWeek[weekDay], {
		event: event
	    });
	}

	function deleteCalendarEvent(calendarEvent){
	    var deferred = q.defer();
	    jQuery.ajax({
		url: '/ws/integrated/v1/store/calendarEvents?'+jQuery.param({id: calendarEvent.id}),
		method: 'DELETE',
		contentType: 'application/json',
		success: deferred.resolve.bind(deferred),
		error: deferred.reject.bind(deferred),
	    });
	    return deferred.promise;
	}

	function showCalendarEventEditor(weekDay){
	    return q.Promise(function(resolve, reject){
		require(['calendarEventEditor/CalendarEventEditor'], function(CalendarEventEditor){
		    (new CalendarEventEditor(weekDay, scope.tableController.DAY_COORD_FORMAT))
		    .then(resolve)
		    .catch(reject);
		});
	    });
	}

	/**
	 * Handles window-resize by adjusting width of week-day-header and
	 * totals-footer to width of scheduler-table.
	 * The clue is, it is independend of the positioning of those elements.
	 * (in case they are fixed for instance)
	 */
	function initSyncTableWidth() {
	    jQuery(window).on('resize', function() {
		if(!scope.checkListenToWindowEvents()){
		    return;
		}
		scope.alignWeekDaysHeader();
		scope.alignTotalsFooter();
	    });
	}


	// scroll-events trigger to check vertical position of week-days-header and totals-footer
	// and in case fixes it at top resp. at bottom
	function initVerticalScroll() {
	    jQuery(window).on('scroll', function() {
		if(!scope.checkListenToWindowEvents()){
		    return;
		}
		checkPosOfWeekDaysHeader();
		checkPosOfTotalsFooter();

		// in case events are overflooding and task becomes more heavy,
		// use this:
		// var task = undefined;
		// if(task){
		// clearTimeout(task);
		// }
		// task = setTimeout(function(){
		// checkPosOfWeekDaysHeader();
		// checkPosOfTotalsFooter();
		// }, 0);
	    });
	}

	/**
	 * Checks if current tableView instance listens to window-events.
	 * This copes with the general problem, to view for one el.
	 */
	this.checkListenToWindowEvents = function(){
	    throw new Error('this is abstract');
	};

	// if position of weekDaysHeader is at upper screen-border, changes to fix-position
	function checkPosOfWeekDaysHeader() {
	    var $tableHeader = jQuery('.table-header');
	    var top = $tableHeader.offset().top + $tableHeader.outerHeight();
	    if (top - jQuery(window).scrollTop() <= 0) {
		$weekDaysHeader.addClass('fixed');
		adjustFixedPosToVertScroll($weekDaysHeader);
		scope.alignWeekDaysHeader();
	    } else {
		$weekDaysHeader.removeClass('fixed');
	    }
	}

	// if pos. of totals-footer is a lower screen-border, change to fix-positioning
	function checkPosOfTotalsFooter() {
	    var bottomTableToTopScreen = scope.$scheduler.outerHeight() - (jQuery(window).scrollTop() - scope.$scheduler.offset().top);
	    var tableTobottom = jQuery(window).height() - bottomTableToTopScreen;
	    if (tableTobottom >= 0) {
		$totalsFooter.removeClass('fixed');
	    } else {
		$totalsFooter.addClass('fixed');
		adjustFixedPosToVertScroll($totalsFooter);
		$totalsFooter.width(scope.$scheduler.width());
	    }
	}

	/**
	 * Aligns week-day header by adjusting its width to scheduler-table width.
	 */
	this.alignWeekDaysHeader = function(){
	    $weekDaysHeader.width(scope.$scheduler.width());
	};

	/**
	 * Aligns totals-footer by adjusting its width to scheduler-table width.
	 */
	this.alignTotalsFooter = function(){
	    $totalsFooter.width(scope.$scheduler.width());
	};

	/**
	 * Adjust the fixed-poistioned element to the left-scroll position.
	 * @param $fixed
	 */
	function adjustFixedPosToVertScroll($fixed){
	    $fixed.css('left', -jQuery(window).scrollLeft());
	}

	this.hide = function(){
	    $schedulerWrapper.hide();
	};

	this.show = function(){
	    $schedulerWrapper.show();
	};

	// shows loading state on table
	this.showLoading = function(){
	    $loadingOverlay.show();
	};

	// hides loading state on table
	this.hideLoading = function(){
	    $loadingOverlay.hide();
	};

	/**
	 * Delegating click listener for shift-creator helpers.
	 */
	function initShiftCreate() {
	    scope.$scheduler.on('click', '.shifts .shift-creator', function(event) {
		var $shifts = jQuery(event.target).closest('.shifts');
		scope.fire(CREATE, {
		    $shifts : $shifts
		});
	    });
	}

	/**
	 * Delegating click listener for shift-editor link.
	 */
	function initShiftEdit() {
	    scope.$scheduler.on('click', '.shift .period', function(event) {
		var $shift = jQuery(event.target).closest('.shift');
		scope.fire(EDIT, {
		    $shift : $shift,
		    scheduleDetail : $shift.data('scheduleDetail')
		});
	    });
	}

	/**
	 * Register delegating click handler to catch clicks on remove-icon of
	 * a shift.
	 *
	 */
	function initShiftRemove() {
	    scope.$scheduler.on('click', '.shift .close-icon', function(event) {
		var $shift = jQuery(event.target).closest('.shift');
		scope.fire(REMOVE, {
		    scheduleDetail : $shift.data('scheduleDetail'),
		    $shift : $shift
		});
	    });
	}

	/**
	 * Removes shift from table.
	 */
	this.removeShift = function($shift){
	    $shift.remove();
	};

	/**
	 * Async. renders (first clean) the table by applying given model.
	 * This can be called whenever the model refreshes.
	 * @param args
	 * @param callback : ready-handler
	 * @returns {abort} : where 'abort' is a function, when called aborts process
	 */
	this.renderTable = function(args, callback) {
	    var createRowsTask = undefined;
	    var applySchedulesTask = undefined;
	    var sortShiftsTask = undefined;

	    if (typeof args === 'function') {
		callback = args;
	    }
	    if (typeof callback !== 'function') {
		callback = function() {
		};
	    }

	    // clean
	    scope.$scheduler.empty();
	    $weekDaysHeader.empty();
	    $totalsFooter.empty();
	    // separating header from body, to make header fixed when scrolling
	    $weekDaysHeader.append(createCalendarEventsHeader());
	    $weekDaysHeader.append(createDateHeader());

	    // is async
	    createRowsTask = createRows(function(rows) {
		scope.$scheduler.append(rows);
		scope.alignWeekDaysHeader();
		// is async
		applySchedulesTask = applySchedules(scope.tableController.schedules, function() {
		    checkPosOfWeekDaysHeader();
		    checkPosOfTotalsFooter();
		    sortShiftsTask = scope.sortAllShifts(callback);
		});
		$totalsFooter.append(createTotalsFooter());
		scope.alignTotalsFooter();
	    });

	    return {
		abort : function() {
		    createRowsTask && createRowsTask.abort();
		    applySchedulesTask && applySchedulesTask.abort();
		    sortShiftsTask && sortShiftsTask.abort();
		}
	    };
	};

	/**
	 * Async. applys given schedules on table.
	 * @param schedules
	 * @param callback : ready-handler
	 * @return {abort} : where 'abort' is function when called abort processing
	 */
	function applySchedules(schedules, callback) {
	    return _ext.asyncEach(schedules, function(schedule) {
		_.each(schedule.scheduleDetailHolders, function(scheduleDetail) {
		    scope.addShift(scheduleDetail);
		});
	    }, callback);
	}

	/**
	 * Adds a shift to table, given by scheduleDetail.
	 *
	 * @param scheduleDetail
	 *            {ScheduleDetail}
	 * @return $shift : the shift added
	 */
	this.addShift = function(scheduleDetail){
	    // get the cell by coord.
	    var $td = scope.findShiftsCell(scope.tableController.findShiftsCellCoord(scheduleDetail));
	    var $shift = scope.createShift(scheduleDetail);
	    $td.find('.positioner').append($shift);
	    return $shift;
	};


	/**
	 * Renews all shift within target-cell given by coordinates, by
	 * re-creating from scratch.
	 * @param shiftsCellCoord {weekDay, employeeName} resp. {weekDay, role}
	 */
	this.renewShifts = function(shiftsCellCoord){
	    scope.findShiftsforCell(shiftsCellCoord).remove();
	    _.each(scope.tableController.findScheduleDetailsInCell(shiftsCellCoord), function(scheduleDetail) {
		scope.addShift(scheduleDetail);
	    });
	    scope.sortShifts(shiftsCellCoord);
	};


	/**
	 * Async. sorts all shifts-cells.
	 * @param callback : function()
	 * @returns {abort}, where 'abort' is function when called aborts processing
	 */
	this.sortAllShifts = function(callback) {
	    var rowElements = scope.tableController.findRowElements();
	    return _ext.asyncEach(rowElements, function(rowElement) {
		_.each(scope.tableController.schedules, function(schedule) {
		    var shiftsCellCoord = {weekDay : schedule.weekDay};
		    shiftsCellCoord[scope.tableController.rowCoordProp] = rowElement.name;
		    scope.sortShifts(shiftsCellCoord);
		});
	    }, callback);
	};

	/**
	 * Sets the given shifts-cell by shift-startdate.
	 * @param shiftsCellCoord {weekDay, employeeName}
	 *
	 */
	this.sortShifts = function(shiftsCellCoord) {
	    scope.findShiftsforCell(shiftsCellCoord).tsort('.period', {
		attr : 'data-startime',
		place: 'first'
	    });
	};

	/**
	 * Returns all shifts corresponding to the given coordinates.
	 * @param shiftsCellCoord : {weekDay, role or employeeName}
	 */
	this.findShiftsforCell = function(shiftsCellCoord) {
	    return scope.findShiftsCell(shiftsCellCoord).find('.shift');
	};

	/**
	 * Returns the shifts-cell determined by coord.
	 * @param shiftsCellCoord : {weekDay, role or employeeName}
	 */
	this.findShiftsCell = function(shiftsCellCoord){
	    throw new Error('this is abstract');
	};

	/**
	 * Refreshes total for shift given by coordinates.
	 * @param shiftsCellCoord : {weekDay}
	 * @param $shiftTd, if given is used as refresh context
	 */
	this.refreshShiftTotal = function(shiftsCellCoord, $shiftTd) {
	    var rowCoord = shiftsCellCoord[scope.tableController.rowCoordProp];
	    var weekDay = shiftsCellCoord.weekDay;

	    var $td = $shiftTd || scope.findShiftsCell(shiftsCellCoord);
	    var $dayHours = jQuery('.day-hours', $td).empty();

	    // get the total/overhours
	    var total = scope.tableController.totalsModel.rowTotals[rowCoord][weekDay].total;
	    var overhours = scope.tableController.totalsModel.rowTotals[rowCoord][weekDay].overhours;

	    // only visible when total is > 0
	    if (total > 0) {
		$dayHours.append(createShiftCellTotal(total, overhours));
		$dayHours.css('visibility', 'visible');
	    } else {
		$dayHours.css('visibility', 'hidden');
	    }
	};

	/**
	 * Creates a span for rendering total/overhours for shift-cells.
	 * @param total
	 * @param overhours
	 */
	function createShiftCellTotal(total, overhours) {
	    var $totalSpan = jQuery(shiftCellTotalTmpl({
		total : scope.formatTotal(total),
		overhours : '/'+formatOverhours(overhours)
	    }));
	    (overhours > 0) && $totalSpan.find('.overhours').show();
	    return $totalSpan;
	}


	/**
	 * After a drop-event, but before updating the shift's model reference
	 * and the model itself - this can be called to place the shift at its
	 * original position, before dropping it.
	 */
	this.revertMoveShift = function($shift){
	    var scheduleDetail = $shift.data('scheduleDetail');
	    scope.addShift(scheduleDetail);
	    scope.removeShift($shift);
	    scope.sortShifts(scope.tableController.findShiftsCellCoord(scheduleDetail));
	};

	/**
	 * Returns the shift's template.
	 */
	this.getShiftTmpl = function(){
	    throw new Error('this is abstract');
	};

	function findTimeFormatOnShifts(){
	    if(scope.tableController.weeklyScheduleInRegularTimeFormat){
		return 'h:mm a';
	    } else{
		return 'HH:mm';
	    }
	}

	/**
	 * Creates and returns a shift from the given scheduleDetail.
	 * Adds draggable listener.
	 * @param scheduleDetail
	 */
	this.createShift = function(scheduleDetail){
	    var employee = _.findWhere(scope.tableController.employees, {
		name : scheduleDetail.employeeName
	    });
	    var data = jQuery.extend({}, scheduleDetail, {
		employee : employee,
		startTimeDispl: timeZoneUtils.parseInServerTimeAsMoment(scheduleDetail.startTime).format(findTimeFormatOnShifts()),
		endTimeDispl: timeZoneUtils.parseInServerTimeAsMoment(scheduleDetail.endTime).add(1, 'seconds').format(findTimeFormatOnShifts()),
		weeklyScheduleInRegularTimeFormat : scope.tableController.weeklyScheduleInRegularTimeFormat
	    });
	    var $shift = jQuery(scope.getShiftTmpl()(data));

	    // add scheduleDetail ref
	    $shift.data('scheduleDetail', scheduleDetail);

	    // render validation-issues on shift, if the lie in future
	    scope.reRenderValidIssues($shift);

	    // init d&d only if shift is modifiable
	    if (scheduleDetail.modifiable && scope.tableController.isScheduleModifiable) {
		// init mouse events
		$shift.on('mousedown', function(event) {
		    $shift.addClass('active');
		}).on('mouseup', function(event) {
		    $shift.removeClass('active');
		});

		// init draggable
		$shift.draggable({
		    appendTo : $schedulerWrapper,
		    helper : 'clone',
		    opacity : 0.5,
		    revert : 'invalid',
		    stop : function(event, ui) {
			$shift.removeClass('active', 300);
		    }
		});
	    } else {
		$shift.addClass('not-modif');
	    }
	    return $shift;
	};

	/**
	 * If issues are rendered on given scheduleDetail (in case exist)
	 * @param scheduleDetail
	 * @returns {Boolean}
	 */
	function showIssues(scheduleDetail){
	    return Date.now() <= scheduleDetail.startTime;
	};

	/**
	 * Refreshes error/warning-display on given shift. This contains logic to categorize
	 * issues into warnings resp errors. When getting more logic into that subject, this is
	 * the location to pull the logic away from.
	 * @param $shift : a shift representing el, needs 'scheduleDetail' in data
	 */
	this.reRenderValidIssues = function($shift) {
	    $shift.removeClass('error warning');
	    var scheduleDetail = $shift.data('scheduleDetail');
	    if(!showIssues(scheduleDetail)){
		return;
	    }

	    var validationIssues = scope.tableController.extractNotOverwrittenIssues(scheduleDetail);
	    if(scope.tableController.findIssuesOfLevel('ERROR', validationIssues)){
		$shift.addClass('error');
	    } else if(scope.tableController.findIssuesOfLevel('WARNING', validationIssues)){
		$shift.addClass('warning');
	    } else if(scheduleDetail.overtimeHours){
		$shift.addClass('warning');
	    }
	};


	/**
	 * Async. creates rows for display in table.
	 * @param callback : called with [rows] when finished.
	 * @returns {abort}: where  'abort' is a function, when called aborts processing.
	 */
	function createRows(callback) {
	    var rows = [];
	    var rowElements = scope.tableController.findRowElements(); // elements to iterate over to create row
	    var asyncTask = _ext.asyncEach(rowElements, function(rowElement) {
		var $tr = jQuery('<tr></tr>');
		$tr.append(scope.createNavigationCell(rowElement));
		_.each(scope.tableController.weekDays, function(day) {
		    scope.createShiftCell(rowElement, day).appendTo($tr);
		});
		rows.push($tr);
	    }, function() {
		callback(rows);
	    });
	    return {abort: function(){
		asyncTask.abort();
	    }};
	}


	/**
	 * Creates a navigation-cell in table for given data-point.
	 * Navigation cells are those making-up the first column in table.
	 * @param rowElement
	 */
	this.createNavigationCell = function(rowElement) {
	    throw new Error('this is abstract');
	};

	/**
	 * Creates and returns a total-span shown-up in navigation-column.
	 * @param args : {total, overhours}
	 */
	this.createRowTotal = function(args) {
	    var formattedTotal = scope.formatTotal(args.total);
	    var $rowTotal = jQuery(rowTotalTmpl({
		total : formattedTotal,
		overhours : '/'+formatOverhours(args.overhours)
	    }));
	    // show total only if value > 0
	    !args.total && $rowTotal.hide();
	    $rowTotal.find('.total').css('visibility', 'visible');
	    args.overhours && $rowTotal.find('.overhours').show();
	    return $rowTotal;
	};

	/**
	 * Returns a formated version of the total to be displayed in table.
	 * @param total {Number} , duration in millis
	 * @returns {String},  #.# h
	 */
	this.formatTotal = function(total) {
	    total = total == undefined ? 0 : total;
	    var value = parseFloat(moment.duration(total).asHours().toFixed(2));
	    return value + 'h ';
	};

	/**
	 * Contains formatting logic to present overhours on view.
	 */
	function formatOverhours(overhours){
	    overhours = overhours == undefined ? 0 : overhours;
	    return overhours + 'h ';
	}

	/**
	 * Creates and returns a shift-cell. Adds drop-support.
	 * @param rowElement : row's coordinate
	 * @param weekDay {String}, in format DAY_COORD_FORMAT
	 */
	this.createShiftCell = function(rowElement, weekDay) {
	    throw new Error('this is abstract');
	};


	/**
	 * Adds styling to given shifts-cell and adds drop-support.
	 */
	this.addStyleAndDropSupp = function(weekDay, $td, isModifiable) {
	    var dayInfo = scope.tableController.findDayInfo(weekDay);
	    var disabled = dayInfo.closed;
	    // when day closed, render disabled
	    if (disabled) {
		$td.addClass('disabled not-modif').find('.positioner').append('<span class="info">Closed</span>');
	    }

	    // check if schedule is permitted for modifications
	    (!dayInfo.modifiable || !isModifiable) && $td.addClass('not-modif');

	    isModifiable && dayInfo.modifiable && !disabled && $td.droppable({
		drop : function(event, ui) {
		    $td.find('.positioner').append(ui.draggable);
		    jQuery('.drop-accept', scope.$scheduler).removeClass('drop-accept');
		    scope.fire(DROP, {
			targetCol : $td,
			shift : ui.draggable
		    });
		},
		accept : '.shift',
		tolerance : 'pointer',
		over : function(event, ui) {
		    jQuery(event.target).addClass('drop-accept');
		},
		out : function(event, ui) {
		    jQuery(event.target).removeClass('drop-accept');
		}
	    });
	};

	/**
	 * Adds a blocker to the given shifts-cell.
	 */
	this.addShiftsBlocker = function($shifts){
	    $shifts.find('.positioner').append(shiftsBlockerTmpl());
	};

	/**
	 * Removes a blocker from given shifts-cell.
	 */
	this.removeShiftsBlocker = function($shifts){
	    var $blocker = jQuery('.blocker', $shifts);
	    $blocker.fadeOut(function(){
		$blocker.remove();
	    });
	};

	/**
	 * Creates and returns the date-header.
	 *
	 * @return {jQuery}, the header-row
	 */
	function createDateHeader() {
	    var $tr = jQuery('<tr></tr>').addClass('days');
	    // append name-col
	    $tr.append('<td></td>');

	    // append week-days
	    _.each(scope.tableController.weekDays, function(weekDay) {
		var dayDisplay = timeZoneUtils.parseInServerTimeAsMoment(weekDay, scope.tableController.DAY_COORD_FORMAT)
		.format('dddd D');
		var $td = jQuery(weekDayTmpl({
		    date : weekDay,
		    name : dayDisplay
		}));
		$tr.append($td);
	    });
	    return $tr;
	}

	function createCalendarEventsHeader() {
	    var $tr = jQuery('<tr></tr>').addClass('calendar-events');
	    renderCalendarEvents($tr);
	    return $tr;
	}

	function renderCalendarEvents($calendarEventsTr){
	    $calendarEventsTr.empty();
	    // append name-col
	    $calendarEventsTr.append('<td>Events</td>');

	    var calendarEventTmpl = _.template(jQuery('#calendarEventsTmpl').text());
	    var calendarEventWeek =	scope.tableController.webSchedulerController.vueScope.$data.calendarEventWeek;
	    _.each(scope.tableController.weekDays, function(weekDay) {
		var $td = jQuery(calendarEventTmpl({
		    calendarEvents: calendarEventWeek[weekDay],
		    weekDay: weekDay
		}));
		var dayInfo = scope.tableController.findDayInfo(weekDay);
		if(Date.now() >= dayInfo.startOfDay){
		    $td.addClass('not-modif');
		}
		$calendarEventsTr.append($td);
	    });
	}

	/**
	 * Creates and returns the totals-footer.
	 * @return {jQuery}, the footer-row
	 */
	function createTotalsFooter(){
	    var $tr = jQuery('<tr></tr>');
	    // append name-col
	    $tr.append('<td></td>');
	    // append week-days
	    _.each(scope.tableController.weekDays, function(weekDay) {
		var $td = jQuery(weeklyTotalTmpl({
		    weekDay : weekDay
		}));
		refreshFooterTotal(weekDay, $td.find('.weekly-total'));
		$tr.append($td);
	    });
	    return $tr;
	}

	/**
	 * Triggers to refresh totals.
	 * This is always necessary because modification to shifts may trigger changes in overtime hours
	 * for hole week (in byRole-view needs to update all) or you need to tricky determine which
	 * coordinates are affected.
	 * @param shiftCellCoords : [{employeeName, weekDay, role}], if given refresh is restricted to those shifts.
	 */
	this.refreshTotals = function(shiftCellCoords) {
	    var rowCoords = undefined;
	    if (scope.tableController.webSchedulerController.selectedView === 'byEmployees') {
		rowCoords = _.pluck(scope.tableController.employees, 'name');
	    } else if (scope.tableController.webSchedulerController.selectedView === 'byRoles') {
		rowCoords = _.pluck(scope.tableController.roles, 'name');
	    } else {
		throw new Error('Not supported selectedView-value '
			+ scope.tableController.webSchedulerController.selectedView);
	    }

	    var weekDays = scope.tableController.weekDays;
	    // check to restrict refresh
	    if(shiftCellCoords){
		rowCoords = _.chain(shiftCellCoords).pluck(scope.tableController.rowCoordProp).value();
		weekDays = _.chain(shiftCellCoords).pluck('weekDay').value();
	    }

	    if(scope.tableController.webSchedulerController.selectedView === 'byRoles'){
		// restrict on roles which are displayed
		rowCoords = _.intersection(rowCoords, _.pluck(scope.tableController.roles, 'name'));
	    }

	    _.each(weekDays, function(weekDay){
		refreshFooterTotal(weekDay);
		_.each(rowCoords, function(rowCoord){
		    scope.refreshRowTotal(rowCoord);
		    var shiftsCellCoord = {weekDay : weekDay};
		    shiftsCellCoord[scope.tableController.rowCoordProp] = rowCoord;
		    scope.refreshShiftTotal(shiftsCellCoord);
		});
	    });
	};


	/**
	 * Refreshes employee-total for given name.
	 *
	 * @param rowCoord : for spedifying the row
	 * @param $navCell : (navigation-cell) is given, this is used as refresh context.
	 */
	this.refreshRowTotal = function(rowCoord, $navCell){
	    $navCell = $navCell || jQuery('.nav-cell.name[data-name="'+rowCoord+'"]', scope.$scheduler);
	    jQuery('.row-total', $navCell).remove();
	    $navCell.append(scope.createRowTotal(scope.tableController.totalsModel.rowTotals[rowCoord]));
	};


	/**
	 * Updates total-value for footer (for given weekDay).
	 * @param weekDay
	 * @param $weeklyTotal : if given, is used as referesh context.
	 */
	function refreshFooterTotal(weekDay, $weeklyTotal) {
	    var $total = $weeklyTotal || jQuery('.weekly-total[data-weekday="' + weekDay + '"]', $totalsFooter);
	    var total = scope.tableController.totalsModel.weeklyTotals[weekDay];
	    $total.text(scope.formatTotal(total));
	}

	/**
	 * Shows an error pop-up.
	 * @param args : {title, msg}
	 */
	this.showErrorPop = function(args) {
	    jQuery.decor.dialogDecor({
		$el : jQuery(errorPopupTmpl(args)),
		options : {
		    editorWidth : 350,
		    editorHeight : 200,
		    warning : true,
		    onTheFly : true
		}
	    }).showDialog();
	};

	/**
	 * Shows overwrite-issues pop-up.
	 * @param args : {validationIssues : [], onOverwrite, onCancel},
	 *      		onOverwrite and onCancel - function(event) called when corresp.
	 *      		button is clicked.
	 */
	this.showOverwriteIssuePop = function(args) {
	    var $el = jQuery(overwriteIssuesTmpl(args))
	    .on('click', '.overwrite', args.onOverwrite)
	    .on('click', '.cancel', args.onCancel);
	    return jQuery.decor.dialogDecor({
		$el : $el,
		options : {
		    editorWidth : 450,
		    editorHeight : 200,
		    onTheFly : true,
		    showClosing : false
		}
	    }).showDialog();
	};


    }

});
