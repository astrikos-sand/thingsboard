import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface RepositoryData {
  tree: any[];
  items: RepositoryFile[];
}

export interface RepositoryFile {
  id: string;
  name: string;
  description: string;
  status: string;
}

@Injectable({
  providedIn: "root",
})
export class RepositoryService {
  private apiUrl = "/backend/v2/data-transfer";

  constructor(private http: HttpClient) {}

  getFileRepositories(): Observable<RepositoryData> {
    return this.http.get<RepositoryData>(`${this.apiUrl}/page-data/`);
  }

  fetchFilesByParent(parentId: string): Observable<RepositoryData> {
    return this.http.get<RepositoryData>(`${this.apiUrl}/page-data/`, {
      params: { parent: parentId },
    });
  }

  uploadFile(fileData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/`, fileData);
  }

  deleteFile(fileId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${fileId}/`);
  }

  importData(importData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/import/`, importData);
  }

  exportData(exportData: {
    name: string;
    description: string;
    flows: string[];
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/export/`, exportData);
  }
}
