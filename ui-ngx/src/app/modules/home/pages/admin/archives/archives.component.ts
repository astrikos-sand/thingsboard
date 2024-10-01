import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { MatSort, Sort } from "@angular/material/sort";
import { PageEvent } from "@angular/material/paginator";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { NestedTreeControl } from "@angular/cdk/tree";
import { Clipboard } from "@angular/cdk/clipboard";
import { ArchivesService, ArchiveFile, ArchiveData } from "@app/core/services/archives.service";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { NotificationMessage } from "@app/core/notification/notification.models";
import { UploadFileDialogComponent } from "./upload-file-dialog.component";

interface TagNode {
  name: string;
  id: string;
  children?: TagNode[];
  files?: ArchiveFile[];
}

@Component({
  selector: "app-archives",
  templateUrl: "./archives.component.html",
  styleUrls: ["./archives.component.scss"],
})
export class ArchivesComponent implements OnInit {
  dataSource = new MatTableDataSource<ArchiveFile>();
  displayedColumns: string[] = ["name", "prefix", "actions"];
  totalFiles = 0;
  pageIndex = 0;
  pageSize = 10;

  @ViewChild(MatSort) sort: MatSort;

  treeControl = new NestedTreeControl<TagNode>((node) => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<TagNode>();
  selectedFiles: ArchiveFile[] = [];
  searchQuery: string = "";
  selectedNode: TagNode | null = null;

  constructor(
    private archivesService: ArchivesService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService,
    private clipboard: Clipboard
  ) {}

  ngOnInit(): void {
    this.loadInitialFiles();
  }

  loadInitialFiles(): void {
    this.archivesService.getFileArchives().subscribe(
      (data: ArchiveData) => {
        const rootNode: TagNode = {
          id: "root",
          name: "Archives",
          children: this.buildTree(data.tree),
          files: data.items,
        };
        this.tagTreeDataSource.data = [rootNode];
        this.selectedFiles = data.items;
        this.dataSource.data = this.selectedFiles;
        this.totalFiles = data.items.length;
        this.dataSource.sort = this.sort;
        this.treeControl.expand(rootNode);
        this.selectedNode = rootNode; // Set root as the initial selected node
      },
      (error) => {
        console.error("Error loading initial files:", error);
      }
    );
  }

  fetchChildFiles(parentNode: TagNode): void {
    this.archivesService.fetchFilesByParent(parentNode.id).subscribe(
      (data: ArchiveData) => {
        const childNodes = this.buildTree(data.tree);
        parentNode.children = childNodes;
        parentNode.files = data.items;
        this.tagTreeDataSource.data = [...this.tagTreeDataSource.data];
        this.treeControl.expand(parentNode);
        this.selectedFiles = data.items;
        this.dataSource.data = this.selectedFiles;
        this.totalFiles = data.items.length;
        this.dataSource.sort = this.sort;
      },
      (error) => {
        console.error("Error fetching child files:", error);
      }
    );
  }

  buildTree(nodes: any[]): TagNode[] {
    return nodes.map((node) => ({
      name: node.name,
      id: node.id,
      children: [],
      files: [],
    }));
  }

  onNodeSelect(node: TagNode): void {
    this.selectedNode = node;
    if (node.children && node.children.length > 0) {
      this.selectedFiles = node.files || [];
      this.dataSource.data = this.selectedFiles;
      this.totalFiles = this.selectedFiles.length;
      this.treeControl.expand(node);
    } else {
      this.fetchChildFiles(node);
    }
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
            this.loadInitialFiles();
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

  handlePageEvent(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagedData();
  }

  updatePagedData(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.dataSource.data = this.selectedFiles.slice(startIndex, endIndex);
  }

  openAddFileDialog(): void {
    const dialogRef = this.dialog.open(UploadFileDialogComponent, {
      width: "400px",
      data: {
        selectedPrefix: this.selectedNode ? this.selectedNode.id : "root",
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadInitialFiles();
    });
  }

  sortData(sort: Sort): void {
    const data = this.selectedFiles.slice();
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
      this.tagTreeDataSource.data = this.tagTreeDataSource.data;
      this.treeControl.expandDescendants(this.tagTreeDataSource.data[0]);
    } else {
      const filteredNodes = this.filterTree(this.tagTreeDataSource.data, query.toLowerCase());
      this.tagTreeDataSource.data = filteredNodes;
      if (filteredNodes.length > 0) {
        this.treeControl.expandDescendants(filteredNodes[0]);
      }
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

  private showNotification(notification: NotificationMessage): void {
    this.toastNotificationService.dispatchNotification(notification);
  }
}

function compare(a: string, b: string, isAsc: boolean): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
