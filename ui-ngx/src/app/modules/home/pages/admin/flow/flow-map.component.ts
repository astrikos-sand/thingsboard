import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FlowService } from '@app/core/services/flow.service';
import { MatDialog } from '@angular/material/dialog';
// import { NewDynamicNodeClassModalComponent } from './components/new-dynamic-node-class-modal/new-dynamic-node-class-modal.component';
// import { NewNodeModalComponent } from './components/new-node-modal/new-node-modal.component';

@Component({
  selector: 'flow-map',
  templateUrl: './flow-map.component.html',
  styleUrls: ['./flow-map.component.scss']
})
export class FlowMapComponent implements OnInit {
  nodes: any[] = [];
  edges: any[] = [];
  flowId: string;
  name: string ;
  isLoading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowService: FlowService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      const flowDetails = data['flowDetails'];
      if (flowDetails) {
        this.flowId = flowDetails.id;
        this.convertNodesAndConnections(flowDetails.nodes);
        this.name = flowDetails.name;
      }
    });
  }

  loadFlowDetails(): void {
    this.flowService.fetchFlowDetails(this.flowId).subscribe(
      data => {
        this.convertNodesAndConnections(data.nodes);
        this.name = data.name;
      },
      error => {
        console.error('Error fetching flow details:', error);
      }
    );
  }

  convertNodesAndConnections(nodesData: any[]): void {
    const convertedNodes = [];
    const convertedConnectionsMap = new Map();

    nodesData.forEach(nodeData => {
      const { id, position, source_connections, target_connections, ...rest } = nodeData;
      convertedNodes.push({
        id: id.toString(),
        position: position,
        type: "custom",
        data: {
          id: id,
          label: 'Node',
          ...rest
        }
      });

      source_connections.forEach(connection => {
        const { id, source, target, source_slot, target_slot } = connection;
        const edgeKey = `${source}-${target}-${source_slot}-${target_slot}`;
        if (!convertedConnectionsMap.has(edgeKey)) {
          convertedConnectionsMap.set(edgeKey, {
            id: id.toString(),
            source: source.toString(),
            sourceHandle: `node-${source}-output-${source_slot}`,
            target: target.toString(),
            targetHandle: `node-${target}-input-${target_slot}`
          });
        }
      });

      target_connections.forEach(connection => {
        const { id, source, target, source_slot, target_slot } = connection;
        const edgeKey = `${source}-${target}-${source_slot}-${target_slot}`;
        if (!convertedConnectionsMap.has(edgeKey)) {
          convertedConnectionsMap.set(edgeKey, {
            id: id.toString(),
            source: source.toString(),
            sourceHandle: `node-${source}-output-${source_slot}`,
            target: target.toString(),
            targetHandle: `node-${target}-input-${target_slot}`
          });
        }
      });
    });

    this.nodes = convertedNodes;
    this.edges = Array.from(convertedConnectionsMap.values());
  }

  // openNewDynamicNodeClassModal(): void {
  //   this.dialog.open(NewDynamicNodeClassModalComponent, {
  //     data: { nodes: this.nodes }
  //   });
  // }

  // openNewNodeModal(): void {
  //   this.dialog.open(NewNodeModalComponent, {
  //     data: { file: this.flowId, nodes: this.nodes }
  //   });
  // }

  saveToBackend(): void {
    this.isLoading = true;
    const convertedNodes = this.nodes.map(node => ({
      id: node.data.id,
      inputs: node.data.inputs,
      outputs: node.data.outputs,
      position: node.position
    }));

    const convertedConnections = this.edges.map(connection => ({
      id: connection.id,
      source: connection.source,
      target: connection.target,
      source_slot: connection.sourceHandle.replace(`node-${connection.source}`, '').replace('-output-', ''),
      target_slot: connection.targetHandle.replace(`node-${connection.target}`, '').replace('-input-', '')
    }));

    this.flowService.saveFlowDetails(this.flowId, { nodes: convertedNodes, connections: convertedConnections }).subscribe(
      response => {
        alert('Saved to backend');
      },
      error => {
        console.error('Error saving to backend:', error);
      },
      () => {
        this.isLoading = false;
      }
    );
  }

  executeFlow(): void {
    this.isLoading = true;
    this.flowService.executeFlow(this.flowId).subscribe(
      response => {
        alert('Flow executed successfully');
      },
      error => {
        console.error('Error executing flow:', error);
      },
      () => {
        this.isLoading = false;
      }
    );
  }

  navigateToFlows(): void {
    this.router.navigate(['/resources/flows']);
  }
}
