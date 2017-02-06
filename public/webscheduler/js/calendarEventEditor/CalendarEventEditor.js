define(['q', 'text!calendarEventEditor/calendarEventEditor.html', 'vue', 'timeZoneUtils', 'css!calendarEventEditor/calendarEventEditor.css'],
	function (q, template, Vue, timeZoneUtils) {
    return CalendarEventEditor;

    function CalendarEvent(startDate){
	this.calendarType = 'Marketing';
	this.event = undefined;
	this.startDate = startDate;
	this.description = undefined;
    }

    function CalendarEventEditor(weekDay, DAY_COORD_FORMAT) {
	var scope = this;
	var dialog;
	var deferred = q.defer();

	function init() {
	    dialog = createDialogTmpl(template);
	    var startDate = timeZoneUtils.parseInServerTimeAsMoment(weekDay, DAY_COORD_FORMAT).valueOf();

	    new Vue({
		el: dialog.$el.get(0),
		data: {
		    calendarEvent: new CalendarEvent(startDate),
		    validationError: undefined
		},
		methods: {
		    handleApply: handleApply,
		    handleCancel: handleCancel
		}
	    });
	}

	function handleApply() {
	    var vueScope = this;
	    this.$data.validationError = undefined;
	    jQuery(this.$els.applyButton).buttonDecor('startLoading');

	    jQuery.ajax({
		url: '/ws/integrated/v1/store/calendarEvents',
		method: 'POST',
		data: JSON.stringify(this.$data.calendarEvent),
		contentType: 'application/json',
		global: false
	    })
	    .then(function(calendarEvent){
		deferred.resolve(calendarEvent);
		dialog.closeDialog();
	    })
	    .fail(function(err){
		if(err.status === 409 || err.status === 403){
		    vueScope.$data.validationError = err.responseJSON.message;
		    jQuery(vueScope.$els.applyButton).buttonDecor('stopLoading');
		} else {
		    deferred.reject(err);
		}
	    });
	}

	function handleCancel() {
	    dialog.closeDialog();
	    deferred.resolve();
	}

	function createDialogTmpl(template) {
	    return jQuery.decor.dialogDecor({
		$el: jQuery(template),
		options: {
		    editorWidth: 450,
		    editorHeight: 240,
		    onTheFly: true,
		    onClosing: deferred.resolve.bind(deferred)
		}
	    }).showDialog();
	}

	init();
	return deferred.promise;
    }
});