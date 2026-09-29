import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssessmentService } from '../services/assessment.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AssessmentTemplateSummary, ClientAssessment, levelLabel } from '../../../core/models/assessment.model';

@Component({
  selector: 'app-assessment-list',
  imports: [RouterLink, DecimalPipe, SlicePipe],
  styleUrl: '../../kpis/kpis.css',
  template: `
    <div class="header">
      <div><a class="back" [routerLink]="['/app/clients', clientId]">← Back to client</a><h1>360° Assessments</h1></div>
    </div>
    <p class="hint">Structured maturity assessments. Answer the questionnaire (progress is saved as you go), submit it, and get a score, the gaps found and recommended actions.</p>

    <h2 class="sub">Start a new assessment</h2>
    @if (loadingTemplates()) { <p class="hint">Loading…</p> }
    @else if (templates().length === 0) { <p class="hint">No assessment templates are available.</p> }
    @else {
      <div class="cards">
        @for (t of templates(); track t.id) {
          <div class="card">
            <h3>{{ t.name }}</h3>
            <p>{{ t.description }}</p>
            <div class="meta">{{ t.sectionCount }} sections · {{ t.questionCount }} questions</div>
            @if (inProgress(t.id); as running) {
              <a class="btn primary" [routerLink]="['/app/clients', clientId, 'assessments', running.id]">Continue ({{ running.progressPercentage }}%)</a>
            } @else if (canWrite()) {
              <button type="button" class="btn primary" (click)="start(t)" [disabled]="busy()">Start</button>
            }
          </div>
        }
      </div>
    }

    <h2 class="sub">History</h2>
    @if (loading()) { <p class="hint">Loading…</p> }
    @else if (failed()) { <p role="alert">Could not load assessments. <button type="button" (click)="load()">Try again</button></p> }
    @else if (assessments().length === 0) { <p class="hint">No assessments yet for this client.</p> }
    @else {
      <table>
        <thead><tr><th>Assessment</th><th>Started</th><th>Status</th><th>Progress</th><th>Score</th><th></th></tr></thead>
        <tbody>
          @for (a of assessments(); track a.id) {
            <tr>
              <td class="name">{{ a.templateName }}<div class="meta">{{ a.code }}</div></td>
              <td>{{ a.startedAt | slice: 0 : 10 }}</td>
              <td><span class="badge" [class.green]="a.status === 'Completed'" [class.amber]="a.status === 'InProgress'">{{ a.status === 'InProgress' ? 'In progress' : 'Completed' }}</span></td>
              <td>{{ a.answeredQuestions }}/{{ a.totalQuestions }} ({{ a.progressPercentage }}%)</td>
              <td>@if (a.overallScore !== null) { {{ a.overallScore | number: '1.0-1' }} · {{ label(a.level) }} } @else { — }</td>
              <td class="actions">
                @if (a.status === 'Completed') { <a class="btn" [routerLink]="['/app/clients', clientId, 'assessments', a.id, 'report']">Report</a> }
                @else { <a class="btn" [routerLink]="['/app/clients', clientId, 'assessments', a.id]">{{ canWrite() ? 'Continue' : 'View' }}</a> }
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: `.sub { font-size: 16px; margin: 22px 0 12px; }`,
})
export class AssessmentList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(AssessmentService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = inject(ActivatedRoute).snapshot.paramMap.get('clientId')!;
  protected readonly templates = signal<AssessmentTemplateSummary[]>([]);
  protected readonly assessments = signal<ClientAssessment[]>([]);
  protected readonly loadingTemplates = signal(true);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly label = levelLabel;
  protected readonly canWrite = this.auth.canWrite;

  constructor() {
    this.api.templates().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (t) => { this.templates.set(t); this.loadingTemplates.set(false); },
      error: () => this.loadingTemplates.set(false),
    });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.list(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (a) => { this.assessments.set(a); this.loading.set(false); },
      error: () => { this.loading.set(false); this.failed.set(true); },
    });
  }

  protected inProgress(templateId: string): ClientAssessment | undefined {
    return this.assessments().find((a) => a.templateId === templateId && a.status === 'InProgress');
  }

  protected start(t: AssessmentTemplateSummary): void {
    this.busy.set(true);
    this.api.start(this.clientId, t.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (a) => { this.notifications.success('Assessment started.'); this.busy.set(false); this.router.navigate(['/app/clients', this.clientId, 'assessments', a.id]); },
      error: () => this.busy.set(false),
    });
  }
}
