define(function(){
  return new ShiftEditorService();

  function ShiftEditorService(){
    /**
		 * @param args: {oldScheduleDetail, newScheduleDetail, CONTROLLER_URL}, new and old scheduleDetail for the shift.
		 * @param callback : success-callback, called with {schedule}, containing the edited shift.
		 */
		this.requestEditShift = function(args, CONTROLLER_URL) {
			return jQuery.ajax({
				url : CONTROLLER_URL + '/editShift',
				dataType : 'json',
				type : 'POST',
				data : {
					oldScheduleDetail : JSON.stringify(args.oldScheduleDetail),
					newScheduleDetail : JSON.stringify(args.newScheduleDetail)
				}
			});
		};

    /**
		 * Async request to create given scheduleDetail.
		 * @param callback : is called with schedule which contains created scheduleDetail and
		 *                   flag if scheduleDetail is new.
		 *         {schedule, scheduleDetailIsNew}
		 */
		this.requestCreateShift = function(scheduleDetail, CONTROLLER_URL) {
			return jQuery.ajax({
				url : CONTROLLER_URL + '/createShift',
				dataType : 'json',
				type : 'POST',
				data : {
					scheduleDetail : JSON.stringify(scheduleDetail)
				}
			});
		};

    /**
		 * Fetches infos for employee (scheduleable roles, unavailabilities)
		 *
		 * @param args
		 *            {employeeName, weekDay}
		 */
		this.fetchEditDialogInit = function(data, CONTROLLER_URL) {
			return jQuery.ajax({
				url : CONTROLLER_URL + '/findEditDialogInit',
				dataType : 'json',
				type : 'GET',
				data : {
					employeeName : data.employeeName,
					dateInWeek : data.dateInWeek,
					role : data.role,
					scheduleDetail : data.scheduleDetail ? JSON.stringify(data.scheduleDetail) : null
				}
			});
		};

  }
});
