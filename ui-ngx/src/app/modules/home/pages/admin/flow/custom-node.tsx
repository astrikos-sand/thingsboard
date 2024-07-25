import React, { useState, useContext } from "react";
import { Handle, Position } from "reactflow";
import { FlowContext, FlowContextType } from "./flow-context";
import { convertData, handleCollapseScope, handleOpenScope } from "./nodeUtils";
import axios from "axios";
import NodeFieldHandler from "./NodeFieldHandler";

function CustomNode({
  data,
  isConnectable,
}: {
  data: any;
  isConnectable: any;
}) {
  if (!data.toShow) return null;
  const color = data.node_fields["color"];
  const attrs = data.node_fields["attrs"];
  const [offset, setOffset] = useState({ x: 100, y: data.position.y });
  const [removedSlots, setRemovedSlots] = useState<any[]>([]);
  const [openScopes, setOpenScopes] = useState<boolean>(false);
  const { nodes, edges, nodeFields, setNodes, setEdges } = useContext(
    FlowContext
  ) as FlowContextType;
  data.styles = data.styles || {};

  const handleOpenAllScopes = async (scopes: any[]) => {
    let currentOffset = offset;
    let updatedNodes: any[] = [];
    let updatedEdges: any[] = [];
    let removeEdges: any[] = [];
    let removeSlots: any[] = [];
    let shift = 0;
    let result;
    for (const scope of scopes || []) {
      result = await handleOpenScope(
        scope.block.flow.id,
        data,
        nodes,
        edges,
        removeSlots,
        currentOffset,
        nodeFields
      );
      currentOffset = result.offset;
      updatedNodes = [...updatedNodes, ...result.nodes];
      console.log(updatedNodes);
      updatedEdges = [...updatedEdges, ...result.edges];
      removeEdges = [...removeEdges, ...result.removeEdges];
      shift = Math.max(shift, result.shift);
    }
    console.log(
      nodes.map((n) => {
        return {
          id: n.id,
          type: n.type,
          node_type: n.data.node_type,
          flow: n.data.flow,
          isScopeNode: n.data.isScopeNode,
          input_slots: n.data.input_slots,
          output_slots: n.data.output_slots,
          connections_in: n.data.connections_in,
          connections_out: n.data.connections_out,
          ...n.data,
        };
      })
    );
    const shiftedNodes = nodes
      .filter((node) => !node.data.isScopeNode && node.type === "custom")
      .map((node) =>
        node.position.x > data.position.x
          ? {
              ...node,
              position: {
                x: node.position.x + shift,
                y: node.position.y + offset.y,
              },
              data: {
                ...node.data,
                position: {
                  x: node.position.x + shift,
                  y: node.position.y + offset.y,
                },
                isScopeNode: false,
              },
            }
          : node
      );
    console.log(
      shiftedNodes.map((n) => {
        return {
          id: n.id,
          type: n.type,
          node_type: n.data.node_type,
          flow: n.data.flow,
          isScopeNode: n.data.isScopeNode,
          input_slots: n.data.input_slots,
          output_slots: n.data.output_slots,
          connections_in: n.data.connections_in,
          connections_out: n.data.connections_out,
          ...n.data,
        };
      })
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
        isScopeNode: true,
      },
    }));
    setRemovedSlots(removeSlots);
    data.input_slots = data.input_slots.filter(
      (slot: any) => !removeSlots.includes(slot)
    );
    data.output_slots = data.output_slots.filter(
      (slot: any) => !removeSlots.includes(slot)
    );
    data.styles = { ...data.styles, opacity: 0.5, zIndex: -1000 };
    setNodes([...shiftedNodes, ...shiftedUpdatedNodes]);
    setEdges([
      ...edges.filter((ed) => !removeEdges.includes(ed)),
      ...updatedEdges.filter((ed) => !removeEdges.includes(ed)),
    ]);
    setOffset(currentOffset);
    setOpenScopes(true);
  };

  const handleCollapseAllScopes = async (scopes: any[]) => {
    data.input_slots = [
      ...data.input_slots,
      ...removedSlots.filter((slot) => slot.attachment_type === "IN"),
    ];
    data.output_slots = [
      ...data.output_slots,
      ...removedSlots.filter((slot) => slot.attachment_type === "OUT"),
    ];

    for (const scope of scopes || []) {
      await handleCollapseScope(scope, nodes, edges);
    }
    const response = await axios.get(
      `http://localhost:8000/v2/flow/${data.flow}/nodes/`
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

  const renderExtraData = () => {
    if (data.cases) {
      return (
        <div className="custom-node__extra">
          {openScopes ? (
            <button
              className="scope-button"
              onClick={() => handleCollapseAllScopes(data.cases)}
            >
              Collapse All
            </button>
          ) : (
            <button
              className="scope-button"
              onClick={() => handleOpenAllScopes(data.cases)}
            >
              Open All
            </button>
          )}
        </div>
      );
    }
    if (data.block) {
      return (
        <div className="custom-node__extra">
          <div key={data.block.id} className="custom-node__scope-option">
            {!openScopes ? (
              <button
                className="scope-button"
                onClick={() => {
                  handleOpenAllScopes([data.block]);
                }}
              >
                Open {data.block.name}
              </button>
            ) : (
              <button
                className="scope-button"
                onClick={() => handleCollapseAllScopes([data.block])}
              >
                Collapse {data.block.name}
              </button>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id={data.id}
      style={{
        backgroundColor: color,
        opacity: data.styles.opacity ? data.styles.opacity : 1,
      }}
    >
      <div className="custom-node__header">
        <strong>{data.id}</strong>
      </div>
      <div className="custom-node__body">
        {data.input_slots?.map((input: any) => (
          <div
            key={`node-${data.id}-input-${input.id}`}
            className="custom-node__input"
          >
            <div>
              {input.name}
            </div>
            <Handle
              type="target"
              position={Position.Left}
              id={`node-${data.id}-input-${input.id}`}
              style={{ left: -14, top: 6 }}
              isConnectable={isConnectable}
            />
          </div>
        ))}
        {data.output_slots?.map((output: any) => (
          <div
            key={`node-${data.id}-output-${output.id}`}
            className="custom-node__output"
          >
            <div style={{ right: 0, position: "absolute" }}>
              {output.name}
            </div>
            <Handle
              type="source"
              position={Position.Right}
              id={`node-${data.id}-output-${output.id}`}
              style={{ right: -14, top: 6 }}
              isConnectable={isConnectable}
            />
          </div>
        ))}
      </div>
      {renderExtraData()}
      <div>
        <NodeFieldHandler data={attrs} node_data={data} />
      </div>
    </div>
  );
}

export default CustomNode;
