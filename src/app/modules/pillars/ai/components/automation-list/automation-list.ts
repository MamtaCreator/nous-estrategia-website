import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PillarChart } from '../../../../../shared/pillar-chart';
import { PillarKpis } from '../../../../../shared/pillar-kpis';
import { PillarNav } from '../../../../../shared/pillar-nav';
import { FormErrors } from '../../../../../shared/form-errors';
import { entriesValidator, parseEntries, downloadCsv } from '../../../../../core/helpers/pillar-data';
import { automationMetrics } from '../../../../../core/helpers/pillar-metrics';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AutomationService } from '../../services/automation.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AutomationTriggerType, AutomationType, CreateAutomationRequest } from '../../../../../core/models/automation.model';

@Component({
  selector: 'app-automation-list',
  providers: [AutomationService],
  imports: [PillarChart, PillarKpis, PillarNav, FormErrors, ReactiveFormsModule, RouterLink],
  templateUrl: './automation-list.html',
  styleUrl: './automation-list.css',
})
export class AutomationList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  protected readonly automationService = inject(AutomationService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly showForm = signal(false);

  protected readonly types: AutomationType[] = ['Workflow', 'Prediction', 'Report', 'DataProcessing'];
  protected readonly triggerTypes: AutomationTriggerType[] = ['Schedule', 'Event', 'Manual'];


  protected readonly search = signal('');
  protected readonly statusFilter = signal('');
  protected readonly statuses = ['Draft', 'Testing', 'Active', 'Disabled'];
  protected readonly loadFailed = signal(false);
  protected readonly filtered = computed(() => this.automationService.automations().filter(row =>
    row.name.toLowerCase().includes(this.search().trim().toLowerCase()) &&
    (!this.statusFilter() || row.status === this.statusFilter())));
  protected readonly metrics = computed(() => automationMetrics(this.filtered()));
  protected readonly chartLabels = computed(() => this.filtered().map(row => row.name));
  protected readonly chartSeries = computed(() => [{name: 'Execution count', values:this.filtered().map(row => row.totalExecutions * 1)}]);
  protected exportReport(): void {
    downloadCsv('ai-' + this.clientId, [['Name','Status','Execution count'], ...this.filtered().map(row => [row.name,row.status,row.totalExecutions * 1])]);
  }

  protected readonly canWrite = this.auth.canWrite;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    description: ['', Validators.maxLength(2000)],
    type: this.fb.nonNullable.control<AutomationType>('Workflow'),
    triggerType: this.fb.nonNullable.control<AutomationTriggerType>('Schedule'),
    triggerCondition: ['', Validators.maxLength(500)],
    action: ['', [Validators.required, Validators.maxLength(1000)]],
    configuration: ['', entriesValidator(false)],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loadFailed.set(false);
    this.isLoading.set(true);
    this.automationService.loadByClient(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.isLoading.set(false),
      error: () => { this.isLoading.set(false); this.loadFailed.set(true); },
    });
  }

  protected onSubmit(): void {
    if (!this.canWrite() || this.isSaving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request: CreateAutomationRequest = {
      clientId: this.clientId,
      name: value.name,
      description: value.description,
      type: value.type,
      triggerType: value.triggerType,
      triggerCondition: value.triggerCondition,
      action: value.action,
      configuration: parseEntries(value.configuration),
    };

    this.isSaving.set(true);
    this.automationService.createAutomation(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Automation created.');
        this.isSaving.set(false);
        this.showForm.set(false);
        this.load();
      },
      error: () => this.isSaving.set(false),
    });
  }
}
