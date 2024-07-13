import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FlowService } from '@app/core/services/flow.service';

@Component({
  selector: 'app-add-flow-dialog',
  templateUrl: './add-flow-dialog.component.html',
  styleUrls: ['./add-flow-dialog.component.scss']
})
export class AddFlowDialogComponent implements OnInit {
  flowName: string = '';
  description: string = '';
  selectedEnv: string = '';
  submitted = false;
  isLoading = false;
  environments: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<AddFlowDialogComponent>, 
    private flowService: FlowService
  ) {}

  ngOnInit(): void {
    this.loadEnvironments();
  }

  loadEnvironments(): void {
    this.flowService.getEnv().subscribe(
      (data: any[]) => {
        this.environments = data;
      },
      error => {
        console.error('Error loading environments:', error);
      }
    );
  }

  cancel(): void {
    this.dialogRef.close();
  }

  add(): void {
    this.submitted = true;
    if (this.flowName && this.description && this.selectedEnv) {
      this.isLoading = true;
      // this.flowService.addFlow({ name: this.flowName, description: this.description, environment: this.selectedEnv }).subscribe(
      //   newFlow => {
      //     this.dialogRef.close(newFlow);
      //   },
      //   error => {
      //     console.error('Error adding flow:', error);
      //     this.isLoading = false;
      //   }
      // );
    }
  }
}
