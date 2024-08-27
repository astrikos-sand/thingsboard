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
import { ArchivesService } from "@app/core/services/archives.service";
import { TagService } from "@app/core/services/tag.service";

export interface UploadFileDialogData {
  file?: string;
  filename?: string;
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

  @ViewChild('fileInput') fileInput: ElementRef;

  constructor(
    protected store: Store<AppState>,
    protected router: Router,
    private archiveService: ArchivesService,
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
    this.uploadFileFormGroup = this.fb.group({
      file: [null, [Validators.required]],
      filename: [this.data?.filename, [Validators.required]],
      parentTag: [null, [Validators.required]],
      newTag: [null, [Validators.required]],
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

  upload(): void {
    this.submitted = true;
    if (this.uploadFileFormGroup.valid) {
      const file: File = this.uploadFileFormGroup.get("file").value;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filename", this.uploadFileFormGroup.get("filename").value);
      formData.append("parentTag", this.uploadFileFormGroup.get("parentTag").value);
      formData.append("newTag", this.uploadFileFormGroup.get("newTag").value);
      this.archiveService.uploadFile(formData).subscribe(
        () => {
          console.log("File uploaded successfully");
          this.dialogRef.close();
        },
        (error) => {
          console.error("Error uploading file: ", error);
        }
      );
    }
  }
}
