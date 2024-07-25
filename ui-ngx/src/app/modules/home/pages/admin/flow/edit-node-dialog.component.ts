import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
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

  constructor(
    public dialogRef: MatDialogRef<EditNodeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    console.log(data)
    this.form = this.fb.group({
      value: [data.value || '', Validators.required],
    });
  }

  ngOnInit(): void {
    this.cdr.detectChanges();
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
