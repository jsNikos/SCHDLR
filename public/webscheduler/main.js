// config. require.js
require.config({
	baseUrl : 'js',
	paths : {
		libs : 'libs',
		'gantt-decor' : '/webapps/commons/libs/jquery-foodtec-ui/gantt-decor',
		'table-decor' : '/webapps/commons/libs/jquery-foodtec-ui/table-decor',
		jquery : 'libs/jquery-1.10.2.min',
		moment : '/webapps/commons/libs/moment.min',
		'moment-timezone': '/webapps/commons/libs/moment-timezone-with-data.min',
		text : '/webapps/commons/libs/text',
		css: '/webapps/commons/libs/css',
		underscore : '/webapps/commons/libs/underscore',
		'underscore-ext': '/webapps/commons/libs/underscore-ext',
		'jquery.event.drag-2.2' : '/webapps/commons/libs/jquery-foodtec-ui/gantt-decor/libs/jquery.event.drag-2.2',
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
		animo : '/webapps/commons/libs/animo/animo',
		q : '/webapps/commons/libs/q',
		EventEmitter : '/webapps/commons/libs/EventEmitter',
		timeZoneUtils : '/webapps/commons/libs/timeZoneUtils',
		vue: '/webapps/commons/libs/vue.min',
		TimelineComponent : 'shiftEditor/timeline/TimelineComponent',
		TimepickerComponent: 'shiftEditor/TimepickerComponent',
		fontawsome: '/webapps/commons/libs/font-awesome-4.4.0/css/font-awesome.min'
	},
	shim:{
		'underscore-ext':{
			deps:['underscore']
		},
		'datatable': {
			deps:['css!libs/jquery-datatables/css/jquery.dataTables.min']
		},
		'animo': {
			deps:['css!/webapps/commons/libs/animo/animate+animo.css']
		}
	},
	map: {
		  '*': {
			    'css': 'css'
			  }
	},
	urlArgs : 'version='+scheduler.version
});
