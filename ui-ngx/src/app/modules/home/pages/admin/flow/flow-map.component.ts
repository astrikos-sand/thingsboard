import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { Node, Edge, addEdge } from "reactflow";
import { Subscription } from "rxjs";
import { FlowService } from "@app/core/services/flow.service";
import { NodeClassService } from "@app/core/services/node-classes.service";
import { SearchService } from "@app/core/services/search.service";
import { AddNewNodeDialog } from "./add-node-dialog.component";
import { EditNodeDialogComponent } from "./edit-node-dialog.component";
import { AddFunctionDialog } from "../functions/function-dialog.component";
import { ViewExecutionsDialogComponent } from "./view-executions-dialog.component";
import {
  convertData,
  executeFlow,
  notebook_start,
  uploadToAirflow,
} from "./nodeUtils";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { NestedTreeControl } from "@angular/cdk/tree";

interface FunctionNode {
  name: string;
  id: string;
  parent: string | null;
  children?: FunctionNode[];
  functions?: any[];
  isLoaded?: boolean;
}

@Component({
  selector: "flow-map",
  templateUrl: "./flow-map.component.html",
  styleUrls: ["./flow-map.component.scss"],
})
export class FlowMapComponent implements OnInit, OnDestroy {
  nodes: Node[] = [];
  edges: Edge[] = [];
  flowId!: string;
  node_fields: any[] = [];
  name!: string;
  full_name!: string;
  flowPosition: { x: number; y: number } | undefined;
  openEditingDialogBox: any = null;
  saveFlow: any = null;
  isLoading: boolean = false;
  executionTime: number | undefined;
  executionStatus: string | undefined;
  explorer_url: string = "";
  searchFilter: string = "name";
  searchQuery: string = "";
  treeControl = new NestedTreeControl<FunctionNode>((node) => node.children);
  functionTreeDataSource = new MatTreeNestedDataSource<FunctionNode>();
  selectedNode: FunctionNode | null = null;
  selectedFunctions: any[] = [];
  dataSource = new MatTableDataSource<any>(this.selectedFunctions);
  functionListSearchQuery: string = "";
  filteredFunctions: any[] = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private flowService: FlowService,
    private nodeClassService: NodeClassService,
    private searchService: SearchService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const flowDetails = data["flowDetails"];
      this.node_fields = data["nodeFields"];
      if (flowDetails) {
        this.flowId = flowDetails.flow.id;
        this.explorer_url = `http://192.168.0.218:9600/notebooks/${this.flowId.slice(
          0,
          8
        )}/`;
        const { nodes, edges } = convertData(
          flowDetails.nodes,
          this.flowId,
          this.node_fields
        );
        this.nodes = nodes;
        this.edges = edges;
        this.name = flowDetails.name;
        this.full_name = flowDetails.full_name;
      }
    });
    this.loadInitialFunctions();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onNodesChange(updatedNodes: Node[]): void {
    this.nodes = updatedNodes;
  }

  onEdgesChange(updatedEdges: Edge[]): void {
    this.edges = updatedEdges;
  }

  onConnect(connection: any): void {
    this.edges = addEdge(connection, this.edges);
  }

  onPositionChange(event: any): void {
    this.flowPosition = event;
  }

  onOpenEditingDialogBox(nodeData: any): void {
    this.openEditingDialogBox = nodeData;
    if (nodeData) {
      const dialogRef = this.dialog.open(EditNodeDialogComponent, {
        data: nodeData,
      });
      dialogRef.afterClosed().subscribe((result) => {
        const updatedNodes = this.nodes.map((node) =>
          node.id === nodeData.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  value: result !== undefined ? result : nodeData.value,
                },
              }
            : node
        );
        this.nodes = updatedNodes;
        this.openEditingDialogBox = null;
      });
    }
  }

  async saveToBackend(): Promise<void> {
    this.isLoading = true;
    try {
      this.saveFlow = this.flowId;
      alert("Saved to backend");
    } catch (error) {
      console.error("Error saving to backend:", error);
    } finally {
      this.isLoading = false;
    }
  }

  onFunctionDragStart(event: DragEvent, func: any): void {
    event.dataTransfer?.setData("application/reactflow", "custom");
    event.dataTransfer?.setData("nodeData", JSON.stringify(func));
    event.dataTransfer!.effectAllowed = "move";
  }

  onDropNodeToBackend = async (nodeData: any): Promise<void> => {
    const newNodeData = {
      node_type: "FunctionNode",
      flow: this.flowId,
      position: nodeData.position,
      definition: nodeData.id,
    };
    this.flowService.addNode(newNodeData).subscribe(
      (response: any) => {
        const {
          id,
          position,
          connections_in,
          node_type,
          connections_out,
          polymorphic_ctype,
          input_slots,
          output_slots,
          ...rest
        } = response;
        const newDataNode = {
          id: id.toString(),
          position: position,
          type: "custom",
          data: {
            id: id,
            label: "Node",
            position: position,
            polymorphic_ctype: polymorphic_ctype,
            input_slots: input_slots,
            output_slots: output_slots,
            toShow: true,
            flow: this.flowId,
            node_fields: this.node_fields[node_type],
            isScopeNode: false,
            node_type: node_type,
            ...rest,
          },
        };
        this.nodes = [...this.nodes, newDataNode];
        this.isLoading = false;
      },
      (error: any) => {
        console.error("Error creating node:", error);
        this.isLoading = false;
      }
    );
  };

  async execute_flow(): Promise<void> {
    this.isLoading = true;
    const startTime = new Date();
    try {
      await executeFlow(this.flowId, this.flowService);
      const endTime = new Date();
      this.executionTime = (endTime.getTime() - startTime.getTime()) / 1000;
      this.executionStatus = "Flow executed successfully";
      alert("Flow executed successfully");
    } catch (error) {
      console.error("Error executing flow:", error);
      this.executionStatus = "Error executing flow";
      alert("Error executing flow");
    } finally {
      this.isLoading = false;
    }
  }

  async upload_to_airflow(): Promise<void> {
    this.isLoading = true;
    try {
      await uploadToAirflow(this.flowId);
      setTimeout(() => {
        alert("Flow uploaded to Airflow successfully");
        this.isLoading = false;
      }, 25000);
    } catch (error) {
      console.error("Error uploading to Airflow:", error);
      this.isLoading = false;
    }
  }

  async start_notebook(): Promise<void> {
    this.isLoading = true;
    try {
      await notebook_start(this.flowId);
      alert("Notebook started successfully");
    } catch (error) {
      console.error("Error starting notebook:", error);
    } finally {
      this.isLoading = false;
    }
  }

  navigateToFlows(): void {
    this.router.navigate(["/resources/flows"]);
  }

  openAddNewNodeDialog(): void {
    const dialogRef = this.dialog.open(AddNewNodeDialog, {
      data: {
        flowId: this.flowId,
        nodes: this.nodes,
        node_fields: this.node_fields,
        setNodes: (newNodes: Node[]) => (this.nodes = newNodes),
        flowPosition: this.flowPosition,
        addNode: (newNode: Node) => {
          this.nodes = [...this.nodes, newNode];
        },
      },
    });
    dialogRef.afterClosed().subscribe(() => {});
  }

  openAddFunctionDialog(): void {
    const dialogRef = this.dialog.open(AddFunctionDialog, {});
    dialogRef.afterClosed().subscribe(() => {
      if (this.selectedNode) {
        this.refreshFunctions(this.selectedNode);
      }
    });
  }

  openViewExecutionsDialog(): void {
    const dialogRef = this.dialog.open(ViewExecutionsDialogComponent, {
      data: {
        flowId: this.flowId,
      },
    });
    dialogRef.afterClosed().subscribe(() => {});
  }

  loadInitialFunctions(): void {
    this.nodeClassService.fetchFunctions().subscribe(
      (data) => {
        const rootNode: FunctionNode = {
          id: "root",
          name: "Functions",
          parent: null,
          children: this.buildTree(data.tree, "root"),
          functions: data.items,
          isLoaded: true,
        };
        this.functionTreeDataSource.data = [rootNode];
        this.selectedFunctions = data.items;
        this.filteredFunctions = this.selectedFunctions;
        this.dataSource.data = this.selectedFunctions;
        this.treeControl.expand(rootNode);
        this.selectedNode = rootNode;
      },
      (error) => {
        console.error("Error loading initial functions:", error);
      }
    );
  }

  buildTree(nodes: any[], parentId: string | null): FunctionNode[] {
    return nodes.map((node) => ({
      name: node.name,
      id: node.id,
      parent: parentId,
      children: [],
      functions: [],
      isLoaded: false,
    }));
  }

  toggleNode(node: FunctionNode): void {
    if (this.treeControl.isExpanded(node)) {
      this.treeControl.collapse(node);
    } else {
      this.treeControl.expand(node);
    }
    if (!node.isLoaded && this.treeControl.isExpanded(node)) {
      this.fetchChildFunctions(node);
    }
    this.updateSelectedNode(node);
  }

  fetchChildFunctions(parentNode: FunctionNode): void {
    if (parentNode.isLoaded) {
      this.updateSelectedNode(parentNode);
      return;
    }
    this.nodeClassService.fetchFunctionsByParent(parentNode.id).subscribe(
      (data) => {
        parentNode.children = this.buildTree(data.tree, parentNode.id);
        parentNode.functions = data.items;
        parentNode.isLoaded = true;
        this.updateSelectedNode(parentNode);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error fetching child functions:", error);
      }
    );
  }

  updateSelectedNode(node: FunctionNode): void {
    this.selectedNode = node;
    this.selectedFunctions = node.functions || [];
    this.filteredFunctions = this.selectedFunctions;
    this.dataSource.data = this.selectedFunctions;
    this.cdr.detectChanges();
  }

  refreshTreeData(): void {
    const data = this.functionTreeDataSource.data;
    this.functionTreeDataSource.data = null;
    this.functionTreeDataSource.data = data;
    this.cdr.detectChanges();
  }

  refreshFunctions(node: FunctionNode): void {
    if (!node) return;
    const isRoot = node.id === "root";
    const fetchObs = isRoot
      ? this.nodeClassService.fetchFunctions()
      : this.nodeClassService.fetchFunctionsByParent(node.id);
    fetchObs.subscribe(
      (data) => {
        node.children = this.buildTree(data.tree, node.id);
        node.functions = data.items;
        node.isLoaded = true;
        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error refreshing functions:", error);
      }
    );
  }

  filterNodes(): void {
    if (!this.searchQuery) {
      this.loadInitialFunctions();
      return;
    }
    const query =
      this.searchFilter === "prefix"
        ? `prefix:${this.searchQuery}`
        : this.searchQuery;
    this.searchService.searchItems(query, "functions").subscribe(
      (results: any[]) => {
        const items = results.map((item) => ({
          ...item,
          id: item.id,
          name: item.name,
          description: item.description,
        }));
        const rootNode: FunctionNode = {
          id: "search-root",
          name: "Search Results",
          children: [],
          functions: items,
          parent: null,
          isLoaded: true,
        };
        this.functionTreeDataSource.data = [rootNode];
        this.selectedFunctions = items;
        this.filteredFunctions = this.selectedFunctions;
        this.dataSource.data = this.selectedFunctions;
        this.treeControl.expand(rootNode);
        this.selectedNode = rootNode;
      },
      (error) => {
        console.error("Error searching flows:", error);
      }
    );
  }

  clearSearch(): void {
    this.searchQuery = "";
    this.functionTreeDataSource.data = [];
    this.loadInitialFunctions();
  }

  filterLocalFunctionNodes(): void {
    if (!this.functionListSearchQuery) {
      this.filteredFunctions = this.selectedFunctions;
    } else {
      const q = this.functionListSearchQuery.toLowerCase();
      this.filteredFunctions = this.selectedFunctions.filter((f: any) =>
        f.name.toLowerCase().includes(q)
      );
    }
  }

  clearFunctionListSearch(): void {
    this.functionListSearchQuery = "";
    this.filteredFunctions = this.selectedFunctions;
  }

  highlightText(text: string, query: string): string {
    if (!query) {
      return text;
    }
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  findNodeById(node: FunctionNode, id: string): FunctionNode | null {
    if (!node || !id) return null;
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeById(child, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }
}
