define(['stateChange/StateChangeView', 'q', 'underscore'], function(StateChangeView, q){
	return StateChangeController;

	function StateChangeController(args){
		var scope = this;
		this.view = undefined;
		this.webSchedulerController = args.webSchedulerController;
		this.webSchedulerView = args.webSchedulerView;

		function init(){
			scope.view = new StateChangeView({controller: scope, $el: args.$el});
		}

		/**
		 * Handles state-action button click, by requesting state change from server.
		 * Shows pop-up in case state cannot be changed due to restrictions.
		 */
		this.handleStateChangeClick = function(event){
			var $button = jQuery(event.target);
			$button.buttonDecor('startLoading');
			var action = $button.attr('data-action');

			if(action === 'POST'){
				requestPostDialogInfo(scope.webSchedulerController.vueScope.$data.week)
					.then(scope.view.confirmToPost)
				    .then(handleChoice)
					.fail(scope.webSchedulerController.logError);
			} else{
				changeScheduleState($button, action);
			}

			function handleChoice(event){
				var $postButton = jQuery('[data-action="POST"]');
				var $target = jQuery(event.target);
				if($target.attr('data-role') === 'confirm-post'){
					changeScheduleState($postButton, 'POST');
				} else{
					$postButton.buttonDecor('stopLoading');
				}
			}
		};

		this.updateStateActions = function(){
			scope.view.updateStateActions();
		};

		/**
		 * Requests to change the schedule state.
		 */
		function changeScheduleState($button, action){
			requestChangeScheduleState({
					action : action,
					dateInWeek : scope.webSchedulerController.selectedDate.getTime(),
					scheduleState : JSON.stringify(_.chain(scope.webSchedulerController.vueScope.$data.scheduleState).pick('type').value())
				}).then(function(resp) {
					// check for issues
					if(!resp.blocker || resp.blocker.length === 0){
						// reload page, all shift-cells needs to be recreated because of modifiable-logic
						location.reload(true);
					} else{
						// show blocker in pop-up
						scope.view.showStateChangeBlocker(resp.blocker);
						scope.view.enableStateChange();
						$button.buttonDecor('stopLoading');
					}
				}).fail(scope.webSchedulerController.logError);
		}

		/**
		 * @returns q-promise : reolving to the response
		 */
		function requestPostDialogInfo(week){
			return q.Promise(function(resolve, reject){
				jQuery.ajax({
					url : scope.webSchedulerController.CONTROLLER_URL + '/findPostDialogInfo',
					type : 'POST',
					data : {week: JSON.stringify(week)}
				}).then(resolve).fail(reject);
			});
		}

		/**
		 * @param data : {action (ScheduleStateAction), dateInWeek (Long), scheduleState }
		 * @return promise : resoving to {scheduleState : ScheduleState, permittedActions : [ScheduleStateAction], blocker : [String]}
		 */
		function requestChangeScheduleState(data){
			return jQuery.ajax({
				url : scope.webSchedulerController.CONTROLLER_URL + '/changeScheduleState',
				type : 'POST',
				data : data
			});
		}

		init();
	}

});
