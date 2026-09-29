import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import {
  CreateProjectRequest,
  DeliverableRequest,
  Project,
  ProjectListFilters,
  UpdateProjectRequest,
  UpdateProjectStatusRequest,
} from '../../../core/models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpService);

  readonly projects = signal<Project[]>([]);
  readonly selectedProject = signal<Project | null>(null);

  loadByClient(clientId: string, filters: ProjectListFilters = {}): Observable<Project[]> {
    return this.http.get<Project[]>(`/projects/client/${clientId}`, filters).pipe(
      map((response) => this.unwrap(response)),
      tap((projects) => this.projects.set(projects)),
    );
  }

  getProject(id: string): Observable<Project> {
    this.selectedProject.set(null);
    return this.http.get<Project>(`/projects/${id}`).pipe(
      map((response) => this.unwrap(response)),
      tap((project) => this.selectedProject.set(project)),
    );
  }

  createProject(request: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>('/projects', request).pipe(map((response) => this.unwrap(response)));
  }

  updateProject(id: string, request: UpdateProjectRequest): Observable<Project> {
    return this.http.put<Project>(`/projects/${id}`, request).pipe(
      map((response) => this.unwrap(response)),
      tap((project) => this.selectedProject.set(project)),
    );
  }

  updateStatus(id: string, request: UpdateProjectStatusRequest): Observable<Project> {
    return this.http.patch<Project>(`/projects/${id}/status`, request).pipe(
      map((response) => this.unwrap(response)),
      tap((project) => this.selectedProject.set(project)),
    );
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<{ message: string }>(`/projects/${id}`).pipe(
      tap(() => {
        this.projects.update(projects => projects.filter(project => project.id !== id));
        if (this.selectedProject()?.id === id) this.selectedProject.set(null);
      }),
      map(() => undefined),
    );
  }

  addDeliverable(projectId: string, request: DeliverableRequest): Observable<Project> {
    return this.http.post<Project>(`/projects/${projectId}/deliverables`, request).pipe(
      map((response) => this.unwrap(response)),
      tap((project) => this.selectedProject.set(project)),
    );
  }

  updateDeliverable(projectId: string, deliverableId: string, request: DeliverableRequest): Observable<Project> {
    return this.http.put<Project>(`/projects/${projectId}/deliverables/${deliverableId}`, request).pipe(
      map((response) => this.unwrap(response)),
      tap((project) => this.selectedProject.set(project)),
    );
  }

  removeDeliverable(projectId: string, deliverableId: string): Observable<Project> {
    return this.http.delete<Project>(`/projects/${projectId}/deliverables/${deliverableId}`).pipe(
      map((response) => this.unwrap(response)),
      tap((project) => this.selectedProject.set(project)),
    );
  }

  private unwrap<T>(response: { success: boolean; data: T | null; error: { message: string } | null }): T {
    if (!response.success || response.data === null) {
      throw new Error(response.error?.message ?? 'Request failed');
    }
    return response.data;
  }
}
