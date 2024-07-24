import axios from "axios";
import { Node, Edge } from "reactflow";

export const convertData = (
  nodesData: any[],
  flowId: string,
  node_fields: any
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
      position: position,
      type: "custom",
      data: {
        id: id,
        label: "Node",
        position: position,
        polymorphic_ctype: polymorphic_ctype,
        input_slots: input_slots,
        output_slots: output_slots,
        node_type: node_type,
        node_fields: node_fields[node_type],
        toShow: true,
        flow: flowId,
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
  removeSlots: any[],
  offset: { x: number; y: number },
  nodeFields: any
): Promise<{
  nodes: Node[];
  edges: Edge[];
  offset: { x: number; y: number };
  shift: number;
  removeEdges: Edge[];
  removeSlots: any[];
}> => {
  try {
    const response = await axios.get(
      `http://localhost:8000/v2/flow/${scopeId}/nodes/`
    );
    const { nodes: scopeNodes, edges: scopeEdges } = convertData(
      response.data.nodes,
      scopeId,
      nodeFields
    );
    scopeNodes.map((node) => {
      node.data.isScopeNode = true;
    });
    const inputNode = scopeNodes.find(
      (node: any) => node.data.node_type === "InputNode"
    );
    const outputNode = scopeNodes.find(
      (node: any) => node.data.node_type === "OutputNode"
    );

    if (inputNode) {
      inputNode.data.input_slots = [...inputNode.data.output_slots];
    }

    if (outputNode) {
      outputNode.data.output_slots = [...outputNode.data.input_slots];
    }

    const [leftmost, rightmost] = [Math.min, Math.max].map((fn) =>
      fn(...scopeNodes.map((node) => node.position.x))
    );
    const [bottommost, topmost] = [Math.min, Math.max].map((fn) =>
      fn(...scopeNodes.map((node) => node.position.y))
    );

    const shiftedScopeNodes = scopeNodes.map((node) => ({
      ...node,
      position: {
        x: node.position.x + offset.x + data.position.x - leftmost + 300,
        y: node.position.y + offset.y - bottommost + 100,
      },
      data: {
        ...node.data,
        flow: scopeId,
        position: {
          x: node.position.x + offset.x + data.position.x - leftmost + 300,
          y: node.position.y + offset.y - bottommost + 100,
        },
        isScopeNode: true,
      },
    }));

    const scopeRegion = {
      id: `scope-region-${scopeId}`,
      type: "scopeRegion",
      data: {
        flow: data.flow,
        parentNode: data.id,
        scopeId,
        scopeName: response.data.name,
        width: rightmost - leftmost + 400,
        height: topmost - bottommost + 400,
      },
      position: {
        x: data.position.x + offset.x + 200,
        y: offset.y,
      },
      style: {
        width: rightmost - leftmost + 400,
        height: topmost - bottommost + 400,
        border: "2px dashed #888",
        backgroundColor: "rgba(173, 216, 230, 0.5)",
        borderRadius: "10px",
      },
    };
    let newScopeEdges: any[] = [];
    let edgesToRemove: any[] = [];

    data.input_slots.forEach((inputSlot: any) => {
      const inputEdge = edges.find(
        (edge: Edge) =>
          edge.target === data.id &&
          edge.targetHandle === `node-${data.id}-input-${inputSlot.id}`
      );
      if (inputEdge && inputNode) {
        const correspondingInputNodeSlot = inputNode.data.input_slots.find(
          (slot: any) => slot.name === inputSlot.name
        );
        if (correspondingInputNodeSlot) {
          if (!removeSlots.includes(inputSlot)) {
            removeSlots.push(inputSlot);
          }
          edgesToRemove.push(inputEdge as any);
          newScopeEdges.push({
            id: `new-edge-${inputEdge.sourceHandle}-to-${correspondingInputNodeSlot.id}`,
            source: inputEdge.source,
            sourceHandle: inputEdge.sourceHandle,
            target: inputNode.id,
            targetHandle: `node-${inputNode.id}-input-${correspondingInputNodeSlot.id}`,
          });
        }
      }
    });

    data.output_slots.forEach((outputSlot: any) => {
      const outputEdge = edges.find(
        (edge: Edge) =>
          edge.source === data.id &&
          edge.sourceHandle === `node-${data.id}-output-${outputSlot.id}`
      );
      if (outputEdge && outputNode) {
        const correspondingOutputNodeSlot = outputNode.data.output_slots.find(
          (slot: any) => slot.name === outputSlot.name
        );
        if (correspondingOutputNodeSlot) {
          if (!removeSlots.includes(outputSlot)) {
            removeSlots.push(outputSlot);
          }
          edgesToRemove.push(outputEdge as any);
          newScopeEdges.push({
            id: `new-edge-${correspondingOutputNodeSlot.id}-to-${outputEdge.targetHandle}`,
            source: outputNode.id,
            sourceHandle: `node-${outputNode.id}-output-${correspondingOutputNodeSlot.id}`,
            target: outputEdge.target,
            targetHandle: outputEdge.targetHandle,
          });
        }
      }
    });
    data.output_slots.push({
      id: `node-${data.id}-output-${scopeId}`,
      name: response.data.name,
      attachment_type: "OUT",
    });
    newScopeEdges.push({
      id: `new-edge-${data.id}-to-${scopeId}`,
      source: data.id,
      sourceHandle: `node-${data.id}-output-node-${data.id}-output-${scopeId}`,
      target: `scope-region-${scopeId}`,
      targetHandle: `scope-node-${scopeId}`,
    });
    const newNodes = [scopeRegion, ...shiftedScopeNodes];
    const newEdges = [...scopeEdges, ...newScopeEdges];
    const removeEdges = edgesToRemove;
    const newOffset = { x: offset.x, y: offset.y + topmost - bottommost + 500 };
    return {
      nodes: newNodes,
      edges: newEdges,
      removeEdges: removeEdges,
      removeSlots: removeSlots,
      offset: newOffset,
      shift: rightmost - leftmost + 400,
    };
  } catch (error) {
    console.error("Error opening scope:", error);
    return {
      nodes,
      edges,
      offset,
      shift: 0,
      removeEdges: [],
      removeSlots: removeSlots,
    };
  }
};

export const handleCollapseScope = async (
  scope: any,
  nodes: Node[],
  edges: Edge[]
) => {
  try {
    const scopeNodes = nodes.filter(
      (node) => node.data.isScopeNode && node.data.flow === scope.block.flow.id
    );
    const scopeNodeIds = scopeNodes.map((node) => node.id);
    let scopeEdges = edges.filter(
      (edge) =>
        scopeNodeIds.includes(edge.source) && scopeNodeIds.includes(edge.target)
    );

    if (scopeNodes.length === 0) {
      console.error("No scope nodes found to collapse");
    }

    const inputNode = scopeNodes.find(
      (node) => node.data.node_type === "InputNode"
    );
    const outputNode = scopeNodes.find(
      (node) => node.data.node_type === "OutputNode"
    );

    if (!inputNode || !outputNode) {
      console.error("Scope must have input and output nodes");
    }

    if (inputNode) {
      inputNode.data.input_slots = [];
    }

    if (outputNode) {
      outputNode.data.output_slots = [];
    }

    const scopeData = {
      nodes: scopeNodes.map((node) => ({
        id: node.id,
        position: node.position,
        inputs: node.data.input_slots,
        outputs: node.data.output_slots,
      })),
      connections: scopeEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        source_slot: edge.sourceHandle
          ?.replace(`node-${edge.source}`, "")
          .replace("-output-", ""),
        target_slot: edge.targetHandle
          ?.replace(`node-${edge.target}`, "")
          .replace("-input-", ""),
      })),
    };
    console.log("Scope data:", scopeData);
    await axios.post("http://localhost:8000/v2/save/", {
      nodes: scopeData.nodes,
      connections: scopeData.connections,
      flow_id: scope.block.flow.id,
    });
  } catch (error) {
    console.error("Error opening scope:", error);
  }
};

export const saveFlow = async (
  flowId: string,
  nodes: Node[],
  edges: Edge[]
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
      (edge) => nodeIds.includes(edge.source) && nodeIds.includes(edge.target)
    )
    .filter((connection) => connection.sourceHandle && connection.targetHandle);

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
  const response = await axios.post("http://localhost:8000/v2/save/", {
    nodes: convertedNodes,
    connections: convertedConnections,
    flow_id: flowId,
  });
  return response.data;
};

export const executeFlow = async (flowId: string, flowService: any) => {
  return flowService.executeFlow(flowId);
};
