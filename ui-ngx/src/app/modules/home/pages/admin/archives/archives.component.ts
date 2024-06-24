import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import {
  ArchivesService,
  ArchiveFile,
} from "@app/core/services/archives.service";
import { PageEvent } from "@angular/material/paginator";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { MatSort, Sort } from "@angular/material/sort";
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { NotificationMessage } from "@app/core/notification/notification.models";
import { UploadFileDialogComponent } from "./upload-file-dialog.component";
@Component({
  selector: "app-archives",
  templateUrl: "./archives.component.html",
  styleUrls: ["./archives.component.scss"],
})
export class ArchivesComponent implements OnInit {
  dataSource = new MatTableDataSource<ArchiveFile>();
  displayedColumns: string[] = ["filename", "filepath", "actions"];
  totalFiles = 0;
  pageIndex = 0;
  pageSize = 10;

  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private archivesService: ArchivesService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService
  ) {}

  ngOnInit(): void {
    this.loadFileArchives();
  }

  loadFileArchives(): void {
    this.archivesService.getFileArchives().subscribe(
      (data) => {
        this.dataSource.data = data;
        this.totalFiles = data.length;
        this.dataSource.sort = this.sort;
        this.updatePagedData();
      },
      (error) => {
        console.error("Error fetching file archives: ", error);
      }
    );
  }

  copyFileUrl(fileUrl: string): void {
    navigator.clipboard
      .writeText(fileUrl)
      .then(() => {
        console.log("File URL copied to clipboard: ", fileUrl);
        this.showNotification({
          message: "File URL copied to clipboard",
          type: "success",
          duration: 3000,
        });
      })
      .catch((error) => {
        console.error("Error copying file URL to clipboard: ", error);
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
        this.archivesService.deleteFile(fileId).subscribe(
          () => {
            this.showNotification({
              message: "File deleted successfully",
              type: "success",
              duration: 3000,
            });
            this.loadFileArchives();
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
    this.dataSource.data = this.dataSource.data.slice(startIndex, endIndex);
  }

  openAddFileDialog(): void {
    const dialogRef = this.dialog.open(UploadFileDialogComponent, {
      width: "400px",
      data: {},
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadFileArchives();
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
}
