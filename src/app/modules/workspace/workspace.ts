import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalyticsDashboard } from '../../shared/analytics-dashboard';
import { SiteHeader } from '../../shared/site-header';
import { SessionName } from './session-name';
import { ColumnMap, SheetTable, guessColumns, mapRows, readWorkbook } from './sheet-reader';

type Field = keyof ColumnMap;

@Component({
  selector: 'app-workspace',
  imports: [DecimalPipe, FormsModule, RouterLink, AnalyticsDashboard, SiteHeader],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
})
export class Workspace {
  protected readonly session = inject(SessionName);

  protected readonly typedName = signal('');
  protected readonly fileName = signal('');
  protected readonly reading = signal(false);
  protected readonly error = signal('');

  protected readonly tables = signal<SheetTable[]>([]);
  protected readonly tableIndex = signal(0);
  protected readonly columns = signal<ColumnMap>({ category: -1, month: -1, budget: -1, spent: -1 });

  protected readonly fields: { key: Field; label: string; hint: string }[] = [
    { key: 'category', label: 'Category', hint: 'What the money was spent on' },
    { key: 'month', label: 'Month', hint: 'A number, a date, or a month name' },
    { key: 'budget', label: 'Budget', hint: 'The planned figure' },
    { key: 'spent', label: 'Spent', hint: 'The actual figure' },
  ];

  protected readonly table = computed(() => this.tables()[this.tableIndex()] ?? null);

  /** Every field has to be pointed at a column before the figures mean anything. */
  protected readonly ready = computed(() => {
    const c = this.columns();
    return this.table() !== null && c.category >= 0 && c.month >= 0 && c.budget >= 0 && c.spent >= 0;
  });

  private readonly mapped = computed(() => {
    const table = this.table();
    return this.ready() && table ? mapRows(table, this.columns()) : null;
  });

  protected readonly rows = computed(() => this.mapped()?.rows ?? []);
  protected readonly skipped = computed(() => this.mapped()?.skipped ?? []);

  protected readonly summary = computed(() => {
    const rows = this.rows();
    const categories = new Set(rows.map((r) => r.category));
    const months = rows.map((r) => r.month);
    return {
      rows: rows.length,
      categories: categories.size,
      from: months.length ? Math.min(...months) : 0,
      to: months.length ? Math.max(...months) : 0,
      budget: rows.reduce((t, r) => t + r.budget, 0),
      spent: rows.reduce((t, r) => t + r.spent, 0),
    };
  });

  protected signIn(): void {
    this.session.set(this.typedName());
  }

  protected signOut(): void {
    this.session.clear();
    this.reset();
  }

  protected reset(): void {
    this.tables.set([]);
    this.tableIndex.set(0);
    this.columns.set({ category: -1, month: -1, budget: -1, spent: -1 });
    this.fileName.set('');
    this.error.set('');
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.reset();
    this.fileName.set(file.name);
    this.reading.set(true);
    try {
      const tables = await readWorkbook(file);
      if (tables.length === 0) {
        this.error.set('No readable sheet was found in that file. It may be empty, or the headings may be missing.');
      } else {
        this.tables.set(tables);
        this.selectTable(0);
      }
    } catch {
      this.error.set('That file could not be read. Excel (.xlsx, .xls) and CSV are supported.');
    } finally {
      this.reading.set(false);
      // Clear the picker so choosing the same file again still fires a change event.
      input.value = '';
    }
  }

  protected selectTable(index: number): void {
    this.tableIndex.set(index);
    const table = this.tables()[index];
    if (table) this.columns.set(guessColumns(table.headers));
  }

  protected setColumn(field: Field, value: string): void {
    this.columns.set({ ...this.columns(), [field]: Number(value) });
  }

  /** The first few rows of the chosen column, to confirm at a glance that it is the right one. */
  protected preview(index: number): string {
    const table = this.table();
    if (!table || index < 0) return '';
    return table.rows.slice(0, 3)
      .map((r) => String(r[index] ?? '').trim())
      .filter(Boolean)
      .join(' · ');
  }
}
