import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { FlowService } from "@app/core/services/flow.service";
import { TbPopoverComponent } from "@app/shared/components/popover.component";
import { Observable } from "rxjs";

@Component({
  selector: "app-create-env-popover",
  templateUrl: "./create-env-popover.component.html",
  styleUrls: ["./create-env-popover.component.scss"],
})
export class CreateEnvPopoverComponent implements OnInit {
  @Output() envCreated = new EventEmitter<void>();
  envs$: Observable<any[]>;
  createEnvForm: FormGroup;
  popoverComponent: TbPopoverComponent<CreateEnvPopoverComponent>;

  constructor(private fb: FormBuilder, private flowService: FlowService) { }

  ngOnInit(): void {
    this.envs$ = this.flowService.getEnv();
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
    formData.append("name", this.createEnvForm.get("name").value);
    formData.append(
      "requirements",
      this.createEnvForm.get("requirements").value
    );

    this.flowService.createENV(formData).subscribe(
      (response) => {
        this.envCreated.emit();
        this.createEnvForm.reset({
          name: "",
          requirements: null,
        });
      },
      (error) => {
        console.error("Error creating environment:", error);
      }
    );
  }

  openFile(filePath: string): void {
    window.open(filePath, "_blank");
  }

  deleteEnv(envId: string): void {
    this.flowService.deleteEnv(envId).subscribe(
      () => {
        this.envCreated.emit();
      },
      (error) => {
        console.error("Error deleting environment:", error);
      }
    )
  }
}
