import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { AddNewNodeDialog } from "./add-node-dialog.component";
import { AddFunctionDialog } from '@home/pages/admin/functions/function-dialog.component';
import { Node, Edge, addEdge } from "reactflow";
import { Subscription } from "rxjs";
import {
  convertNodesAndConnections,
  saveToBackend,
  executeFlow,
} from "./nodeUtils";
import { FlowService } from "@app/core/services/flow.service";

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
  isLoading: boolean = false;
  executionTime: number | undefined;
  executionStatus: string | undefined;
  flowPosition: { x: number; y: number } | undefined;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowService: FlowService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const flowDetails = data["flowDetails"];
      this.node_fields = data["nodeFields"];

      if (flowDetails) {
        this.flowId = flowDetails.id;
        const { nodes, edges } = convertNodesAndConnections(
          flowDetails.nodes,
          this.flowId,
          this.node_fields
        );
        this.nodes = nodes;
        this.edges = edges;
        this.name = flowDetails.name;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  openAddNewNodeDialog(): void {
    const dialogRef = this.dialog.open(AddNewNodeDialog, {
      data: {
        flowId: this.flowId,
        nodes: this.nodes,
        setNodes: (newNodes: any[]) => (this.nodes = newNodes),
        flowPosition: this.flowPosition,
        addNode: (newNode: Node) => {
          this.nodes = [...this.nodes, newNode];
        },
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log("The dialog was closed");
    });
  }

  openAddFunctionDialog(): void {
    const dialogRef = this.dialog.open(AddFunctionDialog);

    dialogRef.afterClosed().subscribe((result) => {
      console.log("The dialog was closed");
    });
  }

  async saveToBackend(): Promise<void> {
    this.isLoading = true;
    try {
      await saveToBackend(
        this.flowId,
        this.nodes,
        this.edges,
        this.flowService
      );
      alert("Saved to backend");
    } catch (error) {
      console.error("Error saving to backend:", error);
    } finally {
      this.isLoading = false;
    }
  }

  async executeFlow(): Promise<void> {
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

  navigateToFlows(): void {
    this.router.navigate(["/resources/flows"]);
  }

  onNodesChange(updatedNodes: Node[]) {
    this.nodes = updatedNodes;
  }

  onEdgesChange(updatedEdges: Edge[]) {
    this.edges = updatedEdges;
  }

  onConnect(connection: any) {
    this.edges = addEdge(connection, this.edges);
  }

  onPositionChange(event: any) {
    this.flowPosition = event;
  }
}
