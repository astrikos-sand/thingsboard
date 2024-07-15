import * as React from 'react';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
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
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  useReactFlow
} from 'reactflow';
import CustomNode from './custom-node';

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const nodeTypes = {
  custom: CustomNode,
};

const Flow: FunctionComponent<any> = ({ props }: { props: any }) => {
  const [nodes, setNodes] = useState<Node[]>(props.nodes);
  const [edges, setEdges] = useState<Edge[]>(props.edges);
  const reactFlowWrapper = React.useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      props.onNodesChange(changes);
    },
    [setNodes, props.onNodesChange]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      props.onEdgesChange(changes);
    },
    [setEdges, props.onEdgesChange]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge(connection, eds));
      props.onConnectionsChange(connection);
    },
    [setEdges, props.onEdgesChange]
  );

  useEffect(() => {
    if (props.nodes) {
      setNodes(props.nodes);
    }
    if (props.edges) {
      setEdges(props.edges);
    }
  }, [props.nodes, props.edges]);
  
  const onMouseMove = useCallback(
    (event : any) => {
      const x = event.clientX;
      const y = event.clientY;
      const flowPosition = screenToFlowPosition({ x, y });
      props.onSetPosition(flowPosition);
    },
    [screenToFlowPosition, props.onSetPosition]
  );
  return (
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
  );
};

export const ReactFlowWrappableComponent: FunctionComponent<any> = ({ props }) => {
  return (
    <ReactFlowProvider>
      <Flow props={props} />
    </ReactFlowProvider>
  );
};
