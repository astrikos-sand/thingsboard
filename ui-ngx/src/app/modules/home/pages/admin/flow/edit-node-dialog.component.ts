import { Component, OnInit, ChangeDetectorRef, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FormGroup, FormBuilder, Validators, FormArray } from "@angular/forms";
import axios from "axios";

@Component({
  selector: "app-edit-node-dialog",
  templateUrl: "./edit-node-dialog.component.html",
  styleUrls: ["./edit-node-dialog.component.scss"],
})
export class EditNodeDialogComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  originalData: string;
  additionalData: any;
  defaultValues: FormArray;
  VALUE_TYPES = {
    INT: "Integer",
    STR: "String",
    BOOL: "Boolean",
    FLOAT: "Float",
    LIST: "List",
    SET: "Set",
    TUPLE: "Tuple",
    DICT: "Dictionary",
    NONE: "None",
    ANY: "Any",
  };
  objectKeys = Object.keys;

  constructor(
    public dialogRef: MatDialogRef<EditNodeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.originalData = data.value || "";
    this.form = this.fb.group({
      value: [
        this.originalData,
        data.node_type === "DataNode" ? Validators.required : null,
      ],
      defaultValues: this.fb.array([]),
    });
    this.additionalData = this.constructAdditionalData(data);
    this.defaultValues = this.form.get("defaultValues") as FormArray;
    if (data.node_type === "FunctionNode" && data.datastore) {
      Object.keys(data.datastore).forEach((key) => {
        this.addDefaultValue(
          key,
          data.datastore[key].value,
          data.datastore[key].value_type
        );
      });
    }
  }

  ngOnInit(): void {
    this.cdr.detectChanges();
  }

  constructAdditionalData(data: any) {
    const fields = data.node_fields?.attrs || [];
    return fields.map((field: any) => this.constructField(field, data));
  }

  constructField(field: any, node_data: any) {
    switch (field["type"]) {
      case "span":
      case "markdown":
      case "p":
        const keys = field["key"];
        const label = field["label"];
        const value = keys.reduce(
          (acc: any, curr: any) => (acc ? acc[curr] : ""),
          node_data
        );
        return { label, value, type: field["type"] };
      case "id":
        return { label: "ID", value: node_data.id?.slice(0, 8), type: "id" };
      case "link":
        const keys2 = field["key"];
        const label2 = field["label"];
        const rawValue = keys2.reduce(
          (acc: any, curr: any) => (acc ? acc[curr] : ""),
          node_data
        );
        return { label: label2, value: `backend${rawValue}`, type: "link" };
      default:
        return {
          label: field["label"],
          value: "Field type not defined",
          type: "unknown",
        };
    }
  }

  addDefaultValue(
    slot: string = "",
    value: string = "",
    value_type: string = ""
  ) {
    const group = this.fb.group({
      slot: [slot, Validators.required],
      value: [value, Validators.required],
      value_type: [value_type, Validators.required],
    });
    this.defaultValues.push(group);
  }

  deleteDefaultValue(index: number) {
    this.defaultValues.removeAt(index);
  }

  async saveData() {
    this.isLoading = true;
    let datastore: any = {};
    if (this.data.node_type === "FunctionNode") {
      datastore = this.defaultValues.value.reduce((acc: any, curr: any) => {
        acc[curr.slot] = {
          value: curr.value,
          value_type: curr.value_type,
        };
        return acc;
      }, {});
    }
    try {
      const payload: any = {};
      if (this.data.node_type === "DataNode") {
        payload.value = this.form.value.value;
      }
      if (this.data.node_type === "FunctionNode") {
        payload.datastore = datastore;
      }
      console.log(payload)
      await axios.patch(`/backend/v2/nodes/${this.data.id}/`, payload);
      this.dialogRef.close(payload);
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      this.isLoading = false;
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
