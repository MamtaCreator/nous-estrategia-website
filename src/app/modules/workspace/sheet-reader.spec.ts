import { describe, expect, it } from 'vitest';
import { ColumnMap, SheetTable, guessColumns, mapRows, toMonth, toNumber } from './sheet-reader';

describe('reading figures out of a spreadsheet cell', () => {
  it('takes a plain number as it is', () => {
    expect(toNumber(44875)).toBe(44875);
    expect(toNumber(0)).toBe(0);
    expect(toNumber(12.5)).toBe(12.5);
  });

  it('strips the decoration people put in budget sheets', () => {
    expect(toNumber('$44,875')).toBe(44875);
    expect(toNumber('44 875')).toBe(44875);
    expect(toNumber('COP 1,250,000')).toBe(1250000);
    expect(toNumber(' 3125 ')).toBe(3125);
  });

  it('reads an accounting negative, which is written in brackets rather than with a minus', () => {
    expect(toNumber('(250)')).toBe(-250);
    expect(toNumber('($1,200)')).toBe(-1200);
    expect(toNumber('-250')).toBe(-250);
  });

  it('returns nothing for a cell that holds no figure, rather than guessing zero', () => {
    // Zero and "no value" mean different things in a budget: one is a real figure, the other is a gap.
    expect(toNumber('')).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber('n/a')).toBeNull();
    expect(toNumber('-')).toBeNull();
  });
});

describe('reading a month out of a spreadsheet cell', () => {
  it('accepts a number in range and rejects one outside it', () => {
    expect(toMonth(1)).toBe(1);
    expect(toMonth(12)).toBe(12);
    expect(toMonth(0)).toBeNull();
    expect(toMonth(13)).toBeNull();
  });

  it('accepts month names in English and Spanish, long or short', () => {
    expect(toMonth('January')).toBe(1);
    expect(toMonth('Ene')).toBe(1);
    expect(toMonth('Enero')).toBe(1);
    expect(toMonth('feb')).toBe(2);
    expect(toMonth('Diciembre')).toBe(12);
  });

  it('accepts a date cell and a period written as text', () => {
    expect(toMonth(new Date(2019, 2, 15))).toBe(3);   // March, months being zero-based here
    expect(toMonth('2019-03')).toBe(3);
    expect(toMonth('03/2019')).toBe(3);
  });

  it('returns nothing for something that is not a month', () => {
    expect(toMonth('xyz')).toBeNull();
    expect(toMonth('')).toBeNull();
    expect(toMonth(null)).toBeNull();
  });
});

describe('guessing which column is which', () => {
  it('matches English headings', () => {
    expect(guessColumns(['Category', 'Month', 'Budget', 'Spent'])).toEqual({ category: 0, month: 1, budget: 2, spent: 3 });
  });

  it('matches Spanish headings, which is how these sheets usually arrive', () => {
    expect(guessColumns(['Concepto', 'Mes', 'Presupuesto', 'Ejecutado'])).toEqual({ category: 0, month: 1, budget: 2, spent: 3 });
  });

  it('prefers an exact heading over one that merely contains the word', () => {
    // "Budget notes" must not win over the column actually called "Budget".
    const map = guessColumns(['Budget notes', 'Concepto', 'Mes', 'Budget', 'Ejecutado']);
    expect(map.budget).toBe(3);
  });

  it('reports -1 for a field it cannot find, rather than picking something arbitrary', () => {
    const map = guessColumns(['Thing', 'Other']);
    expect(map.category).toBe(-1);
    expect(map.spent).toBe(-1);
  });
});

describe('turning a mapped sheet into chart rows', () => {
  const map: ColumnMap = { category: 0, month: 1, budget: 2, spent: 3 };
  const table = (rows: unknown[][]): SheetTable => ({ name: 'Gastos', headers: ['Concepto', 'Mes', 'Presupuesto', 'Ejecutado'], rows });

  it('reads the rows it can and reports the ones it cannot', () => {
    const result = mapRows(table([
      ['Sueldo base', 'Enero', '$44,875', '$33,016'],
      ['Sueldo base', 2, '44875', '35,982'],
      ['TOTAL', null, 51875, 71164],        // a total line: no month
      ['Sin mes', 'xyz', 100, 50],          // a month nobody can read
      ['', 1, 10, 5],                       // no category
    ]), map);

    expect(result.rows).toEqual([
      { month: 1, category: 'Sueldo base', budget: 44875, spent: 33016 },
      { month: 2, category: 'Sueldo base', budget: 44875, spent: 35982 },
    ]);
    expect(result.skipped).toEqual([
      { row: 3, reason: 'month not recognised' },
      { row: 4, reason: 'month not recognised' },
      { row: 5, reason: 'no category' },
    ]);
  });

  it('keeps a row that has only one of the two figures, treating the other as zero', () => {
    // A sheet that lists spend without a budget is still worth charting.
    const result = mapRows(table([['Transporte', 1, '', 210]]), map);
    expect(result.rows).toEqual([{ month: 1, category: 'Transporte', budget: 0, spent: 210 }]);
    expect(result.skipped).toEqual([]);
  });

  it('skips a row with neither figure instead of charting an empty bar', () => {
    const result = mapRows(table([['Transporte', 1, '', '']]), map);
    expect(result.rows).toEqual([]);
    expect(result.skipped).toEqual([{ row: 1, reason: 'no budget or spent figure' }]);
  });
});
