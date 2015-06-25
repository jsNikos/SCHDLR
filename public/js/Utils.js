(function() {
	jQuery.extend(true, window, {
		scheduler : {
			Utils : Utils
		}
	});

	function Utils() {	
		
		/**
		 * Async. checks if authentication is required and calls authenticator
		 * at server-side if necessary (sets as target current url). Useful in
		 * one-pager applications.
		 */
		Utils.authIfRequired = function() {
			jQuery.ajax({
				url : '/ws/webScheduler/checkAuth',
				type : 'GET',
				global : false,
				async : false,
				statusCode : {
					401 : function() {
						// request login-page
						location.replace('/ws/webScheduler/public/login?' + jQuery.param({
							targetURI : location.pathname + location.search
						}));
					},
					403 : function() {
						var path = location.pathname.split('/');
						if (path[path.length - 1] === '') {
							path.pop();
						}
						path[path.length - 1] = 'notAuthorized.html';
						location.pathname = path.join('/');
					}
				}
			});
		};
	}
	Utils();

}());