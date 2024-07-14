import React, { useState, useEffect } from "react";
import { Handle, Position } from "reactflow";
import axios from "axios";

function CustomNode({ data, isConnectable }: { data: any; isConnectable: any }) {
  const [showDataModal, setShowDataModal] = useState(false);
  const [editedData, setEditedData] = useState(data.value || "");
  const [originalData, setOriginalData] = useState(data.value || "");
  console.log(data)
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


  useEffect(() => {
    setEditedData(data.value || "");
    setOriginalData(data.value || "");
  }, [data.value]);

  return (
    <>
      <div className="custom-node__header">
        <strong>{data.type}</strong>
      </div>
      <div className="custom-node__body">
        {data.input_slots?.map((input: any) => (
          <div key={`node-${data.id}-input-${input.id}`} className="custom-node__input">
            <div>{input.name}</div>
            <Handle type="target" position={Position.Left} id={`node-${data.id}-input-${input.id}`} style={{ left: -14, top: 6 }} isConnectable={isConnectable} />
          </div>
        ))}
        {data.output_slots?.map((output: any) => (
          <div key={`node-${data.id}-output-${output.id}`} className="custom-node__output">
            <div style={{ right: 0, position: "absolute" }}>{output.name}</div>
            <Handle type="source" position={Position.Right} id={`node-${data.id}-output-${output.id}`} style={{ right: -14, top: 6 }} isConnectable={isConnectable} />
          </div>
        ))}
      </div>
      {data.node_type === "DataNode" && (
        <div className="custom-node__body">
          <button style={{ cursor: "pointer" }} onClick={handleDataClick}>
            Show Data
          </button>
        </div>
      )}
      {showDataModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContainer}>
            <h2>Edit Data</h2>
            <textarea value={editedData} onChange={handleDataChange} rows={4} style={styles.textarea} />
            <div style={styles.modalActions}>
              <button onClick={handleSaveData} disabled={editedData === originalData} style={styles.button}>
                Save
              </button>
              <button onClick={handleClose} style={styles.button}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  modalOverlay: {
    position: "fixed" as "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    background: "white",
    padding: "20px",
    borderRadius: "8px",
    width: "400px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
  },
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
  button: {
    marginLeft: "10px",
    padding: "5px 10px",
    cursor: "pointer",
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
  },
};

export default CustomNode;
