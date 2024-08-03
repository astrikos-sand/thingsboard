import { Component, OnInit, ViewChild } from "@angular/core";
import {
  ArchivesService,
  ArchiveFile,
} from "@app/core/services/archives.service";
import { UploadFileDialogComponent } from "./upload-file-dialog.component";
import { TagService } from "@app/core/services/tag.service";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { MatDialog } from "@angular/material/dialog";
import { NotificationMessage } from "@app/core/notification/notification.models";
import { ToastNotificationService } from "@app/core/services/toast-notification.service";
import { TreeTableComponent } from "../tree-table/tree-table.component";

@Component({
  selector: "app-archives",
  templateUrl: "./archives.component.html",
})
export class ArchivesComponent implements OnInit {
  uploadFileDialogComponent = UploadFileDialogComponent;

  columns = [
    {
      columnDef: "filename",
      header: "Filename",
      cell: (element: ArchiveFile) => `${element.name}`,
    },
    {
      columnDef: "tags",
      header: "Tags",
      cell: (element: ArchiveFile) =>
        element.tags.map((tag) => tag.full_name).join(", "),
    },
  ];

  actions = [
    {
      icon: "open_in_new",
      tooltip: "Open File",
      callback: (item: ArchiveFile) => this.openFile(item.file),
    },
    {
      icon: "delete",
      tooltip: "Delete File",
      callback: (item: ArchiveFile) => this.deleteFile(item.id),
    },
  ];

  @ViewChild(TreeTableComponent) treeTable: TreeTableComponent;

  constructor(
    public archivesService: ArchivesService,
    public tagService: TagService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService
  ) {}

  ngOnInit(): void {}

  openFile(filepath: string): void {
    window.open(filepath, "_blank");
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
            this.treeTable.refreshDataForSelectedNode();
            this.showNotification({
              message: "File deleted successfully",
              type: "success",
              duration: 3000,
            });
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

  private showNotification(notification: NotificationMessage): void {
    this.toastNotificationService.dispatchNotification(notification);
  }
}
