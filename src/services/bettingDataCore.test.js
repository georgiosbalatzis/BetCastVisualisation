import { readFileSync } from 'fs';
import { normalizeBettingCSV, normalizeTableSelection, safeNumber, selectBettingRows } from './bettingDataCore.mjs';

const fixture = readFileSync(`${process.cwd()}/scripts/fixtures/article-table.csv`, 'utf8');

test('normalizes fixture rows with the browser service rules before any selection', () => {
  const rows = normalizeBettingCSV(fixture);
  expect(rows).toHaveLength(3);
  expect(rows.map(({ id, week, betNumber, betLabel }) => ({ id, week, betNumber, betLabel }))).toEqual([
    { id: 1, week: 2, betNumber: 1, betLabel: 'Verstappen, pole' },
    { id: 2, week: 2, betNumber: 2, betLabel: 'Στοίχημα #' },
    { id: 3, week: 3, betNumber: 1, betLabel: 'Leclerc "Top 3"' },
  ]);
  expect(rows[0]).toMatchObject({ company: 'interwetten', odds: 2.5, stake: 10, cumulativeBudget: 115 });
  expect(rows[1].cumulativeBudget).toBe(110);
  expect(rows[2]).toMatchObject({ company: 'bet365', stake: 7.5, profitLoss: 9, cumulativeBudget: 119 });
  expect(safeNumber('€1 234,50')).toBe(1234.5);
});

test('selection applies inclusive range and then intersects the highlighted week', () => {
  const rows = normalizeBettingCSV(fixture);
  expect(selectBettingRows(rows, normalizeTableSelection({ from: '2', to: '3', week: '3' }))).toEqual([rows[2]]);
  expect(selectBettingRows(rows, { from: '2' })).toEqual(rows);
  expect(selectBettingRows(rows, { to: '2' })).toEqual(rows.slice(0, 2));
  expect(selectBettingRows(rows, { week: '99' })).toEqual([]);
});

test.each([
  [{ from: '0' }, /positive integer/],
  [{ from: '4', to: '2' }, /less than or equal/],
  [{ season: 'unknown' }, /Unknown season/],
  [{ viz: 'budget' }, /Unsupported visualization/],
])('rejects invalid table selection %#', (selection, error) => {
  expect(() => normalizeTableSelection(selection)).toThrow(error);
});
