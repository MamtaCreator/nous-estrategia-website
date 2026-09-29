import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PillarChart } from '../../../../../shared/pillar-chart';
import { PillarKpis } from '../../../../../shared/pillar-kpis';
import { PillarNav } from '../../../../../shared/pillar-nav';
import { FormErrors } from '../../../../../shared/form-errors';
import { dateOrder, downloadCsv } from '../../../../../core/helpers/pillar-data';
import { marketingMetrics } from '../../../../../core/helpers/pillar-metrics';
import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MarketingService } from '../../services/marketing.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { CreateCampaignRequest } from '../../../../../core/models/marketing.model';

@Component({
  selector: 'app-campaign-list',
  providers: [MarketingService],
  imports: [PillarChart, PillarKpis, PillarNav, FormErrors, ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './campaign-list.html',
  styleUrl: './campaign-list.css',
})
export class CampaignList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  protected readonly marketing = inject(MarketingService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly showForm = signal(false);


  protected readonly search = signal('');
  protected readonly statusFilter = signal('');
  protected readonly statuses = ['Draft', 'Scheduled', 'Running', 'Paused', 'Completed'];
  protected readonly loadFailed = signal(false);
  protected readonly filtered = computed(() => this.marketing.campaigns().filter(row =>
    row.name.toLowerCase().includes(this.search().trim().toLowerCase()) &&
    (!this.statusFilter() || row.status === this.statusFilter())));
  protected readonly metrics = computed(() => marketingMetrics(this.filtered()));
  protected readonly chartLabels = computed(() => this.filtered().map(row => row.name));
  protected readonly chartSeries = computed(() => [{name: 'Campaign ROI', values:this.filtered().map(row => row.roi * 100)}]);
  protected exportReport(): void {
    downloadCsv('marketing-' + this.clientId, [['Name','Status','Campaign ROI'], ...this.filtered().map(row => [row.name,row.status,row.roi * 100])]);
  }

  protected readonly canWrite = this.auth.canWrite;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    type: ['', [Validators.required, Validators.maxLength(50)]],
    objective: ['', [Validators.required, Validators.maxLength(100)]],
    channels: ['', [Validators.required, control => { const channels = control.value.split(',').map((s: string) => s.trim()).filter(Boolean); return channels.length > 0 && channels.length <= 20 && channels.every((s: string) => s.length <= 50) ? null : { channels: true }; }]],
    totalBudget: [0, [Validators.required, Validators.min(0), Validators.max(1e12)]],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
  }, {validators:dateOrder});

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loadFailed.set(false);
    this.isLoading.set(true);
    this.marketing.loadByClient(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    const request: CreateCampaignRequest = {
      clientId: this.clientId,
      name: value.name,
      type: value.type,
      objective: value.objective,
      channels: value.channels
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0),
      totalBudget: value.totalBudget,
      startDate: value.startDate,
      endDate: value.endDate,
    };

    this.isSaving.set(true);
    this.marketing.createCampaign(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Campaign created.');
        this.isSaving.set(false);
        this.showForm.set(false);
        this.form.reset({ name: '', type: '', objective: '', channels: '', totalBudget: 0, startDate: '', endDate: '' });
        this.load();
      },
      error: () => this.isSaving.set(false),
    });
  }
}
