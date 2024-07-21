import React, { createContext, useState, ReactNode, Dispatch, SetStateAction, useContext, useEffect } from "react";
import { Node, Edge } from "reactflow";
import axios from "axios";

export interface FlowContextType {
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  nodeFields: any[];
}

export const FlowContext = createContext<FlowContextType>({
  nodes: [],
  edges: [],
  setNodes: () => {},
  setEdges: () => {},
  nodeFields: [],
});

export const FlowProvider = ({ children }: { children: ReactNode }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [nodeFields, setNodeFields] = useState<any[]>([]);

  useEffect(() => {
    const fetchNodeFields = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/v2/fields/node_fields/`);
        setNodeFields(response.data);
      } catch (error) {
        console.error("Error fetching node fields:", error);
      }
    };

    fetchNodeFields();
  }, []);

  return (
    <FlowContext.Provider value={{ nodes, edges, nodeFields, setNodes, setEdges }}>
      {children}
    </FlowContext.Provider>
  );
};

export const useFlowContext = () => useContext(FlowContext);
