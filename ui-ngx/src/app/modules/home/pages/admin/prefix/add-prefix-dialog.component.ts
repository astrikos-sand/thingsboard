import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { FlowService } from "@app/core/services/flow.service";

export interface CreatePrefixDialogData {
  prefix?: any;
  parentPrefix?: string;
  type?: string;
  isEdit?: boolean;
}

@Component({
  selector: "app-create-prefix-dialog",
  templateUrl: "./add-prefix-dialog.component.html",
  styleUrls: [],
})
export class AddPrefixDialogComponent implements OnInit {
  createPrefixFormGroup: FormGroup;
  submitted = false;
  isEditMode: boolean = false;
  parentPrefixes: any[] = [];

  constructor(
    private flowService: FlowService,
    @Inject(MAT_DIALOG_DATA) public data: CreatePrefixDialogData,
    public dialogRef: MatDialogRef<AddPrefixDialogComponent>,
    public fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.isEditMode = this.data.isEdit;

    this.createPrefixFormGroup = this.fb.group({
      prefixName: [this.data?.prefix?.name || null, [Validators.required]],
      parentPrefix: [
        this.data?.prefix?.parent || this.data?.parentPrefix || null,
        [Validators.required],
      ],
    });

    this.loadParentPrefixes();
  }

  loadParentPrefixes(): void {
    this.flowService.getPrefixes(this.data.type).subscribe(
      (response: any) => {
        const tree = response.tree;
        this.parentPrefixes = tree.filter(
          (prefix) => !this.data?.prefix || prefix.id !== this.data.prefix.id
        );
      },
      (error) => {
        console.error("Error loading parent prefixes:", error);
      }
    );
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  createOrUpdatePrefix(): void {
    this.submitted = true;

    if (this.createPrefixFormGroup.valid) {
      const updatedPrefix = {
        name: this.createPrefixFormGroup.get("prefixName").value,
        parent: this.createPrefixFormGroup.get("parentPrefix").value || null,
      };

      if (this.isEditMode) {
        this.flowService
          .editPrefix(this.data.prefix.id, updatedPrefix)
          .subscribe(
            () => {
              this.dialogRef.close({
                success: true,
                parent: updatedPrefix.parent,
              });
            },
            (error) => {
              console.error("Error updating prefix: ", error);
            }
          );
      } else {
        this.flowService.createPrefix(updatedPrefix, this.data.type).subscribe(
          () => {
            this.dialogRef.close({
              success: true,
              parent: updatedPrefix.parent,
            });
          },
          (error) => {
            console.error("Error creating prefix: ", error);
          }
        );
      }
    }
  }
}
