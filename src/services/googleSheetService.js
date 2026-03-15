/**
 * Google Sheets Betting Data Service
 *
 * Single source of truth for fetching, parsing, and summarizing betting data.
 * Uses PapaParse for robust CSV handling and supports both Greek and English
 * column headers from the Google Sheet.
 */

// ---------------------------------------------------------------------------
// Column Mapping
// ---------------------------------------------------------------------------

/**
 * Maps known Greek and English column headers to internal property names.
 * Any header not listed here is stored under its original name.
 */
const COLUMN_MAP = {
  // Greek headers (primary — current sheet)
  'Εβδομάδα': 'week',
  'Ημερομηνίες': 'dateRange',
  'Στοίχημα #': 'betNumber',
  'Ποντάρισμα': 'stake',
  'Απόδοση': 'odds',
  'Αποτέλεσμα': 'result',
  'Κέρδος/Ζημιά': 'profitLoss',
  '✓ / ✗': 'symbol',
  'Σωρευτικό Budget': 'cumulativeBudget',

  // English headers (legacy / alternate sheet)
  'Week': 'week',
  'Date Range': 'dateRange',
  'Stake': 'stake',
  'odd': 'odds',
  'Win / Lose': 'result',
  'Profit / Loss': 'profitLoss',
  'Symbol (Win / Loss)': 'symbol',
  'Cumulative Budget': 'cumulativeBudget',
};

// ---------------------------------------------------------------------------
// Numeric helpers
// ---------------------------------------------------------------------------

/**
 * Coerce a value that might contain €, commas-as-decimals, or whitespace
 * into a plain number. Returns NaN for genuinely non-numeric strings.
 *
 * @param {*} raw - The raw cell value
 * @returns {number}
 */
const toNumber = (raw) => {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return NaN;
  const cleaned = raw.replace(/[€\s]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return num;
};

/**
 * Safely read a numeric field from a bet row, handling both string and number
 * types that can appear depending on the data source.
 *
 * @param {*} value - The raw field value
 * @returns {number}
 */
const safeNumber = (value) => {
  const n = toNumber(value);
  return isNaN(n) ? 0 : n;
};

// ---------------------------------------------------------------------------
// CSV Parsing (using PapaParse)
// ---------------------------------------------------------------------------

/**
 * Dynamically imports PapaParse. We lazy-load so the module is only pulled in
 * when we actually need to parse CSV. If PapaParse isn't available, falls back
 * to a simple built-in parser.
 */
const parseCSVText = async (csvText) => {
  try {
    const Papa = await import('papaparse');
    const result = Papa.default.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // we handle type coercion ourselves
      transformHeader: (header) => header.trim(),
    });

    if (result.errors.length > 0) {
      console.warn('PapaParse warnings:', result.errors);
    }

    return result.data; // Array of { [header]: string }
  } catch {
    console.warn('PapaParse not available, using fallback CSV parser');
    return fallbackParseCSV(csvText);
  }
};

/**
 * Minimal fallback CSV parser for environments where PapaParse isn't installed.
 * Handles RFC 4180 double-quote escaping correctly.
 *
 * @param {string} csvText
 * @returns {Array<Object>}
 */
const fallbackParseCSV = (csvText) => {
  const rows = [];
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return rows;

  const headers = splitCSVLine(lines[0]);

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    if (values.length !== headers.length) {
      console.warn(`Line ${i + 1}: expected ${headers.length} values, got ${values.length} — skipping`);
      continue;
    }
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });
    rows.push(row);
  }

  return rows;
};

/**
 * Splits a single CSV line into values, respecting double-quoted fields
 * (including escaped quotes via "").
 *
 * @param {string} line
 * @returns {string[]}
 */
const splitCSVLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Look ahead: escaped quote "" or end of quoted field
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip the second quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  values.push(current.trim());
  return values;
};

// ---------------------------------------------------------------------------
// Row normalisation
// ---------------------------------------------------------------------------

/**
 * Takes a raw row object (keyed by original header names) and returns a
 * normalised bet object with consistent property names and numeric types.
 *
 * @param {Object} rawRow - A single row from the parsed CSV
 * @param {number} id - Sequential ID to assign
 * @returns {Object} Normalised bet object
 */
const normaliseRow = (rawRow, id) => {
  const row = { id };

  // Map known headers → internal names, keep unknowns as-is
  for (const [header, value] of Object.entries(rawRow)) {
    const key = COLUMN_MAP[header] || header;
    row[key] = value;
  }

  // Coerce numeric fields
  row.week = safeNumber(row.week);
  row.stake = safeNumber(row.stake);
  row.odds = safeNumber(row.odds);
  row.profitLoss = safeNumber(row.profitLoss);
  row.cumulativeBudget = safeNumber(row.cumulativeBudget);

  // Normalise betNumber if present
  if (row.betNumber != null) {
    row.betNumber = safeNumber(row.betNumber);
  }

  return row;
};

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/' +
  '2PACX-1vTbj_mc5tRE9rQsBFNlEDO78wJRcmfHYNWHM75WRdTJ37GXjNSYsgIs-AiNuj3wjG8eGRHNbEwlEuEx' +
  '/pub?output=csv';

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

/**
 * Attempts to fetch the CSV through multiple CORS proxies, returning the
 * first successful response.
 *
 * @returns {Promise<string>} Raw CSV text
 * @throws {Error} If all proxies fail
 */
