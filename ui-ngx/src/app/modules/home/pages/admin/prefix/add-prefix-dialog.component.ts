import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { FlowService } from "@app/core/services/flow.service";

export interface CreatePrefixDialogData {
  parentPrefix?: string;
  type?: string;
}

@Component({
  selector: "app-create-prefix-dialog",
  templateUrl: "./add-prefix-dialog.component.html",
  styleUrls: [],
})
export class AddPrefixDialogComponent implements OnInit {
  createPrefixFormGroup: FormGroup;
  submitted = false;
  parentPrefixes: any[] = [];
  hasParentPrefix: boolean = false;

  constructor(
    private flowService: FlowService,
    @Inject(MAT_DIALOG_DATA) public data: CreatePrefixDialogData,
    public dialogRef: MatDialogRef<AddPrefixDialogComponent>,
    public fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.createPrefixFormGroup = this.fb.group({
      prefixName: [null, [Validators.required]],
      parentPrefix: [this.data?.parentPrefix || null, []],
    });

    this.hasParentPrefix = !!this.data?.parentPrefix;

    if (!this.hasParentPrefix && this.data?.type) {
      this.flowService.getPrefixes(this.data.type).subscribe((prefixes: any[]) => {
        this.parentPrefixes = prefixes;
      });
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  createPrefix(): void {
    this.submitted = true;

    if (this.createPrefixFormGroup.valid) {
      const newPrefix = {
        name: this.createPrefixFormGroup.get("prefixName").value,
        parent: this.createPrefixFormGroup.get("parentPrefix").value || this.data?.parentPrefix,
      };

      this.flowService.createPrefix(newPrefix).subscribe(
        () => {
          this.dialogRef.close(true);
        },
        (error) => {
          console.error("Error creating prefix: ", error);
        }
      );
    }
  }
}
