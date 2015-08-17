/*
 * Author: Nikos Kitzka
 */
define(['./HierarchyTableController'], function(HierarchyTableController){

	/**
	 * For documentation of options, see HierarchyTableController.
	 * @param options : {rows: [RowModel], columns: [ColumnModel]}
	 */
	jQuery.fn.hierarchyTableDecor = function(options){	
		var constrArgs = _.chain({$container : jQuery(this)}).extend(options).value();
		var hierarchyTableController = new HierarchyTableController(constrArgs);
		hierarchyTableController.initView();
		hierarchyTableController.view.drawGrid();
	};
	
});