import {
  Component,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ViewContainerRef,
  Input,
  ViewEncapsulation,
  EventEmitter,
  Output,
} from "@angular/core";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import { Node, Edge } from "reactflow";
import { ReactFlowWrappableComponent } from "./reactflow";

@Component({
  selector: "reactflow-wrapper",
  template: ``,
  styleUrls: ["../../../../../../../node_modules/reactflow/dist/style.css"],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
})
export class ReactFlowWrapper implements OnChanges, OnDestroy, AfterViewInit {
  private root: Root = null!;

  @Input() nodes?: Node<any>[] | undefined;
  @Input() edges?: Edge<any>[] | undefined;
  @Input() openEditingDialogBox?: any | undefined;
  @Input() saveFlow?: any | undefined;
  @Input() onDropNodeToBackend?: (nodeData: any) => void;
  @Output() onOpenEditingDialogBox = new EventEmitter<Node<any>[]>();
  @Output() nodesChange = new EventEmitter<Node<any>[]>();
  @Output() edgesChange = new EventEmitter<Edge<any>[]>();
  @Output() connectionsChange = new EventEmitter<any>();
  @Output() positionChange = new EventEmitter<any>();
  @Output() onSaveFlow = new EventEmitter<any>();

  constructor(private viewContainerRef: ViewContainerRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.render();
  }

  ngAfterViewInit() {
    this.render();
  }

  ngOnDestroy() {
    if (this.root) {
      this.root.unmount();
    }
  }

  private render() {
    if (!this.root) {
      this.root = createRoot(this.viewContainerRef.element.nativeElement);
    }

    this.root.render(
      React.createElement(ReactFlowWrappableComponent, {
        props: {
          nodes: this.nodes,
          edges: this.edges,
          saveFlow: this.saveFlow,
          onDropNodeToBackend: this.handleDropNodeToBackend.bind(this),
          openEditingDialogBox: this.openEditingDialogBox,
          onNodesChange: this.handleNodesChange.bind(this),
          onEdgesChange: this.handleEdgesChange.bind(this),
          onConnectionsChange: this.handleConnectionsChange.bind(this),
          onSetPosition: this.handleSetPosition.bind(this),
          onOpenEditingDialogBox: this.handleOpeningDialogBox.bind(this),
        },
      })
    );
  }
  private handleDropNodeToBackend(nodeData: any) {
    if (this.onDropNodeToBackend) {
      this.onDropNodeToBackend(nodeData);
    }
  }

  private handleOpeningDialogBox(nodeData: Node[]) {
    this.onOpenEditingDialogBox.emit(nodeData);
  }

  private handleNodesChange(updatedNodes: Node[]) {
    this.nodesChange.emit(updatedNodes);
  }

  private handleEdgesChange(updatedEdges: Edge[]) {
    this.edgesChange.emit(updatedEdges);
  }

  private handleConnectionsChange(connection: any) {
    this.connectionsChange.emit(connection);
  }

  private handleSetPosition(position: any) {
    this.positionChange.emit(position);
  }
}
