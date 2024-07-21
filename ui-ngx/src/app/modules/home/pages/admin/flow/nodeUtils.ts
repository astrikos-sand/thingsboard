import axios from 'axios';
import { Node, Edge } from 'reactflow';

export const convertData = (
  nodesData: any[], node_fields: any
): { nodes: Node[]; edges: Edge[] } => {
  const convertedNodes: Node[] = [];
  const convertedConnectionsMap = new Map<string, Edge>();
  nodesData.forEach((nodeData) => {
    const {
      id,
      position,
      connections_in,
      connections_out,
      polymorphic_ctype,
      input_slots,
      output_slots,
      node_type,
      ...rest
    } = nodeData;
    convertedNodes.push({
      id: id.toString(),
      position: {
        x: position.x,
        y: position.y,
      },
      type: 'custom',
      data: {
        id,
        label: 'Node',
        polymorphic_ctype,
        input_slots,
        output_slots,
        toShow: true,
        isScopeNode: true,
        node_type: node_type,
        node_fields: node_fields[node_type],
        ...rest,
      },
    });

    [...connections_in, ...connections_out].forEach((connection: any) => {
      const { id, source, target, from_slot, to_slot } = connection;
      const edgeKey = `${source}-${target}-${from_slot}-${to_slot}`;
      if (!convertedConnectionsMap.has(edgeKey)) {
        convertedConnectionsMap.set(edgeKey, {
          id: id.toString(),
          source: source.toString(),
          sourceHandle: `node-${source}-output-${from_slot}`,
          target: target.toString(),
          targetHandle: `node-${target}-input-${to_slot}`,
        });
      }
    });
  });

  return {
    nodes: convertedNodes,
    edges: Array.from(convertedConnectionsMap.values()),
  };
};

export const handleOpenScope = async (
  scopeId: string,
  data: any,
  nodes: Node[],
  edges: Edge[],
  oldEdges: Edge[],
  nodeFields: any,
  setOldEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  setOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
) => {
  try {
    const response = await axios.get(
      `http://localhost:8000/v2/flow/${scopeId}/nodes/`
    );
    const { nodes: scopeNodes, edges: scopeEdges } = convertData(
      response.data.nodes, nodeFields
    );

    const inputNode = scopeNodes.find(
      (node: any) => node.data.node_type === 'InputNode'
    );
    const outputNode = scopeNodes.find(
      (node: any) => node.data.node_type === 'OutputNode'
    );

    const [leftmost, rightmost] = [Math.min, Math.max].map((fn) =>
      fn(...scopeNodes.map((node) => node.position.x))
    );
    const [bottommost, topmost] = [Math.min, Math.max].map((fn) =>
      fn(...scopeNodes.map((node) => node.position.y))
    );

    if (inputNode) inputNode.data.toShow = false;
    if (outputNode) outputNode.data.toShow = false;

    const shiftedScopeNodes = scopeNodes.map((node) => ({
      ...node,
      position: {
        y: node.position.y + data.position.y - topmost + 100,
        x: node.position.x + data.position.x - leftmost + 300,
      },
      data: {
        ...node.data,
        flowId: scopeId,
        position: {
          y: node.position.y + data.position.y - topmost + 100,
          x: node.position.x + data.position.x - leftmost + 300,
        },
      },
    }));

    const scopeRegion = {
      id: `scope-region-${scopeId}`,
      type: 'scopeRegion',
      data: {
        flowId: data.flowId,
        scopeId,
        scopeName: response.data.name,
        width: rightmost - leftmost + 400,
        height: topmost - bottommost + 400,
      },
      position: {
        x: data.position.x + 200,
        y: data.position.y + bottommost - topmost,
      },
      style: {
        width: rightmost - leftmost + 400,
        height: topmost - bottommost + 400,
        border: '2px dashed #888',
        backgroundColor: 'rgba(173, 216, 230, 0.5)',
        borderRadius: '10px',
      },
    };

    const shift = rightmost - leftmost + 300;
    setOffset({ x: shift, y: 0 });

    const shiftedNodes = nodes.map((node) =>
      node.position.x > data.position.x
        ? {
            ...node,
            position: { ...node.position, x: node.position.x + shift },
            data: {
              ...node.data,
              position: { ...node.data.position, x: node.position.x + shift },
              isScopeNode: false,
            },
          }
        : node
    );

    let edgesToRemove: Edge[] = [];
    if (inputNode) {
      inputNode.data.output_slots.forEach((outputSlot: any) => {
        const edgeFromInputNode = scopeEdges.find(
          (edge: Edge) =>
            edge.source === inputNode.id &&
            edge.sourceHandle === `node-${inputNode.id}-output-${outputSlot.id}`
        );
        if (edgeFromInputNode) {
          const correspondingConditionalSlot = data.output_slots.find(
            (slot: any) => slot.name === outputSlot.name
          );
          if (
            correspondingConditionalSlot &&
            edgeFromInputNode.target !== outputNode?.id
          ) {
            edges.push({
              id: `new-edge-${edgeFromInputNode.id}`,
              source: data.id,
              sourceHandle: `node-${data.id}-output-${correspondingConditionalSlot.id}`,
              target: edgeFromInputNode.target,
              targetHandle: edgeFromInputNode.targetHandle,
            });
          }
        }
      });
    }

    if (outputNode) {
      outputNode.data.input_slots.forEach((inputSlot: any) => {
        const edgeToOutputNode = scopeEdges.find(
          (edge: Edge) =>
            edge.target === outputNode.id &&
            edge.targetHandle === `node-${outputNode.id}-input-${inputSlot.id}`
        );
        if (edgeToOutputNode) {
          const correspondingConditionalSlot = data.output_slots.find(
            (slot: any) => slot.name === inputSlot.name
          );
          if (correspondingConditionalSlot) {
            const edgeFromConditionalNode = edges.find(
              (edge: Edge) =>
                edge.source === data.id &&
                edge.sourceHandle ===
                  `node-${data.id}-output-${correspondingConditionalSlot.id}`
            );
            if (edgeFromConditionalNode) {
              edgesToRemove.push(edgeFromConditionalNode);
              if (edgeToOutputNode.source !== inputNode?.id) {
                edges.push({
                  id: `new-edge-${edgeFromConditionalNode.id}`,
                  source: edgeToOutputNode.source,
                  sourceHandle: edgeToOutputNode.sourceHandle,
                  target: edgeFromConditionalNode.target,
                  targetHandle: edgeFromConditionalNode.targetHandle,
                });
              }
            }
          }
        }
      });
    }

    const filteredEdges = edges.filter((edge) => !edgesToRemove.includes(edge));
    setNodes([...shiftedNodes, scopeRegion, ...shiftedScopeNodes]);
    setEdges([
      ...filteredEdges,
      ...scopeEdges.filter(
        (edge) =>
          edge.source !== inputNode?.id && edge.target !== outputNode?.id
      ),
    ]);
    setOldEdges([...edgesToRemove]);
  } catch (error) {
    console.error('Error opening scope:', error);
  }
};

