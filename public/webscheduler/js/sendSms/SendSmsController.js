define(['text!sendSms/sendToAllDialog.html', 
        'text!sendSms/sendToChangedDialog.html',
        'timeZoneUtils',
        'underscore',
        'css!sendSms/sendSms.css'],
function(sendToAllDialogHtml, sendToChangedDialogHtml, timeZoneUtils){
	return SendSmsController;
	
	function SendSmsController(args){
		var scope = this;
		var webSchedulerController = args.controller; 
		var view = undefined;
		
		/**
		 * Handles click on sendSms button by requesting SmsSendInfo from server and 
		 * the displaying dialog in modal. 
		 * @param $button
		 * @param week : Week
		 */
		this.handleSendSms = function($button, week){
			requestSmsSendInfo(week)
					.then(showDialog.bind(null, week))
					.always(function(){
						$button.buttonDecor('stopLoading');
					});
		}
		
		function showDialog(week, resp){
			var smsSendInfo = resp.smsSendInfo;			
			var dialogHtml = smsSendInfo.state.name === 'ApprovedState' && smsSendInfo.emplWithSendDateCount > 0 ?
					sendToChangedDialogHtml : sendToAllDialogHtml;
			var data = {smsSendInfo: smsSendInfo, timeZoneUtils: timeZoneUtils, week: week};
			view = jQuery.decor.dialogDecor({
				$el : jQuery(_.template(dialogHtml)(data)),
				options : {
					onTheFly : true,
					editorHeight: 200
				}
			});
			view.showDialog();
			view.$el.on('click', 'button', handleChoice.bind(null, week));
		}
		
		function handleChoice(week, event){
			var $button = jQuery(event.target).buttonDecor('startLoading');
			switch ($button.attr('data-role')) {			
			case 'send-to-all':				
				webSchedulerController.showLoading();
				requestSendSms(week, true).always(webSchedulerController.hideLoading);
				break;
			case 'send-to-changed':				
				webSchedulerController.showLoading();
				requestSendSms(week, false).always(webSchedulerController.hideLoading);
				break;
			default:
				break;
			}
			view.closeDialog();			
		}
		
		/**
		 *  @param week : Week
		 *  @param toAll : boolean
		 */
		function requestSendSms(week, toAll){
			return jQuery.ajax({ 
				url : webSchedulerController.CONTROLLER_URL + '/sendSms',
				type : 'POST',
				data : {week: JSON.stringify(week), toAll: toAll}				
			}); 
		}
		
		/**
		 * @param week : Week
		 */
		function requestSmsSendInfo(week){
			return jQuery.ajax({ 
				url : webSchedulerController.CONTROLLER_URL + '/findSmsSendInfo',
				dataType : 'json',
				type : 'GET',
				data : {week: JSON.stringify(week)}				
			}); 
		}
	}
});