define(['WebSchedulerView', 'SchedulerTableCtrl', 'q', 'underscore-ext', 'underscore'],
  function(WebSchedulerView, SchedulerTableCtrl, q){
	return WebSchedulerController;
	
	/**
	 * @class WebSchedulerController
	 * @constructor
	 */
	function WebSchedulerController() {
		var scope = this;
		var view = undefined;
		this.CONTROLLER_URL = '/ws/webScheduler';		
		var byEmplsTableController = undefined; // part of strategy for schedulerTableCtrl
		var byRolesTableController = undefined; // part of strategy for schedulerTableCtrl
		
		// model	
		this.selectedDate = undefined; // {Date} week selection, part of state
		this.selectedView = 'byEmployees'; // or 'byRoles', part of state
		this.selectedDepartmentName = undefined; // selected departmentName (string), part of state
		var firstPop = false;

		function init() {			
			reConstructState();
			initAjaxErrorHandler();
			initPopState();

			// find and create the schedulerTableController
			findSchedulerTableController().then(function(instanceHolder) {
				// init view
				view = new WebSchedulerView({
					controller : scope,
					schedulerTableCtrl : instanceHolder.instance
				});
				// trigger to render table (with current data-model)
				view.schedulerTableCtrl.tableView.showLoading();
				view.updateTableHeader();
				view.schedulerTableCtrl.refreshTable({
					selectedDepartmentName : scope.selectedDepartmentName,
					dateInWeek : scope.selectedDate,
					success : function() {
						view.schedulerTableCtrl.tableView.hideLoading();
					},
					abort : function() {
						view.schedulerTableCtrl.tableView.hideLoading();
					},
					newData : false
				});				
			}).fail(scope.logError);
		}		
		
		this.logError = function(err){
			window.console && console.error(err); 
		};
		
		/**
		 * Creates are returns a schedulerTableController-instance depending on the
		 * current 'selectedView'.		  
		 * @param promise resolved with : {instance: ScheduleTableController, isNew: boolean}		
		 */
		function findSchedulerTableController() {
			return q.Promise(function(resolve){
				if(typeof initReady !== 'function'){
					initReady = function(){};
				}
				
				// loading controller which is required only
				if(scope.selectedView === 'byEmployees'){
					require(['ByEmplsTableController'], function(ByEmplsTableController){
						instantiate(byEmplsTableController, ByEmplsTableController, resolve);
					});
				}else if (scope.selectedView === 'byRoles') {
					require(['ByRolesTableController'], function(ByRolesTableController){
						instantiate(byRolesTableController, ByRolesTableController, resolve);
					});				
				}
			});
			
			// contains logic how to init and if necessary
			function instantiate(instance, Constr, resolve) {
				if (!instance) {
					createInstance();
				} else {
					resolve({instance: instance, isNew: false});
				}
				function createInstance(args) {
					instance = new Constr({
						webSchedulerController : scope,
						onInitReady : function(instance) {
							resolve({instance: instance, isNew: true});
						}
					});
					// cashing the instance
					if (scope.selectedView === 'byRoles') {
						byRolesTableController = instance;
					} else {
						byEmplsTableController = instance;
					}
					
					// register listeners
					instance.on(instance.BEFORE_TABLE_REFRESH, updateStateActions)
							.on(instance.INITIAL_DATA_FETCHED, handleTableInitDataFetched);
				}
			}						
			
		}
		
		/**
		 * Handles data-fetch event when schedulerTableController is initialized, by
		 * setting the 'selectedDate' if not set. 
		 */
		function handleTableInitDataFetched(resp){
			if(!scope.selectedDate){
				scope.selectedDate = new Date(resp.week.businessStartOfWeek);
			}
		}
		
		/**
		 * Delegates handling to current active scheduleTableController-instance.
		 * (byRoles or byEmpl)
		 */
		this.handleStatisticsClicked = function(){			
			return findSchedulerTableController().then(function(instanceHolder){
				return instanceHolder.instance.handleStatisticsClicked();
			});
		};
		
		/**
		 * Delegates handling to current active scheduleTableController-instance.
		 * (byRoles or byEmpl)
		 */
		this.handleAuditsClicked = function(){
			return findSchedulerTableController().then(function(instanceHolder){
				return instanceHolder.instance.handleAuditsClicked();
			});
		};
		
		/**
		 * Handles click on print-view link by navigating to scheduler's print-view in reports
		 * with parameter based on current model.
		 */
		this.handlePrintClicked = function(){
			return findSchedulerTableController().then(function(instanceHolder) {
				var schedulerTableCtrl = instanceHolder.instance;
				var printViewParams = {
						date : (schedulerTableCtrl.week.businessStartOfWeek/1000).toString(16),
						to : (schedulerTableCtrl.week.businessEndOfWeek/1000).toString(16),
						tabbed : true,
						printview : true,
						incr : 2
				};			

				submitLink({
					method : 'post',
					target : '_blank',
					action : '/reports/WeeklySchedule?' + jQuery.param(printViewParams)
				});	
			});
		};
		
		/**
		 * Triggers view to update table-header.
		 */
		this.updateTableHeader = function(){
			view.updateTableHeader();
		};		
		
		/**
		 * Handles selection of department. Changes state and triggers reload.
		 */
		this.handleDepartmentSelect = function($department){
			scope.selectedDepartmentName = $department.attr('data-id');
			updateUrl();
			view.schedulerTableCtrl.tableView.showLoading();
			view.schedulerTableCtrl.refreshTable({
				selectedDepartmentName : scope.selectedDepartmentName,
				dateInWeek : scope.selectedDate,
				success : function() {
					view.schedulerTableCtrl.tableView.hideLoading();
				},
				abort : function() {
					view.schedulerTableCtrl.tableView.hideLoading();
				}
			});
		};
		
		/**
		 * Handles state-action button click, by requesting state change from server.
		 * Shows pop-up in case state cannot be changed due to restrictions.
		 */
		this.handleStateChangeClick = function(event){			
			var $postButton = jQuery(event.target);
			$postButton.buttonDecor('startLoading');
			var action = $postButton.attr('data-action');
			
			if(action === 'POST'){
				confirmToPost($postButton);
			} else{
				changeScheduleState($postButton, action);
			}					
		};
		
		function confirmToPost($postButton){
			// show confirmation
			require(['text!schedulerActions/postingDialog.html', 'css!schedulerActions/postingDialog.css'], function(postingDialogHtml){
			var	view = jQuery.decor.dialogDecor({
					$el : jQuery(_.template(postingDialogHtml)()),
					options : {
						onTheFly : true,
						editorHeight: 200,
						showClosing: false
					}
				});
				view.showDialog()
				    .$el.on('click', 'button', handleChoice);
				
				function handleChoice(event){
					var $target = jQuery(event.target);
					if($target.attr('data-role') === 'confirm-post'){
						changeScheduleState($postButton, 'POST');					
					} else{
						$postButton.buttonDecor('stopLoading');
					}			
					view.closeDialog();
				}	
			});			
		}
		
		/**
		 * Requests to change the schedule state.
		 */
		function changeScheduleState($postButton, action){
			findSchedulerTableController().then(function(instanceHolder){
				// request state-change
				requestChangeScheduleState({
					action : action,
					dateInWeek : scope.selectedDate.getTime(),
					scheduleState : JSON.stringify(_.chain(instanceHolder.instance.scheduleState).pick('type').value())				
				}, function(resp) {					
					// check for issues
					if(!resp.blocker || resp.blocker.length === 0){
						// reload page, all shift-cells needs to be recreated because of modifiable-logic
						location.reload(true);
					} else{
						// show blocker in pop-up
						view.showStateChangeBlocker(resp.blocker);
						view.enableStateChange();
						$postButton.buttonDecor('stopLoading');
					}			
				});
			}).fail(scope.logError);			
		}
		
		/**
		 * @param data : {action (ScheduleStateAction), dateInWeek (Long), scheduleState }
		 * @param callback : function(resp),
		 * 				resp - {scheduleState : ScheduleState, permittedActions : [ScheduleStateAction], blocker : [String]}
		 */
		function requestChangeScheduleState(data, callback){
			jQuery.ajax({
				url : scope.CONTROLLER_URL + '/changeScheduleState',
				type : 'POST',
				data : data,
				success : function(resp){
					callback(resp);
				}
			});
		};
		
		function updateStateActions(){
			view.updateStateActions();
		}
		
		/**
		 * Intended to handle ajax-erros, mainly due to authentiction and authorization.
		 */
		function initAjaxErrorHandler(){
			jQuery(document).ajaxError(function(event, jqxhr){
				switch (jqxhr.status) {
				case 401:
					// not authenticated
					var state = jQuery.parseQuery();
					state.targetURI = location.pathname;
					view.showLoginPopup(scope.CONTROLLER_URL+'/public/login?'+jQuery.param(state));									
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
		function handleServerSideError(jqxhr){
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
			findSchedulerTableController().then(function(instanceHolder) {
				// trigger to hide current
				view.schedulerTableCtrl.hideView();
				// trigger to halt current table-refresh task (if any)
				view.schedulerTableCtrl.abortCurrentRefreshTable();				
				// switch table-controller
				view.schedulerTableCtrl = instanceHolder.instance;				
				view.schedulerTableCtrl.showView(); 
				view.schedulerTableCtrl.tableView.showLoading();
				view.schedulerTableCtrl.refreshTable({ 
					selectedDepartmentName : scope.selectedDepartmentName,
					dateInWeek : scope.selectedDate,
					success : function() {
						view.schedulerTableCtrl.tableView.hideLoading();
					},
					abort : function() {
						view.schedulerTableCtrl.tableView.hideLoading();
					},
					newData : !instanceHolder.isNew
				});
			}).fail(scope.logError);
		};

		/**
		 * Handles not authorized exceptions.
		 */
		function handleNotAuthorized(jqxhr) {
			if (jqxhr.responseJSON && jqxhr.responseJSON.type === 'ScheduleModNotPermitted') {
				view.showScheduleModNotPermitted({msg : jqxhr.responseJSON.msg});
			} else if(jqxhr.responseJSON && jqxhr.responseJSON.type === 'WebSchedulerOutdated'){
				view.showOutdatedScheduleTmpl({onReloadClick : location.reload.bind(location, true)});
			} else if(jqxhr.responseJSON && jqxhr.responseJSON.type === 'SmsScheduleNotPermitted'){
				view.showSmsScheduleNotPermitted({msg : jqxhr.responseJSON.msg});
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
			scope.selectedDepartmentName = state.selectedDepartmentName;
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
				if(err){ return; }
				view.schedulerTableCtrl.tableView.showLoading();
				view.schedulerTableCtrl.refreshTable({
					selectedDepartmentName : scope.selectedDepartmentName,
					dateInWeek : scope.selectedDate,
					success : function() {
						view.schedulerTableCtrl.tableView.hideLoading();
					},
					abort : function() {
						view.schedulerTableCtrl.tableView.hideLoading();
					}
				});
			});
		};
		
		/**
		 * Request to apply master-schedule on current selected week.
		 * @param callback : function(err, resp)
		 */
		function requestRestoreMaster(callback){
			jQuery.ajax({
				url : scope.CONTROLLER_URL + '/restoreMaster',
				type : 'POST',
				data : {
					dateInWeek : scope.selectedDate.getTime(),
					selectedDepartment : scope.selectedDepartmentName
				},
				success : function(resp){
					callback(null, resp);
				},
				error : function(err){
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
				if(resp.skippedEmployees && resp.skippedEmployees.length > 0){
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
		function requestSaveAsMaster(callback){
			jQuery.ajax({
				url : scope.CONTROLLER_URL + '/saveAsMaster',
				type : 'POST',
				data : {
					dateInWeek : scope.selectedDate.getTime()
				},
				success : function(resp){
					callback(null, resp);
				},
				error : function(jqXHR){					
					callback(jqXHR);
				}
			});
		};
		
		/**
		 * Handling week-arrow selects, by setting the week in weekPicker and
		 * triggering 'handleWeekSelect'-actions.
		 * @param selectedDate
		 */
		this.handleWeekArrowSelect = function(selectedDate){
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
				selectedDepartmentName : scope.selectedDepartmentName,
				dateInWeek : scope.selectedDate,
				success : function() {
					view.schedulerTableCtrl.tableView.hideLoading();
				},
				abort : function() {
					view.schedulerTableCtrl.tableView.hideLoading();
				}
			});
		};
		
		this.showLoading = function(){
			view.schedulerTableCtrl.tableView.showLoading();
		};
		
		this.hideLoading = function(){
			view.schedulerTableCtrl.tableView.hideLoading();
		};
		
		// contains logic to put current state into url
		function updateUrl(){
			var state = {
					selectedDate : scope.selectedDate.getTime(),
					selectedView : scope.selectedView,
					selectedDepartmentName : scope.selectedDepartmentName
				};
			
			if(!history.pushState){				
				// navigate
				location.search = '?'+jQuery.param(state);				
			} else{
				// only change url
				history.pushState(state, '', '?'+jQuery.param(state));
			}			
		}
		
		/**
		 * Intended to submit a dynamic link.
		 * @param args : {method, target, action}
		 */
		function submitLink(args){
			jQuery('form.dynamik-links')
			.attr('method', args.method)
			.attr('target', args.target)
			.attr('action', args.action)
			.get(0).submit();			
		}
		
		init();
	}	
	
});

