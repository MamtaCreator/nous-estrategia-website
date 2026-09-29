import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpService } from '../../core/services/http.service';

export interface DemoSeedResult {
  clientId: string;
  companyName: string;
  alreadyExisted: boolean;
  kpis: number;
  measurements: number;
  projects: number;
  financePeriods: number;
  campaigns: number;
  processes: number;
  automations: number;
}

@Injectable({ providedIn: 'root' })
export class DemoService {
  private readonly http = inject(HttpService);

  /** Creates one sample client owned by the signed-in user, or returns the one already created. */
  createSampleClient(): Observable<DemoSeedResult> {
    return this.http.post<DemoSeedResult>('/demo/sample-client', {}).pipe(
      map((r) => {
        if (r.data === null) throw new Error(r.error?.message ?? 'Request failed');
        return r.data;
      }),
    );
  }
}
