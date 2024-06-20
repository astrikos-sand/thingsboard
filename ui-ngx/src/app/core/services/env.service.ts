import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class EnvService {
  private baseUrl = "http://localhost:8000";

  constructor(private http: HttpClient) {}

  createENV(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/env/`, formData);
  }

  getEnv(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/env/`);
  }
}
