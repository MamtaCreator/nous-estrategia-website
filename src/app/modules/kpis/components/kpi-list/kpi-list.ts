import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KpiService } from '../../services/kpi.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  KPI_CATEGORIES,
  KPI_DATA_TYPES,
  Kpi,
  KpiCategory,
  KpiDataType,
  KpiSummary,
  MetricDefinition,
} from '../../../../core/models/kpi.model';

@Component({
  selector: 'app-kpi-list',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './kpi-list.html',
  styleUrl: '../../kpis.css',
})
export class KpiList {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifications = inject(NotificationService);
  private readonly kpiService = inject(KpiService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  protected readonly kpis = signal<Kpi[]>([]);
  protected readonly summary = signal<KpiSummary | null>(null);
  protected readonly catalog = signal<MetricDefinition[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly isBusy = signal(false);
  protected readonly showForm = signal(false);
  protected readonly category = signal<KpiCategory | ''>('');

  protected readonly categories = KPI_CATEGORIES;
  protected readonly dataTypes = KPI_DATA_TYPES;
  protected readonly canWrite = this.auth.canWrite;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    category: this.fb.nonNullable.control<KpiCategory>('Customer'),
    dataType: this.fb.nonNullable.control<KpiDataType>('Numeric'),
    unit: [''],
    metricKey: [''],
    targetValue: this.fb.control<number | null>(null),
    minThreshold: this.fb.control<number | null>(null),
    maxThreshold: this.fb.control<number | null>(null),
    higherIsBetter: [true],
  });

  constructor() {
    this.load();
    this.kpiService.catalog().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (c) => this.catalog.set(c), error: () => {} });
  }

  protected load(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.kpiService.list(this.clientId, this.category() || undefined).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (rows) => { this.kpis.set(rows); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.loadFailed.set(true); },
    });
    this.kpiService.summary(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (s) => this.summary.set(s), error: () => {} });
  }

  protected onCategory(value: string): void {
    this.category.set(value as KpiCategory | '');
    this.load();
  }

  protected createDefaults(): void {
    this.isBusy.set(true);
    this.kpiService.createDefaults(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.notifications.success(`${r.created} KPI(s) created, ${r.alreadyPresent} already present.`);
        this.isBusy.set(false);
        this.load();
      },
      error: () => this.isBusy.set(false),
    });
  }

  protected recalculate(): void {
    this.isBusy.set(true);
    this.kpiService.recalculate(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        const skipped = r.skippedNoData.length ? ` ${r.skippedNoData.length} had no data.` : '';
        this.notifications.success(`${r.recalculated} KPI(s) recalculated.${skipped}`);
        this.isBusy.set(false);
        this.load();
      },
      error: () => this.isBusy.set(false),
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.isBusy.set(true);
    this.kpiService.create({
      clientId: this.clientId,
      name: v.name,
      description: v.description,
      category: v.category,
      dataType: v.dataType,
      targetValue: v.targetValue,
      minThreshold: v.minThreshold,
      maxThreshold: v.maxThreshold,
      unit: v.unit,
      metricKey: v.metricKey || null,
      higherIsBetter: v.higherIsBetter,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('KPI created.');
        this.isBusy.set(false);
        this.showForm.set(false);
        this.form.reset({ category: 'Customer', dataType: 'Numeric', higherIsBetter: true, name: '', description: '', unit: '', metricKey: '' });
        this.load();
      },
      error: () => this.isBusy.set(false),
    });
  }

  protected format(kpi: Kpi): string {
    if (kpi.currentValue === null) return '—';
    const n = Math.round(kpi.currentValue * 100) / 100;
    return `${n}${kpi.unit ? ' ' + kpi.unit : ''}`;
  }
}
