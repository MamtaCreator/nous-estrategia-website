import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { NotificationService } from './notification.service';

function toParams(params?: object): HttpParams {
  let httpParams = new HttpParams();
  if (!params) return httpParams;
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      httpParams = httpParams.set(key, String(value));
    }
  }
  return httpParams;
}

// Thin wrapper around HttpClient that prefixes the API base URL and types every response
// as the backend's real ApiResponse<T> envelope (success/data/error/pagination).
@Injectable({ providedIn: 'root' })
export class HttpService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly notifications = inject(NotificationService);

  private checked<T>(request: Observable<ApiResponse<T>>): Observable<ApiResponse<T>> {
    return request.pipe(
      map((response) => {
        if (!response || !response.success) {
          const message = response?.error?.message ?? 'The request could not be completed.';
          this.notifications.error(message);
          throw new Error(message);
        }
        return response;
      }),
    );
  }

  get<T>(endpoint: string, params?: object): Observable<ApiResponse<T>> {
    return this.checked(
      this.http.get<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, { params: toParams(params) }),
    );
  }

  post<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.checked(this.http.post<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, body));
  }

  put<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.checked(this.http.put<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, body));
  }

  patch<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.checked(this.http.patch<ApiResponse<T>>(`${this.apiUrl}${endpoint}`, body));
  }

  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    return this.checked(this.http.delete<ApiResponse<T>>(`${this.apiUrl}${endpoint}`));
  }
}
