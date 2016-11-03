define(['ValidateShiftModifUtils', 'unavailabilityUtils', 'timeZoneUtils',
 'q', 'vue', 'TimelineComponent', 'TimepickerComponent', 'SelectDecor'],
function(ValidateShiftModifUtils, unavailabilityUtils, timeZoneUtils,
   q, Vue, TimelineComponent, TimepickerComponent, SelectDecor){
	_.chain(EditShiftController.prototype).extend(new ValidateShiftModifUtils());
	return EditShiftController;

	/**
	 * ABSTRACT controller supporting edit-shift for both, byEmployee and byRoles -view.
	 * Note: for each use of this editor, create a new instance and call on of its showAs..-methods.
	 * @constructor
	 */
	function EditShiftController() {
		var scope = undefined;
		this.tableController = undefined;
		var webSchedulerController = undefined;

		this.vueScope = undefined;
		this.editShiftView = undefined;

		// model
		this.roles = undefined;
		// {String} the selected week-day
		this.weekDay = undefined;
		// business-day start (int)
		this.startOfDay = undefined;
		// {string} the selected employee from shift
		this.employeeName = undefined;
		// in case of edit, points to shift and its scheduleDetail
		this.$selectedShift = undefined;
		this.scheduleDetail = undefined;
		// if underlying shift may be modified
		this.modifiable = undefined;

		// (Date) which hold store's schedule-open/close for this day
		this.storeScheduleOpen = undefined;
		this.storeScheduleClose = undefined;

		this.timeSlots = undefined;

		this.init = function() {
			scope = this;
			webSchedulerController = scope.tableController.webSchedulerController;
		};

		/**
		 * Intitializes the view.
		 */
		function initView(){
			var ViewConstr = scope.getViewConstructor();
			scope.editShiftView = new ViewConstr({
				controller : scope,
				$el : jQuery(scope.getDialogTmpl()())
			});

		 scope.vueScope =	new Vue({
				el: '.edit-dialog',
				data: {
				    timeSlots: undefined,
					  selectedStartTime: undefined, // (Date)
					  selectedEndTime: undefined,  // (Date) note: this end-time is +1second over the shift endTime
						storeScheduleClose: scope.storeScheduleClose,
						storeScheduleOpen: scope.storeScheduleOpen,
						weeklyScheduleInRegularTimeFormat: scope.tableController.weeklyScheduleInRegularTimeFormat,
						scheduleGranularity: scope.tableController.scheduleGranularity,
						showWarnings: true,
						unavailabilities: [],
						roles: scope.roles,
						selectedRole: undefined,
						note: undefined
					},
				computed:{
					fromPickerMaxHour: fromPickerMaxHour,
					fromPickerMaxMinute: fromPickerMaxMinute,
					toPickerMinHour: toPickerMinHour,
					toPickerMinMinute: toPickerMinMinute,
					timeScheduled: timeScheduled,
					timeFormat: findTimeFormat
				},
				components: {
					'timeline': new TimelineComponent(),
					'frompicker': new TimepickerComponent(),
					'topicker': new TimepickerComponent(),
					'selectdecor' : new SelectDecor({displayFilter: rolesDisplayFilter})
				},
				methods: scope,
				watch: {
					selectedStartTime: scope.handleSelectedTimeChange,
					selectedEndTime: scope.handleSelectedTimeChange
				},
				events:{
					selectedTimeChange: scope.handleSelectedTimeChange
				},
				filters:{
					unavailTimeFilter: unavailTimeFilter
				}
			});
		}

		function rolesDisplayFilter(role) {
			return role.isDefault ? (role.name + ' (default)') : role.name;
		}

		function findTimeFormat(){
			return this.weeklyScheduleInRegularTimeFormat ? 'h:mm a' : 'HH:mm';
		}

		function timeScheduled(){
			return timeZoneUtils.parseInServerTimeAsMoment(this.selectedEndTime)
							.diff(timeZoneUtils.parseInServerTimeAsMoment(this.selectedStartTime), 'hours', true);
		}

		// 'this' is essential for computed-props to work
		function fromPickerMaxHour(){
			return this.$data.selectedEndTime || this.$data.storeScheduleClose;
		}

		function fromPickerMaxMinute(){
			return this.$data.selectedEndTime || this.$data.storeScheduleClose;
		}

		function toPickerMinHour(){
			return this.$data.selectedStartTime || this.$data.storeScheduleOpen;
		}

		function toPickerMinMinute(){
			return this.$data.selectedStartTime || this.$data.storeScheduleOpen;
		}

		this.handleSelectedTimeChange = function(val, oldVal){
			if(oldVal){
				this.$data.showWarnings = false;
			}

			_.chain(scope.vueScope.$data.timeSlots)
				.each(unassignSlot)
				.each(assignSlot);
		};

		function assignSlot(timeSlot){
			if(timeSlot.startTime >= scope.vueScope.$data.selectedStartTime && timeSlot.startTime < scope.vueScope.$data.selectedEndTime){
				timeSlot.shift = true;
				if(timeSlot.startTime <= scope.vueScope.$data.selectedStartTime){
					timeSlot.shiftStarts = true;
				}
				if(timeSlot.endTime >= (scope.vueScope.$data.selectedEndTime - 1000)){
					timeSlot.shiftEnds = true;
				}
			}
		}

		function unassignSlot(timeSlot) {
			timeSlot.shift = undefined;
			timeSlot.shiftStarts = undefined;
			timeSlot.shiftEnds = undefined;
		}

		this.handleDragEnd = function(){
			var assignedSlots =	_.filter(scope.vueScope.$data.timeSlots, function(timeSlot){ return timeSlot.shift; });
			if(assignedSlots.length === 0){
				scope.vueScope.$data.selectedStartTime = undefined;
				scope.vueScope.$data.selectedEndTime = undefined;
			} else{
				scope.vueScope.$data.selectedStartTime = new Date(assignedSlots[0].startTime);
				scope.vueScope.$data.selectedEndTime = moment(_.last(assignedSlots).endTime).add(1, 'seconds').toDate();
			}
		};

		this.handleCancel = function(){
			scope.editShiftView.closeDialog();
		};

		this.handleApply = function(){
			scope.editShiftView.$apply.buttonDecor('startLoading');
			handleSubmit(scope.editShiftView.findSelections());
		};

		/**
		 * Handles selection of from-time.
		 * @param hour
		 * @param minute
		 */
		this.handleFromSelected = function(args){
			scope.vueScope.$data.selectedStartTime = scope.extractShiftTime(args.hour, args.minute);
		};

		/**
		 * Handles selection of to-time.
		 * @param hour
		 * @param minute
		 */
		this.handleToSelected = function(args){
			scope.vueScope.$data.selectedEndTime = scope.extractShiftTime(args.hour, args.minute);
		};

		/**
		 * Called when time-picker from/to select is closed.
		 */
		this.handleTimePickerClose = function(){
			// default do nothing
		};

		function unavailTimeFilter(time, isEndtime) {
			var mom = timeZoneUtils.parseInServerTimeAsMoment(time);
			isEndtime && mom.add(1, 'seconds');
			return mom.format(findTimeFormat());
		}

		/**
		 * Points to the template backing the dialog.
		 * @returns  {_.template}
		 */
		this.getDialogTmpl = function(){
			throw new Error('this is abstract');
		};

		/**
		 * Returns the constructor to be used to init view.
		 */
		this.getViewConstructor = function(){
			throw new Error('this is abstract');
		};

		/**
		 * Transforms the given selected shift-time (hour, minutes) into a time (in millis, server's TimeZone).
		 * Contains the logic of considering business-day.
		 * @param hour
		 * @param minute
		 * @return Date
		 */
		this.extractShiftTime = function(hour, minute){
			var time = timeZoneUtils.parseInServerTimeAsMoment(scope.startOfDay)
									.hour(hour)
									.minute(minute);

			if(time.isBefore(scope.startOfDay)){
				// time is in next (real-)day
				time.add('days', 1);
			}
			return time.toDate();
		};

		/**
		 * From input-data constructs the startEnd, endTime as submitted in request to
		 * edit/create shift.
		 * @param {startTime, endTime}
		 */
		this.findPeriodToSubmit = function(){
			return {
				startTime : scope.vueScope.$data.selectedStartTime && scope.vueScope.$data.selectedStartTime.getTime(),
				endTime : scope.vueScope.$data.selectedEndTime && moment(scope.vueScope.$data.selectedEndTime).add('second', -1).valueOf()
			};
		};

		/**
		 * Handles apply-event by first performing validations, than send to server create-request and
		 * afterwrads informing the table-controller to update model and show shift in view.
		 * @param selection
		 * @returns
		 */
		function handleSubmit(selection){
			// create a scheduleDetail instance to submit
			var scheduleDate = scope.scheduleDetail ? scope.scheduleDetail.scheduleDate
													: timeZoneUtils.parseInServerTimeAsMoment(scope.weekDay, scope.tableController.DAY_COORD_FORMAT).valueOf();
			var scheduleDetail = {
					scheduleDate : scheduleDate,
					weekDay : scope.weekDay,
					note: scope.vueScope.$data.note
				};
			_.extend(scheduleDetail, scope.findPeriodToSubmit());
			scope.addRoleAndEmplFromSelections(scheduleDetail, selection);

			// clean-up the view
			scope.editShiftView.removeValidatonMsgs();

			if (scope.isEditMode()) {
				// its an edit
				scope.validateEdit(scheduleDetail, scope.scheduleDetail, scope.tableController.CONTROLLER_URL)
				 	   .then(function(validationIssues) {
							 	 		return handleValidationResult(scheduleDetail, validationIssues);
							})
						 .then(function(answer){
							 	answer &&	handleAsEdit(scheduleDetail);
							})
						 .catch(console.log);
			} else {
				// its a create
				scope.validateCreate(scheduleDetail, scope.tableController.CONTROLLER_URL)
				 			.then(function(validationIssues) {
										 return handleValidationResult(scheduleDetail, validationIssues);
							 })
						  .then(function(answer){
										 answer && handleAsCreate(scheduleDetail);
							})
							.catch(console.log);
			}
		}

		/**
		 * Handles valdation-result for a edit/create. In case of validationIssues, decides to show issueOverwrite-popup in
		 * case they are overwritable, or validationErrors in case they are not.
		 * Otherwise lets operation go through and triggers edit/create.
		 * @param scheduleDetail : the instance to be created/edited
		 * @param validationIssues : issues returned from validation
		 * @returns promise: answer (boolean), true if validation is ok or issues are overwritten
		 */
		function handleValidationResult(scheduleDetail, validationIssues){
			return q.Promise(function(resolve){
				var notOverwritableIssues = scope.extractNotOverwritableIssues(validationIssues);
				if (scope.issuesCanBeOverwritten(validationIssues)) {
					// show dialog for overwriting
					var $dialog = scope.tableController.tableView.showOverwriteIssuePop({
						validationIssues : validationIssues,
						onOverwrite : function(event) {
							// handle overwrite-click
							$dialog.closeDialog();
							resolve(true);
						},
						onCancel : function() {
							// handle cancel click
							$dialog.closeDialog();
							scope.editShiftView.$apply.buttonDecor('stopLoading');
							scope.editShiftView.showValidationMsg(validationIssues[0].errorMsg);
							resolve(false);
						}
					});
				} else if(notOverwritableIssues && notOverwritableIssues.length > 0) {
					// show error-msg
					scope.editShiftView.$apply.buttonDecor('stopLoading');
					scope.editShiftView.showValidationMsg(notOverwritableIssues[0].errorMsg);
					resolve(false);
				} else{
					// validation is ok
					resolve(true);
				}
			});
		}


		/**
		 * Called after validation to trigger create.
		 * @param scheduleDetail : the instance to be created.
		 */
		function handleAsCreate(scheduleDetail) {
			scope.editShiftView.$apply.buttonDecor('startLoading');
			requestCreateShift(scheduleDetail, function(resp) {
				scope.editShiftView.closeDialog();
				scope.tableController.handleCreateShift(resp, _.pick(scheduleDetail, [ 'employeeName', 'startTime' ]));
			});
		}

		/**
		 * Called after validation to trigger edit.
		 * @param scheduleDetail : the instance containing the changes
		 */
		function handleAsEdit(scheduleDetail) {
			scope.editShiftView.$apply.buttonDecor('startLoading');
			requestEditShift({
				oldScheduleDetail : scope.scheduleDetail,
				newScheduleDetail : scheduleDetail
			}, function(resp) {
				scope.editShiftView.closeDialog();
				scope.tableController.handleEditShift({
					schedule : resp.schedule,
					overhourInfosForOldEmpl : resp.overhourInfosForOldEmpl,
					overhourInfosForNewEmpl : resp.overhourInfosForNewEmpl,
					$shift : scope.$selectedShift,
					newEmployeeName : scheduleDetail.employeeName,
					newStartTime : scheduleDetail.startTime,
					newScheduleDate : scheduleDetail.scheduleDate
				});
			});
		}


		/**
		 * Adds employeeName and role to given scheduleDetail, extracted from
		 * model and given selection.
		 * @param scheduleDetail
		 * @param selection
		 */
		this.addRoleAndEmplFromSelections = function(scheduleDetail, selection) {
			throw new Error('this is abstract');
		};


		/**
		 * @param args: {oldScheduleDetail, newScheduleDetail}, new and old scheduleDetail for the shift.
		 * @param callback : success-callback, called with {schedule}, containing the edited shift.
		 */
		function requestEditShift(args, callback) {
			jQuery.ajax({
				url : scope.tableController.CONTROLLER_URL + '/editShift',
				dataType : 'json',
				type : 'POST',
				data : {
					oldScheduleDetail : JSON.stringify(args.oldScheduleDetail),
					newScheduleDetail : JSON.stringify(args.newScheduleDetail)
				},
				success : function(resp) {
					callback(resp);
				}
			});
		}

		/**
		 * Async request to create given scheduleDetail.
		 * @param callback : is called with schedule which contains created scheduleDetail and
		 *                   flag if scheduleDetail is new.
		 *         {schedule, scheduleDetailIsNew}
		 */
		function requestCreateShift(scheduleDetail, callback) {
			jQuery.ajax({
				url : scope.tableController.CONTROLLER_URL + '/createShift',
				dataType : 'json',
				type : 'POST',
				data : {
					scheduleDetail : JSON.stringify(scheduleDetail)
				},
				success : function(resp) {
					callback(resp);
				}
			});
		}

		/**
		 * Show-up dialog to create shift and init with given params.
		 *
		 * @param args :
		 *            {$shifts, employeeName, weekDay}
		 * @returns promise : resolved against the dialog being rendered
		 *
		 */
		this.showForCreate = function(args) {
			scope.$selectedShift = undefined;
			// sets shiftsCell-coordinates onto model
			jQuery.extend(scope, scope.tableController.extractCoordFromShiftsCell(args.$shifts));

			return scope.fetchEditDialogInit().then(function(resp) {
				scope.updateModel(resp);
				extractOpenCloseTimes(scope.weekDay);
				initView();
				scope.vueScope.$data.unavailabilities
					= unavailabilityUtils.addAvailabilities(resp.unavailabilities, scope.tableController.findDayInfo(scope.weekDay));
				scope.vueScope.$data.timeSlots = resp.timeSlots;
				scope.vueScope.$data.selectedRole = findDefaultRole() || scope.vueScope.$data.roles[0];
				scope.editShiftView.showDialog();
				scope.editShiftView.applyInitData();
			});
		};

		/**
		 *
		 * @param args : {$shift, scheduleDetail}, the scheduleDetail of the selected shift and the selected shift.
		 * @returns promise : resolved against the dialog being rendered
		 */
		this.showForEdit = function(args, callback) {
			scope.scheduleDetail = args.scheduleDetail;
			scope.employeeName = scope.scheduleDetail.employeeName;
			scope.weekDay = scope.scheduleDetail.weekDay;
			scope.role = scope.scheduleDetail.role.name;
			scope.modifiable = scope.scheduleDetail.modifiable && scope.tableController.isScheduleModifiable;
			scope.$selectedShift = args.$shift;

			return scope.fetchEditDialogInit().then(function(resp) {
				scope.updateModel(resp);
				extractOpenCloseTimes(scope.weekDay);
				initView();
				scope.vueScope.$data.timeSlots = resp.timeSlots;
				scope.vueScope.$data.unavailabilities
					= unavailabilityUtils.addAvailabilities(resp.unavailabilities, scope.tableController.findDayInfo(scope.weekDay));
				scope.vueScope.$data.selectedStartTime = new Date(scope.scheduleDetail.startTime);
				scope.vueScope.$data.selectedEndTime = moment(scope.scheduleDetail.endTime).add('second', 1).toDate();

				scope.vueScope.$data.selectedRole = scope.scheduleDetail.role;
        ensureExistsSelectedRole(scope.scheduleDetail.role);

				scope.vueScope.$data.note = scope.scheduleDetail.note;
				scope.editShiftView.applyInitData();
				scope.editShiftView.applyPreselections(scope.scheduleDetail);
				scope.editShiftView.showValidationIssues(scope.scheduleDetail);
				scope.editShiftView.showWarnings();
				!scope.modifiable && scope.editShiftView.disableApply();
				scope.editShiftView.showDialog();
			});
		};

    function ensureExistsSelectedRole(role) {
      var foundRole = _.find(scope.vueScope.$data.roles, function(r) {
        return r.name === role.name;
      });

      if (!foundRole) {
        scope.vueScope.$data.roles.push(role);
      }
    }

		function findDefaultRole() {
			return _.find(scope.vueScope.$data.roles, function(role) {
				return role.isDefault;
			})
		}

		/**
		 * Returns if opened in edit-mode.
		 * @returns
		 */
		this.isEditMode = function(){
			return !!scope.$selectedShift;
		};

		/**
		 * Fetches open/close times for weekDay from dayInfos, and extract/sets the
		 * corresponding open/close hours/minutes into model.
		 * Note: close-time 00:0 is transformed to 24:0 to make it unique.
		 */
		function extractOpenCloseTimes(weekDay){
			var time = findSchedulePeriod('openTime', weekDay).split(':');
			var openTimeHour = parseInt(time[0], 10);
			var openTimeMinute = parseInt(time[1], 10);

			time = findSchedulePeriod('closeTime', weekDay).split(':');
			var closeTimeHour = parseInt(time[0], 10);
			var closeTimeMinute = parseInt(time[1], 10);

			scope.storeScheduleOpen = scope.extractShiftTime(openTimeHour, openTimeMinute);
			scope.storeScheduleClose = scope.extractShiftTime(closeTimeHour, closeTimeMinute);
		}


		/**
		 * Fetches from tableController's dayInfos the open or close time for the given week-day.
		 * @param timeProp : {string} either 'openTime' or 'closeTime', whatever is searched
		 * @param weekDay : {string} the week-day coord.
		 */
		function findSchedulePeriod(timeProp, weekDay) {
			return scope.tableController.findDayInfo(weekDay)[timeProp];
		}

		/**
		 * Fetches infos for employee (scheduleable roles, unavailabilities)
		 *
		 * @param args
		 *            {employeeName, weekDay}
		 */
		this.fetchEditDialogInit = function() {
			var dateInWeek = timeZoneUtils.parseInServerTimeAsMoment(scope.weekDay, scope.tableController.DAY_COORD_FORMAT).valueOf();
			return jQuery.ajax({
				url : scope.tableController.CONTROLLER_URL + '/findEditDialogInit',
				dataType : 'json',
				type : 'GET',
				data : {
					employeeName : scope.employeeName,
					dateInWeek : dateInWeek,
					role : scope.role,
					scheduleDetail : scope.scheduleDetail ? JSON.stringify(scope.scheduleDetail) : null
				}
			});
		};

		/**
		 * Updates the model based on the given server-response.
		 * @param resp
		 */
		this.updateModel = function(resp){
			scope.roles = resp.roles;
			scope.employees = resp.employees;
			scope.startOfDay = resp.startOfDay;
		};

	}
});
