import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  CreateDashboardRequest,
  Dashboard,
  DashboardData,
  DashboardType,
  UpdateDashboardRequest,
} from '../../../core/models/dashboard.model';
import { RecalculateResult } from '../../../core/models/kpi.model';

function data<T>(response: ApiResponse<T>): T {
  if (response.data === null) throw new Error(response.error?.message ?? 'Request failed');
  return response.data;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpService);

  list(clientId: string, type?: DashboardType): Observable<Dashboard[]> {
    return this.http.get<Dashboard[]>(`/dashboard/client/${clientId}`, { type }).pipe(map(data));
  }

  get(id: string): Observable<Dashboard> {
    return this.http.get<Dashboard>(`/dashboard/${id}`).pipe(map(data));
  }

  data(id: string): Observable<DashboardData> {
    return this.http.get<DashboardData>(`/dashboard/${id}/data`).pipe(map(data));
  }

  create(request: CreateDashboardRequest): Observable<Dashboard> {
    return this.http.post<Dashboard>('/dashboard', request).pipe(map(data));
  }

  update(id: string, request: UpdateDashboardRequest): Observable<Dashboard> {
    return this.http.put<Dashboard>(`/dashboard/${id}`, request).pipe(map(data));
  }

  refreshKpis(id: string): Observable<RecalculateResult> {
    return this.http.post<RecalculateResult>(`/dashboard/${id}/refresh-kpis`, {}).pipe(map(data));
  }

  archive(id: string): Observable<void> {
    return this.http.delete<unknown>(`/dashboard/${id}`).pipe(map(() => undefined));
  }
}
