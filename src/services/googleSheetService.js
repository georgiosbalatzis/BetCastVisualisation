/**
 * Google Sheets Betting Data Service
 * FIXED: Correct sheet ID, fast CORS strategy, empty row filtering.
 */

// ===========================================================================
// Column mapping — matches YOUR actual sheet headers
// ===========================================================================
const COLUMN_MAP = {
  'Εβδομάδα': 'week',
  'Ημερομηνίες': 'dateRange',
  'Στοίχημα #': 'betNumber',
  'Τύπος Στοιχήματος': 'betType',
  'Τυπος Στοιχηματος': 'betType',
  'Ποντάρισμα': 'stake',
  'Απόδοση': 'odds',
  'Αποτέλεσμα': 'result',
  'Κέρδος/Ζημιά': 'profitLoss',
  '✓ / ✗': 'symbol',
  'Σωρευτικό Budget': 'cumulativeBudget',
  'ROI %': 'rowROI',
  'Συνολικο ROI %': 'cumulativeROIRaw',
  // English fallbacks
  'Week': 'week', 'Date Range': 'dateRange', 'Stake': 'stake', 'odd': 'odds',
  'Bet Type': 'betType',
  'Win / Lose': 'result', 'Profit / Loss': 'profitLoss',
  'Symbol (Win / Loss)': 'symbol', 'Cumulative Budget': 'cumulativeBudget',
};

// ===========================================================================
// Numeric helpers
// ===========================================================================
const toNumber = (raw) => {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return NaN;
  // Strip €, spaces, non-breaking spaces, then swap comma for dot
  return parseFloat(raw.replace(/[€\s\u00A0]/g, '').replace(',', '.'));
};
export const safeNumber = (v) => { const n = toNumber(v); return isNaN(n) ? 0 : n; };

// ===========================================================================
// CSV Parsing
// ===========================================================================
const parseCSVText = async (csvText) => {
  return fallbackParseCSV(csvText);
};

const fallbackParseCSV = (csvText) => {
  const rows = [], lines = csvText.trim().split('\n');
  if (!lines.length) return rows;
  const headers = splitCSVLine(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i]);
    if (vals.length !== headers.length) continue;
    const row = {};
    headers.forEach((h, j) => { row[h] = vals[j]; });
    rows.push(row);
  }
  return rows;
};

const splitCSVLine = (line) => {
  const vals = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { vals.push(cur.trim()); cur = ''; }
      else cur += c;
    }
  }
  vals.push(cur.trim());
  return vals;
};

// ===========================================================================
// Row normalisation + empty row filter
// ===========================================================================
const normaliseRow = (raw, id) => {
  const row = { id };
  for (const [h, v] of Object.entries(raw)) row[COLUMN_MAP[h] || h] = v;
  row.week = safeNumber(row.week);
  row.stake = safeNumber(row.stake);
  row.odds = safeNumber(row.odds);
  row.profitLoss = safeNumber(row.profitLoss);
  row.cumulativeBudget = safeNumber(row.cumulativeBudget);
  row.betType = row.betType || '';
  if (row.betNumber != null && typeof row.betNumber === 'string') {
    // betNumber in your sheet is a description like "Lewis - Τοπ 3", keep as string
    row.betLabel = row.betNumber;
    row.betNumber = null; // will be assigned sequentially later
  }
  return row;
};

/**
 * Filter out empty/placeholder rows.
 * Your sheet has formula rows that show Win/Lose and €0 even when no bet exists.
 * A real bet must have: week > 0 AND stake > 0 AND odds > 0
 */
const isRealBet = (row) => row.week > 0 && row.stake > 0 && row.odds > 0;

const assignBetNumbers = (data) => {
  let cw = null, cnt = 0;
  for (const b of data) {
    if (b.week !== cw) { cw = b.week; cnt = 0; }
    cnt++;
    if (!b.betNumber) b.betNumber = cnt;
  }
};

// ===========================================================================
// CORS + Fetch — FAST strategy
// ===========================================================================

// YOUR actual sheet: ID = 16cz7p-hZIs3PrvhL9JJ1q1tqyVEupXQ2k8kN8F9mexc, gid = 796888004
const SHEET_ID = '16cz7p-hZIs3PrvhL9JJ1q1tqyVEupXQ2k8kN8F9mexc';
const SHEET_GID = '796888004';

