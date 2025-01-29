import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class KpiService {
  private baseUrl = "/backend/v2/kpi/";

  constructor(private http: HttpClient) { }

  fetchKpis(parentId: string | null = null): Observable<any> {
    let params = new HttpParams();
    if (parentId) {
      params = params.set("parent", parentId);
    }
    return this.http.get(`${this.baseUrl}page-data/`, { params });
  }

  addKpi(kpi: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, kpi);
  }

  editKpi(kpiId: string, kpi: any): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}${kpiId}/`, kpi);
  }

  deleteKpi(kpiId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}${kpiId}/`);
  }

  duplicateKpi(kpiId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}duplicate/`, { kpi: kpiId });
  }

  getPrefixes(type: string): Observable<any> {
    return this.http.get(`${this.baseUrl}prefix/by-type/`, {
      params: { type },
    });
  }

  getCalculations(kpiId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}${kpiId}/calculations/`);
  }

  getTelemetry(calculationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}${calculationId}/telemetry/`);
  }

  // Add more methods as needed
}
