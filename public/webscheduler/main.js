// config. require.js
require.config({
	baseUrl : 'js',
	paths : {
		libs : 'libs',
		'gantt-decor' : '../../commons/libs/jquery-foodtec-ui/gantt-decor',
		'table-decor' : '../../commons/libs/jquery-foodtec-ui/table-decor',
		jquery : 'libs/jquery-1.10.2.min',
		moment : '../../commons/libs/moment.min',
		'moment-timezone': '../../commons/libs/moment-timezone-with-data.min',
		text : '../../commons/libs/text',
		css: '../../commons/libs/css',
		underscore : '../../commons/libs/underscore',
		'underscore-ext': '../../commons/libs/underscore-ext',
		'jquery.event.drag-2.2' : '../../commons/libs/jquery-foodtec-ui/gantt-decor/libs/jquery.event.drag-2.2',
		WebSchedulerController : 'WebSchedulerController', /* that's main */
		WebSchedulerView : 'WebSchedulerView',
		ByEmplsTableController : 'schedulerTable/byEmpl/ByEmplsTableController',
		ByRolesTableController : 'schedulerTable/byRole/ByRolesTableController',
		SchedulerTableCtrl : 'schedulerTable/SchedulerTableCtrl',
		ByEmplsTotalsModel : 'schedulerTable/byEmpl/ByEmplsTotalsModel',
		ByEmplsTableView : 'schedulerTable/byEmpl/ByEmplsTableView',
		ByEmplsEditShiftController : 'shiftEditor/byEmpl/ByEmplsEditShiftController',
		ByRolesTotalsModel: 'schedulerTable/byRole/ByRolesTotalsModel',
		ByRolesEditShiftController : 'shiftEditor/byRole/ByRolesEditShiftController',
		ByRolesTableView : 'schedulerTable/byRole/ByRolesTableView',
		SchedulesModelUtils : 'schedulerTable/SchedulesModelUtils',
		ValidateShiftModifUtils : 'schedulerTable/ValidateShiftModifUtils',
		EditShiftController : 'shiftEditor/EditShiftController',
		EditShiftView : 'shiftEditor/EditShiftView',
		unavailabilityUtils: 'shiftEditor/unavailabilityUtils',
		ByEmplsEditShiftView : 'shiftEditor/byEmpl/ByEmplsEditShiftView',
		ByRolesEditShiftView : 'shiftEditor/byRole/ByRolesEditShiftView',
		TotalsModel : 'schedulerTable/TotalsModel',
		SchedulerTableView : 'schedulerTable/SchedulerTableView',
		MoveInfoModel : 'schedulerTable/MoveInfoModel',
		SendSmsController : 'sendSms/SendSmsController',
		datatable : 'libs/jquery-datatables/js/jquery.dataTables.custom',
		animo : '../../commons/libs/animo/animo',
		q : '../../commons/libs/q',
		EventEmitter : '../../commons/libs/EventEmitter',
		timeZoneUtils : '../../commons/libs/timeZoneUtils',
		vue: '../../commons/libs/vue.min',
		TimelineComponent : 'shiftEditor/timeline/TimelineComponent',
		TimepickerComponent: 'shiftEditor/TimepickerComponent',
		fontawsome: '../../commons/libs/font-awesome-4.4.0/css/font-awesome.min'
	},
	shim:{
		'underscore-ext':{
			deps:['underscore']
		},
		'datatable': {
			deps:['css!libs/jquery-datatables/css/jquery.dataTables.min']
		},
		'animo': {
			deps:['css!../../commons/libs/animo/animate+animo.css']
		}
	},
	map: {
		  '*': {
			    'css': 'css'
			  }
	},
	urlArgs : 'version='+scheduler.version
});
