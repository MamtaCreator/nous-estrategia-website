import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { I18n } from '../core/i18n';
import { DEMO_MAX_MONTH, DEMO_MIN_MONTH, DEMO_SPEND_ROWS, DEMO_YEAR, DemoSpendRow } from './analytics-demo-data';

interface CategoryRow { key: string; budget: number; spent: number; balance: number; spentPercent: number; }
interface SampleAnalytics {
  year: number;
  minMonth: number;
  maxMonth: number;
  fromMonth: number;
  toMonth: number;
  category: string | null;
  totals: { budget: number; spent: number; balance: number; spentPercent: number };
  categories: CategoryRow[];
  monthly: { month: number; spent: number; budget: number }[];
  quarterly: { quarter: number; fromMonth: number; toMonth: number; spent: number }[];
  semesters: { semester: number; fromMonth: number; toMonth: number; spent: number; percent: number }[];
}

const SLICE_COLORS = ['#3ff0ff', '#ffffff', '#ffb84d', '#b78bff'];

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);
const sum = (rows: readonly DemoSpendRow[], pick: (r: DemoSpendRow) => number) => rows.reduce((t, r) => t + pick(r), 0);
const round1 = (value: number) => Math.round(value * 10) / 10;
// Percentages are rounded to one decimal, matching the figures the API returned.
const pct = (part: number, whole: number) => (whole === 0 ? 0 : round1((part / whole) * 100));

function group<K>(rows: readonly DemoSpendRow[], key: (r: DemoSpendRow) => K): [K, DemoSpendRow[]][] {
  const buckets = new Map<K, DemoSpendRow[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = buckets.get(k);
    if (bucket) bucket.push(row);
    else buckets.set(k, [row]);
  }
  return [...buckets.entries()];
}
const CIRCUMFERENCE = 2 * Math.PI * 36;

// Interactive dashboard over a fixed demo dataset held in the app (see analytics-demo-data.ts).
// Clicking a category, month, quarter or semester re-derives the figures in the browser, so the page needs no
// backend at all; labels follow the EN/ES toggle exactly as before.
@Component({
  selector: 'app-analytics-dashboard',
  templateUrl: './analytics-dashboard.html',
  styleUrl: './analytics-dashboard.css',
})
export class AnalyticsDashboard {
  protected readonly i18n = inject(I18n);

  /**
   * The figures to chart. Left unset it shows the bundled demo dataset, which is what the public home
   * page wants; the workspace passes the rows read from an uploaded spreadsheet instead.
   *
   * Everything below - totals, the category table, the monthly, quarterly and semester views, and all the
   * filtering - is derived from these rows, so the same component serves both without knowing the source.
   */
  readonly rows = input<readonly DemoSpendRow[]>(DEMO_SPEND_ROWS);

  /** Heading above the chart. Defaults to the demo dataset's name; the workspace passes the sheet's own. */
  readonly title = input<string>('');

  protected readonly data = signal<SampleAnalytics | null>(null);
  protected readonly failed = signal(false);
  protected readonly busy = signal(false);
  protected readonly category = signal<string | null>(null);
  protected readonly fromMonth = signal<number | null>(null);
  protected readonly toMonth = signal<number | null>(null);
  protected readonly tip = signal<{ x: number; y: number; text: string } | null>(null);

  protected readonly filtered = computed(() => this.category() !== null || this.fromMonth() !== null || this.toMonth() !== null);
  protected readonly months = computed(() => {
    const d = this.data();
    return d ? Array.from({ length: d.maxMonth - d.minMonth + 1 }, (_, i) => d.minMonth + i) : [];
  });

  constructor() {
    // Rebuild whenever the rows change: the workspace swaps in a new sheet without recreating the chart.
    //
    // Only rows() is tracked. The rest runs untracked because load() reads the filter signals, so without
    // this the effect would also re-run whenever a filter changed - and then clear it, making a click on
    // a category appear to do nothing.
    effect(() => {
      this.rows();
      untracked(() => {
        this.category.set(null);
        this.fromMonth.set(null);
        this.toMonth.set(null);
        this.load();
      });
    });
  }

  protected load(): void {
    this.failed.set(false);
    this.data.set(this.build());
  }

