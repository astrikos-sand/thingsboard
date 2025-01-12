import { Component, Inject, OnInit, ViewChild, ElementRef } from "@angular/core";
import {
  FormGroupDirective,
  NgForm,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  Validators,
} from "@angular/forms";
import { ErrorStateMatcher } from "@angular/material/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { RepositoryService } from "@app/core/services/repository.service";

export interface UploadRepositoryDialogData {
  selectedPrefix: string;
  file?: string;
  license_key?: string;
}

@Component({
  selector: "app-import-data-dialog",
  templateUrl: "./import-data-dialog.component.html",
})
export class ImportDataDialogComponent
  implements OnInit, ErrorStateMatcher
{
  uploadRepositoryFormGroup: UntypedFormGroup;
  isEditMode = false;
  submitted = false;
  selectedFileName: string | null = null;

  @ViewChild("fileInput") fileInput: ElementRef;

  constructor(
    private fb: UntypedFormBuilder,
    private repositoryService: RepositoryService,
    public dialogRef: MatDialogRef<ImportDataDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UploadRepositoryDialogData
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data?.file;
    this.uploadRepositoryFormGroup = this.fb.group({
      license_key: [null, [Validators.required]],
      file: [null, this.isEditMode ? [] : [Validators.required]],
      prefix: [{ value: this.data.selectedPrefix, disabled: true }],
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFileName = file.name;
      this.uploadRepositoryFormGroup.patchValue({ file });
      this.uploadRepositoryFormGroup.markAsDirty();
    }
  }

  isErrorState(
    control: UntypedFormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    return !!(control && control.invalid && (control.dirty || this.submitted));
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  upload(): void {
    this.submitted = true;
    if (this.uploadRepositoryFormGroup.valid) {
      const formData = new FormData();
      formData.append("license_key", this.uploadRepositoryFormGroup.get("license_key").value);
      formData.append("prefix", this.data.selectedPrefix == "root" ? null : this.data.selectedPrefix);

      const file: File = this.uploadRepositoryFormGroup.get("file").value;
      if (file) {
        formData.append("file", file);
      }

      this.repositoryService.importData(formData).subscribe(
        () => {
          console.log("Repository uploaded successfully");
          this.dialogRef.close(true);
        },
        (error) => {
          console.error("Error uploading repository: ", error);
        }
      );
    }
  }
}
