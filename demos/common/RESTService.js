
var RESTService = (function(){
	function getJSONGraph(url, nbChilds, maxDepth, callback){
		var start = new Date().getTime();
		var nodes = [];
		var root = createGraphNode(url);
		nodes.push(root);
		
		generateSubgraph(nodes, root, nbChilds, 0, maxDepth);
		generateParentgraph(nodes, root, nbChilds, 0, maxDepth);
		
		console.log('json generated in '+(new Date().getTime()-start)+' ms');
		callback(nodes);
	}

	function getJSONTree(url, nbChilds, maxDepth, callback){
		var start = new Date().getTime();
		var root = createNode(url);
		generateSubtree(root, nbChilds, 0, maxDepth);
		generateParenttree(root, nbChilds, 0, maxDepth);
		console.log('json generated in '+(new Date().getTime()-start)+' ms');
		callback(root);
	}

	function generateSubgraph(nodes, root, nbChilds, depth, maxDepth){
		if(depth < maxDepth){
			for(var i = 1; i <= nbChilds; i++){
				var node = createGraphNode(root.id+'_'+i);
				node.adjacencies.push(root.id+'_'+(i%nbChilds+1));
				nodes.push(node);
				root.adjacencies.push(node.id);
				generateSubgraph(nodes, node, nbChilds, depth+1, maxDepth);
			}
		}
	}

	function generateParentgraph(nodes, root, nbChilds, depth, maxDepth){
		if(depth < maxDepth && parentId(root.id) !== undefined){
			var actualNodeIndex = currentIndex(root.id);
			var parent = createGraphNode(parentId(root.id));
			generateSubgraph(nodes, parent, nbChilds, depth+1, maxDepth);
			nodes.push(parent);
			for(var i = 1; i <= nbChilds; i++){
				var node;
				if(i != actualNodeIndex){
					node = createGraphNode(parent.id+'_'+i);
					generateSubgraph(nodes, node, nbChilds, depth+1, maxDepth);
				} else {
					node = root;
				}
				node.adjacencies.push(parent.id+'_'+(i%nbChilds+1));
				nodes.push(node);
				parent.adjacencies.push(node.id);
			}
			generateParentgraph(nodes, parent, nbChilds, depth+1, maxDepth);
		}
	}

	function generateSubtree(root, nbChilds, depth, maxDepth){
		if(depth >= maxDepth){
			return root;
		} else {
			for(var i = 1; i <= nbChilds; i++){
				var node = createNode(root.id+'_'+i);
				generateSubtree(node, nbChilds, depth+1, maxDepth);
				root.children.push(node);
			}
		}
	}

	function generateParenttree(root, nbChilds, depth, maxDepth){
		if(depth >= maxDepth || parentId(root.id) === undefined){
			return root;
		} else {
			var actualNodeIndex = currentIndex(root.id);
			var parent = createNode(parentId(root.id));
			root.children.push(parent);
			if(depth+1 < maxDepth){
				for(var i = 1; i <= nbChilds; i++){
					if(i != actualNodeIndex){
						var node = createNode(parent.id+'_'+i);
						generateSubtree(node, nbChilds, depth+2, maxDepth);
						parent.children.push(node);
					}
				}
				generateParenttree(parent, nbChilds, depth+1, maxDepth);
			}
		}
	}

	function createNode(id){
		//console.log('create node : '+id);
		var node = {};
		node.id = id;
		node.name = id;
		node.data = {};
		node.data.updateUrl = id;
		node.data.type = "user";
		node.children = [];
		return node;
	}

	function createGraphNode(id){
		//console.log('create graph node : '+id);
		var node = {};
		node.id = id;
		node.name = id;
		node.data = {};
		node.data.updateUrl = id;
		node.data.type = "user";
		node.adjacencies = [];
		return node;
	}

	function parentId(id){
		if(id !== 'root'){
			return id.substring(0,id.length-2);
		}
	}

	function currentIndex(id){
		if(id !== 'root'){
			return parseInt(id.substring(id.length-1));
		}
	}
	
	return {
		dataType: 'graph',
		nbChilds: 3,
		maxDepth: 3,
		getJSON: function(url, callback){
			if(this.dataType == 'graph'){
				getJSONGraph(url, this.nbChilds, this.maxDepth, callback);
			} else {
				getJSONTree(url, this.nbChilds, this.maxDepth, callback);
			}
		}
	};
})();


