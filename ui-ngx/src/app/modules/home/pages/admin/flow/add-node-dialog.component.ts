import { Component, Inject, OnInit, ChangeDetectorRef } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FormGroup, FormBuilder, Validators, FormArray, AbstractControl } from "@angular/forms";
import { FlowService } from "@app/core/services/flow.service";

interface FieldConfig {
  type: string;
  placeholder: string;
  required: boolean;
  label: string;
  choices?: Array<[string, string]>;
  fields?: FieldConfig[];
}

@Component({
  selector: "add-node-dialog",
  templateUrl: "./add-node-dialog.component.html",
  styleUrls: ["./add-node-dialog.component.scss"],
})
export class AddNewNodeDialog implements OnInit {
  form: FormGroup;
  nodeTypes: string[] = [];
  formFields: FieldConfig[] = [];
  isLoading: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<AddNewNodeDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private flowService: FlowService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      nodeType: ["", Validators.required],
      fields: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.fetchNodeTypes();
    this.form.get("nodeType")?.valueChanges.subscribe((nodeType) => {
      this.fetchFormFields(nodeType);
    });
  }

  get fields() {
    const fieldsArray = this.form.get("fields") as FormArray;
    fieldsArray.controls.forEach((fieldGroup: AbstractControl) => {
      const labelControl = fieldGroup.get("label");
      if (labelControl && labelControl.value === "flow") {
        fieldGroup.patchValue({ value: this.data.flowId });
      }
    });
    return fieldsArray;
  }

  fetchNodeTypes(): void {
    this.flowService.getNodeTypes().subscribe(
      (response: string[]) => {
        this.nodeTypes = response;
      },
      (error: any) => {
        console.error("Error fetching node types:", error);
      }
    );
  }

  fetchFormFields(nodeType: string): void {
    this.flowService.getFormFields(nodeType).subscribe(
      (response: FieldConfig[]) => {
        this.formFields = response;
        this.createFormFields();
      },
      (error: any) => {
        console.error("Error fetching form fields:", error);
      }
    );
  }

  createFormFields(): void {
    const fieldsArray = this.form.get("fields") as FormArray;
    fieldsArray.clear();

    this.formFields.forEach((field) => {
      if (field.type === "array") {
        fieldsArray.push(
          this.fb.group({
            type: [field.type, Validators.required],
            label: [field.label, Validators.required],
            fields: this.fb.array([]),
            slotFields: [field.fields],
          })
        );
      } else {
        fieldsArray.push(
          this.fb.group({
            type: [field.type, Validators.required],
            label: [field.label, Validators.required],
            value: ["", field.required ? Validators.required : null],
            placeholder: [field.placeholder],
            required: [field.required],
            choices: [field.choices || []],
          })
        );
      }
    });
    this.cdr.detectChanges();
  }

  addSlot(fieldIndex: number): void {
    const fieldsArray = this.form.get('fields') as FormArray;
    const fieldGroup = fieldsArray.at(fieldIndex) as FormGroup;
    const slotsArray = fieldGroup.get('fields') as FormArray;
    const slotFields = fieldGroup.get('slotFields')?.value;
    
    const slotGroup = this.fb.group({});
    slotFields.forEach((slotField: any) => {
      slotGroup.addControl(slotField.label, this.fb.control('', slotField.required ? Validators.required : null));
    });
  
    slotsArray.push(slotGroup);
    this.cdr.detectChanges();
  }
  
  removeSlot(fieldIndex: number, slotIndex: number): void {
    const fieldsArray = this.form.get("fields") as FormArray;
    const fieldGroup = fieldsArray.at(fieldIndex) as FormGroup;
    const slotsArray = fieldGroup.get("fields") as FormArray;
    slotsArray.removeAt(slotIndex);
    this.form.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  getFieldControls(field: AbstractControl): FormArray {
    return field.get("fields") as FormArray;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  add(): void {
    if (this.form.valid) {
      this.isLoading = true;
      const nodeData = {
        node_type: this.form.value.nodeType,
        flow: this.data.flowId,
        ...this.form.value.fields.reduce((acc: any, field: any) => {
          if (field.type === "array") {
            acc[field.label] = field.fields;
          } else {
            acc[field.label] = field.value;
          }
          return acc;
        }, {}),
      };

      this.flowService.addNode(nodeData).subscribe(
        (response: any) => {
          const { id, position, connections_in, node_type,  connections_out, polymorphic_ctype, input_slots, output_slots, ...rest } = response;
          const newDataNode = {
            id: id.toString(),
            position: position,
            type: 'custom',
            data: {
              id: id,
              label: 'Node',
              position: position,
              polymorphic_ctype: polymorphic_ctype,
              input_slots: input_slots,
              output_slots: output_slots,
              toShow: true,
              flow: this.data.flowId,
              node_fields: this.data.node_fields[node_type],
              isScopeNode: false,
              ...rest,
            },
          };
          this.data.addNode(newDataNode);
          this.isLoading = false;
          this.dialogRef.close();
        },
        (error: any) => {
          console.error("Error creating node:", error);
          this.isLoading = false;
        }
      );
    } else {
      console.error("Form is invalid:", this.form);
    }
  }
}
