import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
} from "@angular/core";
import { Router } from "@angular/router";
import { FlowService } from "@app/core/services/flow.service";
import { MatDialog } from "@angular/material/dialog";
import { AddFlowDialogComponent } from "./add-flow-dialog.component";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { NestedTreeControl } from "@angular/cdk/tree";
import { Clipboard } from "@angular/cdk/clipboard";
import { AddPrefixDialogComponent } from "../prefix/add-prefix-dialog.component";
import { SearchService } from "@app/core/services/search.service";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { ToastNotificationService } from "@core/services/toast-notification.service";
import { NotificationMessage } from "@app/core/notification/notification.models";

interface FlowNode {
  name: string;
  id: string;
  parent: string | null;
  children: FlowNode[];
  flows?: any[];
  isLoaded?: boolean;
}

@Component({
  selector: "app-flow-list",
  templateUrl: "./flow-list.component.html",
  styleUrls: ["./flow-list.component.scss"],
})
export class FlowListComponent implements OnInit, AfterViewInit {
  selectedFlows: any[] = [];
  displayedColumns: string[] = [
    "id",
    "name",
    "description",
    "environment",
    "actions",
  ];
  dataSource = new MatTableDataSource<any>(this.selectedFlows);
  treeControl = new NestedTreeControl<FlowNode>((node) => node.children);
  flowTreeDataSource = new MatTreeNestedDataSource<FlowNode>();
  searchFilter: string = "name";
  searchQuery: string = "";
  selectedNode: FlowNode | null = null;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private flowService: FlowService,
    private searchService: SearchService,
    private toastNotificationService: ToastNotificationService,
    private router: Router,
    public dialog: MatDialog,
    private clipboard: Clipboard,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialFlows();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadInitialFlows(): void {
    this.flowService.fetchFlows().subscribe(
      (data) => {
        const rootNode: FlowNode = {
          id: "root",
          name: "Flows",
          parent: null,
          children: this.buildTree(data.tree, "root"),
          flows: data.items,
          isLoaded: true,
        };
        this.flowTreeDataSource.data = [rootNode];
        this.selectedFlows = data.items;
        this.dataSource.data = this.selectedFlows;
  
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
        console.error("Error loading initial flows:", error);
      }
    );
  }
  

