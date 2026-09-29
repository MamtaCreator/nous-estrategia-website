import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PillarChart } from '../../../../../shared/pillar-chart';
import { PillarKpis } from '../../../../../shared/pillar-kpis';
import { PillarNav } from '../../../../../shared/pillar-nav';
import { FormErrors } from '../../../../../shared/form-errors';
import { downloadCsv } from '../../../../../core/helpers/pillar-data';
import { processMetrics } from '../../../../../core/helpers/pillar-metrics';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProcessService } from '../../services/process.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { CreateProcessFlowRequest } from '../../../../../core/models/process.model';

@Component({
  selector: 'app-process-list',
  providers: [ProcessService],
  imports: [PillarChart, PillarKpis, PillarNav, FormErrors, ReactiveFormsModule, RouterLink],
  templateUrl: './process-list.html',
  styleUrl: './process-list.css',
})
export class ProcessList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  protected readonly processService = inject(ProcessService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly showForm = signal(false);


  protected readonly search = signal('');
  protected readonly statusFilter = signal('');
  protected readonly statuses = ['Draft', 'Mapped', 'Analyzed', 'Optimized', 'Implemented'];
  protected readonly loadFailed = signal(false);
  protected readonly filtered = computed(() => this.processService.processes().filter(row =>
    row.name.toLowerCase().includes(this.search().trim().toLowerCase()) &&
    (!this.statusFilter() || row.status === this.statusFilter())));
  protected readonly metrics = computed(() => processMetrics(this.filtered()));
  protected readonly chartLabels = computed(() => this.filtered().map(row => row.name));
  protected readonly chartSeries = computed(() => [{name: 'Process efficiency', values:this.filtered().map(row => row.efficiency * 1)}]);
  protected exportReport(): void {
    downloadCsv('processes-' + this.clientId, [['Name','Status','Process efficiency'], ...this.filtered().map(row => [row.name,row.status,row.efficiency * 1])]);
  }

  protected readonly canWrite = this.auth.canWrite;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    description: [''],
    category: ['', Validators.required],
    steps: this.fb.array([this.buildStep(1)]),
  });

  private buildStep(sequence: number) {
    return this.fb.nonNullable.group({
      sequence: [sequence],
      name: ['', Validators.required],
      description: [''],
      owner: [''],
      durationMinutes: [0, [Validators.required, Validators.min(0)]],
      costPerExecution: [0, [Validators.required, Validators.min(0)]],
    });
  }

  protected get steps(): FormArray {
    return this.form.controls.steps;
  }

  protected addStep(): void {
    if (this.steps.length < 200) this.steps.push(this.buildStep(this.steps.length + 1));
  }

  protected removeStep(index: number): void {
    if (this.steps.length <= 1) return;
    this.steps.removeAt(index);
    this.steps.controls.forEach((step, i) => step.patchValue({sequence:i+1}));
  }

  protected moveStep(index: number, direction: number): void {
    const target = index + direction;
    if (target < 0 || target >= this.steps.length) return;
    const step = this.steps.at(index);
    this.steps.removeAt(index); this.steps.insert(target,step);
    this.steps.controls.forEach((control,i) => control.patchValue({sequence:i+1}));
  }
  constructor() {
    this.load();
  }

  protected load(): void {
    this.loadFailed.set(false);
    this.isLoading.set(true);
    this.processService.loadByClient(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    const request: CreateProcessFlowRequest = {
      clientId: this.clientId,
      name: value.name,
      description: value.description,
      category: value.category,
      steps: value.steps.map((s, index) => ({
        sequence: index + 1,
        name: s.name,
        description: s.description,
        owner: s.owner || null,
        durationMinutes: s.durationMinutes,
        costPerExecution: s.costPerExecution,
      })),
    };

    this.isSaving.set(true);
    this.processService.createProcess(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Process created.');
        this.isSaving.set(false);
        this.showForm.set(false);
        this.load();
      },
      error: () => this.isSaving.set(false),
    });
  }
}
