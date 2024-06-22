import React, { useState } from "react";
import { Handle, Position, Node, NodeProps } from "reactflow";
// import {
//   Box,
//   Modal,
// } from "@mui/material";

function CustomNode({ data, isConnectable }: { data: any; isConnectable: any }) {
  const [resultModal, setResultModal] = useState(false)
  const value =
    data.node_type == "DataNode"
      ? `${data.name} (${data.type}) (DataNode)`
      : `${data.node_class_name} (${data.node_class_type})`;

  const special_input_slots = data.special_slots?.filter(
    (slot) => slot.attachment_type === "IN"
  );
  const special_output_slots = data.special_slots?.filter(
    (slot) => slot.attachment_type === "OUT"
  );

  return (
    <>
      <div className="custom-node__header">
        <strong>{value}</strong>
        {data.node_type !== "DataNode" && <div>
          <button style={{ cursor: 'pointer !important' }} onClick={() => {
            window.open(data.code, "_blank")
          }}>
            Code Link
          </button>
        </div>}
        {/* {data?.outputs && <button style={{ cursor: 'pointer !important' }} onClick={() => setResultModal(true)}>
          Results
        </button>}
        <Modal open={resultModal} onClose={() => setResultModal(false)}>
          <Box className="modal-container">
            <div>{data?.outputs}</div>
          </Box>
        </Modal> */}
      </div>
      <div className="custom-node__body">
        {data.input_slots?.map((input, index) => (
          <div key={`node-${data.id}-input-${input}`} className="custom-node__input">
            <div>{input}</div>
            <Handle
              type="target"
              position={Position.Left}
              id={`node-${data.id}-input-${input}`}
              style={{ left: -14, top: 6 }}
              isConnectable={isConnectable}
            />
          </div>
        ))}
        {data.output_slots?.map((output, index) => (
          <div key={`node-${data.id}-output-${output}`} className="custom-node__output">
            <div style={{ right: 0, position: "absolute" }}>
              {data.node_type === "DataNode" ? data.value : output}
            </div>
            <Handle
              type="source"
              position={Position.Right}
              id={`node-${data.id}-output-${output}`}
              style={{ right: -14, top: 6 }}
              isConnectable={isConnectable}
            />
          </div>
        ))}

        {special_input_slots?.map((output, index) => (
          <div key={`node-${data.id}-input-${output.name}`} className="custom-node__output">
            <div>{output.name} ({output.speciality})</div>
            <Handle
              type="target"
              position={Position.Left}
              id={`node-${data.id}-input-${output.name}`}
              style={{ left: -14, top: 6 }}
              isConnectable={isConnectable}
            />
          </div>
        ))}

        {special_output_slots?.map((output, index) => (
          <div key={`node-${data.id}-output-${output.name}`} className="custom-node__output">
            <div style={{ right: 0, position: "absolute" }}>{output.name} ({output.speciality})</div>
            <Handle
              type="source"
              position={Position.Right}
              id={`node-${data.id}-output-${output.name}`}
              style={{ right: -14, top: 6 }}
              isConnectable={isConnectable}
            />
          </div>
        ))}

        {data.delayed_output_slots?.map((output, index) => (
          <div key={`node-${data.id}-output-${output}`} className="custom-node__output">
            <div style={{ right: 0, position: "absolute" }}>{output} (Delayed)</div>
            <Handle
              type="source"
              position={Position.Right}
              id={`node-${data.id}-output-${output}`}
              style={{ right: -14, top: 6 }}
              isConnectable={isConnectable}
            />
          </div>
        ))}

        {data.delayed_special_output_slots?.map((output, index) => (
          <div key={`node-${data.id}-output-${output.name}`} className="custom-node__output">
            <div style={{ right: 0, position: "absolute" }}>{output.name} ({output.speciality}) (Delayed)</div>
            <Handle
              type="source"
              position={Position.Right}
              id={`node-${data.id}-output-${output.name}`}
              style={{ right: -14, top: 6 }}
              isConnectable={isConnectable}
            />
          </div>
        ))}
      </div>
    </>
  );
}

export default CustomNode;
