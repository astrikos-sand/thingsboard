import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort, Sort } from "@angular/material/sort";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { NestedTreeControl } from "@angular/cdk/tree";
import { Clipboard } from "@angular/cdk/clipboard";
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { NotificationMessage } from "@app/core/notification/notification.models";
import { NodeClassService } from "@app/core/services/node-classes.service";
import { AddFunctionDialog } from "@home/pages/admin/functions/function-dialog.component";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { EditFunctionDialogComponent } from "./edit-function-dialog.component";
import { AddPrefixDialogComponent } from "../prefix/add-prefix-dialog.component";

interface FunctionNode {
  name: string;
  id: string;
  children?: FunctionNode[];
  functions?: any[];
  isLoaded?: boolean;
}

@Component({
  selector: "app-function-list",
  templateUrl: "./function-list.component.html",
  styleUrls: ["./function-list.component.scss"],
})
export class FunctionListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ["name", "description", "actions"];
  selectedFunctions: any[] = [];
  dataSource = new MatTableDataSource<any>(this.selectedFunctions);

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  treeControl = new NestedTreeControl<FunctionNode>((node) => node.children);
  functionTreeDataSource = new MatTreeNestedDataSource<FunctionNode>();
  searchQuery: string = "";
  selectedNode: FunctionNode | null = null;

  constructor(
    private nodeClassService: NodeClassService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService,
    private clipboard: Clipboard,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialFunctions();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadInitialFunctions(): void {
    this.nodeClassService.fetchFunctions().subscribe(
      (data) => {
        const rootNode: FunctionNode = {
          id: "root",
          name: "Functions",
          children: this.buildTree(data.tree),
          functions: data.items,
          isLoaded: true,
        };
        this.functionTreeDataSource.data = [rootNode];
        this.selectedFunctions = data.items;
        this.dataSource.data = this.selectedFunctions;
        this.treeControl.expand(rootNode);
        this.selectedNode = rootNode;
      },
      (error) => {
        console.error("Error loading initial functions:", error);
      }
    );
  }

  fetchChildFunctions(parentNode: FunctionNode): void {
    if (parentNode.isLoaded) {
      this.updateSelectedNode(parentNode);
      return;
    }

    this.nodeClassService.fetchFunctionsByParent(parentNode.id).subscribe(
      (data) => {
        parentNode.children = this.buildTree(data.tree);
        parentNode.functions = data.items;
        parentNode.isLoaded = true;

        this.updateSelectedNode(parentNode);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error fetching child functions:", error);
      }
    );
  }

  toggleNode(node: FunctionNode): void {
    if (this.treeControl.isExpanded(node)) {
      this.treeControl.collapse(node);
    } else {
      this.treeControl.expand(node);
    }

    if (!node.isLoaded && this.treeControl.isExpanded(node)) {
      this.fetchChildFunctions(node);
    }

    this.updateSelectedNode(node);
  }

  updateSelectedNode(node: FunctionNode): void {
    this.selectedNode = node;
    this.selectedFunctions = node.functions || [];
    this.dataSource.data = this.selectedFunctions;
    this.cdr.detectChanges();
  }

  refreshTreeData(): void {
    const data = this.functionTreeDataSource.data;
    this.functionTreeDataSource.data = null;
    this.functionTreeDataSource.data = data;
    this.cdr.detectChanges();
  }

  buildTree(nodes: any[]): FunctionNode[] {
    return nodes.map((node) => ({
      name: node.name,
      id: node.id,
      children: [],
      functions: [],
      isLoaded: false,
    }));
  }

  onNodeSelect(node: FunctionNode): void {
    this.fetchChildFunctions(node);
  }

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
      .catch(() => {
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
            this.loadInitialFunctions();
          },
          () => {
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

  openAddFunctionDialog(): void {
    const dialogRef = this.dialog.open(AddFunctionDialog, {
      data: {
        selectedPrefix: this.selectedNode ? this.selectedNode.id : "root",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.dataSource.data = [result, ...this.dataSource.data];
    });
  }

  sortData(sort: Sort): void {
    const data = this.selectedFunctions.slice();
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
  }

  filterNodes(query: string): void {
    this.searchQuery = query;
    if (!query) {
      this.functionTreeDataSource.data = this.functionTreeDataSource.data;
      this.treeControl.expandDescendants(this.functionTreeDataSource.data[0]);
    } else {
      const filteredNodes = this.filterTree(
        this.functionTreeDataSource.data,
        query.toLowerCase()
      );
      this.functionTreeDataSource.data = filteredNodes;
      if (filteredNodes.length > 0) {
        this.treeControl.expandDescendants(filteredNodes[0]);
      }
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

  openEditFunctionDialog(file: any): void {
    const dialogRef = this.dialog.open(EditFunctionDialogComponent, {
      data: {
        functionData: file,
      },
    });
  
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadInitialFunctions();
      }
    });
  }
  
  openAddPrefixDialog(): void {
    const dialogRef = this.dialog.open(AddPrefixDialogComponent, {
      data: {
        parentPrefix: this.selectedNode ? this.selectedNode.id : 'root',
        type: "functions",
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadInitialFunctions();
    });
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
