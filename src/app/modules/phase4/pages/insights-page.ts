import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Phase4Service } from '../services/phase4.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Insight } from '../../../core/models/phase4.model';

@Component({
  selector: 'app-insights-page',
  imports: [RouterLink, DecimalPipe],
  styleUrl: '../../kpis/kpis.css',
  template: `
    <div class="header">
      <div><a class="back" [routerLink]="['/app/clients', clientId]">← Back to client</a><h1>Insights</h1></div>
      @if (canWrite()) { <button type="button" class="btn primary" (click)="generate()" [disabled]="busy()">{{ busy() ? 'Analysing…' : 'Generate insights' }}</button> }
    </div>
    <p class="hint">Generated from the last 90 days of each active KPI: anomalies, declines, strong performance and improving trends. Regenerating replaces the ones you haven't actioned.</p>

    @if (loading()) { <p class="hint">Loading…</p> }
    @else if (failed()) { <p role="alert">Could not load insights. <button type="button" (click)="load()">Try again</button></p> }
    @else if (insights().length === 0) { <p class="hint">No active insights. Record some KPI values, then generate.</p> }
    @else {
      <div class="cards">
        @for (i of insights(); track i.id) {
          <div class="card">
            <h3>{{ i.title }} <span class="badge" [class.red]="i.type === 'Risk' || i.type === 'Anomaly'" [class.green]="i.type === 'Opportunity' || i.type === 'Trend'">{{ i.type }}</span></h3>
            <p>{{ i.description }}</p>
            <p class="meta"><strong>Recommendation:</strong> {{ i.recommendation }}</p>
            <div class="meta">{{ i.category }} · impact {{ i.impactScore | number: '1.0-0' }}/100@if (i.kpiName) { · {{ i.kpiName }} }</div>
            @if (canWrite()) { <button type="button" class="btn" (click)="done(i)">Mark as actioned</button> }
          </div>
        }
      </div>
    }
  `,
})
export class InsightsPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Phase4Service);
  private readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = inject(ActivatedRoute).snapshot.paramMap.get('clientId')!;
  protected readonly insights = signal<Insight[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly canWrite = this.auth.canWrite;

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.insights(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (i) => { this.insights.set(i); this.loading.set(false); },
      error: () => { this.loading.set(false); this.failed.set(true); },
    });
  }

  protected generate(): void {
    this.busy.set(true);
    this.api.generateInsights(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.notifications.success(`${r.generated} insight(s) generated.`); this.busy.set(false); this.insights.set(r.insights); },
      error: () => this.busy.set(false),
    });
  }

  protected done(i: Insight): void {
    this.api.actionInsight(i.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.insights.update((l) => l.filter((x) => x.id !== i.id)) });
  }
}
