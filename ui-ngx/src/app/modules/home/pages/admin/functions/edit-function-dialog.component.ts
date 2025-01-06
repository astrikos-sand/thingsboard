import { Component, Inject, ViewChild, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MonacoEditorConstructionOptions, MonacoEditorComponent } from "@materia-ui/ngx-monaco-editor";
import { NodeClassService } from "@app/core/services/node-classes.service";
import { HttpClient } from "@angular/common/http";
import { FlowService } from "@app/core/services/flow.service";

@Component({
  selector: "app-edit-function-dialog",
  templateUrl: "./edit-function-dialog.component.html",
  styleUrls: ["./edit-function-dialog.component.scss"],
})
export class EditFunctionDialogComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  functionSignature: string = "";
  functionBody: string = "";
  functionReturn: string = "";
  prefixes: string[] = [];

  @ViewChild(MonacoEditorComponent, { static: false }) monacoComponent: MonacoEditorComponent | undefined;

  editorOptions: MonacoEditorConstructionOptions = {
    language: "python",
    theme: "vs-dark",
    automaticLayout: true,
    scrollBeyondLastLine: true,
    smoothScrolling: true,
    minimap: { enabled: false },
    scrollbar: {
      vertical: "visible",
      horizontal: "visible",
      useShadows: true,
      verticalScrollbarSize: 14,
      horizontalScrollbarSize: 10,
      arrowSize: 30,
    },
  };

  constructor(
    public dialogRef: MatDialogRef<EditFunctionDialogComponent>,
    private fb: FormBuilder,
    private flowService: FlowService,
    private nodeClassService: NodeClassService,
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      name: [this.data.functionData.name, Validators.required],
      description: [this.data.functionData.description, Validators.required],
      selectedPrefix: [this.data.functionData.prefix, Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadFunctionCode();
    this.loadPrefixes();
  }

  loadFunctionCode(): void {
    let codeUrl = this.data.functionData.code;

    if (codeUrl) {
      this.isLoading = true;
      this.http.get(`${codeUrl}?nocache=${new Date().getTime()}`, { responseType: 'text' }).subscribe(
        (code) => {
          this.splitCodeIntoParts(code);
          this.isLoading = false;
        },
        (error) => {
          console.error("Error fetching code:", error);
          this.isLoading = false;
        }
      );
    }
  }

  splitCodeIntoParts(code: string): void {
      this.functionSignature = '';
      this.functionReturn = '';

      this.functionBody = code;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  loadPrefixes() {
    this.flowService.getPrefixes("functions").subscribe((response: any) => {
      this.prefixes = response.tree.map((prefix: any) => prefix);
    });
  }

  save(): void {
    if (this.isLoading) return;

    this.isLoading = true;

    const updatedCode = `${this.functionBody}`;

    const updatedFunction = {
      id: this.data.functionData.id,
      code: updatedCode,
    };

    const blob = new Blob([updatedCode], { type: 'text/plain' });
    const formData = new FormData();
    formData.append("code", blob, `${this.data.functionData.name}--updatecode.py`);
    formData.append("name", this.form.value.name);
    formData.append("description", this.form.value.description);
    formData.append("prefix", this.form.value.selectedPrefix == 'root' ? null : this.form.value.selectedPrefix);

    this.nodeClassService.updateFunction(updatedFunction, formData).subscribe(
      () => {
        this.dialogRef.close(true);
      },
      (error) => {
        console.error("Error saving function:", error);
        this.isLoading = false;
      }
    );
  }
}
