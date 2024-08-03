import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { MatSort, Sort } from "@angular/material/sort";
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { Clipboard } from '@angular/cdk/clipboard';
import { FlowService } from "@app/core/services/flow.service";
import { AddFlowDialogComponent } from "./add-flow-dialog.component";
import { TagService } from "@app/core/services/tag.service";
import { PageEvent } from "@angular/material/paginator";

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
  dataSource = new MatTableDataSource<any>();
  displayedColumns: string[] = ["id", "name", "description", "environment", "actions"];
  totalFlows = 0;
  pageIndex = 0;
  pageSize = 10;

  @ViewChild(MatSort) sort: MatSort;

  treeControl = new NestedTreeControl<FlowNode>(node => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<FlowNode>();
  filteredTreeDataSource = new MatTreeNestedDataSource<FlowNode>();
  selectedFlows: any[] = [];
  originalTreeData: FlowNode[] = [];
  searchQuery: string = '';
  selectedNode: FlowNode;

  constructor(
    private flowService: FlowService,
    private dialog: MatDialog,
    private clipboard: Clipboard,
    private tagService: TagService
  ) {}

  ngOnInit(): void {
    this.loadTagsAndFlows();
  }

  loadTagsAndFlows(): void {
    this.tagService.getAllChildrenByName('Flows').subscribe(
      (rootTag) => {
        const rootNodes = this.buildTree([rootTag]);
        this.tagTreeDataSource.data = rootNodes;
        this.filteredTreeDataSource.data = rootNodes;
        this.originalTreeData = rootNodes;
        this.treeControl.expandDescendants(rootNodes[0]);
      },
      (error) => {
        console.error("Error fetching tags: ", error);
      }
    );
  }

  buildTree(tags: any[]): FlowNode[] {
    const buildNode = (tag: any): FlowNode => {
      return {
        id: tag.id,
        name: tag.name,
        children: tag.children ? tag.children.map(buildNode) : []
      };
    };

    return tags.map(buildNode);
  }

  hasChild = (_: number, node: FlowNode) => !!node.children && node.children.length > 0;

  copyId(id: string) {
    this.clipboard.copy(id);
    alert('Copied ID: ' + id);
  }

  openFlow(flowId: string): void {
    window.open(`/flows/library/${flowId}`, '_blank');
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
    this.dataSource.data = this.dataSource.data.slice(startIndex, endIndex);
  }

  openAddFlowDialog(): void {
    const dialogRef = this.dialog.open(AddFlowDialogComponent, {
      width: "400px",
      data: { parentTag: this.selectedNode.id, parentTagName: this.selectedNode.name },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadTagsAndFlows();
    });
  }

  sortData(sort: Sort): void {
    const data = this.dataSource.data.slice();
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
    this.selectedNode = node;
    this.tagService.getItemsByTagId(node.id).subscribe(
      (flows) => {
        this.selectedFlows = flows;
        this.dataSource.data = flows;
      },
      (error) => {
        console.error("Error fetching flows by tag: ", error);
      }
    );
  }
}

function compare(a: number | string, b: number | string, isAsc: boolean): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
