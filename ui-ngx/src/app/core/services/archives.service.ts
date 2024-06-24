import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface ArchiveFile {
  id: number;
  filename: string;
  file: string;
  file_url: string;
}

@Injectable({
  providedIn: "root",
})
export class ArchivesService {
  private apiUrl = "http://localhost:8000/archives/";

  constructor(private http: HttpClient) {}

  getFileArchives(): Observable<ArchiveFile[]> {
    return this.http.get<ArchiveFile[]>(this.apiUrl);
  }

  uploadFile(fileData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, fileData);
  }

  deleteFile(fileId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}${fileId}/`);
  }
}
