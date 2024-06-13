import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FlowService {
  private baseUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  fetchFlows(): Observable<any> {
    return this.http.get(`${this.baseUrl}/flows/`);
  }

  fetchFlowDetails(flowId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/flows/${flowId}/`);
  }

  saveFlowDetails(flowId: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/save/`, {
      nodes: data.nodes,
      connections: data.connections,
      flow_file_id: flowId
    }, {
      headers: this.getHeaders()
    });
  }

  executeFlow(flowId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/tasks/`, {
      file_id: flowId
    }, {
      headers: this.getHeaders()
    });
  }

  private getHeaders(): HttpHeaders {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-CSRFTOKEN': this.readCSRFToken()
    });
    return headers;
  }

  private readCSRFToken(): string | null {
    // Implement the logic to read CSRF token from cookies or meta tags
    const name = 'csrftoken';
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
  }
}
