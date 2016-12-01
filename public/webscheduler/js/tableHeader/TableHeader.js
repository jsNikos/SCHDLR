define(['text!tableHeader/tableHeader.html', 'timeZoneUtils'], function(tableHeaderHTML, timeZoneUtils) {
    return TableHeader;

    function TableHeader() {
	return {
	    template: tableHeaderHTML,
	    props: ['scheduleState', 'scheduleInfo', 'helplink', 'week',
	            'selectedDepartmentNumber', 'departments', 'scheduleBy'
	            ],
	            computed: {
	        	selectedWeek: selectedWeek,
	        	hideState: hideState,
	        	printViewUrl: printViewUrl
	            },
	            methods: {
	        	handleAuditsClicked: handleAuditsClicked,
	        	handleStatisticsClicked: handleStatisticsClicked
	            }
	};

	function printViewUrl() {
	    var printViewParams = {
		    date: (this.week.businessStartOfWeek / 1000).toString(16),
		    to: (this.week.businessEndOfWeek / 1000).toString(16),
		    tabbed: true,
		    printview: true,
		    incr: 2
	    };
	    return '/reports/WeeklySchedulePrintout?' + jQuery.param(printViewParams);
	}

	function selectedWeek() {
	    var departmentDisplay = '';
	    var selectedDepartment = _.findWhere(this.departments, {
		deptNumber: this.selectedDepartmentNumber
	    });
	    if (this.scheduleBy === 'Department' && selectedDepartment != undefined) {
		departmentDisplay = ':  ' + selectedDepartment.name;
	    }
	    return 'Week of ' +
	    timeZoneUtils.parseInServerTimeAsMoment(this.week.startOfWeek).format('ddd, MMM D') +
	    departmentDisplay;
	}

	function hideState() {
	    return this.scheduleState.name === 'PendingState'
	}

	function handleAuditsClicked() {
	    this.$dispatch('audits-clicked');
	}

	function handleStatisticsClicked() {
	    this.$dispatch('statistics-clicked');
	}

    }
});
