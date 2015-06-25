/*
 * Author: Nikos Kitzka
 * Licence: MIT
 */

(function() {
	if (window._ext) {
		throw new Error('Clash in namespace: _ext');
	}
	if (!window._) {
		throw new Error("Underscore.js is required for underscore-ext.js");
	}	
	
	function UnderscoreExt() {
	}

	// make a _-derivative
	_.extend(UnderscoreExt.prototype, _);
	
	/**
	 * Returns the property-value of the given object w.r.t the given path
	 * of prop-names. Useful when dealing with tree-structures.
	 * @param obj : Object
	 * @param path : [String], prop-path to value
	 */
	UnderscoreExt.prototype.valueFromPath = function(obj, path){
		if (!(path instanceof Array)) {
			path = [ path ];
		}
		var value = obj;
		_.each(path, function(prop){
			value = value[prop];
		});
		return value;
	};
	
	/**
	 * Appends all elements 'source' to 'list'.
	 * @param list
	 * @param source
	 */
	UnderscoreExt.prototype.append = function(list, source) {
		if (!source instanceof Array) {
			source = [ source ];
		}
		_.each(source, function(elem) {
			list.push(elem);
		});
	};
	
	/**
	 * Checks the given perdiods to not to intersect.
	 * Everything given in millis!
	 * @param start1
	 * @param end1
	 * @param start2
	 * @param end2
	 */
	UnderscoreExt.prototype.checkPeriodsDisjoint = function(start1, end1, start2, end2){
		return (end1 < start2) || (start1 > end2);
	};
	
	/**
	 * Searches through the list for all values having the given properties and removes it from
	 * list.
	 * @param properties
	 * @returns the reduced list
	 */
	UnderscoreExt.prototype.removeWhere = function(list, properties){
		var els = _.where(list, properties);
		_.each(els, function(el){
			list.splice(_.indexOf(list, el), 1);
		});
		return list;
	};
	
	/**
	 * Removes all elements given in toRemove from list.
	 * @param toRemove : array of elements
	 * @param list
	 */
	UnderscoreExt.prototype.removeAll = function(list, toRemove){
		_.each(toRemove, function(elem){
			var idx = _.indexOf(list, elem);
			if(idx > -1){
				list.splice(idx, 1);
			}
		});
	};
	
	/**
	 * This is a asynchronous version of 'each'. The 'task' is called for each
	 * element in given 'array' with arguments: element, idx 
	 * In each iteration the task is called in a setTimeout and the iteration order of
	 * the array's elements are ensure to be withhold.
	 * 
	 * When finishing, the given callback is called.
	 * 
	 * @param array
	 * @param task
	 * @param callback
	 * @return {abort}, where 'abort' is a function, if called aborts the processing,
	 *   				this should be immun against attempting to abort a non-active
	 *   				process, or abording twice.
	 */
	UnderscoreExt.prototype.asyncEach = function(array, task, callback) {
		var abort = false;
		if (typeof callback !== 'function') {
			callback = function() {
			};
		}

		// processor
		function asyncProcessing(idx) {
			if (!array || !array.length || idx >= array.length || abort) {
				!abort && callback();
				return;
			}
			setTimeout(function() {
				task(array[idx], idx);
				idx++;
				asyncProcessing(idx);
			}, 0);
		}
		asyncProcessing(0);
		return {
			abort : function() {
				abort = true;
			}
		};
	};	
	
	/**
	 * Returns a version of the given function which aborts a current call
	 * if another is initiated before the old to be ready. Makes only sense 
	 * if the function performs a asynchronous task and returns an object which 
	 * implements an 'abort'-property.	  
	 * @param {abort} func({success, abort}), within the args, 'success' and 'abort' are callbacks. 
	 */
	UnderscoreExt.prototype.oneRequestOnly = function(func) {
		var task = undefined;
		var abort = undefined;

		return function(options) {
			if (task) {
				task.abort();
				abort();
			}
			abort = (typeof options.abort === 'function') ? options.abort : function() {
			};
			var origSuccess = options.success || function(){};
			options.success = function() {				
				origSuccess.apply(this, arguments);
				task = undefined;
			};
			task = func.call(this, options);
			// return task-wrapper to enable aborting from outside
			return {
				abort : function() {
					task && task.abort() && abort();					
					task = undefined;
				}
			};
		};
	};
	
	/**
	 * Enables to execute asynchronous tasks which can notify this list to call next
	 * task.	
	 */
	UnderscoreExt.prototype.asyncTaskList = function() {
		var Constr = function AsyncTaskList() {
			var scope = this;
			var tasks = [];
			// the task's idx currently executed
			var currentTaskIdx = undefined;

			/**
			 * Starts execution of the list.
			 * 
			 * @method start
			 */
			this.start = function() {
				currentTaskIdx = 0;
				executeTask(null, currentTaskIdx);
			};

			/**
			 * @method executeTask
			 * @param idx
			 */
			function executeTask(err, idx, options) {
				var task = tasks[idx];
				if (task) {
					task(err, scope.next, options);
				}
			}

			/**
			 * Add tasks to end of list. A task must invoke 'next' in order
			 * proceed execution of other tasks. It must supply error as
			 * argument in case error happened and can add 'options' as argument
			 * in 'next' to transfer data to the next task.
			 * 
			 * @method addTask
			 * @param task :
			 *            function(err, next, options)
			 */
			this.addTask = function(task) {
				tasks.push(task);
				return this;
			};

			/**
			 * Callback for tasks to notify list that they have finished.
			 * Triggers execution of next if available.
			 * 
			 * @method next
			 * @param err
			 * @param options
			 */
			this.next = function(err, options) {
				currentTaskIdx++;
				if (currentTaskIdx < tasks.length) {
					executeTask(err, currentTaskIdx, options);
				}
			};

		};
		return new Constr();
	};
	
	/**
	 * Creates a version of the given function which when invoked will wait
	 * at least given millis until the given function 'func' is invoked.
	 * In case the function is invoked before this interval the current timer is
	 * cleared and instantiated to wait again at least 'millis'.
	 * @param func
	 * @param millis
	 * @returns {Function}
	 */
	UnderscoreExt.prototype.waitAtLeast = function(func, millis){
		var task = undefined;
		return function(){
			if(task){
				clearTimeout(task);					
			}
			var args = arguments;
			var scope = this;
			task = setTimeout(function(){
				func.apply(scope, args);
			}, millis);
		};
	};
	
	/**
	 * Client-side support to ensure a given template is available in dom. Otherwise
	 * tries to load and adds it in a <script>-tag. The data-id is set to the given path.
	 * This feature requires jQuery and is only suitable for the case the given file
	 * contains one template only.	  
	 * @param path : relative url pointing to the template-file. No trailing /
	 * @param callback: function(tmpl)
	 */
	UnderscoreExt.prototype.ensureTmpl = function(path, callback){
		if(!jQuery){
			throw new Error('This feature requires jQuery to be loaded!');
		}
		var $templ = jQuery('script[data-id="'+path+'"]');
		if($templ.size() > 0){
			callback($templ.text());
			return;
		}
		$templ = jQuery('<script></script>')
					.attr('type', 'text/template')
					.attr('id', path)
					.appendTo('body');
		jQuery.get(path, function(html){
			$templ.text(html);
			callback($templ);
		});	
	};
	
	/**
	 * Iterates over given tree. 
	 * @param nodes : {id, childs ; [node]}
	 * @param visitor : function(node, idx, scope), visitors are invoked when node is iterated,
	 * 				The scope is the visitor's return value of the parent-node.
	 * 				The idx the node's index in the current level. 
	 * 				If visitor returns 'false', iteration is not propageted to the next child-level.
	 * @param scope : the initial scope
	 */
	UnderscoreExt.prototype.visitNodes = function(nodes, visitor, scope){
		if(!(nodes instanceof Array)){
			nodes = [nodes];
		}
		
		_.chain(nodes).each(function(node, idx){
			iterate(node, idx, scope);
		});
		
		function iterate(node, idx, scope_){
			var scope = visitor(node, idx, scope_);
			if((scope !== false) && node.childs){
				_.chain(node.childs).each(function(child, idx){
					iterate(child, idx, scope);
				});
			}
		}			
	};
	
	
	_ext = new UnderscoreExt();

}());