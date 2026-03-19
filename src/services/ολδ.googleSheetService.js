/**
 * Google Sheets Betting Data Service
 * Full feature set: CSV parsing, CORS proxy w/ backoff, sessionStorage cache,
 * streaks, avg odds, profit-by-odds, EV, best/worst week, rolling avg,
 * NEW: Kelly criterion, monthly summary, variance, bet-size analysis, auto-refresh.
 */

// Column mapping
const COLUMN_MAP = {
  'Εβδομάδα': 'week', 'Ημερομηνίες': 'dateRange', 'Στοίχημα #': 'betNumber',
  'Ποντάρισμα': 'stake', 'Απόδοση': 'odds', 'Αποτέλεσμα': 'result',
  'Κέρδος/Ζημιά': 'profitLoss', '✓ / ✗': 'symbol', 'Σωρευτικό Budget': 'cumulativeBudget',
  'Week': 'week', 'Date Range': 'dateRange', 'Stake': 'stake', 'odd': 'odds',
  'Win / Lose': 'result', 'Profit / Loss': 'profitLoss',
  'Symbol (Win / Loss)': 'symbol', 'Cumulative Budget': 'cumulativeBudget',
};

const toNumber = (raw) => { if (typeof raw === 'number') return raw; if (typeof raw !== 'string') return NaN; return parseFloat(raw.replace(/[€\s]/g, '').replace(',', '.')); };
export const safeNumber = (v) => { const n = toNumber(v); return isNaN(n) ? 0 : n; };

// CSV Parsing
const parseCSVText = async (csvText) => {
  try { const Papa = await import('papaparse'); const r = Papa.default.parse(csvText, { header: true, skipEmptyLines: true, dynamicTyping: false, transformHeader: (h) => h.trim() }); return r.data; }
  catch { return fallbackParseCSV(csvText); }
};
const fallbackParseCSV = (csvText) => { const rows = [], lines = csvText.trim().split('\n'); if (!lines.length) return rows; const headers = splitCSVLine(lines[0]); for (let i = 1; i < lines.length; i++) { const vals = splitCSVLine(lines[i]); if (vals.length !== headers.length) continue; const row = {}; headers.forEach((h, j) => { row[h] = vals[j]; }); rows.push(row); } return rows; };
const splitCSVLine = (line) => { const vals = []; let cur = '', inQ = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (inQ) { if (c === '"') { if (i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; } else { if (c === '"') inQ = true; else if (c === ',') { vals.push(cur.trim()); cur = ''; } else cur += c; } } vals.push(cur.trim()); return vals; };

// Row normalisation
const normaliseRow = (raw, id) => { const row = { id }; for (const [h, v] of Object.entries(raw)) row[COLUMN_MAP[h] || h] = v; row.week = safeNumber(row.week); row.stake = safeNumber(row.stake); row.odds = safeNumber(row.odds); row.profitLoss = safeNumber(row.profitLoss); row.cumulativeBudget = safeNumber(row.cumulativeBudget); if (row.betNumber != null) row.betNumber = safeNumber(row.betNumber); return row; };
const assignBetNumbers = (data) => { let cw = null, cnt = 0; for (const b of data) { if (b.week !== cw) { cw = b.week; cnt = 0; } cnt++; if (!b.betNumber) b.betNumber = cnt; } };

// CORS + backoff
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTbj_mc5tRE9rQsBFNlEDO78wJRcmfHYNWHM75WRdTJ37GXjNSYsgIs-AiNuj3wjG8eGRHNbEwlEuEx/pub?output=csv';
const CORS_PROXIES = ['https://corsproxy.io/?', 'https://api.allorigins.win/raw?url='];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fetchWithBackoff = async (proxy, max = 3) => { const url = `${proxy}${encodeURIComponent(SHEET_CSV_URL)}`; for (let a = 0; a < max; a++) { try { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.text(); } catch (e) { if (a < max - 1) await sleep(500 * Math.pow(2, a)); } } throw new Error(`Proxy ${proxy} failed`); };
const fetchCSVWithRetry = async () => { const errs = []; for (const p of CORS_PROXIES) { try { return await fetchWithBackoff(p); } catch (e) { errs.push(e.message); } } throw new Error(`All proxies failed`); };

// Cache
const CACHE_KEY = 'betcast_data_cache', CACHE_TS_KEY = 'betcast_data_cache_ts', CACHE_TTL = 5 * 60 * 1000;
const readCache = () => { try { const raw = sessionStorage.getItem(CACHE_KEY), ts = sessionStorage.getItem(CACHE_TS_KEY); if (!raw || !ts) return null; return { data: JSON.parse(raw), timestamp: parseInt(ts, 10), isStale: Date.now() - parseInt(ts, 10) > CACHE_TTL }; } catch { return null; } };
const writeCache = (data) => { try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); sessionStorage.setItem(CACHE_TS_KEY, String(Date.now())); } catch {} };
export const getLastFetchedTimestamp = () => { try { const ts = sessionStorage.getItem(CACHE_TS_KEY); return ts ? parseInt(ts, 10) : null; } catch { return null; } };
export const clearCache = () => { try { sessionStorage.removeItem(CACHE_KEY); sessionStorage.removeItem(CACHE_TS_KEY); } catch {} };

