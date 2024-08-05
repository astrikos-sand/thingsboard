import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Clipboard } from "@angular/cdk/clipboard";
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { WebhookDialogComponent } from "./dialog.component";
import { TriggerService } from "@app/core/services/trigger.service";
import { TagService } from "@app/core/services/tag.service";

@Component({
  selector: "app-webhook",
  templateUrl: "./webhook.component.html",
})
export class WebhookComponent implements OnInit {
  addWebhookDialogComponent = WebhookDialogComponent;

  columns = [
    {
      columnDef: "id",
      header: "Id",
      cell: (element: any) => `${element.id.slice(0, 7)}`,
    },
    {
      columnDef: "target",
      header: "Target",
      cell: (element: any) =>
        `<a href="/flows/library/${element.target}">${element.target.slice(
          0,
          7
        )}</a>`,
    },
    {
      columnDef: "tags",
      header: "Tags",
      cell: (element: any) => {
        if (element.tags && element.tags.length > 0) {
          return element.tags.map((tag) => tag.full_name).join(", ");
        }
        return "No tags";
      },
    },
  ];

  actions = [
    {
      icon: "content_copy",
      tooltip: "Copy Webhook Endpoint",
      callback: (item: any) => this.copyWebhookEndpoint(item.id),
    },
  ];

  constructor(
    public webhookservice: TriggerService,
    public tagService: TagService,
    private clipboard: Clipboard,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService
  ) {}

  ngOnInit(): void {}

  copyWebhookEndpoint(id: string): void {
    const endpoint = `${window.location.origin}/backend/triggers/webhook/${id}/execute/`;
    this.clipboard.copy(endpoint);
    this.toastNotificationService.dispatchNotification({
      message: "Copied Endpoint: " + endpoint,
      type: "success",
      duration: 3000,
    });
  }
}
