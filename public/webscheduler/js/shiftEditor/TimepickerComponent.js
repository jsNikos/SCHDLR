define(['timeZoneUtils'], function(timeZoneUtils){
  return TimepickerComponent;

  function TimepickerComponent(){
    var vueScope = undefined;
    var $fromTime = undefined;

    return {
      template: '<input class="from-time input-decor" type="text" readonly="readonly" />',
      ready: initialize,
      props: ['selectedTime', 'minHour', 'maxHour', 'minMinute', 'maxMinute', 'showPeriod', 'showLeadingZero', 'minutesInterval'],
      watch: {
        'selectedTime': handleSelectedTimeChange
      }
    }

    function handleSelectedTimeChange(value){
      value && $fromTime.timepicker('setTime', timeZoneUtils.inServerTime(value), true);
    }

    function initialize(){
      vueScope = this;
      $fromTime = jQuery(vueScope.$el);

      var bounds = {};
      var options = {
				showPeriod : vueScope.$data.showPeriod,
				showLeadingZero: vueScope.$data.showLeadingZero,
				minutes : {
					starts : 0,
					interval : vueScope.$data.minutesInterval
				},
				defaultTime : '12:00',
				beforeShow : function(input, picker) {
					// this fixes position-problem if shown in fixed-context
					setTimeout(correctPosition, 0);

					function correctPosition() {
						var $picker = jQuery(picker.tpDiv);
						var top = jQuery(input).offset().top - jQuery(window).scrollTop() + 33;
						$picker.css('top', top);
					}
				},
				onClose: function(){
          vueScope.$dispatch('close');
        }
			};

      bounds.onHourShow = function(hour) {
        var time = moment(vueScope.$parent.extractShiftTime(hour, 0));
        // this works, because the 'hour' determines the (real-)day and therefore 'time' is set correctly
        if(time.isBefore(vueScope.$data.minHour, 'hour') || time.isAfter(vueScope.$data.maxHour, 'hour')){
          return false;
        }
        return true;
      };
      bounds.onMinuteShow = function(hour, minute) {
        if(minute == undefined){ return false; }
        var time = moment(vueScope.$parent.extractShiftTime(hour, minute));
        if(time.isBefore(vueScope.$data.minMinute, 'minute') || time.isAfter(vueScope.$data.maxMinute, 'minute')){
          return false;
        }
        return true;
      };
      bounds.onSelect = function(){
        vueScope.$dispatch('selected', {hour: $fromTime.timepicker('getHour'), minute: $fromTime.timepicker('getMinute')});
      };
      $fromTime.timepicker(_.chain(bounds).extend(options).value());
    }
  }
});