  findNodeById(node: FlowNode, id: string): FlowNode | null {
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
  
  fetchChildFlows(node: FlowNode): void {
    if (node.isLoaded) {
      this.updateSelectedNode(node);
      return;
    }
  
    this.flowService.fetchFlowsByParent(node.id).subscribe(
      (data) => {
        node.children = this.buildTree(data.tree, node.id);
        node.flows = data.items;
        node.isLoaded = true;
  
        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error fetching child flows:", error);
      }
    );
  }
  

  toggleNode(node: FlowNode): void {
    if (this.treeControl.isExpanded(node)) {
      this.treeControl.collapse(node);
    } else {
      this.treeControl.expand(node);
    }

    if (!node.isLoaded && this.treeControl.isExpanded(node)) {
      this.fetchChildFlows(node);
    }

    this.updateSelectedNode(node);
  }

  updateSelectedNode(node: FlowNode): void {
    this.selectedNode = node;
    this.selectedFlows = node.flows || [];
    this.dataSource.data = this.selectedFlows;
    this.cdr.detectChanges();
  }

  refreshTreeData(): void {
    const data = this.flowTreeDataSource.data;
    this.flowTreeDataSource.data = null;
    this.flowTreeDataSource.data = data;
    this.cdr.detectChanges();
  }

  deleteFlow(flowId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "Confirm Deletion",
        message: "Are you sure you want to delete this flow?",
        ok: "Delete",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.flowService.deleteFlow(flowId).subscribe(
          () => {
            this.showNotification({
              message: "File deleted successfully",
              type: "success",
              duration: 3000,
            });
            this.refreshFlows(this.selectedNode);
          },
          () => {
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

  buildTree(nodes: any[], parentId: string | null = null): FlowNode[] {
    return nodes.map((node) => ({
      name: node.name,
      id: node.id,
      parent: parentId,
      children: [],
      flows: [],
      isLoaded: false,
    }));
  }  

  onNodeSelect(node: FlowNode): void {
    this.fetchChildFlows(node);
  }

  copyId(id: string) {
    this.clipboard.copy(id);
    alert("Copied ID: " + id);
  }

  openFlow(flowId: string): void {
    const url = this.router.serializeUrl(
      this.router.createUrlTree([`flows/library/${flowId}`])
    );
    window.open(url, '_blank');
  }

  duplicate_flow(flowId: string): void {
    this.flowService.duplicateFlow(flowId).subscribe(
      () => {
        this.loadInitialFlows();
      },
      (error) => {
        console.error("Error duplicating flow:", error);
      }
    );
  }

  openAddFlowDialog(): void {
    const dialogRef = this.dialog.open(AddFlowDialogComponent, {
      data: {
        selectedPrefix: this.selectedNode ? this.selectedNode.id : "root",
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.refreshFlows(this.selectedNode);
      }
    });
  }
  
  openEditFlowDialog(flow): void {
    const dialogRef = this.dialog.open(AddFlowDialogComponent, {
      data: {
        isEdit: true,
        flowId: flow.id,
        flowName: flow.name,
        selectedEnv: flow.lib,
        description: flow.description,
        selectedPrefix: flow.prefix,
        dagMetaData: flow.dag_meta_data
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.refreshFlows(this.selectedNode);
      }
    });
  }

  refreshFlows(node: FlowNode): void {
    if (!node) {
      return;
    }
  
    const isRoot = node.id === "root";
  
    const fetchFlowsObservable = isRoot
      ? this.flowService.fetchFlows()
      : this.flowService.fetchFlowsByParent(node.id);
  
    fetchFlowsObservable.subscribe(
      (data) => {
        node.children = this.buildTree(data.tree, isRoot ? "root" : node.id);
        node.flows = data.items;
        node.isLoaded = true;
  
        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error refreshing flows:", error);
      }
    );
  }  

  export_flow(event: Event, flowId: string): void {
    event.stopPropagation();
    window.open(`/backend/tasks/${flowId}/export_flow/`, "_blank");
  }

  filterNodes(): void {
    if (!this.searchQuery) {
      this.loadInitialFlows();
      return;
    }

    const query =
      this.searchFilter === "prefix"
        ? `prefix:${this.searchQuery}`
        : this.searchQuery;

    this.searchService.searchItems(query, "flows").subscribe(
      (results: any[]) => {
        const items = results.map((item) => ({
          ...item,
          id: item.id,
          name: item.name,
          description: item.description,
          environment: item.environment,
        }));

        const rootNode: FlowNode = {
          id: "search-root",
          name: "Search Results",
          parent: null,
          children: [],
          flows: items,
          isLoaded: true,
        };

        this.flowTreeDataSource.data = [rootNode];
        this.selectedFlows = items;
        this.dataSource.data = this.selectedFlows;
        this.treeControl.expand(rootNode);
        this.selectedNode = rootNode;
      },
      (error) => {
        console.error("Error searching flows:", error);
      }
    );
  }

  clearSearch(): void {
    this.searchQuery = "";
    this.flowTreeDataSource.data = [];
    this.loadInitialFlows();
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
              message: "Folder deleted successfully",
              type: "success",
              duration: 3000,
            });
            const parentNode = this.findNodeById(
              this.flowTreeDataSource.data[0],
              this.selectedNode.parent
            );  
            this.refreshFlows(parentNode);    
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
  
  openAddPrefixDialog(): void {
    const dialogRef = this.dialog.open(AddPrefixDialogComponent, {
      data: {
        prefix: {
          parent: this.selectedNode.id,
        },
        type: "flows",
        isEdit: false,
      },
    });
  
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const parentNode = this.findNodeById(
          this.flowTreeDataSource.data[0],
          result.parent
        );  
        this.refreshFlows(parentNode);
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
        type: "flows",
        isEdit: true,
      },
    });
  
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const parentNode = this.findNodeById(
          this.flowTreeDataSource.data[0],
          result.parent
        );  
        this.refreshFlows(parentNode);
      }
    });
  }
  
  filterTree(nodes: FlowNode[], query: string): FlowNode[] {
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
