define(['timeZoneUtils'], function(timeZoneUtils){
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
		var $fromTime = jQuery('.from-time', this.$el);
		var $toTime = jQuery('.to-time', this.$el);
		this.$forWhom = jQuery('.for-whom', this.$el);
		var $dateHeader = jQuery('.date-header', this.$el);		
		this.$unavailContainer = jQuery('.unavail-container', this.$el);
		var $shiftValError = jQuery('.shift-val-error', this.$el);
		var $shiftWarning = jQuery('.shift-warning', this.$el);
		this.$apply = jQuery('button.apply', this.$el); // the apply button

		// events
		var SUBMIT = 'submit';

		// template
		var unavailInfoTmpl = _.template(jQuery('#unavailInfoTmpl').text());
		var overtimeWarnTmpl = _.template(jQuery('#overtimeWarnTmpl').text());

		this.init = function() {
			scope = this;
			initCancel();			
			initPeriodInputs();
			initApply();
		};		

		function initApply() {
			jQuery('button.apply', scope.$el).on('click', function() {
				scope.$apply.buttonDecor('startLoading');
				scope.fire(SUBMIT, scope.findSelections());
			});
		}		
		
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
			// this sets time without triggering select-event
			$fromTime.timepicker('setTime', timeZoneUtils.inServerTime(scope.editShiftCtrl.selectedStartTime), true); 
			$toTime.timepicker('setTime', timeZoneUtils.inServerTime(scope.editShiftCtrl.selectedEndTime), true);			
		};
		
		
		/**
		 * Grasps from view selected values, suitable to make create-request and perform validations.
		 * @returns {ScheduleDetail}
		 */
		this.findSelections = function() {			
			return {				
				startMinute : $fromTime.timepicker('getMinute'),
				startHour : $fromTime.timepicker('getHour'),
				endMinute : $toTime.timepicker('getMinute'),
				endHour : $toTime.timepicker('getHour')				
			};
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
				
		
		/**
		 * Renders given unavailabilities into container, by adding them.
		 * Extends presented intervals by availabilies, computed as complement of
		 * schedule-hours and unavails.
		 * @param unavailabilities : [unavailability]
		 */
		this.renderUnavailabilities = function(unavailabilities) {			
			_.chain([])
			 .union(scope.editShiftCtrl.findAvailabilities(unavailabilities)) /*add availabilities*/
			 .union(unavailabilities) /* add unavails */
			 .sortBy(function(interval) { /* sort by startDate */
				return interval.startDate;
			  })
			 .each(function(interval) { /* render */
				if (interval.unavailType === 'EmployeeScheduleDetail') {
					interval.availabilityType = 'scheduled';
				}
				scope.$unavailContainer.append(unavailInfoTmpl({
					startTime : formatUnavailTime(interval.startDate),  
					endTime : formatUnavailTime(interval.endDate, true),
					type : interval.availabilityType,
					unavailType : interval.unavailType
				}));									   
			 });			
		};

		/**
		 * Formates the given time as given in unavailabilities.
		 * 
		 * @param time :
		 *            {number}
		 * @param isEndtime :
		 *            {boolean} if it is a interval end-time
		 */
		function formatUnavailTime(time, isEndtime) {
			var mom = timeZoneUtils.parseInServerTimeAsMoment(time); 
			isEndtime && mom.add(1, 'seconds');
			return mom.format('HH:mm');
		}
		
		
		this.removeValidatonMsgs = function(){
			$shiftValError.empty();
		};
		
		this.showValidationMsg = function(validationMsg){
			$shiftValError.hide();
			$shiftValError.text(validationMsg);
			$shiftValError.show('pulsate', 800);
		};		

		function initCancel() {
			jQuery('button.cancel', scope.$el).on('click', scope.closeDialog);
		}

		/**
		 * Inits timepicker on input-fields for period.
		 */
		function initPeriodInputs() {
			var options = {
				minutes : {
					starts : 0,
					interval : scope.editShiftCtrl.tableController.scheduleGranularity
				},
				defaultTime : '12:00',
				beforeShow : function(input, picker) {
					// this fixes position-problem if shown in fixed-context					
					setTimeout(correctPosition, 0);
					
					function correctPosition() {
						var $picker = jQuery(picker.tpDiv);
						var top = jQuery(input).offset().top - jQuery(window).scrollTop() + 33;
						$picker.css('top', top);
					}
				},
				onClose: scope.editShiftCtrl.handleTimePickerClose				
			};
			
			initFromPicker(options);
			initToPicker(options);					
		}
		
		/**
		 * Inits the from-time-picker, adds upper-restriction depending on to-picker selection.
		 * @param options
		 */
		function initFromPicker(options){			
			var bounds = {};
			bounds.onHourShow = function(hour) {
				var time = moment(scope.editShiftCtrl.extractShiftTime(hour, 0));				
				var upperTime = scope.editShiftCtrl.selectedEndTime || scope.editShiftCtrl.storeScheduleClose;
				// this works, because the 'hour' determines the (real-)day and therefore 'time' is set correctly 
				if(time.isBefore(scope.editShiftCtrl.storeScheduleOpen, 'hour') || time.isAfter(upperTime, 'hour')){
					return false;
				}				
				return true;
			};
			bounds.onMinuteShow = function(hour, minute) {	
				if(minute == undefined){ return false; }
				var time = moment(scope.editShiftCtrl.extractShiftTime(hour, minute));				
				var upperTime = scope.editShiftCtrl.selectedEndTime || scope.editShiftCtrl.storeScheduleClose;			
				if(time.isBefore(scope.editShiftCtrl.storeScheduleOpen, 'minute') || time.isAfter(upperTime, 'minute')){
					return false;
				}				
				return true;
			};
			bounds.onSelect = function(){				
				scope.editShiftCtrl.handleFromSelected($fromTime.timepicker('getHour'), $fromTime.timepicker('getMinute'));
			};
			$fromTime.timepicker(_.chain(bounds).extend(options).value());
		}
		
		/**
		 * Inits the to-time-picker, adds lower-restriction depending on from-picker selection.
		 * @param options
		 */
		function initToPicker(options){
			var bounds = {};
			bounds.onHourShow = function(hour) {
				var time = moment(scope.editShiftCtrl.extractShiftTime(hour, 0));				
				var lowerTime = scope.editShiftCtrl.selectedStartTime || scope.editShiftCtrl.storeScheduleOpen;
				// this works, because the 'hour' determines the (real-)day and therefore 'time' is set correctly 
				if(time.isBefore(lowerTime, 'hour') || time.isAfter(scope.editShiftCtrl.storeScheduleClose, 'hour')){
					return false;
				}				
				return true;
			};
			bounds.onMinuteShow = function(hour, minute) {	
				if(minute == undefined){ return false; }
				var time = moment(scope.editShiftCtrl.extractShiftTime(hour, minute));				
				var lowerTime = scope.editShiftCtrl.selectedStartTime || scope.editShiftCtrl.storeScheduleOpen;
				// this works, because the 'hour' determines the (real-)day and therefore 'time' is set correctly 
				if(time.isBefore(lowerTime, 'minute') || time.isAfter(scope.editShiftCtrl.storeScheduleClose, 'minute')){
					return false;
				}				
				return true;
			};
			bounds.onSelect = function(){				
				scope.editShiftCtrl.handleToSelected($toTime.timepicker('getHour'), $toTime.timepicker('getMinute'));
			};
			$toTime.timepicker(_.chain(bounds).extend(options).value());	
		}
		
	}
	
});