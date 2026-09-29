import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { HttpService } from '../../../../core/services/http.service';
import { Campaign, CreateCampaignRequest, UpdateCampaignMetricsRequest } from '../../../../core/models/marketing.model';

@Injectable({ providedIn: 'root' })
export class MarketingService {
  private readonly http = inject(HttpService);

  readonly campaigns = signal<Campaign[]>([]);
  readonly selectedCampaign = signal<Campaign | null>(null);

  loadByClient(clientId: string): Observable<Campaign[]> {
    this.campaigns.set([]);
    return this.http.get<Campaign[]>(`/marketing/campaigns/${clientId}`).pipe(
      map((response) => this.unwrap(response)),
      tap((campaigns) => this.campaigns.set(campaigns)),
    );
  }

  getCampaign(id: string): Observable<Campaign> {
    this.selectedCampaign.set(null);
    return this.http.get<Campaign>(`/marketing/campaigns/${id}/details`).pipe(
      map((response) => this.unwrap(response)),
      tap((campaign) => this.selectedCampaign.set(campaign)),
    );
  }

  createCampaign(request: CreateCampaignRequest): Observable<Campaign> {
    return this.http.post<Campaign>('/marketing/campaigns', request).pipe(map((response) => this.unwrap(response)));
  }

  updateMetrics(id: string, request: UpdateCampaignMetricsRequest): Observable<Campaign> {
    return this.http.patch<Campaign>(`/marketing/campaigns/${id}/metrics`, request).pipe(
      map((response) => this.unwrap(response)),
      tap((campaign) => this.selectedCampaign.set(campaign)),
    );
  }

  launch(id: string): Observable<Campaign> {
    return this.http.post<Campaign>(`/marketing/campaigns/${id}/launch`, {}).pipe(
      map((response) => this.unwrap(response)),
      tap((campaign) => this.selectedCampaign.set(campaign)),
    );
  }

  pause(id: string): Observable<Campaign> {
    return this.http.post<Campaign>(`/marketing/campaigns/${id}/pause`, {}).pipe(
      map((response) => this.unwrap(response)),
      tap((campaign) => this.selectedCampaign.set(campaign)),
    );
  }

  private unwrap<T>(response: { success: boolean; data: T | null; error: { message: string } | null }): T {
    if (!response.success || response.data === null) {
      throw new Error(response.error?.message ?? 'Request failed');
    }
    return response.data;
  }
}
