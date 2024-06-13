import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Node, Edge } from 'reactflow';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private nodesSubject = new BehaviorSubject<Node[]>([]);
  private edgesSubject = new BehaviorSubject<Edge[]>([]);

  nodes$ = this.nodesSubject.asObservable();
  edges$ = this.edgesSubject.asObservable();

  setNodes(nodes: Node[]) {
    this.nodesSubject.next(nodes);
  }

  setEdges(edges: Edge[]) {
    this.edgesSubject.next(edges);
  }

  updateNodes(updater: (nodes: Node[]) => Node[]) {
    const currentNodes = this.nodesSubject.value;
    const updatedNodes = updater(currentNodes);
    this.setNodes(updatedNodes);
  }

  updateEdges(updater: (edges: Edge[]) => Edge[]) {
    const currentEdges = this.edgesSubject.value;
    const updatedEdges = updater(currentEdges);
    this.setEdges(updatedEdges);
  }
}
