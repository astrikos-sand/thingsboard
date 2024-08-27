import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { PageEvent } from "@angular/material/paginator";
import { MatSort, Sort } from "@angular/material/sort";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { NestedTreeControl } from "@angular/cdk/tree";
import { Clipboard } from "@angular/cdk/clipboard";
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { NotificationMessage } from "@app/core/notification/notification.models";
import { NodeClassService } from "@app/core/services/node-classes.service";
import { AddFunctionDialog } from "@home/pages/admin/functions/function-dialog.component";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { TagService } from "@app/core/services/tag.service";

interface FunctionNode {
  name: string;
  id: string;
  children?: FunctionNode[];
  functions?: any[];
}

@Component({
  selector: "app-function-list",
  templateUrl: "./function-list.component.html",
  styleUrls: ["./function-list.component.scss"],
})
export class FunctionListComponent implements OnInit {
  dataSource = new MatTableDataSource<any>();
  displayedColumns: string[] = ["name", "description", "actions"];
  totalFiles = 0;
  pageIndex = 0;
  pageSize = 10;
  treeControl = new NestedTreeControl<FunctionNode>((node) => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<FunctionNode>();
  filteredTreeDataSource = new MatTreeNestedDataSource<FunctionNode>();
  selectedFunctions: any[] = [];
  originalTreeData: FunctionNode[] = [];
  searchQuery: string = "";
  selectedNode: FunctionNode;

  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private nodeClassService: NodeClassService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService,
    private clipboard: Clipboard,
    private tagService: TagService
  ) {}

  ngOnInit(): void {
    this.loadTagsAndFunctions();
  }

  loadTagsAndFunctions(): void {
    this.tagService.getAllChildrenByName("Functions").subscribe(
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

  buildTree(tags: any[]): FunctionNode[] {
    const buildNode = (tag: any): FunctionNode => {
      return {
        id: tag.id,
        name: tag.name,
        children: tag.children ? tag.children.map(buildNode) : [],
      };
    };

    return tags.map(buildNode);
  }

  hasChild = (_: number, node: FunctionNode) =>
    !!node.children && node.children.length > 0;

  copyId(id: string) {
    this.clipboard.copy(id);
    alert("Copied ID: " + id);
  }

  copyFileUrl(fileUrl: string): void {
    navigator.clipboard
      .writeText(fileUrl)
      .then(() => {
        this.showNotification({
          message: "File URL copied to clipboard",
          type: "success",
          duration: 3000,
        });
      })
      .catch((error) => {
        this.showNotification({
          message: "Failed to copy file URL",
          type: "error",
          duration: 3000,
        });
      });
  }

  deleteFile(fileId: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "Confirm Deletion",
        message: "Are you sure you want to delete this file?",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.nodeClassService.deleteFile(fileId).subscribe(
          () => {
            this.showNotification({
              message: "File deleted successfully",
              type: "success",
              duration: 3000,
            });
            this.loadTagsAndFunctions();
          },
          (error) => {
            this.showNotification({
              message: "Error deleting file",
              type: "error",
              duration: 3000,
            });
          }
        );
      }
    });
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

  openAddFunctionDialog(): void {
    const dialogRef = this.dialog.open(AddFunctionDialog, {
      width: "400px",
      data: {
        parentTag: this.selectedNode.id,
        parentTagName: this.selectedNode.name,
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadTagsAndFunctions();
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
        case "name":
          return compare(a.name, b.name, isAsc);
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

  filterTree(nodes: FunctionNode[], query: string): FunctionNode[] {
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

  onNodeSelect(node: FunctionNode): void {
    this.selectedNode = node;
    this.tagService.getItemsByTagId(node.id).subscribe(
      (functions) => {
        this.selectedFunctions = functions;
        this.dataSource.data = functions;
      },
      (error) => {
        console.error("Error fetching functions by tag: ", error);
      }
    );
  }

  private showNotification(notification: NotificationMessage): void {
    this.toastNotificationService.dispatchNotification(notification);
  }
}

function compare(
  a: number | string,
  b: number | string,
  isAsc: boolean
): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
