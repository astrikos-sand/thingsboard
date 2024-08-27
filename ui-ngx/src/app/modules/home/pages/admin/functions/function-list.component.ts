import { Component, OnInit, ViewChild } from "@angular/core";
import { NodeClassService } from "@app/core/services/node-classes.service";
import { AddFunctionDialog } from "@home/pages/admin/functions/function-dialog.component";
import { TagService } from "@app/core/services/tag.service";
import { MatDialog } from "@angular/material/dialog";
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { TreeTableComponent } from "../tree-table/tree-table.component";

@Component({
  selector: "app-function-list",
  templateUrl: "./function-list.component.html",
  styleUrls: ["./function-list.component.scss"],
})
export class FunctionListComponent implements OnInit {
  addFunctionDialogComponent = AddFunctionDialog;

  columns = [
    {
      columnDef: "name",
      header: "Name",
      cell: (element: any) => `${element.name}`,
    },
    {
      columnDef: "description",
      header: "Description",
      cell: (element: any) => `${element.description}`,
    },
  ];

  actions = [
    {
      icon: "content_copy",
      tooltip: "Copy File URL",
      callback: (item: any) => this.copyFileUrl(item.code),
    },
    {
      icon: "delete",
      tooltip: "Delete File",
      callback: (item: any) => this.deleteFile(item.id),
    },
  ];

  @ViewChild(TreeTableComponent) treeTable: TreeTableComponent;

  constructor(
    public nodeClassService: NodeClassService,
    public tagService: TagService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService
  ) {}

  ngOnInit(): void {}

  copyFileUrl(fileUrl: string): void {
    navigator.clipboard
      .writeText(fileUrl)
      .then(() => {
        this.toastNotificationService.dispatchNotification({
          message: "File URL copied to clipboard",
          type: "success",
          duration: 3000,
        });
      })
      .catch((error) => {
        this.toastNotificationService.dispatchNotification({
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
            this.treeTable.refreshDataForSelectedNode();
            this.toastNotificationService.dispatchNotification({
              message: "File deleted successfully",
              type: "success",
              duration: 3000,
            });
          },
          (error) => {
            this.toastNotificationService.dispatchNotification({
              message: "Error deleting file",
              type: "error",
              duration: 3000,
            });
          }
        );
      }
    });
  }
}
