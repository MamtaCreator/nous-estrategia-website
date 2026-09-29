import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HttpService } from '../../../core/services/http.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  Alert, AppNotification, AuditLog, CreateAlertRequest, CreateReportRequest, GenerateInsightsResult, Insight,
  NotificationSummary, ReportExecution, ReportFormat, SavedReport, SearchResponse, UpdateAlertRequest,
} from '../../../core/models/phase4.model';

function data<T>(r: ApiResponse<T>): T {
  if (r.data === null) throw new Error(r.error?.message ?? 'Request failed');
  return r.data;
}

const FILENAME = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i;

/** One thin client for the Phase 4 endpoints (alerts, notifications, insights, audit, search, saved reports). */
@Injectable({ providedIn: 'root' })
export class Phase4Service {
  private readonly http = inject(HttpService);
  private readonly raw = inject(HttpClient);

  alerts(clientId: string): Observable<Alert[]> { return this.http.get<Alert[]>(`/alerts/client/${clientId}`).pipe(map(data)); }
  createAlert(r: CreateAlertRequest): Observable<Alert> { return this.http.post<Alert>('/alerts', r).pipe(map(data)); }
  updateAlert(id: string, r: UpdateAlertRequest): Observable<Alert> { return this.http.put<Alert>(`/alerts/${id}`, r).pipe(map(data)); }
  deleteAlert(id: string): Observable<void> { return this.http.delete<unknown>(`/alerts/${id}`).pipe(map(() => undefined)); }

  notificationSummary(): Observable<NotificationSummary> { return this.http.get<NotificationSummary>('/notifications/summary').pipe(map(data)); }
  notifications(clientId: string, unreadOnly: boolean): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`/notifications/client/${clientId}`, { unreadOnly }).pipe(map(data));
  }
  markRead(id: string): Observable<void> { return this.http.post<unknown>(`/notifications/${id}/read`, {}).pipe(map(() => undefined)); }
  markAllRead(clientId: string): Observable<void> { return this.http.post<unknown>(`/notifications/client/${clientId}/read-all`, {}).pipe(map(() => undefined)); }

  insights(clientId: string): Observable<Insight[]> { return this.http.get<Insight[]>(`/insights/client/${clientId}`).pipe(map(data)); }
  generateInsights(clientId: string): Observable<GenerateInsightsResult> { return this.http.post<GenerateInsightsResult>(`/insights/client/${clientId}/generate`, {}).pipe(map(data)); }
  actionInsight(id: string): Observable<void> { return this.http.post<unknown>(`/insights/${id}/action`, {}).pipe(map(() => undefined)); }

  audit(clientId: string, entityType?: string): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`/audit/client/${clientId}`, { entityType }).pipe(map(data));
  }

  search(q: string, clientId?: string): Observable<SearchResponse> { return this.http.get<SearchResponse>('/search', { q, clientId }).pipe(map(data)); }

  reports(clientId: string): Observable<SavedReport[]> { return this.http.get<SavedReport[]>(`/reports/client/${clientId}`).pipe(map(data)); }
  createReport(r: CreateReportRequest): Observable<SavedReport> { return this.http.post<SavedReport>('/reports', r).pipe(map(data)); }
  deleteReport(id: string): Observable<void> { return this.http.delete<unknown>(`/reports/${id}`).pipe(map(() => undefined)); }
  executions(id: string): Observable<ReportExecution[]> { return this.http.get<ReportExecution[]>(`/reports/${id}/executions`).pipe(map(data)); }

  /** Generates the report now and saves the streamed file in the browser; returns the file name. */
  downloadReport(id: string, format?: ReportFormat): Observable<string> {
    const query = format ? `?format=${format.toLowerCase()}` : '';
    return this.raw.get(`${environment.apiUrl}/reports/${id}/generate${query}`, { responseType: 'blob', observe: 'response' }).pipe(
      map((res: HttpResponse<Blob>) => {
        const match = FILENAME.exec(res.headers.get('content-disposition') ?? '');
        const name = match ? decodeURIComponent(match[1]) : `report.${(format ?? 'pdf').toLowerCase()}`;
        const url = URL.createObjectURL(res.body as Blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return name;
      }),
    );
  }
}
