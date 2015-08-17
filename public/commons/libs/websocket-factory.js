/*
 * Provides a factory for produces websocket-instances which are enahnced with functionality.
 * The instances returned provide a subscribe/unsubscribe mechanism for subscribing to server-side
 * broadcasts.
 * Moreover, when creating an instance, by setting the 'autoReconnect' option, the websocket will reconnect
 * when recognizing a failure. Previous made subscribtions are re-send in a reconnect scenario.
 */

define(['q', 'underscore'], function(q){
	return new Factory();

	function Factory(){	
		
		/**
		 * @param options : {
		 * onmessage: function,
		 * onerror : function,
		 * onclose: function,
		 * autoReconnect: boolean, default: false, when true attempts to reconnect when loosing connection
		 * reconnectInterval: in millisecs, period between reconnect-attempts		  
		 * } 
		 * 
		 * @returns: Promise resolving against {
		 * send : function(msg),
		 * close : function(),
		 * reconnect : function() returns promise like 'create',
		 * subsribe: function(topic),
		 * unsubscribe: function(topic)
		 * }
		 */
		this.create = function(options){
			return q.Promise(function(resolve, error){
				if(!hasSupport()){
					error('Websocket not supported in your browser.');
					return;
				}
				
				var instance = new Instance(options);
				instance.onopen = function(){
					resolve(instance);
				};
			});			
		}
		
		function Instance(options){
			var scope = this;
			var protocol = window.location.protocol === 'http:' ? 'ws' : 'wss';			
			var websocket = undefined;
			var isOpened = false;
			var isClosed = false;
			var subscribtions = [];		
			var autoReconTimeout = undefined;
						
			function init(){
				if(!options.url){
					throw new Error('Missing url option');
				}				
				initWebSocket();				
			}
			
			function initWebSocket(){
				websocket = new WebSocket(protocol+'://' + window.location.host + options.url);
				websocket.onopen = function(){
					log('opening websocket connection to '+options.url);
					isOpened = true;
					isClosed = false;
					scope.onopen && scope.onopen();
				}
				websocket.onmessage = function(event){
					var msg = JSON.parse(event.data);
					(msg.type === 'SERVER_ERROR') && log(msg);
					options.onmessage && options.onmessage(msg);
				};
				websocket.onerror = function(err){
					log('error on websocket connection to '+options.url);
					log(err);
					options.onerror && options.onerror(err);
				}					
				websocket.onclose = function(){
					isClosed = true;
					isOpened = false;
					log('closing websocket connection to '+options.url);
					options.autoReconnect && startAutoReconnect();				
					options.onclose && options.onclose(err);
				}					
			}	
			
			function startAutoReconnect(){
				var interval = options.reconnectInterval || 1000;
				log('Trying to reconnect in '+ interval + 'ms');
				if(autoReconTimeout != undefined){
					clearTimeout(autoReconTimeout);
				}	
				autoReconTimeout = setTimeout(scope.reconnect, interval);
			}
			
			this.reconnect = function(){
				if(websocket && !isClosed){
					scope.close();
				}
				if(autoReconTimeout != undefined){
					clearTimeout(autoReconTimeout);
				}				
				return q.Promise(function(resolve, error){
					scope.onopen = function(){
						resubscribe();
						resolve(scope);
					}
					initWebSocket();
				});
			};
			
			function resubscribe(){
				_.each(subscribtions, scope.subscribe);
			}

			function log(msg){
				window.console && console.log(msg);
			}
			
			function checkReady(){
				if(isClosed){
					throw new Error('Websocket is closed');
				}
				if(!isOpened){
					throw new Error('Websocket is opened');
				}
			}
			
			/**
			 * Only available after open-event.
			 * @params webSocketMsg : WebSocketMsg
			 */
			this.send = function(webSocketMsg){
				checkReady();
				webSocketMsg.type = webSocketMsg.type || 'FROM_CLIENT';
				websocket.send(JSON.stringify(webSocketMsg));
				return this;
			};
			
			this.close = function(){
				websocket.close();
			}

			/**
			 * Only available after open-event.
			 */
			this.subscribe = function(topic){
				checkReady();
				log('Subscribing websocket connection '+options.url + ' to topic '+topic);
				scope.send({type: 'SUBSCRIBE', topic: topic});
				options.autoReconnect && addSubscription(topic);
				return this;
			};

			/**
			 * Only available after open-event.
			 */
			this.unsubscribe = function(topic){
				checkReady();
				log('Unsubcribing websocket connection '+options.url + ' from topic '+topic);
				scope.send({type: 'UNSUBSCRIBE', topic: topic});
				options.autoReconnect && removeSubscription(topic);				
				return this;
			};
			
			function addSubscription(topic){
				var idx = subscribtions.indexOf(topic);
				if(idx === -1){
					subscribtions.push(topic);
				}
			}
			
			function removeSubscription(topic){
				var idx = subscribtions.indexOf(topic);
				if(idx > -1){
					subscribtions.splice(idx, 1);
				}
			}
			
			init();

		}

		function hasSupport(){
			return window.WebSocket;
		}	

	}	
});


