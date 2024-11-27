import { Component, OnInit } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { FlowService } from "@app/core/services/flow.service";
import { TriggerService } from "@app/core/services/trigger.service";

@Component({
  selector: "app-periodic-trigger-dialog",
  templateUrl: "./dialog.component.html",
  styleUrls: ["./dialog.component.scss"],
})
export class PeriodicTriggerDialogComponent implements OnInit {
  submitted = false;
  isLoading = false;
  targets: any[] = [];
  selectedTarget = "";
  triggerName = "";
  triggerType: string = "";
  interval: any = { every: null };
  crontab: any = {
    minute: "",
    hour: "",
    day_of_month: "",
    month_of_year: "",
    timezone: "",
  };

  constructor(
    public dialogRef: MatDialogRef<PeriodicTriggerDialogComponent>,
    private triggerService: TriggerService,
    private flowService: FlowService
  ) {}

  ngOnInit(): void {
    this.loadTargets();
  }

  loadTargets(): void {
    this.flowService.fetchAllFlows().subscribe(
      (data: any) => {
        this.targets = data;
      },
      (error) => {
        console.error("Error loading targets:", error);
      }
    );
  }

  cancel(): void {
    this.dialogRef.close();
  }

  add(): void {
    this.submitted = true;
    if (this.selectedTarget && this.triggerType && this.triggerName) {
      this.isLoading = true;
      const payload: any = {
        target: this.selectedTarget,
        name: this.triggerName,
      };
      if (this.triggerType === 'interval') {
        payload.interval = this.interval;
      } else if (this.triggerType === 'crontab') {
        payload.crontab = this.crontab;
      }
      this.triggerService.addPeriodicTrigger(payload).subscribe(
        (newTrigger) => {
          this.dialogRef.close(newTrigger);
        },
        (error) => {
          console.error("Error adding trigger:", error);
          this.isLoading = false;
        }
      );
    }
  }
}
