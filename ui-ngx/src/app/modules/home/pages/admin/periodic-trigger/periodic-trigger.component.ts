import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { MatSort, Sort } from "@angular/material/sort";
import { PageEvent } from "@angular/material/paginator";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { NestedTreeControl } from "@angular/cdk/tree";
import { Clipboard } from "@angular/cdk/clipboard";
import { PeriodicTriggerDialogComponent } from "./dialog.component";
import {
  PeriodicTrigger,
  TriggerService,
} from "@app/core/services/trigger.service";
import { TagService } from "@app/core/services/tag.service";

interface TagNode {
  name: string;
  id: string;
  children?: TagNode[];
  triggers?: PeriodicTrigger[];
}

@Component({
  selector: "app-periodic-trigger",
  templateUrl: "./periodic-trigger.component.html",
  styleUrls: ["./periodic-trigger.component.scss"],
})
export class PeriodicTriggerComponent implements OnInit {
  dataSource = new MatTableDataSource<PeriodicTrigger>();
  displayedColumns: string[] = ["id", "target", "task", "tags", "actions"];
  totalTriggers = 0;
  pageIndex = 0;
  pageSize = 10;
  treeControl = new NestedTreeControl<TagNode>((node) => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<TagNode>();
  filteredTreeDataSource = new MatTreeNestedDataSource<TagNode>();
  selectedTriggers: PeriodicTrigger[] = [];
  originalTreeData: TagNode[] = [];
  searchQuery: string = "";
  selectedNode: TagNode;

  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private triggerService: TriggerService,
    private dialog: MatDialog,
    private clipboard: Clipboard,
    private tagService: TagService
  ) {}

  ngOnInit(): void {
    this.loadTagsAndTriggers();
  }

  loadTagsAndTriggers(): void {
    this.tagService.getAllChildrenByName("Periodic Triggers").subscribe(
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

  buildTree(tags: any[]): TagNode[] {
    const buildNode = (tag: any): TagNode => {
      return {
        id: tag.id,
        name: tag.name,
        children: tag.children ? tag.children.map(buildNode) : [],
      };
    };

    return tags.map(buildNode);
  }

  hasChild = (_: number, node: TagNode) =>
    !!node.children && node.children.length > 0;

  copyId(id: string) {
    this.clipboard.copy(id);
    alert("Copied ID: " + id);
  }

  copyPeriodicTriggerEndpoint(id: string) {
    const endpoint = `${window.location.origin}/backend/triggers/periodic/${id}/execute/`;
    this.clipboard.copy(endpoint);
    alert("Copied Endpoint: " + endpoint);
  }

  onNodeSelect(node: TagNode): void {
    this.selectedNode = node;
    this.tagService.getItemsByTagId(node.id).subscribe(
      (triggers) => {
        this.selectedTriggers = triggers;
        this.dataSource.data = triggers;
      },
      (error) => {
        console.error("Error fetching triggers by tag: ", error);
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
    this.dataSource.data = this.dataSource.data.slice(startIndex, endIndex);
  }

  openAddPeriodicTriggerDialog(): void {
    const dialogRef = this.dialog.open(PeriodicTriggerDialogComponent, {
      width: "800px",
      data: {},
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadTagsAndTriggers();
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
        case "target":
          return compare(a.target, b.target, isAsc);
        case "task":
          return compare(a.task.name, b.task.name, isAsc);
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
      const filteredNodes = this.filterTree(
        this.originalTreeData,
        query.toLowerCase()
      );
      this.filteredTreeDataSource.data = filteredNodes;
      this.treeControl.expandDescendants(filteredNodes[0]);
    }
  }

  filterTree(nodes: TagNode[], query: string): TagNode[] {
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

  private showNotification(notification: any): void {
    console.log(notification.message); // Replace with your notification service logic
  }
}

function compare(a: string, b: string, isAsc: boolean): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
