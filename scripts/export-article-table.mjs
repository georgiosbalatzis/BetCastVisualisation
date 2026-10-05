#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  DATA_SOURCES,
  normalizeBettingCSV,
  normalizeTableSelection,
  selectBettingRows,
} from '../src/services/bettingDataCore.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TIMEOUT_MS = 15_000;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const SNAPSHOT_ROW_FIELDS = [
  'id', 'week', 'betNumber', 'betLabel', 'betType', 'company',
  'odds', 'stake', 'result', 'profitLoss', 'cumulativeBudget',
];

const fail = (message) => { throw new Error(message); };

export const assertSafeSnapshotId = (id) => {
  if (!SAFE_ID.test(id || '')) fail('Snapshot ID must use 1–80 ASCII letters, numbers, underscores, or hyphens and start with a letter or number');
  return id;
};

const assertAllowedBetCastUrl = (url) => {
  const isGitHubPages = url.protocol === 'https:'
    && url.hostname === 'georgiosbalatzis.github.io'
    && (url.pathname === '/BetCastVisualisation/' || url.pathname === '/BetCastVisualisation');
  const isSameOrigin = url.protocol === 'https:'
    && url.hostname === 'f1stories.gr'
    && (url.pathname === '/betcast/' || url.pathname === '/betcast');
  if (url.username || url.password || url.port || (!isGitHubPages && !isSameOrigin)) {
    fail(`Unapproved BetCast URL origin/path: ${url.origin}${url.pathname}`);
  }
};

export const parseArticleUrl = (input) => {
  let url;
  try { url = new URL(input); } catch { fail('Provide a valid absolute BetCast URL'); }
  assertAllowedBetCastUrl(url);
  const params = url.searchParams;
  for (const key of ['viz', 'season', 'from', 'to', 'week', 'cmpA', 'cmpB']) {
    if (params.getAll(key).length > 1) fail(`URL contains more than one "${key}" parameter`);
  }
  if (params.get('viz') !== 'dataTable') fail('The source URL must explicitly use viz=dataTable');
  return normalizeTableSelection({
    viz: params.get('viz'),
    season: params.get('season') || 'current',
    from: params.get('from'),
    to: params.get('to'),
    week: params.get('week'),
    cmpA: params.get('cmpA'),
    cmpB: params.get('cmpB'),
  });
};

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const copySnapshotRow = (row) => ({
  id: row.id,
  week: row.week,
  betNumber: row.betNumber,
  betLabel: String(row.betLabel || ''),
  betType: String(row.betType || ''),
  company: String(row.company || ''),
  odds: row.odds,
  stake: row.stake,
  result: String(row.result || ''),
  profitLoss: row.profitLoss,
  cumulativeBudget: row.cumulativeBudget,
});

