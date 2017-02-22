define(['text!components/confirmDialog/confirmDialog.html', 'vue', 'q',
        'css!components/confirmDialog/confirmDialog.css'],
        function (confirmaDialgHTML, Vue, q) {
    return ConfirmDialog;

    /**
     * options: {
     * title: string,
     * msg: string,
     * html: string, will not be escaped
     * [cancelButtonLabel: string],
     * [confirmButtonLabel]: string],
     * [height: number], not yet supported
     * [width: number] not yet supported
     * }
     * */
    function ConfirmDialog(options) {
	var scope = this;
	var dialog;
	var deferred = q.defer();

	function init() {
	    options = _.extend({
		cancelButtonLabel: 'Cancel',
		confirmButtonLabel: 'Confirm'
	    }, options);

	    dialog = createDialogTmpl(confirmaDialgHTML);

	    new Vue({
		el: dialog.$el.get(0),
		data: options,
		methods: {
		    handleConfirm: handleConfirm,
		    handleCancel: handleCancel
		}
	    });
	}

	function handleConfirm() {
	    deferred.resolve();
	    dialog.closeDialog();
	}

	function handleCancel() {
	    dialog.closeDialog();
	    deferred.reject();
	}

	function createDialogTmpl(template) {
	    return jQuery.decor.dialogDecor({
		$el: jQuery(template),
		options: {
		    editorWidth: 450,
		    editorHeight: 200,
		    onTheFly: true,
		    onClosing: deferred.reject.bind(deferred)
		}
	    }).showDialog();
	}

	init();
	return deferred.promise;
    }

});