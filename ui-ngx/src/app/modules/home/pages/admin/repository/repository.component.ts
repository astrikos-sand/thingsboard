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
import {
  RepositoryService,
  RepositoryFile,
  RepositoryData,
} from "@app/core/services/repository.service";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { UploadRepositoryDialogComponent } from "./upload-repository-dialog.component";
import { FlowService } from "@app/core/services/flow.service";
import { AddPrefixDialogComponent } from "../prefix/add-prefix-dialog.component";
import { NotificationMessage } from "@app/core/notification/notification.models";

interface RepositoryNode {
  name: string;
  id: string;
  parent: string | null;
  children?: RepositoryNode[];
  files?: RepositoryFile[];
  isLoaded?: boolean;
}

@Component({
  selector: "app-repository",
  templateUrl: "./repository.component.html",
  styleUrls: ["./repository.component.scss"],
})
export class RepositoryComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<RepositoryFile>();
  displayedColumns: string[] = ["name", "description", "status", "actions"];
  searchFilter: string = "name";
  searchQuery: string = "";

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  treeControl = new NestedTreeControl<RepositoryNode>((node) => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<RepositoryNode>();
  selectedFiles: RepositoryFile[] = [];
  selectedNode: RepositoryNode | null = null;

  constructor(
    private flowService: FlowService,
    private repositoryService: RepositoryService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService,
    private clipboard: Clipboard,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialFiles();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadInitialFiles(): void {
    this.repositoryService.getFileRepositories().subscribe(
      (data: RepositoryData) => {
        const rootNode: RepositoryNode = {
          id: "root",
          name: "Repositories",
          parent: null,
          children: this.buildTree(data.tree, "root"),
          files: data.items,
          isLoaded: true,
        };
        this.tagTreeDataSource.data = [rootNode];
        this.selectedFiles = data.items;
        this.dataSource.data = this.selectedFiles;

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
        console.error("Error loading initial files:", error);
      }
    );
  }

  findNodeById(node: RepositoryNode, id: string): RepositoryNode | null {
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

  fetchChildFiles(node: RepositoryNode): void {
    if (node.isLoaded) {
      this.updateSelectedNode(node);
      return;
    }
    this.repositoryService.fetchFilesByParent(node.id).subscribe(
      (data: RepositoryData) => {
        node.children = this.buildTree(data.tree, node.id);
        node.files = data.items;
        node.isLoaded = true;

        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error fetching child files:", error);
      }
    );
  }

  toggleNode(node: RepositoryNode): void {
    if (this.treeControl.isExpanded(node)) {
      this.treeControl.collapse(node);
    } else {
      this.treeControl.expand(node);
    }

    if (!node.isLoaded && this.treeControl.isExpanded(node)) {
      this.fetchChildFiles(node);
    }

    this.updateSelectedNode(node);
  }

  updateSelectedNode(node: RepositoryNode): void {
    this.selectedNode = node;
    this.selectedFiles = node.files || [];
    this.dataSource.data = this.selectedFiles;
    this.cdr.detectChanges();
  }

  refreshTreeData(): void {
    const data = this.tagTreeDataSource.data;
    this.tagTreeDataSource.data = null;
    this.tagTreeDataSource.data = data;
    this.cdr.detectChanges();
  }

  buildTree(nodes: any[], parentId: string | null): RepositoryNode[] {
    return nodes.map((node) => ({
      name: node.name,
      id: node.id,
      parent: parentId,
      children: [],
      files: [],
      isLoaded: false,
    }));
  }

  openUploadDialog(): void {
    const dialogRef = this.dialog.open(UploadRepositoryDialogComponent, {
      data: {
        selectedPrefix: this.selectedNode ? this.selectedNode.id : "root",
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.refreshFiles(this.selectedNode);
    });
  }

  deleteFile(fileId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "Confirm Deletion",
        message: "Are you sure you want to delete this file?",
        ok: "Delete",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.repositoryService.deleteFile(fileId).subscribe(
          () => {
            this.toastNotificationService.dispatchNotification({
              message: "File deleted successfully",
              type: "success",
              duration: 3000,
            });
            this.refreshFiles(this.selectedNode);
          },
          (error) => {
            console.error("Error deleting file: ", error);
          }
        );
      }
    });
  }

  refreshFiles(node: RepositoryNode): void {
    if (!node) return;

    const isRoot = node.id === "root";

    const fetchFilesObservable = isRoot
      ? this.repositoryService.getFileRepositories()
      : this.repositoryService.fetchFilesByParent(node.id);

    fetchFilesObservable.subscribe(
      (data: RepositoryData) => {
        node.children = this.buildTree(data.tree, node.id);
        node.files = data.items;
        node.isLoaded = true;

        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error refreshing files:", error);
      }
    );
  }
  copyId(id: string) {
    this.clipboard.copy(id);
    alert("Copied ID: " + id);
  }

  openFile(filepath: string): void {
    let url = filepath;
    if (!filepath.startsWith("http")) {
      url = "/backend" + filepath;
    }
    window.open(url, "_blank");
  }

  copy_url(url: string) {
    const endpoint = url.split("media")[1];
    const new_url = "http://host.docker.internal:8000/media" + endpoint;
    this.clipboard.copy(new_url);
  }
  openAddPrefixDialog(): void {
    const dialogRef = this.dialog.open(AddPrefixDialogComponent, {
      data: {
        prefix: {
          parent: this.selectedNode ? this.selectedNode.id : "root",
        },
        type: "datatransfer",
        isEdit: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const parentNode = this.findNodeById(
          this.tagTreeDataSource.data[0],
          result.parent
        );
        this.refreshFiles(parentNode);
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
        type: "datatransfer",
        isEdit: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const parentNode = this.findNodeById(
          this.tagTreeDataSource.data[0],
          result.parent
        );
        this.refreshFiles(parentNode);
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
              this.tagTreeDataSource.data[0],
              this.selectedNode.parent
            );
            this.refreshFiles(parentNode);
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

  private showNotification(notification: NotificationMessage): void {
    this.toastNotificationService.dispatchNotification(notification);
  }
}