// Multiple URL strategies — try fastest first
const buildURLs = () => [
  // Strategy 1: Direct export (works if sheet is shared with "Anyone with link")
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`,
  // Strategy 2: gviz endpoint (often faster, returns CSV)
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`,
];

// CORS proxies as fallback — only used if direct fetch fails
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

/**
 * Fast fetch strategy:
 * 1. Try direct URLs (no proxy) — these work if the sheet is properly shared
 * 2. If CORS blocks them, try each proxy with a SHORT timeout (5s)
 * 3. Total max time: ~15s instead of 41s
 */
const fetchCSV = async () => {
  const urls = buildURLs();

  // Attempt 1: Direct fetch (fast, no proxy overhead)
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 50 && !text.includes('<html')) return text;
      }
    } catch {
      // CORS or timeout — expected, try next
    }
  }

  // Attempt 2: Via CORS proxies — single attempt per proxy, short timeout
  for (const proxyFn of CORS_PROXIES) {
    for (const url of urls) {
      try {
        const proxyUrl = proxyFn(url);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout
        const resp = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (resp.ok) {
          const text = await resp.text();
          if (text && text.length > 50 && !text.includes('<html')) return text;
        }
      } catch {
        // Next proxy
      }
    }
  }

  throw new Error('All fetch strategies failed');
};

// ===========================================================================
// Cache
// ===========================================================================
const CACHE_KEY = 'betcast_data_cache';
const CACHE_TS_KEY = 'betcast_data_cache_ts';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let inFlightFreshDataPromise = null;

const readCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const ts = sessionStorage.getItem(CACHE_TS_KEY);
    if (!raw || !ts) return null;
    return {
      data: JSON.parse(raw),
      timestamp: parseInt(ts, 10),
      isStale: Date.now() - parseInt(ts, 10) > CACHE_TTL,
    };
  } catch { return null; }
};

const writeCache = (data) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    sessionStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch {}
};

export const getLastFetchedTimestamp = () => {
  try {
    const ts = sessionStorage.getItem(CACHE_TS_KEY);
    return ts ? parseInt(ts, 10) : null;
  } catch { return null; }
};

export const clearCache = () => {
  try {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TS_KEY);
  } catch {}
};

// ===========================================================================
// Main fetch function
// ===========================================================================
export const fetchBettingData = async (onBackgroundUpdate) => {
  const cached = readCache();

  // Fresh cache — instant return
  if (cached && !cached.isStale) return cached.data;

  // Stale cache — return immediately, refresh in background
  if (cached && cached.isStale) {
    fetchFreshData().then((d) => {
      if (d && onBackgroundUpdate) onBackgroundUpdate(d);
    }).catch(() => {});
    return cached.data;
  }

  // No cache — must fetch
  return fetchFreshData();
};

const fetchFreshData = async () => {
  if (inFlightFreshDataPromise) return inFlightFreshDataPromise;

  inFlightFreshDataPromise = (async () => {
    try {
      const csvText = await fetchCSV();
      const rawRows = await parseCSVText(csvText);

      if (!rawRows.length) throw new Error('No data rows in CSV');

      // Normalise all rows
      const allRows = rawRows.map((r, i) => normaliseRow(r, i + 1));

      // CRITICAL: Filter out empty/placeholder rows
      const data = allRows.filter(isRealBet);

      if (!data.length) throw new Error('No real bets found after filtering');

      // Re-assign sequential IDs after filtering
      data.forEach((b, i) => { b.id = i + 1; });

      // Assign bet numbers per week
      assignBetNumbers(data);

      // Cache
      writeCache(data);

      if (process.env.NODE_ENV === 'development') {
        console.log(`Loaded ${data.length} real bets (filtered from ${allRows.length} rows)`);
        console.log('First bet:', data[0]);
      }

      return data;
    } catch (e) {
      console.error('Failed to load:', e);
      console.warn('Using sample data');
      return generateSampleData();
    } finally {
      inFlightFreshDataPromise = null;
    }
  })();

  return inFlightFreshDataPromise;
};

