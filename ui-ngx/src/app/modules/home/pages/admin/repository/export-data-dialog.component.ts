import { Component, OnInit, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { NestedTreeControl } from "@angular/cdk/tree";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { FlowService } from "@app/core/services/flow.service";
import { RepositoryService } from "@app/core/services/repository.service";
import { firstValueFrom } from 'rxjs';

interface FlowOrFolderNode {
  id: string;
  name: string;
  parent?: string | null;
  children: FlowOrFolderNode[];
  isFolder?: boolean;
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

  async ngOnInit(): Promise<void> {
    await this.loadFlowData();
  }

  private async loadFlowData(): Promise<void> {
    const allFlows = await firstValueFrom(this.flowService.fetchAllFlows());
    const rootNode: FlowOrFolderNode = {
      id: "root",
      name: "Flows",
      parent: null,
      children: [],
      isFolder: true,
    };

    const folders = new Map<string, FlowOrFolderNode>();
    const folderHierarchy = new Map<string, string[]>();

    allFlows.forEach(flow => {
      const pathParts = flow.full_name.split('/');
      pathParts.pop(); // Remove the flow name itself

      let currentPath = '';
      pathParts.forEach((part, index) => {
        const parentPath = index === 0 ? 'root' : pathParts.slice(0, index).join('/');
        currentPath = index === 0 ? part : `${currentPath}/${part}`;

        if (!folders.has(currentPath)) {
          const folderNode: FlowOrFolderNode = {
            id: flow.prefix || currentPath,
            name: part,
            parent: parentPath,
            children: [],
            isFolder: true,
          };
          folders.set(currentPath, folderNode);

          const parentChildren = folderHierarchy.get(parentPath) || [];
          parentChildren.push(currentPath);
          folderHierarchy.set(parentPath, parentChildren);
        }
      });
    });

    folderHierarchy.forEach((children, parentPath) => {
      const parentNode = parentPath === 'root' ? rootNode : folders.get(parentPath);
      if (parentNode) {
        children.forEach(childPath => {
          const childNode = folders.get(childPath);
          if (childNode) {
            parentNode.children.push(childNode);
          }
        });
      }
    });

    allFlows.forEach(flow => {
      const pathParts = flow.full_name.split('/');
      const flowName = pathParts.pop();
      const parentPath = pathParts.join('/');
      const parentNode = parentPath ? folders.get(parentPath) : rootNode;

      if (parentNode) {
        parentNode.children.push({
          id: flow.id,
          name: flowName || flow.name,
          parent: flow.prefix || parentPath,
          children: [],
          isFolder: false,
        });
      }
    });

    this.flowTreeDataSource.data = [rootNode];
  }

  hasChild = (_: number, node: FlowOrFolderNode) => node.isFolder && node.children.length > 0;

  toggleSelection(node: FlowOrFolderNode): void {
    const isCurrentlySelected = this.isSelected(node);
    if (node.isFolder) {
      this.updateChildSelection(node, !isCurrentlySelected);
    } else {
      if (isCurrentlySelected) {
        this.selectedFlows.delete(node.id);
      } else {
        this.selectedFlows.add(node.id);
      }
    }
  }

  private updateChildSelection(node: FlowOrFolderNode, select: boolean): void {
    if (!node.isFolder) {
      if (select) {
        this.selectedFlows.add(node.id);
      } else {
        this.selectedFlows.delete(node.id);
      }
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

  export(): void {
    if (!this.exportDataForm.name || this.selectedFlows.size === 0) {
      alert("Name and at least one flow selection are required.");
      return;
    }

    const payload = {
      name: this.exportDataForm.name,
      description: this.exportDataForm.description,
      flows: Array.from(this.selectedFlows),
    };

    this.repositoryService.exportData(payload).subscribe(
      () => {
        this.dialogRef.close(true);
      },
      (error) => console.error("Error exporting data:", error)
    );
  }
}