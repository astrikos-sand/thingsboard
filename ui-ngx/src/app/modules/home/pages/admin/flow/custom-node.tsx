import React, { useState, useContext } from "react";
import { Handle, Position } from "reactflow";
import { FlowContext, FlowContextType } from "./flow-context";
import { handleCollapseAllScopes, handleOpenAllScopes } from "./nodeUtils";

const handleNodeHeader = (nodeType: string) => {
  if (nodeType === "FunctionNode")
    return <img src="/assets/mlworkbench/code.svg" alt="Function" />
  else if (nodeType === "DataNode") return <img src="/assets/mlworkbench/data.svg" alt="Data" />
  else if (nodeType === "FlowNode") return <img src="/assets/mlworkbench/flow.svg" alt="Flow" />
  else if (nodeType === "InputNode") return <img src="/assets/mlworkbench/input.svg" alt="Input" />
  else if (nodeType === "OutputNode") return <img src="/assets/mlworkbench/output.svg" alt="Output" />
  else return <strong>{nodeType}</strong>
};

const handleNodeColor = (node_type: string, color: string) => {
  let bg: string, txtclr: string, ligthclr: string;
  if (node_type === "FunctionNode") { bg = "rgb(224 201 255)"; txtclr = "#381C5D", ligthclr = "rgb(238 226 255)" }
  else if (node_type === "DataNode") { bg = "rgb(201 236 253)"; txtclr = "#1A374D", ligthclr = "#a4e3ff" }
  else if (node_type === "FlowNode") { bg = "#437BA7"; txtclr = "white", ligthclr = "#6e9dbf" }
  else if (node_type === "InputNode") { bg = "#A3D977"; txtclr = "#2E4B1D", ligthclr = "#c4e8a4" }
  else if (node_type === "OutputNode") { bg = "#FFA74D"; txtclr = "#4A2F1D", ligthclr = "#ffcc99" }
  else { bg = color; txtclr = "white", ligthclr = "#6e9dbf" }
  return { bg, txtclr, ligthclr };
};

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

  const {
    nodes,
    edges,
    nodeFields,
    removedSlots,
    setRemovedSlots,
    setNodes,
    setEdges,
    setOpenEditingDialogBox,
  } = useContext(FlowContext) as FlowContextType;

  data.styles = data.styles || {};
  const nodeName = data.definition?.name || data.name || "";

  const [hoveredNode, setHoveredNode] = useState<boolean>(false);
  const [hoveredDesc, setHoveredDesc] = useState<boolean>(false);
  const showDescription = hoveredNode || hoveredDesc;

  const [openScopes, setOpenScopes] = useState<boolean>(false);
  const [offset, setOffset] = useState({ x: 100, y: data.position.y });

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
                onClick={() =>
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
                  )
                }
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

  const { bg, txtclr, ligthclr } = handleNodeColor(data.node_type, color);
  const datastore = Object.keys(data.datastore || {})
  let description = data.definition?.description || "No description available"
  description = description.length > 300 ? description.substring(0, 300) + "..." : description;

  const handleSlotColor = (slot: any) => {
    if (datastore.includes(slot.name)) {
      return { backgroundColor: "green" }
    }
    return {}
  }

  return (
    <div
      id={data.id}
      style={{
        backgroundColor: bg,
        opacity: data.styles.opacity ? data.styles.opacity : 1,
        color: txtclr,
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        handleEditClick();
      }}
      className="custom-node"
    >
      <div className="custom-node__header"
        onMouseLeave={() => setHoveredNode(false)}
      >
        {
          handleNodeHeader(data.node_type)
        }
        <span onMouseEnter={() => {
          if (data.node_type === "FunctionNode") {
            setHoveredNode(true);
          }
        }}>
          {nodeName}
        </span>
      </div>

      {showDescription && (
        <div
          className="custom-node__description"
          onMouseEnter={() => setHoveredDesc(true)}
          onMouseLeave={() => setHoveredDesc(false)}
        >
          <p>{description}</p>
        </div>
      )}

      <div className="custom-node__body">
        {data.input_slots?.map((input: any) => (
          <div
            key={`node-${data.id}-input-${input.id}`}
            className="custom-node__input"
          >
            <div className="custom-node__input__name"
              style={{ backgroundColor: ligthclr }}
            ><span>{input.name}</span></div>
            <Handle
              type="target"
              position={Position.Left}
              id={`node-${data.id}-input-${input.id}`}
              style={{ top: "50%", transform: "translateY(-50%)", ...handleSlotColor(input) }}
              isConnectable={isConnectable}
            />
          </div>
        ))}
        {data.output_slots?.map((output: any) => (
          <div
            key={`node-${data.id}-output-${output.id}`}
            className="custom-node__output"
          >
            <div className="custom-node__output__name"
              style={{ backgroundColor: ligthclr }}
            ><span>{output.name}</span></div>
            <Handle
              type="source"
              position={Position.Right}
              id={`node-${data.id}-output-${output.id}`}
              style={{ top: "50%", transform: "translateY(-50%)", right: "-5px" }}
              isConnectable={isConnectable}
            />
          </div>
        ))}
      </div>

      {renderExtraData()}

      {/* <div className="custom-node__header__button">
        <button onClick={handleEditClick} style={{
          backgroundColor: ligthclr,
          color: txtclr
        }}>
          Show
        </button>
      </div> */}
    </div>
  );
}

export default CustomNode;
