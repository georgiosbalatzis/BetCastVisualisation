// Pure data handling shared by the browser service and the article snapshot CLI.
const COLUMN_MAP = {
  'Εβδομάδα': 'week',
  'Ημερομηνίες': 'dateRange',
  'Στοίχημα #': 'betNumber',
  'Τύπος Στοιχήματος': 'betType',
  'Τυπος Στοιχηματος': 'betType',
  'Εταιρία': 'company',
  'Εταιρια': 'company',
  'Ποντάρισμα': 'stake',
  'Απόδοση': 'odds',
  'Αποτέλεσμα': 'result',
  'Κέρδος/Ζημιά': 'profitLoss',
  '✓ / ✗': 'symbol',
  'Σωρευτικό Budget': 'cumulativeBudget',
  'ROI %': 'rowROI',
  'Συνολικο ROI %': 'cumulativeROIRaw',
  Week: 'week',
  'Date Range': 'dateRange',
  Stake: 'stake',
  odd: 'odds',
  'Bet Type': 'betType',
  Company: 'company',
  'Win / Lose': 'result',
  'Profit / Loss': 'profitLoss',
  'Symbol (Win / Loss)': 'symbol',
  'Cumulative Budget': 'cumulativeBudget',
};

const COMPANY_ALIASES = {
  stoiximan: 'stoiximan',
  interwetten: 'interwetten',
  intervetten: 'interwetten',
  bwin: 'bwin',
  bet365: 'bet365',
  novibet: 'novibet',
};

export const DATA_SOURCES = {
  current: {
    id: 'current',
    label: 'Φέτος',
    sheetId: '16cz7p-hZIs3PrvhL9JJ1q1tqyVEupXQ2k8kN8F9mexc',
    gid: '796888004',
    allowSampleFallback: true,
  },
  lastYear: {
    id: 'lastYear',
    label: 'Πέρσι',
    sheetId: '1nMytseR9C-GJNri0n5DAW25jijullNMVUcTj1mLEEYs',
    allowSampleFallback: false,
  },
};

const toNumber = (raw) => {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return NaN;
  return parseFloat(raw.replace(/[€\s\u00A0]/g, '').replace(',', '.'));
};

export const safeNumber = (value) => {
  const number = toNumber(value);
  return Number.isNaN(number) ? 0 : number;
};

const normaliseCompany = (raw) => {
  if (raw == null) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  const compact = trimmed.toLowerCase().replace(/\s+/g, '');
  return COMPANY_ALIASES[compact] || trimmed;
};

const splitCSVLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (inQuotes) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ',') {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
};

export const parseBettingCSV = (csvText) => {
  if (typeof csvText !== 'string') throw new TypeError('CSV input must be text');
  const lines = csvText.trim().split('\n');
  if (!lines.length || (lines.length === 1 && !lines[0])) return [];
  const headers = splitCSVLine(lines[0].replace(/^\uFEFF/, ''));
  const rows = [];
  for (let index = 1; index < lines.length; index += 1) {
    const values = splitCSVLine(lines[index]);
    if (values.length !== headers.length) continue;
    const row = {};
    headers.forEach((header, column) => { row[header] = values[column]; });
    rows.push(row);
  }
  return rows;
};

const normaliseRow = (raw, id) => {
  const row = { id };
  for (const [header, value] of Object.entries(raw)) {
    row[COLUMN_MAP[header] || header] = value;
  }
  row.week = safeNumber(row.week);
  row.stake = safeNumber(row.stake);
  row.odds = safeNumber(row.odds);
  row.profitLoss = safeNumber(row.profitLoss);
  row.cumulativeBudget = safeNumber(row.cumulativeBudget);
  row.betType = row.betType || '';
  row.company = normaliseCompany(row.company);
  if (row.betNumber != null && typeof row.betNumber === 'string') {
    row.betLabel = row.betNumber;
    row.betNumber = null;
  }
  return row;
};

const isRealBet = (row) => row.week > 0 && row.stake > 0 && row.odds > 0;

const assignBetNumbers = (rows) => {
  let currentWeek = null;
  let count = 0;
  for (const bet of rows) {
    if (bet.week !== currentWeek) {
      currentWeek = bet.week;
      count = 0;
    }
    count += 1;
    if (!bet.betNumber) bet.betNumber = count;
  }
};

/** Parse, normalize, remove placeholders, then assign source-order IDs and weekly numbers. */
export const normalizeBettingCSV = (csvText) => {
  const allRows = parseBettingCSV(csvText).map((row, index) => normaliseRow(row, index + 1));
  const rows = allRows.filter(isRealBet);
  rows.forEach((bet, index) => { bet.id = index + 1; });
  assignBetNumbers(rows);
  return rows;
};

const optionalPositiveInteger = (value, key) => {
  if (value == null || value === '') return null;
  if (!/^\d+$/.test(String(value))) throw new Error(`${key} must be a positive integer`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${key} must be a positive integer`);
  return number;
};

export const normalizeTableSelection = (selection = {}) => {
  const normalized = {
    viz: selection.viz || 'dataTable',
    season: selection.season || 'current',
    from: optionalPositiveInteger(selection.from, 'from'),
    to: optionalPositiveInteger(selection.to, 'to'),
    week: optionalPositiveInteger(selection.week, 'week'),
    cmpA: optionalPositiveInteger(selection.cmpA, 'cmpA'),
    cmpB: optionalPositiveInteger(selection.cmpB, 'cmpB'),
  };
  if (normalized.viz !== 'dataTable') throw new Error(`Unsupported visualization "${normalized.viz}"; only viz=dataTable can be exported`);
  if (!DATA_SOURCES[normalized.season]) throw new Error(`Unknown season alias "${normalized.season}"`);
  if (normalized.from != null && normalized.to != null && normalized.from > normalized.to) {
    throw new Error('from must be less than or equal to to');
  }
  return normalized;
};

/** Apply inclusive from/to filters, then intersect with week; rows retain full-source fields. */
export const selectBettingRows = (rows, selection) => {
  const normalized = normalizeTableSelection(selection);
  let selected = rows;
  if (normalized.from != null) selected = selected.filter((bet) => bet.week >= normalized.from);
  if (normalized.to != null) selected = selected.filter((bet) => bet.week <= normalized.to);
  if (normalized.week != null) selected = selected.filter((bet) => bet.week === normalized.week);
  return selected;
};
