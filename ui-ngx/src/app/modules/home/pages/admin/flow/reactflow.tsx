import React, {
  FunctionComponent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactFlow, {
  Controls,
  Background,
  ReactFlowProvider,
  addEdge,
  MiniMap,
  FitViewOptions,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  useReactFlow,
  NodeProps,
  Edge,
} from "reactflow";
import CustomNode from "./custom-node";
import { FlowContext, FlowContextType, FlowProvider } from "./flow-context";
import ScopeRegion from "./ScopeRegion";
import isEqual from "lodash.isequal";
import {
  createConnection,
  deleteEdge,
  deleteNode,
  handleCollapseAllScopes,
  updateNodePosition,
} from "./nodeUtils";
import axios from "axios";

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const nodeTypes = {
  custom: CustomNode,
  scopeRegion: ScopeRegion as unknown as React.ComponentType<NodeProps>,
};

const Flow: FunctionComponent<any> = ({ props }: { props: any }) => {
  const {
    nodes,
    edges,
    openEditingDialogBox,
    nodeFields,
    setOpenEditingDialogBox,
    removedSlots,
    setRemovedSlots,
    setNodes,
    setEdges,
  } = useContext(FlowContext) as FlowContextType;
  const reactFlowWrapper = React.useRef<HTMLDivElement | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [scopesSaved, setScopesSaved] = useState(false);
  const prevNodes = useRef<Node[]>([]);
  const prevEdges = useRef<Edge[]>([]);
  const [openScopes, setOpenScopes] = useState<boolean>(false);

  const onNodesChange: OnNodesChange = useCallback(
    async (changes) => {
      let nodesChanged = false;

      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);

        changes.forEach(async (change) => {
          if (change.type === "remove") {
            await deleteNode(change.id);
          }
        });

        nodesChanged = true;
        props.onNodesChange(updatedNodes);
        return updatedNodes;
      });

      if (nodesChanged) {
        checkNodeOverlap();
      }
    },
    [setNodes, nodes, props]
  );

  const onNodeDragStop = useCallback(
    async (event, node) => {
      const updatedNodes = nodes.map((n) =>
        n.id === node.id ? { ...n, position: node.position } : n
      );

      setNodes(updatedNodes);
      props.onNodesChange(updatedNodes);

      await updateNodePosition(node.id, node.position);
    },
    [nodes, setNodes, props]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    async (changes) => {
      setEdges((eds) => {
        const updatedEdges = applyEdgeChanges(changes, eds);

        changes.forEach(async (change) => {
          if (change.type === "remove") {
            await deleteEdge(change.id);
          }
        });

        props.onEdgesChange(updatedEdges);
        return updatedEdges;
      });
    },
    [setEdges, edges, props]
  );

  const onConnect: OnConnect = useCallback(
    async (connection) => {
      const tempId = `${connection.source}-${connection.target}`;
      const tempConnection = { ...connection, id: tempId };
  
      let updatedEdges = addEdge(tempConnection, edges);
      setEdges(updatedEdges);
      props.onEdgesChange(updatedEdges);
  
      const backendId = await createConnection(connection);
  
      if (backendId) {
        updatedEdges = updatedEdges.map((edge) =>
          edge.id === tempId ? { ...edge, id: backendId } : edge
        );
        setEdges(updatedEdges);
        props.onEdgesChange(updatedEdges);
      } else {
        console.error("Failed to create connection on backend");
      }
    },
    [setEdges, edges, props]
  );

  const checkNodeOverlap = () => {
    const scopeRegions = nodes.filter((node) => node.type === "scopeRegion");

    const getDeepestScope = (node: Node, visitedScopes = new Set()) => {
      let maxDepth = 0;
      let deepestScopeId = "";
      const findDeepestScope = (currentNode: any, currentDepth: any) => {
        scopeRegions.forEach((scopeRegion) => {
          if (
            !visitedScopes.has(scopeRegion.id) &&
            isNodeOverlappingScopeRegion(currentNode, scopeRegion)
          ) {
            visitedScopes.add(scopeRegion.id);
            if (currentDepth + 1 > maxDepth) {
              maxDepth = currentDepth + 1;
              currentDepth = maxDepth;
              deepestScopeId = scopeRegion.data.scopeId;
            }
          }
        });
      };

      findDeepestScope(node, 0);

      return { isInScope: maxDepth > 0, scopeId: deepestScopeId };
    };

    setNodes((currentNodes) => {
      return currentNodes.map((node) => {
        if (node.type !== "scopeRegion") {
          const { isInScope, scopeId } = getDeepestScope(node);
          return {
            ...node,
            data: {
              ...node.data,
              flow: isInScope ? scopeId : node.data.flow,
            },
          };
        }
        return node;
      });
    });
  };

  const isNodeOverlappingScopeRegion = (
    node: Node,
    scopeRegion: Node
  ): boolean => {
    const nodeElement = document.getElementById(node.id);
    const scopeElement = document.querySelector(
      `[data-id='${scopeRegion.id}']`
    );
    if (!nodeElement || !scopeElement) return false;

    const nodeRect = nodeElement.getBoundingClientRect();
    const scopeRect = scopeElement.getBoundingClientRect();

    const overlapWidth = Math.max(
      0,
      Math.min(nodeRect.right, scopeRect.right) -
        Math.max(nodeRect.left, scopeRect.left)
    );
    const overlapHeight = Math.max(
      0,
      Math.min(nodeRect.bottom, scopeRect.bottom) -
        Math.max(nodeRect.top, scopeRect.top)
    );

    return overlapWidth > 0 && overlapHeight > 0;
  };

  useEffect(() => {
    if (props.nodes.length && !isEqual(props.nodes, prevNodes.current)) {
      setNodes(props.nodes);
      prevNodes.current = props.nodes;
    }
    if (props.edges.length && !isEqual(props.edges, prevEdges.current)) {
      setEdges(props.edges);
      prevEdges.current = props.edges;
    }
  }, [props.nodes, props.edges]);

  useEffect(() => {
    if (nodes.length && !isEqual(props.nodes, nodes)) {
      props.onNodesChange(nodes);
    }
    if (edges.length && !isEqual(props.edges, edges)) {
      props.onEdgesChange(edges);
    }
  }, [nodes, edges]);

  useEffect(() => {
    if (openEditingDialogBox && !props.openEditingDialogBox) {
      props.onOpenEditingDialogBox(openEditingDialogBox);
    }
  }, [openEditingDialogBox]);

  useEffect(() => {
    if (openEditingDialogBox && !props.openEditingDialogBox) {
      setOpenEditingDialogBox(props.openEditingDialogBox);
    }
  }, [props.openEditingDialogBox]);

  const handleSave = async () => {
    const scopeRegions = nodes.filter((node) => node.type === "scopeRegion");
    console.log(nodes);
    const scopeNodes = nodes.filter((node) =>
      scopeRegions.some(
        (scopeNode) =>
          scopeNode.data.scopeId ===
          (node.data.block ? node.data.block.flow.id : node.data.flow.id)
      )
    );

    const calculateDepth = (nodeId: string, depthMap = new Map()): number => {
      if (depthMap.has(nodeId)) {
        return depthMap.get(nodeId);
      }

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) {
        depthMap.set(nodeId, 0);
        return 0;
      }

      const id = node.data.block ? node.data.block.flow.id : node.data.flow.id;
      const children = nodes.filter((n) => n.data.flow === id);

      if (children.length === 0) {
        depthMap.set(nodeId, 0);
        return 0;
      }

      const visitedNodes = new Set();
      const stack = [nodeId];

      while (stack.length) {
        const currentNodeId = stack.pop();
        if (visitedNodes.has(currentNodeId)) {
          console.warn(
            `Circular dependency detected at node: ${currentNodeId}`
          );
          depthMap.set(nodeId, 0);
          return 0;
        }

        visitedNodes.add(currentNodeId);
        const currentNode = nodes.find((n) => n.id === currentNodeId);
        const currentChildren = nodes.filter(
          (n) =>
            n.data.flow ===
            (currentNode?.data.block
              ? currentNode.data.block.flow.id
              : currentNode?.data.flow.id)
        );

        for (const child of currentChildren) {
          stack.push(child.id);
        }
      }

      const depth =
        Math.max(
          ...children.map((child) => calculateDepth(child.id, depthMap))
        ) + 1;
      depthMap.set(nodeId, depth);
      return depth;
    };

    const depthMap = new Map();
    const scopeNodesWithDepth = scopeNodes.map((node) => ({
      ...node,
      depth: calculateDepth(node.data.id, depthMap),
    }));
    console.log(scopeNodesWithDepth);
    scopeNodesWithDepth.sort((a, b) => a.depth - b.depth);

    let updatedNodes: any[] = nodes;
    let updatedEdges: any[] = edges;
    let updatedRemovedSlots: any[] = removedSlots;
    let offset: any = {};

    const updateNodes = (newNodes: any[]) => {
      updatedNodes = newNodes;
    };

    const updateEdges = (newEdges: any[]) => {
      updatedEdges = newEdges;
    };

    const updateOffset = (newOffset: any) => {
      offset = newOffset;
    };

    const updateOpenScopes = (isOpen: boolean) => {
      setOpenScopes(isOpen);
    };
    console.log(scopeNodesWithDepth);
    for (const node of scopeNodesWithDepth) {
      console.log(node.data, updatedNodes, updatedEdges, updatedRemovedSlots);
      updateOffset({ x: 100, y: node.data.position.y });
      await handleCollapseAllScopes(
        node.data.cases || [node.data.block],
        node.data,
        updatedNodes,
        updatedEdges,
        nodeFields,
        updatedRemovedSlots,
        updateNodes,
        updateEdges,
        updateOffset,
        updateOpenScopes
      );
      updateOffset({});
      updateOpenScopes(false);
    }

    console.log(updatedNodes, updatedEdges);
    const nodeIds = updatedNodes.map((node) => node.id);
    const convertedNodes = updatedNodes
      .filter((node) => node.data.id)
      .map((node) => ({
        id: node.data.id,
        inputs: node.data.inputs,
        outputs: node.data.outputs,
        position: node.position,
      }));
    const validConnections = updatedEdges
      .filter(
        (edge) => nodeIds.includes(edge.source) && nodeIds.includes(edge.target)
      )
      .filter(
        (connection) => connection.sourceHandle && connection.targetHandle
      );
    const convertedConnections = validConnections.map((connection) => ({
      id: connection.id,
      source: connection.source,
      target: connection.target,
      source_slot: connection.sourceHandle
        ?.replace(`node-${connection.source}`, "")
        .replace("-output-", ""),
      target_slot: connection.targetHandle
        ?.replace(`node-${connection.target}`, "")
        .replace("-input-", ""),
    }));

    const response = await axios.post("http://127:0.0.1:8000/v2/save", {
      nodes: convertedNodes,
      connections: convertedConnections,
      flow_id: props.saveFlow,
    });
    return response.data;
  };

  const saveToBackend = async () => {};
  useEffect(() => {
    if (props.saveFlow) {
      handleSave();
    }
  }, [props.saveFlow]);
  useEffect(() => {
    if (scopesSaved) {
      saveToBackend();
      setScopesSaved(false);
    }
  }, [scopesSaved]);

  const onMouseMove = useCallback(
    (event: any) => {
      const x = event.clientX;
      const y = event.clientY;
      const flowPosition = screenToFlowPosition({ x, y });
      props.onSetPosition(flowPosition);
    },
    [screenToFlowPosition, props.onSetPosition]
  );

  return (
    <div ref={reactFlowWrapper} style={{ height: 800 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMouseMove={onMouseMove}
        fitView
        fitViewOptions={fitViewOptions}
        nodeTypes={nodeTypes}
      >
        <MiniMap zoomable pannable />
        <Controls />
        <Background color="#B8CEFF" gap={16} />
      </ReactFlow>
    </div>
  );
};

export const ReactFlowWrappableComponent: FunctionComponent<any> = ({
  props,
}) => {
  return (
    <ReactFlowProvider>
      <FlowProvider>
        <Flow props={props} />
      </FlowProvider>
    </ReactFlowProvider>
  );
};
