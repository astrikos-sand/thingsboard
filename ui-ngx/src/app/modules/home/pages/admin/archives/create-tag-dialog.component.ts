import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { TagService } from "@app/core/services/tag.service";

export interface CreateTagDialogData {
  parentTag?: string;
}

@Component({
  selector: "app-create-tag-dialog",
  templateUrl: "./create-tag-dialog.component.html",
  styleUrls: [],
})
export class CreateTagDialogComponent implements OnInit {
  createTagFormGroup: FormGroup;
  submitted = false;
  parentTags: any[] = [];

  constructor(
    private tagService: TagService,
    @Inject(MAT_DIALOG_DATA) public data: CreateTagDialogData,
    public dialogRef: MatDialogRef<CreateTagDialogComponent>,
    public fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.createTagFormGroup = this.fb.group({
      tagName: [null, [Validators.required]],
      parentTag: [this.data?.parentTag, [Validators.required]],
    });

    this.tagService.getTags().subscribe(tags => {
      this.parentTags = tags;
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  createTag(): void {
    this.submitted = true;
    if (this.createTagFormGroup.valid) {
      const newTag = {
        name: this.createTagFormGroup.get("tagName").value,
        parent: this.createTagFormGroup.get("parentTag").value
      };
      this.tagService.createTag(newTag).subscribe(
        () => {
          this.dialogRef.close(true);
        },
        (error) => {
          console.error("Error creating tag: ", error);
        }
      );
    }
  }
}
