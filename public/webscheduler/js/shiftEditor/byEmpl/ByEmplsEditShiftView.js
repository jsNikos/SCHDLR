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

		// el's
		var $asRole = jQuery('select[name="role"]', this.$el);

		function init(){
			scope.init.call(scope);
			initAsRoleSelect();
		}

		function initAsRoleSelect() {
			$asRole.selectDecor({width: null});
		}

		/**
		 * Applies pre-selections according to given scheduleDetail.
		 */
		this.applyPreselections = function(scheduleDetail) {
			// call the super method, because it is 'super' and inits time-pickers
			Object.getPrototypeOf(scope).applyPreselections.call(scope, scheduleDetail);

			// select the scheduled-role
			jQuery('option:selected', $asRole).removeAttr('selected');
			jQuery('option[value="'+scheduleDetail.role.name+'"]', $asRole).attr('selected', 'selected');
			$asRole.selectDecor('refresh');
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
			result.role = $asRole.val();
			return result;
		};

		/**
		 * Applies schedulable-roles and unavailabilities to view.
		 */
		this.applyInitData = function() {
			// apply roles
			_.each(scope.editShiftCtrl.roles, function(role) {
				var $option = jQuery('<option></option>').attr('value', role.name);
				var text = role.name;
				if (role.isDefault) {
					text += ' (default)';
					$option.attr('selected', 'selected');
				}
				$option.text(text);
				$asRole.append($option);
			});

			if(scope.editShiftCtrl.isEditMode()
				 && scope.editShiftCtrl.containsIssuesOfType(scope.editShiftCtrl.scheduleDetail, 'RoleIssue')){
				var scheduleDetail = scope.editShiftCtrl.scheduleDetail;
				// scheduled-role not available for employee, then add for showing problems
				jQuery('<option></option>').attr('value', scheduleDetail.role.name)
					.text(scheduleDetail.role.name)
					.appendTo($asRole);
			}
			$asRole.selectDecor('refresh');			
		};

		init();

	}

});
