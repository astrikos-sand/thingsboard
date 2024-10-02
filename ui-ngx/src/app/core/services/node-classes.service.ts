import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface FunctionData {
  tree: any[];
  items: any[];
}

@Injectable({
  providedIn: "root",
})
export class NodeClassService {
  private baseUrl = "http://127.0.0.1:8000/v2/functions";

  constructor(private http: HttpClient) {}

  fetchFunctions(): Observable<FunctionData> {
    return this.http.get<FunctionData>(`${this.baseUrl}/page-data`);
  }

  fetchFunctionsByParent(prefixId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/page-data/`, {
      params: { parent: prefixId }
    });
  }

  updateFunction(functionData: any): Observable<any> {
    return this.http.put(`/api/functions/${functionData.id}/`, functionData);
  }  
  
  addBaseClass(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/`, data);
  }

  deleteFile(fileId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${fileId}/`);
  }
}