export const validateSnapshot = (snapshot, expectedId = snapshot?.id) => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) fail('Snapshot must be a JSON object');
  if (snapshot.schemaVersion !== 1) fail('Snapshot schemaVersion must be 1');
  assertSafeSnapshotId(snapshot.id);
  if (snapshot.id !== expectedId) fail(`Snapshot ID mismatch: expected "${expectedId}", received "${snapshot.id}"`);
  if (!Number.isFinite(Date.parse(snapshot.capturedAt)) || !/^\d{4}-\d\d-\d\dT/.test(snapshot.capturedAt)) {
    fail('Snapshot capturedAt must be an ISO-8601 timestamp');
  }
  const { source, selection, rows } = snapshot;
  if (!source || !DATA_SOURCES[source.alias]) fail('Snapshot source.alias must be a known season alias');
  const configuredSource = DATA_SOURCES[source.alias];
  if (source.sheetId !== configuredSource.sheetId || (source.gid ?? null) !== (configuredSource.gid ?? null)) {
    fail('Snapshot resolved sheet/tab does not match the configured source mapping');
  }
  if (source.label !== String(source.label || '').trim()) fail('Snapshot source.label must be a non-empty verified season label');
  if (!source.label) fail('Snapshot source.label must be a non-empty verified season label');
  if (!['verified-sheet', 'provided-csv'].includes(source.kind)) fail('Snapshot source.kind must be verified-sheet or provided-csv');
  if (!/^[a-f0-9]{64}$/.test(source.contentHash || '')) fail('Snapshot source.contentHash must be a SHA-256 hex digest');
  const normalizedSelection = normalizeTableSelection(selection);
  const selectionKeys = ['viz', 'season', 'from', 'to', 'week', 'cmpA', 'cmpB'];
  if (Object.keys(selection).length !== selectionKeys.length
    || selectionKeys.some((key) => selection[key] !== normalizedSelection[key])) {
    fail('Snapshot selection must use normalized values and explicit nullable filters');
  }
  if (selection.season !== source.alias) fail('Snapshot selection.season must match source.alias');
  if (!Array.isArray(rows)) fail('Snapshot rows must be an array');
  let previousId = 0;
  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) fail(`Snapshot row ${index + 1} must be an object`);
    for (const key of SNAPSHOT_ROW_FIELDS) {
      if (!(key in row)) fail(`Snapshot row ${index + 1} is missing ${key}`);
    }
    for (const key of ['id', 'week', 'betNumber']) {
      if (!Number.isSafeInteger(row[key]) || row[key] < 1) fail(`Snapshot row ${index + 1} ${key} must be a positive integer`);
    }
    if (row.id <= previousId) fail(`Snapshot row ${index + 1} id must be unique and in source order`);
    previousId = row.id;
    if ((selection.from != null && row.week < selection.from)
      || (selection.to != null && row.week > selection.to)
      || (selection.week != null && row.week !== selection.week)) {
      fail(`Snapshot row ${index + 1} does not match the declared selection filters`);
    }
    for (const key of ['odds', 'stake', 'profitLoss', 'cumulativeBudget']) {
      if (typeof row[key] !== 'number' || !Number.isFinite(row[key])) fail(`Snapshot row ${index + 1} ${key} must be a finite number`);
    }
    for (const key of ['betLabel', 'betType', 'company', 'result']) {
      if (typeof row[key] !== 'string') fail(`Snapshot row ${index + 1} ${key} must be a string`);
    }
  }
  return snapshot;
};

export const buildArticleSnapshot = ({ id, capturedAt, selection, seasonLabel, sourceKind, csvBytes, resolvedSource }) => {
  assertSafeSnapshotId(id);
  const source = resolvedSource || DATA_SOURCES[selection.season];
  if (!source) fail(`Unknown source alias "${selection.season}"`);
  if (source.id !== selection.season) fail('Resolved source alias does not match selection.season');
  const csvText = Buffer.from(csvBytes).toString('utf8');
  const normalizedRows = normalizeBettingCSV(csvText);
  if (!normalizedRows.length) fail('No real betting rows found in the supplied source CSV');
  const rows = selectBettingRows(normalizedRows, selection).map(copySnapshotRow);
  const snapshot = {
    schemaVersion: 1,
    id,
    capturedAt,
    source: {
      alias: source.id,
      label: seasonLabel,
      sheetId: source.sheetId,
      gid: source.gid || null,
      kind: sourceKind,
      contentHash: sha256(csvBytes),
    },
    selection: normalizeTableSelection(selection),
    rows,
  };
  return validateSnapshot(snapshot, id);
};

