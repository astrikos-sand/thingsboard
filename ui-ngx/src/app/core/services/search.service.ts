import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class SearchService {
  private apiUrl = "/backend/v2/search/items";

  constructor(private http: HttpClient) {}

  searchItems(query: string, itemType: string): Observable<any> {
    const body = { query };
    const params = { type: itemType };
    return this.http.post<any>(`${this.apiUrl}/`, body, { params });
  }
}
