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
  status_data?: any;
  flowId?: string;
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
  status_data: null,
});

export const FlowProvider = ({ children, flowId }: { children: ReactNode, flowId?: string }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [nodeFields, setNodeFields] = useState<any[]>([]);
  const [removedSlots, setRemovedSlots] = useState<any[]>([]);
  const [openEditingDialogBox, setOpenEditingDialogBox] = useState<any>(null);
  const [status_data, setStatusData] = useState<any>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/events/${flowId}/`);

    eventSource.onmessage = (event) => {
      const newMessage = event.data;
      if (newMessage.includes("ping")) {
        setStatusData({});
        return;
      }
      else if (newMessage.includes("reset")) {
        setStatusData({});
        return;
      }
      const parsedMessage = JSON.parse(newMessage);
      const map = {}
      parsedMessage.nodes.map((node: any) => {
        map[node.id] = node.status
      })
      setStatusData(map)
    };

    eventSource.onerror = () => {
      console.error('Error with SSE connection');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

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
        status_data,
      }}
    >
      {children}
    </FlowContext.Provider>
  );
};

export const useFlowContext = () => useContext(FlowContext);
