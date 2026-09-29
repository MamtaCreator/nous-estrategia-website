import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Phase4Service } from '../services/phase4.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuditLog } from '../../../core/models/phase4.model';

const ENTITY_TYPES = ['Client', 'Project', 'KPI', 'Dashboard', 'Report', 'Alert', 'FinanceData', 'MarketingCampaign', 'ProcessFlow', 'AIAutomation'];

@Component({
  selector: 'app-audit-page',
  imports: [RouterLink],
  styleUrl: '../../kpis/kpis.css',
  template: `
    <div class="header">
      <div><a class="back" [routerLink]="['/app/clients', clientId]">← Back to client</a><h1>Audit log</h1></div>
      <select (change)="onType($any($event.target).value)">
        <option value="">All record types</option>
        @for (t of entityTypes; track t) { <option [value]="t">{{ t }}</option> }
      </select>
    </div>
    @if (!isAdmin()) {
      <p class="notice">Only an Admin can view the audit log.</p>
    } @else if (loading()) { <p class="hint">Loading…</p> }
    @else if (failed()) { <p role="alert">Could not load the audit log. <button type="button" (click)="load()">Try again</button></p> }
    @else if (rows().length === 0) { <p class="hint">No recorded changes.</p> }
    @else {
      <table>
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Changes</th></tr></thead>
        <tbody>
          @for (r of rows(); track r.id) {
            <tr>
              <td>{{ r.createdAt.slice(0, 19).replace('T', ' ') }}</td>
              <td>{{ r.userName ?? 'system' }}</td>
              <td><span class="badge" [class.green]="r.action === 'Create'" [class.amber]="r.action === 'Update'" [class.red]="r.action === 'Delete'">{{ r.action }}</span></td>
              <td>{{ r.entityType }}</td>
              <td class="changes">{{ r.changes ?? '—' }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: `.changes { max-width: 420px; overflow-wrap: anywhere; font-family: ui-monospace, monospace; font-size: 11px; }`,
})
export class AuditPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Phase4Service);
  private readonly auth = inject(AuthService);

  protected readonly clientId = inject(ActivatedRoute).snapshot.paramMap.get('clientId')!;
  protected readonly rows = signal<AuditLog[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly type = signal('');
  protected readonly entityTypes = ENTITY_TYPES;
  protected readonly isAdmin = this.auth.isAdmin;

  constructor() { if (this.isAdmin()) this.load(); else this.loading.set(false); }

  protected onType(v: string): void { this.type.set(v); this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.audit(this.clientId, this.type() || undefined).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => { this.loading.set(false); this.failed.set(true); },
    });
  }
}
