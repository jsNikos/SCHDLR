define(['text!shiftEditor/timeline/timeline.html',
    'underscore',
    'timeZoneUtils',
    'css!shiftEditor/timeline/timeline.css',
    'css!fontawsome',
    'jquery.event.drag-2.2'
  ],
  function(timelineHtml, _, timeZoneUtils) {
    return TimelineComponent;

    function TimelineComponent() {
      var vueScope = undefined;

      return {
        template: timelineHtml,

        // {timeSlots: [TimeSlot]}
        //TimeSlot: {shift: boolean, shiftStarts: boolean, shiftEnds: boolean, unavails: [Unavailibility]}
        props: ['timeSlots', 'openLabel', 'closeLabel', 'labelFormat'],

        ready: function() {
          vueScope = this;
          if(this.$data.model && this.$data.model.length > 0){
            adaptCellWidth();
          }
          initDragEvents();
        },

        watch:{
          'timeSlots': function(val, oldVal){
              this.$nextTick(function(){
                adaptCellWidth();
              });
          }
        },

        methods: {
          showScheduledSlot: function(timeSlot) {
            return timeSlot.shift;
          },
          showUnavailSlot: function(timeSlot) {
            return timeSlot.unavails && timeSlot.unavails.length > 0;
          },
          handleDragEnd: function(dragStartIdx, lastDragIdx, isNewShiftCreation) {
            if(dragStartIdx === lastDragIdx && !isNewShiftCreation){
              unassign(vueScope.$data.timeSlots[dragStartIdx]);
              reassignTimeSlots();
            }
            this.$dispatch('dragend');
          }
        },

        filters: {
					'day-time': function(date){
						return timeZoneUtils.parseInServerTimeAsMoment(date).format(this.$data.labelFormat);
					}
				}
      }

      function unassign(timeSlot) {
        timeSlot.shift = undefined;
        timeSlot.shiftStarts = undefined;
        timeSlot.shiftEnds = undefined;
      }

      function assign(timeSlot, start, end) {
        timeSlot.shift = true;
        if (start !== undefined) {
          timeSlot.shiftStarts = start;
        }
        if (end !== undefined) {
          timeSlot.shiftEnds = end;
        }
      }

      function unassignWhere(filter){
        _.chain(vueScope.$data.timeSlots)
         .filter(filter)
         .each(function(timeSlot){
           unassign(timeSlot);
         });
      }

      function reassignTimeSlots(){
        var firstAssignedIdx = _.findIndex(vueScope.$data.timeSlots, {shift: true});
        var lastAssignedIdx = _.findLastIndex(vueScope.$data.timeSlots, {shift: true});
        _.each(vueScope.$data.timeSlots, function(timeSlot, idx){
            unassign(timeSlot);
            if(idx === firstAssignedIdx){
              assign(timeSlot, true);
            } else if(idx === lastAssignedIdx){
              assign(timeSlot, false, true);
            } else if(idx > firstAssignedIdx && idx < lastAssignedIdx){
              assign(timeSlot);
            }
        });
      }

      function shouldHandleDrag(startIdx, movedIndexes, lastIdx){
        if(movedIndexes === 0){
          return false;
        }
        var idx = startIdx + movedIndexes;
        if(idx < 0 || idx >= vueScope.$data.timeSlots.length){
          return false;
        }
        if(idx === lastIdx){
          return false;
        }
        return true;
      }

      function handleDrag(currDragIdx, lastDragIdx){
        var timeslot = vueScope.$data.timeSlots[currDragIdx];
        if(timeslot.shift){
          var deltaIdx = currDragIdx - lastDragIdx;
          (deltaIdx > 0) && unassignWhere(function(el, idx){ return idx < currDragIdx; });
          (deltaIdx < 0) && unassignWhere(function(el, idx){ return idx > currDragIdx; });
        } else{
          assign(timeslot, true);
        }
        reassignTimeSlots();
      }

      function moveMarker($marker, deltaDragX){
        if($marker.length > 0){
            var offset = $marker.offset();
            offset.left = offset.left + deltaDragX;
            $marker.offset(offset);
        }
      }

      function cleanMarkerStyles($timeline){
        $timeline.find('.marker').removeAttr('style');
      }

      function initDragEvents() {
        var invalidDragStart = true;
        var dragStartIdx = undefined; // the timeslot-idx where dragging started
        var lastDragIdx = undefined; // the timeslot-idx the last drag-event took place
        var isNewShiftCreation = undefined; // if shift is created by action

        var lastDragX = undefined; // x-position of last encountered drag

        var $timeline = jQuery(vueScope.$el).find('[js-role="draggable-timeline"]');
        $timeline
          .on('dragstart', '.timeslot-cell', function(event, dragprops) {
            var $timeslot = jQuery(event.target).closest('.timeslot-cell');
            dragStartIdx = parseInt($timeslot.attr('data-idx'));
            lastDragIdx = dragStartIdx;
            var timeSlot = vueScope.$data.timeSlots[dragStartIdx];
            lastDragX = dragprops.startX;
            invalidDragStart = checkDragStartInvalid(dragStartIdx, timeSlot);
            if(!invalidDragStart && !timeSlot.shift){
              assign(timeSlot, true, true);
              reassignTimeSlots();
              isNewShiftCreation = true;
            }
          })
          .on('drag', '.timeslot-cell', function(event, dragprops) {
            var $timeslot = jQuery(event.target).closest('.timeslot-cell');
            var $marker = $timeslot.find('.marker');
            var delta = dragprops.deltaX;
            var slotWidth = $timeslot.outerWidth();
            var movedIndexes = Math.floor(Math.abs(delta)/slotWidth) * Math.sign(delta);
            var currDragX = dragprops.startX + delta;

            moveMarker($marker, currDragX - lastDragX);
            lastDragX = currDragX;

            if(!invalidDragStart && shouldHandleDrag(dragStartIdx, movedIndexes, lastDragIdx)){
              var idx = dragStartIdx + movedIndexes;
              handleDrag(idx, lastDragIdx);
              cleanMarkerStyles($timeline);
              lastDragIdx = idx;
            }
          })
          .on('dragend', function(event) {
            if(!invalidDragStart){
                vueScope.handleDragEnd(dragStartIdx, lastDragIdx, isNewShiftCreation);
                var $timeslot = jQuery(event.target).closest('.timeslot-cell');
                var $marker = $timeslot.find('.marker');
                cleanMarkerStyles($timeline);
            }
            lastDragX = undefined;
            dragStartIdx = undefined;
            lastDragIdx = undefined;
            invalidDragStart = true;
            isNewShiftCreation = undefined;
          })
          .on('mouseleave', function(event) {
            cleanMarkerStyles($timeline);
            $timeline.trigger('dragend');
          });
      }

      function checkDragStartInvalid(timeSlotIdx, timeSlot) {
        if (!timeSlot || hasShift() && !(timeSlot.shiftStarts || timeSlot.shiftEnds)) {
          return true;
        }
        return false;
      }

      function hasShift() {
        return !!_.findWhere(vueScope.$data.timeSlots, {
          shift: true
        });
      }

      function adaptCellWidth() {
        var $timeline = jQuery(vueScope.$el).find('.timeline');
        var cellWidth = $timeline.innerWidth() / vueScope.$data.timeSlots.length;
        cellWidth = Math.floor(cellWidth);
        $timeline.find('.timeslot-cell').outerWidth(cellWidth);
      }
    }

  });
