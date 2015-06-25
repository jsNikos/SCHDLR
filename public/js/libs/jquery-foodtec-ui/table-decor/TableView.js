define(['text!./tableTmpl.html',
        'text!./cellTmpl.html',
        'text!./columnCellTmpl.html',
        './libs/jquery.scrollbarWidth'], 
function(tableTmpl_, cellTmpl_, columnCellTmpl_) {
	/**
	 * View for decor-table.
	 * @constructor
	 * @param args : {scope.controller}
	 */
	function TableView(args) {
		var scope = this;
		scope.controller = args.controller;		

		// el's		
		var $container = args.$container;
		var $tableDecor = undefined;		
		this.$allColumns = undefined;
		var $columnsContainer = undefined;
		this.$columns = undefined;
		this.$fixedColumns = undefined;
		var $fixedCells = undefined;
		var $cellContainer = undefined;
		var $cells = undefined;
		var $hscroller = undefined;
		var $vscroller = undefined;
		var $fixedFooterCells = undefined;
		var $footerContainer = undefined;
		var $footers = undefined;

		// dynamic layout configs
		var computedColumnHeight = undefined; // height of columns-container
		var	computedFixedColumnWidth = undefined; // width of column which are fixed
		var computedColumnsWidth = undefined; // width of all non-fixed columns together
		
		// templates
		var tableTmpl = _.template(tableTmpl_); // tmpl for the grid		
		var cellTmpl = _.template(cellTmpl_); // template which renders a cell
		this.columnCellTmpl = _.template(columnCellTmpl_); // template which renders a column-cell
		
		function init() {					
		}
		

		/**
		 * Based on controller's rows and columns, grid is drawn into
		 * container. Cleans-up container and triggers adjustLayout. Initializes all
		 * listener.
		 */
		this.drawGrid = function() {			
			// empty container
			$container.empty();						

			// render contents into container			
			$container.append(tableTmpl(scope.findGridTmplContext()));
			initEls();
			
			// adjust layout components
			scope.adjustLayout();
			initHScroller();			
		};
		
		/**
		 * The model which is delivered to tableTmpl.html
		 */
		this.findGridTmplContext = function(){
			return _.chain({				
				renderFixedRows : scope.renderFixedRows,				
				renderColumns : scope.renderColumns,
				renderFixedColumns : scope.renderFixedColumns,
				renderRows : scope.renderRows
			}).extend(scope.controller).value(); 
		};
		
		/**
		 * Invoked when data-cell, footer-cell is about to be rendered in template.
		 * @param: args : {row: RowModel, column: ColumnModel, colidx: integer, width (optional)}
		 * @returns : html-snippet to render
		 */
		this.createDataCell = function(args){			
			var width = args.width || scope.controller.columnWidth;
			var $cell =	jQuery(cellTmpl(args)).css({width: width, height: scope.controller.rowHeight});
			$cell = scope.controller.onRenderDataCell(_.chain(args).extend({$cell: $cell}).value());			
			return jQuery('<div></div>').append($cell).html();
		};
		
		/**
		 * Same as 'createDataCell' but renders as fixed data-cell.
		 */
		function createFixedDataCell(args){
			args.width = scope.controller.fixedColumnWidth;
			return scope.createDataCell(args);
		}
		
		/**
		 * Creates a column-cell.		  
		 * @param args : {column : ColumnModel, colidx : integer, width (optional)}
		 * @return : html-snippet to render
		 */
		this.createColumnCell = function(args){
			var width = args.width || scope.controller.columnWidth;
			var $cell = jQuery(scope.columnCellTmpl(args)).css({width: width, height: scope.controller.columnHeight});
			$cell = scope.controller.onRenderColumnCell(_.chain(args).extend({$cell: $cell}).value());			
			return jQuery('<div></div>').append($cell).html();
		};
		
		this.createFixedColumnCell = function(args){
			args.width = scope.controller.fixedColumnWidth;
			return scope.createColumnCell(args);
		};
		
		/**
		 * Renders the given columns and returns the html.
		 * @param columns
		 * @param cellCreator : either 'createFixedColumnCell' or 'createColumnCell'
		 * @returns columns-html
		 */
		this.renderColumns = function(columns, cellCreator){
			cellCreator = cellCreator || scope.createColumnCell;
			var $holder = jQuery('<div></div>');
			_.chain(columns).each(function(column, idx){
				$holder.append(cellCreator({column : column, colidx : idx}));
			});
			return $holder.html();
		};
		
		/**
		 * Renders the given columns as fixed cells.
		 */
		this.renderFixedColumns = function(columns){
			return scope.renderColumns(columns, scope.createFixedColumnCell);
		};
		
		/**
		 * Renders cells of given rows which are in given columns.		  
		 * @param columns : [ColumnModel]
		 * @param rows : {RowModel} is given is restricted to them
		 * @param cellRenderer : either 'createFixedDataCell' or 'createDataCell'
		 * @returns rows-html
		 */
		this.renderRows = function(columns, cellRenderer, rows){
			cellRenderer = cellRenderer || scope.createDataCell; 
			var $holder = jQuery('<div></div>');
			_.chain(rows).each(function(row, rowidx){				
				var $row = scope.$createRow(row).appendTo($holder);
				_.chain(columns).each(function(column, colidx){ 
					$row.append(cellRenderer({row: row, column: column, colidx: colidx}));	 			  
				});  
			});
			return $holder.html();
		};
		
		/**
		 * Renders cells of given rows as fixed-cells corresp. to given columns.
		 */
		this.renderFixedRows = function(columns, rows){
			return scope.renderRows(columns, createFixedDataCell, rows);
		};
		
		/**
		 * Creates a row.
		 * @params row : RowModel
		 */
		this.$createRow = function(row){
			return jQuery('<div></div>')
					.addClass('row')
					.attr('data-rowid', row.id);
		};
		
		/**
		 * Initializes el's
		 */
		function initEls(){			
			$tableDecor = jQuery('.table-decor', $container);			
			scope.$allColumns = jQuery('.all-columns', $tableDecor);
			$columnsContainer = jQuery('.columns-container', $tableDecor);			
			scope.$columns = jQuery('.columns', $columnsContainer);
			scope.$fixedColumns = jQuery('.fixed-columns', scope.$allColumns);
			$fixedCells = jQuery('.fixed-cells', $tableDecor);
			$cellContainer = jQuery('.cell-container', $tableDecor);
			$cells = jQuery('.cells', $cellContainer);
			$hscroller = jQuery('.hscroller', $tableDecor);
			$vscroller = jQuery('.vscroller', $tableDecor);
			$fixedFooterCells = jQuery('.fixed-footer-cells', $tableDecor);
			$footerContainer = jQuery('.footer-container', $tableDecor);
			$footers = jQuery('.footers', $tableDecor);
		}

		/**
		 * Adjusts layout-components to each other. Dependencies are layoutSetting
		 * and css controlled width/height of container.
		 */
		this.adjustLayout = function() {			
			computedColumnHeight = computeColumnHeight();
			computedFixedColumnWidth = computeFixedColumnWidth();
			computedColumnsWidth = computeColumnsWidth(); 
			$tableDecor.css({width: scope.controller.tableWidth, height: scope.controller.tableHeight});							

			scope.$allColumns.css({
				height : computedColumnHeight,
				width : scope.controller.tableWidth
			});

			$columnsContainer.css({
				height : computedColumnHeight,
				width : scope.controller.tableWidth - computedFixedColumnWidth,
				left : computedFixedColumnWidth
			});
			
			scope.$columns.css({
				height : computedColumnHeight,
				width : computedColumnsWidth
			});
			
			scope.$fixedColumns.css({
				height : computedColumnHeight,
				width : computedFixedColumnWidth				
			});		

			$vscroller.css({
				top : computedColumnHeight,
				height : scope.controller.tableHeight - computedColumnHeight - (scope.controller.fixFooter && scope.controller.rowHeight),
				width : scope.controller.tableWidth + jQuery.scrollbarWidth()
			});
			
			$fixedCells.css({				
				width : computedFixedColumnWidth				
			});
			
			$cells.css({
				width : computedColumnsWidth
			});
			
			$cellContainer.css({				
				left : computedFixedColumnWidth,
				width : scope.controller.tableWidth - computedFixedColumnWidth				
			});
			
			if(scope.controller.fixFooter){
				adjustLayoutFooter();
			}	
			
			$hscroller.css({
				left : computedFixedColumnWidth,
				top : scope.controller.tableHeight,
				width : scope.controller.tableWidth - computedFixedColumnWidth
			});			
			jQuery('.fake', $hscroller).width(computedColumnsWidth);
		};
		
		/**
		 * Adjusting layout for footer row.
		 */
		function adjustLayoutFooter(){
			$fixedFooterCells.css({
				width : computedFixedColumnWidth,
				height : scope.controller.rowHeight
			});
			
			$footerContainer.css({
				left : computedFixedColumnWidth,
				width : scope.controller.tableWidth - computedFixedColumnWidth,
				height : scope.controller.rowHeight
			});
			
			$footers.css({
				height : scope.controller.rowHeight,
				width : computedColumnsWidth
			});
		}
		
		/**
		 * Sums-up the width of all columns (non-fixed).
		 * @return integer
		 */
		function computeColumnsWidth(){
			var width = 0;
			scope.$columns.children('.tableCell')
				.each(function(){
					width += jQuery(this).outerWidth();
				});
			return width;
		}
		
		/**
		 * Computes columns-height by taking the maximal height of column-cells.
		 * @return integer
		 */
		function computeColumnHeight(){
			var height = 0;
			scope.$columns.children('.tableCell')
				.add(scope.$fixedColumns.children('.tableCell'))
				.each(function(){
					height = Math.max(height, jQuery(this).outerHeight());
				 });
			return height;
		}
		
		/**
		 * Takes the width of the first column-cell.
		 * returns integer
		 */
		function computeFixedColumnWidth(){			
			return jQuery('.tableCell[data-id="'+scope.controller.columns[0].id+'"]', scope.$fixedColumns).outerWidth();			
		}
		
		/**
		 * Finds column-el by id.
		 * @param columnId
		 * @return the column
		 */
		this.$findColumnById = function(columnId){
			return jQuery('[data-id="'+columnId+'"]', scope.$allColumns);
		};

		/** 
		 * Supports synchronized horizontal scrolling of cells-table and columns.
		 * h-scrolling triggers transitions of cells-table and columns.		  
		 * 
		 */
		function initHScroller() {
			$hscroller.on('scroll', function(event) {
				var scroll = $hscroller.scrollLeft();
				_.chain([scope.$columns, $cells, $footers]).each(function($contents){
					$contents && $contents.css('left', -scroll + 'px');
				});			
			});
		}	
		

		init();
		
		
		
	}

	return TableView;
});