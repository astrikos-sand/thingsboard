import React, { useState, useContext } from "react";
import { Handle, Position } from "reactflow";
import { FlowContext, FlowContextType } from "./flow-context";
import { convertData, handleCollapseAllScopes, handleCollapseScope, handleOpenAllScopes, handleOpenScope } from "./nodeUtils";
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
  const {
    nodes,
    edges,
    nodeFields,
    removedSlots,
    setRemovedSlots,
    setNodes,
    setEdges,
  } = useContext(FlowContext) as FlowContextType;
  const [openScopes, setOpenScopes] = useState<boolean>(false);
  const { setOpenEditingDialogBox } = useContext(FlowContext) as FlowContextType;
  data.styles = data.styles || {};

  const renderExtraData = () => {
    if (data.cases) {
      return (
        <div className="custom-node__extra">
          {openScopes ? (
            <button
              className="scope-button"
              onClick={() =>
                handleCollapseAllScopes(
                  data.cases,
                  data,
                  nodes,
                  edges,
                  nodeFields,
                  removedSlots,
                  setNodes,
                  setEdges,
                  setOffset,
                  setOpenScopes
                )
              }
            >
              Collapse All
            </button>
          ) : (
            <button
              className="scope-button"
              onClick={() =>
                handleOpenAllScopes(
                  data.cases,
                  data,
                  offset,
                  nodes,
                  edges,
                  nodeFields,
                  setRemovedSlots,
                  setNodes,
                  setEdges,
                  setOffset,
                  setOpenScopes
                )
              }
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
                  handleOpenAllScopes(
                    [data.block],
                    data,
                    offset,
                    nodes,
                    edges,
                    nodeFields,
                    setRemovedSlots,
                    setNodes,
                    setEdges,
                    setOffset,
                    setOpenScopes
                  );
                }}
              >
                Open {data.block.name}
              </button>
            ) : (
              <button
                className="scope-button"
                onClick={() =>
                  handleCollapseAllScopes(
                    [data.block],
                    data,
                    nodes,
                    edges,
                    nodeFields,
                    removedSlots,
                    setNodes,
                    setEdges,
                    setOffset,
                    setOpenScopes
                  )
                }
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
  const handleEditClick = () => {
    setOpenEditingDialogBox(data);
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
        <button onClick={handleEditClick}>Show</button>
      </div>
    </div>
  );
}

export default CustomNode;
