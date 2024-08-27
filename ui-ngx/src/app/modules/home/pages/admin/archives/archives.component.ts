import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { MatSort, Sort } from "@angular/material/sort";
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { Clipboard } from '@angular/cdk/clipboard';
import { ArchivesService, ArchiveFile } from "@app/core/services/archives.service";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { NotificationMessage } from "@app/core/notification/notification.models";
import { UploadFileDialogComponent } from "./upload-file-dialog.component";
import { TagService } from "@app/core/services/tag.service";
import { PageEvent } from "@angular/material/paginator";

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
  displayedColumns: string[] = ["filename", "tags", "actions"];
  totalFiles = 0;
  pageIndex = 0;
  pageSize = 10;

  @ViewChild(MatSort) sort: MatSort;

  treeControl = new NestedTreeControl<TagNode>(node => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<TagNode>();
  filteredTreeDataSource = new MatTreeNestedDataSource<TagNode>();
  selectedFiles: ArchiveFile[] = [];
  originalTreeData: TagNode[] = [];
  searchQuery: string = '';
  selectedNode: TagNode;

  constructor(
    private archivesService: ArchivesService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService,
    private clipboard: Clipboard,
    private tagService: TagService
  ) {}

  ngOnInit(): void {
    this.loadTagsAndFiles();
  }

  loadTagsAndFiles(): void {
    this.tagService.getAllChildrenByName('Archives').subscribe(
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

  loadFileArchives(): void {
    this.archivesService.getFileArchives().subscribe(
      (data) => {
        this.dataSource.data = data;
        this.totalFiles = data.length;
        this.dataSource.sort = this.sort;
        if (this.selectedNode) {
          this.onNodeSelect(this.selectedNode);
        }
      },
      (error) => {
        console.error("Error fetching file archives: ", error);
      }
    );
  }

  buildTree(tags: any[]): TagNode[] {
    const buildNode = (tag: any): TagNode => {
      return {
        id: tag.id,
        name: tag.name,
        children: tag.children ? tag.children.map(buildNode) : []
      };
    };

    return tags.map(buildNode);
  }

  hasChild = (_: number, node: TagNode) => !!node.children && node.children.length > 0;

  copyId(id: string) {
    this.clipboard.copy(id);
    alert('Copied ID: ' + id);
  }

  openFile(filepath: string): void {
    window.open(filepath, '_blank');
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
            this.loadTagsAndFiles();
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

  onNodeSelect(node: TagNode): void {
    this.selectedNode = node;
    this.tagService.getItemsByTagId(node.id).subscribe(
      (files) => {
        this.selectedFiles = files;
      },
      (error) => {
        console.error("Error fetching files by tag: ", error);
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

  openAddFileDialog(): void {
    const dialogRef = this.dialog.open(UploadFileDialogComponent, {
      width: "400px",
      data: { parentTag: this.selectedNode.id, parentTagName: this.selectedNode.name },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadTagsAndFiles();
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
        case "filename":
          return this.compare(a.filename, b.filename, isAsc);
        default:
          return 0;
      }
    });
    this.updatePagedData();
  }

  private compare(a: string, b: string, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  private showNotification(notification: NotificationMessage): void {
    this.toastNotificationService.dispatchNotification(notification);
  }

  filterNodes(query: string): void {
    this.searchQuery = query;
    if (!query) {
      this.filteredTreeDataSource.data = this.originalTreeData;
      this.treeControl.expandDescendants(this.originalTreeData[0]);
    } else {
      const filteredNodes = this.filterTree(this.originalTreeData, query.toLowerCase());
      this.filteredTreeDataSource.data = filteredNodes;
      this.treeControl.expandDescendants(filteredNodes[0]);
    }
  }

  filterTree(nodes: TagNode[], query: string): TagNode[] {
    return nodes
      .map(node => ({ ...node }))
      .filter(node => {
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
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }
}
