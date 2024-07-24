import React, { useState, useEffect, useContext } from "react";
import { Handle, Position, Edge } from "reactflow";
import { FlowContext, FlowContextType } from "./flow-context";
import { handleOpenScope, handleCollapseScope, convertData } from "./nodeUtils";
import axios from "axios";

function Popup({
  children,
  onChange,
}: {
  children: React.ReactNode;
  onChange: () => void;
}) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContainer}>
        <div style={{ marginBottom: "10px" }}>
          <button style={styles.button} onClick={onChange}>
            &times;
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: "fixed" as "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
  modalContainer: {
    background: "white",
    width: "100%",
    padding: "20px",
  },
  button: {
    marginLeft: "10px",
    padding: "5px 10px",
    cursor: "pointer",
    border: "none",
    borderRadius: "4px",
  },
};

const datanode_edit_styles = {
  textarea: {
    width: "100%",
    height: "100px",
    margin: "10px 0",
    padding: "10px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    resize: "none" as "none",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
  },
};

function DataNodeEdit({ data }: { data: any }) {
  useEffect(() => {
    setEditedData(data.value || "");
    setOriginalData(data.value || "");
  }, [data.value]);

  const [editedData, setEditedData] = useState(data.value || "");
  const [originalData, setOriginalData] = useState(data.value || "");

  const [showDataModal, setShowDataModal] = useState(false);
  const handleDataClick = () => {
    setShowDataModal(true);
  };

  const handleDataChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedData(event.target.value);
  };

  const handleSaveData = async () => {
    try {
      await axios.patch(`http://localhost:8000/nodes/${data.id}/`, {
        value: editedData,
      });
      setOriginalData(editedData);
      setShowDataModal(false);
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const handleClose = () => {
    setEditedData(originalData);
    setShowDataModal(false);
  };

  return (
    <div>
      <div className="custom-node__body">
        <button style={{ cursor: "pointer" }} onClick={handleDataClick}>
          Edit
        </button>
      </div>
      {showDataModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContainer}>
            <h2>Edit Data</h2>
            <textarea
              value={editedData}
              onChange={handleDataChange}
              rows={4}
              style={datanode_edit_styles.textarea}
            />
            <div style={datanode_edit_styles.modalActions}>
              <button
                onClick={handleSaveData}
                disabled={editedData === originalData}
                style={styles.button}
              >
                Save
              </button>
              <button onClick={handleClose} style={styles.button}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NodeFieldHandler({ data, node_data }: { data: any; node_data: any }) {
  const popupChild: React.ReactNode[] = [];
  const nodeChild: React.ReactNode[] = [];
  const [showPopup, setShowPopup] = useState(false);

  // TODO: Make it dynamic
  if (node_data.node_type === "DataNode") {
    popupChild.push(
      <div key={`popup-${popupChild.length}`}>
        <DataNodeEdit data={node_data} />
      </div>
    );
  }

  function constructField(field: any) {
    switch (field["type"]) {
      case "span": {
        const keys = field["key"];
        const label = field["label"];

        const value = keys.reduce(
          (acc: any, curr: any) => acc && acc[curr],
          node_data
        );
        return (
          <span>
            <strong>{label}:</strong> {value}
          </span>
        );
      }
      case "p": {
        const keys = field["key"];
        const label = field["label"];

        const value = keys.reduce(
          (acc: any, curr: any) => acc && acc[curr],
          node_data
        );
        return (
          <p>
            <strong>{label}:</strong> {value}
          </p>
        );
      }
      case "id": {
        return <small>id: {node_data.id.slice(0, 8)}</small>;
      }
      case "link": {
        const keys = field["key"];
        const label = field["label"];

        const value = keys.reduce(
          (acc: any, curr: any) => acc && acc[curr],
          node_data
        );
        return (
          <a href={value} target={"_blank"}>
            Link to {label}
          </a>
        );
      }
      default: {
        return <>Field type not defined for {field["type"]}</>;
      }
    }
  }

  data.forEach((field: any) => {
    const placement = field["placement"];
    const child: React.ReactNode = constructField(field);

    if (placement === "popup") {
      popupChild.push(<div key={`popup-${popupChild.length}`}>{child}</div>);
    } else {
      nodeChild.push(<div key={`node-${nodeChild.length}`}>{child}</div>);
    }
  });

  return (
    <div>
      <button style={styles.button} onClick={() => setShowPopup(true)}>
        Show
      </button>
      {showPopup && (
        <Popup onChange={() => setShowPopup(false)}>{popupChild}</Popup>
      )}
      <div style={{ marginTop: "8px" }}>{nodeChild}</div>
    </div>
  );
}

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
              {input.name}: {input.id}
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
              {output.name}: {output.id}
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
