import { Component, Inject, ViewChild, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FormBuilder, FormGroup } from "@angular/forms";
import { MonacoEditorConstructionOptions, MonacoEditorComponent } from "@materia-ui/ngx-monaco-editor";
import { NodeClassService } from "@app/core/services/node-classes.service";
import { HttpClient } from "@angular/common/http";

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

  @ViewChild(MonacoEditorComponent, { static: false }) monacoComponent: MonacoEditorComponent | undefined;

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

  constructor(
    public dialogRef: MatDialogRef<EditFunctionDialogComponent>,
    private fb: FormBuilder,
    private nodeClassService: NodeClassService,
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({});
  }

  ngOnInit(): void {
    this.loadFunctionCode();
  }

  loadFunctionCode(): void {
    let codeUrl = this.data.functionData.code;

    if (codeUrl) {
      this.isLoading = true;
      this.http.get(codeUrl, { responseType: 'text' }).subscribe(
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
    const functionRegex = /(def\s+\w+\([^\)]*\)\s*:\s*)/;
    const returnRegex = /(\s*return\s+[^\n]+)/;

    const signatureMatch = code.match(functionRegex);
    const returnMatch = code.match(returnRegex);

    if (signatureMatch && returnMatch) {
      this.functionSignature = signatureMatch[0];
      this.functionReturn = returnMatch[0];

      const bodyStart = code.indexOf(this.functionSignature) + this.functionSignature.length;
      const bodyEnd = code.indexOf(this.functionReturn);
      this.functionBody = code.slice(bodyStart, bodyEnd).trim();
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.isLoading) return;

    this.isLoading = true;

    const updatedCode = `${this.functionSignature}\n${this.functionBody}\n${this.functionReturn}`;

    const updatedFunction = {
      id: this.data.functionData.id,
      code: updatedCode,
    };

    const blob = new Blob([JSON.stringify(updatedCode)], { type: 'text/plain' });
    const formData = new FormData();
    formData.append("code", blob, `${this.data.functionData.name}--updatecode.py`);

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
