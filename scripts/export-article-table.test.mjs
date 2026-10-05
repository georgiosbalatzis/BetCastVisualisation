import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  buildArticleSnapshot,
  parseArticleUrl,
  validateSnapshot,
} from './export-article-table.mjs';

const fixturePath = new URL('./fixtures/article-table.csv', import.meta.url);
const fixture = await readFile(fixturePath);
const url = 'https://georgiosbalatzis.github.io/BetCastVisualisation/?viz=dataTable&season=current&from=2&to=3&week=3&cmpA=2&cmpB=3&embed=1&theme=dark';

test('parses only approved table URLs and preserves open-ended scope', () => {
  assert.deepEqual(parseArticleUrl(url), {
    viz: 'dataTable', season: 'current', from: 2, to: 3, week: 3, cmpA: 2, cmpB: 3,
  });
  assert.equal(parseArticleUrl('https://georgiosbalatzis.github.io/BetCastVisualisation/?viz=dataTable&from=11&embed=1').to, null);
  assert.throws(() => parseArticleUrl('https://evil.example/?viz=dataTable'), /Unapproved/);
  assert.throws(() => parseArticleUrl('https://f1stories.gr/standings/?viz=dataTable'), /Unapproved/);
  assert.throws(() => parseArticleUrl('https://f1stories.gr/betcast/?viz=budget'), /explicitly use viz=dataTable/);
  assert.throws(() => parseArticleUrl(`${url}&week=4`), /more than one/);
});

test('exports a valid source-pinned selection with full-source identifiers and description', () => {
  const snapshot = buildArticleSnapshot({
    id: 'fixture-week3',
    capturedAt: '2026-10-05T12:00:00.000Z',
    selection: parseArticleUrl(url),
    seasonLabel: 'Verified 2026 season',
    sourceKind: 'provided-csv',
    csvBytes: fixture,
  });
  assert.equal(snapshot.source.contentHash.length, 64);
  assert.equal(snapshot.source.sheetId, '16cz7p-hZIs3PrvhL9JJ1q1tqyVEupXQ2k8kN8F9mexc');
  assert.equal(snapshot.rows.length, 1);
  assert.deepEqual(snapshot.rows[0], {
    id: 3, week: 3, betNumber: 1, betLabel: 'Leclerc "Top 3"', betType: 'Podium',
    company: 'bet365', odds: 2.2, stake: 7.5, result: 'Win', profitLoss: 9, cumulativeBudget: 119,
  });
  assert.equal(validateSnapshot(snapshot), snapshot);
  const textSnapshot = { ...snapshot, rows: [{ ...snapshot.rows[0], betLabel: '<script>' }] };
  assert.equal(validateSnapshot(textSnapshot).rows[0].betLabel, '<script>');
  assert.throws(() => validateSnapshot({ ...snapshot, source: { ...snapshot.source, gid: 'wrong-tab' } }), /sheet\/tab/);
  assert.throws(() => validateSnapshot({ ...snapshot, selection: { ...snapshot.selection, season: 'lastYear' } }), /selection.season/);
  assert.throws(() => validateSnapshot({ ...snapshot, rows: [{ ...snapshot.rows[0], week: 2 }] }), /does not match/);
});

test('supports the stable lastYear source mapping as well as current', () => {
  const selection = parseArticleUrl('https://f1stories.gr/betcast/?viz=dataTable&season=lastYear&from=2');
  const snapshot = buildArticleSnapshot({
    id: 'last-year-fixture', capturedAt: '2026-10-05T12:00:00.000Z', selection,
    seasonLabel: 'Verified prior season', sourceKind: 'provided-csv', csvBytes: fixture,
  });
  assert.equal(snapshot.source.alias, 'lastYear');
  assert.equal(snapshot.source.sheetId, '1nMytseR9C-GJNri0n5DAW25jijullNMVUcTj1mLEEYs');
  assert.equal(snapshot.source.gid, null);
  assert.equal(snapshot.selection.from, 2);
  assert.equal(snapshot.selection.to, null);
});

test('CLI creates fixture snapshots offline and requires explicit overwrite', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'betcast-export-'));
  const output = path.join(directory, 'fixture-week3.json');
  const cli = new URL('./export-article-table.mjs', import.meta.url);
  const args = [
    cli.pathname, '--url', url, '--id', 'fixture-week3', '--season-label', 'Verified 2026 season',
    '--csv', fixturePath.pathname, '--out', output,
  ];
  try {
    const first = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(first.status, 0, first.stderr);
    const firstText = await readFile(output, 'utf8');
    const firstSnapshot = JSON.parse(firstText);
    assert.equal(firstSnapshot.rows.length, 1);

    const blocked = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /pass --overwrite/);
    assert.equal(await readFile(output, 'utf8'), firstText);

    const replaced = spawnSync(process.execPath, [...args, '--overwrite'], { encoding: 'utf8' });
    assert.equal(replaced.status, 0, replaced.stderr);
    assert.match(replaced.stdout, /Overwrite row summary: 1 → 1 rows/);
    assert.doesNotMatch(replaced.stdout, /Using sample data/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('source with no real bets fails instead of using generated sample data', () => {
  const empty = Buffer.from('Εβδομάδα,Στοίχημα #,Ποντάρισμα,Απόδοση,Αποτέλεσμα,Κέρδος/Ζημιά,Σωρευτικό Budget\n1,placeholder,0,0,Win,0,100\n');
  assert.throws(() => buildArticleSnapshot({
    id: 'empty', capturedAt: '2026-10-05T12:00:00.000Z', selection: parseArticleUrl(url),
    seasonLabel: 'Verified 2026 season', sourceKind: 'provided-csv', csvBytes: empty,
  }), /No real betting rows/);
});

test('a valid empty selection stays empty without altering normalized source rows', () => {
  const snapshot = buildArticleSnapshot({
    id: 'empty-selection', capturedAt: '2026-10-05T12:00:00.000Z',
    selection: parseArticleUrl('https://georgiosbalatzis.github.io/BetCastVisualisation/?viz=dataTable&week=99'),
    seasonLabel: 'Verified season label', sourceKind: 'provided-csv', csvBytes: fixture,
  });
  assert.deepEqual(snapshot.rows, []);
});
