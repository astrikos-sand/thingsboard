import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Webhook {
  tags: any;
  id: string;
  target: string;
}

export interface Tag {
  id: string;
  full_name: string;
  name: string;
  parent: string | null;
}

export interface Task {
  name: string;
  interval: { every: number } | null;
  crontab: any | null;
}

export interface PeriodicTrigger {
  id: string;
  target: string;
  tags: Tag[];
  name: string;
  interval?: {
    every: number;
  };
  crontab?: {
    timezone: string;
    month_of_year: number;
    day_of_month: number;
    minute: number;
    hour: number;
  };
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

  getPeriodicTriggers(): Observable<PeriodicTrigger[]> {
    return this.http.get<PeriodicTrigger[]>(`${this.apiUrl}periodic/`);
  }

  addPeriodicTrigger(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}periodic/`, data);
  }

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}tasks/`);
  }
}
