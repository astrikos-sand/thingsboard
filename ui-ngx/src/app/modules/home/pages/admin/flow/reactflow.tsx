import * as React from "react";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Controls,
  Background,
  ReactFlowProvider,
  addEdge,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeTypes,
  FitViewOptions,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  DefaultEdgeOptions,
} from "reactflow";
import CustomNode from "./custom-node";

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const nodeTypes = {
  custom: CustomNode,
};
const Flow: FunctionComponent<any> = ({ props }: { props: any }) => {
  const [nodes, setNodes] = useState<Node[]>(props.nodes);
  const [edges, setEdges] = useState<Edge[]>(props.edges);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const minimapStyle = {
    height: 120,
  };
  useEffect(() => {
    if (props.nodes) {
      console.log("Setting nodes", props.nodes);
      setNodes(props.nodes);
    }
    if (props.edges) {
      console.log("Setting edges", props.edges);
      setEdges(props.edges);
    }
  }, [props]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      fitViewOptions={fitViewOptions}
      nodeTypes={nodeTypes}
    >
      <MiniMap style={minimapStyle} zoomable pannable />
      <Controls />
      <Background color="#B8CEFF" gap={16} />
    </ReactFlow>
  );
};

/**
 * ReactFlowProvider fixes some internal context
 * issues with ReactFlow
 */
export const ReactFlowWrappableComponent: FunctionComponent<any> = ({
  props,
}) => {
  console.log(props);
  return (
    <ReactFlowProvider>
      <Flow props={props} />
    </ReactFlowProvider>
  );
};
