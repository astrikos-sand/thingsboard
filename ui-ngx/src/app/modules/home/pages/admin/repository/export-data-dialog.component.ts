import { Component, OnInit, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { NestedTreeControl } from "@angular/cdk/tree";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { FlowService } from "@app/core/services/flow.service";
import { RepositoryService } from "@app/core/services/repository.service";

interface FlowOrFolderNode {
  id: string;
  name: string;
  parent?: string | null;
  children: FlowOrFolderNode[];
  isFolder?: boolean;
  isLoaded?: boolean;
}

@Component({
  selector: "app-export-data-dialog",
  templateUrl: "./export-data-dialog.component.html",
  styleUrls: ["./export-data-dialog.component.scss"],
})
export class ExportDataDialogComponent implements OnInit {
  exportDataForm = {
    name: "",
    description: "",
    flows: [],
  };

  treeControl = new NestedTreeControl<FlowOrFolderNode>((node) => node.children);
  flowTreeDataSource = new MatTreeNestedDataSource<FlowOrFolderNode>();
  selectedFlows = new Set<string>();
  selectedNode: FlowOrFolderNode | null = null;

  constructor(
    public dialogRef: MatDialogRef<ExportDataDialogComponent>,
    private repositoryService: RepositoryService,
    private flowService: FlowService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.loadInitialFlows();
  }

  loadInitialFlows(): void {
    this.flowService.fetchFlows().subscribe((data) => {
      const rootNode: FlowOrFolderNode = {
        id: "root",
        name: "Flows",
        parent: null,
        children: [],
        isFolder: true,
        isLoaded: true,
      };
      const subfolders = this.buildFolderNodes(data.tree, "root");
      const flowChildren = (data.items || []).map((flow) => ({
        id: flow.id,
        name: flow.name,
        parent: "root",
        children: [],
        isFolder: false,
        isLoaded: true,
      }));
      rootNode.children = [...subfolders, ...flowChildren];
      this.flowTreeDataSource.data = [rootNode];
      this.treeControl.expand(rootNode);
    });
  }

  private buildFolderNodes(nodes: any[], parentId: string | null = null): FlowOrFolderNode[] {
    return nodes.map((node) => ({
      id: node.id,
      name: node.name,
      parent: parentId,
      children: [],
      isFolder: true,
      isLoaded: false,
    }));
  }

  hasChild = (_: number, node: FlowOrFolderNode) =>
    node.isFolder && (!node.isLoaded || node.children.length > 0);

  async maybeFetchChildren(node: FlowOrFolderNode): Promise<void> {
    if (!node.isFolder) return;
    if (!this.treeControl.isExpanded(node)) return;
    if (!node.isLoaded) {
      await this.fetchChildFlows(node);
    }
  }

  private fetchChildFlows(node: FlowOrFolderNode): Promise<void> {
    if (!node.isFolder || node.isLoaded) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.flowService.fetchFlowsByParent(node.id).subscribe(
        (data) => {
          const subfolders = this.buildFolderNodes(data.tree, node.id);
          const flowChildren = (data.items || []).map((flow) => ({
            id: flow.id,
            name: flow.name,
            parent: node.id,
            children: [],
            isFolder: false,
            isLoaded: true,
          }));
          node.children = [...subfolders, ...flowChildren];
          node.isLoaded = true;
          this.refreshTreeData();
          resolve();
        },
        (err) => reject(err)
      );
    });
  }

  private refreshTreeData(): void {
    const data = this.flowTreeDataSource.data;
    this.flowTreeDataSource.data = [];
    this.flowTreeDataSource.data = data;
  }

  async toggleSelection(node: FlowOrFolderNode): Promise<void> {
    const isCurrentlySelected = this.isSelected(node);
    if (node.isFolder) {
      if (!isCurrentlySelected) {
        this.treeControl.expand(node);
        await this.fetchChildFlows(node);
        this.updateChildSelection(node, true);
      } else {
        this.updateChildSelection(node, false);
        this.treeControl.collapse(node);
      }
    } else {
      if (isCurrentlySelected) {
        this.selectedFlows.delete(node.id);
      } else {
        this.selectedFlows.add(node.id);
      }
    }
  }

  private updateChildSelection(node: FlowOrFolderNode, select: boolean): void {
    if (select) {
      this.selectedFlows.add(node.id);
    } else {
      this.selectedFlows.delete(node.id);
    }
    node.children.forEach((child) => {
      this.updateChildSelection(child, select);
    });
  }

  isSelected(node: FlowOrFolderNode): boolean {
    if (node.isFolder && node.children.length > 0) {
      return node.children.every((child) => this.isSelected(child));
    }
    return this.selectedFlows.has(node.id);
  }

  isIndeterminate(node: FlowOrFolderNode): boolean {
    if (!node.isFolder || node.children.length === 0) return false;
    const childStates = node.children.map((child) => this.isSelected(child));
    const anySelected = childStates.some((x) => x);
    const allSelected = childStates.every((x) => x);
    return anySelected && !allSelected;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  async export(): Promise<void> {
    if (!this.exportDataForm.name || this.selectedFlows.size === 0) {
      alert("Name and at least one flow selection are required.");
      return;
    }
    await this.loadAllSelectedFolders(this.flowTreeDataSource.data[0]);
    const flowIDs = this.collectFlowIDs(this.flowTreeDataSource.data[0]);
    const payload = {
      name: this.exportDataForm.name,
      description: this.exportDataForm.description,
      flows: flowIDs,
    };
    this.repositoryService.exportData(payload).subscribe(
      () => {
        this.dialogRef.close(true);
      },
      (error) => console.error("Error exporting data:", error)
    );
  }

  private async loadAllSelectedFolders(node: FlowOrFolderNode): Promise<void> {
    if (node.isFolder && this.isSelected(node) && !node.isLoaded) {
      await this.fetchChildFlows(node);
    }
    for (const child of node.children) {
      await this.loadAllSelectedFolders(child);
    }
  }

  private collectFlowIDs(node: FlowOrFolderNode): string[] {
    if (!node.isFolder && this.isSelected(node)) {
      return [node.id];
    }
    if (node.isFolder && this.isSelected(node)) {
      return node.children.flatMap((child) => this.collectFlowIDs(child));
    }
    return node.children.flatMap((child) => this.collectFlowIDs(child));
  }
}
