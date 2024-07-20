import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FlowService {
  private baseUrl = "/backend/v2";

  constructor(private http: HttpClient) { }

  getNodeTypes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/fields/node_types/`);
  }

  getNodeFields(): Observable<any> {
    return this.http.get(`${this.baseUrl}/fields/node_fields/`);
  }

  getFormFields(nodeType: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/fields/form_fields/`, {
      params: { node_type: nodeType }
    });
  }

  fetchFlows(): Observable<any> {
    return this.http.get(`${this.baseUrl}/flow/`);
  }

  getNodeClasses(): Observable<any> {
    return this.http.get(`${this.baseUrl}/node-classes/`);
  }

  addFlow(flow: { name: string; description: string, lib: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/flow/`, flow);
  }

  addNode(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/nodes/`, data);
  }
  addBaseClass(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/file-upload/`, data);
  }

  fetchFlowDetails(flowId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/flow/${flowId}/nodes/`);
  }

  saveFlowDetails(flowId: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/save/`, {
      nodes: data.nodes,
      connections: data.connections,
      flow_id: flowId,
    });
  }

  createENV(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/env/`, formData);
  }

  getEnv(id?: string): Observable<any> {
    if (id) return this.http.get<any>(`${this.baseUrl}/env/${id}/`)
    return this.http.get<any>(`${this.baseUrl}/env/`);
  }

  executeFlow(flowId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/flow/${flowId}/execute/`, {});
  }

  updateDataNodeValue(flowId: string, nodeId: string, newValue: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/nodes/${nodeId}/`, {
      value: newValue,
    });
  }
}
