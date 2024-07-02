import { Component, OnInit, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { FlowService } from "@app/core/services/flow.service";
import { MatDialog } from "@angular/material/dialog";
import { AddFlowDialogComponent } from "./add-flow-dialog.component";
import { MatTableDataSource } from "@angular/material/table";
import { PageEvent } from "@angular/material/paginator";
import { MatSort, Sort } from "@angular/material/sort";

@Component({
  selector: "app-flow-list",
  templateUrl: "./flow-list.component.html",
  styleUrls: ["./flow-list.component.scss"],
})
export class FlowListComponent implements OnInit {
  flows: any[] = [];
  displayedColumns: string[] = [
    "id",
    "name",
    "description",
    "environment",
    "actions",
  ];
  dataSource = new MatTableDataSource<any>(this.flows);
  totalFlows = 0;
  pageIndex = 0;
  pageSize = 10;

  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private flowService: FlowService,
    private router: Router,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.fetchFlows();
  }

  fetchFlows(): void {
    this.flowService.fetchFlows().subscribe(
      async (data) => {
        this.flows = data;
        await this.loadEnvironmentDetails();
        this.dataSource.data = this.flows;
        this.totalFlows = data.length;
        this.dataSource.sort = this.sort;
        this.updatePagedData();
      },
      (error) => {
        console.error("Error fetching flows:", error);
      }
    );
  }

  async loadEnvironmentDetails(): Promise<void> {
    for (const flow of this.flows) {
      try {
        const env = await this.flowService.getEnv(flow.environment).toPromise();
        flow.environment = env;
      } catch (error) {
        console.error("Error fetching environment details:", error);
      }
    }
  }

  handlePageEvent(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagedData();
  }

  updatePagedData(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.dataSource.data = this.flows.slice(startIndex, endIndex);
  }

  openFlow(flowId: string): void {
    this.router.navigate([`resources/flows/${flowId}`]);
  }

  openEnvironmentFile(event: Event, filePath: string): void {
    event.stopPropagation();
    window.open(filePath, "_blank");
  }

  export_flow(event: Event, flowId: string): void {
    event.stopPropagation();
    window.open(`/backend/tasks/${flowId}/export_flow/`, "_blank");
  }

  sortData(sort: Sort): void {
    const data = this.flows.slice();
    if (!sort.active || sort.direction === "") {
      this.dataSource.data = data;
      return;
    }

    this.dataSource.data = data.sort((a, b) => {
      const isAsc = sort.direction === "asc";
      switch (sort.active) {
        case "id":
          return compare(a.id, b.id, isAsc);
        case "name":
          return compare(a.name, b.name, isAsc);
        case "description":
          return compare(a.description, b.description, isAsc);
        case "environment":
          return compare(a.environment.name, b.environment.name, isAsc);
        default:
          return 0;
      }
    });
    this.updatePagedData();
  }

  openAddFlowDialog(): void {
    const dialogRef = this.dialog.open(AddFlowDialogComponent);

    dialogRef.afterClosed().subscribe((result) => {
      this.fetchFlows();
    });
  }
}

function compare(
  a: number | string,
  b: number | string,
  isAsc: boolean
): number {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
