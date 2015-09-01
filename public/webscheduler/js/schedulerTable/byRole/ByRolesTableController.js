define(['SchedulerTableCtrl', 'ByRolesTotalsModel', 'ByRolesTableView', 'q'],
 function(SchedulerTableCtrl, ByRolesTotalsModel, ByRolesTableView, q){
	ByRolesTableController.prototype = new SchedulerTableCtrl();
	return ByRolesTableController;		
	
	/**
	 * This specific controller supports the byRoles-view.
	 * shiftsCellCoord for this controller have form {weekDay, role}
	 * @param args : {webSchedulerController, onInitReady}, 'onInitReady' is callback of form function(ByRolesTableController) which is 
	 *               call when initialization-phase of controller is ready. View might still be about to render at this time.
	 * @constructor	  
	 */
	function ByRolesTableController(args){
		var scope = this;
		this.webSchedulerController = args.webSchedulerController;
		var onInitReady = args.onInitReady;
		this.CONTROLLER_URL = scope.webSchedulerController.CONTROLLER_URL + '/byRole';
		this.rowCoordProp = 'role';
		this.shiftPathToRowCoord = ['role', 'name'];
		
		//model	
		
		function init(){
			scope.init.call(scope, onInitReady);
		}
		
		/**
		 * Initializes totals model.
		 */
		this.initTotalsModal = function(){
			scope.totalsModel = new ByRolesTotalsModel({
				schedules : scope.schedules,
				weekDays : scope.weekDays,
				roles : _.pluck(scope.roles, 'name'),
				rowCoordProp : scope.rowCoordProp,
				shiftPathToRowCoord : scope.shiftPathToRowCoord 
			});
		};
		
		/**
		 * Creates instance of editShift (this dialog is on-the-fly and thus always needs
		 * new instance before shown)
		 * @returns {EditShiftController} : specific instance, either byEmpls or byRoles.
		 */
		this.createEditShiftController = function(){
			return q.Promise(function(resolve){
				require(['ByRolesEditShiftController'], function(ByRolesEditShiftController){
					resolve(new ByRolesEditShiftController({controller : scope}));
				});
			});					
		};
		
		/**
		 * Returns elements making-up the rows (these are roles).
		 * Only returns all roles which are flagged as 'schedulable' and those
		 * which are 'not schedulable' but at least one shift uses the role. (This is for displaying
		 * problems) 
		 */
		this.findRowElements = function(){
			return this.findRolesToShow();		
		};
		
		/**
		 * Initializes view for byRole-table and the corresponding shift-editor.
		 */
		this.initView = function() {			
			scope.tableView = new ByRolesTableView({
				controller : scope				
			});			
		};
		
		/**
		 * Extracts the coordinated from the given shifts-cell in form of name/value object.
		 */
		this.extractCoordFromShiftsCell = function($shifts) {
			return {
				weekDay : $shifts.attr('data-weekday'),
				role : $shifts.attr('data-role')
			};
		};
		
		/**
		 * Checks the given target coordinates of shifts-cell are different from those
		 * in given scheduleDetail.
		 * @returns boolean
		 */
		this.checkDropTargetIsDifferent = function(targetShiftsCellCoord, scheduleDetail) {
			var result = true;
			if (scheduleDetail.weekDay === targetShiftsCellCoord.weekDay
					&& scheduleDetail.role.name === targetShiftsCellCoord.role) {
				result = false;
			}
			return result;
		};
		
		/**
		 * Replaces all shifts (determined by shiftsCellCoord) with those 
		 * given in 'newSchedule' (and also corresponding to these coordinates).
		 * @param shiftsCellCoord : {weekDay, role}		
		 * @param newSchedule
		 * @return [scheduleDetails] ; returns list of added shifts
		 */
		this.replaceShiftsInModel = function(shiftsCellCoord, newSchedule) {
			var weekDay = shiftsCellCoord.weekDay;
			var role = shiftsCellCoord.role;

			// update model
			var schedule = scope.findScheduleByWeekDay(weekDay);
			if (!schedule) {
				// the case the schedule is new
				scope.restrictShifts(newSchedule, scope.employees);			
				scope.schedules.push(newSchedule);
				return newSchedule.scheduleDetailHolders;
			} else {
				// remove shifts of this role for this day
				var toReplace = _.filter(schedule.scheduleDetailHolders, function(scheduleDet) {
					return scheduleDet.role.name === role;
				});
				_.each(toReplace, function(scheduleDet) {
					schedule.scheduleDetailHolders.splice(_.indexOf(schedule.scheduleDetailHolders, scheduleDet), 1);
				});

				// add corresponding from response
				var respShiftsToAdd = _.filter(newSchedule.scheduleDetailHolders, function(scheduleDet) {
					return scheduleDet.role.name === role;
				});
				_ext.append(schedule.scheduleDetailHolders, respShiftsToAdd);
				return respShiftsToAdd;
			}
		};
		
		init();
		
	}	
	
});