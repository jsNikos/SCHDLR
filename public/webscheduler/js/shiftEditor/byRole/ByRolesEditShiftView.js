define(['EditShiftView'], function(EditShiftView){
	return function(args){
		EditShiftView.prototype = jQuery.decor.dialogDecor({
			$el : args.$el,
			options : {
				onTheFly: true,
				editorHeight: 585
			}
		});
		ByRolesEditShiftView.prototype = new EditShiftView();
		return new ByRolesEditShiftView(args);
	};

	/**
	 * Extention of EditShiftView supporting byRole -view.
	 * @constructor
	 */
	function ByRolesEditShiftView(args){
		var scope = this;
		this.editShiftCtrl = args.controller;

		// el's
		var $who = jQuery('.who', scope.$el);
		var $availableTab = jQuery('#availableTab', scope.$el);
		var $unavailableTab = jQuery('#unavailableTab', scope.$el);
		var $postedTab = jQuery('#postedTab', scope.$el);
		var $whoSelect = jQuery('.who-select', scope.$el);

		function init(){
			scope.init.call(scope);
			initWhoSelect();
			initWhoInput();
		}

		/**
		 * Registers click-listener which triggers to open employee-selector
		 * in case it is enabled.
		 */
		function initWhoInput(){
			$who.on('click', function(){
				if(!$who.hasClass('enabled')){
					$who.tooltip('open');
					return;
				}
				$whoSelect.show();
			}).tooltip();
		}

		/**
		 * Inits who-select-box and registers defering click-listener.
		 */
		function initWhoSelect(){
			// init-tabs
			$whoSelect.tabs();
			// employee-select
			$whoSelect.on('click', '.employeeName', function(event){				
				scope.editShiftCtrl.handleWhoChange(jQuery(event.target).data('employee'));
			});
			// register click-listener for closing
			jQuery('body').on('click', function(event){
				var $target = jQuery(event.target);
				if($target.closest('.who-select').size() > 0
					|| $target.hasClass('who')){
					return;
				}
				scope.closeWhoSelector();
			});
		}

		/**
		 * triggers to close the employee-selector
		 */
		this.closeWhoSelector = function(){
			$whoSelect.fadeOut();
		};

		/**
		 * Applies pre-selections according to given scheduleDetail.
		 */
		this.applyPreselections = function(scheduleDetail) {
			Object.getPrototypeOf(scope).applyPreselections.call(scope, scheduleDetail);
			scope.enableWhoSelect();
			scope.renderSelectedEmployee(scope.editShiftCtrl.findEmployeeFromEditedShift());
		};


		/**
		 * Overwrite.
		 */
		this.showDialog = function() {
			scope.$forWhom.text(' for ' + scope.editShiftCtrl.role);
			Object.getPrototypeOf(scope).showDialog.call(scope);
		};

		/**
		 * Grasps from view selected values, suitable to make create-request and
		 * perform validations.
		 *
		 * @returns {ScheduleDetail}
		 */
		this.findSelections = function() {
			var result = Object.getPrototypeOf(scope).findSelections.call(scope);
			result.employeeName = $who.attr('data-name');
			return result;
		};


		/**
		 * Refreshes the employee-list in given target-tab.
		 * @param employees : [EmployeeHolder]
		 * @param $targetTab : the container to add employees ($availableTab, $postedTab or $unavailableTab)
		 */
	    function updateEmployeeList(employees, $targetTab){
			$targetTab.empty();
			var $list = jQuery('<ul></ul>')
							.appendTo($targetTab)
							.addClass('employee-list');
			_.chain(employees).each(function(employee){
				jQuery('<li></liv>')
					.addClass('employeeName')
					.attr('data-name', employee.name)
					.data('employee', employee)
					.text(employee.displayName)
					.appendTo($list);
			});
		}

	    /**
	     * Triggers to refresh tab for employee selection.
	     */
	    this.updateSelectWhoTab = function(){
	    	updateEmployeeList(scope.editShiftCtrl.findAvailableEmployees(), $availableTab);
	    	updateEmployeeList(scope.editShiftCtrl.findApprovedUnavailableEmployees(), $unavailableTab);
	    	updateEmployeeList(scope.editShiftCtrl.findPostedUnavailableEmployees(), $postedTab);
	    };

	    /**
	     * Enables who-select.
	     */
	    this.enableWhoSelect = function(){
	    	$who.tooltip('disable');
	    	$who.addClass('enabled');
	    };

	    /**
	     * Disables who-select.
	     */
	    this.disableWhoSelect = function(){
	    	$who.removeClass('enabled');
	    };

	    /**
	     * Renders selected employee as 'who'
	     * @param employee : EmployeeHolder
	     */
	    this.renderSelectedEmployee = function(employee){
	    	$who.attr('value', employee.displayName)
	    		.attr('data-name', employee.name);
	    };

		/**
		 * Applies employees available for role to view in case of 'edit'-mode.
		 */
		this.applyInitData = function() {
			scope.editShiftCtrl.isEditMode() && scope.updateSelectWhoTab();
		};

		init();

	}

});
