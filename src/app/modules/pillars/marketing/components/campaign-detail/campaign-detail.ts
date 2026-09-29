import { PillarNav } from '../../../../../shared/pillar-nav';
import { entriesValidator, parseNumbers, ratio } from '../../../../../core/helpers/pillar-data';
import { PillarChart } from '../../../../../shared/pillar-chart';
import { PillarKpis } from '../../../../../shared/pillar-kpis';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormErrors } from '../../../../../shared/form-errors';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MarketingService } from '../../services/marketing.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { CAMPAIGN_LAUNCHABLE_FROM, UpdateCampaignMetricsRequest } from '../../../../../core/models/marketing.model';

@Component({
  selector: 'app-campaign-detail',
  providers: [MarketingService],
  imports: [PillarNav, PillarChart, PillarKpis, FormErrors, RouterLink, ReactiveFormsModule],
  templateUrl: './campaign-detail.html',
  styleUrl: './campaign-detail.css',
})
export class CampaignDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  protected readonly marketing = inject(MarketingService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  private readonly campaignId = this.route.snapshot.paramMap.get('id')!;
  protected readonly isLoading = signal(true);
  protected readonly isBusy = signal(false);
  protected readonly showMetricsForm = signal(false);

  protected readonly canWrite = this.auth.canWrite;
  protected readonly canLaunch = () => {
    const campaign = this.marketing.selectedCampaign();
    return campaign !== null && CAMPAIGN_LAUNCHABLE_FROM.includes(campaign.status);
  };
  protected readonly canPause = () => this.marketing.selectedCampaign()?.status === 'Running';

  protected readonly metricsForm = this.fb.nonNullable.group({
    impressions: ['', entriesValidator(true, true)],
    clicks: ['', entriesValidator(true, true)],
    conversions: ['', entriesValidator(true, true)],
    spentBudget: [0, [Validators.min(0), Validators.max(1e12)]],
    actualRevenue: [0, [Validators.min(0), Validators.max(1e12)]],
  });

  private readonly draft = toSignal(this.metricsForm.valueChanges, {initialValue:this.metricsForm.getRawValue()});
  protected readonly preview = computed(() => {
    const value = this.draft();
    let impressions = 0, clicks = 0, conversions = 0;
    try {
      impressions = Object.values(parseNumbers(value.impressions ?? '',true)).reduce((a,b)=>a+b,0);
      clicks = Object.values(parseNumbers(value.clicks ?? '',true)).reduce((a,b)=>a+b,0);
      conversions = Object.values(parseNumbers(value.conversions ?? '',true)).reduce((a,b)=>a+b,0);
    } catch { return []; }
    return [{label:'Draft CTR',value:ratio(clicks*100,impressions),unit:'%'},
      {label:'Draft conversion rate',value:ratio(conversions*100,clicks),unit:'%'},
      {label:'Draft ROI',value:ratio(((value.actualRevenue??0)-(value.spentBudget??0))*100,value.spentBudget??0),unit:'%'}];
  });
  protected readonly performanceSeries = computed(() => {
    const c = this.marketing.selectedCampaign();
    return [{name:'Count',values:c ? [c.totalImpressions,c.totalClicks,c.totalConversions] : []}];
  });
  constructor() {
    this.load();
  }

  protected readonly loadFailed = signal(false);

  protected load(): void {
    this.loadFailed.set(false);
    this.isLoading.set(true);
    this.marketing.getCampaign(this.campaignId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (campaign) => {
        this.metricsForm.patchValue({ spentBudget: campaign.spentBudget, actualRevenue: 0 });
        this.isLoading.set(false);
      },
      error: () => { this.isLoading.set(false); this.loadFailed.set(true); },
    });
  }

  protected launch(): void {
    if (!this.canWrite() || !this.canLaunch() || this.isBusy()) return;
    this.isBusy.set(true);
    this.marketing.launch(this.campaignId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Campaign launched.');
        this.isBusy.set(false);
      },
      error: () => this.isBusy.set(false),
    });
  }

  protected pause(): void {
    if (!this.canWrite() || !this.canPause() || this.isBusy()) return;
    this.isBusy.set(true);
    this.marketing.pause(this.campaignId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Campaign paused.');
        this.isBusy.set(false);
      },
      error: () => this.isBusy.set(false),
    });
  }

  protected onSubmitMetrics(): void {
    if (!this.canWrite() || this.isBusy()) return;
    if (this.metricsForm.invalid) {
      this.metricsForm.markAllAsTouched();
      return;
    }
    const value = this.metricsForm.getRawValue();
    const request: UpdateCampaignMetricsRequest = {
      impressions: parseNumbers(value.impressions),
      clicks: parseNumbers(value.clicks),
      conversions: parseNumbers(value.conversions),
      spentBudget: value.spentBudget,
      actualRevenue: value.actualRevenue,
    };

    const allowed = this.marketing.selectedCampaign()?.channels ?? [];
    const keys = new Set([...Object.keys(request.impressions),...Object.keys(request.clicks),...Object.keys(request.conversions)]);
    if ([...keys].some(key => !allowed.some(channel => channel.toLowerCase() === key.toLowerCase()))) {
      this.notifications.error('Use only the channels configured for this campaign.'); return;
    }
    if ([...keys].some(key => (request.conversions[key] ?? 0) > (request.clicks[key] ?? 0) || (request.clicks[key] ?? 0) > (request.impressions[key] ?? 0))) {
      this.notifications.error('Each channel must have conversions ? clicks ? impressions.'); return;
    }
    this.isBusy.set(true);
    this.marketing.updateMetrics(this.campaignId, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Metrics updated.');
        this.isBusy.set(false);
        this.showMetricsForm.set(false);
      },
      error: () => this.isBusy.set(false),
    });
  }
}
