import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Phase4Service } from '../services/phase4.service';
import { KpiService } from '../../kpis/services/kpi.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Kpi } from '../../../core/models/kpi.model';
import { REPORT_FORMATS, REPORT_TYPES, ReportExecution, ReportFormat, ReportType, SavedReport } from '../../../core/models/phase4.model';

@Component({
  selector: 'app-reports-page',
  imports: [ReactiveFormsModule, RouterLink],
  styleUrl: '../../kpis/kpis.css',
  template: `
    <div class="header">
      <div><a class="back" [routerLink]="['/app/clients', clientId]">← Back to client</a><h1>Reports</h1></div>
      @if (canWrite()) { <button type="button" class="btn primary" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New report' }}</button> }
    </div>
    <p class="hint">Saved report definitions. Download one on demand, or schedule it with a cron expression (UTC, 5 fields, e.g. <code>0 8 * * 1</code> = Mondays 08:00).</p>

    @if (showForm()) {
      <form class="form-card" [formGroup]="form" (ngSubmit)="create()">
        <div class="grid">
          <label class="span-2"><span>Name</span><input type="text" formControlName="name" /></label>
          <label><span>Type</span><select formControlName="type">@for (t of types; track t) { <option [value]="t">{{ t }}</option> }</select></label>
          <label><span>Format</span><select formControlName="format">@for (f of formats; track f) { <option [value]="f">{{ f }}</option> }</select></label>
          <label><span>Period (days, 1–365)</span><input type="number" formControlName="periodDays" min="1" max="365" /></label>
          <label class="check"><input type="checkbox" formControlName="isScheduled" /> Run on a schedule</label>
          @if (form.controls.isScheduled.value) {
            <label><span>Cron expression</span><input type="text" formControlName="cron" placeholder="0 8 * * 1" /></label>
            <label class="span-2"><span>Email recipients (comma-separated)</span><input type="text" formControlName="emails" /></label>
          }
        </div>
        @if (form.controls.type.value === 'Custom') {
          <h3>KPIs to include</h3>
          <div class="check-list">
            @for (k of kpis(); track k.id) {
              <label class="check"><input type="checkbox" [checked]="picked().includes(k.id)" (change)="pick(k.id, $any($event.target).checked)" /> {{ k.name }}</label>
            } @empty { <p class="hint">No KPIs yet.</p> }
          </div>
        }
        <div class="footer"><button type="submit" class="btn primary" [disabled]="busy()">Save report</button></div>
      </form>
    }

    @if (loading()) { <p class="hint">Loading…</p> }
    @else if (failed()) { <p role="alert">Could not load reports. <button type="button" (click)="load()">Try again</button></p> }
    @else if (reports().length === 0) { <p class="hint">No saved reports yet.</p> }
    @else {
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Schedule</th><th>Last generated</th><th></th></tr></thead>
        <tbody>
          @for (r of reports(); track r.id) {
            <tr>
              <td class="name">{{ r.name }}</td>
              <td>{{ r.type }} · {{ r.format }} · {{ r.periodDays }}d</td>
              <td>{{ r.isScheduled ? r.cronExpression + ' (next ' + (r.nextScheduledAt ?? '—').slice(0, 16).replace('T', ' ') + ')' : 'On demand' }}</td>
              <td>{{ r.lastGeneratedAt ? r.lastGeneratedAt.slice(0, 16).replace('T', ' ') : '—' }}</td>
              <td class="actions">
                @for (f of formats; track f) { <button type="button" class="btn" (click)="download(r, f)" [disabled]="busy()">{{ f }}</button> }
                <button type="button" class="btn" (click)="toggleHistory(r)">History</button>
                @if (canWrite()) { <button type="button" class="btn" (click)="remove(r)">Delete</button> }
              </td>
            </tr>
            @if (openId() === r.id) {
              <tr><td colspan="5">
                @if (history().length === 0) { <span class="hint">No runs yet.</span> }
                @for (e of history(); track e.id) {
                  <div class="meta">{{ e.executedAt.slice(0, 16).replace('T', ' ') }} · {{ e.wasScheduled ? 'scheduled' : 'on demand' }} · {{ e.status }} · {{ e.kpiCount }} KPIs · {{ e.fileSizeBytes }} bytes@if (e.errorMessage) { · {{ e.errorMessage }} }</div>
                }
              </td></tr>
            }
          }
        </tbody>
      </table>
    }
  `,
})
export class ReportsPage {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Phase4Service);
  private readonly kpiService = inject(KpiService);
  private readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = inject(ActivatedRoute).snapshot.paramMap.get('clientId')!;
  protected readonly reports = signal<SavedReport[]>([]);
  protected readonly kpis = signal<Kpi[]>([]);
  protected readonly picked = signal<string[]>([]);
  protected readonly history = signal<ReportExecution[]>([]);
  protected readonly openId = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly showForm = signal(false);
  protected readonly types = REPORT_TYPES;
  protected readonly formats = REPORT_FORMATS;
  protected readonly canWrite = this.auth.canWrite;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    type: this.fb.nonNullable.control<ReportType>('ExecutiveOverview'),
    format: this.fb.nonNullable.control<ReportFormat>('PDF'),
    periodDays: [30, [Validators.required, Validators.min(1), Validators.max(365)]],
    isScheduled: [false],
    cron: [''],
    emails: [''],
  });

  constructor() {
    this.load();
    this.kpiService.list(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (k) => this.kpis.set(k.filter((x) => x.isActive)), error: () => {} });
  }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.reports(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.reports.set(r); this.loading.set(false); },
      error: () => { this.loading.set(false); this.failed.set(true); },
    });
  }

  protected pick(id: string, on: boolean): void {
    this.picked.update((l) => (on ? [...l, id] : l.filter((x) => x !== id)));
  }

  protected create(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.api.createReport({
      clientId: this.clientId, name: v.name, description: '', type: v.type, format: v.format,
      kpiIds: v.type === 'Custom' ? this.picked() : [], periodDays: v.periodDays,
      isScheduled: v.isScheduled, cronExpression: v.isScheduled ? v.cron.trim() : null,
      recipientEmails: v.isScheduled ? v.emails.split(',').map((e) => e.trim()).filter(Boolean) : [],
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.notifications.success('Report saved.'); this.busy.set(false); this.showForm.set(false); this.picked.set([]); this.load(); },
      error: () => this.busy.set(false),
    });
  }

  protected download(r: SavedReport, format: ReportFormat): void {
    this.busy.set(true);
    this.api.downloadReport(r.id, format).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (name) => { this.notifications.success(`Downloaded ${name}.`); this.busy.set(false); this.load(); },
      error: () => this.busy.set(false),
    });
  }

  protected toggleHistory(r: SavedReport): void {
    if (this.openId() === r.id) { this.openId.set(null); return; }
    this.openId.set(r.id);
    this.history.set([]);
    this.api.executions(r.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (h) => this.history.set(h) });
  }

  protected remove(r: SavedReport): void {
    if (!confirm(`Delete report "${r.name}"?`)) return;
    this.api.deleteReport(r.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.notifications.success('Report deleted.'); this.load(); } });
  }
}
