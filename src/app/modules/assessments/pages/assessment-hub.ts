import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ClientService } from '../../clients/services/client.service';
import { Client } from '../../../core/models/client.model';

/** Entry point from the top bar: pick which client to assess (skipped when there is only one). */
@Component({
  selector: 'app-assessment-hub',
  imports: [RouterLink],
  styleUrl: '../../kpis/kpis.css',
  template: `
    <div class="header"><h1>360° Assessments</h1></div>
    <p class="hint">Choose a client to start or continue a Finance, Marketing, Operations or AI Readiness assessment.</p>

    @if (loading()) { <p class="hint">Loading…</p> }
    @else if (failed()) { <p role="alert">Could not load your clients. <button type="button" (click)="load()">Try again</button></p> }
    @else if (clients().length === 0) {
      <p class="hint">You have no clients yet. <a [routerLink]="['/app/clients']">Go to Clients</a> to add or get assigned one.</p>
    } @else {
      <div class="cards">
        @for (c of clients(); track c.id) {
          <div class="card">
            <h3>{{ c.companyName }}</h3>
            <div class="meta">{{ c.industry }} · {{ c.country }}</div>
            <a class="btn primary" [routerLink]="['/app/clients', c.id, 'assessments']">Open assessments</a>
          </div>
        }
      </div>
    }
  `,
})
export class AssessmentHub {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly clientService = inject(ClientService);

  protected readonly clients = signal<Client[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.clientService.loadClients({ page: 1, limit: 100 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (rows) => {
        if (rows.length === 1) { this.router.navigate(['/app/clients', rows[0].id, 'assessments'], { replaceUrl: true }); return; }
        this.clients.set(rows);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.failed.set(true); },
    });
  }
}
