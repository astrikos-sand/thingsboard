import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface ArchiveData {
  tree: any[];
  items: ArchiveFile[];
}

export interface ArchiveFile {
  prefix: any;
  id: string;
  name: string;
  file: string;
}

@Injectable({
  providedIn: "root",
})
export class ArchivesService {
  private apiUrl = "/backend/v2/archives";

  constructor(private http: HttpClient) {}

  getFileArchives(): Observable<ArchiveData> {
    return this.http.get<ArchiveData>(`${this.apiUrl}/page-data/`);
  }

  fetchFilesByParent(parentId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/page-data/`, {
      params: { parent: parentId }
    });
  }

  uploadFile(fileData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/`, fileData);
  }

  deleteFile(fileId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${fileId}/`);
  }
}