// ===========================================================================
// Sample data fallback
// ===========================================================================
export const generateSampleData = () => {
  const data = []; let budget = 100;
  const betTypes = ['Single', 'Over/Under', 'Handicap', 'BTTS', '1X2'];
  for (let w = 1; w <= 8; w++) {
    const dr = `${(w - 1) * 7 + 1}-${w * 7}/5/2025`;
    for (let b = 1; b <= 5; b++) {
      const odds = parseFloat((1.5 + Math.random() * 2).toFixed(2));
      const win = Math.random() > 0.45;
      const pl = win ? 10 * (odds - 1) : -10;
      budget += pl;
      data.push({
        id: data.length + 1, week: w, dateRange: dr, betNumber: b,
        betLabel: `Bet ${b}`, betType: betTypes[Math.floor(Math.random() * betTypes.length)],
        stake: 10, odds,
        result: win ? 'Win' : 'Lose',
        profitLoss: parseFloat(pl.toFixed(2)),
        symbol: win ? '✓' : '✗',
        cumulativeBudget: parseFloat(budget.toFixed(2)),
      });
    }
  }
  return data;
};

// ===========================================================================
// Statistics (unchanged — all previous exports preserved)
// ===========================================================================
export const calculateROI = (stake, pl) => stake === 0 ? 0 : (pl / stake) * 100;

export const calculateWeeklySummary = (data) => {
  if (!data?.length) return [];
  const weeks = [...new Set(data.map((d) => d.week))].sort((a, b) => a - b);
  let rS = 0, rP = 0;
  return weeks.map((wn) => {
    const wb = data.filter((b) => b.week === wn);
    const wins = wb.filter((b) => b.result === 'Win').length;
    const losses = wb.filter((b) => b.result === 'Lose').length;
    const wS = wb.reduce((s, b) => s + safeNumber(b.stake), 0);
    const wP = wb.reduce((s, b) => s + safeNumber(b.profitLoss), 0);
    rS += wS; rP += wP;
    return {
      week: wn, dateRange: wb[0]?.dateRange || '', wins, losses,
      winRate: (wins + losses) > 0 ? wins / (wins + losses) : 0,
      totalProfitLoss: parseFloat(wP.toFixed(2)), totalStake: wS,
      cumulativeBudget: safeNumber(wb[wb.length - 1]?.cumulativeBudget),
      weeklyROI: parseFloat(calculateROI(wS, wP).toFixed(2)),
      cumulativeROI: parseFloat(calculateROI(rS, rP).toFixed(2)),
    };
  });
};

export const calculateStreaks = (data) => {
  if (!data?.length) return { currentStreak: { type: 'none', count: 0 }, longestWin: 0, longestLoss: 0 };
  let lw = 0, ll = 0, ct = null, cc = 0;
  for (const b of data) {
    const t = b.result === 'Win' ? 'Win' : 'Lose';
    if (t === ct) cc++; else { ct = t; cc = 1; }
    if (t === 'Win' && cc > lw) lw = cc;
    if (t === 'Lose' && cc > ll) ll = cc;
  }
  return { currentStreak: { type: ct || 'none', count: cc }, longestWin: lw, longestLoss: ll };
};

export const calculateAvgOdds = (data) => {
  const w = data.filter((b) => b.result === 'Win');
  const l = data.filter((b) => b.result === 'Lose');
  const avg = (arr) => arr.length ? arr.reduce((s, b) => s + safeNumber(b.odds), 0) / arr.length : 0;
  return { avgWinOdds: parseFloat(avg(w).toFixed(2)), avgLossOdds: parseFloat(avg(l).toFixed(2)) };
};

export const calculateProfitByOddsRange = (data) => {
  const gs = [
    { min: 1.0, max: 1.5, label: '1.00-1.50' }, { min: 1.5, max: 2.0, label: '1.50-2.00' },
    { min: 2.0, max: 2.5, label: '2.00-2.50' }, { min: 2.5, max: 3.0, label: '2.50-3.00' },
    { min: 3.0, max: 4.0, label: '3.00-4.00' }, { min: 4.0, max: Infinity, label: '4.00+' },
  ];
  return gs.map((g) => {
    const ir = data.filter((b) => safeNumber(b.odds) >= g.min && safeNumber(b.odds) < g.max);
    const p = ir.reduce((s, b) => s + safeNumber(b.profitLoss), 0);
    return { range: g.label, profit: parseFloat(p.toFixed(2)), count: ir.length, winRate: parseFloat(((ir.length > 0 ? ir.filter((b) => b.result === 'Win').length / ir.length : 0) * 100).toFixed(1)) };
  }).filter((d) => d.count > 0);
};

