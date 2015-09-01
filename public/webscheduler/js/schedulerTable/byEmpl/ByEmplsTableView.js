define(['SchedulerTableView'], function(SchedulerTableView){
	return function(args) {
		ByEmplsTableView.prototype = new SchedulerTableView({
			$schedulerEl : jQuery('.scheduler', '.scheduler-wrapper.by-empls')
		});
		return new ByEmplsTableView(args);
	};	
	
	/**
	 * This specific view supports the byEmployee-view.
	 * @constructor	  
	 */
	function ByEmplsTableView(args){
		var scope = this;
		this.tableController = args.controller;		
		
		// templates
		var shiftTmpl = _.template(jQuery('#shiftTmpl').text());
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
			if(scope.tableController.webSchedulerController.selectedView === 'byEmployees'){
				return true;
			}
			return false;
		};
		
		
		/**
		 * Creates a employee-cell for given employee.
		 * @param employee
		 */
		this.createNavigationCell = function(employee) {			
			var $td = jQuery(navigationCellTmpl({
				displayName : employee.displayName,
				name : employee.name
			}));			
			scope.refreshRowTotal(employee.name, $td);
			return $td;
		};
		
		/**
		 * Creates and returns a shift-cell. Adds drop-support.
		 * @param employee 
		 * @param weekDay {String}, in format DAY_COORD_FORMAT
		 */
		this.createShiftCell = function(employee, weekDay) {
			var $td = jQuery(shiftColumnTmpl({
				employeeName : employee.name,
				weekDay : weekDay,
				role : ''
			}));
			scope.refreshShiftTotal({
				employeeName : employee.name,
				weekDay : weekDay
			}, $td);
			var isModifiable = employee.available && scope.tableController.isScheduleModifiable;
			scope.addStyleAndDropSupp(weekDay, $td, isModifiable);
			return $td;
		};	
		
		
		/**
		 * Returns the shifts-cell determined by coord. 
		 * @param shiftsCellCoord
		 */
		this.findShiftsCell = function(shiftsCellCoord) {
			return jQuery('.shifts[data-weekday="' + shiftsCellCoord.weekDay + '"][data-employee="'
					+ shiftsCellCoord.employeeName + '"]', scope.$scheduler);
		};
		
		
		
		this.getShiftTmpl = function(){
			return shiftTmpl;
		};	
		
		
		init();
	}
});