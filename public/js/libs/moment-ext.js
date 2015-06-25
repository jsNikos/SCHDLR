/*
 * This provides an extention of moment.js.
 * @Author: Nikos Kitzka
 * License: MIT
 */

(function() {
	if (window.moment_ext) {
		throw new Error('Clash in namespace: moment_ext');
	}
	if (!window.moment) {
		throw new Error("Moment.js is required for moment-ext.js");
	}
	
	window.moment_ext = function(time, formats){	
		function MomentExt(){			
			/**
			 * Sets the the day-part of the given day on the instance but lets
			 * time untouched.
			 * @param day : (Date|number|moment|string)
			 * @param formates : in case 'day' is given as string
			 */
			this.setSameDay = function(day, formats){
				day = moment(day, formats);
				return this.year(day.year()).month(day.month()).date(day.date());
			};
			
		}		
		MomentExt.prototype = moment(time, formats);
		return new MomentExt();
	};
	
	// utils	
	function Utils(){
		/**
		 * Returns if day-time given by (h1, m1) is before (h2, m2).
		 * @param h1
		 * @param m1
		 * @param h2
		 * @param m2
		 * @returns
		 */
		moment_ext.dayTimeBefore = function(h1, m1, h2, m2){
			var ref1 = moment().hour(h1).minute(m1);
			var ref2 = ref1.clone().hour(h2).minute(m2);
			return ref1.isBefore(ref2);
		};
	}
	Utils();
	
	
}());