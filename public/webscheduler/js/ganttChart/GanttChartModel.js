define(function(){
	return GanttChartModel;
	
	/**
	 * Model which supports gantt-view presentation of a day.
	 * @param args : {scheduleDetails : [ScheduleDetailHolder],
	 * 				  shiftForecasts : [ShiftForecastHolder]
	 * 				  timeSlots : [TimeSlotHolder]}
	 */
	function GanttChartModel(args){
		var scope = this;
		
		this.rows = []; // [GanttController.RowModel]
		this.columns = args.timeSlots; // [GanttController.ColumnModel]
		this.lines = []; // [GanttController.LineModel]		
		this.labelGranularity = args.labelGranularity; // granularity of col-labels
		
		/**
		 * Triggers transforming-steps to construct the model from
		 * scheduleDetails, timeSlots. Rows are created based on scheduled
		 * role-instances.
		 */
		function init(){
			// create lines for shifts
			_.chain(args.scheduleDetails).each(function(scheduleDetail) {
				scope.lines.push(createLine({
					shift : scheduleDetail,
					extractId : function(scheduleDetail) {
						return scheduleDetail.employeeName + '$' + scheduleDetail.startTime;
					}
				}));
			});
			

			// create lines for forecast-shifts
			_.chain(args.shiftForecasts).each(
					function(shiftForecast) {
						scope.lines.push(createLine({
							shift : shiftForecast,
							extractId : function(shiftForecast) {
								return [ shiftForecast.role.name, shiftForecast.roleInstance, shiftForecast.startTime ]
										.join('$');
							}
						}));
					});
			
			computeLineCellStatus();
			correctRowsLabel();
		}	
		
		/**
		 * Computes the cell-status of lines by determining which shift-cells are resolving a
		 * forecast-shift cell.
		 * In case, line's 'resolved' property is set to true for the corresponding column-idx. 
		 * 
		 */
		function computeLineCellStatus(){
			// all lines corresp. to shifts
			var shiftLines = _.chain(scope.lines).filter(function(line) { return !line.forecast; }).value();
			
			// iterate lines corresp. to forecast-shifts
			_.chain(scope.lines).filter(function(line) { return line.forecast; })
						  .each(function(forecast){
							 _.chain(forecast.columns).each(function(fcol){
								if(!forecast.resolved[fcol.id]){
									tryResolveForecast(forecast, fcol.id);
								} 
							 }); 
						  });
			
			// tries to find shift which resolves given forecast-slot and sets 'resolved'-prop
			function tryResolveForecast(forecast, colId){
				_.chain(shiftLines).filter(function(shift){ return forecast.role.name === shift.role.name; }) /* restrict on same role*/
								   .each(function(line){
									   var shiftHasSlot = _.chain(line.columns).findWhere({id: colId}).value();
									   if(shiftHasSlot && !line.resolved[colId]){										   
										   // shift has slot at column and is not a resolver already
										   line.resolved[colId] = forecast;									   
										   forecast.resolved[colId] = line;
									   }								   					
				});
			}		
			
		}
		
		/**
		 * LineModel factory
		 * @args {shift : of type ScheduleDetailHolder or ShiftForecastHolder,
		 *        extractId : function(shift), which extracts id from given instance		
		 *       }
		 */
		function createLine(args) {
			var shift = args.shift;
			var columns = findTimeSlots(shift);
			return _.chain({
				id : args.extractId(shift),
				columns : columns,
				row : findOrCreateRole(shift),
				resolved : {}, /* column-ids which are resolved/resolving (forecast) are set to resolving/resolved line  */
			}).extend(shift).value();
		}
		
		/**
		 * Extracts time-slots for given shift from timeSlot-list.
		 * @param shift : of type ScheduleDetailHolder or ShiftForecastHolder
		 */
		function findTimeSlots(shift){
			return _.chain(scope.columns).filter(function(timeSlot){				
				return timeSlot.startTime >= shift.startTime && timeSlot.startTime < shift.endTime;
			}).value();
		}
		
		/**
		 * Extracts role for given shift from role-list based on name and roleInstance.
		 * If not exists add the role to 'rows'
		 * @param shift : of type ScheduleDetailHolder or ShiftForecastHolder
		 */
		function findOrCreateRole(shift){
			var role = _.chain(scope.rows).find(function(role){
				return (role.name === shift.role.name && role.instance === shift.roleInstance);
			}).value();
			if(!role){
				// must create and add
				role = createRoleInstance(shift);
				addRow(role);
			}			
			return role;
		}
		
		/**
		 * Adds a role-instance to the rows.
		 * @param roleInstance : RowModel
		 */
		function addRow(roleInstance){
			scope.rows.push(roleInstance);
			scope.rows.sort(function(row1, row2){
				  if(row1.name === row2.name){
					  return row1.roleInstance - row2.roleInstance;
				  } else if(row1.name > row2.name){
					  return 1;
				  } else if (row1.name < row2.name){
					  return -1;
				  } else{
					  return 0;
				  }						 
			});			
		}
		
		/**
		 * Correct role-labels (instance from db not always desired as counter)
		 * Assumes the rows are sorted as intended to be displayed.
		 */ 
		function correctRowsLabel(){
			var groups = _.chain(scope.rows).groupBy('name').value();
			for(var key in groups){
				_.chain(groups[key]).each(function(row, idx){
					row.label = row.name + ' ' + (idx + 1);
				});
			}
		}		
		
		/**
		 * Creates a row (role-instance) based on the given shift's role-instance.
		 * @param shift : of type ScheduleDetailHolder or ShiftForecastHolder
		 */
		function createRoleInstance(shift){
			var instance = _.clone(shift.role);			
			_.chain(instance).extend({id: instance.name + '$' + shift.roleInstance,
								   label: instance.name + ' ' + shift.roleInstance,
							    instance: shift.roleInstance});
			return instance;
		}
		
		init();
	}
	
});