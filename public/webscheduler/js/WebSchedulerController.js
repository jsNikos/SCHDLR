define(['WebSchedulerView', 'SchedulerTableCtrl', 'q', 'vue',
        'TableHeader', 'timeZoneUtils', 'underscore-ext', 'underscore'
        ],
        function(WebSchedulerView, SchedulerTableCtrl, q, Vue, TableHeader, timeZoneUtils) {
    return WebSchedulerController;

    /**
     * @class WebSchedulerController
     * @constructor
     */
    function WebSchedulerController() {
	var scope = this;
	var view = undefined;
	this.vueScope = undefined;
	this.CONTROLLER_URL = '/ws/webScheduler';
	var byEmplsTableController = undefined; // part of strategy for schedulerTableCtrl
	var byRolesTableController = undefined; // part of strategy for schedulerTableCtrl

	// model
	this.selectedDate = undefined; // {Date} week selection, part of state
	this.selectedView = 'byEmployees'; // or 'byRoles', part of state
	var firstPop = false;

	function init() {
	    Vue.config.debug = true;

	    var state = reConstructState();
	    initAjaxErrorHandler();
	    initPopState();

	    fetchAppInit(scope.selectedDate).then(function(resp) {
		timeZoneUtils.init({
		    timeZone: resp.timeZone
		});
		!scope.selectedDate && (scope.selectedDate = new Date(resp.week.businessStartOfWeek));

		scope.vueScope = new Vue({
		    el: '#webschedulerApp',
		    data: {
			departments: resp.departments,
			scheduleBy: resp.scheduleBy,
			selectedDepartmentNumber: findSelectedDepartmentNumber(state, resp.scheduleBy, resp.departments),
			scheduleState: resp.scheduleState,
			scheduleInfo: resp.scheduleInfo,
			helplink: resp.helplink,
			timeZone: resp.timeZone,
			week: resp.week,
			calendarEventWeek: resp.calendarEventWeek
		    },
		    methods: {
			handleDepartmentSelect: scope.handleDepartmentSelect,
			handleAuditsClicked: scope.handleAuditsClicked,
			handleStatisticsClicked: scope.handleStatisticsClicked,
			handleWeekArrowLeftClick: handleWeekArrowLeftClick,
			handleWeekArrowRightClick: handleWeekArrowRightClick
		    },
		    components: {
			'tableheader': new TableHeader()
		    },
		    computed: {
			weekDisplay: weekDisplay
		    }
		});

	    }).then(function() {
		return scope.findSchedulerTableController();

	    }).then(function(instanceHolder) {
		var schedulerTableCtrl = instanceHolder.instance;

		// init view
		view = new WebSchedulerView({
		    controller: scope,
		    schedulerTableCtrl: schedulerTableCtrl
		});
		// trigger to render table (with current data-model)
		view.schedulerTableCtrl.tableView.showLoading();
		view.schedulerTableCtrl.refreshTable({
		    selectedDepartmentNumber: scope.vueScope.$data.selectedDepartmentNumber,
		    dateInWeek: scope.selectedDate,
		    success: function() {
			view.schedulerTableCtrl.tableView.hideLoading();
		    },
		    abort: function() {
			view.schedulerTableCtrl.tableView.hideLoading();
		    },
		    newData: false
		});
	    }).catch(scope.logError);
	}

	function findSelectedDepartmentNumber(urlState, scheduleBy, departments) {
	    if (scheduleBy !== 'Department') {
		return undefined;
	    }
	    return urlState.selectedDepartmentNumber || departments[0] && departments[0].deptNumber;
	}

	function weekDisplay() {
	    return timeZoneUtils.parseInServerTimeAsMoment(this.week.startOfWeek).format('MMM D YYYY');
	}

	function handleWeekArrowLeftClick() {
	    var selectedDate = timeZoneUtils.parseInServerTimeAsMoment(scope.selectedDate);
	    selectedDate.add('weeks', -1);
	    scope.handleWeekArrowSelect(selectedDate.toDate());
	}

	function handleWeekArrowRightClick() {
	    var selectedDate = timeZoneUtils.parseInServerTimeAsMoment(scope.selectedDate);
	    selectedDate.add('weeks', 1);
	    scope.handleWeekArrowSelect(selectedDate.toDate());
	}

	function fetchAppInit(date) {
	    return q.Promise(function(resolve, reject) {
		jQuery.ajax({
		    url: scope.CONTROLLER_URL + '/findAppInit',
		    dataType: 'json',
		    type: 'GET',
		    data: {
			dateInWeek: date ? date.getTime() : null
		    },
		    success: resolve,
		    error: reject
		});
	    });
	}

	this.logError = function(err) {
	    window.console && console.error(err);
	    window.console && console.error(err.stack);
	};

	/**
	 * Creates are returns a schedulerTableController-instance depending on the
	 * current 'selectedView'.
	 * @param promise resolved with : {instance: ScheduleTableController, isNew: boolean}
	 */
	this.findSchedulerTableController = function() {
	    return q.Promise(function(resolve) {
		if (typeof initReady !== 'function') {
		    initReady = function() {};
		}

		// loading controller which is required only
		if (scope.selectedView === 'byEmployees') {
		    require(['ByEmplsTableController'], function(ByEmplsTableController) {
			instantiate(byEmplsTableController, ByEmplsTableController, resolve);
		    });
		} else if (scope.selectedView === 'byRoles') {
		    require(['ByRolesTableController'], function(ByRolesTableController) {
			instantiate(byRolesTableController, ByRolesTableController, resolve);
		    });
		}
	    });

	    // contains logic how to init and if necessary
	    function instantiate(instance, Constr, resolve) {
		if (!instance) {
		    createInstance();
		} else {
		    resolve({
			instance: instance,
			isNew: false
		    });
		}

		function createInstance(args) {
		    instance = new Constr({
			webSchedulerController: scope,
			onInitReady: function(instance) {
			    resolve({
				instance: instance,
				isNew: true
			    });
			}
		    });
		    // cashing the instance
		    if (scope.selectedView === 'byRoles') {
			byRolesTableController = instance;
		    } else {
			byEmplsTableController = instance;
		    }

		    // register listeners
		    instance.on(instance.BEFORE_TABLE_REFRESH, updateStateActions);
		}
	    }
	};

	/**
	 * Delegates handling to current active scheduleTableController-instance.
	 * (byRoles or byEmpl)
	 */
	this.handleStatisticsClicked = function() {
	    return scope.findSchedulerTableController().then(function(instanceHolder) {
		return instanceHolder.instance.handleStatisticsClicked();
	    });
	};

	/**
	 * Delegates handling to current active scheduleTableController-instance.
	 * (byRoles or byEmpl)
	 */
	this.handleAuditsClicked = function() {
	    return scope.findSchedulerTableController().then(function(instanceHolder) {
		return instanceHolder.instance.handleAuditsClicked();
	    });
	};

	/**
	 * Handles selection of department. Changes state and triggers reload.
	 */
	this.handleDepartmentSelect = function(department) {
	    this.$data.selectedDepartmentNumber = department.deptNumber;
	    updateUrl();
	    view.schedulerTableCtrl.tableView.showLoading();
	    view.schedulerTableCtrl.refreshTable({
		selectedDepartmentNumber: this.$data.selectedDepartmentNumber,
		dateInWeek: scope.selectedDate,
		success: function() {
		    view.schedulerTableCtrl.tableView.hideLoading();
		},
		abort: function() {
		    view.schedulerTableCtrl.tableView.hideLoading();
		}
	    });
	};

	function updateStateActions() {
	    view.updateStateActions();
	}

	/**
	 * Intended to handle ajax-erros, mainly due to authentiction and authorization.
	 */
	function initAjaxErrorHandler() {
	    jQuery(document).ajaxError(function(event, jqxhr) {
		switch (jqxhr.status) {
		case 401:
		    // not authenticated
		    var state = jQuery.parseQuery();
		    state.targetURI = location.pathname;
		    view.showLoginPopup(scope.CONTROLLER_URL + '/public/login?' + jQuery.param(state));
		    break;
		case 403:
		    // not authorized
		    handleNotAuthorized(jqxhr);
		    break;
		case 500:
		    handleServerSideError(jqxhr);
		    break;
		default:
		    break;
		}
	    });
	}

	/**
	 * Handles server-side errors by showing general error-message.
	 */
	function handleServerSideError(jqxhr) {
	    view.showServerError();
	}

	/**
	 * Handles change of view (byRoles, byEmployees).
	 * Switches SchedulerTableCtrl -instance on view and triggers
	 * to re-render.
	 */
	this.handleSwitchView = function(selectedView) {
	    scope.selectedView = selectedView;
	    updateUrl();
	    // set schedulerTableCtrl instance and trigger re-render
	    scope.findSchedulerTableController().then(function(instanceHolder) {
		// trigger to hide current
		view.schedulerTableCtrl.hideView();
		// trigger to halt current table-refresh task (if any)
		view.schedulerTableCtrl.abortCurrentRefreshTable();
		// switch table-controller
		view.schedulerTableCtrl = instanceHolder.instance;
		view.schedulerTableCtrl.showView();
		view.schedulerTableCtrl.tableView.showLoading();
		view.schedulerTableCtrl.refreshTable({
		    selectedDepartmentNumber: scope.vueScope.$data.selectedDepartmentNumber,
		    dateInWeek: scope.selectedDate,
		    success: function() {
			view.schedulerTableCtrl.tableView.hideLoading();
		    },
		    abort: function() {
			view.schedulerTableCtrl.tableView.hideLoading();
		    },
		    newData: !instanceHolder.isNew
		});
	    }).fail(scope.logError);
	};

	/**
	 * Handles not authorized exceptions.
	 */
	function handleNotAuthorized(jqxhr) {
	    if (jqxhr.responseJSON && jqxhr.responseJSON.type === 'ScheduleModNotPermitted') {
		view.showScheduleModNotPermitted({
		    msg: jqxhr.responseJSON.msg
		});
	    } else if (jqxhr.responseJSON && jqxhr.responseJSON.type === 'WebSchedulerOutdated') {
		view.showOutdatedScheduleTmpl({
		    onReloadClick: location.reload.bind(location, true)
		});
	    } else if (jqxhr.responseJSON && jqxhr.responseJSON.type === 'SmsScheduleNotPermitted') {
		view.showSmsScheduleNotPermitted({
		    msg: jqxhr.responseJSON.msg
		});
	    } else if (jqxhr.responseJSON && jqxhr.responseJSON.type) {
		// a local ajax-error handler is expected to treat this
	    } else {
		view.showNotAuthorized();
	    }
	}


	// constructs state from url and applies on models
	function reConstructState() {
	    var state = jQuery.parseQuery();
	    scope.selectedDate = state.selectedDate ? new Date(new Number(state.selectedDate)) : null;
	    scope.selectedView = state.selectedView || scope.selectedView;
	    return {
		selectedDate: scope.selectedDate,
		selectedView: scope.selectedView,
		selectedDepartmentNumber: state.selectedDepartmentNumber
	    };
	}

	// registers popstate-event listener which triggers to reload-page.
	function initPopState() {
	    jQuery(window).on('popstate', function(event) {
		if (firstPop) {
		    location.reload();
		}
		firstPop = true;
	    });
	}

	/**
	 * Handles click on resore-button, by requesting first to apply master template to current
	 * week and than to refresh the table.
	 */
	this.handleRestoreClick = function() {
	    var $restoreButton = jQuery(this);
	    requestRestoreMaster(function(err, resp) {
		$restoreButton.buttonDecor('stopLoading');
		if (err) {
		    return;
		}
		view.schedulerTableCtrl.tableView.showLoading();
		view.schedulerTableCtrl.refreshTable({
		    selectedDepartmentNumber: scope.vueScope.$data.selectedDepartmentNumber,
		    dateInWeek: scope.selectedDate,
		    success: function() {
			view.schedulerTableCtrl.tableView.hideLoading();
		    },
		    abort: function() {
			view.schedulerTableCtrl.tableView.hideLoading();
		    }
		});
	    });
	};

	/**
	 * Request to apply master-schedule on current selected week.
	 * @param callback : function(err, resp)
	 */
	function requestRestoreMaster(callback) {
	    jQuery.ajax({
		url: scope.CONTROLLER_URL + '/restoreMaster',
		type: 'POST',
		data: {
		    dateInWeek: scope.selectedDate.getTime(),
		    selectedDepartment: scope.vueScope.$data.selectedDepartmentNumber
		},
		success: function(resp) {
		    callback(null, resp);
		},
		error: function(err) {
		    callback(err);
		}
	    });
	};

	/**
	 * Handle click on save-as-master by requesting from server to save current selected
	 * week as master.
	 */
	this.handleSaveAsMaster = function($button) {
	    requestSaveAsMaster(function(err, resp) {
		if (err && err.responseJSON && err.responseJSON.type === 'MasterSaveNotPermitted') {
		    view.showMasterSaveNotPermitted();
		}
		$button.buttonDecor('stopLoading');
		if (resp.skippedEmployees && resp.skippedEmployees.length > 0) {
		    // trigger to show skipped employees (because not available)
		    view.showSkippedEmployees(resp.skippedEmployees);
		}
	    });
	};

	/**
	 *
	 * @param callback : function(err, resp), where err of type jqXHR and
	 * 				resp: {skippedEmployees : [EmployeeHolder]}
	 */
	function requestSaveAsMaster(callback) {
	    jQuery.ajax({
		url: scope.CONTROLLER_URL + '/saveAsMaster',
		type: 'POST',
		data: {
		    dateInWeek: scope.selectedDate.getTime()
		},
		success: function(resp) {
		    callback(null, resp);
		},
		error: function(jqXHR) {
		    callback(jqXHR);
		}
	    });
	};

	/**
	 * Handling week-arrow selects, by setting the week in weekPicker and
	 * triggering 'handleWeekSelect'-actions.
	 * @param selectedDate
	 */
	this.handleWeekArrowSelect = function(selectedDate) {
	    scope.selectedDate = selectedDate;
	    view.weekPicker.setWeek(scope.selectedDate);
	    scope.handleWeekSelect(scope.selectedDate);
	};

	/**
	 * Handles selection of week, be triggering to refresh schedule-table
	 * and updates state.
	 * @param selectedDate : {Date}
	 */
	this.handleWeekSelect = function(selectedDate) {
	    scope.selectedDate = selectedDate;
	    updateUrl();
	    view.schedulerTableCtrl.tableView.showLoading();
	    view.schedulerTableCtrl.refreshTable({
		selectedDepartmentNumber: scope.vueScope.$data.selectedDepartmentNumber,
		dateInWeek: scope.selectedDate,
		success: function() {
		    view.schedulerTableCtrl.tableView.hideLoading();
		},
		abort: function() {
		    view.schedulerTableCtrl.tableView.hideLoading();
		}
	    });
	};

	this.showLoading = function() {
	    view.schedulerTableCtrl.tableView.showLoading();
	};

	this.hideLoading = function() {
	    view.schedulerTableCtrl.tableView.hideLoading();
	};

	// contains logic to put current state into url
	function updateUrl() {
	    var state = {
		    selectedDate: scope.selectedDate.getTime(),
		    selectedView: scope.selectedView,
		    selectedDepartmentNumber: scope.vueScope.$data.selectedDepartmentNumber
	    };

	    if (!history.pushState) {
		// navigate
		location.search = '?' + jQuery.param(state);
	    } else {
		// only change url
		history.pushState(state, '', '?' + jQuery.param(state));
	    }
	}

	init();
    }

});