  /**
   * Aggregates the fixed rows the way the API used to, so the numbers on screen are unchanged:
   *  - the month range narrows the category table and the headline totals;
   *  - a chosen category narrows the monthly, quarterly and semester views;
   *  - the headline totals honour both at once.
   */
  private build(): SampleAnalytics {
    const rows = this.rows();
    // An uploaded sheet may cover any span of months, so the range comes from the rows themselves and
    // only falls back to the demo bounds when there is nothing to measure.
    const months = rows.map((r) => r.month);
    const minMonth = months.length ? Math.min(...months) : DEMO_MIN_MONTH;
    const maxMonth = months.length ? Math.max(...months) : DEMO_MAX_MONTH;

    let from = clamp(this.fromMonth() ?? minMonth, minMonth, maxMonth);
    let to = clamp(this.toMonth() ?? maxMonth, minMonth, maxMonth);
    if (to < from) [from, to] = [to, from];

    const category = this.category();
    const inRange = rows.filter((r) => r.month >= from && r.month <= to);
    const inCategory = category === null ? rows : rows.filter((r) => r.category === category);
    const both = inRange.filter((r) => category === null || r.category === category);

    const categories: CategoryRow[] = group(inRange, (r) => r.category)
      .map(([key, rowsForKey]) => {
        const budget = sum(rowsForKey, (r) => r.budget);
        const spent = sum(rowsForKey, (r) => r.spent);
        return { key, budget, spent, balance: budget - spent, spentPercent: pct(spent, budget) };
      })
      .sort((a, b) => b.spent - a.spent);

    const totalBudget = sum(both, (r) => r.budget);
    const totalSpent = sum(both, (r) => r.spent);
    const allSpent = sum(inCategory, (r) => r.spent);

    return {
      year: DEMO_YEAR,
      minMonth,
      maxMonth,
      fromMonth: from,
      toMonth: to,
      category,
      totals: { budget: totalBudget, spent: totalSpent, balance: totalBudget - totalSpent, spentPercent: pct(totalSpent, totalBudget) },
      categories,
      monthly: group(inCategory, (r) => r.month)
        .sort((a, b) => a[0] - b[0])
        .map(([month, g]) => ({ month, spent: sum(g, (r) => r.spent), budget: sum(g, (r) => r.budget) })),
      quarterly: group(inCategory, (r) => Math.floor((r.month - 1) / 3) + 1)
        .sort((a, b) => a[0] - b[0])
        .map(([quarter, g]) => ({
          quarter,
          fromMonth: (quarter - 1) * 3 + 1,
          toMonth: Math.min(quarter * 3, maxMonth),
          spent: sum(g, (r) => r.spent),
        })),
      semesters: group(inCategory, (r) => Math.floor((r.month - 1) / 6) + 1)
        .sort((a, b) => a[0] - b[0])
        .map(([semester, g]) => {
          const spent = sum(g, (r) => r.spent);
          return {
            semester,
            fromMonth: (semester - 1) * 6 + 1,
            toMonth: Math.min(semester * 6, maxMonth),
            spent,
            percent: allSpent === 0 ? 0 : round1((spent / allSpent) * 100),
          };
        }),
    };
  }

  // ---- interactions -------------------------------------------------------
  protected toggleCategory(key: string): void {
    this.category.set(this.category() === key ? null : key);
    this.load();
  }
  protected setRange(from: number | null, to: number | null): void {
    const same = this.fromMonth() === from && this.toMonth() === to;
    this.fromMonth.set(same ? null : from);
    this.toMonth.set(same ? null : to);
    this.load();
  }
  protected onFrom(value: string): void {
    this.fromMonth.set(value ? Number(value) : null);
    if (this.toMonth() !== null && this.fromMonth() !== null && this.toMonth()! < this.fromMonth()!) this.toMonth.set(this.fromMonth());
    this.load();
  }
  protected onTo(value: string): void {
    this.toMonth.set(value ? Number(value) : null);
    if (this.fromMonth() !== null && this.toMonth() !== null && this.toMonth()! < this.fromMonth()!) this.fromMonth.set(this.toMonth());
    this.load();
  }
  protected clear(): void {
    this.category.set(null);
    this.fromMonth.set(null);
    this.toMonth.set(null);
    this.load();
  }
  protected isRange(from: number, to: number): boolean {
    const d = this.data();
    return !!d && this.filtered() && this.fromMonth() === from && this.toMonth() === to;
  }

