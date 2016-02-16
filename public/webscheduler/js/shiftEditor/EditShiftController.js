define(['ValidateShiftModifUtils', 'timeZoneUtils', 'q', 'vue', 'TimelineComponent', 'TimepickerComponent'],
function(ValidateShiftModifUtils, timeZoneUtils, q, Vue, TimelineComponent, TimepickerComponent){
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
		this.unavailabilities = undefined;
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
						scheduleGranularity: scope.tableController.scheduleGranularity
					},
				computed:{
					fromPickerMaxHour: fromPickerMaxHour,
					fromPickerMaxMinute: fromPickerMaxMinute,
					toPickerMinHour: toPickerMinHour,
					toPickerMinMinute: toPickerMinMinute
				},
				components: {
					'timeline': new TimelineComponent(),
					'frompicker': new TimepickerComponent(),
					'topicker': new TimepickerComponent()
				},
				methods: scope,
				watch: {
					selectedStartTime: scope.handleSelectedTimeChange,
					selectedEndTime: scope.handleSelectedTimeChange
				},
				events:{
					selectedTimeChange: scope.handleSelectedTimeChange
				}
			});
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

		this.handleSelectedTimeChange = function(){
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

		this.handleDragEnd =function(){
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
		 * From given list of unvails, creates list of availabilities by computing
		 * the complement of schedule-store hours.
		 * @param unavails : [UnavailibilityHolder]
		 */
		this.findAvailabilities = function(unavails){
			var dayInfo = scope.tableController.findDayInfo(scope.weekDay);
			var avails = [];
			var currStart;
			// check start to be contained in unvail
			var nextConnEnd = findLargestConnEndDate(dayInfo.startDate);
			if(nextConnEnd > dayInfo.startDate){
				// start is contained in unavail, set currStart to highest possible end
				currStart = nextConnEnd + 1000;
			} else{
				currStart = dayInfo.startDate;
			}
			createAvailIntervals(currStart);

			// creates availability interval starting at start
			// start is assumed not to be contained in any unvail
			// recursively creates following intervals
			function createAvailIntervals(start){
				if(!start || start >= dayInfo.endDate){
					return;
				}
				var unavailStarts = _.chain(unavails).filter(function(unavail){
					return unavail.startDate > start && unavail.startDate < dayInfo.endDate;
				}).pluck('startDate').value();
				if(unavailStarts.length > 0){
					var nextUnavailStart = _.min(unavailStarts);
					avails.push(createAvailability(start, nextUnavailStart-1000));
					largestConnEnd = findLargestConnEndDate(nextUnavailStart);	// next start
					createAvailIntervals(largestConnEnd+1000);
				} else{
					// no further unvails
					avails.push(createAvailability(start, dayInfo.endDate));
					return;
				}
			}

			// extracts the maximal end-date of intervals which chain together up-from given date
			// this is the maximal unvailability spanned by intervals starting with those enclosing given date
			function findLargestConnEndDate(date){
				var enclosing = findEnclosing(date);
				if(date >= dayInfo.endDate){
					return dayInfo.endDate;
				} else if(enclosing && enclosing.length > 0){
					var maxEnclosingEnd = _.chain(enclosing).pluck('endDate').max().value();
					return findLargestConnEndDate(maxEnclosingEnd + 1000);
				} else{
					return date;
				}
			}

			// find all unvails which enclose given date
			function findEnclosing(date){
				return _.chain(unavails).filter(function(unavail){
					return unavail.startDate <= date && unavail.endDate > date;
				}).value();
			}

			return avails;
		};

		/**
		 * Creates a availability instance.
		 * @param startDate
		 * @param endDate
		 * @returns
		 */
		function createAvailability(startDate, endDate) {
			return {
				startDate : startDate,
				endDate : endDate,
				availabilityType : 'available',
				unavailType : 'available'
			};
		}

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
					weekDay : scope.weekDay
				};
			_.extend(scheduleDetail, scope.findPeriodToSubmit());
			scope.addRoleAndEmplFromSelections(scheduleDetail, selection);

			// clean-up the view
			scope.editShiftView.removeValidatonMsgs();

			if (scope.isEditMode()) {
				// its an edit
				scope.validateEdit(scheduleDetail, scope.scheduleDetail, scope.tableController.CONTROLLER_URL, function(validationIssues) {
					handleValidationResult(scheduleDetail, validationIssues, function(){
						handleAsEdit(scheduleDetail);
					});
				});
			} else {
				// its a create
				scope.validateCreate(scheduleDetail, scope.tableController.CONTROLLER_URL, function(validationIssues) {
					handleValidationResult(scheduleDetail, validationIssues, function(){
						handleAsCreate(scheduleDetail);
					});
				});
			}

		}

		/**
		 * Handles valdation-result for a edit/create. In case of validationIssues, decides to show issueOverwrite-popup in
		 * case they are overwritable, or validationErrors in case they are not.
		 * Otherwise lets operation go through and triggers edit/create.
		 * @param scheduleDetail : the instance to be created/edited
		 * @param validationIssues : issues returned from validation
		 * @param validationOkMethod : the method invoked if validation is ok or issues are overwritten
		 */
		function handleValidationResult(scheduleDetail, validationIssues, validationOkMethod){
			var notOverwritableIssues = scope.extractNotOverwritableIssues(validationIssues);
			if (scope.issuesCanBeOverwritten(validationIssues)) {
				// show dialog for overwriting
				var $dialog = scope.tableController.tableView.showOverwriteIssuePop({
					validationIssues : validationIssues,
					onOverwrite : function(event) {
						// handle overwrite-click
						$dialog.closeDialog();
						validationOkMethod();
					},
					onCancel : function() {
						// handle cancel click
						$dialog.closeDialog();
						scope.editShiftView.$apply.buttonDecor('stopLoading');
						scope.editShiftView.showValidationMsg(validationIssues[0].errorMsg);
					}
				});
			} else if(notOverwritableIssues && notOverwritableIssues.length > 0) {
				// show error-msg
				scope.editShiftView.$apply.buttonDecor('stopLoading');
				scope.editShiftView.showValidationMsg(notOverwritableIssues[0].errorMsg);
			} else{
				// validation is ok
				validationOkMethod();
			}
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
				scope.vueScope.$data.timeSlots = resp.timeSlots;
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
				scope.vueScope.$data.timeSlots = removeSelectedShiftUnavails(resp.timeSlots);
				scope.vueScope.$data.selectedStartTime = new Date(scope.scheduleDetail.startTime);
				scope.vueScope.$data.selectedEndTime = moment(scope.scheduleDetail.endTime).add('second', 1).toDate();
				scope.editShiftView.applyInitData();
				scope.editShiftView.applyPreselections(scope.scheduleDetail);
				scope.editShiftView.showValidationIssues(scope.scheduleDetail);
				scope.editShiftView.showWarnings();
				!scope.modifiable && scope.editShiftView.disableApply();
				scope.editShiftView.showDialog();
			});
		};

		function removeSelectedShiftUnavails(timeSlots){
			_.chain(timeSlots)
			 .filter(function(timeSlot){
					return timeSlot.unavails && timeSlot.unavails.length > 0;
			 })
			 .each(function(timeSlot){
				 timeSlot.unavails =
				 	_.reject(timeSlot.unavails, function(unavail){
							return unavail.unavailType === 'EmployeeScheduleDetail' &&
										 unavail.startDate === scope.scheduleDetail.startTime &&
										 unavail.employeeName === scope.scheduleDetail.employeeName;
			 			});
			 });
			 return timeSlots;
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
			scope.unavailabilities = resp.unavailabilities;
			scope.employees = resp.employees;
			scope.startOfDay = resp.startOfDay;
		};

	}
});
