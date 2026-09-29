import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HttpService } from '../../../core/services/http.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  AssessmentDetail, AssessmentRecommendation, AssessmentReport, AssessmentTemplateSummary, ClientAssessment,
  RecommendationStatus, SaveAnswersResult, SavedAnswer,
} from '../../../core/models/assessment.model';

function data<T>(r: ApiResponse<T>): T {
  if (r.data === null) throw new Error(r.error?.message ?? 'Request failed');
  return r.data;
}

const FILENAME = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i;

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private readonly http = inject(HttpService);
  private readonly raw = inject(HttpClient);

  templates(): Observable<AssessmentTemplateSummary[]> { return this.http.get<AssessmentTemplateSummary[]>('/assessments/templates').pipe(map(data)); }
  list(clientId: string): Observable<ClientAssessment[]> { return this.http.get<ClientAssessment[]>(`/assessments/client/${clientId}`).pipe(map(data)); }
  start(clientId: string, templateId: string): Observable<ClientAssessment> {
    return this.http.post<ClientAssessment>(`/assessments/client/${clientId}`, { templateId }).pipe(map(data));
  }
  get(id: string): Observable<AssessmentDetail> { return this.http.get<AssessmentDetail>(`/assessments/${id}`).pipe(map(data)); }
  saveAnswers(id: string, answers: SavedAnswer[]): Observable<SaveAnswersResult> {
    return this.http.put<SaveAnswersResult>(`/assessments/${id}/answers`, { answers }).pipe(map(data));
  }
  submit(id: string): Observable<AssessmentReport> { return this.http.post<AssessmentReport>(`/assessments/${id}/submit`, {}).pipe(map(data)); }
  report(id: string): Observable<AssessmentReport> { return this.http.get<AssessmentReport>(`/assessments/${id}/report`).pipe(map(data)); }
  updateRecommendation(id: string, status: RecommendationStatus): Observable<AssessmentRecommendation> {
    return this.http.put<AssessmentRecommendation>(`/assessments/recommendations/${id}/status`, { status }).pipe(map(data));
  }

  /** Downloads the report as pdf or excel through the browser; returns the file name. */
  download(id: string, format: 'pdf' | 'excel'): Observable<string> {
    return this.raw.get(`${environment.apiUrl}/assessments/${id}/export?format=${format}`, { responseType: 'blob', observe: 'response' }).pipe(
      map((res: HttpResponse<Blob>) => {
        const match = FILENAME.exec(res.headers.get('content-disposition') ?? '');
        const name = match ? decodeURIComponent(match[1]) : `assessment.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
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
