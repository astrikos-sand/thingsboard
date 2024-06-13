import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FlowService } from '@app/core/services/flow.service';

@Component({
  selector: 'add-base-node-class-dialog',
  templateUrl: './add-base-node-class-dialog.component.html',
})
export class AddBaseNodeClassDialog {
  flowName: string = '';
  description: string = '';
  submitted = false;
  isLoading = false;

  constructor(public dialogRef: MatDialogRef<AddBaseNodeClassDialog>, private flowService: FlowService) {}

  cancel(): void {
    this.dialogRef.close();
  }

  add(): void {
    this.submitted = true;
    if (this.flowName && this.description) {
      this.isLoading = true;
      this.flowService.addFlow({ name: this.flowName, description: this.description }).subscribe(
        newFlow => {
          this.dialogRef.close(newFlow);
        },
        error => {
          console.error('Error adding flow:', error);
          this.isLoading = false;
        }
      );
    }
  }
}
