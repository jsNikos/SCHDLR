define(['underscore-ext'], function(){
	
	return new HierarchyModelUtils();
	
	/**
	 * Utilities supporting hierarchy-table models.
	 * 
	 */
	function HierarchyModelUtils(){
		
		/**
		 * Add this model-utils to given nodes by creating an object
		 * which extends the nodes-array by this instance.
		 * @param nodes : Array
		 * @returns : instance extending nodes
		 */
		this.addToModel = function(nodes){
			var scope = this;
			var Constr = function(){
				_.extend(this, scope);
			};
			Constr.prototype = nodes;
			return new Constr();
		};
		
		/**
		 * Searches the hierarchy for cells to display.
		 * parent: open, this: leaf or closed
		 * @param nodes : {id, child: [Node]}, may be undefined then 'this' is taken
		 * @returns [Node]
		 */
		this.findDisplayedNodes = function(nodes){
			var result = [];
			_ext.visitNodes(nodes || this, visitor);
			
			function visitor(node, colidx){
				if(!node.open || !node.childs || node.childs.length === 0){
					// is displayed
					result.push(node);
					return false;
				} 
			}			
			return result;
		};
	}	
	
});