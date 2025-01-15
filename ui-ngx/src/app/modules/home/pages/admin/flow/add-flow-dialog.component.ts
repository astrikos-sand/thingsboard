import { Component, OnInit, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FormControl } from '@angular/forms';
import { FlowService } from "@app/core/services/flow.service";
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: "app-add-flow-dialog",
  templateUrl: "./add-flow-dialog.component.html",
  styleUrls: ["./add-flow-dialog.component.scss"],
})
export class AddFlowDialogComponent implements OnInit {
  flowName: string = "";
  description: string = "";
  selectedEnv: string = "";
  submitted = false;
  isLoading = false;
  environments: any[] = [];
  selectedPrefix: string = "";
  flowId: string = "";
  isEdit: boolean = false;
  prefixes: { name: string; uuid: string }[] = [];
  dagConfig: string = "";
  is_valid_json: boolean = true;
  softLinkControl = new FormControl();
  softLinks: { name: string; uuid: string }[] = [];
  selectedSoftLinks: { name: string; uuid: string }[] = [];
  filteredSoftLinks!: Observable<string[]>;

  constructor(
    public dialogRef: MatDialogRef<AddFlowDialogComponent>,
    private flowService: FlowService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.selectedPrefix = data.selectedPrefix;
    if (data.flowId) {
      this.flowId = data.flowId;
      this.isEdit = true;
      this.flowName = data.flowName;
      this.selectedEnv = data.selectedEnv;
      this.description = data.description;
      this.dagConfig = data.dagMetaData?.config
        ? JSON.stringify(data.dagMetaData.config, null, 2)
        : "{}";
      if (data.softLinks && data.softLinks.length) {
        this.loadPrefixes(() => {
          this.selectedSoftLinks = data.softLinks.map((uuid: string) => {
            const matchingPrefix = this.prefixes.find(prefix => prefix.uuid === uuid);
            return matchingPrefix ? matchingPrefix : { name: "Unknown", uuid };
          });
        });
      }
    }
  }

  ngOnInit(): void {
    this.loadEnvironments();
    this.loadPrefixes();
    this.filteredSoftLinks = this.softLinkControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterSoftLinks(value || ''))
    );
  }

  loadEnvironments(): void {
    this.flowService.getEnv().subscribe(
      (data: any[]) => {
        this.environments = data;
      },
      (error) => {
        console.error("Error loading environments:", error);
      }
    );
  }

  loadPrefixes(callback?: () => void): void {
    this.flowService.getPrefixes("flows").subscribe((response: any) => {
      this.prefixes = response.tree.map((prefix: any) => ({
        name: prefix.full_name,
        uuid: prefix.id, // Assuming `id` is the UUID
      }));
      this.softLinks = [...this.prefixes];
      if (callback) callback();
    });
  }

  isValidJson(json: string): boolean {
    try {
      JSON.parse(json);
      return true;
    } catch (e) {
      return false;
    }
  }

  addSoftLink(event: any): void {
    const value = (event.value || '').trim();
    const foundLink = this.prefixes.find((prefix) => prefix.name === value);
    if (foundLink && !this.selectedSoftLinks.some((link) => link.uuid === foundLink.uuid)) {
      this.selectedSoftLinks.push(foundLink); // Push the object (name and UUID)
    }
    event.chipInput!.clear();
    this.softLinkControl.setValue(null);
  }

  removeSoftLink(link: any): void {
    const index = this.selectedSoftLinks.indexOf(link);
    if (index >= 0) {
      this.selectedSoftLinks.splice(index, 1);
    }
  }

  private _filterSoftLinks(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.softLinks
      .filter((link) => link.name.toLowerCase().includes(filterValue))
      .map((link) => link.name); // Only show names in the dropdown
  }

  cancel(): void {
    this.dialogRef.close();
  }

  add(): void {
    if (this.dagConfig !== "" && !this.isValidJson(this.dagConfig)) {
      this.is_valid_json = false;
      return;
    }
    this.is_valid_json = true;
    this.submitted = true;
    if (this.flowName && this.description && this.selectedEnv) {
      this.isLoading = true;
      const flowData = {
        name: this.flowName,
        description: this.description,
        lib: this.selectedEnv,
        prefix: this.selectedPrefix === "root" ? null : this.selectedPrefix,
        soft_link: this.selectedSoftLinks.map((link) => link.uuid), // Send only UUIDs
        dag_meta_data: {
          config: JSON.parse(this.dagConfig || "{}"),
        },
      };
      this.flowService.addFlow(flowData).subscribe(
        (newFlow) => {
          this.dialogRef.close(newFlow);
        },
        (error) => {
          console.error("Error adding flow:", error);
          this.isLoading = false;
        }
      );
    }
  }

  edit(): void {
    if (this.dagConfig !== "" && !this.isValidJson(this.dagConfig)) {
      this.is_valid_json = false;
      return;
    }
    this.is_valid_json = true;
    this.submitted = true;
    if (this.selectedEnv) {
      this.isLoading = true;
      const flowData = {
        lib: this.selectedEnv,
        name: this.flowName,
        description: this.description,
        prefix: this.selectedPrefix === "root" ? null : this.selectedPrefix,
        soft_link: this.selectedSoftLinks.map((link) => link.uuid), // Send only UUIDs
        dag_meta_data: {
          config: JSON.parse(this.dagConfig || "{}"),
        },
      };
      this.flowService.editFlow(this.flowId, flowData).subscribe(
        () => {
          this.dialogRef.close(flowData);
        },
        (error) => {
          console.error("Error editing flow:", error);
          this.isLoading = false;
        }
      );
    }
  }
}
