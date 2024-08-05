import { Component, OnInit } from "@angular/core";
import { FlowService } from "@app/core/services/flow.service";
import { AddFlowDialogComponent } from "./add-flow-dialog.component";
import { TagService } from "@app/core/services/tag.service";
import { Clipboard } from "@angular/cdk/clipboard";
import { MatDialog } from "@angular/material/dialog";

@Component({
  selector: "app-flow-list",
  templateUrl: "./flow-list.component.html",
})
export class FlowListComponent implements OnInit {
  addFlowDialogComponent = AddFlowDialogComponent;

  columns = [
    {
      columnDef: "id",
      header: "Flow ID",
      cell: (element: any) => `${element.id}`,
    },
    {
      columnDef: "name",
      header: "Flow Name",
      cell: (element: any) => `${element.name}`,
    },
    {
      columnDef: "description",
      header: "Description",
      cell: (element: any) => `${element.description}`,
    },
    {
      columnDef: "environment",
      header: "Environment",
      cell: (element: any) => `${element.environment?.name}`,
    },
  ];

  actions = [
    {
      icon: "open_in_new",
      tooltip: "Open Flow",
      callback: (item: any) => this.openFlow(item.id),
    },
    {
      icon: "folder_open",
      tooltip: "Open Environment File",
      callback: (item: any, event: Event) =>
        this.openEnvironmentFile(event, item.environment?.requirements),
    },
    {
      icon: "content_copy",
      tooltip: "Copy Flow ID",
      callback: (item: any) => this.copyId(item.id),
    },
  ];

  constructor(
    public flowService: FlowService,
    public tagService: TagService,
    private clipboard: Clipboard,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {}

  openFlow(flowId: string): void {
    window.open(`/flows/library/${flowId}`, "_blank");
  }

  openEnvironmentFile(event: Event, filePath: string): void {
    event.stopPropagation();
    window.open(filePath, "_blank");
  }

  copyId(id: string) {
    this.clipboard.copy(id);
    alert("Copied ID: " + id);
  }
}
