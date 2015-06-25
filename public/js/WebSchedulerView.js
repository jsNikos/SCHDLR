define(['libs/WeekPicker', 'libs/timeZoneUtils'], function(WeekPicker, timeZoneUtils){
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
		
		// {WeekPicker}
		this.weekPicker = undefined;
		
		// el's
		var $content = jQuery('body');
		var $stateChange = jQuery('.state-change', $content);
		var $departmentsTabs = jQuery('.departments-tabs', $content);
		var $masterSchedule = jQuery('.master-schedule', $content);
		var $restoreMaster = jQuery('#templateRestore', $masterSchedule);
		var $tableHeader = jQuery('.table-header');
		var $weekDisplay = jQuery('.week-display');
	
		// templates
		var notAuthorPopupTmpl = _.template(jQuery('#notAuthorPopupTmpl').text());
		var loginPopupTmpl = _.template(jQuery('#loginPopupTmpl').text());
		var modNotPermittedTmpl = _.template(jQuery('#modNotPermittedTmpl').text());
		var masterSaveNotPermittedTmpl = _.template(jQuery('#masterSaveNotPermittedTmpl').text());
		var skippedEmployeesTmpl = _.template(jQuery('#skippedEmployeesTmpl').text());
		var stateActionsTmpl = _.template(jQuery('#stateActionsTmpl').text());
		var stateChangeIssuesTmpl = _.template(jQuery('#stateChangeIssuesTmpl').text());
		var outdatedScheduleTmpl = _.template(jQuery('#outdatedScheduleTmpl').text());
		var departmentTmpl = _.template(jQuery('#departmentTmpl').text());
		var tableHeaderTmpl = _.template(jQuery('#tableHeaderTmpl').text());
		
		function init(){			
			initWeekSelect();
			initWeekArrows();
			initDepartmentSelect();
			initSwitchViewSelect();
			initMasterScheduler();				
			initStateActions();	
			initTableHeader();
		}		

		/**
		 * Delegating click-listener on tableHeader for statistics-link.
		 */
		function initTableHeader(){
			jQuery($tableHeader).on('click', '.statistics', controller.handleStatisticsClicked);
			jQuery($tableHeader).on('click', '.print', controller.handlePrintClicked);
		}		
		
		
		/** updates table-header with selected week-info and scheduleState.		
		*/
	    this.updateTableHeader = function(){	 
	    	var week = timeZoneUtils.parseInServerTimeAsMoment(scope.schedulerTableCtrl.week.startOfWeek).format('dddd, MMMM D YYYY');
	    	$tableHeader.empty().append(tableHeaderTmpl({
				selectedWeek : 'Week of ' + week,
				scheduleState : scope.schedulerTableCtrl.scheduleState,
				hideState : scope.schedulerTableCtrl.scheduleState.name === 'PendingState' && !scope.schedulerTableCtrl.existsShift()
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
				controller.handDepartmentSelect($department);
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
		 * Registers click-listeners which delegate clicked action to controller.
		 */
		function initStateActions(){
			$stateChange.on('click', 'button', function(event) {
				// disable buttons
				jQuery('button', $stateChange).attr('disabled', 'disabled');
				controller.handleStateChangeClick(event);
			});
		}
		
		this.enableStateChange = function(){
			jQuery('button', $stateChange).removeAttr('disabled');
		};
		
		/**
		 * Re-renders action-buttons based on schedulerState-model in schedulerTableController.
		 */
		this.updateStateActions = function() {
			$stateChange.empty().append(stateActionsTmpl({
				authorizedActions : scope.schedulerTableCtrl.authorizedActions
			}));
		};
		
		
		/**
		 * Shows not-authorized popup.
		 */
		this.showNotAuthorized = function(){
			jQuery.decor.dialogDecor({
				$el : jQuery(notAuthorPopupTmpl()),
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
			jQuery.decor.dialogDecor({
				$el : jQuery(modNotPermittedTmpl(args)),
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
			jQuery.decor.dialogDecor({
				$el : jQuery(masterSaveNotPermittedTmpl()),
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
		 * Shows pop-up containing issues with change of schedule-state.
		 * @param blocker: [string] - issues msgs
		 */
		this.showStateChangeBlocker = function(blocker){
			jQuery.decor.dialogDecor({
				$el : jQuery(stateChangeIssuesTmpl({
					blocker : blocker
				})),
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