import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class FlowService {
  private baseUrl = "/backend/v2";

  constructor(private http: HttpClient) {}

  getNodeTypes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/fields/node_types/`);
  }

  getNodeFields(): Observable<any> {
    return this.http.get(`${this.baseUrl}/fields/node_fields/`);
  }

  getFormFields(nodeType: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/fields/form_fields/`, {
      params: { node_type: nodeType },
    });
  }

  fetchFlows(): Observable<any> {
    return this.http.get(`${this.baseUrl}/flows/page-data/`);
  }

  fetchFlowsByParent(parentId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/flows/page-data/`, {
      params: { parent: parentId },
    });
  }

  getNodeClasses(): Observable<any> {
    return this.http.get(`${this.baseUrl}/node-classes/`);
  }

  addFlow(flow: {
    name: string;
    description: string;
    lib: string;
    prefix: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/flows/`, flow);
  }

  addNode(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/nodes/`, data);
  }

  addFunction(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/functions/`, data);
  }

  getPrefixes(type: string) {
    return this.http.get(`${this.baseUrl}/prefix/by-type/?type=${type}`);
  }  

  createPrefix(data: any, type: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/prefix/?type=${type}`, data);
  }

  fetchFlowDetails(flowId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/flows/${flowId}/nodes/`);
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
    if (id) return this.http.get<any>(`${this.baseUrl}/env/${id}/`);
    return this.http.get<any>(`${this.baseUrl}/env/`);
  }

  updateDataNodeValue(
    flowId: string,
    nodeId: string,
    newValue: string
  ): Observable<any> {
    return this.http.patch(`${this.baseUrl}/nodes/${nodeId}/`, {
      value: newValue,
    });
  }

  duplicateFlow(flowId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/flows/${flowId}/duplicate/`, {});
  }

  getExecutions(flowId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/flows/${flowId}/executions/`, {});
  }
}
