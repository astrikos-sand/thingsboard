import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
} from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { MatSort } from "@angular/material/sort";
import { MatPaginator } from "@angular/material/paginator";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { NestedTreeControl } from "@angular/cdk/tree";
import { Clipboard } from "@angular/cdk/clipboard";
import { EnvService, EnvFile, EnvData } from "@app/core/services/env.service";
import { SearchService } from "@app/core/services/search.service";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { NotificationMessage } from "@app/core/notification/notification.models";
import { CreateEnvDialogComponent } from "./create-env-dialog.component";
import { AddPrefixDialogComponent } from "../prefix/add-prefix-dialog.component";

interface EnvNode {
  name: string;
  id: string;
  children?: EnvNode[];
  files?: EnvFile[];
  isLoaded?: boolean;
}

@Component({
  selector: "app-env",
  templateUrl: "./env.component.html",
  styleUrls: ["./env.component.scss"],
})
export class EnvComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<EnvFile>();
  displayedColumns: string[] = ["name", "actions"];
  searchFilter: string = "name";
  searchQuery: string = "";

  treeControl = new NestedTreeControl<EnvNode>((node) => node.children);
  envTreeDataSource = new MatTreeNestedDataSource<EnvNode>();
  selectedFiles: EnvFile[] = [];
  selectedNode: EnvNode | null = null;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private envService: EnvService,
    private searchService: SearchService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService,
    private clipboard: Clipboard,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialEnvs();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadInitialEnvs(): void {
    this.envService.getEnvs().subscribe(
      (data: EnvData) => {
        const rootNode: EnvNode = {
          id: "root",
          name: "Environments",
          children: this.buildTree(data.tree),
          files: data.items,
          isLoaded: true,
        };
        this.envTreeDataSource.data = [rootNode];
        this.selectedFiles = data.items;
        this.dataSource.data = this.selectedFiles;
        if (this.selectedNode) {
          const matchingNode = this.findNodeById(rootNode, this.selectedNode.id);
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
        console.error("Error loading environments:", error);
      }
    );
  }

  findNodeById(node: EnvNode, id: string): EnvNode | null {
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

  fetchChildNodes(node: EnvNode): void {
    if (node.isLoaded) {
      this.updateSelectedNode(node);
      return;
    }

    this.envService.fetchEnvsByParent(node.id).subscribe(
      (data: EnvData) => {
        node.children = this.buildTree(data.tree);
        node.files = data.items;
        node.isLoaded = true;

        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error fetching child nodes:", error);
      }
    );
  }

  toggleNode(node: EnvNode): void {
    if (this.treeControl.isExpanded(node)) {
      this.treeControl.collapse(node);
    } else {
      this.treeControl.expand(node);
    }

    if (!node.isLoaded && this.treeControl.isExpanded(node)) {
      this.fetchChildNodes(node);
    }

    this.updateSelectedNode(node);
  }

  updateSelectedNode(node: EnvNode): void {
    this.selectedNode = node;
    this.selectedFiles = node.files || [];
    this.dataSource.data = this.selectedFiles;
    this.cdr.detectChanges();
  }

  refreshTreeData(): void {
    const data = this.envTreeDataSource.data;
    this.envTreeDataSource.data = null;
    this.envTreeDataSource.data = data;
    this.cdr.detectChanges();
  }

  buildTree(nodes: any[]): EnvNode[] {
    return nodes.map((node) => ({
      name: node.name,
      id: node.id,
      children: [],
      files: [],
      isLoaded: false,
    }));
  }

  searchNodes(): void {
    if (!this.searchQuery) {
      this.loadInitialEnvs();
      return;
    }

    const query =
      this.searchFilter === "prefix"
        ? `prefix:${this.searchQuery}`
        : this.searchQuery;

    this.searchService.searchItems(query, "environments").subscribe(
      (results: EnvFile[]) => {
        const items = results.map((item) => ({
          ...item,
        }));

        const rootNode: EnvNode = {
          id: "search-root",
          name: "Search Results",
          children: [],
          files: items,
          isLoaded: true,
        };

        this.envTreeDataSource.data = [rootNode];
        this.selectedFiles = items;
        this.dataSource.data = this.selectedFiles;
        this.treeControl.expand(rootNode);
        this.selectedNode = rootNode;
      },
      (error) => {
        console.error("Error searching environments:", error);
      }
    );
  }

  clearSearch(): void {
    this.searchQuery = "";
    this.envTreeDataSource.data = [];
    this.loadInitialEnvs();
  }

  openAddPrefixDialog(): void {
    const dialogRef = this.dialog.open(AddPrefixDialogComponent, {
      data: {
        parentPrefix: this.selectedNode ? this.selectedNode.id : "root",
        type: "environments",
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.refreshEnvs(this.selectedNode);
    });
  }

  openCreateEnvDialog(): void {
    const dialogRef = this.dialog.open(CreateEnvDialogComponent, {
      width: "400px",
      data: {
        selectedPrefix: this.selectedNode ? this.selectedNode.id : "root",
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.refreshEnvs(this.selectedNode);
    });
  }

  openFile(filepath: string): void {
    let url = filepath;
    if (!filepath.startsWith("http")) {
      url = "/backend" + filepath;
    }
    window.open(url, "_blank");
  }

  copyId(id: string) {
    this.clipboard.copy(id);
    alert("Copied ID: " + id);
  }

  deleteEnv(envId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "Confirm Deletion",
        message: "Are you sure you want to delete this environment?",
        ok: "Delete",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.envService.deleteEnv(envId).subscribe(
          () => {
            this.showNotification({
              message: "Environment deleted successfully",
              type: "success",
              duration: 3000,
            });
            this.refreshEnvs(this.selectedNode);
          },
          (error) => {
            console.error("Error deleting environment: ", error);
            this.showNotification({
              message: "Error deleting environment",
              type: "error",
              duration: 3000,
            });
          }
        );
      }
    });
  }

  refreshEnvs(node: EnvNode): void {
    if (!node) {
      return;
    }
  
    this.envService.fetchEnvsByParent(node.id).subscribe(
      (data) => {
        node.children = this.buildTree(data.tree);
        node.files = data.items;
        node.isLoaded = true;
  
        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error refreshing flows:", error);
      }
    );
  }

  private showNotification(notification: NotificationMessage): void {
    this.toastNotificationService.dispatchNotification(notification);
  }
}
