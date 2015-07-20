define(['text!audits/auditsPopup.html',
        'weekDayBar/WeekDayBarController',   
        'libs/timeZoneUtils',
        'datatable',
        'css!audits/audits.css',
        'underscore',
        'animo'],
function(auditsPopupHtml, WeekDayBarController, timeZoneUtils){
	return AuditsView;
	
	function AuditsView(args){
		var scope = this;
		var controller = args.controller;
		var $auditsContainer = undefined;
		this.weekDayBarController = undefined; // WeekDayBarController
				
		this.show = function(){
			var dialog = jQuery.decor.dialogDecor({
				$el : jQuery(_.template(auditsPopupHtml)()),
				options : {
					editorHeight : 580,				
					onTheFly : true,
					showClosing : true,
					onClosing : onClosing
				}
			});
			$auditsPopup = dialog.$el;
			$auditsContainer = $auditsPopup.find('.audits.container'); 

			dialog.$wrapper.addClass('audits');
			$auditsPopup.css({top: jQuery('html').scrollTop()+20+'px',
				width: '98%',
				height: 'auto',
				'margin-left': '-49%'});
			
			// attach resize-handler 
			jQuery(window).on('resize', controller.handleResize);
			
			// adding weekDay-bar
			scope.weekDayBarController = (new WeekDayBarController({
							             week: controller.tableController.week,
							DAY_COORD_FORMAT : controller.tableController.DAY_COORD_FORMAT,
							   startOfWeekDay: controller.tableController.startOfWeekDay,
							              $el: $auditsPopup.find('.week-day-container'),
							   onChangePeriod: controller.handleChangePeriod,
							     onChangeWeek: controller.handleChangeWeek
							     })).show();
			dialog.showDialog();			
			dialog.$el.animo( { animation: 'flipInX' } );
		};	
		
		/**
		 * Invoked when dialog is closed. Cleans-up global listeners.
		 */
		function onClosing(){
			jQuery(window).off('resize', controller.handleResize);
		}
		
		this.updateDateSelectors = function(){
			scope.weekDayBarController.updateDateSelectors();
		};
				
		this.showLoadingState = function(){
			$auditsContainer.addClass('loading');
			return this;
		};
				
		this.removeLoadingState = function(){
			$auditsContainer.removeClass('loading');
			return this;
		};
		
		this.clearAuditsContainer = function(){
			$auditsContainer.empty();
			return this;
		};
				
		function formatDate(timestamp){
			timestamp = parseInt(timestamp);
			return timeZoneUtils.parseInServerTimeAsMoment(timestamp).format('M/DD/YY h:mm a');
		}	
		
		function onDetailCellCreated(td){
			jQuery(td).addClass('detail');
		}	
		
		function onRender(formatter){
			return function(value){
				var escaped = _.escape(value);
				return formatter != undefined ? formatter(escaped) : escaped; 
			}
		}
		
		/**
		 * Renders the audits-table with data corresponding to current selection.
		 */
		this.renderAudits = function() {
			jQuery('<table></table>').addClass('row-border').appendTo($auditsContainer)
				.DataTable( {
					data: controller.findCurrentModel(),
					columns: [{ data: 'date', title: 'Date', width: '100px', render: onRender(formatDate)},
					          { data: 'employee', title: 'Employee', width: '100px', render: onRender()},
					          { data: 'what', title: 'What', width: '100px', render: onRender()},
					          { data: 'scheduleDate', title: 'Schedule Date', width: '100px', render: onRender(formatDate)},
					          { data: 'status', title: 'Status', width: '50px', render: onRender() },
					          { data: 'detail', title: 'Detail', createdCell: onDetailCellCreated, render: onRender()}],
					paging: false,
					scrollY: 300,
					info: false
				});			
			return this;
		};
		
	}
});