import { Component, Inject } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { EnvService } from "@app/core/services/env.service";

@Component({
  selector: "app-create-env-dialog",
  templateUrl: "./create-env-dialog.component.html",
})
export class CreateEnvDialogComponent {
  createEnvForm: FormGroup;
  isLoading = false;
  selectedPrefix: string;

  constructor(
    private fb: FormBuilder,
    private envService: EnvService,
    public dialogRef: MatDialogRef<CreateEnvDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.selectedPrefix = data.selectedPrefix;
    this.createEnvForm = this.fb.group({
      name: [""],
      requirements: [null],
      prefix: [{ value: this.selectedPrefix, disabled: true }, [Validators.required]],
    });
  }

  onFileChange(event: Event): void {
    if ((event.target as HTMLInputElement).files.length > 0) {
      const file = (event.target as HTMLInputElement).files[0];
      this.createEnvForm.patchValue({ requirements: file });
    }
  }
  
  submit(): void {
    if (this.createEnvForm.valid) {
      this.isLoading = true;
      const formData = new FormData();
      formData.append("name", this.createEnvForm.get("name").value);
      formData.append("requirements", this.createEnvForm.get("requirements").value);
      if (this.selectedPrefix !== 'root')
        formData.append("prefix", this.selectedPrefix);

      this.envService.createEnv(formData).subscribe(
        () => {
          this.dialogRef.close();
        },
        (error) => {
          console.error("Error creating environment: ", error);
        },
        () => {
          this.isLoading = false;
        }
      );
    }
  }
}
