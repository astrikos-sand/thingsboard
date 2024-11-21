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
  flowId: string = "";
  isEdit: boolean = false;
  prefixes: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<AddFlowDialogComponent>,
    private flowService: FlowService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.selectedPrefix = data.selectedPrefix;
    if (data.flowId) {
      this.flowId = data.flowId;
      this.isEdit = true;
      this.flowName = data.flowName;
      this.selectedEnv = data.selectedEnv;
      this.description = data.description;
    }
  }

  ngOnInit(): void {
    this.loadEnvironments();

    if (this.isEdit) {
      this.loadPrefixes();
    }
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

  loadPrefixes() {
    this.flowService.getPrefixes("flows").subscribe((response: any) => {
      this.prefixes = response.tree.map((prefix: any) => prefix);
    });
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

  edit(): void {
    this.submitted = true;
    if (this.selectedEnv) {
      this.isLoading = true;
      const flowData = {
        lib: this.selectedEnv,
        name: this.flowName,
        description: this.description,
        prefix: this.selectedPrefix == 'root' ? null : this.selectedPrefix,
      };
      this.flowService.editFlow(this.flowId, flowData).subscribe(
        (newFlow) => {
          this.dialogRef.close();
        },
        (error) => {
          console.error("Error adding flow:", error);
          this.isLoading = false;
        }
      );
    }
  }
}
