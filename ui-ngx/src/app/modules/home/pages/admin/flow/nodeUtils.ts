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
      `/backend/v2/flows/${scopeId}/nodes/`
    );
    const { nodes: scopeNodes, edges: scopeEdges } = convertData(
      response.data.nodes,
      scopeId,
      nodeFields
    );
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
    console.log(nodes, scope);
    const id = scope.block ? scope.block.flow.id : scope.flow.id;
    const scopeNodes = nodes.filter((node) => node.data.flow === id);

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

    // await axios.post('/backend/v2/save/', {
    //   nodes: scopeData.nodes,
    //   connections: scopeData.connections,
    //   flow_id: id,
    // });
  } catch (error) {
    console.error("Error opening scope:", error);
  }
};

export const handleOpenAllScopes = async (
  scopes: any[],
  data: any,
  offset: { x: number; y: number },
  nodes: Node[],
  edges: any[],
  nodeFields: any,
  setRemovedSlots: (arg0: any[]) => void,
  setNodes: (arg0: any[]) => void,
  setEdges: (arg0: any[]) => void,
  setOffset: (arg0: any) => void,
  setOpenScopes: (arg0: boolean) => void
) => {
  let currentOffset = offset;
  let updatedNodes: any[] = [];
  let updatedEdges: any[] = [];
  let removeEdges: any[] = [];
  let removeSlots: any[] = [];
  let shift = 0;
  let result;
  for (const scope of scopes || []) {
    let id;
    if (scope.block) {
      id = scope.block.flow.id;
    } else {
      id = scope.flow.id;
    }
    result = await handleOpenScope(
      id,
      data,
      nodes,
      edges,
      removeSlots,
      currentOffset,
      nodeFields
    );
    currentOffset = result.offset;
    updatedNodes = [...updatedNodes, ...result.nodes];
    updatedEdges = [...updatedEdges, ...result.edges];
    removeEdges = [...removeEdges, ...result.removeEdges];
    shift = Math.max(shift, result.shift);
  }
  const shiftedNodes = nodes
    .filter((node) => node.type === "custom")
    .map((node) =>
      node.position.x > data.position.x
        ? {
            ...node,
            position: {
              x: node.position.x + shift,
              y: node.position.y,
            },
            data: {
              ...node.data,
              position: {
                x: node.position.x + shift,
                y: node.position.y,
              },
            },
          }
        : node
    );

  const shiftedUpdatedNodes = updatedNodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x,
      y: node.position.y - currentOffset.y / 2,
    },
    data: {
      ...node.data,
      position: {
        x: node.position.x,
        y: node.position.y - currentOffset.y / 2,
      },
    },
  }));
  setRemovedSlots(removeSlots);
  data.input_slots = data.input_slots.filter(
    (slot: any) => !removeSlots.includes(slot)
  );
  data.output_slots = data.output_slots.filter(
    (slot: any) => !removeSlots.includes(slot)
  );
  data.styles = {
    ...data.styles,
    opacity: 0.5,
    zIndex: -1000,
  };

  const parentScope: any = nodes.find(
    (node) => node.type === "scopeRegion" && node.data.scopeId === data.flow
  );

  if (parentScope) {
    const maxHeight = Math.max(
      ...updatedNodes.map(
        (node) =>
          node.position.y +
          (node.style?.height ? parseInt(node.style.height) / 2 : 0)
      )
    );
    const minHeight = Math.min(
      ...updatedNodes.map(
        (node) =>
          node.position.y -
          (node.style?.height ? parseInt(node.style.height) / 2 : 0)
      )
    );
    const newWidth = parentScope?.data?.width
      ? `${parseInt(parentScope.style.width as string) + shift}px`
      : shift;

    const newHeight = maxHeight + Math.abs(minHeight) + 300;
    shiftedNodes.push({
      ...parentScope,
      data: {
        ...parentScope?.data,
        width: newWidth,
        height: newHeight,
      },
      style: {
        ...parentScope?.style,
        width: newWidth,
        height: newHeight,
      },
      position: {
        ...parentScope.position,
        y: parentScope.position.y - (maxHeight + Math.abs(minHeight)) / 2,
      },
    });
  }
  console.log([...shiftedNodes, ...shiftedUpdatedNodes]);
  setNodes([...shiftedNodes, ...shiftedUpdatedNodes]);
  setEdges([
    ...edges.filter((ed: any) => !removeEdges.includes(ed)),
    ...updatedEdges.filter((ed) => !removeEdges.includes(ed)),
  ]);
  setOffset(currentOffset);
  setOpenScopes(true);
};

export const handleCollapseAllScopes = async (
  scopes: any[],
  data: any,
  nodes: Node[],
  edges: any[],
  nodeFields: any,
  removedSlots: any[],
  setNodes: (arg0: any[]) => void,
  setEdges: (arg0: any[]) => void,
  setOffset: (arg0: any) => void,
  setOpenScopes: (arg0: boolean) => void
) => {
  console.log(nodes, edges);
  data.input_slots = [
    ...data.input_slots,
    ...removedSlots.filter(
      (slot: { attachment_type: string }) => slot.attachment_type === "IN"
    ),
  ];
  data.output_slots = [
    ...data.output_slots,
    ...removedSlots.filter(
      (slot: { attachment_type: string }) => slot.attachment_type === "OUT"
    ),
  ];

  for (const scope of scopes || []) {
    await handleCollapseScope(scope, nodes, edges);
  }
  const response = await axios.get(
    `/backend/v2/flows/${data.flow}/nodes/`
  );
  const { nodes: newNodes, edges: newEdges } = convertData(
    response.data.nodes,
    data.flow,
    nodeFields
  );

  setNodes(newNodes);
  setEdges(newEdges);
  setOpenScopes(false);
  setOffset({ x: 100, y: data.position.y });
};

export const executeFlow = async (flowId: string, flowService: any) => {
  await axios.post(`/backend/v2/flows/${flowId}/execute/`, {});
};

export const notebook_start = async (flowId: string) => {
  try {
    await axios.post(`/backend/v2/flows/${flowId}/notebook/start/`, {});
  } catch (error) {
    console.error("Error starting notebook:", error);
  }
}

export const updateNodePosition = async (
  nodeId: string,
  position: { x: number; y: number }
) => {
  try {
    await axios.patch(`/backend/v2/nodes/${nodeId}/`, {
      position,
    });
  } catch (error) {
    console.error("Error updating node position:", error);
  }
};

export const deleteNode = async (nodeId: string) => {
  try {
    await axios.delete(`/backend/v2/nodes/${nodeId}/`);
  } catch (error) {
    console.error("Error deleting node:", error);
  }
};

export const deleteEdge = async (edgeId: string) => {
  try {
    await axios.delete(`/backend/v2/connections/${edgeId}/`);
  } catch (error) {
    console.error("Error deleting connection:", error);
  }
};

export const createConnection = async (connectionData: any) => {
  const convertedConnection = {
    id: connectionData.id,
    source: connectionData.source,
    target: connectionData.target,
    from_slot: connectionData.sourceHandle
      ?.replace(`node-${connectionData.source}`, "")
      .replace("-output-", ""),
    to_slot: connectionData.targetHandle
      ?.replace(`node-${connectionData.target}`, "")
      .replace("-input-", ""),
  };
  try {
    const response = await axios.post("/backend/v2/connections/", convertedConnection);
    return response.data.id;
  } catch (error) {
    console.error("Error creating connection:", error);
    return null;
  }
};

const extractSlotId = (handleId: string | null): string => {
  if (!handleId) return "";
  const parts = handleId.split("-");
  return parts[parts.length - 1];
};
