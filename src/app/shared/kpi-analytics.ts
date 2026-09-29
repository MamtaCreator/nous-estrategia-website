import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KpiService } from '../modules/kpis/services/kpi.service';
import { ClientService } from '../modules/clients/services/client.service';
import { Kpi, KpiHistory, KpiSummary } from '../core/models/kpi.model';
import { Client } from '../core/models/client.model';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { DemoService } from '../modules/demo/demo.service';

const CIRCUMFERENCE = 2 * Math.PI * 36;
const STATUS_COLORS: Record<string, string> = { Green: '#3ff0ff', Amber: '#ffb84d', Red: '#ff5c6c', 'Not evaluated': '#6b7796' };

// Same dark analytics layout as the public showcase, drawn from the signed-in user's real KPI data.
@Component({
  selector: 'app-kpi-analytics',
  imports: [DecimalPipe],
  templateUrl: './kpi-analytics.html',
  styleUrl: './analytics-dashboard.css',
})
export class KpiAnalytics {
  private readonly destroyRef = inject(DestroyRef);
  private readonly kpiService = inject(KpiService);
  private readonly clientService = inject(ClientService);
  private readonly demo = inject(DemoService);
  private readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  /** Optional: pin a client; otherwise the user can pick one from the list they can access. */
  readonly clientId = input<string | null>(null);
  private requestVersion = 0;
  private historyVersion = 0;

  protected readonly clients = signal<Client[]>([]);
  protected readonly selectedClientId = signal<string | null>(null);
  protected readonly kpis = signal<Kpi[]>([]);
  protected readonly summary = signal<KpiSummary | null>(null);
  protected readonly history = signal<KpiHistory | null>(null);
  protected readonly selectedKpiId = signal<string | null>(null);
  protected readonly days = signal(30);
  protected readonly isLoading = signal(true);
  protected readonly failed = signal(false);
  protected readonly noClients = signal(false);
  protected readonly seeding = signal(false);
  protected readonly canSeed = this.auth.canWrite;

  /** Fills an empty workspace with one realistic sample client so the dashboard has something to show. */
  protected loadSampleData(): void {
    if (this.seeding()) return;
    this.seeding.set(true);
    this.demo.createSampleClient().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.seeding.set(false);
        this.notifications.success(r.alreadyExisted ? 'Sample client already present.' : `Sample client "${r.companyName}" created.`);
        this.noClients.set(false);
        this.loadClients();
      },
      error: () => this.seeding.set(false),
    });
  }

  protected readonly clientName = computed(() => this.clients().find((c) => c.id === this.selectedClientId())?.companyName ?? '');
  protected readonly evaluated = computed(() => (this.summary() ? this.summary()!.total - this.summary()!.notEvaluated : 0));
  protected readonly onTargetPct = computed(() => (this.evaluated() ? ((this.summary()?.green ?? 0) / this.evaluated()) * 100 : 0));
  protected readonly categories = computed(() => Object.entries(this.summary()?.byCategory ?? {}).map(([name, count]) => ({ name, count })));
  protected readonly maxCategory = computed(() => Math.max(1, ...this.categories().map((c) => c.count)));
  protected readonly attainment = computed(() =>
    this.kpis().filter((k) => k.percentageToTarget !== null).map((k) => ({ name: k.name, pct: k.percentageToTarget as number })).slice(0, 10));
  protected readonly maxAttainment = computed(() => Math.max(100, ...this.attainment().map((a) => a.pct)));
  protected readonly sortedKpis = computed(() => [...this.kpis()].sort((a, b) => a.name.localeCompare(b.name)));

  protected readonly statusSlices = computed(() => {
    const s = this.summary();
    if (!s || s.total === 0) return [];
    return [
      { label: 'Green', count: s.green },
      { label: 'Amber', count: s.amber },
      { label: 'Red', count: s.red },
      { label: 'Not evaluated', count: s.notEvaluated },
    ].filter((x) => x.count > 0).map((x) => ({ ...x, pct: (x.count / s.total) * 100, color: STATUS_COLORS[x.label] }));
  });

  protected readonly gaugeEnd = computed(() => {
    const angle = Math.PI * (1 - this.onTargetPct() / 100);
    return { x: 100 + 80 * Math.cos(angle), y: 100 - 80 * Math.sin(angle) };
  });

  protected readonly linePoints = computed(() => {
    const h = this.history();
    if (!h || !h.values.length) return [];
    const lo = Math.min(...h.values);
    const hi = Math.max(...h.values);
    const span = hi - lo || 1;
    return h.values.map((v, i) => ({
      x: 14 + (i * 212) / Math.max(1, h.values.length - 1),
      y: 100 - ((v - lo) / span) * 70,
      v,
      n: new Date(h.measurementDates[i]).getDate(),
    }));
  });
  protected readonly linePath = computed(() => this.linePoints().map((p) => `${p.x},${p.y}`).join(' '));

  constructor() {
    this.loadClients();
  }

  private loadClients(): void {
    this.clientService.loadClients({ page: 1, limit: 100 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (rows) => {
        this.clients.set(rows);
        const pinned = this.clientId();
        const first = pinned ?? rows[0]?.id ?? null;
        if (!first) {
          this.noClients.set(true); this.isLoading.set(false);
          return;
        }
        this.selectClient(first);
      },
      error: () => { this.failed.set(true); this.isLoading.set(false); },
    });
  }

  protected selectClient(id: string): void {
    const version = ++this.requestVersion;
    ++this.historyVersion;
    this.selectedClientId.set(id);
    this.summary.set(null);
    this.kpis.set([]);
    this.selectedKpiId.set(null);
    this.isLoading.set(true);
    this.failed.set(false);
    this.history.set(null);
    this.kpiService.summary(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (s) => { if(version===this.requestVersion) this.summary.set(s); }, error: () => { if(version===this.requestVersion) this.failed.set(true); } });
    this.kpiService.list(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (rows) => {
        if (version !== this.requestVersion) return;
        this.kpis.set(rows);
        this.isLoading.set(false);
        const withData = rows.find((k) => k.lastMeasuredAt) ?? rows[0];
        if (withData) this.selectKpi(withData.id);
      },
      error: () => { if(version===this.requestVersion) { this.isLoading.set(false); this.failed.set(true); } },
    });
  }

  protected selectKpi(id: string): void {
    const version = ++this.historyVersion;
    this.selectedKpiId.set(id);
    this.history.set(null);
    this.kpiService.history(id, this.days()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (h) => { if(version===this.historyVersion) this.history.set(h); }, error: () => { if(version===this.historyVersion) this.history.set(null); } });
  }

  protected dash(pct: number): string {
    const len = (pct / 100) * CIRCUMFERENCE;
    return `${len} ${CIRCUMFERENCE - len}`;
  }
  protected offset(index: number): number {
    return -this.statusSlices().slice(0, index).reduce((s, x) => s + (x.pct / 100) * CIRCUMFERENCE, 0);
  }
  protected value(k: Kpi): string {
    return k.currentValue === null ? '—' : `${Math.round(k.currentValue * 100) / 100}${k.unit ? ' ' + k.unit : ''}`;
  }
}
