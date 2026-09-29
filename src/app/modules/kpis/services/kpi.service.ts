import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  CreateDefaultsResult,
  CreateKpiRequest,
  Kpi,
  KpiCategory,
  KpiHistory,
  KpiSummary,
  MetricDefinition,
  RecalculateResult,
  RecordKpiValueRequest,
} from '../../../core/models/kpi.model';

function data<T>(response: ApiResponse<T>): T {
  if (response.data === null) throw new Error(response.error?.message ?? 'Request failed');
  return response.data;
}

@Injectable({ providedIn: 'root' })
export class KpiService {
  private readonly http = inject(HttpService);

  catalog(): Observable<MetricDefinition[]> {
    return this.http.get<MetricDefinition[]>('/kpi/catalog').pipe(map(data));
  }

  list(clientId: string, category?: KpiCategory): Observable<Kpi[]> {
    return this.http.get<Kpi[]>(`/kpi/client/${clientId}`, { category }).pipe(map(data));
  }

  summary(clientId: string): Observable<KpiSummary> {
    return this.http.get<KpiSummary>(`/kpi/client/${clientId}/summary`).pipe(map(data));
  }

  get(id: string): Observable<Kpi> {
    return this.http.get<Kpi>(`/kpi/${id}`).pipe(map(data));
  }

  history(id: string, days: number): Observable<KpiHistory> {
    return this.http.get<KpiHistory>(`/kpi/${id}/history`, { days }).pipe(map(data));
  }

  create(request: CreateKpiRequest): Observable<Kpi> {
    return this.http.post<Kpi>('/kpi', request).pipe(map(data));
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<unknown>(`/kpi/${id}`).pipe(map(() => undefined));
  }

  recordValue(id: string, request: RecordKpiValueRequest): Observable<Kpi> {
    return this.http.post<Kpi>(`/kpi/${id}/values`, request).pipe(map(data));
  }

  createDefaults(clientId: string): Observable<CreateDefaultsResult> {
    return this.http.post<CreateDefaultsResult>(`/kpi/client/${clientId}/defaults`, {}).pipe(map(data));
  }

  recalculate(clientId: string): Observable<RecalculateResult> {
    return this.http.post<RecalculateResult>(`/kpi/client/${clientId}/recalculate`, {}).pipe(map(data));
  }
}
