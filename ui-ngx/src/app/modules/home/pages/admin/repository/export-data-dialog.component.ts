import { Component, OnInit, ChangeDetectorRef, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { RepositoryService } from "@app/core/services/repository.service";
import { SearchService } from "@app/core/services/search.service";

@Component({
  selector: "app-export-data-dialog",
  templateUrl: "./export-data-dialog.component.html",
})
export class ExportDataDialogComponent implements OnInit {
  exportDataForm: { name: string; description: string; flows: any[] } = {
    name: "",
    description: "",
    flows: [],
  };
  searchQuery: string = "";
  isLoading = false;

  constructor(
    public dialogRef: MatDialogRef<ExportDataDialogComponent>,
    private repositoryService: RepositoryService,
    private searchService: SearchService,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {}

  searchFlows(): void {
    if (this.searchQuery.trim().length === 0) {
      return;
    }

    this.isLoading = true;
    this.searchService.searchItems(`prefix:${this.searchQuery}`, "flows").subscribe(
      (results: any[]) => {
        results.forEach((flow) => {
          if (!this.exportDataForm.flows.some((f) => f.id === flow.id)) {
            this.exportDataForm.flows.push({
              id: flow.id,
              full_name: flow.full_name,
            });
          }
        });
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        console.error("Error searching flows:", error);
        this.isLoading = false;
      }
    );
  }

  removeFlowFromExport(flowId: string): void {
    this.exportDataForm.flows = this.exportDataForm.flows.filter(
      (flow) => flow.id !== flowId
    );
  }

  cancel(): void {
    this.dialogRef.close();
  }

  export(): void {
    if (!this.exportDataForm.name || !this.exportDataForm.flows.length) {
      alert("Name and at least one flow are required to export data.");
      return;
    }

    const payload = {
      name: this.exportDataForm.name,
      description: this.exportDataForm.description,
      flows: this.exportDataForm.flows.map((flow) => flow.id),
      prefix: this.data.selectedPrefix == "root" ? null : this.data.selectedPrefix,
    };

    this.isLoading = true;

    this.repositoryService.exportData(payload).subscribe(
      () => {
        this.isLoading = false;
        this.dialogRef.close(true);
      },
      (error) => {
        console.error("Error exporting data:", error);
        this.isLoading = false;
      }
    );
  }
}
