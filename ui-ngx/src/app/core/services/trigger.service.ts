import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Tag {
  id: string;
  full_name: string;
  name: string;
  parent: string | null;
}

export interface Webhook {
  id: string;
  target: string;
  tags: Tag[];
  name: string;
}

export interface WebhookData {
  tree: any[];
  items: Webhook[];
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
  task: {
    name: string;
    interval: string | null;
    crontab: {
      minute: string;
      hour: string;
      day_of_week: string;
      day_of_month: string;
      month_of_year: string;
      timezone: string;
    } | null;
  };
}

export interface PeriodicTriggerData {
  tree: any[];
  items: PeriodicTrigger[];
}

@Injectable({
  providedIn: "root",
})
export class TriggerService {
  private apiUrl = "/backend/triggers/";

  constructor(private http: HttpClient) {}

  getPeriodicTriggers(): Observable<PeriodicTriggerData> {
    return this.http.get<PeriodicTriggerData>(
      `${this.apiUrl}periodic/page-data/`
    );
  }

  fetchTriggersByParent(parentId: string): Observable<PeriodicTriggerData> {
    return this.http.get<PeriodicTriggerData>(
      `${this.apiUrl}periodic/page-data/`,
      {
        params: { parent: parentId },
      }
    );
  }

  // New method for searching periodic triggers
  searchPeriodicTriggers(
    query: string
  ): Observable<PeriodicTriggerData> {
    return this.http.get<PeriodicTriggerData>(
      `${this.apiUrl}periodic/search/`,
      {
        params: { q: query },
      }
    );
  }

  addPeriodicTrigger(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}periodic/`, data);
  }

  deletePeriodicTrigger(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}periodic/${id}/`);
  }

  getWebhooks(): Observable<WebhookData> {
    return this.http.get<WebhookData>(`${this.apiUrl}webhook/page-data/`);
  }

  // Fetch child webhooks by parent ID
  fetchWebhooksByParent(parentId: string): Observable<WebhookData> {
    return this.http.get<WebhookData>(`${this.apiUrl}webhook/page-data/`, {
      params: { parent: parentId },
    });
  }

  // Search webhooks
  searchWebhooks(query: string): Observable<WebhookData> {
    return this.http.get<WebhookData>(`${this.apiUrl}webhook/search/`, {
      params: { q: query },
    });
  }

  addWebhook(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}webhook/`, data);
  }

  deleteWebhook(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}webhook/${id}/`);
  }

}