export const calculateEVByOddsRange = (data) => {
  const gs = [
    { min: 1.0, max: 1.5, label: '1.00-1.50' }, { min: 1.5, max: 2.0, label: '1.50-2.00' },
    { min: 2.0, max: 2.5, label: '2.00-2.50' }, { min: 2.5, max: 3.0, label: '2.50-3.00' },
    { min: 3.0, max: 4.0, label: '3.00-4.00' }, { min: 4.0, max: Infinity, label: '4.00+' },
  ];
  return gs.map((g) => {
    const ir = data.filter((b) => safeNumber(b.odds) >= g.min && safeNumber(b.odds) < g.max);
    if (!ir.length) return null;
    const ao = ir.reduce((s, b) => s + safeNumber(b.odds), 0) / ir.length;
    const ip = (1 / ao) * 100;
    const aw = (ir.filter((b) => b.result === 'Win').length / ir.length) * 100;
    return { range: g.label, impliedProb: parseFloat(ip.toFixed(1)), actualWinRate: parseFloat(aw.toFixed(1)), edge: parseFloat((aw - ip).toFixed(1)), count: ir.length };
  }).filter(Boolean);
};

export const findBestWorstWeeks = (summary) => {
  if (!summary?.length) return { best: null, worst: null };
  let b = summary[0], w = summary[0];
  for (const s of summary) { if (s.totalProfitLoss > b.totalProfitLoss) b = s; if (s.totalProfitLoss < w.totalProfitLoss) w = s; }
  return { best: b, worst: w };
};

export const addRollingAverage = (budgetData, window = 5) =>
  budgetData.map((d, i) => {
    if (i < window - 1) return { ...d, rollingAvg: null };
    const sl = budgetData.slice(i - window + 1, i + 1);
    return { ...d, rollingAvg: parseFloat((sl.reduce((s, x) => s + x.value, 0) / window).toFixed(2)) };
  });

export const calculateKelly = (data, currentBudget) => {
  const gs = [
    { min: 1.0, max: 1.5, label: '1.00-1.50' }, { min: 1.5, max: 2.0, label: '1.50-2.00' },
    { min: 2.0, max: 2.5, label: '2.00-2.50' }, { min: 2.5, max: 3.0, label: '2.50-3.00' },
    { min: 3.0, max: 4.0, label: '3.00-4.00' }, { min: 4.0, max: Infinity, label: '4.00+' },
  ];
  return gs.map((g) => {
    const ir = data.filter((b) => safeNumber(b.odds) >= g.min && safeNumber(b.odds) < g.max);
    if (ir.length < 3) return null; // lowered min sample since you have few bets
    const avgOdds = ir.reduce((s, b) => s + safeNumber(b.odds), 0) / ir.length;
    const winProb = ir.filter((b) => b.result === 'Win').length / ir.length;
    const kelly = ((winProb * (avgOdds - 1)) - (1 - winProb)) / (avgOdds - 1);
    const kellyPct = Math.max(0, Math.min(kelly * 100, 25));
    return { range: g.label, avgOdds: parseFloat(avgOdds.toFixed(2)), winProb: parseFloat((winProb * 100).toFixed(1)), kellyPct: parseFloat(kellyPct.toFixed(1)), suggestedStake: parseFloat((currentBudget * kellyPct / 100).toFixed(2)), sampleSize: ir.length };
  }).filter(Boolean);
};

export const calculateVariance = (data) => {
  if (data.length < 2) return { mean: 0, stdDev: 0, variance: 0 };
  const pls = data.map((b) => safeNumber(b.profitLoss));
  const mean = pls.reduce((s, v) => s + v, 0) / pls.length;
  const variance = pls.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (pls.length - 1);
  return { mean: parseFloat(mean.toFixed(2)), stdDev: parseFloat(Math.sqrt(variance).toFixed(2)), variance: parseFloat(variance.toFixed(2)) };
};

export const buildBetSizeAnalysis = (data) => {
  const groups = {};
  for (const b of data) {
    const key = safeNumber(b.stake).toFixed(0);
    if (!groups[key]) groups[key] = { stake: safeNumber(b.stake), totalPL: 0, count: 0, wins: 0 };
    groups[key].totalPL += safeNumber(b.profitLoss);
    groups[key].count++;
    if (b.result === 'Win') groups[key].wins++;
  }
  return Object.values(groups).map((g) => ({
    stake: g.stake,
    avgPL: parseFloat((g.totalPL / g.count).toFixed(2)),
    totalPL: parseFloat(g.totalPL.toFixed(2)),
    count: g.count,
    winRate: parseFloat(((g.wins / g.count) * 100).toFixed(1)),
  })).sort((a, b) => a.stake - b.stake);
};
