import { DemoSpendRow } from '../../shared/analytics-demo-data';

/** One tab of a workbook, as read from the file. */
export interface SheetTable {
  name: string;
  headers: string[];
  /** Cell values, one array per row, aligned to `headers`. */
  rows: unknown[][];
}

/** Which column of the sheet supplies each field the chart needs. -1 means "not chosen". */
export interface ColumnMap {
  category: number;
  month: number;
  budget: number;
  spent: number;
}

export interface MappedResult {
  rows: DemoSpendRow[];
  /** Rows that could not be used, with the reason, so the person can see what was skipped and why. */
  skipped: { row: number; reason: string }[];
}

const MONTH_NAMES = [
  ['jan', 'january', 'ene', 'enero'],
  ['feb', 'february', 'febrero'],
  ['mar', 'march', 'marzo'],
  ['apr', 'april', 'abr', 'abril'],
  ['may', 'mayo'],
  ['jun', 'june', 'junio'],
  ['jul', 'july', 'julio'],
  ['aug', 'august', 'ago', 'agosto'],
  ['sep', 'sept', 'september', 'septiembre'],
  ['oct', 'october', 'octubre'],
  ['nov', 'november', 'noviembre'],
  ['dec', 'december', 'dic', 'diciembre'],
];

/**
 * Words that suggest a column holds a given field, in English and Spanish, since the workbooks this is
 * built for come in both. Used only to preselect the dropdowns - the person can always override.
 */
const HINTS: Record<keyof ColumnMap, string[]> = {
  category: ['category', 'categoria', 'categoría', 'concepto', 'concept', 'account', 'cuenta', 'item', 'rubro', 'description', 'descripcion'],
  month: ['month', 'mes', 'period', 'periodo', 'período', 'date', 'fecha'],
  budget: ['budget', 'presupuesto', 'planned', 'plan', 'forecast', 'presupuestado', 'total budget'],
  spent: ['spent', 'gasto', 'gastado', 'actual', 'ejecutado', 'executed', 'real', 'total spent'],
};

/** Reads a workbook into plain tables. SheetJS is imported lazily so it costs nothing until used. */
export async function readWorkbook(file: File): Promise<SheetTable[]> {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const book = XLSX.read(data, { cellDates: true });

  return book.SheetNames.map((name) => {
    const grid = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name], { header: 1, blankrows: false, defval: null });
    // The first row that has two or more filled cells is treated as the headings; anything above it is
    // usually a title or a company name rather than data.
    const headerIndex = grid.findIndex((r) => r.filter((c) => c !== null && String(c).trim() !== '').length >= 2);
    if (headerIndex === -1) return { name, headers: [], rows: [] };

    const headers = (grid[headerIndex] ?? []).map((h, i) => String(h ?? '').trim() || `Column ${i + 1}`);
    return { name, headers, rows: grid.slice(headerIndex + 1).filter((r) => r.some((c) => c !== null && String(c).trim() !== '')) };
  }).filter((t) => t.headers.length > 0);
}

/** Best guess at which column is which, so the dropdowns start on something sensible. */
export function guessColumns(headers: string[]): ColumnMap {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const pick = (field: keyof ColumnMap): number => {
    const hints = HINTS[field];
    // An exact heading beats one that merely contains the word, so "Budget" wins over "Budget notes".
    const exact = lower.findIndex((h) => hints.includes(h));
    return exact !== -1 ? exact : lower.findIndex((h) => hints.some((hint) => h.includes(hint)));
  };
  return { category: pick('category'), month: pick('month'), budget: pick('budget'), spent: pick('spent') };
}

/** A number from a cell, tolerating currency symbols, thousands separators and parenthesised negatives. */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let text = String(value).trim();
  const parenthesised = /^\(.*\)$/.test(text); // accounting style for a negative
  if (parenthesised) text = text.slice(1, -1);
  // Strip anything that is not part of a number, then treat a comma as a thousands separator.
  text = text.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  if (text === '' || text === '-') return null;

  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  return parenthesised ? -n : n;
}

/** A month number 1-12 from a number, a date, or a name in English or Spanish. */
export function toMonth(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.getMonth() + 1;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 1 && value <= 12 ? Math.round(value) : null;
  }

  const text = String(value).trim().toLowerCase();
  const asNumber = Number(text);
  if (Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= 12) return Math.round(asNumber);

  // "2019-03", "03/2019" and similar: take the part that reads as a month.
  const parts = text.split(/[^a-z0-9]+/).filter(Boolean);
  for (const part of parts) {
    const n = Number(part);
    if (Number.isFinite(n) && n >= 1 && n <= 12) return n;
  }
  const index = MONTH_NAMES.findIndex((names) => names.some((n) => parts.some((p) => p === n || p.startsWith(n))));
  return index === -1 ? null : index + 1;
}

/**
 * Turns a sheet plus a column choice into rows the chart can use.
 *
 * Unusable rows are collected rather than silently dropped: a sheet with a stray total line or a blank
 * month is normal, and the person should be able to see exactly what was left out instead of wondering
 * why the totals do not match their spreadsheet.
 */
export function mapRows(table: SheetTable, map: ColumnMap): MappedResult {
  const rows: DemoSpendRow[] = [];
  const skipped: { row: number; reason: string }[] = [];

  table.rows.forEach((cells, i) => {
    const line = i + 1;
    const category = map.category >= 0 ? String(cells[map.category] ?? '').trim() : '';
    const month = toMonth(cells[map.month]);
    const budget = toNumber(cells[map.budget]);
    const spent = toNumber(cells[map.spent]);

    if (!category) return void skipped.push({ row: line, reason: 'no category' });
    if (month === null) return void skipped.push({ row: line, reason: 'month not recognised' });
    if (budget === null && spent === null) return void skipped.push({ row: line, reason: 'no budget or spent figure' });

    rows.push({ month, category, budget: budget ?? 0, spent: spent ?? 0 });
  });

  return { rows, skipped };
}
