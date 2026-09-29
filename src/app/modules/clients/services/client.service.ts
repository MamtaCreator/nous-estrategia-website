import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import { PaginationInfo } from '../../../core/models/api-response.model';
import {
  AssignConsultantsRequest,
  Client,
  ClientListFilters,
  CreateClientRequest,
} from '../../../core/models/client.model';

// The backend's GET /api/clients only supports `page`/`limit` — no search/industry/tier/status
// query params exist server-side, so this feature does not offer filters that would silently
// do nothing.
@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpService);

  readonly clients = signal<Client[]>([]);
  readonly pagination = signal<PaginationInfo | null>(null);
  readonly selectedClient = signal<Client | null>(null);

  loadClients(filters: ClientListFilters): Observable<Client[]> {
    return this.http.get<Client[]>('/clients', filters).pipe(
      tap((response) => {
        this.clients.set(response.data ?? []);
        this.pagination.set(response.pagination);
      }),
      map((response) => response.data ?? []),
    );
  }

  getClient(id: string): Observable<Client> {
    this.selectedClient.set(null);
    return this.http.get<Client>(`/clients/${id}`).pipe(
      map((response) => this.unwrap(response)),
      tap((client) => this.selectedClient.set(client)),
    );
  }

  createClient(request: CreateClientRequest): Observable<Client> {
    return this.http.post<Client>('/clients', request).pipe(map((response) => this.unwrap(response)));
  }

  updateClient(id: string, request: CreateClientRequest): Observable<Client> {
    return this.http.put<Client>(`/clients/${id}`, request).pipe(
      map((response) => this.unwrap(response)),
      tap((client) => this.selectedClient.set(client)),
    );
  }

  assignConsultants(id: string, request: AssignConsultantsRequest): Observable<Client> {
    return this.http.put<Client>(`/clients/${id}/consultants`, request).pipe(
      map((response) => this.unwrap(response)),
      tap((client) => this.selectedClient.set(client)),
    );
  }

  deleteClient(id: string): Observable<void> {
    return this.http.delete<{ message: string }>(`/clients/${id}`).pipe(
      tap(() => {
        this.clients.update(clients => clients.filter(client => client.id !== id));
        if (this.selectedClient()?.id === id) this.selectedClient.set(null);
      }),
      map(() => undefined),
    );
  }

  private unwrap<T>(response: { success: boolean; data: T | null; error: { message: string } | null }): T {
    if (!response.success || response.data === null) {
      throw new Error(response.error?.message ?? 'Request failed');
    }
    return response.data;
  }
}
