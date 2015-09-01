define(['libs/WeekPicker', 'timeZoneUtils', 'stateChange/StateChangeController'], 
function(WeekPicker, timeZoneUtils, StateChangeController){
	return WebSchedulerView;
	
	/**
	 * @class WebSchedulerView
	 * @constructor
	 */
	function WebSchedulerView(args) {
		var scope = this;
		var controller = args.controller;
		// this view component (table) can be dynamically replaced (byEmplsTableController or byRolesTableController)
		this.schedulerTableCtrl = args.schedulerTableCtrl;		
		var stateChangeController = undefined;
		
		// {WeekPicker}
		this.weekPicker = undefined;
		
		// el's
		var $content = jQuery('body');		
		var $departmentsTabs = jQuery('.departments-tabs', $content);
		var $masterSchedule = jQuery('.master-schedule', $content);
		var $restoreMaster = jQuery('#templateRestore', $masterSchedule);
		var $tableHeader = jQuery('.table-header');
		var $weekDisplay = jQuery('.week-display');
	
		// templates		
		var loginPopupTmpl = _.template(jQuery('#loginPopupTmpl').text());
		var errorPopupTmpl = _.template(jQuery('#errorPopupTmpl').text());
		var skippedEmployeesTmpl = _.template(jQuery('#skippedEmployeesTmpl').text());			
		var outdatedScheduleTmpl = _.template(jQuery('#outdatedScheduleTmpl').text());
		var departmentTmpl = _.template(jQuery('#departmentTmpl').text());
		var tableHeaderTmpl = _.template(jQuery('#tableHeaderTmpl').text());
		
		function init(){			
			initWeekSelect();
			initWeekArrows();
			initDepartmentSelect();
			initSwitchViewSelect();
			initMasterScheduler();			
			stateChangeController = new StateChangeController({webSchedulerController: controller,
															   		webSchedulerView : scope,
															    $el: jQuery('.state-change', $content)});
			initTableHeader();
			initSendSms();
		}		
		
		function initSendSms(){
			$content.find('[data-role="sendSms"]').buttonDecor().on('click', function(){
				var $button = jQuery(this).buttonDecor('startLoading');
				require(['SendSmsController'], function(SendSmsController){
					(new SendSmsController({controller: controller}))
						.handleSendSms($button, scope.schedulerTableCtrl.week);;
				});
			});
		}		
		
		/**
		 * Delegating click-listener on tableHeader for statistics-link.
		 */
		function initTableHeader(){
			jQuery($tableHeader)
				.on('click', '.statistics', handleLinkClick.bind(null, controller.handleStatisticsClicked))
				.on('click', '.print', handleLinkClick.bind(null, controller.handlePrintClicked))
				.on('click', '.audits', handleLinkClick.bind(null, controller.handleAuditsClicked));
		}
		
		function handleLinkClick(handler, event){
			var $link = jQuery(event.target).addClass('loading');
			return handler().then(function(){
				$link.removeClass('loading');
			}).fail(function(){
				controller.logError();
				$link.removeClass('loading');
			});			
		}
		
		this.updateStateActions = function(){
			stateChangeController.updateStateActions();
		};		
		
		/** updates table-header with selected week-info and scheduleState.		
		*/
	    this.updateTableHeader = function(){	 
	    	var week = timeZoneUtils.parseInServerTimeAsMoment(scope.schedulerTableCtrl.week.startOfWeek).format('dddd, MMMM D YYYY');
	    	$tableHeader.empty().append(tableHeaderTmpl({
				selectedWeek : 'Week of ' + week,
				scheduleState : scope.schedulerTableCtrl.scheduleState,
				hideState : scope.schedulerTableCtrl.scheduleState.name === 'PendingState' && !scope.schedulerTableCtrl.existsShift(),
				scheduleInfo : scope.schedulerTableCtrl.scheduleInfo
			}));
		
			$weekDisplay.text(timeZoneUtils.parseInServerTimeAsMoment(scope.schedulerTableCtrl.week.startOfWeek).format('MMM D YYYY'));
		};
		
		/**
		 * Inits select-box for switching the view (byRoles, byEmployees)
		 */
		function initSwitchViewSelect() {
			var $switchViewSelect = jQuery('#switchView');
			var viewTitle = jQuery('option[value="' + controller.selectedView + '"]', $switchViewSelect).text();
			$switchViewSelect.attr('title', createSelectDisplay(viewTitle)).selectDecor({
				showTitle : true,
				showSelection : false,
				customWrapperClass : 'switchView-wrapper',
				width : 220
			}).selectDecor('select', controller.selectedView).on('change', function() {
				var selection = $switchViewSelect.selectDecor('selected');
				$switchViewSelect.attr('title', createSelectDisplay(selection.display)).selectDecor('refresh');
				controller.handleSwitchView(selection.value);
			});

			function createSelectDisplay(viewTitle) {
				return 'Schedule by ' + viewTitle;
			}
		}
		
		
		
		/**
		 * Register click-listener on save-as-master -button.
		 */
		function initTemplateSave(){
			jQuery('#templateSave', $masterSchedule).buttonDecor().on('click', function(){
				var $button = jQuery(this).buttonDecor('startLoading');
				controller.handleSaveAsMaster($button);
			});
		}
		
		/**
		 * Inits the week-selection.
		 */
		function initWeekSelect(){
			var $button = jQuery('#weekButton').buttonDecor();		
			scope.weekPicker = new WeekPicker({
				$el : jQuery('.option-bar .datePicker'),
				selectedDate : controller.selectedDate,
				startOfWeekDay: scope.schedulerTableCtrl.startOfWeekDay
			});			
			$button.on('click', function(){
				scope.weekPicker.getEl().slideToggle();
			});
			
			scope.weekPicker.on('dateSelected', function(weekPicker){
				scope.weekPicker.getEl().slideToggle(function(){
					controller.handleWeekSelect(weekPicker.selectedDate);	
				});				
			});			
		}
		
		/**
		 * Registers click-handler on week-select arrows.
		 */
		function initWeekArrows(){
			jQuery('.week-arrow', $content).on('click',function(){
				var $arrow = jQuery(this);
				var selectedDate = timeZoneUtils.parseInServerTimeAsMoment(controller.selectedDate);
				$arrow.hasClass('left') && selectedDate.add('weeks', -1);
				$arrow.hasClass('right') && selectedDate.add('weeks', 1);
				controller.handleWeekArrowSelect(selectedDate.toDate());			
			});			
		}
		
		/**
		 * Renders departments in case scheduleBy-pref is 'Department', pre-selects
		 * according to selectedDepartment, registers click-listener to change.
		 */
		function initDepartmentSelect(){
			if(scope.schedulerTableCtrl.scheduleBy !== 'Department' 
				|| scope.schedulerTableCtrl.departments.length === 0){
				return;
			}
			_.chain(scope.schedulerTableCtrl.departments).each(function(department){
				$createDepartment(department).appendTo($departmentsTabs);
			});
			
			// pre-select
			$departmentsTabs.find('[data-id="'+controller.selectedDepartmentName+'"]')
							.addClass('selected');
			
			// add-listener
			$departmentsTabs.on('click', '.department', function(){
				var $department = jQuery(this);
				if($department.hasClass('selected')){
					return;
				}
				$departmentsTabs.find('.department').removeClass('selected');
				$department.addClass('selected');
				controller.handleDepartmentSelect($department);
			});		
		}
		
		/**
		 * Creates a department-el based on the given department.
		 * @param department : DepartmentHolder
		 */
		function $createDepartment(department) {
			return jQuery(departmentTmpl({department : department}));			
		}

		function initMasterScheduler(){
			if(!scope.schedulerTableCtrl.useMasterSchedule){
				return;
			}			
			initTemplateRestore();
			initTemplateSave();			
			$masterSchedule.show();			
		}		
		
		/**
		 * Registers click-listener on restore-button.
		 */
		function initTemplateRestore() {
			$restoreMaster.buttonDecor()
				.on('click', function(){
					$restoreMaster.buttonDecor('startLoading');
					controller.handleRestoreClick.call(this);
				});
		}		
		
		/**
		 * @param data : {title, msg} optional
		 */
		this.showServerError = function(data){
			data = _.extend({title: 'Some error happened',
				msg:'Sorry. The last operation failed.'}, data);			 
			jQuery.decor.dialogDecor({
				$el : jQuery(errorPopupTmpl(data)),
				options : {
					editorWidth : 350,
					editorHeight : 200,
					warning : true,
					onTheFly : true,
					showClosing : true
				}
			}).showDialog();
		};		
		
		/**
		 * Shows not-authorized popup.
		 */
		this.showNotAuthorized = function(){
			var data = {title: 'No permission to see',
					msg:'You have not required authorization to access this application.'}
			jQuery.decor.dialogDecor({
				$el : jQuery(errorPopupTmpl(data)),
				options : {
					editorWidth : 350,
					editorHeight : 200,
					warning : true,
					onTheFly : true,
					showClosing : false
				}
			}).showDialog();
		};
		
		/**
		 * Shows pop-up for saying that modification of schedule is not permitted
		 * due to date-in-past.
		 * @param args : {msg (string)} - msg the message to display
		 */
		this.showScheduleModNotPermitted = function(args){
			args.title = 'No permission to modify';
			jQuery.decor.dialogDecor({
				$el : jQuery(errorPopupTmpl(args)),
				options : {
					editorWidth : 400,
					editorHeight : 200,
					warning : true,
					onTheFly : true,
					showClosing : true
				}
			}).showDialog();
		};
		
		/**
		 * Shows pop-up for saying that sending of schedule via sms is not permitted
		 * due to not required authorization.
		 * @param args : {msg (string)} - msg the message to display
		 */
		this.showSmsScheduleNotPermitted = function(args){
			args.title = 'No permission to send';
			jQuery.decor.dialogDecor({
				$el : jQuery(errorPopupTmpl(args)),
				options : {
					editorWidth : 400,
					editorHeight : 200,
					warning : true,
					onTheFly : true,
					showClosing : true
				}
			}).showDialog();
		};		
		
		/**
		 * Shows pop-up for saying that modification of schedule is not permitted
		 * due to date-in-past.
		 */
		this.showMasterSaveNotPermitted = function(){
			var data = {title: 'Empty Schedule',
					msg:'The week does not contain any shifts.'};
			jQuery.decor.dialogDecor({
				$el : jQuery(errorPopupTmpl(data)),
				options : {
					editorWidth : 400,
					editorHeight : 200,
					warning : true,
					onTheFly : true,
					showClosing : true
				}
			}).showDialog();
		};
		
		/**
		 * Shows popup which tells to login.
		 */
		this.showLoginPopup = function(loginUrl) {
			jQuery.decor.dialogDecor({
				$el : jQuery(loginPopupTmpl({
					loginUrl : loginUrl
				})),
				options : {
					editorWidth : 350,
					editorHeight : 200,
					onTheFly : true,
					showClosing : false
				}
			}).showDialog();
		};
		
		/**
		 * Shows pop-up containing employees which was skipped in save-as-master op.
		 * @param employees
		 */
		this.showSkippedEmployees = function(employees){
			jQuery.decor.dialogDecor({
				$el : jQuery(skippedEmployeesTmpl({
					employees : employees
				})),
				options : {
					editorWidth : 350,
					editorHeight : 200,
					onTheFly : true,
					showClosing : true
				}
			}).showDialog();
		};		
		
		/**
		 * Shows outdate-schedule pop-up.
		 * @param args : {onReloadClick : function(event)} - onReloadClick called when corresp.
		 *      		button is clicked.
		 */
		this.showOutdatedScheduleTmpl = function(args) {
			var $el = jQuery(outdatedScheduleTmpl(args))
						.on('click', '.reload', args.onReloadClick);
						
			return jQuery.decor.dialogDecor({
				$el : $el,
				options : {
					editorWidth : 450,
					editorHeight : 200,
					onTheFly : true,					
					warning : true,
					showClosing : false
				}
			}).showDialog();
		};
		
		init();
		
	}	
});