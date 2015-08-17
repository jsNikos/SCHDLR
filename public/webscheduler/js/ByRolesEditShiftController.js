define(['EditShiftController',
        'ByRolesEditShiftView',
        'text!../byRolesEditDialog.html',
        'timeZoneUtils'],
function(EditShiftController, ByRolesEditShiftView, byRolesEditDialogHtml, timeZoneUtils){
	return function(args){
		ByRolesEditShiftController.prototype = new EditShiftController();
		return new ByRolesEditShiftController(args);
	};

	/**
	 * Extention of EditShiftController supporting byRole -view.
	 * @constructor
	 */
	function ByRolesEditShiftController(args){
		var scope = this;
		this.tableController = args.controller;
		
		//model		
		this.role = undefined; // the selected role	from shift	
		this.employees = undefined; // empl. avail. for this role
		this.unavailableEmployees = undefined; // [EmployeeHolder], are displayed in unavail-tab
		
		function init(){
			scope.init.call(scope);
		}
		
		/**
		 * Points to the template backing the dialog.
		 * @returns  {_.template}
		 */
		this.getDialogTmpl = function(){
			return _.template(byRolesEditDialogHtml);
		};
		
		/**
		 * Handles change of who-selection.
		 * @param employee : EmployeeHolder
		 */
		this.handleWhoChange = function(employee){
			if(!employee){
				return;
			}
			// request unavails for selected employee					
			fetchUnavailsForEmployee(employee.name, function(unavails){				
				scope.editShiftView.renderUnavailabilities(unavails);
				(scope.modifiable !== false) && scope.editShiftView.enableApply();
				scope.editShiftView.renderSelectedEmployee(employee);
			});			
			scope.editShiftView.closeWhoSelector();
			scope.editShiftView.disableApply();	
		};
		
		/**
		 * Fetches unavailabilities for given employee.
		 * 
		 * @param employeeName
		 * @param callback : [unavailibilities]
		 */
		function fetchUnavailsForEmployee(employeeName, callback) {
			var dateInWeek = timeZoneUtils.parseInServerTimeAsMoment(scope.weekDay, scope.tableController.DAY_COORD_FORMAT).valueOf();
			jQuery.ajax({
				url : scope.tableController.CONTROLLER_URL + '/findUnavailsForEmployee',
				dataType : 'json',
				type : 'GET',
				data : {
					employeeName : employeeName,
					dateInWeek : dateInWeek
				},
				success : function(resp){
					scope.unavailabilities = resp.unavailabilities;
					callback(resp.unavailabilities);
				}
			});
		}
		
		/**
		 * Fetches unavailable employees for given role in given period.
		 * @param args : {role : String,
		 * 				 startTime,
		 * 				 endTime,
		 * 				 scheduleDetail : ScheduleDetailHolder (in case of an edit)
		 * 				 }
		 * @param callback : function({unavailableEmployees : [EmployeeHolder]}) 
		 */
		function fetchUnavailableEmployees(args, callback){
			var data = _.clone(args);
			if(data.scheduleDetail){
				data.scheduleDetail = JSON.stringify(data.scheduleDetail);
			}
			jQuery.ajax({
				url : scope.tableController.CONTROLLER_URL + '/findUnavailableEmployees',
				dataType : 'json',
				type : 'POST',
				data : data,
				success : function(result){
					scope.unavailableEmployees = result.unavailableEmployees;
					callback && callback(result);
				} 					
			});
		}
		
		/**
		 * Returns the constructor to be used to init view.
		 */
		this.getViewConstructor = function(){
			return ByRolesEditShiftView;
		};		
		
		/**
		 * Adds employeeName and role to given scheduleDetail, extracted from
		 * model and given selection.
		 * @param scheduleDetail
		 * @param selection		  
		 */
		this.addRoleAndEmplFromSelections = function(scheduleDetail, selection) {
			scheduleDetail.employeeName = selection.employeeName;
			scheduleDetail.role = {
				name : scope.role
			};
		};	
		
		/**
		 * @override
		 * Updates the model based on the given server-response.		  
		 * @param resp
		 */
		this.updateModel = function(resp){			
			Object.getPrototypeOf(scope).updateModel.call(this, resp);
			scope.unavailableEmployees = resp.unavailableEmployees;			
		};
		
		/**
		 * Returns a list of employees which are available.
		 * @returns
		 */
		this.findAvailableEmployees = function(){
			var unavailNames = _.chain(scope.unavailableEmployees.approved)
								.union(scope.unavailableEmployees.posted)
								.pluck('name')
								.value();
			return _.filter(scope.employees, function(employee){ return !_.contains(unavailNames, employee.name); }); 
		};
		
		/**
		 * Returns a list of employees which are not available and status is 'approved'.
		 * @returns
		 */
		this.findApprovedUnavailableEmployees = function(){
			return scope.unavailableEmployees.approved;
		};		
		
		/**
		 * Returns a list of employees which are not available and status is 'posted'.
		 * @returns
		 */
		this.findPostedUnavailableEmployees = function(){
			return scope.unavailableEmployees.posted;
		};			
		
		/**
		 * Returns the employee to which the shift is assign which is opened for edit.
		 * @returns EmployeeHolder
		 */
		this.findEmployeeFromEditedShift = function(){
			return scope.scheduleDetail && scope.tableController.findEmployee(scope.scheduleDetail.employeeName);
		};
		
		/**
		 * @override
		 * @param hour
		 * @param minute
		 */
		this.handleFromSelected = function(hour, minute){
			Object.getPrototypeOf(scope).handleFromSelected.call(this, hour, minute);			
		};
		
		/**
		 * @override
		 * @param hour
		 * @param minute
		 */
		this.handleToSelected = function(hour, minute){
			Object.getPrototypeOf(scope).handleToSelected.call(this, hour, minute);			
		};
		
		/**
		 * @override
		 * Handles timepicker-closing by updating who-select.
		 */
		this.handleTimePickerClose = function(){
			allowEditWho() && updateWhoSelect();
		};
		
		/**
		 * Triggers to update who-select for the current period and role. First fetches
		 * unavailable-employees from server for this parameter.
		 * This is async.!
		 */
		function updateWhoSelect(){			 
			var reqParams = {role : scope.role,				  				
					scheduleDetail : scope.scheduleDetail
			};
			_.extend(reqParams, scope.findPeriodToSubmit());
			scope.editShiftView.disableWhoSelect();
			fetchUnavailableEmployees(reqParams, function(){
				scope.editShiftView.updateSelectWhoTab();
				scope.editShiftView.enableWhoSelect();
			});
		}
		
		/**
		 * Checks if who-inpute can be enabled. For this the period
		 * must be selected.
		 * @returns {Boolean}
		 */
		function allowEditWho(){
			return !!(scope.selectedStartTime && scope.selectedEndTime);
		}
		
		init();
		
	}
	
});
