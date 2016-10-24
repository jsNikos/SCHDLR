define(['EditShiftView'], function(EditShiftView){
	return function(args){
		EditShiftView.prototype = jQuery.decor.dialogDecor({
			$el : args.$el,
			options : {
				onTheFly : true,
				editorHeight: 531
			}
		});
		ByEmplsEditShiftView.prototype = new EditShiftView();
		return new ByEmplsEditShiftView(args);
	};

	/**
	 * Extention of EditShiftView supporting byEmployee -view.
	 */
	function ByEmplsEditShiftView(args){
		var scope = this;
		this.editShiftCtrl = args.controller;

		function init(){
			scope.init.call(scope);
		}

		/**
		 * Applies pre-selections according to given scheduleDetail.
		 */
		this.applyPreselections = function(scheduleDetail) {
			// call the super method, because it is 'super' and inits time-pickers
			Object.getPrototypeOf(scope).applyPreselections.call(scope, scheduleDetail);
		};


		/**
		 * Overwrite.
		 */
		this.showDialog = function() {
			scope.$forWhom.text(' for ' + scope.editShiftCtrl.tableController.findEmployee(scope.editShiftCtrl.employeeName).displayName);
			Object.getPrototypeOf(scope).showDialog.call(scope);
		};

		/**
		 * Grasps from view selected values, suitable to make create-request and perform validations.
		 * @returns {ScheduleDetail}
		 */
		this.findSelections = function() {
			var result = Object.getPrototypeOf(scope).findSelections.call(scope);
			return result;
		};

		/**
		 * Applies schedulable-roles and unavailabilities to view.
		 */
		this.applyInitData = function() {	};

		init();

	}

});
