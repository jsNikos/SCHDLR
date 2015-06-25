define(function(){
	return RowModel;
	
	function RowModel(){
		var scope = this;
		
		// String
		this.id;		
		// [CellModel]
		this.cells;
		
		var fastAccess = {}; // columnId -> Cell
		
		function init(){
			// init fast access 
			_.chain(scope.cells).each(function(cell){
				fastAccess[cell.columnId] = cell;
			});			
		}
		
		/**
		 * Get the cell in this row in the given column.
		 */
		this.findCell = function(column){
			return fastAccess[column.id];
		};
		
		init();
	};
	
});