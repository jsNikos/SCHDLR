define(['libs/timeZoneUtils'], function(timeZoneUtils){
	return MoveInfoModel;
	
	/**
	 * Intends to hold infos describing a modification through MOVE
	 * @constructor
	 * @param args : {targetWeekDay, targetScheduleDate, targetEmployee, targetRole, sourceScheduleDet}
	 */
	function MoveInfoModel(args){
		var scope = this;
		
		this.targetWeekDay = undefined;
		this.targetScheduleDate = undefined;
		this.targetEmployee = undefined;
		this.targetRole = undefined;
		this.sourceScheduleDet = undefined;
		this.targetStartTime = undefined;
		this.targetEndTime = undefined;
		
		function init(){
			_.extend(scope, args);
			extractShiftTimes();
		}
		
		/**
		 * Sets {targetStartTime, targetEndTime} for the target-shift which is created by the given move of src-shift.		
		 */
		function extractShiftTimes() {
			var dayDiff = timeZoneUtils.parseInServerTimeAsMoment(scope.targetScheduleDate).diff(scope.sourceScheduleDet.scheduleDate, 'days');
			scope.targetStartTime = timeZoneUtils.parseInServerTimeAsMoment(scope.sourceScheduleDet.startTime).add('days', dayDiff).valueOf();
			scope.targetEndTime = timeZoneUtils.parseInServerTimeAsMoment(scope.sourceScheduleDet.endTime).add('days', dayDiff).valueOf();		
		};
		
		init();
	}
});