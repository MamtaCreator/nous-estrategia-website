import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { exhaustMap, filter, timer } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PillarChart } from '../../../../shared/pillar-chart';
import { DashboardData, KpiView } from '../../../../core/models/dashboard.model';

@Component({
  selector: 'app-dashboard-view',
  imports: [RouterLink, DecimalPipe, SlicePipe, PillarChart],
  templateUrl: './dashboard-view.html',
  styleUrl: '../../../kpis/kpis.css',
})
export class DashboardView {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifications = inject(NotificationService);
  private readonly dashboardService = inject(DashboardService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  private readonly dashboardId = this.route.snapshot.paramMap.get('id')!;

  protected readonly data = signal<DashboardData | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly isBusy = signal(false);
  protected readonly autoRefresh = signal(true);

  protected readonly canWrite = this.auth.canWrite;

  constructor() {
    this.load();
    this.schedulePolling();
  }

  // Poll at the server-suggested interval (never faster than every 30s); skipped while hidden or paused.
  private schedulePolling(): void {
    let elapsed = 0;
    timer(1000, 1000).pipe(
      filter(() => {
        elapsed++;
        const interval = Math.max(30, this.data()?.refreshIntervalSeconds ?? 300);
        if (elapsed < interval) return false;
        elapsed = 0;
        return this.autoRefresh() && !document.hidden && !this.isBusy();
      }),
      exhaustMap(() => this.dashboardService.data(this.dashboardId)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({ next: (d) => this.data.set(d), error: () => this.autoRefresh.set(false) });
  }

  protected load(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.dashboardService.data(this.dashboardId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d) => { this.data.set(d); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.loadFailed.set(true); },
    });
  }

  protected refreshKpis(): void {
    this.isBusy.set(true);
    this.dashboardService.refreshKpis(this.dashboardId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.notifications.success(`${r.recalculated} KPI(s) recalculated.`);
        this.isBusy.set(false);
        this.load();
      },
      error: () => this.isBusy.set(false),
    });
  }

  protected labels(kpi: KpiView): string[] {
    return kpi.dates.map((d) => new Date(d).toLocaleDateString());
  }
}
