import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { FlowService } from '@app/core/services/flow.service';

@Component({
  selector: 'add-node-dialog',
  templateUrl: './add-node-dialog.component.html',
  styleUrls: ['./add-node-dialog.component.scss'],
})
export class AddNewNodeDialog implements OnInit {
  form: FormGroup;
  nodeTypes = ['data', 'generic'];
  dataTypes = [
    'INT',
    'STR',
    'BOOL',
    'FLOAT',
    'LIST',
    'SET',
    'TUPLE',
    'DICT',
    'NONE',
  ];
  dynamicClasses: any[] = [];

  isLoading: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<AddNewNodeDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private flowService: FlowService
  ) {
    this.form = this.fb.group({
      nodeType: ['', Validators.required],
      name: ['', Validators.required],
      description: ['', Validators.required],
      value: [''],
      dataType: [''],
      selectedDynamicClass: [''],
    });
  }

  ngOnInit(): void {
    this.fetchNodeClasses();
    this.form.get('nodeType')?.valueChanges.subscribe((nodeType) => {
      this.setValidators(nodeType);
    });
  }

  setValidators(nodeType: string): void {
    if (nodeType === 'data') {
      this.form.get('name')?.setValidators([Validators.required]);
      this.form.get('description')?.setValidators([Validators.required]);
      this.form.get('value')?.setValidators([]);
      this.form.get('dataType')?.setValidators([]);
      this.form.get('selectedDynamicClass')?.clearValidators();
    } else if (nodeType === 'generic') {
      this.form.get('name')?.clearValidators();
      this.form.get('description')?.clearValidators();
      this.form.get('value')?.clearValidators();
      this.form.get('dataType')?.clearValidators();
      this.form
        .get('selectedDynamicClass')
        ?.setValidators([Validators.required]);
    }

    this.form.get('name')?.updateValueAndValidity();
    this.form.get('description')?.updateValueAndValidity();
    this.form.get('value')?.updateValueAndValidity();
    this.form.get('dataType')?.updateValueAndValidity();
    this.form.get('selectedDynamicClass')?.updateValueAndValidity();
  }

  fetchNodeClasses(): void {
    this.flowService.getNodeClasses().subscribe(
      (response: any) => {
        this.dynamicClasses = response;
      },
      (error: any) => {
        console.error('Error fetching dynamic node classes:', error);
      }
    );
  }

  cancel(): void {
    this.dialogRef.close();
  }

  add(): void {
    if (this.form.valid) {
      this.isLoading = true;
      console.log(this.data)
      let nodeData: any;
      if (this.form.value.nodeType === 'data') {
        const { name, description, value, dataType } = this.form.value;
        nodeData = {
          flow_file: this.data.flowId,
          name: name,
          node_type: 'DataNode',
          description: description,
          value: value,
          type: dataType,
          source_connections: [],
          target_connections: [],
        };
      } else if (this.form.value.nodeType === 'generic') {
        nodeData = {
          flow_file: this.data.flowId,
          node_class: this.form.value.selectedDynamicClass,
          node_type: 'GenericNode',
          source_connections: [],
          target_connections: [],
        };
      }

      this.flowService.addNode(nodeData).subscribe(
        (response: any) => {
          const { id, source_connections, target_connections, ...rest } =
            response;
          const newDataNode = {
            id: id.toString(),
            type: 'custom',
            position: { x: 0, y: 0 },
            data: {
              id,
              label: 'Node',
              ...rest,
            },
          };
          this.data.setNodes([...this.data.nodes, newDataNode]);
          this.isLoading = false;
          this.dialogRef.close();
        },
        (error: any) => {
          console.error('Error creating node:', error);
          this.isLoading = false;
        }
      );
    }
  }
}
