import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { HttpService } from '../../../../core/services/http.service';
import { Automation, CreateAutomationRequest, Execution, LogExecutionRequest } from '../../../../core/models/automation.model';

@Injectable({ providedIn: 'root' })
export class AutomationService {
  private readonly http = inject(HttpService);

  readonly automations = signal<Automation[]>([]);
  readonly selectedAutomation = signal<Automation | null>(null);
  readonly executions = signal<Execution[]>([]);

  loadByClient(clientId: string): Observable<Automation[]> {
    this.automations.set([]);
    return this.http.get<Automation[]>(`/ai/automations/${clientId}`).pipe(
      map((response) => this.unwrap(response)),
      tap((automations) => this.automations.set(automations)),
    );
  }

  getAutomation(id: string): Observable<Automation> {
    this.selectedAutomation.set(null);
    return this.http.get<Automation>(`/ai/automations/${id}/details`).pipe(
      map((response) => this.unwrap(response)),
      tap((automation) => this.selectedAutomation.set(automation)),
    );
  }

  createAutomation(request: CreateAutomationRequest): Observable<Automation> {
    return this.http.post<Automation>('/ai/automations', request).pipe(map((response) => this.unwrap(response)));
  }

  deploy(id: string): Observable<Automation> {
    return this.http.post<Automation>(`/ai/automations/${id}/deploy`, {}).pipe(
      map((response) => this.unwrap(response)),
      tap((automation) => this.selectedAutomation.set(automation)),
    );
  }

  logExecution(id: string, request: LogExecutionRequest): Observable<Execution> {
    return this.http
      .post<Execution>(`/ai/automations/${id}/executions`, request)
      .pipe(map((response) => this.unwrap(response)));
  }

  getExecutions(id: string, limit = 50): Observable<Execution[]> {
    this.executions.set([]);
    return this.http.get<Execution[]>(`/ai/automations/${id}/executions`, { limit }).pipe(
      map((response) => this.unwrap(response)),
      tap((executions) => this.executions.set(executions)),
    );
  }

  private unwrap<T>(response: { success: boolean; data: T | null; error: { message: string } | null }): T {
    if (!response.success || response.data === null) {
      throw new Error(response.error?.message ?? 'Request failed');
    }
    return response.data;
  }
}
