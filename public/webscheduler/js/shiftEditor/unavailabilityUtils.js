define(function(){
  return new UnavailabilityUtils();

  function UnavailabilityUtils(){

    this.addAvailabilities = function(unavailabilities, dayInfo){
      unavailabilities = unavailabilities || [];
      return _.chain([])
			 .union(findAvailabilities(unavailabilities, dayInfo)) /*add availabilities*/
			 .union(unavailabilities) /* add unavails */
			 .sortBy(function(interval) { /* sort by startDate */
				     return interval.startDate;
			  })
       .value();
    };

    /**
		 * From given list of unvails, creates list of availabilities by computing
		 * the complement of schedule-store hours.
		 * @param unavails : [UnavailibilityHolder]
     * @param dayInfo: DayInfoHolder
		 */
		function findAvailabilities(unavails, dayInfo){
			var avails = [];
			var currStart;
			// check start to be contained in unvail
			var nextConnEnd = findLargestConnEndDate(dayInfo.startDate, dayInfo, unavails);
			if(nextConnEnd > dayInfo.startDate){
				// start is contained in unavail, set currStart to highest possible end
				currStart = nextConnEnd + 1000;
			} else{
				currStart = dayInfo.startDate;
			}
			createAvailIntervals(currStart, dayInfo, unavails, avails);
			return avails;
		}

    // creates availability interval starting at start
    // start is assumed not to be contained in any unvail
    // recursively creates following intervals
    function createAvailIntervals(start, dayInfo, unavails, avails){
      if(!start || start >= dayInfo.endDate){
        return;
      }
      var unavailStarts = _.chain(unavails).filter(function(unavail){
        return unavail.startDate > start && unavail.startDate < dayInfo.endDate;
      }).pluck('startDate').value();
      if(unavailStarts.length > 0){
        var nextUnavailStart = _.min(unavailStarts);
        avails.push(createAvailability(start, nextUnavailStart-1000));
        largestConnEnd = findLargestConnEndDate(nextUnavailStart, dayInfo, unavails);	// next start
        createAvailIntervals(largestConnEnd+1000, dayInfo, unavails, avails);
      } else{
        // no further unvails
        avails.push(createAvailability(start, dayInfo.endDate));
        return;
      }
    }

    // extracts the maximal end-date of intervals which chain together up-from given date
    // this is the maximal unvailability spanned by intervals starting with those enclosing given date
    function findLargestConnEndDate(date, dayInfo, unavails){
      var enclosing = findEnclosing(date, unavails);
      if(date >= dayInfo.endDate){
        return dayInfo.endDate;
      } else if(enclosing && enclosing.length > 0){
        var maxEnclosingEnd = _.chain(enclosing).pluck('endDate').max().value();
        return findLargestConnEndDate(maxEnclosingEnd + 1000, dayInfo, unavails);
      } else{
        return date;
      }
    }

    // find all unvails which enclose given date
    function findEnclosing(date, unavails){
      return _.chain(unavails).filter(function(unavail){
        return unavail.startDate <= date && unavail.endDate > date;
      }).value();
    }

		/**
		 * Creates a availability instance.
		 * @param startDate
		 * @param endDate
		 * @returns
		 */
		function createAvailability(startDate, endDate) {
			return {
				startDate : startDate,
				endDate : endDate,
				availabilityType : 'available',
				unavailType : 'available'
			};
		}

  }
});
