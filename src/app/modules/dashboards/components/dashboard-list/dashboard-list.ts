import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { KpiService } from '../../../kpis/services/kpi.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DASHBOARD_TYPES, Dashboard, DashboardType } from '../../../../core/models/dashboard.model';
import { Kpi } from '../../../../core/models/kpi.model';

@Component({
  selector: 'app-dashboard-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './dashboard-list.html',
  styleUrl: '../../../kpis/kpis.css',
})
export class DashboardList {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifications = inject(NotificationService);
  private readonly dashboardService = inject(DashboardService);
  private readonly kpiService = inject(KpiService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  protected readonly dashboards = signal<Dashboard[]>([]);
  protected readonly kpis = signal<Kpi[]>([]);
  protected readonly selectedKpis = signal<string[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly isBusy = signal(false);
  protected readonly showForm = signal(false);

  protected readonly types = DASHBOARD_TYPES;
  protected readonly canWrite = this.auth.canWrite;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    type: this.fb.nonNullable.control<DashboardType>('Executive'),
    refreshIntervalSeconds: [300, [Validators.required, Validators.min(30), Validators.max(86400)]],
    isPublic: [false],
  });

  constructor() {
    this.load();
    this.kpiService.list(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (k) => this.kpis.set(k), error: () => {} });
  }

  protected load(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.dashboardService.list(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (rows) => { this.dashboards.set(rows); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.loadFailed.set(true); },
    });
  }

  protected toggleKpi(id: string, checked: boolean): void {
    this.selectedKpis.update((ids) => (checked ? [...ids, id] : ids.filter((i) => i !== id)));
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.isBusy.set(true);
    this.dashboardService.create({
      clientId: this.clientId,
      name: v.name,
      description: v.description,
      type: v.type,
      refreshIntervalSeconds: v.refreshIntervalSeconds,
      isPublic: v.isPublic,
      widgets: [],
      kpis: this.selectedKpis().map((kpiId, i) => ({
        kpiId, displayOrder: i, showChart: true, showTrend: true, chartType: 'LineChart', daysToDisplay: 30,
      })),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Dashboard created.');
        this.isBusy.set(false);
        this.showForm.set(false);
        this.selectedKpis.set([]);
        this.load();
      },
      error: () => this.isBusy.set(false),
    });
  }

  protected archive(id: string, name: string, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Archive "${name}"?`)) return;
    this.dashboardService.archive(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.notifications.success('Dashboard archived.'); this.load(); },
    });
  }
}
