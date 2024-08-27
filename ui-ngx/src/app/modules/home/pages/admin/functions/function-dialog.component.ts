import { Component, OnInit, ViewChild } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { FormBuilder, FormGroup, Validators, FormArray } from "@angular/forms";
import {
  MonacoEditorComponent,
  MonacoEditorConstructionOptions,
} from "@materia-ui/ngx-monaco-editor";
import { FlowService } from "@app/core/services/flow.service";

@Component({
  selector: "function-dialog",
  templateUrl: "./function-dialog.component.html",
  styleUrls: ["./function-dialog.component.scss"],
})
export class AddFunctionDialog implements OnInit {
  form: FormGroup;
  isLoading = false;

  @ViewChild(MonacoEditorComponent, { static: false }) monacoComponent:
    | MonacoEditorComponent
    | undefined;
  editorOptions: MonacoEditorConstructionOptions = {
    language: "python",
    theme: "vs-dark",
    automaticLayout: true,
  };
  mainCode = `# Implement your logic here`;
  code = `def func():\n    ${this.mainCode}\n    return`;

  constructor(
    public dialogRef: MatDialogRef<AddFunctionDialog>,
    private fb: FormBuilder,
    private flowService: FlowService
  ) {
    this.form = this.fb.group({
      name: ["", Validators.required],
      description: ["", Validators.required],
      inputs: [""],
      outputs: [""],
    });
  }

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => {
      this.updateCode();
    });
    this.updateCode();
  }

  updateCode() {
    const inputs = this.form.get("inputs")?.value || "";
    const outputs = this.form.get("outputs")?.value || "";
    const parameters = inputs;

    const mainMatch = this.code.match(/def func\([^)]*\):\n\s*(.*)\n\s*return/);
    this.mainCode = mainMatch ? mainMatch[1] : this.mainCode;
    this.code = `def func(${parameters}):\n    ${this.mainCode}\n    return ${outputs}`;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  add(): void {
    if (this.form.invalid) {
      return;
    }

    this.isLoading = true;
    const {
      name,
      description,
      inputs,
      outputs,
    } = this.form.value;

    const fields = [];

    if (inputs.length > 0) {
      const input_fields = inputs
        .split(",")
        .map((name: any) => ({ name, attachment_type: "IN" }))

      fields.push(...input_fields);
    }
    if (outputs.length > 0) {
      const output_fields = outputs
        .split(",")
        .map((name: any) => ({ name, attachment_type: "OUT" }))
      fields.push(...output_fields);
    }

    const parameters = inputs;

    let submit_code = "";
    if (outputs.length > 0) {
      submit_code = `${this.code}\n\n${outputs} = func(${parameters})`;
    } else {
      submit_code = `${this.code}\n\nfunc(${parameters})`;
    }

    const codeBlob = new Blob([submit_code], { type: "text/plain" });
    const codeFileFormData = new FormData();
    codeFileFormData.append("code", codeBlob, `${name}-code.py`);
    codeFileFormData.append("name", name);
    codeFileFormData.append("description", description);
    const fieldBlob = new Blob([JSON.stringify(fields)], { type: "application/json" });
    codeFileFormData.append("fields", fieldBlob);
    this.flowService.addFunction(codeFileFormData).subscribe(
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
