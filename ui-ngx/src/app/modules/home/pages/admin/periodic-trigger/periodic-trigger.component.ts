import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Clipboard } from '@angular/cdk/clipboard';
import { PeriodicTriggerDialogComponent } from './dialog.component';
import {
  PeriodicTrigger,
  TriggerService,
} from '@app/core/services/trigger.service';
import { TagService } from '@app/core/services/tag.service';

@Component({
  selector: "app-periodic-trigger",
  templateUrl: "./periodic-trigger.component.html",
  styleUrls: ["./periodic-trigger.component.scss"],
})
export class PeriodicTriggerComponent implements OnInit {
  addTriggerDialogComponent = PeriodicTriggerDialogComponent;

  columns = [
    {
      columnDef: 'id',
      header: 'Id',
      cell: (element: any) => `${element.id.slice(0, 7)}`
    },
    {
      columnDef: 'target',
      header: 'Target',
      cell: (element: any) => `<a href="/flows/library/${element.target}">${element.target.slice(0, 7)}</a>`
    },
    {
      columnDef: 'task',
      header: 'Task',
      cell: (element: any) => `${element.task.name}`
    },
    {
      columnDef: 'tags',
      header: 'Tags',
      cell: (element: any) => {
        if (element.tags && element.tags.length > 0) {
          return element.tags.map(tag => tag.full_name).join(', ');
        }
        return 'No tags';
      }
    }
  ];

  actions = [
    {
      icon: 'content_copy',
      tooltip: 'Copy Periodic Trigger Endpoint',
      callback: (item: any) => this.copyPeriodicTriggerEndpoint(item.id),
    }
  ];

  constructor(
    public triggerService: TriggerService,
    public tagService: TagService,
    private clipboard: Clipboard,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {}

  copyPeriodicTriggerEndpoint(id: string): void {
    const endpoint = `${window.location.origin}/backend/triggers/periodic/${id}/execute/`;
    this.clipboard.copy(endpoint);
    alert('Copied Endpoint: ' + endpoint);
  }
}
