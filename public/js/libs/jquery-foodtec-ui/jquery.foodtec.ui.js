(function() {

	function GanttDecor(){
		
	}	
	
	
	/**
	 * Decorates select-boxes.
	 * @constructor
	 */
	function SelectDecor(){	
		var scope  = this;
		
		var defOptions = {
				width : 130, /* set 'null' if controlled from css */
				height : 28, /* set 'null' if controlled from css */
				/* adds a custom class to the decorator */
				customClass : '',
				/* for positioning the element, adds class to wrapper */
				customWrapperClass: '',
				/*
				 * if true, the title-attr is used as header to initialize select-box,
				 * otherwise the current selection is used
				 */
				showTitle : false,
				/*
				 * show selections on change-events
				 */
				showSelection : true
			};	
		
		/**
		 * Initializes by adding the instance to jQuery's prototype.
		 */
		function init(){
			jQuery.fn.selectDecor = function(options, args) {
				var result = this;
				if(typeof options !== 'string'){
					// its a set-up					
					this.each(function(){
						setup.call(this, options);
					});
				}
				else{			
					this.each(function() {
						result = scope[options].call(this, args);
					});
				}				
				return result;
			};
		}
		
		/**
		 * Sets-up a select-decor on a given select-box.
		 * @param options_
		 */
		function setup(options_) {
			var options = jQuery.extend({}, defOptions, options_);
			var $select = jQuery(this);

			// wrap with styling elements
			var $selectWrapper = jQuery('<div></div>').addClass(
					'select-wrapper');
			$selectWrapper.addClass(options.customWrapperClass);
			options.width && $selectWrapper.width(options.width);
			options.height && $selectWrapper.height(options.height);
			$select.wrap($selectWrapper);
			var $selectDecor = jQuery('<div></div>').addClass('select-decor')
					.addClass(options.customClass);
			$select.parent().append($selectDecor);

			// init value-change
			if (options.showTitle) {
				$selectDecor.text($select.attr('title'));
			} else {
				$selectDecor.text(jQuery('option:selected', $select).text());
			}
			$select.on('change', function() {
				options.showSelection && $selectDecor.text(jQuery('option:selected', $select).text());
			});
			
			// store ref to options
			$selectDecor.data('selectDecor', {
				options : options
			});
		}
		
		/**
		 * Whenever changing at the select's html, this will sync the state.
		 */
		this.refresh = function(){
			var $select = jQuery(this);
			var $selectDecor = jQuery('.select-decor', $select.parent());	
			var options = $selectDecor.data('selectDecor').options;
			!options.showTitle && options.showSelection && $selectDecor.text(jQuery('option:selected', $select).text());
			options.showTitle && !options.showSelection && $selectDecor.text($select.attr('title'));
			return this;
		};		
		
		/**
		 * Selects the options with the given value and call to refresh.
		 * note: no change-event is fired during this action.
		 * @param value
		 */
		this.select = function(value){
			var $select = jQuery(this);
			jQuery('option', $select).removeAttr('selected');
			jQuery('option[value="'+value+'"]', $select).attr('selected', 'selected');
			return scope.refresh.call($select);
		};
		
		/**
		 * Returns the current selection as 
		 * {value, display}
		 */
		this.selected = function() {
			var $option = jQuery('option:selected', jQuery(this));
			return {
				value : $option.attr('value'),
				display : $option.text()
			};			
		};	
		
		init();
	}
	new SelectDecor();	

	
	/**
	 * Decorates buttons.
	 */
	function ButtonDecor(){
		var scope = this;
		
		function init(){
			jQuery.fn.buttonDecor = function(options_, args) {
				this.each(function() {
					jQuery(this).addClass('button-decor');
					if(typeof options_ === 'string'){
						var method = options_;
						scope[method].call(this, args);
					}			
				});
				return this;
			};
		}
		
		/**
		 * Remove loading-state from button.
		 */
		this.stopLoading = function(){
			var $button = jQuery(this);
			$button.removeClass('loading').removeAttr('disabled');
			return $button;
		};
		
		/**
		 * Renders button in a loading-state.
		 */
		this.startLoading = function(){
			var $button = jQuery(this);
			$button.addClass('loading').attr('disabled', 'disabled');
			return $button;
		};
		
		init();		
	}
	new ButtonDecor();
	
	

	/**
	 * Decorates a dialog around a given html-construct of form:
	 * <div targetElement>
	 * <div class="header">here put your header contents</div>
	 * <div class="content">here put your content</div>
	 * </div>
	 * 
	 * Optional the content can contain a button bar and within buttons:
	 * <div class="content">
	 * here put your content
	 * <div class="button-bar">here put buttons</div>
	 * </div>
	 */
	jQuery.extend(true, jQuery, {
		decor : {
			dialogDecor : function(args){
				DialogDecor.prototype = new EventEmitter();
				return new DialogDecor(args);
			}
		}
	});
	
	/**
	 * Instantiate this to obtain a dialog-decor around the given $el. It is a EventEmitter and
	 * therefore can be used to interplay in observer-pattern. 	  
	 * 
	 * This class is intended to be extended with dialog-specific view logic. 
	 * @param: args {$el, options}
	 * @constructor
	 */
	function DialogDecor(args){
		var scope = this;
		this.$el = args.$el;
		var options = {
				editorWidth : 580,
				editorHeight: 450,
				headerHeight: 40,
				borderColor: '#a3a3a3',
				warning : false, /* set this to make it warning-style */
				onTheFly : false, /* set this to make $el being added to what is specified in 'appendTo' and removed on-close */
				showClosing : true, /* if closing-icon is shown */
				appendTo : 'body', /* by default is appended to body, specified by selector */
				onClosing : function(){} /* invoke when dialog's closeDialog is executed */
		};
		this.$header = jQuery('.header', this.$el);	
		this.$content = jQuery('.content', this.$el);
		this.$wrapper = undefined;
		
		function init(){
			jQuery.extend(options, args.options);			
			initWrapper();
			addStyling();
			options.showClosing && initCloseIcon();
		};		
		
		// add positioning-styles to target element
		function addStyling() {
			options.warning && scope.$wrapper.addClass('warning');
			
			scope.$el.addClass('dialog-decor-target').css({
				'margin-left' : -options.editorWidth / 2 + 'px',
				'width' : options.editorWidth + 'px',
				'height' : options.editorHeight + 'px'
			});

			scope.$header.css({
				height : options.headerHeight + 'px'
			});			

			scope.$content.css({
				height : (options.editorHeight - options.headerHeight) + 'px',
				border : '1px solid ' + options.borderColor
			});

			jQuery('.button-bar', scope.$content).css({
				'border-top' : '1px solid ' + options.borderColor
			});
		}
		
		function initWrapper(){
			scope.$wrapper = jQuery('<div class="dialog-decor-wrapper"></div>');			
			scope.$wrapper.appendTo(options.appendTo);						
			scope.$wrapper.append(scope.$el);
		}
		
		function initCloseIcon(){
			var $closeIcon = jQuery('<span class="closing">X</span>').appendTo(scope.$header);			
			$closeIcon.on('click', scope.closeDialog);
		}
		
		this.showDialog = function(){
			scope.$wrapper.show();
			scope.$el.show();
			return this;
		};
		

		this.closeDialog = function() {
			if (!options.onTheFly) {
				scope.$wrapper.hide();
			} else {
				scope.removeDialog();
			}
			options.onClosing();
		};	
		
		this.removeDialog = function(){			
			scope.$wrapper.remove();
		};
		
		init();
	
	}
	
	/**
	 * Useful as prototype. Adds to a class event-emitter
	 * functionalities.
	 * @class EventEmitter
	 * @constructor
	 */
	jQuery.extend(true, jQuery, {
		decor : {
			EventEmitter : EventEmitter
		}
	});
	function EventEmitter() {
		/**
		 * Handler registry for emitted events.
		 * @property eventHandlerRegistry
		 * @type {eventName : [function]}
		 */
		var eventHandlerRegistry = {};

		/**
		 * Registers given handler for given event.
		 * @method on
		 * @param event {string}
		 * @param handler {function}
		 */
		this.on = function(event, handler) {
			if (!eventHandlerRegistry[event]) {
				eventHandlerRegistry[event] = [];
			}
			eventHandlerRegistry[event].push(handler);
		};

		/**
		 * Emitts given even and applies on all registered handlers.
		 * @method fire
		 * @param event {string}
		 * @param args {object}
		 */
		this.fire = function(event, args) {
			var handlers = eventHandlerRegistry[event];
			if (!handlers) {
				return;
			}
			jQuery(eventHandlerRegistry[event]).each(function() {
				this(args);
			});
		};

	}
	
	

}());