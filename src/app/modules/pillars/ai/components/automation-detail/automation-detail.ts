import { catchError, exhaustMap, filter, forkJoin, interval, of } from 'rxjs';
import { PillarChart } from '../../../../../shared/pillar-chart';
import { PillarKpis } from '../../../../../shared/pillar-kpis';
import { downloadCsv, ratio } from '../../../../../core/helpers/pillar-data';
import { PillarNav } from '../../../../../shared/pillar-nav';
import { FormErrors } from '../../../../../shared/form-errors';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AutomationService } from '../../services/automation.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AUTOMATION_DEPLOYABLE_FROM, LogExecutionRequest } from '../../../../../core/models/automation.model';

@Component({
  selector: 'app-automation-detail',
  providers: [AutomationService],
  imports: [PillarChart, PillarKpis, PillarNav, FormErrors, RouterLink, ReactiveFormsModule],
  templateUrl: './automation-detail.html',
  styleUrl: './automation-detail.css',
})
export class AutomationDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  protected readonly automationService = inject(AutomationService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  private readonly automationId = this.route.snapshot.paramMap.get('id')!;
  protected readonly isLoading = signal(true);
  protected readonly isBusy = signal(false);
  protected readonly showLogForm = signal(false);

  protected readonly canWrite = this.auth.canWrite;
  protected readonly canDeploy = () => {
    const automation = this.automationService.selectedAutomation();
    return automation !== null && AUTOMATION_DEPLOYABLE_FROM.includes(automation.status);
  };
  protected readonly canLogExecution = () => {
    const status = this.automationService.selectedAutomation()?.status;
    return status === 'Testing' || status === 'Active';
  };

  protected readonly logForm = this.fb.nonNullable.group({
    success: [true],
    errorMessage: ['', Validators.maxLength(1000)],
    durationSeconds: [0, [Validators.required, Validators.min(0)]],
    timeAutomedMinutes: [0, [Validators.required, Validators.min(0)]],
    costSavings: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly autoRefresh = signal(false);
  protected readonly executionsFailed = signal(false);
  protected readonly executionFilter = signal('');
  protected readonly visibleExecutions = computed(() => this.automationService.executions()
    .filter(row => !this.executionFilter() || (this.executionFilter() === 'success') === row.success)
    .sort((a,b) => a.executedAt.localeCompare(b.executedAt)));
  protected readonly executionLabels = computed(() => this.visibleExecutions().map(row => new Date(row.executedAt).toLocaleString()));
  protected readonly executionSeries = computed(() => [{name:'Duration',values:this.visibleExecutions().map(row => row.durationSeconds)}]);
  protected readonly executionMetrics = computed(() => {
    const rows = this.visibleExecutions();
    return [{label:'Displayed runs',value:rows.length},
      {label:'Average duration (displayed runs)',value:ratio(rows.reduce((sum,row)=>sum+row.durationSeconds,0),rows.length),unit:'s'},
      {label:'Success rate (displayed runs)',value:ratio(rows.filter(row=>row.success).length*100,rows.length),unit:'%'}];
  });
  protected exportExecutions(): void {
    downloadCsv('executions-' + this.automationId,[['Date','Success','Duration (seconds)','Error'],
      ...this.visibleExecutions().map(row => [row.executedAt,row.success,row.durationSeconds,row.errorMessage])]);
  }
  constructor() {
    this.load();
    interval(30000).pipe(
      filter(() => this.autoRefresh() && !this.isBusy() && !this.isLoading() && !document.hidden),
      exhaustMap(() => forkJoin({
        automation:this.automationService.getAutomation(this.automationId),
        executions:this.automationService.getExecutions(this.automationId),
      }).pipe(catchError(() => { this.executionsFailed.set(true); this.autoRefresh.set(false); return of(null); }))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  protected readonly loadFailed = signal(false);

  protected load(): void {
    this.loadFailed.set(false); this.executionsFailed.set(false);
    this.isLoading.set(true);
    this.automationService.getAutomation(this.automationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.isLoading.set(false),
      error: () => { this.isLoading.set(false); this.loadFailed.set(true); },
    });
    this.automationService.getExecutions(this.automationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => this.executionsFailed.set(true) });
  }

  protected deploy(): void {
    if (!this.canWrite() || !this.canDeploy() || this.isBusy()) return;
    this.isBusy.set(true);
    this.automationService.deploy(this.automationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Automation deployed.');
        this.isBusy.set(false);
      },
      error: () => this.isBusy.set(false),
    });
  }

  protected onSubmitLog(): void {
    if (!this.canWrite() || !this.canLogExecution() || this.isBusy()) return;
    if (this.logForm.invalid) {
      this.logForm.markAllAsTouched();
      return;
    }
    const value = this.logForm.getRawValue();
    const request: LogExecutionRequest = {
      success: value.success,
      errorMessage: value.success ? null : value.errorMessage || null,
      durationSeconds: value.durationSeconds,
      timeAutomedMinutes: value.timeAutomedMinutes,
      costSavings: value.costSavings,
    };

    this.isBusy.set(true);
    this.automationService.logExecution(this.automationId, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Execution logged.');
        this.isBusy.set(false);
        this.showLogForm.set(false);
        this.load();
      },
      error: () => this.isBusy.set(false),
    });
  }
}
