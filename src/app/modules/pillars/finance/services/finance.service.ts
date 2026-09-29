import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { HttpService } from '../../../../core/services/http.service';
import { FinanceData, FinanceDataRequest, ProjectionRequest, ProjectionResult } from '../../../../core/models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly http = inject(HttpService);

  readonly current = signal<FinanceData | null>(null);
  readonly history = signal<FinanceData[]>([]);

  getForClient(clientId: string, period?: string): Observable<FinanceData> {
    this.current.set(null);
    return this.http.get<FinanceData>(`/finance/client/${clientId}`, period ? { period } : undefined).pipe(
      map((response) => this.unwrap(response)),
      tap((data) => this.current.set(data)),
    );
  }

  getHistory(clientId: string, limit = 12): Observable<FinanceData[]> {
    this.history.set([]);
    return this.http.get<FinanceData[]>(`/finance/client/${clientId}/history`, { limit }).pipe(
      map((response) => this.unwrap(response)),
      tap((data) => this.history.set(data)),
    );
  }

  import(request: FinanceDataRequest): Observable<FinanceData> {
    return this.http.post<FinanceData>('/finance/import', request).pipe(
      map((response) => this.unwrap(response)),
      tap((data) => this.current.set(data)),
    );
  }

  projections(request: ProjectionRequest): Observable<ProjectionResult> {
    return this.http.post<ProjectionResult>('/finance/projections', request).pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T>(response: { success: boolean; data: T | null; error: { message: string } | null }): T {
    if (!response.success || response.data === null) {
      throw new Error(response.error?.message ?? 'Request failed');
    }
    return response.data;
  }
}
