define(['underscore'], function(_){
  return SelectDecor;

  function SelectDecor(options) {
    var options = options || {};

    this.handleReady = function() {
      jQuery(this.$el).selectDecor({width: null});
    };

    this.handleChange = function(event) {
      var vuescope = this;
      var selectedValue = jQuery(this.$el).selectDecor('selected').value;
      this.$data.selected = _.find(this.$data.elements, function(el) {
        return el[vuescope.$data.valueprop] === selectedValue;
      });
    };

    this.handleSelectedChanged = function() {
      var vuescope = this;
      var foundOption = false;
      var $options = jQuery(this.$el).find('option');

      $options.removeAttr('selected')
      .each(function() {
        var $option = jQuery(this);
        if(vuescope.$data.selected && $option.val() === vuescope.$data.selected[vuescope.$data.valueprop]){
          $option.attr('selected', 'selected');
          foundOption = true;
        }
      });

      if(!foundOption && vuescope.$data.elements.length > 0){
         $options.first().attr('selected', 'selected');
         vuescope.$data.selected = vuescope.$data.elements[0];
      }

      jQuery(this.$el).selectDecor('refresh');
    };

    return {
      template:
        '<select v-on:change="handleChange"> ' +
        ' <option v-for="element in elements" v-bind:value="element[valueprop]">{{element | displayFilter}}</option> ' +
        '</select> ',
      props: ['selected', 'elements', 'displayprop', 'valueprop'],
      methods: {
        handleChange: this.handleChange
      },
      ready: this.handleReady,
      watch: {
        'selected': this.handleSelectedChanged
      },
      filters: {
        displayFilter: options.displayFilter || function(element){
          return element[this.$data.displayprop];
        }
      }
    }


  }
});
