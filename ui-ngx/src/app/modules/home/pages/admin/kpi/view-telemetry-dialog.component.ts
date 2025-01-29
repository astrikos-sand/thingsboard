import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { KpiService } from "@app/core/services/kpi.service";

@Component({
  selector: "app-view-telemetry-dialog",
  templateUrl: "./view-telemetry-dialog.component.html",
  styleUrls: ["./view-telemetry-dialog.component.scss"],
})
export class ViewTelemetryDialogComponent implements OnInit {
  calculations: any[] = [];
  isLoading = true;
  telemetryName: string;
  telemetry: any = null;

  constructor(
    private kpiservice: KpiService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<ViewTelemetryDialogComponent>,
  ) { }

  loadCalculations(): void {
    const kpiId = this.data.kpiId;

    this.kpiservice.getCalculations(kpiId).subscribe(
      (calculations) => {
        this.calculations = calculations;
        this.isLoading = false;
      },
      (error) => {
        console.error("Error fetching telemetry:", error);
        this.isLoading = false;
      }
    );
  }

  loadTelemetry(calculation: any): void {
    this.isLoading = true;
    this.kpiservice.getTelemetry(calculation.id).subscribe(
      (telemetry) => {
        this.telemetry = telemetry;
        this.isLoading = false;
      },
      (error) => {
        console.error("Error fetching telemetry:", error);
        this.isLoading = false;
      }
    );
  }

  handleActiveCalculationChange(calculation: any): void {
    this.loadTelemetry(calculation);
  }

  backToCalculations(): void {
    this.telemetry = null;
  }


  ngOnInit(): void {
    this.telemetryName = this.data.telemetryName;
    this.loadCalculations();
  }

  refreshTelemtry(): void {
    this.isLoading = true;
    this.loadCalculations();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
