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
            return timeSlot.shift && timeSlot.unavails.length === 0;
          },
          showUnavailSlot: function(timeSlot) {
            return timeSlot.shift && timeSlot.unavails.length > 0;
          },
          handleDrag: handleDrag,
          handleDragEnd: function() {
            this.$emit('dragend');
          }
        }
      }

      function handleDrag(timeSlot, idx, prevIdx) {
        var prev = prevIdx != undefined && vueScope.$data.model.timeSlots[prevIdx]; // previous drag target
        var left = vueScope.$data.model.timeSlots[idx - 1];
        var right = vueScope.$data.model.timeSlots[idx + 1];
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

      function initDragEvents() {
        var invalidDragStart = true;
        var currDraggedTimeSlotIdx = undefined; // last drag-event's target

        var $timeline = jQuery(vueScope.$el).find('[js-role="draggable-timeline"]');
        $timeline
          .on('dragstart', '.timeslot-cell', function(event) {
            var idx = jQuery(event.target).data('idx');
            invalidDragStart = checkDragStartInvalid(idx, vueScope.$data.model.timeSlots[idx]);
          })
          .on('drag', '.timeslot-cell', function(event, dragprops) {
            if (invalidDragStart) {
              return;
            }

            // ensure valid drag target
            var idx = jQuery(event.target).data('idx');
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
            vueScope.handleDrag(vueScope.$data.model.timeSlots[idx], idx, prevIdx);
          })
          .on('dragend', function(event) {
            currDraggedTimeSlotIdx = undefined;
            invalidDragStart = true;
            vueScope.handleDragEnd();
          })
          .on('mouseleave', function(event) {
            $timeline.trigger('dragend');
          });

        function checkDragStartInvalid(timeSlotIdx, timeSlot) {
          if (!timeSlot || hasShift() && !(timeSlot.shiftStarts || timeSlot.shiftEnds)) {
            return true;
          }
          return false;
        }
      }

      function hasShift() {
        return !!_.findWhere(vueScope.$data.model.timeSlots, {
          shiftStarts: true
        });
      }

      function adaptCellWidth() {
        var $timeline = jQuery(vueScope.$el).find('.timeline');
        var cellWidth = $timeline.innerWidth() / vueScope.$data.model.timeSlots.length;
        cellWidth = Math.min(10, Math.floor(cellWidth));
        $timeline.find('.timeslot-cell').outerWidth(cellWidth);
      }
    }

  });
