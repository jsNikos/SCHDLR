/*
 * Author: Nikos Kitzka
 */
define(['./TableController'], function(TableController){

	/**
	 * For documentation of options, see TableController.
	 * @param options : {rows: [RowModel], columns: [ColumnModel]}
	 */
	jQuery.fn.tableDecor = function(options){	
		var constrArgs = _.chain({$container : jQuery(this)}).extend(options).value();
		var tableController = new TableController(constrArgs);
		tableController.initView();
		tableController.view.drawGrid();
	};
	
});