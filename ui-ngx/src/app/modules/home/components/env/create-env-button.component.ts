import { Component, OnInit, Renderer2, ViewContainerRef } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { TbPopoverService } from "@shared/components/popover.service";
import { CreateEnvPopoverComponent } from "./create-env-popover.component";

@Component({
  selector: "app-create-env-button",
  templateUrl: "./create-env-button.component.html",
})
export class CreateEnvButtonComponent implements OnInit {
  constructor(
    private popoverService: TbPopoverService,
    private renderer: Renderer2,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit(): void {}

  showCreateEnvPopover($event: Event, createEnvButton: MatButton): void {
    if ($event) {
      $event.stopPropagation();
    }
    const trigger = createEnvButton._elementRef.nativeElement;
    if (this.popoverService.hasPopover(trigger)) {
      this.popoverService.hidePopover(trigger);
    } else {
      const createEnvPopover = this.popoverService.displayPopover(
        trigger,
        this.renderer,
        this.viewContainerRef,
        CreateEnvPopoverComponent,
        "bottom",
        true,
        null,
        {
          onClose: () => {
            createEnvPopover.hide();
          },
        },
        { maxHeight: "90vh", height: "100%", padding: "10px" },
        { width: "400px", minWidth: "100%", maxWidth: "100%" },
        {
          height: "100%",
          flexDirection: "column",
          boxSizing: "border-box",
          display: "flex",
          margin: "0 -16px",
        },
        false
      );
      createEnvPopover.tbComponentRef.instance.envCreated.subscribe(() => {
        createEnvPopover.hide();
      });
      createEnvPopover.tbComponentRef.instance.popoverComponent = createEnvPopover;
    }
  }
}
