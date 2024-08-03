import { Component, Inject, OnInit, SkipSelf, ViewChild, ElementRef } from "@angular/core";
import { ErrorStateMatcher } from "@angular/material/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { Store } from "@ngrx/store";
import { AppState } from "@core/core.state";
import {
  FormGroupDirective,
  NgForm,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  Validators,
} from "@angular/forms";
import { DialogComponent } from "@shared/components/dialog.component";
import { Router } from "@angular/router";
import { TagService } from "@app/core/services/tag.service";
import { BehaviorSubject } from "rxjs";

export interface UploadFileDialogData {
  file?: string;
  filename?: string;
  parentTag?: string;
  parentTagName?: string;
}

@Component({
  selector: "tb-upload-file-dialog",
  templateUrl: "./upload-file-dialog.component.html",
  providers: [
    { provide: ErrorStateMatcher, useExisting: UploadFileDialogComponent },
  ],
  styleUrls: [],
})
export class UploadFileDialogComponent
  extends DialogComponent<UploadFileDialogComponent>
  implements OnInit, ErrorStateMatcher
{
  uploadFileFormGroup: UntypedFormGroup;
  uploadFile = true;
  submitted = false;
  selectedFileName: string;
  parentTags: any[] = [];
  parentTagName: string;
  currentTagName: string;
  isLoading$ = new BehaviorSubject<boolean>(false);
  createNewTag = false;

  @ViewChild('fileInput') fileInput: ElementRef;

  constructor(
    protected store: Store<AppState>,
    protected router: Router,
    private tagService: TagService,
    @Inject(MAT_DIALOG_DATA) public data: UploadFileDialogData,
    @SkipSelf() private errorStateMatcher: ErrorStateMatcher,
    public dialogRef: MatDialogRef<UploadFileDialogComponent>,
    public fb: UntypedFormBuilder
  ) {
    super(store, router, dialogRef);
  }

  ngOnInit(): void {
    this.uploadFile = !this.data?.file;
    this.parentTagName = this.data.parentTagName;
    this.currentTagName = this.parentTagName;
    this.uploadFileFormGroup = this.fb.group({
      file: [null, [Validators.required]],
      filename: [this.data?.filename, [Validators.required]],
      parentTag: [this.data?.parentTag, [Validators.required]],
      newTag: [null, []],
    });

    this.tagService.getTags().subscribe(tags => {
      this.parentTags = tags;
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files[0];
    if (file) {
      this.selectedFileName = file.name;
      this.uploadFileFormGroup.patchValue({ file: file });
      this.uploadFileFormGroup.get('filename').setValue(file.name);
      this.uploadFileFormGroup.markAsDirty();
    }
  }

  isErrorState(
    control: UntypedFormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const originalErrorState = this.errorStateMatcher.isErrorState(
      control,
      form
    );
    const customErrorState = !!(control && control.invalid && this.submitted);
    return originalErrorState || customErrorState;
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  createNewTagToggle(): void {
    this.createNewTag = !this.createNewTag;
    if (!this.createNewTag) {
      this.uploadFileFormGroup.get('newTag').reset();
      this.currentTagName = this.parentTagName;
    }
  }

  upload(): void {
    this.submitted = true;
    if (this.uploadFileFormGroup.valid) {
      this.isLoading$.next(true);

      if (this.createNewTag) {
        const newTagName = this.uploadFileFormGroup.get('newTag').value;
        const parentTagId = this.uploadFileFormGroup.get('parentTag').value;

        // Create the new tag
        const newTagData = {
          name: newTagName,
          parent: parentTagId
        };
        this.tagService.createTag(newTagData).subscribe(
          (newTag) => {
            const tagId = newTag.id;
            this.uploadFileWithTag(tagId);
          },
          (error) => {
            console.error("Error creating tag: ", error);
            this.isLoading$.next(false);
          }
        );
      } else {
        const parentTagId = this.uploadFileFormGroup.get('parentTag').value;
        this.uploadFileWithTag(parentTagId);
      }
    }
  }

  uploadFileWithTag(tagId: string): void {
    const file: File = this.uploadFileFormGroup.get("file").value;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", this.uploadFileFormGroup.get("filename").value);
    formData.append("tag_ids", tagId);
    this.tagService.createItem('archives', formData, true).subscribe(
      () => {
        console.log("File uploaded successfully");
        this.isLoading$.next(false);
        this.dialogRef.close();
      },
      (error) => {
        console.error("Error uploading file: ", error);
        this.isLoading$.next(false);
      }
    );
  }
}
