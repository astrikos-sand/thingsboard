import { HttpClient } from "@angular/common/http";
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
  activeExecution: any = null;

  constructor(
    private flowService: FlowService,
    @Inject(MAT_DIALOG_DATA) public data: { flowId: string },
    public dialogRef: MatDialogRef<ViewExecutionsDialogComponent>,
    private http: HttpClient,
  ) { }

  executionTransform(execution) {
    let html_url = execution.html_logs || '#';
    let container_url = execution.container_logs || '#';
    let json_url = execution.json_logs || '#';

    if (!html_url.startsWith("http")) {
      html_url = "/backend" + html_url;
      container_url = "/backend" + container_url;
      json_url = "/backend" + json_url;
    }

    return {
      status: execution.status,
      timestamp: execution.timestamp,
      html_logs: html_url,
      container_logs: container_url,
      json_logs: json_url,
      id: execution.id,
    }
  }

  loadExecutions(): void {
    const flowId = this.data.flowId;

    this.flowService.getExecutions(flowId).subscribe(
      (executions) => {
        const temp = [];
        for (const execution of executions) {
          const transformedExecution = this.executionTransform(execution);
          temp.push(transformedExecution);
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

  getExecutionLog(execution: any): void {
    if (execution.json_logs != '/backend#')
      this.http.get(execution.json_logs).subscribe(response => {
        execution.data = response;
        this.activeExecution = execution;
        this.isLoading = false;
      }, (error) => {
        console.error("Error fetching execution logs:", error);
        this.isLoading = false;
      })
  }

  fetchNodeStatus(execution: any): void {
    this.isLoading = true;
    this.flowService.getExecutionDetails(execution.id).subscribe(
      (execution) => {
        const transformedExecution = this.executionTransform(execution);
        this.getExecutionLog(transformedExecution);
      },
      (error) => {
        console.error("Error fetching executions:", error);
        this.isLoading = false;
      }
    );
  }

  handleActiveExecutionChange(execution: any): void {
    this.activeExecution = execution;
    this.fetchNodeStatus(execution);
  }

  ngOnInit(): void {
    this.loadExecutions();
  }

  refreshExecutions(): void {
    if (this.activeExecution) {
      this.fetchNodeStatus(this.activeExecution);
    }
    else {
      this.isLoading = true;
      this.loadExecutions();
    }
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  backToExecutions(): void {
    this.activeExecution = null;
    this.isLoading = false;
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

  getNodeStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case "error":
        return "rgb(255, 195, 195)";
      case "success":
        return "lightgreen";
      case "running":
        return "rgb(229, 255, 113)";
      default:
        return "rgb(195, 197, 171)";
    }
  }

  getNodeIcon(node_type): string {
    switch (node_type) {
      case "FunctionNode":
        return "/assets/mlworkbench/code.svg";
      case "DataNode":
        return "/assets/mlworkbench/data.svg";
      case "FlowNode":
        return "/assets/mlworkbench/flow.svg";
      case "InputNode":
        return "/assets/mlworkbench/input.svg";
      case "OutputNode":
        return "/assets/mlworkbench/output.svg";
    }
  }
}
