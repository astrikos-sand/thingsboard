import { Component, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import axios from 'axios';

@Component({
  selector: 'app-edit-node-dialog',
  templateUrl: './edit-node-dialog.component.html',
  styleUrls: ['./edit-node-dialog.component.scss'],
})
export class EditNodeDialogComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  originalData: string;
  additionalData: any;

  constructor(
    public dialogRef: MatDialogRef<EditNodeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.originalData = data.value || '';
    this.form = this.fb.group({
      value: [this.originalData, Validators.required],
    });
    this.additionalData = this.constructAdditionalData(data);
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
      case "p": {
        const keys = field["key"];
        const label = field["label"];
        const value = keys.reduce((acc: any, curr: any) => acc && acc[curr], node_data);
        return { label, value, type: field["type"] };
      }
      case "id": {
        return { label: "ID", value: node_data.id.slice(0, 8), type: "id" };
      }
      case "link": {
        const keys = field["key"];
        const label = field["label"];
        const value = keys.reduce((acc: any, curr: any) => acc && acc[curr], node_data);
        return { label, value: `http://localhost:8000${value}`, type: "link" };
      }
      default: {
        return { label: field["label"], value: "Field type not defined", type: "unknown" };
      }
    }
  }

  async saveData() {
    const editedData = this.form.get('value')?.value;
    this.isLoading = true;
    try {
      await axios.patch(`http://localhost:8000/v2/nodes/${this.data.id}/`, {
        value: editedData,
      });
      this.dialogRef.close(editedData);
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
