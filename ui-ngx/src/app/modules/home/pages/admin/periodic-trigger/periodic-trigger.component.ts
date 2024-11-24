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
import { PeriodicTriggerDialogComponent } from "./dialog.component";
import {
  PeriodicTrigger,
  TriggerService,
  PeriodicTriggerData,
} from "@app/core/services/trigger.service";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { SearchService } from "@app/core/services/search.service";
import { AddPrefixDialogComponent } from "../prefix/add-prefix-dialog.component";
import { FlowService } from "@app/core/services/flow.service";

interface PeriodicTriggerNode {
  name: string;
  id: string;
  parent: string | null;
  children?: PeriodicTriggerNode[];
  triggers?: PeriodicTrigger[];
  isLoaded?: boolean;
}

@Component({
  selector: "app-periodic-trigger",
  templateUrl: "./periodic-trigger.component.html",
  styleUrls: ["./periodic-trigger.component.scss"],
})
export class PeriodicTriggerComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<PeriodicTrigger>();
  displayedColumns: string[] = ["id", "target", "task", "tags", "actions"];
  searchFilter: string = "name";
  searchQuery: string = "";

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  treeControl = new NestedTreeControl<PeriodicTriggerNode>((node) => node.children);
  triggerTreeDataSource = new MatTreeNestedDataSource<PeriodicTriggerNode>();
  selectedTriggers: PeriodicTrigger[] = [];
  selectedNode: PeriodicTriggerNode | null = null;

  constructor(
    private triggerService: TriggerService,
    private flowService: FlowService,
    private searchService: SearchService,
    private dialog: MatDialog,
    private toastNotificationService: ToastNotificationService,
    private clipboard: Clipboard,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialTriggers();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  loadInitialTriggers(): void {
    this.triggerService.getPeriodicTriggers().subscribe(
      (data: PeriodicTriggerData) => {
        const rootNode: PeriodicTriggerNode = {
          id: "root",
          name: "Periodic Triggers",
          parent: null,
          children: this.buildTree(data.tree, "root"),
          triggers: data.items,
          isLoaded: true,
        };
        this.triggerTreeDataSource.data = [rootNode];
        this.selectedTriggers = data.items;
        this.dataSource.data = this.selectedTriggers;

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
        console.error("Error loading initial triggers:", error);
      }
    );
  }

  findNodeById(node: PeriodicTriggerNode, id: string): PeriodicTriggerNode | null {
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

  fetchChildTriggers(node: PeriodicTriggerNode): void {
    if (node.isLoaded) {
      this.updateSelectedNode(node);
      return;
    }
    this.triggerService.fetchTriggersByParent(node.id).subscribe(
      (data: PeriodicTriggerData) => {
        node.children = this.buildTree(data.tree, node.id);
        node.triggers = data.items;
        node.isLoaded = true;

        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error fetching child triggers:", error);
      }
    );
  }

  toggleNode(node: PeriodicTriggerNode): void {
    if (this.treeControl.isExpanded(node)) {
      this.treeControl.collapse(node);
    } else {
      this.treeControl.expand(node);
    }

    if (!node.isLoaded && this.treeControl.isExpanded(node)) {
      this.fetchChildTriggers(node);
    }

    this.updateSelectedNode(node);
  }

  updateSelectedNode(node: PeriodicTriggerNode): void {
    this.selectedNode = node;
    this.selectedTriggers = node.triggers || [];
    this.dataSource.data = this.selectedTriggers;
    this.cdr.detectChanges();
  }

  refreshTreeData(): void {
    const data = this.triggerTreeDataSource.data;
    this.triggerTreeDataSource.data = null;
    this.triggerTreeDataSource.data = data;
    this.cdr.detectChanges();
  }

  buildTree(nodes: any[], parentId: string | null): PeriodicTriggerNode[] {
    return nodes.map((node) => ({
      name: node.name,
      id: node.id,
      parent: parentId,
      children: [],
      triggers: [],
      isLoaded: false,
    }));
  }

  filterNodes(): void {
    if (!this.searchQuery) {
      this.loadInitialTriggers();
      return;
    }

    const query =
      this.searchFilter === "prefix"
        ? `prefix:${this.searchQuery}`
        : this.searchQuery;

      this.searchService.searchItems(query, "periodic").subscribe(
        (results: any[]) => {
          
        const rootNode: PeriodicTriggerNode = {
          id: "search-root",
          name: "Search Results",
          children: [],
          triggers: results,
          parent: null,
          isLoaded: true,
        };
        this.triggerTreeDataSource.data = [rootNode];
        this.selectedTriggers = results;
        this.dataSource.data = this.selectedTriggers;
        this.treeControl.expand(rootNode);
        this.selectedNode = rootNode;
      },
      (error) => {
        console.error("Error searching periodic triggers:", error);
      }
    );
  }

  clearSearch(): void {
    this.searchQuery = "";
    this.triggerTreeDataSource.data = [];
    this.loadInitialTriggers();
  }

  copyId(id: string) {
    this.clipboard.copy(id);
    alert("Copied ID: " + id);
  }

  copyPeriodicTriggerEndpoint(id: string) {
    const endpoint = `${window.location.origin}/backend/triggers/periodic/${id}/execute/`;
    this.clipboard.copy(endpoint);
    alert("Endpoint " + endpoint);
  }

  openAddPeriodicTriggerDialog(): void {
    const dialogRef = this.dialog.open(PeriodicTriggerDialogComponent, {
      width: "800px",
      data: {
        selectedPrefix: this.selectedNode ? this.selectedNode.id : "root",
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.refreshTriggers(this.selectedNode);
    });
  }


  openAddPrefixDialog(): void {
    const dialogRef = this.dialog.open(AddPrefixDialogComponent, {
      data: {
        prefix: {
          parent: this.selectedNode.id,
        },
        type: "periodic",
        isEdit: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const parentNode = this.findNodeById(
          this.triggerTreeDataSource.data[0],
          result.parent
        );
        this.refreshTriggers(parentNode);
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
        type: "periodic",
        isEdit: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const parentNode = this.findNodeById(
          this.triggerTreeDataSource.data[0],
          result.parent
        );
        this.refreshTriggers(parentNode);
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
              this.triggerTreeDataSource.data[0],
              this.selectedNode.parent
            );
            this.refreshTriggers(parentNode);
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
  
  refreshTriggers(node: PeriodicTriggerNode): void {
    const isRoot = node.id === "root";

    const fetchFunctionsObservable = isRoot
      ? this.triggerService.getPeriodicTriggers()
      : this.triggerService.fetchTriggersByParent(node.id);

    fetchFunctionsObservable.subscribe(
      (data: PeriodicTriggerData) => {
        node.children = this.buildTree(data.tree, node.id);
        node.triggers = data.items;
        node.isLoaded = true;

        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error refreshing triggers:", error);
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
