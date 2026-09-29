import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { KpiService } from '../../services/kpi.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PillarChart } from '../../../../shared/pillar-chart';
import { Kpi, KpiHistory } from '../../../../core/models/kpi.model';

@Component({
  selector: 'app-kpi-detail',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, SlicePipe, PillarChart],
  templateUrl: './kpi-detail.html',
  styleUrl: '../../kpis.css',
})
export class KpiDetail {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifications = inject(NotificationService);
  private readonly kpiService = inject(KpiService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  private readonly kpiId = this.route.snapshot.paramMap.get('id')!;

  protected readonly kpi = signal<Kpi | null>(null);
  protected readonly history = signal<KpiHistory | null>(null);
  protected readonly days = signal(30);
  protected readonly isLoading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly isBusy = signal(false);
  protected readonly windows = [7, 30, 90, 365];

  protected readonly canWrite = this.auth.canWrite;
  protected readonly chartLabels = computed(() => (this.history()?.measurementDates ?? []).map((d) => new Date(d).toLocaleDateString()));
  protected readonly chartSeries = computed(() => [{ name: this.kpi()?.name ?? 'Value', values: this.history()?.values ?? [] }]);

  protected readonly valueForm = this.fb.nonNullable.group({
    value: [0, Validators.required],
    notes: [''],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.kpiService.get(this.kpiId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (k) => { this.kpi.set(k); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.loadFailed.set(true); },
    });
    this.loadHistory();
  }

  protected loadHistory(): void {
    this.kpiService.history(this.kpiId, this.days()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (h) => this.history.set(h),
      error: () => {},
    });
  }

  protected onDays(value: string): void {
    this.days.set(Number(value));
    this.loadHistory();
  }

  protected onRecord(): void {
    if (this.valueForm.invalid) {
      this.valueForm.markAllAsTouched();
      return;
    }
    const v = this.valueForm.getRawValue();
    this.isBusy.set(true);
    this.kpiService.recordValue(this.kpiId, { value: v.value, notes: v.notes || null }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Value recorded.');
        this.isBusy.set(false);
        this.valueForm.reset({ value: 0, notes: '' });
        this.load();
      },
      error: () => this.isBusy.set(false),
    });
  }

  protected deactivate(): void {
    if (!confirm('Deactivate this KPI?')) return;
    this.kpiService.deactivate(this.kpiId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('KPI deactivated.');
        this.router.navigate(['/app/clients', this.clientId, 'kpis']);
      },
    });
  }
}
