define(['TotalsModel'], function(TotalsModel){	
	return function(args){
		ByEmplsTotalsModel.prototype = new TotalsModel();
		return new ByEmplsTotalsModel(args);
	};
	
	/**
	 * Totals-model for byEmployee-view.
	 * @param args {[schedules], [weekDays], [employees]}
	 */
	function ByEmplsTotalsModel(args){
		var scope = this;
		this.rowValues = _.pluck(args.employees, 'name');
		this.schedules = args.schedules;	
		this.weekDays = args.weekDays;
		this.rowCoordProp = args.rowCoordProp; 
		this.shiftPathToRowCoord = args.shiftPathToRowCoord; 
		
		function init(){
			scope.init.call(scope);
		}		
		
		init();
		
	}
	
});