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
  ArchivesService,
  ArchiveFile,
  ArchiveData,
} from "@app/core/services/archives.service";
import { SearchService } from "@app/core/services/search.service";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { NotificationMessage } from "@app/core/notification/notification.models";
import { UploadFileDialogComponent } from "./upload-file-dialog.component";
import { AddPrefixDialogComponent } from "../prefix/add-prefix-dialog.component";

interface TagNode {
  name: string;
  id: string;
  children?: TagNode[];
  files?: ArchiveFile[];
  isLoaded?: boolean;
}

@Component({
  selector: "app-archives",
  templateUrl: "./archives.component.html",
  styleUrls: ["./archives.component.scss"],
})
export class ArchivesComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<ArchiveFile>();
  displayedColumns: string[] = ["name", "actions"];
  searchFilter: string = "name";
  searchQuery: string = "";

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  treeControl = new NestedTreeControl<TagNode>((node) => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<TagNode>();
  selectedFiles: ArchiveFile[] = [];
  selectedNode: TagNode | null = null;

  constructor(
    private archivesService: ArchivesService,
    private searchService: SearchService,
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
    this.archivesService.getFileArchives().subscribe(
      (data: ArchiveData) => {
        const rootNode: TagNode = {
          id: "root",
          name: "Archives",
          children: this.buildTree(data.tree),
          files: data.items,
          isLoaded: true,
        };
        this.tagTreeDataSource.data = [rootNode];
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
        console.error("Error loading initial files:", error);
      }
    );
  }

  findNodeById(node: TagNode, id: string): TagNode | null {
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

  fetchChildFiles(node: TagNode): void {
    if (node.isLoaded) {
      this.updateSelectedNode(node);
      return;
    }
    this.archivesService.fetchFilesByParent(node.id).subscribe(
      (data: ArchiveData) => {
        node.children = this.buildTree(data.tree);
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

  toggleNode(node: TagNode): void {
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

  updateSelectedNode(node: TagNode): void {
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

  buildTree(nodes: any[]): TagNode[] {
    return nodes.map((node) => ({
      name: node.name,
      id: node.id,
      children: [],
      files: [],
      isLoaded: false,
    }));
  }

  filterNodes(): void {
    if (!this.searchQuery) {
      this.loadInitialFiles();
      return;
    }

    const query =
      this.searchFilter === "prefix"
        ? `prefix:${this.searchQuery}`
        : this.searchQuery;

    this.searchService.searchItems(query, "archives").subscribe(
      (results: ArchiveFile[]) => {
        const items = results.map((item) => ({
          ...item,
          file: item.file.startsWith("/media")
            ? `http://localhost:8000${item.file}`
            : item.file,
        }));

        const rootNode: TagNode = {
          id: "search-root",
          name: "Search Results",
          children: [],
          files: items,
          isLoaded: true,
        };

        this.tagTreeDataSource.data = [rootNode];
        this.selectedFiles = items;
        this.dataSource.data = this.selectedFiles;
        this.treeControl.expand(rootNode);
        this.selectedNode = rootNode;
      },
      (error) => {
        console.error("Error searching archives:", error);
      }
    );
  }

  clearSearch(): void {
    this.searchQuery = "";
    this.tagTreeDataSource.data = [];
    this.loadInitialFiles();
  }

  onNodeSelect(node: TagNode): void {
    this.fetchChildFiles(node);
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
        this.archivesService.deleteFile(fileId).subscribe(
          () => {
            this.showNotification({
              message: "File deleted successfully",
              type: "success",
              duration: 3000,
            });
            this.refreshFiles(this.selectedNode);
          },
          (error) => {
            console.error("Error deleting file: ", error);
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

  openAddPrefixDialog(): void {
    const dialogRef = this.dialog.open(AddPrefixDialogComponent, {
      data: {
        parentPrefix: this.selectedNode ? this.selectedNode.id : "root",
        type: "archives",
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.refreshFiles(this.selectedNode);
    });
  }

  openAddFileDialog(): void {
    const dialogRef = this.dialog.open(UploadFileDialogComponent, {
      width: "400px",
      data: {
        selectedPrefix: this.selectedNode ? this.selectedNode.id : "root",
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.refreshFiles(this.selectedNode);
    });
  }

  refreshFiles(node: TagNode): void {
    if (!node) {
      return;
    }
  
    this.archivesService.fetchFilesByParent(node.id).subscribe(
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

  highlightText(text: string, query: string): string {
    if (!query) {
      return text;
    }
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  private showNotification(notification: NotificationMessage): void {
    this.toastNotificationService.dispatchNotification(notification);
  }
}
