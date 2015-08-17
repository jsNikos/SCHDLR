define(['./TableView', 'underscore-ext'], function(TableView){
	
	return HierarchyTableView;
	
	/**
	 * View extending TableView and supporting to show hierarchies in columns and rows.
	 */
	function HierarchyTableView(args){
		var scope = this;		
		// inheritance
		TableView.call(this, args);
			
		
		/**
		 * Renders the given columns and returns the html.
		 * Iterates the hierarchy.
		 * @param columns : [ColumModel]
		 * @param cellCreator : either 'createFixedColumnCell' or 'createColumnCell'
		 */
		this.renderColumns = function(columns, cellCreator){
			cellCreator = cellCreator || scope.createColumnCell;
			var $rootLevel = jQuery('<div></div>');
			
			// visit nodes in hierarchy and create corresp. dom-tree.
			_ext.visitNodes(columns, visitor, $rootLevel);
			
			function visitor(column, colidx, $levelContainer){
				var $nextLevel = $createLevelContainer();
				var $column = jQuery(cellCreator({column : column, colidx : colidx}))				
								   .append($nextLevel)
								   .appendTo($levelContainer);
				return $nextLevel;
			}			
			return $rootLevel.html();
		};
		
		/**
		 * Renders cells underneath given root-rows which are underneath given root-columns.
		 * It is extracted which row-level and which column-level are to be shown, based on
		 * the open-status of rows/columns.		  
		 * @param columns : [ColumnModel]
		 * @param rows : {RowModel} is given is restricted to them
		 * @param cellRenderer : either 'createFixedDataCell' or 'createDataCell'
		 * @returns rows-html
		 */
		this.renderRows = function(columns, cellRenderer, rows){
			cellRenderer = cellRenderer || scope.createDataCell; 
			var $holder = jQuery('<div></div>');
			var displayedRows = scope.controller.findDisplayedNodes(rows);
			var displayedCols = scope.controller.findDisplayedNodes(columns);
			_.chain(displayedRows).each(function(row, rowidx){				
				var $row = scope.$createRow(row).appendTo($holder);
				_.chain(displayedCols).each(function(column, colidx){					
					$row.append(cellRenderer({row: row, column: column, colidx: colidx}));	 			  
				});  
			});
			return $holder.html();
		};
			
		
		/**
		 * Iterates through columns and adapts sizes by summing-up required sizes for
		 * lower levels.
		 */
		function adjustColumnSizes(){
			visitCells(scope.$fixedColumns.children('.tableCell'), postVisitor);
			visitCells(scope.$columns.children('.tableCell'), postVisitor);
			
			// invoked after iterating all childs first
			function postVisitor($tableCell){				
				var height = 0;
				var width = 0;
				var heightLevelCont = 0;
				var $levelContainer = $tableCell.children('.level-container');
				$tableCell.children('.content').height($tableCell.height());
				$levelContainer.children('.tableCell')
					.each(function(){
						var $child = jQuery(this); 
						height = Math.max(height, $child.height());
						width += $child.width();
						heightLevelCont = Math.max(heightLevelCont, $child.height());
					});
				$tableCell.height($tableCell.height() + height)
						  .width(width || $tableCell.width());
				$levelContainer.height(heightLevelCont);
			}
		}
		
		var super_adjustLayout = this.adjustLayout;
		this.adjustLayout = function(){
			adjustColumnSizes();
			super_adjustLayout.call(this);
			adjustHeightOfLeafCols();			
		};
		
		/**
		 * For all columns displayed as leaf, the height is extended to fully use
		 * the all-columns container height.
		 */
		function adjustHeightOfLeafCols(){
			_.chain(scope.controller.columns.findDisplayedNodes()).each(function(column){
				var $column = scope.$findColumnById(column.id);
				var height = $column.height();
				// add the missing height
				height += scope.$allColumns.height() - ($column.offset().top + height - scope.$allColumns.offset().top);			
				$column.height(height);
				$column.children('.content').outerHeight(height);
			});			
		}
		
		function adjustRowSizes(){
			//TODO and apply
		}	
		
		
		/**
		 * Iterates through given tableCell-hierarchy.
		 * @param $tableCells
		 * @param postVisitor : is invoked after all child's are iterated
		 * @param context
		 */
		function visitCells($tableCells, postVisitor){			
			$tableCells.each(function(){
				iterate(jQuery(this));
			});
			
			function iterate($tableCell){					
				jQuery('.level-container', $tableCell).children('.tableCell')				
					.each(function(){
						iterate(jQuery(this));
					});
				postVisitor($tableCell);	
			}			
		};
		
		/**
		 * Creates a container for column/row cells suitable to display next level cells
		 * in hierarchy. 
		 */
		function $createLevelContainer(){
			return jQuery('<div></div>').addClass('level-container');
		}
		
		
		
	}
	
});