export const handleCollapseScope = async (
  scopeId: string,
  data: any,
  nodes: Node[],
  edges: Edge[],
  oldEdges: Edge[],
  nodeFields: any,
  setOldEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  offset: { x: number; y: number }
) => {
  try {
    const scopeNodes = nodes.filter(
      (node) => node.data.isScopeNode && node.data.flowId === scopeId
    );
    const scopeNodeIds = scopeNodes.map((node) => node.id);
    let scopeEdges = edges.filter(
      (edge) =>
        scopeNodeIds.includes(edge.source) && scopeNodeIds.includes(edge.target)
    );

    if (scopeNodes.length === 0) {
      console.error('No scope nodes found to collapse');
      return;
    }

    const inputNode = scopeNodes.find(
      (node) => node.data.node_type === 'InputNode'
    );
    const outputNode = scopeNodes.find(
      (node) => node.data.node_type === 'OutputNode'
    );

    if (!inputNode || !outputNode) {
      console.error('Scope must have input and output nodes');
      return;
    }

    let scopeEdgesToSave = edges
      .filter(
        (edge) =>
          scopeNodeIds.includes(edge.source) &&
          scopeNodeIds.includes(edge.target)
      )
      .filter(
        (edge) => edge.source !== inputNode.id && edge.target !== outputNode.id
      );
    data.output_slots.forEach((conditionalSlot: any) => {
      const edgeFromConditionalNode = edges.find(
        (edge: Edge) =>
          edge.source === data.id &&
          edge.sourceHandle === `node-${data.id}-output-${conditionalSlot.id}`
      );

      if (edgeFromConditionalNode) {
        const correspondingInputSlot = inputNode.data.output_slots.find(
          (slot: any) => slot.name === conditionalSlot.name
        );

        if (correspondingInputSlot) {
          scopeEdgesToSave.push({
            id: `new-edge-${edgeFromConditionalNode.id}`,
            source: inputNode.id,
            sourceHandle: `node-${inputNode.id}-output-${correspondingInputSlot.id}`,
            target: edgeFromConditionalNode.target,
            targetHandle: edgeFromConditionalNode.targetHandle,
          });
        }
      }
    });
    outputNode.data.input_slots.forEach((inputSlot: any) => {
      const correspondingConditionalSlot = data.output_slots.find(
        (slot: any) => slot.name === inputSlot.name
      );
      if (correspondingConditionalSlot) {
        const oldEdge = oldEdges.find(
          (edge) =>
            edge.sourceHandle ===
            `node-${data.id}-output-${correspondingConditionalSlot.id}`
        );
        if (oldEdge) {
          const edgeFromInternalNode = edges.find(
            (edge: Edge) =>
              edge.target === oldEdge.target &&
              edge.targetHandle === oldEdge.targetHandle
          );
          if (edgeFromInternalNode) {
            scopeEdgesToSave.push({
              id: `new-edge-${oldEdge.id}`,
              source: edgeFromInternalNode.source,
              sourceHandle: edgeFromInternalNode.sourceHandle,
              target: outputNode.id,
              targetHandle: `node-${outputNode.id}-input-${inputSlot.id}`,
            });
          }
        }
      }
    });
    const filteredEdges = edges.filter(
      (edge) =>
        !scopeNodeIds.includes(edge.source) &&
        !scopeNodeIds.includes(edge.target)
    );
    const scopeData = {
      nodes: scopeNodes.map((node) => ({
        id: node.id,
        position: node.position,
        inputs: node.data.input_slots,
        outputs: node.data.output_slots,
      })),
      connections: scopeEdgesToSave.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        source_slot: edge.sourceHandle
          ?.replace(`node-${edge.source}`, '')
          .replace('-output-', ''),
        target_slot: edge.targetHandle
          ?.replace(`node-${edge.target}`, '')
          .replace('-input-', ''),
      })),
    };

    await axios.post('http://localhost:8000/v2/save/', {
      nodes: scopeData.nodes,
      connections: scopeData.connections,
      flow_id: scopeId,
    });

    const shiftedNodes = nodes.map((node) =>
      node.position.x > data.position.x
        ? {
            ...node,
            position: { ...node.position, x: node.position.x - offset.x },
            data: {
              ...node.data,
              position: {
                ...node.data.position,
                x: node.position.x - offset.x,
              },
            },
          }
        : node
    );

    setNodes(
      shiftedNodes
        .filter((node) => !node.data.isScopeNode)
        .filter((node) => node.type !== 'scopeRegion')
    );
    setEdges([...filteredEdges, ...oldEdges]);
  } catch (error) {
    console.error('Error collapsing scope:', error);
  }
};

