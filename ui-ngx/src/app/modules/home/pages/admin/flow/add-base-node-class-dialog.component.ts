import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import {
  MonacoEditorComponent,
  MonacoEditorConstructionOptions,
} from '@materia-ui/ngx-monaco-editor';
import { FlowService } from '@app/core/services/flow.service';

@Component({
  selector: 'add-base-node-class-dialog',
  templateUrl: './add-base-node-class-dialog.component.html',
  styleUrls: ['./add-base-node-class-dialog.component.scss'],
})
export class AddBaseNodeClassDialog implements OnInit {
  form: FormGroup;
  isLoading = false;

  @ViewChild(MonacoEditorComponent, { static: false }) monacoComponent:
    | MonacoEditorComponent
    | undefined;
  editorOptions: MonacoEditorConstructionOptions = {
    language: 'python',
    theme: 'vs-dark',
    automaticLayout: true,
  };
  mainCode = `# Implement your logic here`;
  code = `def func():\n    ${this.mainCode}\n    return`;

  constructor(
    public dialogRef: MatDialogRef<AddBaseNodeClassDialog>,
    private fb: FormBuilder,
    private flowService: FlowService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      inputs: [''],
      outputs: [''],
      specialSlots: this.fb.array([]),
      outputSpecialSlots: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => {
      this.updateCode();
    });
    this.updateCode();
  }

  get specialSlots(): FormArray {
    return this.form.get('specialSlots') as FormArray;
  }

  get outputSpecialSlots(): FormArray {
    return this.form.get('outputSpecialSlots') as FormArray;
  }

  addSpecialSlot() {
    this.specialSlots.push(
      this.fb.group({
        name: [''],
        speciality: [''],
        attachment_type: ['IN'],
      })
    );
  }

  addOutputSpecialSlot() {
    this.outputSpecialSlots.push(
      this.fb.group({
        name: [''],
        speciality: [''],
        attachment_type: ['OUT'],
      })
    );
  }

  updateCode() {
    const inputs = this.form.get('inputs')?.value || '';
    const outputs = this.form.get('outputs')?.value || '';
    const specialSlots = this.specialSlots.controls
      .map((slot) => slot.value.name)
      .filter((name) => name)
      .join(',');
    const parameters =
      inputs + (specialSlots ? (inputs ? ',' : '') + specialSlots : '');

    const mainMatch = this.code.match(/def func\([^)]*\):\n\s*(.*)\n\s*return/);
    this.mainCode = mainMatch ? mainMatch[1] : this.mainCode;
    this.code = `def func(${parameters}):\n    ${this.mainCode}\n    return ${outputs}`;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  add(): void {
    if (this.form.invalid) {
      return;
    }

    this.isLoading = true;
    const {
      name,
      description,
      inputs,
      outputs,
      specialSlots,
      outputSpecialSlots,
    } = this.form.value;

    const slots = [
      ...inputs
        .split(',')
        .map((name: any) => ({ name, attachment_type: 'IN' })),
      ...outputs
        .split(',')
        .map((name: any) => ({ name, attachment_type: 'OUT' })),
      ...specialSlots,
      ...outputSpecialSlots,
    ];

    const specialParameters = specialSlots
      .filter((slot: { speciality: string }) => slot.speciality !== 'SIG')
      .map((slot: { name: any }) => slot.name)
      .join(',');
    const parameters =
      inputs +
      (specialParameters ? (inputs ? ', ' : '') + specialParameters : '');

    const codeBlob = new Blob([this.code], { type: 'text/plain' });
    const codeFileFormData = new FormData();
    codeFileFormData.append('code_file', codeBlob, `${name}-code.py`);
    codeFileFormData.append('name', name);
    codeFileFormData.append('description', description);
    codeFileFormData.append('slots', JSON.stringify(slots));
    this.flowService.addBaseClass(codeFileFormData).subscribe(
      (newFlow) => {
        this.dialogRef.close(newFlow);
      },
      (error) => {
        console.error('Error adding flow:', error);
        this.isLoading = false;
      }
    );
  }
}
