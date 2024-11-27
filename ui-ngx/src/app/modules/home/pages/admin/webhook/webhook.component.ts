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
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { NotificationMessage } from "@app/core/notification/notification.models";
import { WebhookDialogComponent } from "./dialog.component";
import {
  Webhook,
  TriggerService,
  WebhookData,
} from "@app/core/services/trigger.service";
import { SearchService } from "@app/core/services/search.service";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { AddPrefixDialogComponent } from "../prefix/add-prefix-dialog.component";
import { FlowService } from "@app/core/services/flow.service";

interface WebhookNode {
  name: string;
  id: string;
  parent: string | null;
  children?: WebhookNode[];
  webhooks?: Webhook[];
  isLoaded?: boolean;
}

@Component({
  selector: "app-webhook",
  templateUrl: "./webhook.component.html",
  styleUrls: ["./webhook.component.scss"],
})
export class WebhookComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<Webhook>();
  displayedColumns: string[] = ["id", "target", "tags", "actions"];
  searchFilter: string = "name";
  searchQuery: string = "";

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  treeControl = new NestedTreeControl<WebhookNode>((node) => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<WebhookNode>();
  selectedWebhooks: Webhook[] = [];
  selectedNode: WebhookNode | null = null;

  constructor(
    private webhookservice: TriggerService,
    private flowService: FlowService,
    private searchService: SearchService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService,
    private clipboard: Clipboard,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialWebhooks();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  loadInitialWebhooks(): void {
    this.webhookservice.getWebhooks().subscribe(
      (data: WebhookData) => {
        const rootNode: WebhookNode = {
          id: "root",
          name: "Webhooks",
          parent: null,
          children: this.buildTree(data.tree, "root"),
          webhooks: data.items,
          isLoaded: true,
        };
        this.tagTreeDataSource.data = [rootNode];
        this.selectedWebhooks = data.items;
        this.dataSource.data = this.selectedWebhooks;

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
        console.error("Error loading initial webhooks:", error);
      }
    );
  }

  findNodeById(node: WebhookNode, id: string): WebhookNode | null {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeById(child, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  fetchChildWebhooks(node: WebhookNode): void {
    if (node.isLoaded) {
      this.updateSelectedNode(node);
      return;
    }
    this.webhookservice.fetchWebhooksByParent(node.id).subscribe(
      (data: WebhookData) => {
        node.children = this.buildTree(data.tree, node.id);
        node.webhooks = data.items;
        node.isLoaded = true;

        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error fetching child webhooks:", error);
      }
    );
  }

  toggleNode(node: WebhookNode): void {
    if (this.treeControl.isExpanded(node)) {
      this.treeControl.collapse(node);
    } else {
      this.treeControl.expand(node);
    }

    if (!node.isLoaded && this.treeControl.isExpanded(node)) {
      this.fetchChildWebhooks(node);
    }

    this.updateSelectedNode(node);
  }

  updateSelectedNode(node: WebhookNode): void {
    this.selectedNode = node;
    this.selectedWebhooks = node.webhooks || [];
    this.dataSource.data = this.selectedWebhooks;
    this.cdr.detectChanges();
  }

  refreshTreeData(): void {
    const data = this.tagTreeDataSource.data;
    this.tagTreeDataSource.data = null;
    this.tagTreeDataSource.data = data;
    this.cdr.detectChanges();
  }

  buildTree(nodes: any[], parentId: string | null): WebhookNode[] {
    return nodes.map((node) => ({
      name: node.name,
      id: node.id,
      parent: parentId,
      children: [],
      webhooks: [],
      isLoaded: false,
    }));
  }

  filterNodes(): void {
    if (!this.searchQuery) {
      this.loadInitialWebhooks();
      return;
    }

    const query =
      this.searchFilter === "prefix"
        ? `prefix:${this.searchQuery}`
        : this.searchQuery;

    this.searchService.searchItems(query, "webhooks").subscribe(
      (results: Webhook[]) => {
        const rootNode: WebhookNode = {
          id: "search-root",
          name: "Search Results",
          parent: null,
          children: [],
          webhooks: results,
          isLoaded: true,
        };
        this.tagTreeDataSource.data = [rootNode];
        this.selectedWebhooks = results;
        this.dataSource.data = this.selectedWebhooks;
        this.treeControl.expand(rootNode);
        this.selectedNode = rootNode;
      },
      (error) => {
        console.error("Error searching webhooks:", error);
      }
    );
  }

  deleteWebhook(webhookId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "Confirm Deletion",
        message: "Are you sure you want to delete this webhook?",
        ok: "Delete",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.webhookservice.deleteWebhook(webhookId).subscribe(
          () => {
            this.showNotification({
              message: "webhook deleted successfully",
              type: "success",
              duration: 3000,
            });
            this.refreshWebhooks(this.selectedNode);
          },
          () => {
            this.showNotification({
              message: "Error deleting webhook",
              type: "error",
              duration: 3000,
            });
          }
        );
      }
    });
  }


  clearSearch(): void {
    this.searchQuery = "";
    this.tagTreeDataSource.data = [];
    this.loadInitialWebhooks();
  }

  copyId(id: string) {
    this.clipboard.copy(id);
    alert("Copied ID: " + id);
  }

  copyWebhookEndpoint(webhook): void {
    const endpoint = webhook.copy_command;
    this.clipboard.copy(endpoint);
  }

  openAddWebhookDialog(): void {
    const dialogRef = this.dialog.open(WebhookDialogComponent, {
      width: "800px",
      data: {
        selectedPrefix: this.selectedNode ? this.selectedNode.id : "root",
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.refreshWebhooks(this.selectedNode);
    });
  }

  openAddPrefixDialog(): void {
    const dialogRef = this.dialog.open(AddPrefixDialogComponent, {
      data: {
        prefix: {
          parent: this.selectedNode ? this.selectedNode.id : "root",
        },
        type: "webhooks",
        isEdit: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const parentNode = this.findNodeById(
          this.tagTreeDataSource.data[0],
          result.parent
        );
        this.refreshWebhooks(parentNode);
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
        type: "webhooks",
        isEdit: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const parentNode = this.findNodeById(
          this.tagTreeDataSource.data[0],
          result.parent
        );
        this.refreshWebhooks(parentNode);
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
              message: "Prefix deleted successfully",
              type: "success",
              duration: 3000,
            });
            const parentNode = this.findNodeById(
              this.tagTreeDataSource.data[0],
              this.selectedNode.parent
            );
            this.refreshWebhooks(parentNode);
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

  refreshWebhooks(node: WebhookNode): void {
    const isRoot = node.id === "root";

    const fetchWebhooksObservable = isRoot
      ? this.webhookservice.getWebhooks()
      : this.webhookservice.fetchWebhooksByParent(node.id);

    fetchWebhooksObservable.subscribe(
      (data: WebhookData) => {
        node.children = this.buildTree(data.tree, node.id);
        node.webhooks = data.items;
        node.isLoaded = true;

        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error refreshing webhooks:", error);
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
