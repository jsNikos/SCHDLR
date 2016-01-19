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
          handleDrag: function(timeSlot, idx) {
            if (timeSlot.shift) {
              timeSlot.shift = undefined;
              timeSlot.shiftStarts = undefined;
              timeSlot.shiftEnds = undefined;
            } else {
              timeSlot.shift = true;
              timeSlot.shiftStarts = idx === 0 || !vueScope.$data.model.timeSlots[idx - 1].shift;
              timeSlot.shiftEnds = idx === (vueScope.$data.model.timeSlots.length - 1) || !vueScope.$data.model.timeSlots[idx + 1].shift;
            }
          },
          handleDragEnd: function() {
            console.log('dragend');
            //TODO
          }
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
            console.log(dragprops.deltaX);
            if (invalidDragStart) {
              return;
            }
            var idx = jQuery(event.target).data('idx');
            if (currDraggedTimeSlotIdx === idx) {
              return;
            }
            currDraggedTimeSlotIdx = idx;
            vueScope.handleDrag(vueScope.$data.model.timeSlots[idx], idx);
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
