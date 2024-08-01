import React, { useContext } from "react";
import { FlowContext, FlowContextType } from "./flow-context";

function NodeFieldHandler({ data, node_data }: { data: any; node_data: any }) {
  const nodeChild: React.ReactNode[] = [];
  const { setOpenEditingDialogBox } = useContext(FlowContext) as FlowContextType;

  const handleEditClick = () => {
    setOpenEditingDialogBox(node_data);
  };

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

    if (placement !== "popup") {
      nodeChild.push(<div key={`node-${nodeChild.length}`}>{child}</div>);
    }
  });

  return (
    <div>
      <button onClick={handleEditClick}>Show</button>
      <div style={{ marginTop: "8px" }}>{nodeChild}</div>
    </div>
  );
}

export default NodeFieldHandler;
