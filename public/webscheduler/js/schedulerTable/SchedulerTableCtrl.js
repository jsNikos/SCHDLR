define(['SchedulesModelUtils',
        'ValidateShiftModifUtils',
        'MoveInfoModel',
        'EventEmitter',
        'timeZoneUtils',
        'q'],
        function(SchedulesModelUtils,
        	ValidateShiftModifUtils,
        	MoveInfoModel,
        	EventEmitter,
        	timeZoneUtils,
        	q){
    _.extend(SchedulerTableCtrl.prototype, new SchedulesModelUtils());
    _.extend(SchedulerTableCtrl.prototype, new ValidateShiftModifUtils());

    return function(args){
	_.extend(SchedulerTableCtrl.prototype, new EventEmitter());
	return new SchedulerTableCtrl(args);
    };

    /**
     * This is a ABSTRACT-class which serves for both (byEmployees and byRoles -view)
     * controller methods.
     * @constructor
     */
    function SchedulerTableCtrl() {
	var scope = undefined;
	this.DAY_COORD_FORMAT = 'D/M/YYYY';
	this.webSchedulerController = undefined;
	this.CONTROLLER_URL = undefined;
	var refreshTableTask = undefined; // {abort} references a possible running refresh-table task

	this.tableView = undefined;
	var ganttChartController = undefined;

	// events
	this.BEFORE_TABLE_REFRESH = 'beforeTableRefres'; // fired whenever table-data are about to re-render
	this.INITIAL_DATA_FETCHED = 'initialDataFetched'; // fire when init-data for table are fetched at init-time

	// model
	// all schedules made for selected week
	this.schedules = undefined;
	this.employees = undefined;
	// granularity shown in timepicker
	this.scheduleGranularity = undefined;
	// gathers all totals shown
	this.totalsModel = undefined;
	this.weekDays = undefined;
	this.dayInfos = undefined;
	this.roles = undefined;
	this.rowCoordProp = 'employeeName'; // part of shiftsCellCoord, alternative is 'role'
	// prop-path to rowCoord-prop in scheduleDetail
	this.shiftPathToRowCoord = 'employeeName'; // either ['employeeName'] or ['role', 'name']
	this.authorizedActions = undefined; // [ScheduleStateAction]
	this.isScheduleModifiable = true; // if schedule can be modified
	this.selectedDepartment = undefined; // DepartmentHolder, the department the schedule is associated to
	this.startOfWeekDay = undefined; // int (0 is sunday)
	this.useMasterSchedule = undefined; // if master schedule is used

	// model-props must be registered here
	var modelProps = ['dayInfos','schedules',
	                  'employees', 'scheduleGranularity',
	                  'dailyOvertimeHours', 'weeklyOvertimeHours', 'roles',
	                  'authorizedActions', 'isScheduleModifiable',
	                  'selectedDepartment','startOfWeekDay', 'useMasterSchedule',
	                  'weeklyScheduleInRegularTimeFormat'];

	this.init = function(onInitReady) {
	    scope = this;
	    // fetch the model
	    fetchScheduleTableInit(scope.webSchedulerController.selectedDate,
		    scope.webSchedulerController.vueScope.$data.selectedDepartmentNumber).then(handleResponse);

	    function handleResponse(resp) {
		// init model
		scope.fire(scope.INITIAL_DATA_FETCHED, resp);
		jQuery.extend(scope, _.pick(resp, modelProps));
		scope.restrictShifts(scope.schedules, scope.employees);
		scope.weekDays = scope.webSchedulerController.vueScope.$data.week.weekDays;
		scope.initTotalsModal();

		// init views
		scope.initView();
		scope.tableView.on('drop', handleDrop);
		scope.tableView.on('remove', handleRemove);
		scope.tableView.on('create', handleCreate);
		scope.tableView.on('edit', handleEdit);

		// called registered init-ready event handler: this event means, controller is initialized view instance
		// is created and about to render (may not be ready with rendering)
		onInitReady && onInitReady(scope);
	    }
	};

	/**
	 * Initializes totals model.
	 */
	this.initTotalsModal = function(){
	    throw new Error('this is abstract!');
	};

	/**
	 * Aborts a possible running refresh-table task.
	 */
	this.abortCurrentRefreshTable = function(){
	    refreshTableTask && refreshTableTask.abort();
	};


	/**
	 * Triggers view to hide.
	 */
	this.hideView = function(){
	    scope.tableView.hide();
	};

	/**
	 * Triggers view to show.
	 */
	this.showView = function(){
	    scope.tableView.show();
	};

	/**
	 * Greps the dayInfos for the given weekDay.
	 * @param weekDay : {String}
	 */
	this.findDayInfo = function(weekDay) {
	    return _.findWhere(scope.dayInfos, {
		weekDay : weekDay
	    });
	};

	/**
	 * Updates model by fetching data for given dateInWeek.
	 * Triggers to render the table for the given week.
	 * This is async.! The functions is protected against multiple calls before finishing
	 * old ones.
	 * @param args : {selectedDepartmentNumber (string), success, abort, newData},
	 * 				 'dateInWeek' {Date} any date in week - can be null,
	 *               'newData' if set to false, takes the current model and doesnt fetch new data from server
	 * @return {abort} : where 'abort' is a function, when called aborts refresh.
	 */
	this.refreshTable = function(args){
	    refreshTableTask = refreshTableCommand.call(scope, args);
	};
	// defines a command to refresh table, aborts itself when called more than once before finishing
	var refreshTableCommand = _ext.oneRequestOnly(function(args) {
	    var newData = args.newData == null ? true : args.newData;

	    var xhr = undefined;
	    var renderTableTask = undefined;

	    // either first fetch new data or directly render model
	    if (newData) {
		xhr = fetchScheduleTableInit(args.dateInWeek, args.selectedDepartmentNumber);
		xhr.then(function(resp) {
		    // refresh model
		    jQuery.extend(scope, _.pick(resp, modelProps));
		    scope.restrictShifts(scope.schedules, scope.employees);
		    scope.webSchedulerController.selectedDate = new Date(resp.week.businessStartOfWeek);
		    scope.webSchedulerController.vueScope.$data.week = resp.week;
		    scope.webSchedulerController.vueScope.$data.scheduleInfo = resp.scheduleInfo;
		    scope.webSchedulerController.vueScope.$data.scheduleState = resp.scheduleState;
		    scope.webSchedulerController.vueScope.$data.calendarEventWeek = resp.calendarEventWeek;
		    scope.weekDays = scope.webSchedulerController.vueScope.$data.week.weekDays;
		    scope.initTotalsModal();
		    refreshViews();
		});
	    } else {
		refreshViews();
	    }

	    // refresh views actions
	    function refreshViews(){
		scope.fire(scope.BEFORE_TABLE_REFRESH);
		renderTableTask = scope.tableView.renderTable(function() {
		    args.success();
		}); // renderTable is async!
	    }

	    return {
		abort : function() {
		    xhr && xhr.abort();
		    renderTableTask && renderTableTask.abort();
		}
	    };
	});

	this.initView = function() {
	    throw new Error('this is abstract');
	};

	/**
	 * Returns the employee-holder from model by name.
	 */
	this.findEmployee = function(name) {
	    return _.find(this.employees, function(empl) {
		return empl.name === name;
	    });
	};

	/**
	 * Handles creation of shift by updating the model (add shift, schedule)
	 * and triggers view to add shift.
	 * @param shiftInfo : {schedule, scheduleDetailIsNew, overhourInfos} from server
	 * @param keyOfShift : {employeeName, startTime} the key of new created scheduleDetail
	 */
	this.handleCreateShift = function(shiftInfo, keyOfShift) {
	    scope.tableView.showLoading();
	    var _schedule = shiftInfo.schedule;

	    // the shift to add
	    var scheduleDetail = _.findWhere(_schedule.scheduleDetailHolders, keyOfShift);

	    // update model
	    scope.replaceShiftsInModel(scope.findShiftsCellCoord(scheduleDetail),  _schedule);

	    // update overtimeHours
	    scope.updateOvertimeHours(shiftInfo.overhourInfos);

	    // totals needs update
	    scope.totalsModel.update();
	    scope.tableView.refreshTotals(scope.extractShiftsCellsCoords(shiftInfo.overhourInfos));

	    // re-new related shift-cells
	    renewShiftsCellsOnModif(scheduleDetail);
	    scope.tableView.hideLoading();
	};

	/**
	 * Returns elements making-up the rows (either roles or employees).
	 */
	this.findRowElements = function(){
	    throw new Error('this is abstract');
	};

	/**
	 * Extracts those roles from the model which are presented
	 * in views.
	 * @returns [RoleHolder]
	 */
	this.findRolesToShow = function(){
	    return _.filter(scope.roles, function(role){
		return role.schedulable || scope.isRoleUsed(role.name);
	    });
	};

	/**
	 * Updates the model and triggers to re-create the shift.
	 * @param args: {schedule, $shift, overhourInfosForOldEmpl ([ScheduleDetailHolder]),
	 * 				 overhourInfosForNewEmpl ([ScheduleDetailHolder]),
	 * 				 newEmployeeName, newStartTime, newScheduleDate},
	 * 				 'schedule' containing the edited scheduleDetail from server,
	 *               '$shift' the edited shift.
	 *               'new...' - refers to the keys of the new shift
	 */
	this.handleEditShift = function(args) {
	    scope.tableView.showLoading();
	    var scheduleDetail = args.$shift.data('scheduleDetail');

	    // update model
	    scope.replaceShiftsInModel(scope.findShiftsCellCoord(scheduleDetail), args.schedule);

	    // update overtimeHours (empl may change : byRoles-view)
	    scope.updateOvertimeHours(args.overhourInfosForOldEmpl);
	    scope.updateOvertimeHours(args.overhourInfosForNewEmpl);

	    // totals needs update
	    scope.totalsModel.update();
	    scope.tableView.refreshTotals(scope.extractShiftsCellsCoords(args.overhourInfosForOldEmpl));
	    scope.tableView.refreshTotals(scope.extractShiftsCellsCoords(args.overhourInfosForNewEmpl));

	    // re-new related shift-cells
	    renewShiftsCellsOnModif(scheduleDetail); // old coordinates
	    renewShiftsCellsOnModif(scope.findScheduleDetail({
		scheduleDate : args.newScheduleDate,
		startTime : args.newStartTime,
		employeeName : args.newEmployeeName
	    })); // new coordinates
	    scope.tableView.hideLoading();
	};

	/**
	 * Triggers on view to renew all shifts-cells which are related in case of any modification
	 * of given scheduleDetail.
	 * Because weekly overtime-hours affect all employees shift for the week, all corresponding cells
	 * get a refresh.
	 * @param scheduleDetail
	 */
	function renewShiftsCellsOnModif(scheduleDetail){
	    _.chain(scope.findShiftsForEmpl(scheduleDetail.employeeName)) /* find shifts for employee */
	    .map(scope.findShiftsCellCoord) /* extract shiftsCellCoord */
	    .uniq(JSON.stringify) /* remove duplicate coordinates, the json-string is used as 'equals' */
	    .each(scope.tableView.renewShifts); /* call to renew shifts-cell in view */
	}


	/**
	 * Replaces all shifts (determined by shiftsCellCoord) with those
	 * given in 'newSchedule' (and also corresponding to these coordinates).
	 * @param shiftsCellCoord
	 * @param newSchedule
	 * @return [scheduleDetails] ; returns list of added shifts
	 */
	this.replaceShiftsInModel = function(shiftsCellCoord, newSchedule) {
	    throw new Error('this is abstract');
	};


	/**
	 * Handles click on week-day by showing gantt-chart for this day.
	 * @param $weekDay
	 */
	this.handleWeekDayClicked = function($weekDay){
	    var weekDay = $weekDay.attr('data-weekday');
	    require(['ganttChart/GanttChartController'], function(GanttChartController){
		(new GanttChartController({tableController: scope})).showGanttView(weekDay);
	    });
	};

	/**
	 * Handles click on statistics-link and triggers to open statistics-popup.
	 */
	this.handleStatisticsClicked = function(){
	    return q.Promise(function(resolve){
		require(['statistics/StatisticsController'], function(StatisticsController){
		    var statisticsController = new StatisticsController({tableController: scope});
		    statisticsController.show();
		    resolve();
		});
	    });
	};

	this.handleAuditsClicked = function(){
	    return q.Promise(function(resolve){
		require(['audits/AuditsController'], function(AuditsController){
		    (new AuditsController({tableController: scope})).show();
		    resolve();
		});
	    });
	};

	/**
	 * Handles create shift -event by showing-up create-dialog.
	 * @param args : {$shifts, employeeName, weekDay}
	 */
	function handleCreate(args){
	    scope.tableView.addShiftsBlocker(args.$shifts);
	    scope.createEditShiftController()
	    .then(function(editShiftController){
		return editShiftController.showForCreate(args);
	    })
	    .then(function(){
		scope.tableView.removeShiftsBlocker(args.$shifts);
	    })
	    .fail(scope.webSchedulerController.logError);
	}

	/**
	 * Creates instance of editShift (this dialog is on-the-fly and thus always needs
	 * new instance before shown)
	 * @returns promise : resolving to new instance of EditShiftController, either byEmpls or byRoles.
	 */
	this.createEditShiftController = function(){
	    throw new Error('this is abstract');
	};

	/**
	 *
	 * @param args {$shift, scheduleDetail}
	 */
	function handleEdit(args){
	    var $shifts = scope.tableView.findShiftsCell(scope.findShiftsCellCoord(args.scheduleDetail));
	    scope.tableView.addShiftsBlocker($shifts);
	    scope.createEditShiftController()
	    .then(function(editShiftController){
		return editShiftController.showForEdit(args);
	    })
	    .then(function(){
		scope.tableView.removeShiftsBlocker($shifts);
	    })
	    .fail(scope.webSchedulerController.logError);
	}

	/**
	 * Handles remove-event of a shift.
	 * @param args {scheduleDetail, $shift}
	 */
	function handleRemove(args) {
	    var scheduleDetail = args.scheduleDetail;
	    var $shift = args.$shift;

	    scope.tableView.showLoading();
	    // sync with server
	    requestShiftRemove(scheduleDetail, function(resp){
		// update model
		scope.removeShiftFromModel(scheduleDetail);
		scope.replaceShiftsInModel(scope.findShiftsCellCoord(scheduleDetail), resp.schedule);

		// update overtimeHours
		scope.updateOvertimeHours(resp.overhourInfos);

		// remove from view
		scope.tableView.removeShift($shift);

		// totals needs update
		scope.totalsModel.update();
		var totalsToRefresh = _.chain([scheduleDetail]).union(resp.overhourInfos).value();
		scope.tableView.refreshTotals(scope.extractShiftsCellsCoords(totalsToRefresh));

		// re-new related shifts-cells
		renewShiftsCellsOnModif(scheduleDetail);
		scope.tableView.hideLoading();
	    });
	}


	/**
	 * Request from server to remove given shift.
	 * @param scheduleDetail
	 * @param callback : function(resp), where resp: {schedule} the schedule containing the shift
	 */
	function requestShiftRemove(scheduleDetail, callback) {
	    jQuery.ajax({
		url : scope.CONTROLLER_URL + '/removeScheduleDetail',
		type : 'POST',
		data : {
		    scheduleDetail : JSON.stringify(scheduleDetail)
		},
		success : callback
	    });
	}

	/**
	 * Extracts the coordinated from the given shifts-cell in form of name/value object.
	 */
	this.extractCoordFromShiftsCell= function($shifts){
	    throw new Error('this is abstract');
	};

	/**
	 * Checks the given target coordinates of shifts-cell are different from those
	 * in given scheduleDetail.
	 * @returns boolean
	 */
	this.checkDropTargetIsDifferent = function(targetShiftsCellCoord, scheduleDetail){
	    throw new Error('this is abstract');
	};

	/**
	 * Handles shift drop.
	 * @param args : {targetCol, shift}, 'targetCol' is the dropped-td, 'shift' is the dragged shift-element
	 */
	function handleDrop(args) {
	    var $target = args.targetCol;
	    var $shift = args.shift;
	    var scheduleDetail = $shift.data('scheduleDetail');
	    // get coordinates of target-cell
	    var targetShiftsCellCoord = scope.extractCoordFromShiftsCell($target);
	    var targetWeekDay = $target.attr('data-weekday');

	    // create a moveInfo instance
	    var moveInfoModel = new MoveInfoModel({
		targetWeekDay : targetWeekDay,
		targetScheduleDate : timeZoneUtils.parseInServerTimeAsMoment(targetWeekDay, scope.DAY_COORD_FORMAT).valueOf(),
		targetEmployee : scope.webSchedulerController.selectedView === 'byEmployees' ? $target.attr('data-employee') : scheduleDetail.employeeName,
			targetRole : scope.webSchedulerController.selectedView === 'byEmployees' ? scheduleDetail.role.name : targetShiftsCellCoord.role,
				sourceScheduleDet : scheduleDetail
	    });

	    if(!scope.checkDropTargetIsDifferent(targetShiftsCellCoord, scheduleDetail)){
		scope.tableView.sortShifts(targetShiftsCellCoord);
		return;
	    }

	    // first validate and then move (maybe)
	    scope.tableView.addShiftsBlocker($target);
	    _ext.asyncTaskList()
	    .addTask(createValidateMoveTask(scheduleDetail, moveInfoModel, $shift, $target))
	    .addTask(createMoveTask(scheduleDetail, moveInfoModel, targetShiftsCellCoord, $target))
	    .start();
	}

	/**
	 * Returns a asyn-task which validates a MOVE of the given scheduleDetail and
	 * moveInfoModel.
	 * @param scheduleDetail : the shift which is moved
	 * @param moveInfoModel : info describing the move
	 * @param $shift : the move shift
	 * @param $target : the target shifts-cell (dropped location)
	 * @returns {Function}
	 */
	function createValidateMoveTask(scheduleDetail, moveInfoModel, $shift, $target){
	    return function validateTask(err, next) {
		scope.validateMove(moveInfoModel, scheduleDetail, scope.CONTROLLER_URL, function(args) {
		    // check permission issues
		    if (!args.permitted.permitted) {
			scope.tableView.showErrorPop({
			    title : 'Not permitted move',
			    msg : args.permitted.msg
			});
			scope.tableView.revertMoveShift($shift);
			scope.tableView.removeShiftsBlocker($target);
		    } else {
			handleMoveValidationResult(args.validationIssues, $shift, $target, next);
		    }
		});
	    };

	}

	/**
	 * Handles given validationIssues for a move. In case of issues, contains the logic to show-up overwriteIssue-dialog
	 * if they are all overwritable. Otherwise, it shows error popup and reverts the move.
	 * @param validationIssues
	 * @param $shift : the move shift
	 * @param $target : the target shifts-cell (dropped location)
	 * @param validationOkMethod : function(), called when overwritten or no issues.
	 */
	function handleMoveValidationResult(validationIssues, $shift, $target, validationOkMethod){
	    var notOverwritableIssues = scope.extractNotOverwritableIssues(validationIssues);
	    if (scope.issuesCanBeOverwritten(validationIssues)) {
		// show dialog for overwriting
		var $dialog = scope.tableView.showOverwriteIssuePop({
		    validationIssues : validationIssues,
		    onOverwrite : function(event) {
			// handle overwrite-click
			$dialog.closeDialog();
			validationOkMethod();
		    },
		    onCancel : function() {
			// handle cancel click
			$dialog.closeDialog();
			scope.tableView.revertMoveShift($shift);
			scope.tableView.removeShiftsBlocker($target);
		    }
		});
	    } else if(notOverwritableIssues && notOverwritableIssues.length > 0) {
		// show error-msg
		scope.tableView.showErrorPop({
		    title : 'Validation Errors',
		    msg : notOverwritableIssues[0].errorMsg
		});
		scope.tableView.revertMoveShift($shift);
		scope.tableView.removeShiftsBlocker($target);
	    } else{
		// validation is ok
		validationOkMethod();
	    }
	}

	/**
	 * Create a asnyc-task to move scheduleDetail w.r.t moveInfoModel.
	 * @param scheduleDetail : the shift which is moved
	 * @param moveInfoModel : info describing the move
	 * @param targetShiftsCellCoord : coordinates of the target shifts-cell (dropped location)
	 * @param $target : the target shifts-cell (dropped location)
	 * @returns {Function}
	 */
	function createMoveTask(scheduleDetail, moveInfoModel, targetShiftsCellCoord, $target){
	    return function moveTask(err, next) {
		scope.tableView.showLoading();
		requestMoveShift(moveInfoModel, function(resp) {
		    // update model
		    scope.replaceShiftsInModel(targetShiftsCellCoord, resp.targetSchedule);
		    scope.replaceShiftsInModel(scope.findShiftsCellCoord(scheduleDetail), resp.sourceSchedule);

		    // update overtime-hours
		    scope.updateOvertimeHours(resp.overhourInfosForOldEmpl);
		    scope.updateOvertimeHours(resp.overhourInfosForNewEmpl);

		    // update shift-cells
		    renewShiftsCellsOnModif(resp.movedScheduleDetail);
		    renewShiftsCellsOnModif(scheduleDetail);

		    // totals needs update
		    scope.totalsModel.update();

		    var totalsToRefresh = _.chain([scheduleDetail])
		    .union(resp.overhourInfosForOldEmpl)
		    .union(resp.overhourInfosForNewEmpl)
		    .value();
		    scope.tableView.refreshTotals(scope.extractShiftsCellsCoords(totalsToRefresh));
		    scope.tableView.removeShiftsBlocker($target);
		    scope.tableView.hideLoading();
		});
	    };
	}

	/**
	 * Requests server to move shift (drag-drop opration).
	 *
	 * @param moveInfoModel : (MoveInfoModel) describing the move
	 * @param callback : function(resp), where 'resp' is {targetSchedule, sourceSchedule}
	 */
	function requestMoveShift(moveInfoModel, callback) {
	    jQuery.ajax({
		url : scope.CONTROLLER_URL + '/moveShift',
		type : 'POST',
		data : {moveInfoModel : JSON.stringify(moveInfoModel)},
		success : callback
	    });
	}

	/**
	 * Fetches init-data for schedule-table, for given week.
	 *
	 * @param date
	 *            {Date} : any day in week, can be null
	 * @param selectedDepartmentNumber : string
	 */
	function fetchScheduleTableInit(date, selectedDepartmentNumber) {
	    return jQuery.ajax({
		url : scope.CONTROLLER_URL + '/findScheduleTableInit',
		dataType : 'json',
		type : 'GET',
		data : {
		    dateInWeek : date ? date.getTime() : null,
			    selectedDepartment : selectedDepartmentNumber
		}
	    });
	}



    }

});
