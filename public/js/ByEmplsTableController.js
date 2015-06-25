define(['SchedulerTableCtrl', 'ByEmplsTotalsModel', 'ByEmplsTableView', 'ByEmplsEditShiftController'],
  function(SchedulerTableCtrl, ByEmplsTotalsModel, ByEmplsTableView, ByEmplsEditShiftController){
	ByEmplsTableController.prototype = new SchedulerTableCtrl();
	return ByEmplsTableController;		
	
	/**
	 * This specific controller supports the byEmployee-view.
	 * @param args : {webSchedulerController, onInitReady}, 'onInitReady' is callback of form function(ByRolesTableController) which is 
	 *               call when initialization-phase of controller is ready. View might still be about to render at this time.	 
	 * @constructor	  
	 */
	function ByEmplsTableController(args){
		var scope = this;
		this.webSchedulerController = args.webSchedulerController;
		var onInitReady = args.onInitReady;
		this.CONTROLLER_URL = scope.webSchedulerController.CONTROLLER_URL + '/byEmpl'; 
		
		//model
		// overhour definitions
		this.dailyOvertimeHours = undefined;
		this.weeklyOvertimeHours = undefined;
		
		function init(){
			scope.init.call(scope, onInitReady);
		}
		
		/**
		 * Initializes totals model.
		 */
		this.initTotalsModal = function(){
			scope.totalsModel = new ByEmplsTotalsModel({
				schedules : scope.schedules,
				weekDays : scope.weekDays,
				employees : scope.employees,
				rowCoordProp : scope.rowCoordProp,
				shiftPathToRowCoord : scope.shiftPathToRowCoord 
			});
		};
		
		/**
		 * Returns elements making-up the rows (these are employees).
		 * Shows employees whenever they are available or not, but non-available only
		 * in case there exists at least one shift.
		 */
		this.findRowElements = function(){
			return _.filter(scope.employees, function(employee){
				return employee.available || scope.hasEmployeeShift(employee.name);
			});
		};
		
		/**
		 * Initializes view for byEmployee-table and the corresponding shift-editor.
		 */
		this.initView = function() {			
			scope.tableView = new ByEmplsTableView({
				controller : scope				
			});			
		};
		
		/**
		 * Extracts the coordinated from the given shifts-cell in form of name/value object.
		 */
		this.extractCoordFromShiftsCell = function($shifts) {
			return {
				weekDay : $shifts.attr('data-weekday'),
				employeeName : $shifts.attr('data-employee')
			};
		};
		
		/**
		 * Creates instance of editShift (this dialog is on-the-fly and thus always needs
		 * new instance before shown)
		 * @returns {EditShiftController} : specific instance, either byEmpls or byRoles.
		 */
		this.createEditShiftController = function(){
			return new ByEmplsEditShiftController({
				controller : scope
			});			
		};
		
		/**
		 * Checks the given target coordinates of shifts-cell are different from those
		 * in given scheduleDetail.
		 * @returns boolean
		 */
		this.checkDropTargetIsDifferent = function(targetShiftsCellCoord, scheduleDetail) {
			var result = true;
			if (scheduleDetail.weekDay === targetShiftsCellCoord.weekDay
					&& scheduleDetail.employeeName === targetShiftsCellCoord.employeeName) {
				result = false;
			}
			return result;
		};
		
		/**
		 * Replaces all shifts (determined by shiftsCellCoord) with those 
		 * given in 'newSchedule' (and also corresponding to these coordinates).
		 * @param shiftsCellCoord : {weekDay, employeeName}		
		 * @param newSchedule
		 * @return [scheduleDetails] ; returns list of added shifts
		 */
		this.replaceShiftsInModel = function(shiftsCellCoord, newSchedule) {			
			var weekDay = shiftsCellCoord.weekDay;
			var employeeName = shiftsCellCoord.employeeName;
			
			// update model
			var schedule = scope.findScheduleByWeekDay(weekDay);
			if (!schedule) {
				// the case the schedule is new				
				scope.restrictShifts(newSchedule, scope.employees);
				scope.schedules.push(newSchedule);
				return newSchedule.scheduleDetailHolders;
			} else {
				// remove shifts of employee for this day
				_ext.removeWhere(schedule.scheduleDetailHolders, {
					employeeName : employeeName
				});
				// add corresponding from response
				var respShiftsToAdd = _.where(newSchedule.scheduleDetailHolders, {
					employeeName : employeeName
				});
				_ext.append(schedule.scheduleDetailHolders, respShiftsToAdd);
				return respShiftsToAdd;
			}
		};
		
		init();
		
	}	
	
});