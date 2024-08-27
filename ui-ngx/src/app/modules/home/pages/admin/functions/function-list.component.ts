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
  functions: any[] = [];
  displayedColumns: string[] = ["name", "description", "actions"];
  dataSource = new MatTableDataSource<any>(this.functions);
  selectedFunctions: any[] = [];
  totalFiles = 0;
  pageIndex = 0;
  pageSize = 10;
  treeControl = new NestedTreeControl<FunctionNode>((node) => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<FunctionNode>();
  filteredTreeDataSource = new MatTreeNestedDataSource<FunctionNode>();
  originalTreeData: FunctionNode[] = [];
  searchQuery: string = "";

  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private nodeClassService: NodeClassService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService,
    private clipboard: Clipboard
  ) {}

  ngOnInit(): void {
    this.loadNodeClasses();
  }

  loadNodeClasses(): void {
    this.nodeClassService.getNodeClasses().subscribe(
      (data) => {
        this.functions = data;
        const rootNodes = this.buildTree(this.functions);
        this.tagTreeDataSource.data = rootNodes;
        this.filteredTreeDataSource.data = rootNodes;
        this.originalTreeData = rootNodes;
        this.treeControl.expandDescendants(rootNodes[0]);
        this.dataSource.data = this.functions;
        this.totalFiles = data.length;
        this.dataSource.sort = this.sort;
        this.updatePagedData();
      },
      (error) => {
        console.error("Error fetching node classes: ", error);
      }
    );
  }

  buildTree(functions: any[]): FunctionNode[] {
    const root: FunctionNode = { name: "Functions", id: "root", children: [] };
    const nodeMap: { [key: string]: FunctionNode } = { Functions: root };

    functions.forEach((func) => {
      func.tags.forEach((tag) => {
        const path = tag.full_name.split("/");
        let currentNode = root;
        path.forEach((part, index) => {
          if (!nodeMap[part]) {
            const newNode: FunctionNode = {
              name: part,
              id: tag.id,
              children: [],
            };
            nodeMap[part] = newNode;
            if (index === path.length - 1) {
              newNode.functions = [];
            }
            currentNode.children.push(newNode);
          }
          currentNode = nodeMap[part];
        });
        currentNode.functions?.push(func);
      });
    });

    return [root];
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
            this.loadNodeClasses();
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
    this.dataSource.data = this.functions.slice(startIndex, endIndex);
  }

  openAddFunctionDialog(): void {
    const dialogRef = this.dialog.open(AddFunctionDialog);

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.dataSource.data = [result, ...this.dataSource.data];
      console.log("The dialog was closed");
    });
  }

  sortData(sort: Sort): void {
    const data = this.functions.slice();
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
    this.selectedFunctions = this.collectFunctions(node);
    this.dataSource.data = this.selectedFunctions;
  }

  collectFunctions(node: FunctionNode): any[] {
    let functions: any[] = [];
    if (node.functions) {
      functions = functions.concat(node.functions);
    }
    if (node.children) {
      for (const child of node.children) {
        functions = functions.concat(this.collectFunctions(child));
      }
    }
    return functions;
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
