define(['text!shiftEditor/timeline/timeline.html',
    'underscore',
    'css!shiftEditor/timeline/timeline.css',
    'css!fontawsome',
    'jquery.event.drag-2.2'
  ],
  function(timelineHtml, _) {
    return TimelineComponent;

    function TimelineComponent() {
      var vueScope = undefined;

      return {
        template: timelineHtml,

        props: ['model'],

        ready: function() {
          vueScope = this;
          adaptCellWidth();
          initDragEvents();
        },

        methods: {
          showScheduledSlot: function(timeSlot) {
            console.log(timeSlot.shift);
            return timeSlot.shift && timeSlot.unavails.length === 0;
          },
          showUnavailSlot: function(timeSlot) {
            return timeSlot.shift && timeSlot.unavails.length > 0;
          },
          handleDrag: function(timeSlot, idx, prevIdx) {
            var prev = prevIdx && vueScope.$data.model.timeSlots[prevIdx]; // previous drag target
            var left = vueScope.$data.model.timeSlots[idx - 1];
            var right = vueScope.$data.model.timeSlots[idx + 1];
            var hasLeft = left && left.shift;
            var hasRight = right && right.shift;

            // only one slot
            if (timeSlot.shiftStarts && timeSlot.shiftEnds) {
              unassign(timeSlot);
              return;
            }

            // no further handle of start or end
            if(timeSlot.shiftStarts || timeSlot.shiftEnds){
              return;
            }

            // starting new shift
            if (!timeSlot.shift && !hasLeft && !hasRight) {
              assign(timeSlot, true, true);
              return;
            }

            // shift has at least 2 slots
            if (timeSlot.shift) {
              // drag end to left
              if (hasRight && right.shiftEnds) {
                unassign(right);
                assign(timeSlot, undefined, true);
                return;
              }

              // drag start to right
              if (hasLeft && left.shiftStarts) {
                unassign(left);
                assign(timeSlot, true, undefined);
                return;
              }
            }

            if (!timeSlot.shift) {
              // drag start to left
              if (hasRight) {
                assign(timeSlot, true, false);
                assign(right, false, undefined);
                return;
              }

              // drag end to right
              if (hasLeft) {
                assign(timeSlot, false, true);
                assign(left, undefined, false);
                return;
              }
            }
          },
          handleDragEnd: function() {
            console.log('dragend');
            //TODO
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

      function initDragEvents() {
        var invalidDragStart = false;
        var currDraggedTimeSlotIdx = undefined; // last drag-event's target

        jQuery(vueScope.$el).find('[js-role="draggable-timeline"]')
          .on('dragstart', '.timeslot-cell', function(event) {
            var idx = jQuery(event.target).data('idx');
            invalidDragStart = checkDragStartInvalid(idx, vueScope.$data.model.timeSlots[idx]);
          })
          .on('drag', '.timeslot-cell', function(event, dragprops) {
            if (invalidDragStart) {
              return;
            }
            var idx = jQuery(event.target).data('idx');
            // ensure to trigger drag only once per cell
            if (currDraggedTimeSlotIdx === idx) {
              return;
            }
            var prevIdx = currDraggedTimeSlotIdx;
            currDraggedTimeSlotIdx = idx;
            vueScope.handleDrag(vueScope.$data.model.timeSlots[idx], idx, prevIdx);
          })
          .on('dragend', function(event) {
            currDraggedTimeSlotIdx = undefined;
            invalidDragStart = false;
            vueScope.handleDragEnd();
          });

        function checkDragStartInvalid(timeSlotIdx, timeSlot) {
          var hasShift = !!_.findWhere(vueScope.$data.model.timeSlots, {
            shiftStarts: true
          });
          if (hasShift && !(timeSlot.shiftStarts || timeSlot.shiftEnds)) {
            return true;
          }
          return false;
        }
      }

      function adaptCellWidth() {
        var $timeline = jQuery(vueScope.$el).find('.timeline');
        var cellWidth = $timeline.innerWidth() / vueScope.$data.model.timeSlots.length;
        cellWidth = Math.min(10, Math.floor(cellWidth));
        $timeline.find('.timeslot-cell').outerWidth(cellWidth);
      }
    }

  });
