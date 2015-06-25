define(['./TableView', './RowModel'], function(TableView, RowModel){
	if(!window._){
		throw new Error('underscore.js is required!');
	}
	
	return TableController;
	
	/**
	 * Controller for a table which allows horizontal and vertical scrolling while having a header
	 * and the first column fixed. If footer-option is enabled additionally fixes the last row.
	 * @param args : {$container,
	 * 				   rows: [RowModel],
	 * 				columns: [ColumnModel],
	 * 				fixFooter : boolean
	 * 			    cellWidth,
	 * 			     rowWidth, ... see options in callbacks in controller}, $container - the container in which the chart is drawn.
	 * @constructor
	 */
	function TableController(args){
		var scope = this;
		this.view = undefined;
		
		// options:		
		this.columnWidth = 60; // column width
		this.fixedColumnWidth = 70; // width of fixed columns 
		this.rowHeight = 30; // data-row height
		this.columnHeight = 40; // header-column height
		this.tableWidth = 400;
		this.tableHeight = 150;
		this.fixFooter = false; 
		this.formatColumnLabel = function(column){ return column.label; }; // called when column's label is rendered - method can return html		
		
		/**
		 * Called when cell is rendered. 
		 * @param args : {row: RowModel, column: ColumnModel, colidx: integer, $cell}
		 * @return jQuery-node which is rendered as cell, (see cellTmpl)
		 */ 
		this.onRenderDataCell = function(args){ return args.$cell; }; 
		/**
		 * Like 'onRenderDataCell' but for column-cells.
		 * @param args : {column: ColumnModel, colidx: integer, $cell}
		 * @return jQuery-node which is rendered as cell, (see columnCellTmpl)
		 */
		this.onRenderColumnCell = function(args){ return args.$cell; };
		
		// models (the data to render):
		this.rows = []; // [RowModel]
		this.columns = []; // [ColumnModel]				

		function init() {
			_.chain(scope).extend(args);		
			scope.rows = initRowModels(scope.rows);
		}
		
		/**
		 * Based in given rows creates RowModel-instance and returns as array.
		 * @param rows
		 * @return [RowModel]
		 */
		function initRowModels(rows){
			var result = [];
			_.chain(rows).each(function(row){
				RowModel.prototype = row;
				result.push(new RowModel());
			});			
			return result;
		}
		
		/**
		 * Initializes the view.
		 */
		this.initView = function(){
			// init view			
			this.view = new TableView({
				$container : args.$container,
				controller : scope
			});
		};
		
		init();
	}	
	
	/**
	 * Model for a column.
	 */
	TableController.ColumnModel = function(){
		// String
		this.id;
		// String
		this.label;
	};
	
	/**
	 * Model for a cell
	 */
	TableController.CellModel = function(){
		// String
		this.rowId;
		// String
		this.columnId;		
		// any primitive
		this.value;		
	};	
	
});

