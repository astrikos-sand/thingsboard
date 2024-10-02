import { Component, OnInit, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FlowService } from "@app/core/services/flow.service";

@Component({
  selector: "app-add-flow-dialog",
  templateUrl: "./add-flow-dialog.component.html",
  styleUrls: ["./add-flow-dialog.component.scss"],
})
export class AddFlowDialogComponent implements OnInit {
  flowName: string = "";
  description: string = "";
  selectedEnv: string = "";
  submitted = false;
  isLoading = false;
  environments: any[] = [];
  selectedPrefix: string = "";

  constructor(
    public dialogRef: MatDialogRef<AddFlowDialogComponent>,
    private flowService: FlowService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.selectedPrefix = data.selectedPrefix;
  }

  ngOnInit(): void {
    this.loadEnvironments();
  }

  loadEnvironments(): void {
    this.flowService.getEnv().subscribe(
      (data: any[]) => {
        this.environments = data;
      },
      (error) => {
        console.error("Error loading environments:", error);
      }
    );
  }

  cancel(): void {
    this.dialogRef.close();
  }

  add(): void {
    this.submitted = true;
    if (this.flowName && this.description && this.selectedEnv) {
      this.isLoading = true;
      const flowData = {
        name: this.flowName,
        description: this.description,
        lib: this.selectedEnv,
        prefix: this.selectedPrefix == 'root' ? null : this.selectedPrefix,
      };
      this.flowService.addFlow(flowData).subscribe(
        (newFlow) => {
          this.dialogRef.close(newFlow);
        },
        (error) => {
          console.error("Error adding flow:", error);
          this.isLoading = false;
        }
      );
    }
  }
}
