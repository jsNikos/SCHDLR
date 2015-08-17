define(['./TableController',
        './HierarchyTableView',
        './hierarchyModelUtils'],
function(TableController, HierarchyTableView, hierarchyModelUtils){
	
	return function(args){
		HierarchyTableController.prototype = hierarchyModelUtils;
		return new HierarchyTableController(args);
	};
	
	/**
	 * This extends the tableController by adding functionality to render hierarichal data.
	 * That is where columns and rows define hierarchies and cells are attached to each node-combination.
	 * @args : extends the args of tableController, for own see options-section 
	 */
	function HierarchyTableController(args){
		var scope = this;		
		// options
		
		// inheritance - this call init and extends this by args
		TableController.call(this, args);
		
		// model
		this.columns = hierarchyModelUtils.addToModel(this.columns);		
		this.rows = hierarchyModelUtils.addToModel(this.rows);		
		
		/**
		 * Initializes the view.
		 */
		this.initView = function(){			
			// init view			
			this.view = new HierarchyTableView({
				$container : args.$container,
				controller : scope
			});
		};		
	}
	
	// model types
	HierarchyTableController.RowModel = function(){
		// inheritance
		RowModel.call(this);		
		this.parent; // RowModel
		this.childs; // [RowModel]
		this.level; // int 0-based	
		this.open; // if rendered as open-node
	};
	
	HierarchyTableController.ColumnModel = function(){
		// inheritance
		TableController.ColumnModel.call(this);		
		this.parent; // ColumnModel
		this.childs; // [ColumnModel]
		this.level; // int 0-based
		this.open; // if rendered as open-node
	};
	
	HierarchyTableController.CellModel = function(){
		// inheritance
		TableController.CellModel.call(this);		
	};
	
	
});