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
import { SearchService } from "@app/core/services/search.service"; // New service
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
  searchType: string = "environments"; // Default item type
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
        this.treeControl.expand(rootNode);
        this.selectedNode = rootNode;
      },
      (error) => {
        console.error("Error loading initial environments:", error);
      }
    );
  }

  searchEnvs(query: string): void {
    if (!query) {
      this.loadInitialEnvs();
      return;
    }
    const searchParam = this.searchFilter === "prefix" ? `prefix:${query}` : query;

    this.searchService.searchItems(searchParam, this.searchType).subscribe(
      (results: EnvFile[]) => {
        const items = results.map((item) => ({
          ...item,
          requirements: item.requirements.startsWith("/media")
            ? `http://localhost:8000${item.requirements}`
            : item.requirements,
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

  clearSearchResults(): void {
    this.searchQuery = "";
    this.envTreeDataSource.data = [];
    this.loadInitialEnvs();
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

  filterEnvs(query: string): void {
    this.searchQuery = query.toLowerCase();
    if (!query) {
      this.envTreeDataSource.data = this.envTreeDataSource.data;
      this.treeControl.expandDescendants(this.envTreeDataSource.data[0]);
    } else {
      const filteredNodes = this.filterTree(this.envTreeDataSource.data, query);
      this.envTreeDataSource.data = filteredNodes;
      if (filteredNodes.length > 0) {
        this.treeControl.expandDescendants(filteredNodes[0]);
      }
    }
  }

  filterTree(nodes: EnvNode[], query: string): EnvNode[] {
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

  openAddPrefixDialog(): void {
    const dialogRef = this.dialog.open(AddPrefixDialogComponent, {
      data: {
        parentPrefix: this.selectedNode ? this.selectedNode.id : "root",
        type: "environments",
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadInitialEnvs();
    });
  }

  openCreateEnvDialog(): void {
    const dialogRef = this.dialog.open(CreateEnvDialogComponent, {
      width: "400px",
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadInitialEnvs();
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
            this.loadInitialEnvs();
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

  private showNotification(notification: NotificationMessage): void {
    this.toastNotificationService.dispatchNotification(notification);
  }
}
