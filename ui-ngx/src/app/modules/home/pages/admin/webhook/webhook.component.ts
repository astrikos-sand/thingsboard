import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { MatSort, Sort } from "@angular/material/sort";
import { PageEvent } from "@angular/material/paginator";
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { Clipboard } from '@angular/cdk/clipboard';
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { NotificationMessage } from "@app/core/notification/notification.models";
import { WebhookDialogComponent } from "./dialog.component";
import { Webhook, TriggerService } from "@app/core/services/trigger.service";

interface TagNode {
  name: string;
  id: string;
  children?: TagNode[];
  webhooks?: Webhook[];
}

@Component({
  selector: "app-webhook",
  templateUrl: "./webhook.component.html",
  styleUrls: ["./webhook.component.scss"],
})
export class WebhookComponent implements OnInit {
  dataSource = new MatTableDataSource<Webhook>();
  displayedColumns: string[] = ["id", "target", "tags", "actions"];
  totalWebhooks = 0;
  pageIndex = 0;
  pageSize = 10;

  @ViewChild(MatSort) sort: MatSort;

  treeControl = new NestedTreeControl<TagNode>(node => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<TagNode>();
  filteredTreeDataSource = new MatTreeNestedDataSource<TagNode>();
  selectedWebhooks: Webhook[] = [];
  originalTreeData: TagNode[] = [];
  searchQuery: string = '';
  selectedNode: TagNode;

  constructor(
    private webhookservice: TriggerService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService,
    private clipboard: Clipboard
  ) {}

  ngOnInit(): void {
    this.loadWebhooks();
  }

  loadWebhooks(): void {
    this.webhookservice.getWebhooks().subscribe(
      (data) => {
        const rootNodes = this.buildTree(data);
        this.tagTreeDataSource.data = rootNodes;
        this.filteredTreeDataSource.data = rootNodes;
        this.originalTreeData = rootNodes;
        this.dataSource.data = data;
        this.treeControl.expandDescendants(rootNodes[0]);
        this.totalWebhooks = data.length;
        this.dataSource.sort = this.sort;

        if (this.selectedNode) {
          console.log(this.selectedNode)
          const node = this.findNodeById(rootNodes, this.selectedNode.id);
          console.log(node)
          if (node) {
            this.onNodeSelect(node);
          }
        }
      },
      (error) => {
        console.error("Error fetching file archives: ", error);
      }
    );
  }

  buildTree(webhooks: Webhook[]): TagNode[] {
    const root: TagNode = { name: 'Webhooks', id: 'root', children: [] };
    const nodeMap: { [key: string]: TagNode } = { 'Webhooks': root };

    webhooks.forEach(webhook => {
      if (webhook.tags.length === 0) {
        webhook.tags = [{ id: 'untagged', full_name: 'Webhooks/Untagged' }];
      }
      webhook.tags.forEach(tag => {
        const path = tag.full_name.split('/');
        let currentNode = root;
        path.forEach((part, index) => {
          if (!nodeMap[part]) {
            const newNode: TagNode = { name: part, id: tag.id, children: [] };
            nodeMap[part] = newNode;
            if (index === path.length - 1) {
              newNode.webhooks = [];
            }
            currentNode.children.push(newNode);
          }
          currentNode = nodeMap[part];
        });
        currentNode.webhooks?.push(webhook);
      });
    });

    return [root];
  }

  hasChild = (_: number, node: TagNode) => !!node.children && node.children.length > 0;

  copyId(id: string) {
    this.clipboard.copy(id);
    alert('Copied ID: ' + id);
  }

  copyWebhookEndpoint(id: string) {
    const endpoint = `${window.location.origin}/backend/triggers/webhook/${id}/execute/`;
    this.clipboard.copy(endpoint);
    alert('Endpoint ' + endpoint);
  }

  onNodeSelect(node: TagNode): void {
    this.selectedNode = node;
    this.selectedWebhooks = this.collectWebhooks(node);
  }

  collectWebhooks(node: TagNode): Webhook[] {
    let files: Webhook[] = [];
    if (node.webhooks) {
      files = files.concat(node.webhooks);
    }
    if (node.children) {
      for (const child of node.children) {
        files = files.concat(this.collectWebhooks(child));
      }
    }
    return files;
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

  openAddWebhookDialog(): void {
    const dialogRef = this.dialog.open(WebhookDialogComponent, {
      width: "800px",
      data: {},
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadWebhooks();
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
        case "":
          return this.compare(a.target, b.target, isAsc);
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
  findNodeById(nodes: TagNode[], id: string): TagNode | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children) {
        const found = this.findNodeById(node.children, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }
}
