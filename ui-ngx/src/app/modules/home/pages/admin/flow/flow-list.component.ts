import { Component, OnInit, ViewChild, ChangeDetectorRef } from "@angular/core";
import { Router } from "@angular/router";
import { FlowService } from "@app/core/services/flow.service";
import { MatDialog } from "@angular/material/dialog";
import { AddFlowDialogComponent } from "./add-flow-dialog.component";
import { MatTableDataSource } from "@angular/material/table";
import { PageEvent } from "@angular/material/paginator";
import { MatSort, Sort } from "@angular/material/sort";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { NestedTreeControl } from "@angular/cdk/tree";
import { Clipboard } from "@angular/cdk/clipboard";

interface FlowNode {
  name: string;
  id: string;
  children: FlowNode[];
  flows?: any[];
}

@Component({
  selector: "app-flow-list",
  templateUrl: "./flow-list.component.html",
  styleUrls: ["./flow-list.component.scss"],
})
export class FlowListComponent implements OnInit {
  selectedFlows: any[] = [];
  displayedColumns: string[] = [
    "id",
    "name",
    "description",
    "environment",
    "actions",
  ];
  dataSource = new MatTableDataSource<any>(this.selectedFlows);
  totalFlows = 0;
  pageIndex = 0;
  pageSize = 10;
  treeControl = new NestedTreeControl<FlowNode>((node) => node.children);
  flowTreeDataSource = new MatTreeNestedDataSource<FlowNode>();
  searchQuery: string = "";
  selectedNode: FlowNode | null = null;

  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private flowService: FlowService,
    private router: Router,
    public dialog: MatDialog,
    private clipboard: Clipboard,
    private cdr: ChangeDetectorRef // Inject ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialFlows();
  }

  loadInitialFlows(): void {
    this.flowService.fetchFlows().subscribe(
      (data) => {
        const rootNode: FlowNode = {
          id: "root",
          name: "Flows",
          children: this.buildTree(data.tree),
          flows: data.items,
        };
        this.flowTreeDataSource.data = [rootNode];
        this.selectedFlows = data.items;
        this.dataSource.data = this.selectedFlows;
        this.totalFlows = data.items.length;
        this.dataSource.sort = this.sort;
        this.updatePagedData();
        this.treeControl.expand(rootNode);
        this.selectedNode = rootNode;
      },
      (error) => {
        console.error("Error loading initial flows:", error);
      }
    );
  }

  fetchChildFlows(parentNode: FlowNode): void {
    this.flowService.fetchFlowsByParent(parentNode.id).subscribe(
      (data) => {
        console.log('Fetched data:', data);
        const childNodes = this.buildTree(data.tree);
        parentNode.children = childNodes;
        parentNode.flows = data.items;

        console.log('Updated parentNode:', parentNode);

        this.refreshTreeData();

        this.treeControl.expand(parentNode);
        this.selectedFlows = data.items;
        this.dataSource.data = this.selectedFlows;
        this.totalFlows = data.items.length;
        this.dataSource.sort = this.sort;
        this.updatePagedData();
      },
      (error) => {
        console.error("Error fetching child flows:", error);
      }
    );
  }

  refreshTreeData(): void {
    this.flowTreeDataSource.data = [...this.flowTreeDataSource.data];
    this.cdr.detectChanges();
  }

  buildTree(nodes: any[]): FlowNode[] {
    return nodes.map((node) => ({
      name: node.name,
      id: node.id,
      children: [],
      flows: [],
    }));
  }

  onNodeSelect(node: FlowNode): void {
    this.selectedNode = node;
    this.fetchChildFlows(node);
  }

  copyId(id: string) {
    this.clipboard.copy(id);
    alert("Copied ID: " + id);
  }

  openFlow(flowId: string): void {
    this.router.navigate([`flows/library/${flowId}`]);
  }

  duplicate_flow(flowId: string): void {
    this.flowService.duplicateFlow(flowId).subscribe(
      () => {
        this.loadInitialFlows();
      },
      (error) => {
        console.error("Error duplicating flow:", error);
      }
    );
  }

  handlePageEvent(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagedData();
  }

  updatePagedData(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.dataSource.data = this.selectedFlows.slice(startIndex, endIndex);
  }

  openAddFlowDialog(): void {
    const dialogRef = this.dialog.open(AddFlowDialogComponent, {
      data: {
        selectedPrefix: this.selectedNode ? this.selectedNode.id : "root",
      },
    });
    dialogRef.afterClosed().subscribe(() => {
      this.loadInitialFlows();
    });
  }

  export_flow(event: Event, flowId: string): void {
    event.stopPropagation();
    window.open(`/backend/tasks/${flowId}/export_flow/`, "_blank");
  }

  sortData(sort: Sort): void {
    const data = this.selectedFlows.slice();
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
      this.flowTreeDataSource.data = this.flowTreeDataSource.data;
      this.treeControl.expandDescendants(this.flowTreeDataSource.data[0]);
    } else {
      const filteredNodes = this.filterTree(
        this.flowTreeDataSource.data,
        query.toLowerCase()
      );
      this.flowTreeDataSource.data = filteredNodes;
      if (filteredNodes.length > 0) {
        this.treeControl.expandDescendants(filteredNodes[0]);
      }
    }
  }

  filterTree(nodes: FlowNode[], query: string): FlowNode[] {
    return nodes
      .map((node) => ({ ...node }))
      .filter((node) => {
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
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, '<span class="highlight">$1</span>');
  }
}

function compare(
  a: number | string,
  b: number | string,
  isAsc: boolean
): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
