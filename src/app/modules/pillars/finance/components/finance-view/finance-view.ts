import { toSignal } from '@angular/core/rxjs-interop';
import { PillarChart } from '../../../../../shared/pillar-chart';
import { PillarKpis } from '../../../../../shared/pillar-kpis';
import { PillarNav } from '../../../../../shared/pillar-nav';
import { financeDraftValidator, entriesValidator, parseNumbers, ratio, downloadCsv } from '../../../../../core/helpers/pillar-data';
import { financeMetrics } from '../../../../../core/helpers/pillar-metrics';
import { FormErrors } from '../../../../../shared/form-errors';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { FinanceDataRequest, ProjectionRequest, ProjectionResult } from '../../../../../core/models/finance.model';

@Component({
  selector: 'app-finance-view',
  providers: [FinanceService],
  imports: [PillarChart, PillarKpis, PillarNav, FormErrors, ReactiveFormsModule, RouterLink, KeyValuePipe, DecimalPipe],
  templateUrl: './finance-view.html',
  styleUrl: './finance-view.css',
})
export class FinanceView {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  protected readonly finance = inject(FinanceService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly showImportForm = signal(false);
  protected readonly showProjections = signal(false);
  protected readonly projectionResult = signal<ProjectionResult | null>(null);

  protected readonly loadFailed = signal(false);
  protected readonly historyFailed = signal(false);
  protected readonly isProjecting = signal(false);
  protected readonly rangeStart = signal('');
  protected readonly rangeEnd = signal('');
  protected readonly filteredHistory = computed(() => this.finance.history()
    .filter(row => (!this.rangeStart() || row.period >= this.rangeStart()) && (!this.rangeEnd() || row.period <= this.rangeEnd()))
    .sort((a,b) => a.period.localeCompare(b.period)));
  protected readonly metrics = computed(() => financeMetrics(this.filteredHistory()));
  protected readonly chartLabels = computed(() => this.filteredHistory().map(row => row.period));
  protected readonly chartSeries = computed(() => [
    {name:'Revenue',values:this.filteredHistory().map(row => row.totalRevenue)},
    {name:'Expenses',values:this.filteredHistory().map(row => row.totalExpenses)},
    {name:'Net income',values:this.filteredHistory().map(row => row.netIncome)},
  ]);
  protected exportReport(): void {
    downloadCsv('finance-' + this.clientId, [['Period','Revenue','Expenses','Net income','Profit margin (%)'],
      ...this.filteredHistory().map(row => [row.period,row.totalRevenue,row.totalExpenses,row.netIncome,row.profitMargin === null ? null : row.profitMargin * 100])]);
  }
  protected readonly canWrite = this.auth.canWrite;

  protected readonly periodControl = this.fb.nonNullable.control(this.currentPeriodString(), [Validators.pattern(/^(199\d|20\d{2}|2100)-(0[1-9]|1[0-2])$/)]);

  protected readonly importForm = this.fb.nonNullable.group({
    period: [this.currentPeriodString(), [Validators.required, Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)]],
    totalRevenue: [0, [Validators.required, Validators.min(0), Validators.max(1e12)]],
    revenueByProduct: ['', entriesValidator()],
    totalExpenses: [0, [Validators.required, Validators.min(0), Validators.max(1e12)]],
    expensesByCategory: ['', entriesValidator()],
    fixedExpenses: [0, [Validators.min(0), Validators.max(1e12)]],
    variableExpenses: [0, [Validators.min(0), Validators.max(1e12)]],
    currentAssets: [0, [Validators.min(0), Validators.max(1e12)]],
    fixedAssets: [0, [Validators.min(0), Validators.max(1e12)]],
    currentLiabilities: [0, [Validators.min(0), Validators.max(1e12)]],
    longTermLiabilities: [0, [Validators.min(0), Validators.max(1e12)]],
    equity: [0],
    investingCashFlow: [0],
    financingCashFlow: [0],
  }, {validators:financeDraftValidator});

