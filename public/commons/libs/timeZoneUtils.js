define(['moment-timezone', 'underscore', 'moment'], function(moment){
	return new TimeZoneUtils();

	/**
	 * Once is initialized, instance can be used.
	 */
	function TimeZoneUtils(){
		var serverTimeZone = undefined; // String, server's time-zone (id) 
		
		/**
		 * @param args : {timeZone : string, server's time-zone id}
		 */
		this.init = function(args){			
			serverTimeZone = args.timeZone;
		};
		
		/**
		 * Computes from the given time a Date-object which (day, minute, hour, ...)-infos
		 * are with respect to server's time-zone.
		 * @param time : long, Date  (presenting millis since epoch)
		 * @return Date
		 */
		this.inServerTime = function(time){		
			checkInit();		
			var mom = moment.tz(time, serverTimeZone);			
			return new Date(mom.year(), mom.month(), mom.date(), mom.hour(), mom.minute(), mom.second(), mom.millisecond());
		};
		
		/**
		 * Parses given date-object into millis w.r.t server's time-zone.
		 * @param date : Date, number
		 * @return Integer
		 */
		this.parseInServerTime = function(date){
			checkInit(); 
			if(_.isNumber(date)){
				date = new Date(date);
			}
			var dateStrg = date.getFullYear() +'/'+ (date.getMonth() + 1) +'/'+ date.getDate() +' '
							+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()+'.'+date.getMilliseconds();			
			return moment.tz(dateStrg, 'YYYY/M/D H:m:s.SSS', serverTimeZone).valueOf();			
		};		
		
		/**
		 * Wraps the given time with a momentjs-instance calibrated
		 * to server's time-zone.		 
		 * @param date : date, integer, string
		 * @param format : if date given as string, format information required
		 * @param moment 
		 */
		this.parseInServerTimeAsMoment = function(date, format){
			checkInit();						
			return _.isString(date) ? moment.tz(date, format, serverTimeZone) : moment.tz(date, serverTimeZone);
		};
		
		function checkInit(){
			if(serverTimeZone == undefined){
				throw Error('TimeZoneUtils must be initialized correctly before used!');
			}
		}
		
	}
	
});