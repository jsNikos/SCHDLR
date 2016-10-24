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
      jQuery(this.$el).find('option').each(function() {
        var $option = jQuery(this);
        if(vuescope.$data.selected && $option.val() === vuescope.$data.selected[vuescope.$data.valueprop]){
          $option.attr('selected', 'selected');
        }
      });
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
