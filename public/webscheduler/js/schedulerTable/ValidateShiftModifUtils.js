define(['q'], function(q){
	return ValidateShiftModifUtils;

	/**
	 * Client-side validation support for shift-modifications.
	 */
	function ValidateShiftModifUtils(){	
		
		/**
		 * Validates 'edit' modification of given scheduleDetail.
		 * @param scheduleDetail : instance containing edits
		 * @param origScheduleDetail : the original instance (no edits)
		 * @returns promise : [ValidationIssues]
		 * @param controllerUrl: server-side controller to use
		 */
		this.validateEdit = function(scheduleDetail, origScheduleDetail, controllerUrl){
			var scope = this;
			return this.requestValidateShift(scheduleDetail, origScheduleDetail, controllerUrl)
			 					 .then(function(resp) {
									 return resp.scheduleDetail.validationIssues;
								 });
		};

		/**
		 * Validates 'create' modification of given scheduleDetail.
		 * @param scheduleDetail : instance to be created
		 * @param controllerUrl: server-side controller to use
		 * @return promise : [ValidationIssues]
		 */
		this.validateCreate = function(scheduleDetail, controllerUrl){
			return this.requestValidateShift(scheduleDetail, null, controllerUrl)
			 					 .then(function(resp) {
								 		return resp.scheduleDetail.validationIssues;
									});
		};
		
		/**
		 * Validates the move of the given shift to the given target cell.
		 * Checks that no other shift intersects and the role is available in
		 * target employee's roles.
		 * 
		 * @param moveInfoModel		  : move-info for the move
		 * @param sourceScheduleDet :
		 *            {scheduleDetail} source-shift
		 * @param controllerUrl: server-side controller to use
		 * @param callback :
		 *            function({validationIssues : [], permitted}), permitted is boolean expressing if modification is 
		 *            permitted on involved shift/cells,
		 *            'validationIssues' are the possible issues which the target-shift would have after the move
		 */
		this.validateMove = function(moveInfoModel, sourceScheduleDet, controllerUrl, callback) {				
			var permitResp;	
			var validationIssues = [];
			
			_ext.asyncTaskList()
			 	.addTask(createModPermissionTask('MOVE', moveInfoModel, function(permitResp_){
			 		permitResp = permitResp_;
			 	}).bind(this))
			 	.addTask(createShiftValidationTask(moveInfoModel, sourceScheduleDet, controllerUrl, validationIssues).bind(this))
			 	.addTask(function(err, next){
			 		callback({validationIssues: validationIssues, permitted : permitResp});
			 	 })
			 	.start();
		};
		

		/**
		 * Creates async-task which creates up-from given sourceSchedule an scheduleDetail which is send to
		 * server for validation. Given validationIssues are added to given argument.
		 * @param moveInfoModel
		 * @param sourceScheduleDet
		 * @param controllerUrl: server-side controller to use
		 * @param validationIssues : []
		 */
		function createShiftValidationTask(moveInfoModel, sourceScheduleDet, controllerUrl, validationIssues){			
			return function validationTask(err, next) {
				var scope = this;
				var validateScheduleDet = JSON.parse(JSON.stringify(sourceScheduleDet)); // deep-clone, producing validation-object
				// apply new values on shift-for-validate				
				validateScheduleDet.scheduleDate = moveInfoModel.targetScheduleDate;
				validateScheduleDet.employeeName = moveInfoModel.targetEmployee;
				if(scope.webSchedulerController.selectedView === 'byRoles'){
					// in this case role will change to target cell's role
					validateScheduleDet.role.name = moveInfoModel.targetRole;
				}				
				validateScheduleDet.startTime = moveInfoModel.targetStartTime;
				validateScheduleDet.endTime = moveInfoModel.targetEndTime;
				validateScheduleDet.weekDay = moveInfoModel.targetWeekDay;			
				
				// request validation
				scope.requestValidateShift(validateScheduleDet, sourceScheduleDet, controllerUrl)
						 .then(function(resp) {
							 _ext.append(validationIssues, resp.scheduleDetail.validationIssues || []);
							 next();
						 })
						 .catch(console.log);
			};
		};
		
		
		/**
		 * Extracts from given validationIssues if all contained can be overwritten.
		 * @param validationIssues : [ValidationIssue]
		 * @returns boolean
		 */
		this.issuesCanBeOverwritten = function(validationIssues){
			if(!validationIssues || validationIssues.length === 0){
				return null;
			}
			var anyNotOverwritable = _.chain(validationIssues).some(function(issue){
				return !issue.canBeOverwritten;
			}).value();
			return !anyNotOverwritable;			
		};
		
		/**
		 * @param validationIssues : [ValidationIssue]
		 * @returns [ValidationIssue] all contained, which are not overwritable.
		 */
		this.extractNotOverwritableIssues = function(validationIssues){
			if(!validationIssues || validationIssues.length === 0){
				return null;
			} 
			return _.chain(validationIssues).where({canBeOverwritten : false}).value();
		};
		
		/**
		 * @param validationIssues : [ValidationIssues]
		 * @returns [ValidationIssue] those which are not overwritten
		 */
		this.extractNotOverwrittenIssues = function(scheduleDetail){
			if(!scheduleDetail.overwrittenBy){
				return scheduleDetail.validationIssues;
			}else{
				return _.chain(scheduleDetail.validationIssues || []).where({canBeOverwritten : false}).value();
			}
		};
		
		/**
		 * Extracts issues of validationLevel and returns.
		 * @param validationLevel : (ValidationLevel)
		 * @param validationIssues : [ValidationIssues]
		 */
		this.findIssuesOfLevel = function(validationLevel, validationIssues){
			if(!validationIssues || validationIssues.length === 0){
				return null;
			}
			return _.chain(validationIssues).where({validationLevel : validationLevel}).value();			
		};
		
		/**
		 * Extracts if given scheduleDetail contains at least one validationIssues of given type.
		 * @param scheduleDetail
		 * @param typeName : typeName-prop of ValidationIssue
		 * @returns boolean
		 */		
		this.containsIssuesOfType = function(scheduleDetail, typeName){			
			return _.chain(scheduleDetail.validationIssues || []).some(function(issue){
				return issue.typeName === typeName;
			}).value();
		};
		
		
		/**
		 * Creates a async-task which requests the server if the given modification (as specified in 
		 * modInfo and modType) is permitted.  
		 * @param modType
		 * @param modInfo
		 * @param callback : function({permitted, msg}), call with permitted-flag		 
		 * @returns {Function}
		 */
		function createModPermissionTask(modType, modInfo, callback) {
			// task which request permission for the move
			return function checkModPermissionTask(err, next) {
				this.requestCheckModPermitted(modType, modInfo, function(resp) {
					callback(resp);					
					next();
				});
			};
		}
		
		
		/**
		 * Requests server to check modification permitted.
		 * @param modType : {ModType} the type of modification
		 * @param infos : Object, which specifies the modification
		 * @param callback : function({permitted, msg}) , where 'permitted' is boolean and msg string
		 */
		this.requestCheckModPermitted = function(modType, infos, callback){
			jQuery.ajax({
				url : this.CONTROLLER_URL + '/checkModPermitted',
				type : 'POST',
				data : {
					modType:modType,
					infosJson : JSON.stringify(infos)
				},
				success : callback
			});
		};
		
		/**
		 * Requests server to validate given shift.
		 * 
		 * @param scheduleDetail :
		 *            this is send for validation
		 * @param srcScheduleDetail : in case of EDIT or MOVE, is the original scheduleDetail
		 * @returns {scheduleDetail}, where the instance contains validations.
		 *  @param controllerUrl : the server-side controller to use
		 */
		this.requestValidateShift = function(scheduleDetail, srcScheduleDetail, controllerUrl) {
			return q.Promise(function(resolve, reject){
				jQuery.ajax({
					url : controllerUrl + '/validateShift',
					type : 'POST',
					data : {
						scheduleDetail : JSON.stringify(scheduleDetail),
						srcScheduleDetail : srcScheduleDetail && JSON.stringify(srcScheduleDetail)
					},
					success : resolve,
					error: reject
				});
			});
		};
	}

});
