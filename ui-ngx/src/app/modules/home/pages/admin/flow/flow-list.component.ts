import { Component, OnInit, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { FlowService } from "@app/core/services/flow.service";
import { MatDialog } from "@angular/material/dialog";
import { AddFlowDialogComponent } from "./add-flow-dialog.component";
import { MatTableDataSource } from "@angular/material/table";
import { PageEvent } from "@angular/material/paginator";
import { MatSort, Sort } from "@angular/material/sort";
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { Clipboard } from '@angular/cdk/clipboard';

interface FlowNode {
  name: string;
  id: string;
  children?: FlowNode[];
  flows?: any[];
}

@Component({
  selector: "app-flow-list",
  templateUrl: "./flow-list.component.html",
  styleUrls: ["./flow-list.component.scss"],
})
export class FlowListComponent implements OnInit {
  flows: any[] = [];
  displayedColumns: string[] = [
    "id",
    "name",
    "description",
    "environment",
    "actions",
  ];
  dataSource = new MatTableDataSource<any>(this.flows);
  selectedFlows: any[] = [];
  totalFlows = 0;
  pageIndex = 0;
  pageSize = 10;
  treeControl = new NestedTreeControl<FlowNode>(node => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<FlowNode>();
  filteredTreeDataSource = new MatTreeNestedDataSource<FlowNode>();
  originalTreeData: FlowNode[] = [];
  searchQuery: string = '';

  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private flowService: FlowService,
    private router: Router,
    public dialog: MatDialog,
    private clipboard: Clipboard
  ) {}

  ngOnInit(): void {
    this.fetchFlows();
  }

  fetchFlows(): void {
    this.flowService.fetchFlows().subscribe(
      async (data) => {
        this.flows = data;
        await this.loadEnvironmentDetails();
        const rootNodes = this.buildTree(this.flows);
        this.tagTreeDataSource.data = rootNodes;
        this.filteredTreeDataSource.data = rootNodes;
        this.originalTreeData = rootNodes;
        this.treeControl.expandDescendants(rootNodes[0]);
        this.dataSource.data = this.flows;
        this.totalFlows = data.length;
        this.dataSource.sort = this.sort;
        this.updatePagedData();
      },
      (error) => {
        console.error("Error fetching flows:", error);
      }
    );
  }

  async loadEnvironmentDetails(): Promise<void> {
    for (const flow of this.flows) {
      try {
        const env = await this.flowService.getEnv(flow.environment).toPromise();
        flow.environment = env;
      } catch (error) {
        console.error("Error fetching environment details:", error);
      }
    }
  }

  buildTree(flows: any[]): FlowNode[] {
    const root: FlowNode = { name: 'Flows', id: 'root', children: [] };
    const nodeMap: { [key: string]: FlowNode } = { 'Flows': root };

    flows.forEach(flow => {
      if (flow.tags.length === 0) {
        flow.tags = [{ id: 'untagged', full_name: 'Flows/Untagged' }];
      }
      flow.tags.forEach(tag => {
        const path = tag.full_name.split('/');
        let currentNode = root;
        path.forEach((part, index) => {
          if (!nodeMap[part]) {
            const newNode: FlowNode = { name: part, id: tag.id, children: [] };
            nodeMap[part] = newNode;
            if (index === path.length - 1) {
              newNode.flows = [];
            }
            currentNode.children.push(newNode);
          }
          currentNode = nodeMap[part];
        });
        currentNode.flows?.push(flow);
      });
    });

    return [root];
  }

  hasChild = (_: number, node: FlowNode) => !!node.children && node.children.length > 0;

  copyId(id: string) {
    this.clipboard.copy(id);
    alert('Copied ID: ' + id);
  }

  openFlow(flowId: string): void {
    this.router.navigate([`flows/library/${flowId}`]);
  }

  openEnvironmentFile(event: Event, filePath: string): void {
    event.stopPropagation();
    window.open(filePath, "_blank");
  }

  handlePageEvent(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagedData();
  }

  updatePagedData(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.dataSource.data = this.flows.slice(startIndex, endIndex);
  }

  openAddFlowDialog(): void {
    const dialogRef = this.dialog.open(AddFlowDialogComponent);

    dialogRef.afterClosed().subscribe((result) => {
      this.fetchFlows();
    });
  }

  export_flow(event: Event, flowId: string): void {
    event.stopPropagation();
    window.open(`/backend/tasks/${flowId}/export_flow/`, "_blank");
  }

  sortData(sort: Sort): void {
    const data = this.flows.slice();
    if (!sort.active || sort.direction === "") {
      this.dataSource.data = data;
      return;
    }

    this.dataSource.data = data.sort((a, b) => {
      const isAsc = sort.direction === "asc";
      switch (sort.active) {
        case "id":
          return compare(a.id, b.id, isAsc);
        case "name":
          return compare(a.name, b.name, isAsc);
        case "description":
          return compare(a.description, b.description, isAsc);
        case "environment":
          return compare(a.environment.name, b.environment.name, isAsc);
        default:
          return 0;
      }
    });
    this.updatePagedData();
  }

  filterNodes(query: string): void {
    this.searchQuery = query;
    if (!query) {
      this.filteredTreeDataSource.data = this.originalTreeData;
      this.treeControl.expandDescendants(this.originalTreeData[0]);
    } else {
      const filteredNodes = this.filterTree(this.originalTreeData, query.toLowerCase());
      this.filteredTreeDataSource.data = filteredNodes;
      this.treeControl.expandDescendants(filteredNodes[0]);
    }
  }

  filterTree(nodes: FlowNode[], query: string): FlowNode[] {
    return nodes
      .map(node => ({ ...node }))
      .filter(node => {
        if (node.name.toLowerCase().includes(query)) {
          return true;
        }
        if (node.children) {
          node.children = this.filterTree(node.children, query);
          return node.children.length > 0;
        }
        return false;
      });
  }

  highlightText(text: string, query: string): string {
    if (!query) {
      return text;
    }
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  onNodeSelect(node: FlowNode): void {
    this.selectedFlows = this.collectFlows(node);
    this.dataSource.data = this.selectedFlows;
  }

  collectFlows(node: FlowNode): any[] {
    let flows: any[] = [];
    if (node.flows) {
      flows = flows.concat(node.flows);
    }
    if (node.children) {
      for (const child of node.children) {
        flows = flows.concat(this.collectFlows(child));
      }
    }
    return flows;
  }
}

function compare(a: number | string, b: number | string, isAsc: boolean): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
