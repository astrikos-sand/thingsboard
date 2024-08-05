import { Component, OnInit, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FlowService } from "@app/core/services/flow.service";
import { TagService } from "@app/core/services/tag.service";
import { TriggerService } from "@app/core/services/trigger.service";

export interface AddWebhookDialogData {
  parentTag: string;
  parentTagName: string;
}

@Component({
  selector: "app-webhook-dialog",
  templateUrl: "./dialog.component.html",
  styleUrls: ["./dialog.component.scss"],
})
export class WebhookDialogComponent implements OnInit {
  submitted = false;
  isLoading = false;
  targets: any[] = [];
  selectedTarget = "";
  createNewTag = false;
  currentTagName: string;
  newTagName: string = "";

  constructor(
    public dialogRef: MatDialogRef<WebhookDialogComponent>,
    private webhookService: TriggerService,
    private flowService: FlowService,
    private tagService: TagService,
    @Inject(MAT_DIALOG_DATA) public data: AddWebhookDialogData
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
    if (this.selectedTarget) {
      this.isLoading = true;
      if (this.createNewTag) {
        const newTagData = {
          name: this.newTagName,
          parent: this.data.parentTag,
        };
        this.tagService.createTag(newTagData).subscribe(
          (newTag) => {
            this.createWebhook(newTag.id);
          },
          (error) => {
            console.error("Error creating tag:", error);
            this.isLoading = false;
          }
        );
      } else {
        this.createWebhook(this.data.parentTag);
      }
    }
  }

  createWebhook(tagId: string): void {
    const payload = {
      target: this.selectedTarget,
      tag_ids: [tagId],
    };
    this.tagService.createItem("webhook", payload, false).subscribe(
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
