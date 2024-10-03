import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { FlowService } from "@app/core/services/flow.service";

@Component({
  selector: "app-view-executions-dialog",
  templateUrl: "./view-executions-dialog.component.html",
  styleUrls: ["./view-executions-dialog.component.scss"],
})
export class ViewExecutionsDialogComponent implements OnInit {
  executions: any[] = [];
  isLoading = true;

  constructor(
    private flowService: FlowService,
    @Inject(MAT_DIALOG_DATA) public data: { flowId: string },
    public dialogRef: MatDialogRef<ViewExecutionsDialogComponent>
  ) {}

  ngOnInit(): void {
    const flowId = this.data.flowId;
    
    this.flowService.getExecutions(flowId).subscribe(
      (response) => {
        this.executions = response;
        this.isLoading = false;
      },
      (error) => {
        console.error("Error fetching executions:", error);
        this.isLoading = false;
      }
    );
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case "PENDING":
        return "orange";
      case "COMPLETED":
        return "green";
      case "FAILED":
        return "red";
      default:
        return "gray";
    }
  }
}