const fetchSourceCsv = async (source) => {
  const exportUrl = `https://docs.google.com/spreadsheets/d/${source.sheetId}/export?format=csv${source.gid ? `&gid=${encodeURIComponent(source.gid)}` : ''}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(exportUrl, { signal: controller.signal });
    if (!response.ok) fail(`Google Sheets export failed with HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const body = bytes.toString('utf8').trimStart();
    if (!body || body.startsWith('<')) fail('Google Sheets returned an empty response or HTML instead of CSV');
    return bytes;
  } catch (error) {
    if (error.name === 'AbortError') fail(`Google Sheets export timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const summarizeRows = (before, after) => {
  const oldById = new Map((before || []).map((row) => [row.id, JSON.stringify(row)]));
  const newById = new Map(after.map((row) => [row.id, JSON.stringify(row)]));
  let unchanged = 0;
  let changed = 0;
  for (const [id, value] of newById) {
    if (!oldById.has(id)) continue;
    if (oldById.get(id) === value) unchanged += 1;
    else changed += 1;
  }
  const added = [...newById.keys()].filter((id) => !oldById.has(id)).length;
  const removed = [...oldById.keys()].filter((id) => !newById.has(id)).length;
  return { before: oldById.size, after: newById.size, unchanged, changed, added, removed };
};

const readOptions = (argv) => {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--overwrite') {
      options.overwrite = true;
      continue;
    }
    const names = { '--url': 'url', '--id': 'id', '--season-label': 'seasonLabel', '--csv': 'csv', '--out': 'out' };
    const name = names[token];
    if (!name) fail(`Unknown option: ${token}`);
    if (!argv[index + 1] || argv[index + 1].startsWith('--')) fail(`Missing value for ${token}`);
    options[name] = argv[index + 1];
    index += 1;
  }
  for (const key of ['url', 'id', 'seasonLabel']) if (!options[key]) fail(`Required option missing: --${key === 'seasonLabel' ? 'season-label' : key}`);
  return options;
};

export const runExport = async (options) => {
  const id = assertSafeSnapshotId(options.id);
  const selection = parseArticleUrl(options.url);
  const seasonLabel = String(options.seasonLabel || '').trim();
  if (!seasonLabel) fail('Provide a verified season label with --season-label');
  const source = DATA_SOURCES[selection.season];
  const output = path.resolve(options.out || path.join(SCRIPT_DIR, '..', 'artifacts', 'article-snapshots', `${id}.json`));
  let existing = null;
  try {
    await stat(output);
    if (!options.overwrite) fail(`Snapshot already exists at ${output}; pass --overwrite to replace it`);
    try {
      existing = JSON.parse(await readFile(output, 'utf8'));
      validateSnapshot(existing, id);
    } catch { fail(`Existing snapshot is unreadable or invalid: ${output}`); }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const csvBytes = options.csv
    ? await readFile(path.resolve(options.csv))
    : await fetchSourceCsv(source);
  const snapshot = buildArticleSnapshot({
    id,
    capturedAt: new Date().toISOString(),
    selection,
    seasonLabel,
    sourceKind: options.csv ? 'provided-csv' : 'verified-sheet',
    csvBytes,
    resolvedSource: source,
  });
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  validateSnapshot(JSON.parse(serialized), id);

  await mkdir(path.dirname(output), { recursive: true });
  const tempFile = `${output}.${process.pid}.tmp`;
  try {
    await writeFile(tempFile, serialized, { flag: 'wx' });
    await rename(tempFile, output);
  } catch (error) {
    const { unlink } = await import('node:fs/promises');
    await unlink(tempFile).catch(() => {});
    throw error;
  }

  if (existing) {
    const summary = summarizeRows(existing.rows, snapshot.rows);
    console.log(`Overwrite row summary: ${summary.before} → ${summary.after} rows (${summary.unchanged} unchanged, ${summary.changed} changed, ${summary.added} added, ${summary.removed} removed)`);
  }
  console.log(`Wrote ${snapshot.rows.length} rows to ${output}`);
  console.log(`Source: ${source.id} (${source.sheetId}${source.gid ? `, gid ${source.gid}` : ''}); SHA-256 ${snapshot.source.contentHash}`);
  return snapshot;
};

const printHelp = () => {
  console.log('Usage: node scripts/export-article-table.mjs --url <BetCast URL> --id <snapshot-id> --season-label <verified label> [--csv <file>] [--out <file>] [--overwrite]');
  console.log('Without --csv, the exporter fetches the configured public Google Sheet with a 15-second timeout.');
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  try {
    if (process.argv.includes('--help') || process.argv.includes('-h')) printHelp();
    else await runExport(readOptions(process.argv.slice(2)));
  } catch (error) {
    console.error(`Export failed: ${error.message}`);
    process.exitCode = 1;
  }
}
