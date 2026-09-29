import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Phase4Service } from '../services/phase4.service';
import { KpiService } from '../../kpis/services/kpi.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Kpi } from '../../../core/models/kpi.model';
import { ALERT_CONDITIONS, ALERT_SEVERITIES, Alert, AlertCondition, AlertSeverity } from '../../../core/models/phase4.model';

@Component({
  selector: 'app-alerts-page',
  imports: [ReactiveFormsModule, RouterLink],
  styleUrl: '../../kpis/kpis.css',
  template: `
    <div class="header">
      <div><a class="back" [routerLink]="['/app/clients', clientId]">← Back to client</a><h1>Alerts</h1></div>
      @if (canWrite()) { <button type="button" class="btn primary" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New alert' }}</button> }
    </div>
    <p class="hint">An alert watches one KPI. It notifies the client's team when a new value breaches the rule, and again when it recovers.</p>

    @if (showForm()) {
      <form class="form-card" [formGroup]="form" (ngSubmit)="create()">
        <div class="grid">
          <label class="span-2"><span>Name</span><input type="text" formControlName="alertName" /></label>
          <label><span>KPI</span>
            <select formControlName="kpiId"><option value="">Select…</option>@for (k of kpis(); track k.id) { <option [value]="k.id">{{ k.name }}</option> }</select>
          </label>
          <label><span>Condition</span>
            <select formControlName="condition">@for (c of conditions; track c) { <option [value]="c">{{ c }}</option> }</select>
          </label>
          <label><span>Threshold</span><input type="number" formControlName="threshold" step="any" /></label>
          @if (form.controls.condition.value === 'Outside') {
            <label><span>Upper threshold (must be above threshold)</span><input type="number" formControlName="upperThreshold" step="any" /></label>
          }
          <label><span>Severity</span>
            <select formControlName="severity">@for (s of severities; track s) { <option [value]="s">{{ s }}</option> }</select>
          </label>
          <label class="span-2"><span>Extra email recipients (comma-separated, optional)</span><input type="text" formControlName="emails" /></label>
        </div>
        <div class="footer"><button type="submit" class="btn primary" [disabled]="busy()">Create alert</button></div>
      </form>
    }

    @if (loading()) { <p class="hint">Loading…</p> }
    @else if (failed()) { <p role="alert">Could not load alerts. <button type="button" (click)="load()">Try again</button></p> }
    @else if (alerts().length === 0) { <p class="hint">No alerts yet.</p> }
    @else {
      <table>
        <thead><tr><th>Name</th><th>KPI</th><th>Rule</th><th>Severity</th><th>State</th><th>Last triggered</th><th></th></tr></thead>
        <tbody>
          @for (a of alerts(); track a.id) {
            <tr>
              <td class="name">{{ a.alertName }}</td>
              <td>{{ a.kpiName }}</td>
              <td>{{ a.condition }} {{ a.threshold }}@if (a.upperThreshold !== null) { – {{ a.upperThreshold }} }</td>
              <td><span class="badge" [class.red]="a.severity === 'Critical'" [class.amber]="a.severity === 'Warning'">{{ a.severity }}</span></td>
              <td>@if (!a.isActive) { <span class="badge">Paused</span> } @else if (a.isBreaching) { <span class="badge red">Breaching</span> } @else { <span class="badge green">OK</span> }</td>
              <td>{{ a.lastTriggeredAt ? a.lastTriggeredAt.slice(0, 16).replace('T', ' ') : '—' }}</td>
              <td class="actions">
                @if (canWrite()) {
                  <button type="button" class="btn" (click)="toggle(a)">{{ a.isActive ? 'Pause' : 'Resume' }}</button>
                  <button type="button" class="btn" (click)="remove(a)">Delete</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class AlertsPage {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Phase4Service);
  private readonly kpiService = inject(KpiService);
  private readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = inject(ActivatedRoute).snapshot.paramMap.get('clientId')!;
  protected readonly alerts = signal<Alert[]>([]);
  protected readonly kpis = signal<Kpi[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly showForm = signal(false);
  protected readonly conditions = ALERT_CONDITIONS;
  protected readonly severities = ALERT_SEVERITIES;
  protected readonly canWrite = this.auth.canWrite;

  protected readonly form = this.fb.nonNullable.group({
    alertName: ['', [Validators.required, Validators.maxLength(200)]],
    kpiId: ['', Validators.required],
    condition: this.fb.nonNullable.control<AlertCondition>('LessThan'),
    threshold: [0, Validators.required],
    upperThreshold: this.fb.control<number | null>(null),
    severity: this.fb.nonNullable.control<AlertSeverity>('Warning'),
    emails: [''],
  });

  constructor() {
    this.load();
    this.kpiService.list(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (k) => this.kpis.set(k.filter((x) => x.isActive)), error: () => {} });
  }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.alerts(this.clientId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (a) => { this.alerts.set(a); this.loading.set(false); },
      error: () => { this.loading.set(false); this.failed.set(true); },
    });
  }

  protected create(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.api.createAlert({
      clientId: this.clientId, kpiId: v.kpiId, alertName: v.alertName, alertType: 'KPIThreshold', severity: v.severity,
      condition: v.condition, threshold: v.threshold, upperThreshold: v.condition === 'Outside' ? v.upperThreshold : null,
      recipientEmails: v.emails.split(',').map((e) => e.trim()).filter(Boolean),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.notifications.success('Alert created.'); this.busy.set(false); this.showForm.set(false); this.form.reset({ condition: 'LessThan', severity: 'Warning', threshold: 0 }); this.load(); },
      error: () => this.busy.set(false),
    });
  }

  protected toggle(a: Alert): void {
    this.api.updateAlert(a.id, {
      alertName: a.alertName, severity: a.severity, condition: a.condition, threshold: a.threshold,
      upperThreshold: a.upperThreshold, recipientEmails: a.recipientEmails, isActive: !a.isActive,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.load() });
  }

  protected remove(a: Alert): void {
    if (!confirm(`Delete alert "${a.alertName}"?`)) return;
    this.api.deleteAlert(a.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.notifications.success('Alert deleted.'); this.load(); } });
  }
}
