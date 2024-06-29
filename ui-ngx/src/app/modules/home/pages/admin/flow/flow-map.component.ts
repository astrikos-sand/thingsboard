import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AddNewNodeDialog } from './add-node-dialog.component';
import { AddBaseNodeClassDialog } from './add-base-node-class-dialog.component';
import { StateService } from './state.service';
import { Node, Edge, applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import { Subscription } from 'rxjs';
import { FlowService } from '@app/core/services/flow.service';

@Component({
  selector: 'flow-map',
  templateUrl: './flow-map.component.html',
  styleUrls: ['./flow-map.component.scss'],
})
export class FlowMapComponent implements OnInit, OnDestroy {
  nodes: Node[] = [];
  edges: Edge[] = [];
  flowId!: string;
  name!: string;
  isLoading: boolean = false;
  executionTime: number | undefined;
  executionStatus: string | undefined;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowService: FlowService,
    private dialog: MatDialog,
    private stateService: StateService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.stateService.nodes$.subscribe((nodes) => {
        this.nodes = nodes;
      })
    );
    this.subscriptions.add(
      this.stateService.edges$.subscribe((edges) => {
        this.edges = edges;
      })
    );

    this.route.data.subscribe(data => {
      const flowDetails = data['flowDetails'];
      if (flowDetails) {
        this.flowId = flowDetails.id;
        this.convertNodesAndConnections(flowDetails.nodes);
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
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.loadFlowDetails();
    });
  }

  openAddBaseNodeClassDialog(): void {
    const dialogRef = this.dialog.open(AddBaseNodeClassDialog);

    dialogRef.afterClosed().subscribe((result) => {
      console.log('The dialog was closed');
    });
  }

  loadFlowDetails(): void {
    this.flowService.fetchFlowDetails(this.flowId).subscribe(
      (data) => {
        this.convertNodesAndConnections(data.nodes);
        this.name = data.name;
      },
      (error) => {
        console.error('Error fetching flow details:', error);
      }
    );
  }

  convertNodesAndConnections(nodesData: any[]): void {
    const convertedNodes: Node[] = [];
    const convertedConnectionsMap = new Map();

    nodesData.forEach((nodeData) => {
      const { id, position, source_connections, target_connections, ...rest } =
        nodeData;
      convertedNodes.push({
        id: id.toString(),
        position: position,
        type: 'custom',
        data: {
          id: id,
          label: 'Node',
          ...rest,
        },
      });

      source_connections.forEach(
        (connection: {
          id: any;
          source: any;
          target: any;
          source_slot: any;
          target_slot: any;
        }) => {
          const { id, source, target, source_slot, target_slot } = connection;
          const edgeKey = `${source}-${target}-${source_slot}-${target_slot}`;
          if (!convertedConnectionsMap.has(edgeKey)) {
            convertedConnectionsMap.set(edgeKey, {
              id: id.toString(),
              source: source.toString(),
              sourceHandle: `node-${source}-output-${source_slot}`,
              target: target.toString(),
              targetHandle: `node-${target}-input-${target_slot}`,
            });
          }
        }
      );

      target_connections.forEach(
        (connection: {
          id: any;
          source: any;
          target: any;
          source_slot: any;
          target_slot: any;
        }) => {
          const { id, source, target, source_slot, target_slot } = connection;
          const edgeKey = `${source}-${target}-${source_slot}-${target_slot}`;
          if (!convertedConnectionsMap.has(edgeKey)) {
            convertedConnectionsMap.set(edgeKey, {
              id: id.toString(),
              source: source.toString(),
              sourceHandle: `node-${source}-output-${source_slot}`,
              target: target.toString(),
              targetHandle: `node-${target}-input-${target_slot}`,
            });
          }
        }
      );
    });

    this.stateService.setNodes(convertedNodes);
    this.stateService.setEdges(Array.from(convertedConnectionsMap.values()));
  }

  saveToBackend(): void {
    this.isLoading = true;
    const convertedNodes = this.nodes.map((node) => ({
      id: node.data.id,
      inputs: node.data.inputs,
      outputs: node.data.outputs,
      position: node.position,
    }));

    const convertedConnections = this.edges.map((connection) => ({
      id: connection.id,
      source: connection.source,
      target: connection.target,
      source_slot: connection.sourceHandle
        ?.replace(`node-${connection.source}`, '')
        .replace('-output-', ''),
      target_slot: connection.targetHandle
        ?.replace(`node-${connection.target}`, '')
        .replace('-input-', ''),
    }));

    this.flowService
      .saveFlowDetails(this.flowId, {
        nodes: convertedNodes,
        connections: convertedConnections,
      })
      .subscribe(
        (response) => {
          alert('Saved to backend');
        },
        (error) => {
          console.error('Error saving to backend:', error);
        },
        () => {
          this.isLoading = false;
        }
      );
  }

  executeFlow(): void {
    this.isLoading = true;
    const startTime = new Date();

    this.flowService.executeFlow(this.flowId).subscribe(
      (response) => {
        const endTime = new Date();
        this.executionTime = (endTime.getTime() - startTime.getTime()) / 1000;
        this.executionStatus = 'Flow executed successfully';
        alert('Flow executed successfully');
      },
      (error) => {
        console.error('Error executing flow:', error);
        this.isLoading = false;
        this.executionStatus = 'Error executing flow';
        alert('Error executing flow, see the logs in archives');
      },
      () => {
        this.isLoading = false;
        console.log('Execution completed or interrupted, see the logs in archives');
      }
    );
  }

  navigateToFlows(): void {
    this.router.navigate(['/flows']);
  }

  onNodesChange(changes: any) {
    this.stateService.updateNodes((nds) => applyNodeChanges(changes, nds));
  }

  onEdgesChange(changes: any) {
    this.stateService.updateEdges((eds) => applyEdgeChanges(changes, eds));
  }

  onConnect(connection: any) {
    this.stateService.updateEdges((eds) => addEdge(connection, eds));
  }
}
