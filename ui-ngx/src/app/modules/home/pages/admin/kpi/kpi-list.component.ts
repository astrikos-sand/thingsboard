import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { KpiService } from "@app/core/services/kpi.service";
import { SearchService } from "@app/core/services/search.service";
import { FlowService } from "@app/core/services/flow.service";
import { NotificationMessage } from "@app/core/notification/notification.models";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { NestedTreeControl } from "@angular/cdk/tree";
import { Clipboard } from "@angular/cdk/clipboard";
import { AddKpiDialogComponent } from "./add-kpi-dialog.component";
import { ConfirmDialogComponent } from "@app/shared/components/dialog/confirm-dialog.component";
import { AddPrefixDialogComponent } from "../prefix/add-prefix-dialog.component";
import { ToastNotificationService } from "@core/services/toast-notification.service";

interface KpiNode {
  name: string;
  id: string;
  parent: string | null;
  children: KpiNode[];
  kpis?: any[];
  isLoaded?: boolean;
}

@Component({
  selector: "app-kpi-list",
  templateUrl: "./kpi-list.component.html",
  styleUrls: ["./kpi-list.component.scss"],
})
export class KpiListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ["name", "description", "period", "actions"];
  dataSource = new MatTableDataSource<any>([]);
  treeControl = new NestedTreeControl<KpiNode>((node) => node.children);
  kpiTreeDataSource = new MatTreeNestedDataSource<KpiNode>();
  searchFilter: string = "name";
  searchQuery: string = "";
  selectedNode: KpiNode | null = null;

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private kpiService: KpiService,
    private flowService: FlowService,
    private searchService: SearchService,
    private toastNotificationService: ToastNotificationService,
    public dialog: MatDialog,
    private clipboard: Clipboard,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialKpis();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadInitialKpis(): void {
    this.kpiService.fetchKpis().subscribe(
      (data) => {
        const rootNode: KpiNode = {
          id: "root",
          name: "KPIs",
          parent: null,
          children: this.buildTree(data.tree, "root"),
          kpis: data.items,
          isLoaded: true,
        };
        this.kpiTreeDataSource.data = [rootNode];
        this.updateSelectedNode(rootNode);
        this.treeControl.expand(rootNode);
      },
      (error) => {
        console.error("Error loading initial KPIs:", error);
        this.showNotification({
          message: "Failed to load KPIs.",
          type: "error",
          duration: 3000,
        });
      }
    );
  }

  buildTree(nodes: any[], parentId: string | null = null): KpiNode[] {
    return nodes.map((node) => ({
      name: node.name,
      id: node.id,
      parent: parentId,
      children: [],
      kpis: [],
      isLoaded: false,
    }));
  }

  toggleNode(node: KpiNode): void {
    if (this.treeControl.isExpanded(node)) {
      this.treeControl.collapse(node);
    } else {
      this.treeControl.expand(node);
    }

    if (!node.isLoaded && this.treeControl.isExpanded(node)) {
      this.fetchChildKpis(node);
    }

    this.updateSelectedNode(node);
  }

  fetchChildKpis(node: KpiNode): void {
    this.kpiService.fetchKpis(node.id).subscribe(
      (data) => {
        node.children = this.buildTree(data.tree, node.id);
        node.kpis = data.items;
        node.isLoaded = true;

        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error fetching child KPIs:", error);
        this.showNotification({
          message: "Failed to load child KPIs.",
          type: "error",
          duration: 3000,
        });
      }
    );
  }

  updateSelectedNode(node: KpiNode): void {
    this.selectedNode = node;
    this.dataSource.data = node.kpis || [];
    this.cdr.detectChanges();
  }

  refreshTreeData(): void {
    const data = this.kpiTreeDataSource.data;
    this.kpiTreeDataSource.data = null;
    this.kpiTreeDataSource.data = data;
    this.cdr.detectChanges();
  }

  filterNodes(): void {
    if (!this.searchQuery) {
      this.loadInitialKpis();
      return;
    }

    const query =
      this.searchFilter === "prefix"
        ? `prefix:${this.searchQuery}`
        : this.searchQuery;

    this.searchService.searchItems(query, "kpi").subscribe(
      (results) => {
        const searchRoot: KpiNode = {
          id: "search-root",
          name: "Search Results",
          parent: null,
          children: [],
          kpis: results,
          isLoaded: true,
        };

        this.kpiTreeDataSource.data = [searchRoot];
        this.dataSource.data = results;
        this.treeControl.expand(searchRoot);
        this.selectedNode = searchRoot;
      },
      (error) => {
        console.error("Error searching KPIs:", error);
        this.showNotification({
          message: "Failed to search KPIs.",
          type: "error",
          duration: 3000,
        });
      }
    );
  }

  clearSearch(): void {
    this.searchQuery = "";
    this.loadInitialKpis();
  }

  highlightText(text: string, query: string): string {
    if (!query) {
      return text;
    }
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  copyKpiId(kpiId: string): void {
    this.clipboard.copy(kpiId);
    this.showNotification({
      message: `Copied ID: ${kpiId}`,
      type: "success",
      duration: 3000,
    });
  }

  openAddKpiDialog(): void {
    const dialogRef = this.dialog.open(AddKpiDialogComponent, {
      data: {
        kpi: { prefix: this.selectedNode ? this.selectedNode.id : "root" },
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.refreshKpis(this.selectedNode);
      }
    });
  }

  openEditKpiDialog(kpi: any): void {
    const dialogRef = this.dialog.open(AddKpiDialogComponent, {
      data: {
        kpi,
        isEdit: true,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.refreshKpis(this.selectedNode);
      }
    });
  }

  deleteKpi(kpiId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: "Confirm Deletion",
        message: "Are you sure you want to delete this KPI?",
        ok: "Delete",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.kpiService.deleteKpi(kpiId).subscribe(
          () => {
            this.showNotification({
              message: "KPI deleted successfully",
              type: "success",
              duration: 3000,
            });
            this.refreshKpis(this.selectedNode);
          },
          (error) => {
            this.showNotification({
              message: error.error?.error || "Error deleting KPI",
              type: "error",
              duration: 3000,
            });
            console.error("Error deleting KPI:", error);
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
        type: "kpi",
        isEdit: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const parentNode = this.findNodeById(
          this.kpiTreeDataSource.data[0],
          result.parent
        );
        this.refreshKpis(parentNode);
      }
    });
  }

  openEditPrefixDialog(): void {
    if (!this.selectedNode || this.selectedNode.id === "root") {
      this.showNotification({
        message: "No prefix selected for editing.",
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
        type: "kpi",
        isEdit: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const parentNode = this.findNodeById(
          this.kpiTreeDataSource.data[0],
          result.parent
        );
        this.refreshKpis(parentNode);
      }
    });
  }

  deletePrefix(): void {
    if (!this.selectedNode || this.selectedNode.id === "root") {
      this.showNotification({
        message: "No prefix selected for deletion.",
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
              message: "Prefix deleted successfully.",
              type: "success",
              duration: 3000,
            });
            const parentNode = this.findNodeById(
              this.kpiTreeDataSource.data[0],
              this.selectedNode.parent
            );
            this.refreshKpis(parentNode);
          },
          (error) => {
            this.showNotification({
              message: error.error?.error || "Error deleting prefix.",
              type: "error",
              duration: 3000,
            });
            console.error("Error deleting prefix:", error);
          }
        );
      }
    });
  }

  refreshKpis(node: KpiNode | null): void {
    if (!node) {
      return;
    }

    const isRoot = node.id === "root";

    const fetchKpisObservable = isRoot
      ? this.kpiService.fetchKpis()
      : this.kpiService.fetchKpis(node.id);

    fetchKpisObservable.subscribe(
      (data) => {
        node.children = this.buildTree(data.tree, isRoot ? "root" : node.id);
        node.kpis = data.items;
        node.isLoaded = true;

        this.updateSelectedNode(node);
        this.refreshTreeData();
      },
      (error) => {
        console.error("Error refreshing KPIs:", error);
        this.showNotification({
          message: "Failed to refresh KPIs.",
          type: "error",
          duration: 3000,
        });
      }
    );
  }

  findNodeById(node: KpiNode, id: string): KpiNode | null {
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

  private showNotification(notification: NotificationMessage): void {
    this.toastNotificationService.dispatchNotification(notification);
  }
}
