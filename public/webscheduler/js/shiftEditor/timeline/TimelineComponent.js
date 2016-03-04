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
        props: ['timeSlots', 'openLabel', 'closeLabel'],

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
          handleDrag: handleDrag,
          handleDragEnd: function() {
            this.$dispatch('dragend');
          }
        },

        filters: {
					'day-time': function(date){
						return timeZoneUtils.parseInServerTimeAsMoment(date).format('h:mm a');
					}
				}
      }

      function handleDrag(timeSlot, idx, prevIdx) {
        var prev = prevIdx != undefined && vueScope.$data.timeSlots[prevIdx]; // previous drag target
        var left = vueScope.$data.timeSlots[idx - 1];
        var right = vueScope.$data.timeSlots[idx + 1];
        var hasLeft = left && left.shift;
        var hasRight = right && right.shift;

        // only one slot (drag started here)
        if (timeSlot.shiftStarts && timeSlot.shiftEnds) {
          unassign(timeSlot);
          return;
        }

        // starting new shift (drag started here)
        if (!hasShift()) {
          assign(timeSlot, true, true);
          return;
        }

        // shift has at least 2 slots
        if (timeSlot.shift) {
          // drag end to left
          if (prev.shiftEnds) {
            unassign(prev);
            assign(timeSlot, undefined, true);
            return;
          }

          // drag start to right
          if (prev.shiftStarts) {
            unassign(prev);
            assign(timeSlot, true, undefined);
            return;
          }
        }

        if (!timeSlot.shift) {
          // drag start to left
          if (prev.shiftStarts) {
            assign(timeSlot, true, false);
            assign(prev, false, undefined);
            return;
          }

          // drag end to right
          if (prev.shiftEnds) {
            assign(timeSlot, false, true);
            assign(prev, undefined, false);
            return;
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

      function shouldHandleDragMarker(startIdx, movedIndexes, lastIdx){
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

      function handleDragMarker(idx){
        var timeslot = vueScope.$data.timeSlots[idx];
        if(timeslot.shift){
          unassign(timeslot);
        } else{
          assign(timeslot, true);
        }
        reassignTimeSlots();
      }

      function initDragEvents() {
        var invalidDragStart = true;
        var currDraggedTimeSlotIdx = undefined; // last drag-event's target
        var markerDragStartIdx = undefined; // the timeslot-idx where marker-drag started
        var lastMarkerDragIdx = undefined; // the timeslot-idx the last drag-event took place

        var $timeline = jQuery(vueScope.$el).find('[js-role="draggable-timeline"]');
        $timeline
          .on('dragstart', '.marker', function(event, dragprops) {
            var $timeslot = jQuery(event.target).closest('.timeslot-cell');
            markerDragStartIdx = parseInt($timeslot.attr('data-idx'));
            lastMarkerDragIdx = markerDragStartIdx;
            var timeSlot = vueScope.$data.timeSlots[markerDragStartIdx];
            invalidDragStart = checkDragStartInvalid(markerDragStartIdx, timeSlot);
            if(timeSlot.shift){
              unassign(timeSlot);
              reassignTimeSlots();
            }
          })
          .on('drag', '.marker', function(event, dragprops) {
            var $timeslot = jQuery(event.target).closest('.timeslot-cell');
            var delta = dragprops.deltaX;
            var slotWidth = $timeslot.outerWidth();
            var movedIndexes = Math.floor(delta/slotWidth);
            if(!invalidDragStart && shouldHandleDragMarker(markerDragStartIdx, movedIndexes, lastMarkerDragIdx)){
              var idx = markerDragStartIdx + movedIndexes;
              handleDragMarker(idx);
              lastMarkerDragIdx = idx;
            }
          })
          .on('dragstart', '.timeslot-cell', function(event) {
            var $target = jQuery(event.target);
            if(!$target.hasClass('timeslot-cell')){
              return;
            }
            var idx = $target.data('idx');
            invalidDragStart = checkDragStartInvalid(idx, vueScope.$data.timeSlots[idx]);
          })
          .on('drag', '.timeslot-cell', function(event, dragprops) {
            var $target = jQuery(event.target);
            if (!$target.hasClass('timeslot-cell') || invalidDragStart) {
              return;
            }

            // ensure valid drag target
            var idx = $target.data('idx');
            if (idx == undefined) {
              $timeline.trigger('dragend');
              return;
            }

            // ensure to trigger drag only once per cell
            if (currDraggedTimeSlotIdx === idx) {
              return;
            }
            // ensure not ot skip drags because browser didn't fire mousemove
            if (Math.abs(idx - currDraggedTimeSlotIdx) > 1) {
              return;
            }
            var prevIdx = currDraggedTimeSlotIdx;
            currDraggedTimeSlotIdx = idx;
            vueScope.handleDrag(vueScope.$data.timeSlots[idx], idx, prevIdx);
          })
          .on('dragend', function(event) {
            currDraggedTimeSlotIdx = undefined;
            markerDragStartIdx = undefined;
            lastMarkerDragIdx = undefined;
            if(!invalidDragStart){
                vueScope.handleDragEnd();
            }
            invalidDragStart = true;
          })
          .on('mouseleave', function(event) {
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
          shiftStarts: true
        });
      }

      function adaptCellWidth() {
        var $timeline = jQuery(vueScope.$el).find('.timeline');
        var cellWidth = $timeline.innerWidth() / vueScope.$data.timeSlots.length;
        cellWidth = Math.min(10, Math.floor(cellWidth));
        $timeline.find('.timeslot-cell').outerWidth(cellWidth);
      }
    }

  });
