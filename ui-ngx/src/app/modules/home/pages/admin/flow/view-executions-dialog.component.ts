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

  loadExecutions(): void {
    const flowId = this.data.flowId;

    this.flowService.getExecutions(flowId).subscribe(
      (executions) => {
        const temp = [];
        for (const execution of executions) {
          let html_url = execution.html_logs || '#';
          let container_url = execution.container_logs || '#';
          let json_url = execution.json_logs || '#';

          if (!html_url.startsWith("http")) {
            html_url = "/backend" + html_url;
            container_url = "/backend" + container_url;
            json_url = "/backend" + json_url;
          }

          temp.push({
            status: execution.status,
            timestamp: execution.timestamp,
            html_logs: html_url,
            container_logs: container_url,
            json_logs: json_url,
          });
        }
        this.executions = temp;
        this.isLoading = false;
      },
      (error) => {
        console.error("Error fetching executions:", error);
        this.isLoading = false;
      }
    );
  }

  ngOnInit(): void {
    this.loadExecutions();    
  }

  refreshExecutions(): void {
    this.isLoading = true;
    this.loadExecutions();
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
