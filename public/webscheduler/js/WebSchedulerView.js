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
		var $masterSchedule = jQuery('.master-schedule', $content);
		var $restoreMaster = jQuery('#templateRestore', $masterSchedule);

		// templates
		var loginPopupTmpl = _.template(jQuery('#loginPopupTmpl').text());
		var errorPopupTmpl = _.template(jQuery('#errorPopupTmpl').text());
		var skippedEmployeesTmpl = _.template(jQuery('#skippedEmployeesTmpl').text());
		var outdatedScheduleTmpl = _.template(jQuery('#outdatedScheduleTmpl').text());

		function init(){
			initWeekSelect();
			initSwitchViewSelect();
			initMasterScheduler();
			stateChangeController = new StateChangeController({webSchedulerController: controller,
															   		webSchedulerView : scope,
															    $el: jQuery('.state-change', $content)});
			initSendSms();
		}

		function initSendSms(){
			$content.find('[data-role="sendSms"]').buttonDecor().on('click', function(){
				var $button = jQuery(this).buttonDecor('startLoading');
				require(['SendSmsController'], function(SendSmsController){
					(new SendSmsController({controller: controller}))
						.handleSendSms($button, controller.vueScope.$data.week);
				});
			});
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
				return 'View by ' + viewTitle;
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
