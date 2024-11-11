import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface EnvData {
  tree: any[];
  items: EnvFile[];
}

export interface EnvFile {
  id: string;
  name: string;
  requirements: string;
}

@Injectable({
  providedIn: "root",
})
export class EnvService {
  private apiUrl = "/backend/v2/env";

  constructor(private http: HttpClient) {}

  getEnvs(): Observable<EnvData> {
    return this.http.get<EnvData>(`${this.apiUrl}/page-data/`);
  }

  fetchEnvsByParent(parentId: string): Observable<EnvData> {
    return this.http.get<EnvData>(`${this.apiUrl}/page-data/`, {
      params: { parent: parentId },
    });
  }

  createEnv(envData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/`, envData);
  }

  deleteEnv(envId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${envId}/`);
  }

  searchEnvs(query: string, type: string): Observable<EnvData> {
    const body = { query };
    return this.http.post<EnvData>(`${this.apiUrl}/search/items/`, body, {
      params: { type },
    });
  }
}
