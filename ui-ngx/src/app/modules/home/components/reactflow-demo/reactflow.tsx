import * as React from 'react';
import { FunctionComponent, useCallback, useEffect } from "react";
import ReactFlow, {
  Controls,
  Background,
  ReactFlowProvider,
  addEdge,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from "reactflow";

const Flow: FunctionComponent<any> = ({ props }: { props: any }) => {
  // props.nodeTypes = nodeTypes;
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    []
  );
  // const nodeTypes = { custom: CustomNode };

  const minimapStyle = {
    height: 120,
  };
  useEffect(() => {
    setNodes([
      {
        id: "1",
        type: "input",
        data: {
          label: "Input Node",
        },
        position: { x: 250, y: 0 },
      },
      {
        id: "2",
        data: {
          label: "Default Node",
        },
        position: { x: 100, y: 100 },
      },
      {
        id: "3",
        type: "output",
        data: {
          label: "Output Node",
        },
        position: { x: 400, y: 100 },
      },
      {
        id: "4",
        type: "custom",
        position: { x: 100, y: 200 },
        data: {
          selects: {
            "handle-0": "smoothstep",
            "handle-1": "smoothstep",
          },
        },
      },
      {
        id: "5",
        type: "output",
        data: {
          label: "custom style",
        },
        className: "circle",
        style: {
          background: "#2B6CB0",
          color: "white",
        },
        position: { x: 400, y: 200 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "6",
        type: "output",
        style: {
          background: "#63B3ED",
          color: "white",
          width: 100,
        },
        data: {
          label: "Node",
        },
        position: { x: 400, y: 325 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "7",
        type: "default",
        className: "annotation",
        data: {
          label: React.createElement(
            "div",
            null,
            "On the bottom left you see the ",
            React.createElement("strong", null, "Controls"),
            " and the bottom right the",
            " ",
            React.createElement("strong", null, "MiniMap"),
            ". This is also just a node \uD83E\uDD73"
          ),
        },
        draggable: false,
        selectable: false,
        position: { x: 150, y: 400 },
      },
    ]);

    setEdges([
      { id: "e1-2", source: "1", target: "2", label: "this is an edge label" },
      { id: "e1-3", source: "1", target: "3", animated: true },
      {
        id: "e4-5",
        source: "4",
        target: "5",
        type: "smoothstep",
        sourceHandle: "handle-0",
        data: {
          selectIndex: 0,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      },
      {
        id: "e4-6",
        source: "4",
        target: "6",
        type: "smoothstep",
        sourceHandle: "handle-1",
        data: {
          selectIndex: 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      },
    ]);
  }, []);

  return (
    <ReactFlow
      {...(props as any)}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      attributionPosition="top-right"
      // nodeTypes={nodeTypes}
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
  return (
    <ReactFlowProvider>
      <Flow props={props} />
    </ReactFlowProvider>
  );
};