const fetchCSVWithRetry = async () => {
  const errors = [];

  for (const proxy of CORS_PROXIES) {
    try {
      const url = `${proxy}${encodeURIComponent(SHEET_CSV_URL)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (err) {
      errors.push(`${proxy}: ${err.message}`);
      console.warn(`CORS proxy failed (${proxy}):`, err.message);
    }
  }

  throw new Error(`All CORS proxies failed:\n${errors.join('\n')}`);
};

/**
 * Fetches betting data from Google Sheets. Falls back to sample data on
 * failure. This is the main entry point for data loading.
 *
 * @returns {Promise<Array>} Array of normalised bet objects
 */
export const fetchBettingData = async () => {
  try {
    const csvText = await fetchCSVWithRetry();
    const rawRows = await parseCSVText(csvText);

    if (rawRows.length === 0) {
      throw new Error('Parsed CSV contained no data rows');
    }

    // Normalise and assign sequential IDs
    const data = rawRows.map((raw, index) => normaliseRow(raw, index + 1));

    // Assign betNumber per week if not already present
    assignBetNumbers(data);

    if (process.env.NODE_ENV === 'development') {
      console.log(`Loaded ${data.length} bets from Google Sheets`);
      console.log('Sample row:', data[0]);
    }

    return data;
  } catch (error) {
    console.error('Failed to load betting data:', error);
    console.warn('Falling back to sample data');
    return generateSampleData();
  }
};

/**
 * Assigns sequential betNumber within each week for rows that don't already
 * have one.
 *
 * @param {Array} data - Array of bet objects (mutated in place)
 */
const assignBetNumbers = (data) => {
  let currentWeek = null;
  let count = 0;

  for (const bet of data) {
    if (bet.week !== currentWeek) {
      currentWeek = bet.week;
      count = 0;
    }
    count++;
    if (!bet.betNumber) {
      bet.betNumber = count;
    }
  }
};

// ---------------------------------------------------------------------------
// Sample / Fallback Data
// ---------------------------------------------------------------------------

/**
 * Generates realistic sample betting data for development or when the
 * Google Sheet is unreachable.
 *
 * @returns {Array} Array of bet objects matching the normalised schema
 */
export const generateSampleData = () => {
  const WEEKS = 8;
  const BETS_PER_WEEK = 5;
  const INITIAL_BUDGET = 100;
  const STAKE = 10;

  const data = [];
  let cumulativeBudget = INITIAL_BUDGET;

  for (let week = 1; week <= WEEKS; week++) {
    const startDay = (week - 1) * 7 + 1;
    const endDay = week * 7;
    const dateRange = `${startDay}-${endDay}/5/2025`;

    for (let bet = 1; bet <= BETS_PER_WEEK; bet++) {
      const odds = parseFloat((1.5 + Math.random() * 2).toFixed(2));
      const isWin = Math.random() > 0.45;
      const result = isWin ? 'Win' : 'Lose';
      const profitLoss = isWin ? STAKE * (odds - 1) : -STAKE;
      cumulativeBudget += profitLoss;

      data.push({
        id: data.length + 1,
        week,
        dateRange,
        betNumber: bet,
        stake: STAKE,
        odds,
        result,
        profitLoss: parseFloat(profitLoss.toFixed(2)),
        symbol: isWin ? '✓' : '✗',
        cumulativeBudget: parseFloat(cumulativeBudget.toFixed(2)),
      });
    }
  }

  return data;
};

// ---------------------------------------------------------------------------
// Statistics / Summaries
// ---------------------------------------------------------------------------

/**
 * Calculate ROI for a given stake and profit/loss.
 *
 * @param {number} stake - Total stake
 * @param {number} profitLoss - Net profit or loss
 * @returns {number} ROI as a percentage
 */
export const calculateROI = (stake, profitLoss) => {
  if (stake === 0) return 0;
  return (profitLoss / stake) * 100;
};

/**
 * Aggregates bet-level data into weekly summaries including win rate,
 * profit/loss, ROI, and cumulative ROI.
 *
 * @param {Array} data - Array of normalised bet objects
 * @returns {Array} Weekly summary objects
 */
export const calculateWeeklySummary = (data) => {
  if (!data || data.length === 0) return [];

  const weekNumbers = [...new Set(data.map((item) => item.week))].sort(
    (a, b) => a - b
  );

  let runningStake = 0;
  let runningProfit = 0;

  return weekNumbers.map((weekNum) => {
    const weekBets = data.filter((bet) => bet.week === weekNum);
    const wins = weekBets.filter((bet) => bet.result === 'Win').length;
    const losses = weekBets.filter((bet) => bet.result === 'Lose').length;
    const total = wins + losses;

    const weeklyStake = weekBets.reduce(
      (sum, bet) => sum + safeNumber(bet.stake),
      0
    );
    const weeklyProfit = weekBets.reduce(
      (sum, bet) => sum + safeNumber(bet.profitLoss),
      0
    );

    const weeklyROI = calculateROI(weeklyStake, weeklyProfit);

    // Cumulative tracking
    runningStake += weeklyStake;
    runningProfit += weeklyProfit;
    const cumulativeROI = calculateROI(runningStake, runningProfit);

    // Get the cumulative budget from the last bet in the week
    const lastBet = weekBets[weekBets.length - 1];
    const cumulativeBudget = safeNumber(lastBet?.cumulativeBudget);

    return {
      week: weekNum,
      dateRange: weekBets[0]?.dateRange || '',
      wins,
      losses,
      winRate: total > 0 ? wins / total : 0,
      totalProfitLoss: parseFloat(weeklyProfit.toFixed(2)),
      totalStake: weeklyStake,
      cumulativeBudget,
      weeklyROI: parseFloat(weeklyROI.toFixed(2)),
      cumulativeROI: parseFloat(cumulativeROI.toFixed(2)),
    };
  });
};
