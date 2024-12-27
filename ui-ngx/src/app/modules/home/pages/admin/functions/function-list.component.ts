import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
} from "@angular/core";
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
import { SearchService } from "@app/core/services/search.service";
import { FlowService } from "@app/core/services/flow.service";

interface FunctionNode {
  name: string;
  id: string;
  parent: string | null;
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
  searchFilter: string = "name";
  searchQuery: string = "";
  selectedNode: FunctionNode | null = null;

  constructor(
    private nodeClassService: NodeClassService,
    private flowService: FlowService,
    private searchService: SearchService,
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
          parent: null,
          children: this.buildTree(data.tree, "root"),
          functions: data.items,
          isLoaded: true,
        };
        this.functionTreeDataSource.data = [rootNode];
        this.selectedFunctions = data.items;
        this.dataSource.data = this.selectedFunctions;
        if (this.selectedNode) {
          const matchingNode = this.findNodeById(
            rootNode,
            this.selectedNode.id
          );
          if (matchingNode) {
            this.updateSelectedNode(matchingNode);
            this.treeControl.expand(matchingNode);
          }
        } else {
          this.treeControl.expand(rootNode);
          this.selectedNode = rootNode;
        }
      },
      (error) => {
        console.error("Error loading initial functions:", error);
      }
    );
  }

  findNodeById(node: FunctionNode, id: string): FunctionNode | null {
    if (node.id === id) {
      return node;
    }
    for (const child of node.children) {
      const found = this.findNodeById(child, id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  fetchChildFunctions(parentNode: FunctionNode): void {
    if (parentNode.isLoaded) {
      this.updateSelectedNode(parentNode);
      return;
    }

    this.nodeClassService.fetchFunctionsByParent(parentNode.id).subscribe(
      (data) => {
        parentNode.children = this.buildTree(data.tree, parentNode.id);
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

  buildTree(nodes: any[], parentId: string | null): FunctionNode[] {
    return nodes.map((node) => ({
      name: node.name,
      id: node.id,
      parent: parentId,
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
        message: "Are you sure you want to delete this function?",
        ok: "Delete",
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
            this.refreshFunctions(this.selectedNode);
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
      if (result) {
        this.refreshFunctions(this.selectedNode);
      }
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

  filterNodes(): void {
    if (!this.searchQuery) {
      this.loadInitialFunctions();
      return;
    }

    const query =
      this.searchFilter === "prefix"
        ? `prefix:${this.searchQuery}`
        : this.searchQuery;

    this.searchService.searchItems(query, "functions").subscribe(
      (results: any[]) => {
        const items = results.map((item) => ({
          ...item,
          id: item.id,
          name: item.name,
          description: item.description,
        }));

        const rootNode: FunctionNode = {
          id: "search-root",
          name: "Search Results",
          children: [],
          functions: items,
          parent: null,
          isLoaded: true,
        };

        this.functionTreeDataSource.data = [rootNode];
        this.selectedFunctions = items;
        this.dataSource.data = this.selectedFunctions;
        this.treeControl.expand(rootNode);
        this.selectedNode = rootNode;
      },
      (error) => {
        console.error("Error searching flows:", error);
      }
    );
  }

  clearSearch(): void {
    this.searchQuery = "";
    this.functionTreeDataSource.data = [];
    this.loadInitialFunctions();
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
        this.refreshFunctions(this.functionTreeDataSource.data[0]);
      }
    });
  }

  openAddPrefixDialog(): void {
    const dialogRef = this.dialog.open(AddPrefixDialogComponent, {
      data: {
        prefix: {
          parent: this.selectedNode.id,
        },
        type: "functions",
        isEdit: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const parentNode = this.findNodeById(
          this.functionTreeDataSource.data[0],
          result.parent
        );
        this.refreshFunctions(parentNode);
      }
    });
  }

  openEditPrefixDialog(): void {
    if (!this.selectedNode) {
      this.showNotification({
        message: "No prefix selected for editing",
        type: "error",
        duration: 3000,
      });
      return;
    }

    const dialogRef = this.dialog.open(AddPrefixDialogComponent, {
      data: {
        prefix: {
          id: this.selectedNode.id,
          name: this.selectedNode.name,
          parent: this.selectedNode.parent,
        },
        type: "functions",
        isEdit: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const parentNode = this.findNodeById(
          this.functionTreeDataSource.data[0],
          result.parent
        );
        this.refreshFunctions(parentNode);
      }
    });
  }

  deletePrefix(): void {
    if (!this.selectedNode) {
      this.showNotification({
        message: "No prefix selected for deletion",
        type: "error",
        duration: 3000,
      });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "Confirm Deletion",
        message: `Are you sure you want to delete the prefix "${this.selectedNode.name}"?`,
        ok: "Delete",
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.flowService.deletePrefix(this.selectedNode.id).subscribe(
          () => {
            this.showNotification({
              message: "Folder deleted successfully",
              type: "success",
              duration: 3000,
            });
            const parentNode = this.findNodeById(
              this.functionTreeDataSource.data[0],
              this.selectedNode.parent
            );
            this.refreshFunctions(parentNode);
          },
          (error) => {
            this.showNotification({
              message: error.error?.error || "Error deleting prefix",
              type: "error",
              duration: 3000,
            });
          }
        );
      }
    });
  }

  refreshFunctions(node: FunctionNode): void {
    const isRoot = node.id === "root";

    const fetchFunctionsObservable = isRoot
      ? this.nodeClassService.fetchFunctions()
      : this.nodeClassService.fetchFunctionsByParent(node.id);

    fetchFunctionsObservable.subscribe(
      (data) => {
        node.children = this.buildTree(data.tree, node.id);
        node.functions = data.items;
        node.isLoaded = true;

        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error refreshing functions:", error);
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
