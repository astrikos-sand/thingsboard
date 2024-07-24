import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
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

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const nodeTypes = {
  custom: CustomNode,
  scopeRegion: ScopeRegion as unknown as React.ComponentType<NodeProps>,
};

const Flow: FunctionComponent<any> = ({ props }: { props: any }) => {
  const { nodes, edges, setNodes, setEdges } = React.useContext(
    FlowContext
  ) as FlowContextType;
  const reactFlowWrapper = React.useRef<HTMLDivElement | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const prevNodes = useRef<Node[]>([]);
  const prevEdges = useRef<Edge[]>([]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);
        props.onNodesChange(updatedNodes);
        return updatedNodes;
      });
      checkNodeOverlap();
    },
    [setNodes, nodes, props]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const updatedEdges = applyEdgeChanges(changes, eds);
        props.onEdgesChange(updatedEdges);
        return updatedEdges;
      });
    },
    [setEdges, props]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => {
        const updatedEdges = addEdge(connection, eds);
        props.onEdgesChange(updatedEdges);
        return updatedEdges;
      });
    },
    [setEdges, props]
  );

  const checkNodeOverlap = () => {
    setNodes((currentNodes) => {
      return currentNodes.map((node) => {
        if (node.type !== "scopeRegion") {
          let isInScope = false;
          let scopeId = "";
          for (let scopeRegion of currentNodes.filter(
            (n) => n.type === "scopeRegion"
          )) {
            if (isNodeOverlappingScopeRegion(node, scopeRegion)) {
              isInScope = true;
              scopeId = scopeRegion.data.scopeId;
              break;
            }
          }

          return {
            ...node,
            data: {
              ...node.data,
              isScopeNode: isInScope,
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

    return (
      overlapWidth >= nodeRect.width * 0.5 &&
      overlapHeight >= nodeRect.height * 0.5
    );
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
