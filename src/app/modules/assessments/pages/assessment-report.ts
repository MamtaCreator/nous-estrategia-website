import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AssessmentService } from '../services/assessment.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  AssessmentRecommendation, AssessmentReport, RECOMMENDATION_STATUSES, RecommendationStatus, levelLabel,
} from '../../../core/models/assessment.model';

@Component({
  selector: 'app-assessment-report',
  imports: [RouterLink, DecimalPipe, SlicePipe],
  styleUrl: '../../kpis/kpis.css',
  template: `
    <a class="back" [routerLink]="['/app/clients', clientId, 'assessments']">← Back to assessments</a>

    @if (loading()) { <p class="hint">Loading…</p> }
    @else if (failed()) { <p role="alert">Could not load the report. <button type="button" (click)="load()">Try again</button></p> }
    @else if (report(); as r) {
      <div class="header">
        <div>
          <h1>{{ r.templateName }}</h1>
          <p class="hint">{{ r.clientName }} · {{ r.code }} · completed {{ r.completedAt | slice: 0 : 10 }}</p>
        </div>
        <div class="actions">
          <button type="button" class="btn" (click)="download('pdf')" [disabled]="busy()">Download PDF</button>
          <button type="button" class="btn" (click)="download('excel')" [disabled]="busy()">Download Excel</button>
        </div>
      </div>

      <div class="score-hero" [attr.data-level]="r.level">
        <div class="score"><strong>{{ r.overallScore | number: '1.0-1' }}</strong><span>/ 100</span></div>
        <div>
          <span class="badge lvl">{{ label(r.level) }}</span>
          <p>{{ r.executiveSummary }}</p>
          <p class="meta">{{ r.criticalGaps }} critical · {{ r.highGaps }} high-risk gap(s)</p>
        </div>
      </div>

      <div class="cards">
        <div class="card">
          <h3>Maturity by section</h3>
          @for (s of r.sections; track s.sectionId) {
            <div class="hb">
              <span class="hl">{{ s.sectionName }}</span>
              <span class="ht"><span class="hf" [style.width.%]="s.score" [attr.data-level]="s.level"></span></span>
              <span class="hv">{{ s.score | number: '1.0-0' }} · {{ label(s.level) }}</span>
            </div>
          }
          <p class="meta">Scale: Ad-hoc &lt;20 · Repeatable &lt;40 · Defined &lt;60 · Managed &lt;80 · Optimized 80+</p>
        </div>
        <div class="card">
          <h3>Progress over time</h3>
          @if (r.trend.length < 2) { <p class="hint">Complete this assessment again later to see the trend.</p> }
          @for (t of r.trend; track t.assessmentId) {
            <div class="hb">
              <span class="hl">{{ t.completedAt | slice: 0 : 10 }}</span>
              <span class="ht"><span class="hf" [style.width.%]="t.score" [attr.data-level]="t.level"></span></span>
              <span class="hv">{{ t.score | number: '1.0-0' }}</span>
            </div>
          }
        </div>
      </div>

      <h2 class="sub">Gaps ({{ r.gaps.length }})</h2>
      @if (r.gaps.length === 0) { <p class="hint">No gaps identified — every scored answer reached the target maturity.</p> }
      @else {
        <table>
          <thead><tr><th>Risk</th><th>Area</th><th>Section</th><th>Finding</th><th>Gap</th></tr></thead>
          <tbody>
            @for (g of r.gaps; track g.id) {
              <tr>
                <td><span class="badge" [class.red]="g.riskLevel === 'Critical' || g.riskLevel === 'High'" [class.amber]="g.riskLevel === 'Medium'">{{ g.riskLevel }}</span></td>
                <td>{{ g.area }}</td><td>{{ g.sectionName }}</td><td>{{ g.description }}</td><td>{{ g.gapPoints | number: '1.0-0' }} pts</td>
              </tr>
            }
          </tbody>
        </table>
      }

      <h2 class="sub">Recommendations ({{ r.recommendations.length }})</h2>
      @if (r.recommendations.length === 0) { <p class="hint">No recommendations.</p> }
      @else {
        <div class="cards">
          @for (rec of r.recommendations; track rec.id) {
            <div class="card">
              <h3>{{ rec.title }} <span class="badge" [class.red]="rec.priority === 'Immediate' || rec.priority === 'High'" [class.amber]="rec.priority === 'Medium'">{{ rec.priority }}</span></h3>
              <p>{{ rec.description }}</p>
              <div class="meta">Effort: {{ rec.estimatedEffort }}</div>
              <div class="meta">{{ rec.expectedBenefit }}</div>
              <label class="st">Status
                <select [disabled]="!canWrite()" (change)="setStatus(rec, $any($event.target).value)">
                  @for (s of statuses; track s) { <option [value]="s" [selected]="rec.status === s">{{ s === 'InProgress' ? 'In progress' : s }}</option> }
                </select>
              </label>
            </div>
          }
        </div>
      }
    }
  `,
  styles: `
    .sub { font-size: 16px; margin: 24px 0 12px; }
    .score-hero { display: flex; gap: 24px; align-items: center; background: #fff; border-radius: 10px; padding: 22px 26px; box-shadow: 0 1px 3px rgba(0,0,0,.08); margin-bottom: 20px; border-left: 6px solid #6b7796; }
    .score-hero[data-level='AdHoc'] { border-left-color: #c62828; } .score-hero[data-level='Repeatable'] { border-left-color: #e07b00; }
    .score-hero[data-level='Defined'] { border-left-color: #b8790b; } .score-hero[data-level='Managed'] { border-left-color: #2b5fb0; } .score-hero[data-level='Optimized'] { border-left-color: #1e8e4a; }
    .score strong { font-size: 54px; line-height: 1; } .score span { color: #667085; margin-left: 4px; }
    .lvl { font-size: 13px; }
    .hb { display: grid; grid-template-columns: 150px 1fr 110px; gap: 10px; align-items: center; margin: 8px 0; font-size: 12px; }
    .ht { height: 12px; background: #eef1f6; border-radius: 3px; overflow: hidden; } .hf { display: block; height: 100%; background: #2b5fb0; }
    .hf[data-level='AdHoc'] { background: #c62828; } .hf[data-level='Repeatable'] { background: #e07b00; } .hf[data-level='Defined'] { background: #b8790b; }
    .hf[data-level='Managed'] { background: #2b5fb0; } .hf[data-level='Optimized'] { background: #1e8e4a; }
    .hv { text-align: right; } .st { margin-top: 10px; }
    @media (max-width: 720px) { .score-hero { flex-direction: column; align-items: flex-start; } .hb { grid-template-columns: 90px 1fr 90px; } }
  `,
})
export class AssessmentReportPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(AssessmentService);
  private readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = inject(ActivatedRoute).snapshot.paramMap.get('clientId')!;
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;

  protected readonly report = signal<AssessmentReport | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly statuses = RECOMMENDATION_STATUSES;
  protected readonly label = levelLabel;
  protected readonly canWrite = this.auth.canWrite;

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.report(this.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.report.set(r); this.loading.set(false); },
      error: () => { this.loading.set(false); this.failed.set(true); },
    });
  }

  protected setStatus(rec: AssessmentRecommendation, status: RecommendationStatus): void {
    this.api.updateRecommendation(rec.id, status).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.report.update((r) => r && { ...r, recommendations: r.recommendations.map((x) => (x.id === updated.id ? updated : x)) });
        this.notifications.success('Status updated.');
      },
      error: () => this.load(),
    });
  }

  protected download(format: 'pdf' | 'excel'): void {
    this.busy.set(true);
    this.api.download(this.id, format).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (name) => { this.notifications.success(`Downloaded ${name}.`); this.busy.set(false); },
      error: () => this.busy.set(false),
    });
  }
}
