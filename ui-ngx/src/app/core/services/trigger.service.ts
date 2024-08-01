import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Webhook {
  tags: any;
  id: string;
  target: string;
}

@Injectable({
  providedIn: "root",
})
export class TriggerService {
  private apiUrl = "/backend/triggers/";

  constructor(private http: HttpClient) {}

  getWebhooks(): Observable<Webhook[]> {
    return this.http.get<Webhook[]>(`${this.apiUrl}webhook/`);
  }

  addWebhook(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}webhook/`, data);
  }
}
