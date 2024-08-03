import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, map } from "rxjs";
import { ArchiveFile } from "./archives.service";

export interface Tag {
  id: string;
  children: any[];
  full_name: string;
  created_at: string;
  updated_at: string;
  name: string;
  parent: string;
}

@Injectable({
  providedIn: "root",
})
export class TagService {
  private apiUrl = "http://localhost:8000/v2/tags/";

  constructor(private http: HttpClient) {}

  getTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(this.apiUrl);
  }

  searchTagByName(name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}search/`, {
      names: [name],
      exact_match: true,
    });
  }

  getRootTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}root_tags/`);
  }

  getOrganizedTags(parent?: number): Observable<Tag[]> {
    const url = parent
      ? `${this.apiUrl}organized_tags/?parent=${parent}`
      : `${this.apiUrl}organized_tags/`;
    return this.http.get<Tag[]>(url);
  }

  getTagById(id: string): Observable<Tag> {
    return this.http.get<Tag>(`${this.apiUrl}${id}`);
  }

  getTagsByIds(ids: string[]): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}?ids=${ids.join(",")}`);
  }

  getAllChildren(tagId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}${tagId}/all_children`).pipe(
      map((response: { children: any; }) => {
        if (response && response.children) {
          return response.children;
        } else {
          console.error('Unexpected response format:', response);
          return [];
        }
      })
    );
  }

  createTag(tagData: { name: string; parent: string }): Observable<Tag> {
    return this.http.post<Tag>(this.apiUrl, tagData);
  }

  getItemsByTagId(tagId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}${tagId}/items/`);
  }

  getAllChildrenByName(name: string): Observable<Tag> {
    return this.http.get<Tag>(`${this.apiUrl}all_children/?name=${name}`);
  }

  createItem(itemType: string, payload: any, isFormData: boolean = true): Observable<any> {
    let headers = new HttpHeaders();
    let body: any;

    if (isFormData) {
      body = payload;
      body.append('item_type', itemType);
    } else {
      headers = headers.set('Content-Type', 'application/json');
      body = { ...payload, item_type: itemType };
    }

    return this.http.post<any>(`${this.apiUrl}create_item/`, body, { headers });
  }
}
