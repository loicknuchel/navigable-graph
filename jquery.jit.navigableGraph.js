// this plugin depend on jit : http://philogb.github.io/jit/
;(function ($, window, document, undefined) {
	if (!jQuery) { throw new Error("This plugin requires jQuery (http://jquery.com/)") }
	if (!$jit) { throw new Error("This plugin requires Jit (http://philogb.github.io/jit/)") }
	// TODO :
	//	- move all subnodes when drag a node
	//	- hide all subnodes when hide a node
	//	- problem with loading timing on froceDirected graph
	//	- problem customisations in node and edge when highlighting nodes
	//	- labels et propriétés sur les liens
	var pluginName = "navigableGraph",
		graphType = {
			forceDirected: 'ForceDirected',
			hypertree: 'Hypertree',
			rGraph: 'RGraph'
		},
		defaults = {
			graphType: graphType.forceDirected,
			width: null,
			height: null,
			initialGraphData: {
				id: "node",
				name: "sample node"
			},
			getGraphForNode: function(node, callback){
				callback({
					id: "node",
					name: "sample node"
				});
			},
			node: {
				type: 'circle', // circle rectangle square ellipse triangle star
				dim: 4,
				color: '#f00',
				highlight: {
					growth: 10
				}
			},
			edge: {
				type: 'line', // line hyperline arrow
				lineWidth: 2,
				color: "#088",
				highlight: {
					color: '#36acfb',
					growth: 1
				}
			},
			animate: {
				duration: 500,
				type: 'fade:seq',
				hideLabels: false,
				transition: $jit.Trans.Quart.easeOut
			},
			showTips: true, // on labels hover, is the tooltip showed ?
			dragNodes: true, // can nodes be dragged in graph ?
			levelDistance: 50, // which is the average distance between nodes ?
			addNewNodesOnUpdate: false, // should the plugin keep nodes far away from clicked node ?
			drawNodeLabel: function(node, domElement){ domElement.innerHTML = node.name; },
			drawNodeTip: function(node, domElement){ domElement.innerHTML = node.name; },
			showNodeInfo: function(node){ console.log('showNodeInfo('+node.name+')'); },
			showEdgeInfo: function(edge){ console.log('showNodeInfo(from '+edge.nodeFrom.name+' to '+edge.nodeTo.name+')'); },
			hideInfo: function(node){ console.log('hideInfo()'); },
			showNodeDetails: function(node){ console.log('showNodeDetails('+node.name+')'); },
			showEdgeDetails: function(edge){ console.log('showEdgeDetails(from '+edge.nodeFrom.name+' to '+edge.nodeTo.name+')'); },
			hideDetails: function(){ console.log('hideDetails()'); },
			startLoading: function(){ console.log('startLoading()'); },
			stopLoading: function(){ console.log('stopLoading()'); },
			preprocessNode: function(node){},
			background: undefined
		},
		hypertreeDefaults = {
			edge: {
				type: 'hyperline'
			},
			node: {
				dim: 9
			},
			dragNodes: false
		},
		rgraphDefaults = {
			edge: {
				color: '#C17878',
				lineWidth:1.5
			},
			node: {
				color: '#ddeeff'
			},
			background: {
				CanvasStyles: {
					strokeStyle: '#555'
				}
			},
			levelDistance: 100
		},
		toString = function(obj){
			if (typeof obj === "object" && obj.localName && obj.id && obj.className){
				return obj.localName + (obj.id.length > 0 ? '#'+obj.id : '') + (obj.className.length > 0 ? '.'+obj.className.replace(' ', '.') : '');
			} else {
				return obj;
			}
		};

	// The actual plugin constructor
	function Plugin (element, options) {
		this.element = element;
		var specificSettings = {};
		if(options && options.graphType){
			if(options.graphType == graphType.hypertree){
				specificSettings = hypertreeDefaults;
			}else if(options.graphType == graphType.rGraph){
				specificSettings = rgraphDefaults;
			}
		}
		this.opts = $.extend(true, {}, defaults, specificSettings, options);
		console.log(this.opts);
		this._defaults = defaults;
		this._name = pluginName;
		this.init();
	}

	Plugin.prototype = {
		init: function () {
			var p = this;
			var start = new Date().getTime();
			p.opts.startLoading();
			
			var vizOpts = {
				injectInto: p.element,
				width: p.opts.width,
				height: p.opts.height,
				background: p.opts.background,
				Navigation: {
					enable: true,
					type: 'Native',
					panning: 'avoid nodes',
					zooming: 20 //zoom speed. higher is more sensible
				},
				Node: {
					overridable: true,
					type: p.opts.node.type,
					dim: p.opts.node.dim,
					color: p.opts.node.color
				},
				Edge: {
					overridable: true,
					type: p.opts.edge.type,
					lineWidth: p.opts.edge.lineWidth,
					color: p.opts.edge.color
				},
				Tips: {
					enable: p.opts.showTips,
					onShow: function(domElement, node) {
						p.opts.drawNodeTip(node, domElement);
					}
				},
				Events: {
					enable: true,
					enableForEdges: true,
					type: 'Native',
					//Change cursor style when hovering a node
					onMouseEnter: function(node) {
						if(node && !node.nodeFrom){
							if(p.opts.dragNodes){viz.canvas.getElement().style.cursor = 'move';}
							p.highlightNodeAndConnexions(viz, node);
						}
					},
					onMouseLeave: function(node) {
						if(node && !node.nodeFrom){
							if(p.opts.dragNodes){viz.canvas.getElement().style.cursor = '';}
							p.stopHighlightingNodes(viz);
						}
					},
					//Update node positions when dragged
					onDragMove: function(node, eventInfo, e) {
						if(p.opts.dragNodes && node && !node.nodeFrom){
							var pos = eventInfo.getPos();
							node.pos.setc(pos.x, pos.y);
							viz.plot();
						}
					},
					onClick: function(node, eventInfo, e) {
						if(node && !node.nodeFrom){
							p.opts.showNodeInfo(node);
						} else if(node.nodeFrom){
							var edge = node;
							p.opts.showEdgeInfo(edge);
						}
					}
				},
				iterations: 500,
				levelDistance: p.opts.levelDistance,
				onBeforeCompute: function(node){
				},
				onCreateLabel: function(domElement, node){
					p.opts.drawNodeLabel(node, domElement);
					
					$(domElement).on('click', '.name', function(){
						p.navigateTo(viz, node, domElement);
					});
					$(domElement).on('click', '.expand', function(){
						p.toggleChilds(viz, node, domElement);
					});
					$(domElement).on('click', '.remove', function(){
						//if(confirm('Voulez vous supprimer ce noeud ?')){
							p.hideNode(viz, node);
						//}
					});
				},
				onPlaceLabel: function(domElement, node){
					p.opts.drawNodeLabel(node, domElement);
					
					var style = domElement.style;
					var w = domElement.offsetWidth;
					style.left = (parseInt(style.left) - w / 2) + 'px';
					style.top = (parseInt(style.top) + 10) + 'px';
				}
			};
			console.log('options initialized in '+(new Date().getTime()-start)+' ms');
			start = new Date().getTime();
			
			p.preprocessNodes(p.opts.initialGraphData, p.opts.preprocessNode);
			console.log('nodes preprocessed in '+(new Date().getTime()-start)+' ms');
			start = new Date().getTime();
			
			if(p.opts.graphType == graphType.hypertree){
				console.log('load '+graphType.hypertree);
				start = new Date().getTime();
				var viz = new $jit.Hypertree(vizOpts);
				console.log('graph initialized in '+(new Date().getTime()-start)+' ms');
				start = new Date().getTime();
				viz.loadJSON(p.opts.initialGraphData);
				console.log('json loaded in '+(new Date().getTime()-start)+' ms');
				start = new Date().getTime();
				viz.refresh();
				viz.controller.onComplete();
				console.log('graph built in '+(new Date().getTime()-start)+' ms');
				p.opts.stopLoading();
			} else if(p.opts.graphType == graphType.rGraph){
				console.log('load '+graphType.rGraph);
				start = new Date().getTime();
				var viz = new $jit.RGraph(vizOpts);
				console.log('graph initialized in '+(new Date().getTime()-start)+' ms');
				start = new Date().getTime();
				viz.loadJSON(p.opts.initialGraphData);
				console.log('json loaded in '+(new Date().getTime()-start)+' ms');
				start = new Date().getTime();
				viz.graph.eachNode(function(n) {
				  var pos = n.getPos();
				  pos.setc(-200, -200);
				});
				viz.compute('end');
				viz.fx.animate({
				  modes:['polar'],
				  duration: 2 * p.opts.animate.duration
				});
				console.log('graph built in '+(new Date().getTime()-start)+' ms');
				p.opts.stopLoading();
			} else {
				console.log('load '+graphType.forceDirected);
				start = new Date().getTime();
				var viz = new $jit.ForceDirected(vizOpts);
				console.log('graph initialized in '+(new Date().getTime()-start)+' ms');
				start = new Date().getTime();
				viz.loadJSON(p.opts.initialGraphData);
				console.log('json loaded in '+(new Date().getTime()-start)+' ms');
				start = new Date().getTime();
				viz.computeIncremental({
					onComplete: function(){
						viz.animate({
							modes: ['linear'],
							transition: p.opts.animate.transition,
							duration: 2 * p.opts.animate.duration
						});
						console.log('graph built in '+(new Date().getTime()-start)+' ms');
						p.opts.stopLoading();
					}
				});
			}
		},
		stopHighlightingNodes: function(viz){
			var p = this;
			
			// set all nodes in graph in not selected state
			viz.graph.eachNode(function(n) {
				n.selected = false;
				n.setData('dim', p.opts.node.dim, 'end');
				n.eachAdjacency(function(adj) {
					adj.setDataset('end', {
						lineWidth: p.opts.edge.lineWidth,
						color: p.opts.edge.color
					});
				});
			});
			
			// perform needed transformations
			viz.fx.animate({
				modes: ['node-property:dim',
						'edge-property:lineWidth:color'],
				duration: p.opts.animate.duration
			});
		},
		highlightNodeAndConnexions: function(viz, node){
			var p = this;
			if(!node.selected){
				p.stopHighlightingNodes(viz);
				node.selected = true;
				
				
				// if node is not selected set it to selected state
				node.setData('dim', p.opts.node.dim + p.opts.node.highlight.growth, 'end');
				node.eachAdjacency(function(adj) {
					adj.setDataset('end', {
						lineWidth: p.opts.edge.lineWidth + p.opts.edge.highlight.growth,
						color: p.opts.edge.highlight.color
					});
					adj.nodeTo.setData('dim', p.opts.node.dim + (p.opts.node.highlight.growth / 2), 'end');
				});
				
				// perform needed transformations
				viz.fx.animate({
					modes: ['node-property:dim',
							'edge-property:lineWidth:color'],
					duration: p.opts.animate.duration
				});
			}
		},
		toggleChilds: function(viz, node, domElement){
			var p = this;
			p.opts.drawNodeLabel(node, domElement);
			var collapseOpts = {
				type: 'animate',
				duration: p.opts.animate.duration,
				hideLabels: p.opts.animate.hideLabels,
				transition: p.opts.animate.transition
			};
			if(node.collapsed){
				viz.op.expand(node, collapseOpts);
			} else {
				viz.op.contract(node, collapseOpts);
			}
		},
		removeNode: function(viz, node){
			var p = this;
		
			viz.op.removeNode(node.id, p.opts.animate);
		},
		hideNode: function(viz, node){
			var p = this;
		
			node.setData('alpha', 0, 'end');
			node.eachAdjacency(function(adj) {
				adj.setData('alpha', 0, 'end');
			});
			viz.fx.animate({
				modes: ['node-property:alpha',
						'edge-property:alpha'],
				duration: p.opts.animate.duration
			});
		},
		unhideNodes: function(viz){
			var p = this;
			viz.graph.eachNode(function(n) {
				n.setData('alpha', 1, 'end');
				n.eachAdjacency(function(adj) {
					adj.setData('alpha', 1, 'end');
				});
			});
			viz.fx.animate({
				modes: ['node-property:alpha',
						'edge-property:alpha'],
				duration: p.opts.animate.duration
			});
		},
		navigateTo: function(viz, node, domElement) {
			var p = this;
			var start = new Date().getTime();
			p.opts.startLoading();
			if(node.collapsed){
				p.toggleChilds(viz, node, domElement);
			}
			
			if(p.opts.graphType == graphType.hypertree || p.opts.graphType == graphType.rGraph){
				viz.onClick(node.id, {
					onComplete: function() {
						viz.controller.onComplete();
						if(node.data.updateUrl){
							p.opts.getGraphForNode(node, function(data){
								p.preprocessNodes(data, p.opts.preprocessNode);
								p.updateWith(viz, node.id, data);
							});
						} else {
							p.opts.stopLoading();
						}
					}
				});
			} else {
				if(node.data.updateUrl){
					p.opts.getGraphForNode(node, function(data){
						p.preprocessNodes(data, p.opts.preprocessNode);
						p.updateWith(viz, node.id, data);
					});
				} else {
					p.opts.stopLoading();
				}
			}
		},
		updateWith: function(viz, nodeId, data){
			var p = this;
			var start = new Date().getTime();
			var updateOpts = {
				type: 'fade:con', // animation types : fade:con fade:seq replot
				fps: 30,
				duration: 1500,
				hideLabels: false,
				id: nodeId,
				onComplete: function(){
					p.unhideNodes(viz);
					p.opts.stopLoading();
					console.log('graph morphed in '+(new Date().getTime()-start)+' ms');
				}
			};
			
			if(p.opts.addNewNodesOnUpdate){
				viz.op.sum(data, updateOpts);
			} else {
				viz.op.morph(data, updateOpts);
			}
		},
		preprocessNodes: function(json, apply){
			if(json && json.children){
				processTree(json, apply);
			} else if(json && json[0] && json[0].adjacencies){
				for(var i in json){
					apply(json[i]);
				}
			}
			
			function processTree(root, apply){
				apply(root);
				for(var i in root.children){
					processTree(root.children[i], apply);
				}
			}
		}
	};

	$.fn[pluginName] = function (options) {
		return this.each(function() {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" + pluginName, new Plugin(this, options));
			} else {
				console.log(pluginName+' is already instantiated on element '+toString(this));
			}
		});
	};
	$.fn[pluginName].graphType = graphType;

})(jQuery, window, document);
