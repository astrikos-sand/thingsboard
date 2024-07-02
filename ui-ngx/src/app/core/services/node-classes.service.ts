import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export type NodeClass = {
  id: string;
  name: string;
  description: string;
  code: string;
}

@Injectable({
  providedIn: "root",
})
export class NodeClassService {
  private baseUrl = "/backend";

  constructor(private http: HttpClient) {}

  getNodeClasses(): Observable<NodeClass[]> {
    return this.http.get<NodeClass[]>(`${this.baseUrl}/node-classes/`);
  }

  addBaseClass(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/file-upload/`, data);
  }

  deleteFile(fileId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/node-classes/${fileId}/`);
  }
}
