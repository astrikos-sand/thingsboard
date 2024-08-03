import { Component, Input, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { MatSort, Sort } from "@angular/material/sort";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { NestedTreeControl } from "@angular/cdk/tree";
import { Clipboard } from "@angular/cdk/clipboard";
import { PageEvent } from "@angular/material/paginator";

interface TagNode {
  name: string;
  id: string;
  children?: TagNode[];
  items?: any[];
}

interface TableAction {
  icon: string;
  tooltip: string;
  callback: (item: any, event?: Event) => void;
}

interface ColumnDefinition {
  columnDef: string;
  header: string;
  cell: (element: any) => string;
}

@Component({
  selector: "app-tree-table",
  templateUrl: "./tree-table.component.html",
  styleUrls: ["./tree-table.component.scss"],
})
export class TreeTableComponent implements OnInit {
  @Input() toolbarTitle: string;
  @Input() addButtonLabel: string;
  @Input() displayedColumns: ColumnDefinition[];
  @Input() tagService: any;
  @Input() itemService: any;
  @Input() dialogComponent: any;
  @Input() actions: TableAction[];

  dataSource = new MatTableDataSource<any>();
  totalItems = 0;
  pageIndex = 0;
  pageSize = 10;
  treeControl = new NestedTreeControl<TagNode>((node) => node.children);
  tagTreeDataSource = new MatTreeNestedDataSource<TagNode>();
  filteredTreeDataSource = new MatTreeNestedDataSource<TagNode>();
  selectedItems: any[] = [];
  originalTreeData: TagNode[] = [];
  searchQuery: string = "";
  selectedNode: TagNode;
  allColumns: string[] = [];

  @ViewChild(MatSort) sort: MatSort;

  constructor(private dialog: MatDialog, private clipboard: Clipboard) {}

  ngOnInit(): void {
    this.loadTagsAndItems();
    this.allColumns = this.displayedColumns
      .map((c) => c.columnDef)
      .concat("actions");
  }

  loadTagsAndItems(): void {
    this.tagService.getAllChildrenByName(this.toolbarTitle).subscribe(
      (rootTag) => {
        const rootNodes = this.buildTree([rootTag]);
        this.tagTreeDataSource.data = rootNodes;
        this.filteredTreeDataSource.data = rootNodes;
        this.originalTreeData = rootNodes;
        this.treeControl.expandDescendants(rootNodes[0]);
      },
      (error) => {
        console.error("Error fetching tags: ", error);
      }
    );
  }

  buildTree(tags: any[]): TagNode[] {
    const buildNode = (tag: any): TagNode => {
      return {
        id: tag.id,
        name: tag.name,
        children: tag.children ? tag.children.map(buildNode) : [],
      };
    };

    return tags.map(buildNode);
  }

  hasChild = (_: number, node: TagNode) =>
    !!node.children && node.children.length > 0;

  copyId(id: string) {
    this.clipboard.copy(id);
    alert("Copied ID: " + id);
  }

  onNodeSelect(node: TagNode): void {
    this.selectedNode = node;
    this.tagService.getItemsByTagId(node.id).subscribe(
      (items) => {
        this.selectedItems = items;
        this.dataSource.data = items;
      },
      (error) => {
        console.error("Error fetching items by tag: ", error);
      }
    );
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

  openAddDialog(): void {
    const dialogRef = this.dialog.open(this.dialogComponent, {
      width: "auto",
      data: {
        parentTag: this.selectedNode.id,
        parentTagName: this.selectedNode.name,
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadTagsAndItems();
      this.refreshDataForSelectedNode();
    });
  }

  public refreshDataForSelectedNode(): void {
    if (this.selectedNode) {
      this.tagService.getItemsByTagId(this.selectedNode.id).subscribe(
        (items) => {
          this.selectedItems = items;
          this.dataSource.data = items;
        },
        (error) => {
          console.error("Error fetching items by tag: ", error);
        }
      );
    }
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
        case "name":
          return this.compare(a.name, b.name, isAsc);
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
}
