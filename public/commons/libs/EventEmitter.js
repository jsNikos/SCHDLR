define(function(){
	return EventEmitter;
	
	/**
	 * Useful as prototype. Adds to a class event-emitter
	 * functionalities.
	 * @class EventEmitter
	 * @constructor
	 */
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
			return this;
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
			return this;
		};

	}

});