// Fetch with cache
export const fetchBettingData = async (onBackgroundUpdate) => {
  const cached = readCache();
  if (cached && !cached.isStale) return cached.data;
  if (cached && cached.isStale) { fetchFreshData().then((d) => { if (d && onBackgroundUpdate) onBackgroundUpdate(d); }).catch(() => {}); return cached.data; }
  return fetchFreshData();
};
const fetchFreshData = async () => {
  try { const csv = await fetchCSVWithRetry(); const rows = await parseCSVText(csv); if (!rows.length) throw new Error('No data'); const data = rows.map((r, i) => normaliseRow(r, i + 1)); assignBetNumbers(data); writeCache(data); return data; }
  catch (e) { console.error('Fetch failed:', e); return generateSampleData(); }
};

// Sample data
export const generateSampleData = () => {
  const data = []; let budget = 100;
  for (let w = 1; w <= 8; w++) { const dr = `${(w-1)*7+1}-${w*7}/5/2025`; for (let b = 1; b <= 5; b++) { const odds = parseFloat((1.5 + Math.random() * 2).toFixed(2)); const win = Math.random() > 0.45, pl = win ? 10 * (odds - 1) : -10; budget += pl; data.push({ id: data.length + 1, week: w, dateRange: dr, betNumber: b, stake: 10, odds, result: win ? 'Win' : 'Lose', profitLoss: parseFloat(pl.toFixed(2)), symbol: win ? '✓' : '✗', cumulativeBudget: parseFloat(budget.toFixed(2)) }); } }
  return data;
};

// Stats
export const calculateROI = (stake, pl) => stake === 0 ? 0 : (pl / stake) * 100;
export const calculateWeeklySummary = (data) => {
  if (!data?.length) return [];
  const weeks = [...new Set(data.map((d) => d.week))].sort((a, b) => a - b);
  let rS = 0, rP = 0;
  return weeks.map((wn) => { const wb = data.filter((b) => b.week === wn); const wins = wb.filter((b) => b.result === 'Win').length, losses = wb.filter((b) => b.result === 'Lose').length; const wS = wb.reduce((s, b) => s + safeNumber(b.stake), 0); const wP = wb.reduce((s, b) => s + safeNumber(b.profitLoss), 0); rS += wS; rP += wP; return { week: wn, dateRange: wb[0]?.dateRange || '', wins, losses, winRate: (wins + losses) > 0 ? wins / (wins + losses) : 0, totalProfitLoss: parseFloat(wP.toFixed(2)), totalStake: wS, cumulativeBudget: safeNumber(wb[wb.length - 1]?.cumulativeBudget), weeklyROI: parseFloat(calculateROI(wS, wP).toFixed(2)), cumulativeROI: parseFloat(calculateROI(rS, rP).toFixed(2)) }; });
};
export const calculateStreaks = (data) => { if (!data?.length) return { currentStreak: { type: 'none', count: 0 }, longestWin: 0, longestLoss: 0 }; let lw = 0, ll = 0, ct = null, cc = 0; for (const b of data) { const t = b.result === 'Win' ? 'Win' : 'Lose'; if (t === ct) cc++; else { ct = t; cc = 1; } if (t === 'Win' && cc > lw) lw = cc; if (t === 'Lose' && cc > ll) ll = cc; } return { currentStreak: { type: ct || 'none', count: cc }, longestWin: lw, longestLoss: ll }; };
export const calculateAvgOdds = (data) => { const w = data.filter((b) => b.result === 'Win'), l = data.filter((b) => b.result === 'Lose'); const a = (arr) => arr.length ? arr.reduce((s, b) => s + safeNumber(b.odds), 0) / arr.length : 0; return { avgWinOdds: parseFloat(a(w).toFixed(2)), avgLossOdds: parseFloat(a(l).toFixed(2)) }; };
export const calculateProfitByOddsRange = (data) => { const gs = [{ min: 1.0, max: 1.5, label: '1.00-1.50' }, { min: 1.5, max: 2.0, label: '1.50-2.00' }, { min: 2.0, max: 2.5, label: '2.00-2.50' }, { min: 2.5, max: 3.0, label: '2.50-3.00' }, { min: 3.0, max: 4.0, label: '3.00-4.00' }, { min: 4.0, max: Infinity, label: '4.00+' }]; return gs.map((g) => { const ir = data.filter((b) => { const o = safeNumber(b.odds); return o >= g.min && o < g.max; }); const p = ir.reduce((s, b) => s + safeNumber(b.profitLoss), 0); return { range: g.label, profit: parseFloat(p.toFixed(2)), count: ir.length, winRate: parseFloat(((ir.length > 0 ? ir.filter((b) => b.result === 'Win').length / ir.length : 0) * 100).toFixed(1)) }; }).filter((d) => d.count > 0); };
export const calculateEVByOddsRange = (data) => { const gs = [{ min: 1.0, max: 1.5, label: '1.00-1.50' }, { min: 1.5, max: 2.0, label: '1.50-2.00' }, { min: 2.0, max: 2.5, label: '2.00-2.50' }, { min: 2.5, max: 3.0, label: '2.50-3.00' }, { min: 3.0, max: 4.0, label: '3.00-4.00' }, { min: 4.0, max: Infinity, label: '4.00+' }]; return gs.map((g) => { const ir = data.filter((b) => { const o = safeNumber(b.odds); return o >= g.min && o < g.max; }); if (!ir.length) return null; const ao = ir.reduce((s, b) => s + safeNumber(b.odds), 0) / ir.length; const ip = (1 / ao) * 100; const aw = (ir.filter((b) => b.result === 'Win').length / ir.length) * 100; return { range: g.label, impliedProb: parseFloat(ip.toFixed(1)), actualWinRate: parseFloat(aw.toFixed(1)), edge: parseFloat((aw - ip).toFixed(1)), count: ir.length }; }).filter(Boolean); };
export const findBestWorstWeeks = (summary) => { if (!summary?.length) return { best: null, worst: null }; let b = summary[0], w = summary[0]; for (const s of summary) { if (s.totalProfitLoss > b.totalProfitLoss) b = s; if (s.totalProfitLoss < w.totalProfitLoss) w = s; } return { best: b, worst: w }; };
export const addRollingAverage = (budgetData, window = 5) => budgetData.map((d, i) => { if (i < window - 1) return { ...d, rollingAvg: null }; const sl = budgetData.slice(i - window + 1, i + 1); return { ...d, rollingAvg: parseFloat((sl.reduce((s, x) => s + x.value, 0) / window).toFixed(2)) }; });

