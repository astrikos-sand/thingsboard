import { Component, OnInit, Inject, ViewChild } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
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
  selectedPrefix: string = "";
  prefixes: string[] = [];

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
    # Implement your logic here
    return`;

  constructor(
    public dialogRef: MatDialogRef<AddFunctionDialog>,
    private fb: FormBuilder,
    private flowService: FlowService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.selectedPrefix = data?.selectedPrefix || "";
    this.form = this.fb.group({
      name: ["", Validators.required],
      description: ["", Validators.required],
      inputs: [""],
      outputs: [""],
      prefix: [this.selectedPrefix, Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadPrefixes();
    this.form.get("inputs")?.valueChanges.subscribe(() => {
      this.updateFunctionSignature();
    });
    this.form.get("outputs")?.valueChanges.subscribe(() => {
      this.updateReturnStatement();
    });
  }

  loadPrefixes() {
    if (!this.selectedPrefix) {
      this.flowService.getPrefixes("functions").subscribe((response: any) => {
        this.prefixes = response.tree.map((prefix: any) => prefix.full_name);
      });
    }
  }

  updateFunctionSignature() {
    const inputs = this.form.get("inputs")?.value || "";

    const functionRegex = /^def func\([^)]*\):/m;
    this.code = this.code.replace(functionRegex, `def func(${inputs}):`);
  }

  updateReturnStatement() {
    const outputs = this.form.get("outputs")?.value || "";

    const returnRegex = /^\s*return\s.*$/m;
    if (returnRegex.test(this.code)) {
      if (outputs.length > 0) {
        this.code = this.code.replace(returnRegex, `    return ${outputs}`);
      } else {
        this.code = this.code.replace(returnRegex, `    return`);
      }
    } else {
      if (outputs.length > 0) {
        this.code += `\n    return ${outputs}`;
      }
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  add(): void {
    if (this.form.invalid) {
      return;
    }

    this.isLoading = true;
    const { name, description, inputs, outputs, prefix } = this.form.value;

    const fields = [];

    if (inputs.length > 0) {
      const input_fields = inputs
        .split(",")
        .map((name: any) => ({ name: name.trim(), attachment_type: "IN" }));

      fields.push(...input_fields);
    }
    if (outputs.length > 0) {
      const output_fields = outputs
        .split(",")
        .map((name: any) => ({ name: name.trim(), attachment_type: "OUT" }));

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
    codeFileFormData.append("prefix", prefix == 'root' ? null : prefix,);
    const fieldBlob = new Blob([JSON.stringify(fields)], {
      type: "application/json",
    });
    codeFileFormData.append("fields", fieldBlob);

    this.flowService.addFunction(codeFileFormData).subscribe(
      (newFunction) => {
        this.dialogRef.close(newFunction);
      },
      (error) => {
        console.error("Error adding function:", error);
        this.isLoading = false;
      }
    );
  }
}
