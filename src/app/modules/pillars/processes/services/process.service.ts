import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { HttpService } from '../../../../core/services/http.service';
import { AddRecommendationRequest, CreateProcessFlowRequest, ProcessFlow } from '../../../../core/models/process.model';

@Injectable({ providedIn: 'root' })
export class ProcessService {
  private readonly http = inject(HttpService);

  readonly processes = signal<ProcessFlow[]>([]);
  readonly selectedProcess = signal<ProcessFlow | null>(null);

  loadByClient(clientId: string): Observable<ProcessFlow[]> {
    this.processes.set([]);
    return this.http.get<ProcessFlow[]>(`/process/${clientId}`).pipe(
      map((response) => this.unwrap(response)),
      tap((processes) => this.processes.set(processes)),
    );
  }

  getProcess(id: string): Observable<ProcessFlow> {
    this.selectedProcess.set(null);
    return this.http.get<ProcessFlow>(`/process/${id}/details`).pipe(
      map((response) => this.unwrap(response)),
      tap((process) => this.selectedProcess.set(process)),
    );
  }

  createProcess(request: CreateProcessFlowRequest): Observable<ProcessFlow> {
    return this.http.post<ProcessFlow>('/process', request).pipe(map((response) => this.unwrap(response)));
  }

  diagnose(id: string): Observable<ProcessFlow> {
    return this.http.post<ProcessFlow>(`/process/${id}/diagnose`, {}).pipe(
      map((response) => this.unwrap(response)),
      tap((process) => this.selectedProcess.set(process)),
    );
  }

  addRecommendation(id: string, request: AddRecommendationRequest): Observable<ProcessFlow> {
    return this.http.post<ProcessFlow>(`/process/${id}/recommendations`, request).pipe(
      map((response) => this.unwrap(response)),
      tap((process) => this.selectedProcess.set(process)),
    );
  }

  private unwrap<T>(response: { success: boolean; data: T | null; error: { message: string } | null }): T {
    if (!response.success || response.data === null) {
      throw new Error(response.error?.message ?? 'Request failed');
    }
    return response.data;
  }
}
