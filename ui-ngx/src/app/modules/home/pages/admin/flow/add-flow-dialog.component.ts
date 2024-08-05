import { Component, Inject, OnInit, SkipSelf } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { FlowService } from "@app/core/services/flow.service";
import { TagService } from "@app/core/services/tag.service";
import { BehaviorSubject } from "rxjs";

export interface AddFlowDialogData {
  parentTag?: string;
  parentTagName?: string;
}

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
  currentTagName: string;
  createNewTag = false;
  newTagName: string;
  parentTag: string;
  isLoading$ = new BehaviorSubject<boolean>(false);

  constructor(
    public dialogRef: MatDialogRef<AddFlowDialogComponent>,
    private tagService: TagService,
    private flowService: FlowService,
    @Inject(MAT_DIALOG_DATA) public data: AddFlowDialogData
  ) {}

  ngOnInit(): void {
    this.loadEnvironments();
    this.currentTagName = this.data.parentTagName;
    this.parentTag = this.data.parentTag;
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

  cancel(): void {
    this.dialogRef.close();
  }

  createNewTagToggle(): void {
    this.createNewTag = !this.createNewTag;
    if (!this.createNewTag) {
      this.newTagName = "";
      this.currentTagName = this.data.parentTagName;
    }
  }

  add(): void {
    this.submitted = true;
    if (this.flowName && this.description && this.selectedEnv) {
      this.isLoading$.next(true);

      if (this.createNewTag) {
        const newTagData = {
          name: this.newTagName,
          parent: this.parentTag,
        };
        this.tagService.createTag(newTagData).subscribe(
          (newTag) => {
            this.addFlowWithTag(newTag.id);
          },
          (error) => {
            console.error("Error creating tag: ", error);
            this.isLoading$.next(false);
          }
        );
      } else {
        this.addFlowWithTag(this.parentTag);
      }
    }
  }

  addFlowWithTag(tagId: string): void {
    const newFlowData = {
      name: this.flowName,
      description: this.description,
      lib: this.selectedEnv,
      tag_ids: [tagId],
    };

    this.tagService.createItem("flow", newFlowData, false).subscribe(
      (newFlow) => {
        this.isLoading$.next(false);
        this.dialogRef.close(newFlow);
      },
      (error) => {
        console.error("Error adding flow: ", error);
        this.isLoading$.next(false);
      }
    );
  }
}
