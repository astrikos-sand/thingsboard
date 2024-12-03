import { Component, OnInit, ChangeDetectorRef, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FlowService } from "@app/core/services/flow.service";
import { SearchService } from "@app/core/services/search.service";
import { TriggerService } from "@app/core/services/trigger.service";
import { MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";

@Component({
  selector: "app-webhook",
  templateUrl: "./dialog.component.html",
  styleUrls: ["./dialog.component.scss"],
})
export class WebhookDialogComponent implements OnInit {
  submitted = false;
  isLoading = false;
  targets: any[] = [];
  selectedTarget = "";
  searchType: string = "name";
  filteredOptions: any[] = [];
  selectedPrefix: string = "";

  constructor(
    public dialogRef: MatDialogRef<WebhookDialogComponent>,
    private webhookService: TriggerService,
    private flowService: FlowService,
    private searchService: SearchService,
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
    if (this.selectedTarget) {
      this.isLoading = true;
      const webhookData = {
        target: this.selectedTarget,
        prefix: this.selectedPrefix == "root" ? null : this.selectedPrefix,
      };
      this.webhookService.addWebhook(webhookData).subscribe(
        (newWebhook) => {
          this.dialogRef.close(newWebhook);
        },
        (error) => {
          console.error("Error adding webhook:", error);
          this.isLoading = false;
        }
      );
    }
  }
}