export const convertNodesAndConnections = (
  nodesData: any[],
  flowId: string,
  node_fields: any
) => {
  const convertedNodes: Node[] = [];
  const convertedConnectionsMap = new Map<string, Edge>();

  nodesData.forEach((nodeData) => {
    const {
      id,
      position,
      connections_in,
      connections_out,
      polymorphic_ctype,
      input_slots,
      output_slots,
      node_type,
      ...rest
    } = nodeData;
    convertedNodes.push({
      id: id.toString(),
      position: position,
      type: 'custom',
      data: {
        id: id,
        label: 'Node',
        position: position,
        polymorphic_ctype: polymorphic_ctype,
        input_slots: input_slots,
        output_slots: output_slots,
        node_type: node_type,
        node_fields: node_fields[node_type],
        toShow: true,
        flowId: flowId,
        ...rest,
      },
    });

    connections_out.forEach((connection: any) => {
      const { id, source, target, from_slot, to_slot } = connection;
      const edgeKey = `${source}-${target}-${from_slot}-${to_slot}`;
      if (!convertedConnectionsMap.has(edgeKey)) {
        convertedConnectionsMap.set(edgeKey, {
          id: id.toString(),
          source: source.toString(),
          sourceHandle: `node-${source}-output-${from_slot}`,
          target: target.toString(),
          targetHandle: `node-${target}-input-${to_slot}`,
        });
      }
    });

    connections_in.forEach((connection: any) => {
      const { id, source, target, from_slot, to_slot } = connection;
      const edgeKey = `${source}-${target}-${from_slot}-${to_slot}`;
      if (!convertedConnectionsMap.has(edgeKey)) {
        convertedConnectionsMap.set(edgeKey, {
          id: id.toString(),
          source: source.toString(),
          sourceHandle: `node-${source}-output-${from_slot}`,
          target: target.toString(),
          targetHandle: `node-${target}-input-${to_slot}`,
        });
      }
    });
  });

  return {
    nodes: convertedNodes,
    edges: Array.from(convertedConnectionsMap.values()),
  };
};

export const saveToBackend = async (
  flowId: string,
  nodes: Node[],
  edges: Edge[],
  flowService: any
) => {
  const nodeIds = nodes.map((node) => node.id);
  const convertedNodes = nodes
    .filter((node) => !node.data.isScopeNode && node.data.id)
    .map((node) => ({
      id: node.data.id,
      inputs: node.data.inputs,
      outputs: node.data.outputs,
      position: node.position,
    }));
  const validConnections = edges
    .filter(
      (edge) =>
        nodeIds.includes(edge.source) &&
        nodeIds.includes(edge.target)
    )
    .filter((connection) => connection.sourceHandle && connection.targetHandle);

  const convertedConnections = validConnections.map((connection) => ({
    id: connection.id,
    source: connection.source,
    target: connection.target,
    source_slot: connection.sourceHandle
      ?.replace(`node-${connection.source}`, '')
      .replace('-output-', ''),
    target_slot: connection.targetHandle
      ?.replace(`node-${connection.target}`, '')
      .replace('-input-', ''),
  }));
  const response = await axios.post('http://localhost:8000/v2/save/', {
    nodes: convertedNodes,
    connections: convertedConnections,
    flow_id: flowId,
  });
  return response.data;
};

export const executeFlow = async (flowId: string, flowService: any) => {
  return flowService.executeFlow(flowId);
};
