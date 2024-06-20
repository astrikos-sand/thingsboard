import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { EnvService } from "@app/core/services/env.service";
import { TbPopoverComponent } from "@app/shared/components/popover.component";
import { Env } from "@app/shared/models/env.model";
import { Observable } from "rxjs";

@Component({
  selector: "app-create-env-popover",
  templateUrl: "./create-env-popover.component.html",
  styleUrls: ["./create-env-popover.component.scss"],
})
export class CreateEnvPopoverComponent implements OnInit {
  envs$: Observable<Env[]>;
  createEnvForm: FormGroup;
  popoverComponent: TbPopoverComponent<CreateEnvPopoverComponent>;

  constructor(private fb: FormBuilder, private envService: EnvService) {}

  ngOnInit(): void {
    this.envs$ = this.envService.getEnv();
    this.createEnvForm = this.fb.group({
      name: [""],
      requirements: [null],
    });
  }

  onFileChange(event): void {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      this.createEnvForm.patchValue({
        requirements: file,
      });
    }
  }

  submit(): void {
    const formData = new FormData();
    console.log(this.createEnvForm)
    formData.append("name", this.createEnvForm.get("name").value);
    formData.append(
      "requirements",
      this.createEnvForm.get("requirements").value
    );
    console.log(formData)
    this.envService.createENV(formData).subscribe((response) => {
      window.location.href = "/admin/";
    });
  }

  openFile(filePath: string): void {
    // Implement the logic to open the file
    window.open(filePath, "_blank");
  }

  deleteEnv(envId: number): void {
    // this.envService.deleteENV(envId).subscribe((response) => {
    //   // Refresh the list after deletion
    //   this.envs$ = this.envService.getEnv();
    // });
  }
}
