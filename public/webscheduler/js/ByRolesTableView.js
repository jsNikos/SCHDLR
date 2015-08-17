define(['SchedulerTableView'], function(SchedulerTableView){
	return function(args){
		ByRolesTableView.prototype = new SchedulerTableView({
			$schedulerEl : jQuery('.scheduler', '.scheduler-wrapper.by-roles')
		});
		return new ByRolesTableView(args);
	};		
	
	/**
	 * This specific view supports the byRole-view.
	 * @constructor	  
	 */
	function ByRolesTableView(args){
		var scope = this;
		this.tableController = args.controller;	
		this.flagOverhours = false;
		
		// templates
		var shiftTmpl = _.template(jQuery('#byRolesShiftTmpl').text());
		var navigationCellTmpl = _.template(jQuery('#navigationCellTmpl').text());
		var shiftColumnTmpl =  _.template(jQuery('#shiftColumnTmpl').text());		
		
		function init(){
			scope.init.call(scope);
		}	
		
		
		/**
		 * Checks if current tableView instance listens to window-events.
		 * This copes with the general problem, to view for one el.
		 */
		this.checkListenToWindowEvents = function(){
			if(scope.tableController.webSchedulerController.selectedView === 'byRoles'){
				return true;
			}
			return false;
		};
		
		
		/**
		 * Creates a role-cell for given role.
		 * @param role
		 */
		this.createNavigationCell = function(role) {			
			var $td = jQuery(navigationCellTmpl({
				displayName : role.name,
				name : role.name
			}));			
			scope.refreshRowTotal(role.name, $td);
			return $td;
		};
		
		/**
		 * Creates and returns a shift-cell. Adds drop-support.
		 * @param role 
		 * @param weekDay {String}, in format DAY_COORD_FORMAT
		 */
		this.createShiftCell = function(role, weekDay) {
			var $td = jQuery(shiftColumnTmpl({
				employeeName : '',
				weekDay : weekDay,
				role : role.name
			}));
			scope.refreshShiftTotal({
				role : role.name,
				weekDay : weekDay
			}, $td);
			var isModifiable = role.schedulable && scope.tableController.isScheduleModifiable;
			scope.addStyleAndDropSupp(weekDay, $td, isModifiable);
			return $td;
		};		
		
		
		/**
		 * Returns the shifts-cell determined by coord. 
		 * @param shiftsCellCoord
		 */
		this.findShiftsCell = function(shiftsCellCoord) {
			return jQuery('.shifts[data-weekday="' + shiftsCellCoord.weekDay + '"][data-role="'
					+ shiftsCellCoord.role + '"]', scope.$scheduler);
		};		
		
		
		this.getShiftTmpl = function(){
			return shiftTmpl;
		};		
		
		
		init();
	}
});