  protected showTip(event: MouseEvent | FocusEvent, text: string): void {
    const host = (event.currentTarget as HTMLElement).closest('.dash') as HTMLElement | null;
    const box = host?.getBoundingClientRect();
    if (!box) return;
    const target = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event instanceof MouseEvent ? event.clientX - box.left : target.left - box.left + target.width / 2;
    const y = event instanceof MouseEvent ? event.clientY - box.top : target.top - box.top;
    this.tip.set({ x, y, text });
  }
  protected hideTip(): void {
    this.tip.set(null);
  }

  // ---- formatting (follows the EN/ES toggle) -------------------------------
  protected t = (key: string): string => this.i18n.t(key);
  protected n(value: number, digits = 0): string {
    return new Intl.NumberFormat(this.i18n.lang(), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  }
  /**
   * The demo dataset uses fixed keys with translations behind them ("base_salary" reads as "Base salary"
   * or "Sueldo base"). An uploaded spreadsheet brings whatever the person wrote in their own sheet, and
   * there is no translation for that - so an unknown key is shown exactly as it came in, rather than
   * leaking the lookup key onto the screen as "demo.cat.Sueldo base".
   */
  protected catName(key: string): string {
    const translated = this.i18n.t('demo.cat.' + key);
    return translated === 'demo.cat.' + key ? key : translated;
  }
  protected monthName(month: number, style: 'short' | 'long' = 'short'): string {
    return new Intl.DateTimeFormat(this.i18n.lang(), { month: style }).format(new Date(2019, month - 1, 1));
  }
  protected period(d: SampleAnalytics): string {
    return `${this.monthName(d.fromMonth, 'long')} – ${this.monthName(d.toMonth, 'long')} ${d.year}`;
  }

  // ---- derived geometry -----------------------------------------------------
  protected readonly maxSpent = computed(() => Math.max(1, ...(this.data()?.categories ?? []).map((r) => r.spent)));
  protected readonly maxQuarter = computed(() => Math.max(1, ...(this.data()?.quarterly ?? []).map((q) => q.spent)));
  protected readonly gaugeEnd = computed(() => {
    const t = this.data()?.totals;
    const angle = Math.PI * (1 - (t && t.budget ? Math.min(1, t.spent / t.budget) : 0));
    return { x: 100 + 80 * Math.cos(angle), y: 100 - 80 * Math.sin(angle) };
  });
  protected readonly linePoints = computed(() => {
    const m = this.data()?.monthly ?? [];
    if (!m.length) return [];
    const vals = m.map((p) => p.spent);
    const lo = Math.min(...vals) * 0.96;
    const hi = Math.max(...vals) * 1.03;
    return m.map((p, i) => ({
      x: 14 + (i * 212) / Math.max(1, m.length - 1),
      y: 100 - ((p.spent - lo) / (hi - lo || 1)) * 78,
      v: p.spent,
      month: p.month,
    }));
  });
  protected readonly linePath = computed(() => this.linePoints().map((p) => `${p.x},${p.y}`).join(' '));
  protected readonly slices = computed(() => (this.data()?.semesters ?? []).map((s, i) => ({ ...s, color: SLICE_COLORS[i % SLICE_COLORS.length] })));
  protected dash(pct: number): string {
    const len = (pct / 100) * CIRCUMFERENCE;
    return `${len} ${CIRCUMFERENCE - len}`;
  }
  protected offset(index: number): number {
    return -this.slices().slice(0, index).reduce((s, x) => s + (x.percent / 100) * CIRCUMFERENCE, 0);
  }
  protected readonly sortedRows = computed(() => [...(this.data()?.categories ?? [])].sort((a, b) => this.catName(a.key).localeCompare(this.catName(b.key))));
  protected readonly tableTotals = computed(() => {
    const rows = this.data()?.categories ?? [];
    const budget = rows.reduce((s, r) => s + r.budget, 0);
    const spent = rows.reduce((s, r) => s + r.spent, 0);
    return { budget, spent, balance: budget - spent, pct: budget ? (spent / budget) * 100 : 0 };
  });
}
