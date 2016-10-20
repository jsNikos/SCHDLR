define(['EditShiftController',
 'ByEmplsEditShiftView',
'text!shiftEditor/byEmpl/byEmplsEditDialog.html'],
function(EditShiftController, ByEmplsEditShiftView, byEmplsEditDialogHtml){
	return function(args){
		ByEmplsEditShiftController.prototype = new EditShiftController();
		return new ByEmplsEditShiftController(args);
	};
	
	/**
	 * Extention of EditShiftController supporting byEmployee -view.
	 */
	function ByEmplsEditShiftController(args){
		var scope = this;
		this.tableController = args.controller;
		
		function init(){
			scope.init.call(scope);
		}
		
		/**
		 * Points to the template backing the dialog.
		 * @returns  {_.template}
		 */
		this.getDialogTmpl = function(){
			return _.template(byEmplsEditDialogHtml);
		};
		
		/**
		 * Returns the constructor to be used to init view.
		 */
		this.getViewConstructor = function(){
			return ByEmplsEditShiftView;
		};
		
		/**
		 * Adds employeeName and role to given scheduleDetail, extracted from
		 * model and given selection.
		 * @param scheduleDetail
		 * @param selection		  
		 */
		this.addRoleAndEmplFromSelections = function(scheduleDetail, selection) {
			scheduleDetail.employeeName = scope.employeeName;
			scheduleDetail.role = {
				name : selection.role
			};
		};	
		
		init();
		
	}
	
});
