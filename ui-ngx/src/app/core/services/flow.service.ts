import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class FlowService {
  private baseUrl = "/backend/v2";

  constructor(private http: HttpClient) { }

  fetchFlows(): Observable<any> {
    return this.http.get(`${this.baseUrl}/flows/`);
  }

  getNodeClasses(): Observable<any> {
    return this.http.get(`${this.baseUrl}/node-classes/`);
  }

  addFlow(flow: { name: string; description: string, environment: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/flows/create_file/`, flow);
  }

  addNode(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/nodes/`, data);
  }
  addBaseClass(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/file-upload/`, data);
  }

  fetchFlowDetails(flowId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/flows/${flowId}/`);
  }

  saveFlowDetails(flowId: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/save/`, {
      nodes: data.nodes,
      connections: data.connections,
      flow_file_id: flowId,
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
    return this.http.post(`${this.baseUrl}/tasks/`, {
      file_id: flowId,
    });
  }
}
