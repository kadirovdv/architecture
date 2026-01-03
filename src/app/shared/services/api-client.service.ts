import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpContext,
  HttpHeaders,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

type HttpOptions = {
  headers?: HttpHeaders | Record<string, string | string[]>;
  params?: HttpParams | Record<string, string | number | boolean | (string | number | boolean)[]>;
  context?: HttpContext;
  observe?: 'body';
  responseType?: 'json';
  withCredentials?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  private readonly baseUrl = (environment as any)?.apiBaseUrl
    ? String((environment as any).apiBaseUrl).replace(/\/+$/, '')
    : '';

  constructor(private http: HttpClient) {}

  private buildUrl(pathOrUrl: string): string {
    if (!pathOrUrl) return this.baseUrl;
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${this.baseUrl}${path}`;
  }

  private defaultWithCredentials(pathOrUrl: string, options?: HttpOptions): boolean {
    if (typeof options?.withCredentials === 'boolean') return options.withCredentials;
    // Default: send cookies for API calls.
    return pathOrUrl.startsWith('/api') || pathOrUrl.includes('/api/');
  }

  get<T>(pathOrUrl: string, options?: HttpOptions): Observable<T> {
    return this.http.get<T>(this.buildUrl(pathOrUrl), {
      ...options,
      withCredentials: this.defaultWithCredentials(pathOrUrl, options),
    });
  }

  post<T>(pathOrUrl: string, body?: any, options?: HttpOptions): Observable<T> {
    return this.http.post<T>(this.buildUrl(pathOrUrl), body ?? {}, {
      ...options,
      withCredentials: this.defaultWithCredentials(pathOrUrl, options),
    });
  }

  patch<T>(pathOrUrl: string, body?: any, options?: HttpOptions): Observable<T> {
    return this.http.patch<T>(this.buildUrl(pathOrUrl), body ?? {}, {
      ...options,
      withCredentials: this.defaultWithCredentials(pathOrUrl, options),
    });
  }

  delete<T>(pathOrUrl: string, options?: HttpOptions): Observable<T> {
    return this.http.delete<T>(this.buildUrl(pathOrUrl), {
      ...options,
      withCredentials: this.defaultWithCredentials(pathOrUrl, options),
    });
  }
}


