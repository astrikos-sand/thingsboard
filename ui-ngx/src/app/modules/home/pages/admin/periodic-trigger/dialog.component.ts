import { Component, OnInit, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FlowService } from "@app/core/services/flow.service";
import { TagService } from "@app/core/services/tag.service";
import { TriggerService } from "@app/core/services/trigger.service";

export interface AddPeriodicTriggerDialogData {
  parentTag: string;
  parentTagName: string;
}

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
  createNewTag = false;
  currentTagName: string;
  newTagName: string = "";

  constructor(
    public dialogRef: MatDialogRef<PeriodicTriggerDialogComponent>,
    private triggerService: TriggerService,
    private flowService: FlowService,
    private tagService: TagService,
    @Inject(MAT_DIALOG_DATA) public data: AddPeriodicTriggerDialogData
  ) {}

  ngOnInit(): void {
    this.currentTagName = this.data.parentTagName;
    this.loadTargets();
  }

  loadTargets(): void {
    this.flowService.fetchFlows().subscribe(
      (data: any[]) => {
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

  createNewTagToggle(): void {
    this.createNewTag = !this.createNewTag;
    if (!this.createNewTag) {
      this.newTagName = "";
    }
  }

  add(): void {
    this.submitted = true;
    if (this.selectedTarget && this.triggerType && this.triggerName) {
      this.isLoading = true;
      if (this.createNewTag) {
        const newTagData = {
          name: this.newTagName,
          parent: this.data.parentTag,
        };
        this.tagService.createTag(newTagData).subscribe(
          (newTag) => {
            this.createTrigger(newTag.id);
          },
          (error) => {
            console.error("Error creating tag:", error);
            this.isLoading = false;
          }
        );
      } else {
        this.createTrigger(this.data.parentTag);
      }
    }
  }

  createTrigger(tagId: string): void {
    const payload: any = {
      target: this.selectedTarget,
      name: this.triggerName,
      tag_ids: [tagId],
    };
    if (this.triggerType === "interval") {
      payload.interval = this.interval;
    } else if (this.triggerType === "crontab") {
      payload.crontab = this.crontab;
    }
    this.tagService.createItem("periodic_trigger", payload, false).subscribe(
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
