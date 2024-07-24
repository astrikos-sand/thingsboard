import React from "react";
import { memo } from "react";
import { Handle, Position, NodeResizer } from "reactflow";

const ScopeRegion = ({ data }: { data: any }) => {
  console.log(data);
  return (
    <>
      <NodeResizer minWidth={data.width} minHeight={data.height} />
      <div
        id={`scope-region-${data.scopeId}`}
        className="scope-region"
        style={{
          width: data.width,
          height: data.height,
          position: "absolute",
          pointerEvents: "none",
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          id={`scope-node-${data.scopeId}`}
          style={{
            left: -10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "#555",
          }}
          isConnectable={true}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            padding: "5px",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            borderBottomRightRadius: "8px",
          }}
        >
          <div>
            Scope Name: <strong>{data.scopeName}</strong>
          </div>
          <div>
            Scope Id: <strong>{data.scopeId}</strong>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(ScopeRegion);
