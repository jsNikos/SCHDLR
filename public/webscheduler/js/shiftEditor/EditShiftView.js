define(['timeZoneUtils', 'css!shiftEditor/editShift.css'], function(timeZoneUtils){
	return EditShiftView;
	
	/**
	 * ABSTRACT view supporting edit-shift for both, byEmployee and byRoles -view.
	 * This class is intended to extend instance of 'jQuery.decor.dialogDecor'.
	 */
	function EditShiftView() {	
		var scope = undefined;
		var parent = Object.getPrototypeOf(this);
		this.editShiftCtrl = undefined;

		// el's
		this.$forWhom = jQuery('.for-whom', this.$el);
		var $dateHeader = jQuery('.date-header', this.$el);
		var $shiftValError = jQuery('.shift-val-error', this.$el);
		var $shiftWarning = jQuery('.shift-warning', this.$el);
		this.$apply = jQuery('button.apply', this.$el); // the apply button

		// template
		var overtimeWarnTmpl = _.template(jQuery('#overtimeWarnTmpl').text());

		this.init = function() {
			scope = this;
		};

		/**
		 * Removes loading-state from dialog.
		 */
		this.removeLoadingState = function(){
			scope.$apply.buttonDecor('stopLoading');
		};
		
		/**
		 * Disables apply-button.
		 */
		this.disableApply = function(){
			scope.$apply.attr('disabled', 'disabled');
		};
		
		/**
		 * Enable apply-button.
		 */
		this.enableApply = function(){
			scope.$apply.removeAttr('disabled');
		};
		
		/**
		 * Applies init-data on dialog (selectable elements, ...)
		 */
		this.applyInitData = function(){
			throw new Error('this is abstract');
		};
		
		
		/**
		 * For edit-mode, intended to show validation-issues for the given validated scheduleDetail-instance.
		 * 
		 */
		this.showValidationIssues = function(scheduleDetail) {
			var issues = scope.editShiftCtrl.extractNotOverwrittenIssues(scheduleDetail);
			if (issues && issues.length > 0) {
				scope.showValidationMsg(_.chain(issues).pluck('errorMsg').value()[0]);
			}
		};
		
		/**
		 * For edit-mode. Renders warnings (due to overtime) from selected shift. 
		 */
		this.showWarnings = function() {
			var scheduleDetail = scope.editShiftCtrl.$selectedShift.data('scheduleDetail');
			if (scheduleDetail.overtimeHours) {
				$shiftWarning.html(overtimeWarnTmpl({
					overtimeHours : scheduleDetail.overtimeHours
				}));
			}
		};
		
		/**
		 * Applies pre-selections according to given scheduleDetail.
		 */
		this.applyPreselections = function(scheduleDetail) {
		};
		
		
		/**
		 * Grasps from view selected values, suitable to make create-request and perform validations.
		 * @returns {ScheduleDetail}
		 */
		this.findSelections = function() {
			return {};
		};
		
		/**
		 * Overwrite.
		 */
		this.showDialog = function() {
			var formattedDate = timeZoneUtils.parseInServerTimeAsMoment(scope.editShiftCtrl.weekDay, scope.editShiftCtrl.tableController.DAY_COORD_FORMAT)
										     .format('dddd, MMMM D YYYY');
			$dateHeader.text(formattedDate);
			parent.showDialog.call(scope);		
		};

		this.removeValidatonMsgs = function(){
			$shiftValError.empty();
		};
		
		this.showValidationMsg = function(validationMsg){
			$shiftValError.hide();
			$shiftValError.text(validationMsg);
			$shiftValError.show('pulsate', 800);
		};		

	}

});
