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
  dagConfig: string = ""; // For storing JSON representing DAG config
  is_valid_json: boolean = true;

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
      this.dagConfig = data.dagMetaData?.config
        ? JSON.stringify(data.dagMetaData.config, null, 2)
        : "{}";
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

  isValidJson(json: string): boolean {
    try {
      JSON.parse(json);
      return true;
    } catch (e) {
      return false;
    }
  }

  loadPrefixes(): void {
    this.flowService.getPrefixes("flows").subscribe((response: any) => {
      this.prefixes = response.tree.map((prefix: any) => prefix);
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  add(): void {
    if (this.dagConfig !== "" && !this.isValidJson(this.dagConfig)) {
      this.is_valid_json = false;
      return;
    }
    this.is_valid_json = true;
    this.submitted = true;
    if (this.flowName && this.description && this.selectedEnv) {
      this.isLoading = true;
      const flowData = {
        name: this.flowName,
        description: this.description,
        lib: this.selectedEnv,
        prefix: this.selectedPrefix === "root" ? null : this.selectedPrefix,
        dag_meta_data: {
          config: JSON.parse(this.dagConfig || "{}"),
        },
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
    if (this.dagConfig !== "" && !this.isValidJson(this.dagConfig)) {
      this.is_valid_json = false;
      return;
    }
    this.is_valid_json = true;
    this.submitted = true;
    if (this.selectedEnv) {
      this.isLoading = true;
      const flowData = {
        lib: this.selectedEnv,
        name: this.flowName,
        description: this.description,
        prefix: this.selectedPrefix === "root" ? null : this.selectedPrefix,
        dag_meta_data: {
          config: JSON.parse(this.dagConfig || "{}"),
        },
      };
      this.flowService.editFlow(this.flowId, flowData).subscribe(
        () => {
          this.dialogRef.close(flowData);
        },
        (error) => {
          console.error("Error editing flow:", error);
          this.isLoading = false;
        }
      );
    }
  }
}
