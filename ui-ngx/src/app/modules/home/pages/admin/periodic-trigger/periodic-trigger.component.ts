import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { MatSort, Sort } from "@angular/material/sort";
import { PageEvent } from "@angular/material/paginator";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { NestedTreeControl } from "@angular/cdk/tree";
import { Clipboard } from "@angular/cdk/clipboard";
import { PeriodicTriggerDialogComponent } from "./dialog.component";
import {
  PeriodicTrigger,
  TriggerService,
} from "@app/core/services/trigger.service";

interface TagNode {
  name: string;
  id: string;
  children?: TagNode[];
  triggers?: PeriodicTrigger[];
}

@Component({
  selector: "app-periodic-trigger",
  templateUrl: "./periodic-trigger.component.html",
  styleUrls: ["./periodic-trigger.component.scss"],
})
export class PeriodicTriggerComponent implements OnInit {
  dataSource = new MatTableDataSource<PeriodicTrigger>();
  displayedColumns: string[] = ["id", "target", "task", "tags", "actions"];
  totalTriggers = 0;
  pageIndex = 0;
  pageSize = 10;

  @ViewChild(MatSort) sort: MatSort;

  treeControl = new NestedTreeControl<TagNode>((node) => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<TagNode>();
  filteredTreeDataSource = new MatTreeNestedDataSource<TagNode>();
  selectedTriggers: PeriodicTrigger[] = [];
  originalTreeData: TagNode[] = [];
  searchQuery: string = "";
  selectedNode: TagNode;

  constructor(
    private triggerService: TriggerService,
    private dialog: MatDialog,
    private clipboard: Clipboard
  ) { }

  ngOnInit(): void {
    this.loadTriggers();
  }

  loadTriggers(): void {
    this.triggerService.getPeriodicTriggers().subscribe(
      (data) => {
        const rootNodes = this.buildTree(data);
        this.tagTreeDataSource.data = rootNodes;
        this.filteredTreeDataSource.data = rootNodes;
        this.originalTreeData = rootNodes;
        this.dataSource.data = data;
        this.treeControl.expandDescendants(rootNodes[0]);
        this.totalTriggers = data.length;
        this.dataSource.sort = this.sort;

        if (this.selectedNode) {
          const node = this.findNodeById(rootNodes, this.selectedNode.id);
          if (node) {
            this.onNodeSelect(node);
          }
        }
      },
      (error) => {
        console.error("Error fetching periodic triggers: ", error);
      }
    );
  }

  buildTree(triggers: PeriodicTrigger[]): TagNode[] {
    const root: TagNode = {
      name: "Periodic Triggers",
      id: "root",
      children: [],
    };
    const nodeMap: { [key: string]: TagNode } = { "Periodic Triggers": root };

    triggers.forEach((trigger) => {
      if (trigger.tags.length === 0) {
        trigger.tags = [{ id: "untagged", full_name: "Periodic Triggers/Untagged", name: "untagged", parent: null }];
      }
      trigger.tags.forEach((tag) => {
        const path = tag.full_name.split("/");
        let currentNode = root;
        path.forEach((part, index) => {
          if (!nodeMap[part]) {
            const newNode: TagNode = { name: part, id: tag.id, children: [] };
            nodeMap[part] = newNode;
            if (index === path.length - 1) {
              newNode.triggers = [];
            }
            currentNode.children.push(newNode);
          }
          currentNode = nodeMap[part];
        });
        currentNode.triggers?.push(trigger);
      });
    });

    return [root];
  }

  hasChild = (_: number, node: TagNode) =>
    !!node.children && node.children.length > 0;

  copyId(id: string) {
    this.clipboard.copy(id);
    alert("Copied ID: " + id);
  }

  copyPeriodicTriggerEndpoint(id: string) {
    const endpoint = `${window.location.origin}/backend/triggers/periodic/${id}/execute/`;
    this.clipboard.copy(endpoint);
    alert("Endpoint " + endpoint);
  }

  onNodeSelect(node: TagNode): void {
    this.selectedNode = node;
    this.selectedTriggers = this.collectTriggers(node);
  }

  collectTriggers(node: TagNode): PeriodicTrigger[] {
    let triggers: PeriodicTrigger[] = [];
    if (node.triggers) {
      triggers = triggers.concat(node.triggers);
    }
    if (node.children) {
      for (const child of node.children) {
        triggers = triggers.concat(this.collectTriggers(child));
      }
    }
    return triggers;
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

  openAddPeriodicTriggerDialog(): void {
    const dialogRef = this.dialog.open(PeriodicTriggerDialogComponent, {
      width: "800px",
      data: {},
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadTriggers();
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

  filterNodes(query: string): void {
    this.searchQuery = query;
    if (!query) {
      this.filteredTreeDataSource.data = this.originalTreeData;
      this.treeControl.expandDescendants(this.originalTreeData[0]);
    } else {
      const filteredNodes = this.filterTree(
        this.originalTreeData,
        query.toLowerCase()
      );
      this.filteredTreeDataSource.data = filteredNodes;
      this.treeControl.expandDescendants(filteredNodes[0]);
    }
  }

  filterTree(nodes: TagNode[], query: string): TagNode[] {
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
