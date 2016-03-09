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
          handleDragEnd: function() {
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

      function handleDrag(idx){
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
        var dragStartIdx = undefined; // the timeslot-idx where dragging started
        var lastDragIdx = undefined; // the timeslot-idx the last drag-event took place

        var $timeline = jQuery(vueScope.$el).find('[js-role="draggable-timeline"]');
        $timeline
          .on('dragstart', '.timeslot-cell', function(event, dragprops) {
            var $timeslot = jQuery(event.target).closest('.timeslot-cell');
            dragStartIdx = parseInt($timeslot.attr('data-idx'));
            lastDragIdx = dragStartIdx;
            var timeSlot = vueScope.$data.timeSlots[dragStartIdx];
            invalidDragStart = checkDragStartInvalid(dragStartIdx, timeSlot);
            if(timeSlot.shift){
              unassign(timeSlot);
              reassignTimeSlots();
            }
          })
          .on('drag', '.timeslot-cell', function(event, dragprops) {
            var $timeslot = jQuery(event.target).closest('.timeslot-cell');
            var delta = dragprops.deltaX;
            var slotWidth = $timeslot.outerWidth();
            var movedIndexes = Math.floor(delta/slotWidth);
            if(!invalidDragStart && shouldHandleDrag(dragStartIdx, movedIndexes, lastDragIdx)){
              var idx = dragStartIdx + movedIndexes;
              handleDrag(idx);
              lastDragIdx = idx;
            }
          })
          .on('dragend', function(event) {
            dragStartIdx = undefined;
            lastDragIdx = undefined;
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
        cellWidth = Math.floor(cellWidth);
        $timeline.find('.timeslot-cell').outerWidth(cellWidth);
      }
    }

  });
