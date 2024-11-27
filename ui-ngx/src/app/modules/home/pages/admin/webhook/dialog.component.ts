import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FlowService } from '@app/core/services/flow.service';
import { TriggerService } from '@app/core/services/trigger.service';

@Component({
  selector: 'app-webhook',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class WebhookDialogComponent implements OnInit {
  submitted = false;
  isLoading = false;
  targets: any[] = [];
  selectedTarget = '';

  constructor(
    public dialogRef: MatDialogRef<WebhookDialogComponent>,
    private webhookService: TriggerService,
    private flowService: FlowService
  ) { }

  ngOnInit(): void {
    this.loadTargets();
  }

  loadTargets(): void {
    this.flowService.fetchAllFlows().subscribe(
      (data: any[]) => {
        this.targets = data;
      },
      error => {
        console.error('Error loading targets:', error);
      }
    );
  }

  cancel(): void {
    this.dialogRef.close();
  }

  add(): void {
    this.submitted = true;
    if (this.selectedTarget) {
      this.isLoading = true;
      this.webhookService.addWebhook({ target: this.selectedTarget }).subscribe(
        newWebhook => {
          this.dialogRef.close(newWebhook);
        },
        error => {
          console.error('Error adding webhook:', error);
          this.isLoading = false;
        }
      );
    }
  }
}
