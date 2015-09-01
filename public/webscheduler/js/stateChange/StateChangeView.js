define(['q'], function(q){
	return StateChangeView;
	
	function StateChangeView(args){
		var scope = this;
		var controller = args.controller;	
		// el
		var $stateChange = args.$el;
		
		// template
		var stateActionsTmpl = _.template(jQuery('#stateActionsTmpl').text());
		
		function init(){
			initStateActions();	 
		}
		
		/**
		 * Registers click-listeners which delegate clicked action to controller.
		 */
		function initStateActions(){
			$stateChange.on('click', 'button', function(event) {  
				// disable buttons
				jQuery('button', $stateChange).attr('disabled', 'disabled');
				controller.handleStateChangeClick(event);
			});
		}		
		
		this.enableStateChange = function(){
			jQuery('button', $stateChange).removeAttr('disabled');
		};
		
		/**
		 * Re-renders action-buttons based on schedulerState-model in schedulerTableController.
		 */
		this.updateStateActions = function() {  
			$stateChange.empty().append(stateActionsTmpl({
				authorizedActions : controller.webSchedulerView.schedulerTableCtrl.authorizedActions
			}));
		};
		
		/**
		 * @param args : {postDialogInfo : PostDialogInfo}
		 * @return promise : resolves to click-event of button
		 */
		this.confirmToPost = function(args){  
			return q.Promise(function(resolve){
				// show confirmation
				require(['text!stateChange/postingDialog.html', 'css!stateChange/postingDialog.css'], resolve);
			}).then(createConfirmation);
			
			function createConfirmation(postingDialogHtml){
				return q.Promise(function(resolve){
					var	view = jQuery.decor.dialogDecor({
						$el : jQuery(_.template(postingDialogHtml)(args.postDialogInfo)),
						options : {
							onTheFly : true,
							editorHeight: 'auto',
							showClosing: false
						}
					});
					view.showDialog()
					    .$el.on('click', 'button', function(event){
					    	view.closeDialog();
					    	resolve(event);
					    });
				});
			}					
		};
		
		/**
		 * Shows pop-up containing issues with change of schedule-state.
		 * @param blocker: [string] - issues msgs
		 */
		this.showStateChangeBlocker = function(blocker){
			require(['text!stateChange/stateChangeIssuesDialog.html'], function(stateChangeIssuesDialog){
				jQuery.decor.dialogDecor({
					$el : jQuery(_.template(stateChangeIssuesDialog)({ 
						blocker : blocker
					})),
					options : {
						editorWidth : 350,
						editorHeight : 200,
						warning : true,
						onTheFly : true,
						showClosing : true
					}
				}).showDialog();
			});			
		};	
		
		init();
	}
});