// ============================================================
// NEW: #4 Kelly Criterion
// ============================================================
export const calculateKelly = (data, currentBudget) => {
  const gs = [{ min: 1.0, max: 1.5, label: '1.00-1.50' }, { min: 1.5, max: 2.0, label: '1.50-2.00' }, { min: 2.0, max: 2.5, label: '2.00-2.50' }, { min: 2.5, max: 3.0, label: '2.50-3.00' }, { min: 3.0, max: 4.0, label: '3.00-4.00' }, { min: 4.0, max: Infinity, label: '4.00+' }];
  return gs.map((g) => {
    const ir = data.filter((b) => { const o = safeNumber(b.odds); return o >= g.min && o < g.max; });
    if (ir.length < 5) return null; // need min sample
    const avgOdds = ir.reduce((s, b) => s + safeNumber(b.odds), 0) / ir.length;
    const winProb = ir.filter((b) => b.result === 'Win').length / ir.length;
    const decimalOdds = avgOdds; // European odds
    // Kelly: f = (p * (d-1) - (1-p)) / (d-1) where p=winProb, d=decimalOdds
    const kelly = ((winProb * (decimalOdds - 1)) - (1 - winProb)) / (decimalOdds - 1);
    const kellyPct = Math.max(0, Math.min(kelly * 100, 25)); // cap at 25%
    const suggestedStake = parseFloat((currentBudget * kellyPct / 100).toFixed(2));
    return { range: g.label, avgOdds: parseFloat(avgOdds.toFixed(2)), winProb: parseFloat((winProb * 100).toFixed(1)), kellyPct: parseFloat(kellyPct.toFixed(1)), suggestedStake, sampleSize: ir.length };
  }).filter(Boolean);
};

// ============================================================
// NEW: #6 Variance / Standard deviation
// ============================================================
export const calculateVariance = (data) => {
  if (data.length < 2) return { mean: 0, stdDev: 0, variance: 0 };
  const pls = data.map((b) => safeNumber(b.profitLoss));
  const mean = pls.reduce((s, v) => s + v, 0) / pls.length;
  const variance = pls.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (pls.length - 1);
  return { mean: parseFloat(mean.toFixed(2)), stdDev: parseFloat(Math.sqrt(variance).toFixed(2)), variance: parseFloat(variance.toFixed(2)) };
};

// ============================================================
// NEW: #7 Bet size analysis (stake vs profitLoss scatter data)
// ============================================================
export const buildBetSizeAnalysis = (data) => {
  const stakeGroups = {};
  for (const b of data) {
    const stake = safeNumber(b.stake);
    const key = stake.toFixed(0);
    if (!stakeGroups[key]) stakeGroups[key] = { stake, totalPL: 0, count: 0, wins: 0 };
    stakeGroups[key].totalPL += safeNumber(b.profitLoss);
    stakeGroups[key].count++;
    if (b.result === 'Win') stakeGroups[key].wins++;
  }
  return Object.values(stakeGroups).map((g) => ({
    stake: g.stake,
    avgPL: parseFloat((g.totalPL / g.count).toFixed(2)),
    totalPL: parseFloat(g.totalPL.toFixed(2)),
    count: g.count,
    winRate: parseFloat(((g.wins / g.count) * 100).toFixed(1)),
  })).sort((a, b) => a.stake - b.stake);
};
