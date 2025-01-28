import { Component, OnInit, Inject, ViewChild } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { KpiService } from "@app/core/services/kpi.service";
import {
  MonacoEditorComponent,
  MonacoEditorConstructionOptions,
} from "@materia-ui/ngx-monaco-editor";
import { FlowService } from "@app/core/services/flow.service";
import { HttpClient } from "@angular/common/http";

@Component({
  selector: "app-add-kpi-dialog",
  templateUrl: "./add-kpi-dialog.component.html",
  styleUrls: ["./add-kpi-dialog.component.scss"],
})
export class AddKpiDialogComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  isEdit: boolean = false;
  prefixes: any[] = [];
  selectedPrefix: string = "";
  submitted = false;

  @ViewChild(MonacoEditorComponent, { static: false }) monacoComponent:
    | MonacoEditorComponent
    | undefined;

  editorOptions: MonacoEditorConstructionOptions = {
    language: "python",
    theme: "vs-dark",
    automaticLayout: true,
    scrollBeyondLastLine: true,
    smoothScrolling: true,
    minimap: { enabled: true },
    scrollbar: {
      vertical: "visible",
      horizontal: "visible",
      useShadows: true,
      verticalScrollbarSize: 14,
      horizontalScrollbarSize: 10,
      arrowSize: 30,
    },
  };

  code = `def func():
    # Implement your KPI calculation logic here
    return`;

  constructor(
    public dialogRef: MatDialogRef<AddKpiDialogComponent>,
    private fb: FormBuilder,
    private kpiService: KpiService,
    private flowService: FlowService,
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEdit = data?.isEdit || false;
    this.selectedPrefix = data.kpi.prefix || "";
    this.form = this.fb.group({
      name: [data.kpi.name || "", Validators.required],
      description: [data.kpi.description || "", Validators.required],
      inputTelemetry: [data.kpi.input_telemetry || "", Validators.required],
      outputTelemetry: [data.kpi.output_telemetry || "", Validators.required],
      prefix: [this.selectedPrefix, Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadPrefixes();
    
    if (this.isEdit) {
      this.loadKpiCode();
    }
  }

  loadKpiCode(): void {
    let codeUrl = this.data.kpi.code;
  
    if (codeUrl) {
      this.isLoading = true;
      this.http.get(`${codeUrl}?nocache=${new Date().getTime()}`, { responseType: 'text' }).subscribe(
        (code) => {
          this.code = code;
          this.isLoading = false;
        },
        (error) => {
          console.error("Error fetching KPI code:", error);
          this.isLoading = false;
        }
      );
    }
  }
  
  loadPrefixes() {
    this.flowService.getPrefixes("kpi").subscribe((response: any) => {
      this.prefixes = response.tree.map((prefix: any) => ({
        name: prefix.full_name,
        uuid: prefix.id,
      }));
    });
   }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }

    this.isLoading = true;
    const { name, description, inputTelemetry, outputTelemetry, prefix } = this.form.value;

    const codeBlob = new Blob([this.code], { type: "text/plain" });
    const kpiFileFormData = new FormData();
    kpiFileFormData.append("code", codeBlob, `${name}-kpi.py`);
    kpiFileFormData.append("name", name);
    kpiFileFormData.append("description", description);
    kpiFileFormData.append("output_telemetry", outputTelemetry);
    kpiFileFormData.append("input_telemetry", inputTelemetry);
    kpiFileFormData.append("prefix", prefix === "root" ? null : prefix);

    const editObservable = this.isEdit 
    ? this.kpiService.editKpi(this.data.kpi.id, kpiFileFormData)
    : this.kpiService.addKpi(kpiFileFormData);

    editObservable.subscribe(
      (response) => {
        this.dialogRef.close(response);
      },
      (error) => {
        console.error(this.isEdit ? "Error updating KPI:" : "Error adding KPI:", error);
        this.isLoading = false;
      }
    );
  }
}