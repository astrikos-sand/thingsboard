import { Component, OnInit, ChangeDetectorRef, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FlowService } from "@app/core/services/flow.service";
import { SearchService } from "@app/core/services/search.service";
import { TriggerService } from "@app/core/services/trigger.service";
import { MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";

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
  searchType: string = "name";
  filteredOptions: any[] = [];
  selectedPrefix: string = "";
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
    private flowService: FlowService,
    private searchService: SearchService,
    private triggerService: TriggerService,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.selectedPrefix = data.selectedPrefix;
  }

  ngOnInit(): void {
    this.loadTargets();
  }

  loadTargets(): void {
    this.flowService.fetchAllFlows().subscribe(
      (data: any[]) => {
        this.targets = data;
      },
      (error) => {
        console.error("Error loading targets:", error);
      }
    );
  }

  onSearchTypeChange(event: any): void {
    this.searchType = event.value;
  }

  onDropdownSearch(searchTerm: string): void {
    if (searchTerm.length === 0) {
      this.filteredOptions = [];
      return;
    }

    const formattedSearchTerm =
      this.searchType === "prefix" ? `prefix:${searchTerm}` : searchTerm;

    this.searchService.searchItems(formattedSearchTerm, "flows").subscribe(
      (results: any[]) => {
        this.filteredOptions = results.map((item) => ({
          id: item.id,
          full_name: item.full_name,
        }));
        this.cdr.detectChanges();
      },
      (error) => {
        console.error("Error searching targets:", error);
      }
    );
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    this.selectedTarget = event.option.value;
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
        prefix: this.data.selectedPrefix == "root" ? null : this.data.selectedPrefix,
      };
      if (this.triggerType === "interval") {
        payload.interval = this.interval;
      } else if (this.triggerType === "crontab") {
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
