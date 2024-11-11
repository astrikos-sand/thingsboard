import { Component } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { MatDialogRef } from "@angular/material/dialog";
import { EnvService } from "@app/core/services/env.service";

@Component({
  selector: "app-create-env-dialog",
  templateUrl: "./create-env-dialog.component.html",
})
export class CreateEnvDialogComponent {
  createEnvForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private envService: EnvService,
    public dialogRef: MatDialogRef<CreateEnvDialogComponent>
  ) {
    this.createEnvForm = this.fb.group({
      name: [""],
      requirements: [null],
    });
  }

  onFileChange(event): void {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      this.createEnvForm.patchValue({ requirements: file });
    }
  }

  submit(): void {
    const formData = new FormData();
    formData.append("name", this.createEnvForm.get("name").value);
    formData.append("requirements", this.createEnvForm.get("requirements").value);

    this.envService.createEnv(formData).subscribe(() => {
      this.dialogRef.close();
    });
  }
}
