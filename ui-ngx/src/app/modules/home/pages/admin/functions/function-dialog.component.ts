import { Component, OnInit, ViewChild, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import {
  MonacoEditorComponent,
  MonacoEditorConstructionOptions,
} from "@materia-ui/ngx-monaco-editor";
import { TagService } from "@app/core/services/tag.service";

export interface AddFunctionDialogData {
  parentTag: string;
  parentTagName: string;
}

@Component({
  selector: "function-dialog",
  templateUrl: "./function-dialog.component.html",
  styleUrls: ["./function-dialog.component.scss"],
})
export class AddFunctionDialog implements OnInit {
  form: FormGroup;
  isLoading = false;
  createNewTag = false;
  currentTagName: string;
  newTagName: string = "";

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
    private tagService: TagService,
    @Inject(MAT_DIALOG_DATA) public data: AddFunctionDialogData
  ) {
    this.form = this.fb.group({
      name: ["", Validators.required],
      description: ["", Validators.required],
      inputs: [""],
      outputs: [""],
    });
  }

  ngOnInit(): void {
    this.currentTagName = this.data.parentTagName;
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

  createNewTagToggle(): void {
    this.createNewTag = !this.createNewTag;
    if (!this.createNewTag) {
      this.newTagName = "";
    }
  }

  add(): void {
    if (this.form.invalid) {
      return;
    }

    this.isLoading = true;
    const { name, description, inputs, outputs } = this.form.value;

    if (this.createNewTag) {
      const newTagData = {
        name: this.newTagName,
        parent: this.data.parentTag,
      };
      this.tagService.createTag(newTagData).subscribe(
        (newTag) => {
          this.createFunction(name, description, inputs, outputs, newTag.id);
        },
        (error) => {
          console.error("Error creating tag:", error);
          this.isLoading = false;
        }
      );
    } else {
      this.createFunction(
        name,
        description,
        inputs,
        outputs,
        this.data.parentTag
      );
    }
  }

  createFunction(
    name: string,
    description: string,
    inputs: string,
    outputs: string,
    tagId: string
  ): void {
    const fields = [];

    if (inputs.length > 0) {
      const input_fields = inputs
        .split(",")
        .map((name: any) => ({ name, attachment_type: "IN" }));
      fields.push(...input_fields);
    }
    if (outputs.length > 0) {
      const output_fields = outputs
        .split(",")
        .map((name: any) => ({ name, attachment_type: "OUT" }));
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
    const formData = new FormData();
    formData.append("code", codeBlob, `${name}-code.py`);
    formData.append("name", name);
    formData.append("description", description);
    const fieldBlob = new Blob([JSON.stringify(fields)], {
      type: "application/json",
    });
    formData.append("fields", fieldBlob);
    formData.append("tag_ids", tagId);

    this.tagService.createItem("function_definition", formData).subscribe(
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
