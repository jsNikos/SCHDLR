define(['TotalsModel'], function(TotalsModel){
	return function(args){
		ByRolesTotalsModel.prototype = new TotalsModel();
		return new ByRolesTotalsModel(args);
	};
	
	/**
	 * Totals-model for byRole-view.
	 * @param args {[schedules], [weekDays], [roles]}
	 */
	function ByRolesTotalsModel(args){
		var scope = this;
		this.rowValues = args.roles;
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