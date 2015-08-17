define(function(){
	return SchedulesModelUtils;
	
	/**
	 * Utilities which aim to support operations on schedules-model. To use only as prototype
	 * for classes which own 'schedules' as property.
	 * 
	 */
	function SchedulesModelUtils(){	
		
		/**
		 * @return null or the first schedule found which has shifts.
		 */
		this.existsShift = function(){
			return _.chain(this.schedules).find(function(schedule){
				return schedule.scheduleDetailHolders && schedule.scheduleDetailHolders.length > 0; 
			}).value();			
		};
		
		/**
		 * Removes shifts from given schedules which do not have employeeNames from given lists.		  
		 * @param schedules
		 * @param employess		 
		 */
		this.restrictShifts = function(schedules, employees) {
			if (!(schedules instanceof Array)) {
				schedules = [ schedules ];
			}
			
			var employeeNames = _.pluck(employees, 'name');
			_.each(schedules, function(schedule) {
				var toRemove = [];
				_.each(schedule.scheduleDetailHolders, function(scheduleDetail) {
					if (!_.contains(employeeNames, scheduleDetail.employeeName)) {
						toRemove.push(scheduleDetail);
					}
				});
				_ext.removeAll(schedule.scheduleDetailHolders, toRemove);
			});
		};
		
		/**
		 * Searches through schedules-model for the shift given by keys.
		 * @param keys : {scheduleDate, startTime, employeeName}		 
		 * 
		 */
		this.findScheduleDetail = function(keys){
			var schedule = _.findWhere(this.schedules, _.pick(keys, ['scheduleDate']));
			return schedule && _.findWhere(schedule.scheduleDetailHolders, keys);
		};
		
		/**
		 * Extracts 'overtimeHours' from given overhourInfos's shifts and applies on
		 * schedules-model.
		 * @param overhourInfos : [ScheduleDetailHolder]
		 */
		this.updateOvertimeHours = function(overhourInfos) {
			var scope = this;
			_.each(overhourInfos, function(srcDetail) {
				var uptDetail = scope.findScheduleDetail(_.pick(srcDetail, [ 'scheduleDate', 'startTime', 'employeeName' ]));
				uptDetail && _.extend(uptDetail, _.pick(srcDetail, [ 'overtimeHours' ]));
			});
		};	
		
		/**
		 * Finds all scheduleDetails in schedules-model for given employee.
		 * @param employeeName
		 * @returns [scheduleDetail]
		 */
		this.findShiftsForEmpl = function(employeeName){
			var result = [];
			_.each(this.schedules, function(schedule){
			   var shifts =	_.where(schedule.scheduleDetailHolders, {employeeName : employeeName});
			   if(shifts){
				   result = _.union(result, shifts);
			   }
			});
			return result;
		};
		
		/**
		 * Extracts shifts-cell coords from the given list of scheduleDetails.
		 * @param scheduleDetails : [ScheduleDetails]
		 * @return [{employeeName, weekDay, role}] 
		 */
		this.extractShiftsCellsCoords = function(scheduleDetails){
			scheduleDetails = scheduleDetails || [];
			if(!_.isArray(scheduleDetails)){
				scheduleDetails = [scheduleDetails];
			}
			return _.chain(scheduleDetails)
					.map(this.findShiftsCellCoord)  /* extract coordinates */
					.uniq(JSON.stringify) /* remove duplicates, json-string is used for comparison */
					.value();
		};
		
		/**
		 * Removes given scheduleDetail from model.
		 * @param scheduleDetail
		 */
		this.removeShiftFromModel = function(scheduleDetail){
			var schedule = this.findContainingSchedule(scheduleDetail);
			var idx = _.indexOf(schedule.scheduleDetailHolders, scheduleDetail);
			schedule.scheduleDetailHolders.splice(idx, 1);
		};
		
		
		/**
		 * Model-operation. Returns schedule which containes given scheduleDetail. 
		 * @param scheduleDetail
		 */
		this.findContainingSchedule = function(scheduleDetail) {
			return _.findWhere(this.schedules, {
				scheduleDate : scheduleDetail.scheduleDate
			});
		};
		
		/**
		 * Finds the schedule for the given weekDay, or null of not exist.
		 * @param weekDay {String}
		 * @returns
		 */
		this.findScheduleByWeekDay = function(weekDay) {
			return _.findWhere(this.schedules, {
				weekDay : weekDay
			});
		};
		
		/**
		 * Find all scheduleDetails in schedules-model which are in shifts-cell given
		 * by coordinates.
		 * @param shiftsCellCoord : {weekDay, employeeName}, resp. {weekDay, role}
		 * @returns [scheduleDetail]
		 */
		this.findScheduleDetailsInCell = function(shiftsCellCoord){
			var scope = this;
			var schedule = this.findScheduleByWeekDay(shiftsCellCoord.weekDay);
			if(!schedule){
				return [];
			}			
			return _.chain(schedule.scheduleDetailHolders).filter(function(scheduleDet){
				return shiftsCellCoord[scope.rowCoordProp] === _ext.valueFromPath(scheduleDet, scope.shiftPathToRowCoord);
			}).value();			
		};
		
		/**
		 * From a given scheduleDetail, returns the coordinates describing the containing shifts-cell.
		 * Coordinates returned work for both, byRoles and byEmployees -view.
		 * @returns {employeeName, weekDay, role}
		 */
		this.findShiftsCellCoord = function(scheduleDetail){
			var result = _.pick(scheduleDetail, ['employeeName', 'weekDay']);						
			result.role = scheduleDetail.role.name;			
			return result;
		};
		
		/**
		 * Returns if the given roleName is used in some shift.
		 */
		this.isRoleUsed = function(roleName) {
			return _.find(this.schedules, function(schedule) {
				return _.find(schedule.scheduleDetailHolders, function(scheduleDet) {
					return roleName === scheduleDet.role.name;
				});
			});
		};
		
		/**
		 * Returns if given employeeName is has a shift in schedules.
		 */
		this.hasEmployeeShift = function(employeeName){
			return _.find(this.schedules, function(schedule) {
				return _.find(schedule.scheduleDetailHolders, function(scheduleDet) {
					return employeeName === scheduleDet.employeeName;
				});
			});
		};
		
	}
	
	
});