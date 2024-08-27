import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface ArchiveFile {
  tags: any;
  id: string;
  filename: string;
  file: string;
}

@Injectable({
  providedIn: "root",
})
export class ArchivesService {
  private apiUrl = "/backend/v2/archives/";

  constructor(private http: HttpClient) {}

  getFileArchives(): Observable<ArchiveFile[]> {
    return this.http.get<ArchiveFile[]>(this.apiUrl);
  }

  uploadFile(fileData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, fileData);
  }

  deleteFile(fileId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}${fileId}/`);
  }
}
