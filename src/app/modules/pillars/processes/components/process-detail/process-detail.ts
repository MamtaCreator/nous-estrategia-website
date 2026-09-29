import { PillarNav } from '../../../../../shared/pillar-nav';
import { ProcessVisualization } from './process-visualization';
import { FormErrors } from '../../../../../shared/form-errors';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProcessService } from '../../services/process.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { NotificationService } from '../../../../../core/services/notification.service';

@Component({
  selector: 'app-process-detail',
  providers: [ProcessService],
  imports: [PillarNav, ProcessVisualization, FormErrors, RouterLink, ReactiveFormsModule],
  templateUrl: './process-detail.html',
  styleUrl: './process-detail.css',
})
export class ProcessDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  protected readonly processService = inject(ProcessService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  private readonly processId = this.route.snapshot.paramMap.get('id')!;
  protected readonly isLoading = signal(true);
  protected readonly isDiagnosing = signal(false);
  protected readonly isSavingRecommendation = signal(false);
  protected readonly showRecommendationForm = signal(false);

  protected readonly canWrite = this.auth.canWrite;

  protected readonly recommendationForm = this.fb.nonNullable.group({
    recommendation: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
    potentialSavings: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    this.load();
  }

  protected readonly loadFailed = signal(false);

  protected load(): void {
    this.loadFailed.set(false);
    this.isLoading.set(true);
    this.processService.getProcess(this.processId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.isLoading.set(false),
      error: () => { this.isLoading.set(false); this.loadFailed.set(true); },
    });
  }

  protected diagnose(): void {
    if (!this.canWrite() || this.isDiagnosing() || this.isSavingRecommendation()) return;
    this.isDiagnosing.set(true);
    this.processService.diagnose(this.processId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Process diagnosed.');
        this.isDiagnosing.set(false);
      },
      error: () => this.isDiagnosing.set(false),
    });
  }

  protected onSubmitRecommendation(): void {
    if (!this.canWrite() || this.isSavingRecommendation() || this.isDiagnosing()) return;
    if (this.recommendationForm.invalid) {
      this.recommendationForm.markAllAsTouched();
      return;
    }
    this.isSavingRecommendation.set(true);
    this.processService.addRecommendation(this.processId, this.recommendationForm.getRawValue()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.success('Recommendation saved.');
        this.isSavingRecommendation.set(false);
        this.showRecommendationForm.set(false);
        this.recommendationForm.reset({ recommendation: '', potentialSavings: 0 });
      },
      error: () => this.isSavingRecommendation.set(false),
    });
  }
}
