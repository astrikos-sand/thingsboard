import React, {
  createContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
} from "react";
import { Node, Edge } from "reactflow";
import axios from "axios";

export interface FlowContextType {
  nodes: Node[];
  edges: Edge[];
  removedSlots: any[];
  setRemovedSlots: Dispatch<SetStateAction<any[]>>;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  nodeFields: any[];
  openEditingDialogBox: any;
  setOpenEditingDialogBox: Dispatch<SetStateAction<any>>;
}

export const FlowContext = createContext<FlowContextType>({
  nodes: [],
  edges: [],
  removedSlots: [],
  setRemovedSlots: () => {},
  setNodes: () => {},
  setEdges: () => {},
  nodeFields: [],
  openEditingDialogBox: null,
  setOpenEditingDialogBox: () => {},
});

export const FlowProvider = ({ children }: { children: ReactNode }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [nodeFields, setNodeFields] = useState<any[]>([]);
  const [removedSlots, setRemovedSlots] = useState<any[]>([]);
  const [openEditingDialogBox, setOpenEditingDialogBox] = useState<any>(null);

  useEffect(() => {
    const fetchNodeFields = async () => {
      try {
        const response = await axios.get(
          `/backend/v2/fields/node_fields/`
        );
        setNodeFields(response.data);
      } catch (error) {
        console.error("Error fetching node fields:", error);
      }
    };

    fetchNodeFields();
  }, []);

  return (
    <FlowContext.Provider
      value={{
        nodes,
        edges,
        removedSlots,
        setRemovedSlots,
        nodeFields,
        setNodes,
        setEdges,
        openEditingDialogBox,
        setOpenEditingDialogBox,
      }}
    >
      {children}
    </FlowContext.Provider>
  );
};

export const useFlowContext = () => useContext(FlowContext);
