import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { AddNewNodeDialog } from "./add-node-dialog.component";
import { Node, Edge, addEdge } from "reactflow";
import { Subscription } from "rxjs";
import { convertData, executeFlow } from "./nodeUtils";
import { EditNodeDialogComponent } from "./edit-node-dialog.component";
import { FlowService } from "@app/core/services/flow.service";
import { AddFunctionDialog } from "../functions/function-dialog.component";

@Component({
  selector: 'flow-map',
  templateUrl: './flow-map.component.html',
  styleUrls: ['./flow-map.component.scss'],
})
export class FlowMapComponent implements OnInit, OnDestroy {
  nodes: Node[] = [];
  edges: Edge[] = [];
  flowId!: string;
  node_fields: any[] = [];
  name!: string;
  full_name!: string;
  isLoading: boolean = false;
  executionTime: number | undefined;
  executionStatus: string | undefined;
  flowPosition: { x: number; y: number } | undefined;
  openEditingDialogBox: any = null;
  saveFlow: any = null;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowService: FlowService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      console.log(data)
      const flowDetails = data['flowDetails'];
      this.node_fields = data['nodeFields'];

      if (flowDetails) {
        this.flowId = flowDetails.id;
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
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  openAddNewNodeDialog(): void {
    console.log({
      flowId: this.flowId,
      nodes: this.nodes,
      node_fields: this.node_fields,
      setNodes: (newNodes: any[]) => (this.nodes = newNodes),
      flowPosition: this.flowPosition,
      addNode: (newNode: Node) => {
        this.nodes = [...this.nodes, newNode];
      },
    },)
    const dialogRef = this.dialog.open(AddNewNodeDialog, {
      data: {
        flowId: this.flowId,
        nodes: this.nodes,
        node_fields: this.node_fields,
        setNodes: (newNodes: any[]) => (this.nodes = newNodes),
        flowPosition: this.flowPosition,
        addNode: (newNode: Node) => {
          this.nodes = [...this.nodes, newNode];
        },
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log('The dialog was closed');
    });
  }

  openAddFunctionDialog(): void {
    const dialogRef = this.dialog.open(AddFunctionDialog);

    dialogRef.afterClosed().subscribe((result) => {
      console.log('The dialog was closed');
    });
  }

  async saveToBackend(): Promise<void> {
    this.isLoading = true;
    try {
      this.saveFlow = this.flowId;
      alert('Saved to backend');
    } catch (error) {
      console.error('Error saving to backend:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async execute_flow(): Promise<void> {
    this.isLoading = true;
    const startTime = new Date();
    try {
      console.log(this.flowId)
      await executeFlow(this.flowId, this.flowService);
      const endTime = new Date();
      this.executionTime = (endTime.getTime() - startTime.getTime()) / 1000;
      this.executionStatus = 'Flow executed successfully';
      alert('Flow executed successfully');
    } catch (error) {
      console.error('Error executing flow:', error);
      this.executionStatus = 'Error executing flow';
      alert('Error executing flow');
    } finally {
      this.isLoading = false;
    }
  }

  navigateToFlows(): void {
    this.router.navigate(['/resources/flows']);
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
    console.log(nodeData)
    this.openEditingDialogBox = nodeData;
    if (nodeData) {
      const dialogRef = this.dialog.open(EditNodeDialogComponent, {
        data: nodeData,
      });
      console.log(nodeData)
      dialogRef.afterClosed().subscribe((result) => {
        if (result !== null) {
          const updatedNodes = this.nodes.map((node) =>
            node.id === nodeData.id
              ? { ...node, data: { ...node.data, value: result } }
              : node
          );
          this.nodes = updatedNodes;
        }
        this.openEditingDialogBox = null;
      });
    }
  }
}
