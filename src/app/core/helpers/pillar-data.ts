import { ValidatorFn } from '@angular/forms';

export function parseEntries(raw: string): Record<string, string> {
  const entries: Record<string, string> = Object.create(null);
  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const split = line.indexOf('=');
    const key = line.slice(0, split).trim();
    const value = line.slice(split + 1).trim();
    if (split < 1 || !key || !value) throw new Error(`Line ${index + 1}: enter name=value.`);
    if (Object.hasOwn(entries, key)) throw new Error(`Line ${index + 1}: duplicate name "${key}".`);
    entries[key] = value;
  }
  return entries;
}

export function parseNumbers(raw: string, integers = false): Record<string, number> {
  return Object.fromEntries(Object.entries(parseEntries(raw)).map(([key, text]) => {
    const value = Number(text);
    if (!/^\d+(?:\.\d+)?$/.test(text) || !Number.isFinite(value) || value < 0 || value > 1e12 || (integers && !Number.isSafeInteger(value))) {
      throw new Error(`${key}: enter a non-negative ${integers ? 'whole number' : 'number'} no greater than 1,000,000,000,000.`);
    }
    return [key, value];
  }));
}

export function entriesValidator(numeric = true, integers = false): ValidatorFn {
  return control => {
    try { numeric ? parseNumbers(control.value ?? '', integers) : parseEntries(control.value ?? ''); return null; }
    catch (error) { return { entries: (error as Error).message }; }
  };
}

export const dateOrder: ValidatorFn = group => {
  const start = group.get('startDate')?.value;
  const end = group.get('endDate')?.value;
  return start && end && end < start ? { dateOrder: true } : null;
};

export function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export const financeDraftValidator: ValidatorFn = group => {
  const value = group.value;
  try {
    for (const [field, total] of [['revenueByProduct', 'totalRevenue'], ['expensesByCategory', 'totalExpenses']]) {
      const entries = Object.values(parseNumbers(value[field] ?? ''));
      if (entries.length && Math.abs(entries.reduce((a,b) => a+b,0) - value[total]) > 0.010001) {
        return { financial: `${field === 'revenueByProduct' ? 'Revenue' : 'Expense'} breakdown must add up to its total.` };
      }
    }
  } catch { return null; }
  if (value.fixedExpenses + value.variableExpenses > value.totalExpenses + 0.010001) {
    return { financial: 'Fixed and variable expenses cannot exceed total expenses.' };
  }
  const assets = value.currentAssets + value.fixedAssets;
  const claims = value.currentLiabilities + value.longTermLiabilities + value.equity;
  if (Math.abs(assets - claims) > 1.000001) return { financial: 'Assets must equal liabilities plus equity (within 1).' };
  return null;
};

export type CsvValue = string | number | boolean | null | undefined;
export function csvText(rows: CsvValue[][]): string {
  return rows.map(row => row.map(value => {
    let text = value == null ? '' : String(value);
    // Treat untrusted spreadsheet formulas as text, including whitespace-prefixed formulas.
    if (typeof value === 'string' && /^\s*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
}

export function downloadCsv(name: string, rows: CsvValue[][]): void {
  const url = URL.createObjectURL(new Blob(['\uFEFF', csvText(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/[^a-z0-9-]/gi, '-')}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
