define(function(){
	return TotalsModel;

	/**
	 * ABSTRACT Model for totals in scheduler-table. Covers both, byEmployee and byRoles -view.
	 * Model-coordinates are inline with
	 * those used in table {employeeName, weekDay, role}, from scheduleDetailHolder and
	 * presents a view on this model (where either role or employeeName depending in the impl.
	 * The model needs a re-init, when employees/roles or weekDays are changed.
	 * Whenever shifts are deleted, moved, edited or created call 'update' for the affected cells
	 * specified by there coordinates. This method knows to update higher level totals
	 * correspondingly.
	 * 
	 */
	function TotalsModel() {
		var scope = undefined;
		this.schedules = undefined;
		this.weekDays = undefined;
		this.rowValues = undefined; // either employee-names or role-names
		this.rowCoordProp = undefined; // either 'role' or 'employeeName'
		this.shiftPathToRowCoord = undefined; // either ['employeeName'] or ['role', 'name']
				
		// {weekDay : total}
		this.weeklyTotals = {};
		
		//{rowProp : {weekDay : {total, overhours}, total, overhours}}
		this.rowTotals = {};		
		
		this.init = function(){		
			scope = this;
			scope.update();
		};	
		
		/**
		 * Sums-up (empl, day)-totals on weekly-basis.
		 * @param weekDay_ : when given updates only for this, else for all
		 */
		this.updateWeekly = function(weekDay_){			
			var weekDays_ = scope.weekDays;
			if(weekDay_){
				weekDays_ = [weekDay_];
			}
			_.each(weekDays_, function(weekDay){
				scope.weeklyTotals[weekDay] = 0;
				_.each(scope.rowValues, function(rowValue){
					scope.weeklyTotals[weekDay] += scope.rowTotals[rowValue][weekDay].total;
				});
			});
		};		
		
		/**
		 * Sums-up totals for each row over the week.
		 * @param rowValue : (can be 'employeeName' or 'role') when given updates only for this, else for all
		 */ 
		this.updateRowTotals = function(rowValue){
			var rowValues_ = scope.rowValues;
			if(rowValue){
				rowValues_ = [rowValue];
			}
			
			_.each(rowValues_, function(rowValue){
				scope.rowTotals[rowValue].total = 0;
				scope.rowTotals[rowValue].overhours = 0;
				_.each(scope.weekDays, function(weekDay){
					scope.rowTotals[rowValue].total +=	scope.rowTotals[rowValue][weekDay].total;
					scope.rowTotals[rowValue].overhours +=	scope.rowTotals[rowValue][weekDay].overhours;
				});
			});
		};		
		
		/**
		 * Updates totals by re-calculating the hole-model. This is necessary due to the complexity
		 * of overtime-hours.
		 * Call whenever a shift is: edited, added, removed, moved.
		 */
		this.update = function(){
			// set-up weeklyTotals
			_.each(scope.weekDays, function(weekDay){
				scope.weeklyTotals[weekDay] = 0;
			});
			
			// set-up rowTotals
			_.each(scope.rowValues, function(rowValue){
				scope.rowTotals[rowValue] = {total : 0, overhours : 0};
				_.each(scope.weekDays, function(weekDay){
					scope.rowTotals[rowValue][weekDay] = {total : 0, overhours : 0};
				});				
			});
			
			// calc. (empl, day)-totals from schedules 
			_.each(scope.schedules, updateCellTotal);								
			scope.updateRowTotals();			
			scope.updateWeekly();			
		};	
		
		/** 
		 * Calculates (role/empl, day)-totals by adding schedule
		 * @param schedule
		 */
		 function updateCellTotal(schedule){
			_.each(schedule.scheduleDetailHolders, function(detail){	
				var rowCoord = _ext.valueFromPath(detail, scope.shiftPathToRowCoord);
				if(!_.contains(scope.rowValues, rowCoord)){
					// only considers shifts with known roles/employees
					return;
				}
				scope.rowTotals[rowCoord][detail.weekDay].total += detail.duration;
				scope.rowTotals[rowCoord][detail.weekDay].overhours += detail.overtimeHours;
			});
		}
		
		
	}

});