  protected readonly projectionForm = this.fb.nonNullable.group({
    currentPeriod: [this.currentPeriodString(), [Validators.required, Validators.pattern(/^(199\d|20\d{2}|2100)-(0[1-9]|1[0-2])$/)]],
    currentRevenue: [0, [Validators.required, Validators.min(0), Validators.max(1e12)]],
    currentExpenses: [0, [Validators.required, Validators.min(0), Validators.max(1e12)]],
    growthRate: [0.05, [Validators.min(-0.5), Validators.max(1)]],
    expenseGrowthRate: [0.03, [Validators.min(-0.5), Validators.max(1)]],
  });

  private readonly draft = toSignal(this.importForm.valueChanges, { initialValue: this.importForm.getRawValue() });
  protected readonly preview = computed(() => {
    const value = this.draft();
    const profit = (value.totalRevenue ?? 0) - (value.totalExpenses ?? 0);
    return [{label:'Draft net income',value:profit}, {label:'Draft profit margin',value:ratio(profit * 100,value.totalRevenue ?? 0),unit:'%'},
      {label:'Draft current ratio',value:ratio(value.currentAssets ?? 0,value.currentLiabilities ?? 0)}];
  });

  constructor() {
    this.load();
  }

  private currentPeriodString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  protected load(): void {
    if (this.isLoading() || this.periodControl.invalid) { this.periodControl.markAsTouched(); return; }
    this.loadFailed.set(false); this.historyFailed.set(false);
    this.isLoading.set(true);
    this.finance.getForClient(this.clientId, this.periodControl.value || undefined).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.isLoading.set(false),
      error: (error) => { this.isLoading.set(false); this.loadFailed.set(error.status !== 404); },
    });
    this.finance.getHistory(this.clientId, 60).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => this.historyFailed.set(true) });
  }

  protected onSubmitImport(): void {
    if (!this.canWrite() || this.isSaving()) return;
    if (this.importForm.invalid) {
      this.importForm.markAllAsTouched();
      return;
    }
    const value = this.importForm.getRawValue();
    const request: FinanceDataRequest = {
      clientId: this.clientId,
      period: value.period,
      totalRevenue: value.totalRevenue,
      revenueByProduct: parseNumbers(value.revenueByProduct),
      totalExpenses: value.totalExpenses,
      expensesByCategory: parseNumbers(value.expensesByCategory),
      fixedExpenses: value.fixedExpenses,
      variableExpenses: value.variableExpenses,
      currentAssets: value.currentAssets,
      fixedAssets: value.fixedAssets,
      currentLiabilities: value.currentLiabilities,
      longTermLiabilities: value.longTermLiabilities,
      equity: value.equity,
      operatingCashFlow: null,
      investingCashFlow: value.investingCashFlow,
      financingCashFlow: value.financingCashFlow,
    };

    this.isSaving.set(true);
    this.finance.import(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Financial data saved.');
        this.isSaving.set(false);
        this.showImportForm.set(false);
        this.periodControl.setValue(value.period);
        this.finance.getHistory(this.clientId, 60).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => this.historyFailed.set(true) });
      },
      error: () => this.isSaving.set(false),
    });
  }

  protected onRunProjections(): void {
    if (!this.canWrite() || this.isProjecting()) return;
    if (this.projectionForm.invalid) {
      this.projectionForm.markAllAsTouched();
      return;
    }
    const request: ProjectionRequest = { clientId: this.clientId, ...this.projectionForm.getRawValue() };
    this.isProjecting.set(true); this.projectionResult.set(null);
    this.finance.projections(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => { this.projectionResult.set(result); this.isProjecting.set(false); },
      error: () => this.isProjecting.set(false),
    });
  }

  protected months(result: ProjectionResult): string[] {
    return Object.keys(result.revenue);
  }

  protected pct(value: number | null): string {
    return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
  }
}
