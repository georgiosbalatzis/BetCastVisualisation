import React, { useState, useEffect, useCallback, useMemo, useRef, startTransition } from 'react';
import {
  Line, Bar, PieChart, Pie, Cell, Sector, ReferenceDot,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, BarChart, Area,
} from 'recharts';
import {
  fetchBettingData, calculateWeeklySummary, calculateROI, calculateStreaks,
  safeNumber, calculateAvgOdds, calculateProfitByOddsRange, calculateEVByOddsRange,
  findBestWorstWeeks, addRollingAverage, getLastFetchedTimestamp, clearCache,
  calculateKelly, calculateVariance, buildBetSizeAnalysis, DATA_SOURCES,
} from '../services/googleSheetService';
import { useTheme } from '../context/ThemeContext';

// Theme
const CHART_COLORS = {
  win: 'var(--success)', lose: 'var(--error)', neutral: 'var(--text-muted)',
  profit: 'var(--success)', loss: 'var(--error)', budgetLine: 'var(--accent)',
  darkGray: 'var(--text-muted)', labelColor: 'var(--text)', detailColor: 'var(--text-muted)',
  referenceLine: 'var(--text)', rolling: 'var(--text-muted)', milestone: 'var(--accent)',
};

const BOOKMAKER_ALIASES = {
  stoiximan: 'stoiximan',
  interwetten: 'interwetten',
  intervetten: 'interwetten',
  bwin: 'bwin',
  bet365: 'bet365',
  novibet: 'novibet',
};

const BOOKMAKER_LOGOS = {
  stoiximan: { label: 'Stoiximan', src: `${process.env.PUBLIC_URL}/bookmakers/stoiximan.svg` },
  interwetten: { label: 'Interwetten', src: `${process.env.PUBLIC_URL}/bookmakers/interwetten.svg` },
  bwin: { label: 'bwin', src: `${process.env.PUBLIC_URL}/bookmakers/bwin.svg` },
  bet365: { label: 'bet365', src: `${process.env.PUBLIC_URL}/bookmakers/bet365.svg` },
  novibet: { label: 'Novibet', src: `${process.env.PUBLIC_URL}/bookmakers/novibet.svg` },
};

const normaliseBookmaker = (value) => {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  const compact = trimmed.toLowerCase().replace(/\s+/g, '');
  return BOOKMAKER_ALIASES[compact] || '';
};

const BookmakerLogo = ({ company }) => {
  const key = normaliseBookmaker(company);
  const logo = key ? BOOKMAKER_LOGOS[key] : null;
  if (!logo) return <span className="bookmaker-logo bookmaker-logo--unknown">{company || '—'}</span>;
  return (
    <span className={`bookmaker-logo bookmaker-logo--asset bookmaker-logo--${key}`} title={logo.label} aria-label={logo.label}>
      <img className="bookmaker-logo__image" src={logo.src} alt={logo.label} loading="lazy" />
    </span>
  );
};

const UiIcon = ({ name = 'chart' }) => (
  <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true">
    {name === 'download' ? <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /> : name === 'share' ? <path d="M18 8a3 3 0 10-2.83-4H15a3 3 0 00.17 1L8.9 8.14A3 3 0 107 12l6.17 3.14A3 3 0 1014 17a3 3 0 00-.17 1l-6.17-3.14A3 3 0 0018 8z" /> : <path d="M4 19V5m0 14h16M7 16l3-4 3 2 5-7" />}
  </svg>
);

// Chart builders
const buildBudgetData = (d) => d.map((x) => ({ id: x.id, value: safeNumber(x.cumulativeBudget), result: x.result, week: x.week, odds: safeNumber(x.odds), profitLoss: safeNumber(x.profitLoss) }));
const buildWkProfitData = (s) => s.map((w) => ({ week: `Εβδ. ${w.week}`, weekNum: w.week, profit: w.totalProfitLoss, budget: w.cumulativeBudget, dateRange: w.dateRange }));
const buildWLData = (d) => [{ name: 'Νίκες', value: d.filter((b) => b.result === 'Win').length }, { name: 'Ήττες', value: d.filter((b) => b.result === 'Lose').length }];
const buildOddsDist = (d) => { const gs = [...Array.from({ length: 8 }, (_, i) => { const m = 1.5 + i * 0.25; return { min: m, max: m + 0.25, label: `${m.toFixed(2)}-${(m + 0.25).toFixed(2)}` }; }), { min: 3.5, max: 5, label: '3.50-5.00' }, { min: 5, max: Infinity, label: '5.00+' }]; return gs.map((g) => { const ir = d.filter((b) => { const o = safeNumber(b.odds); return o >= g.min && o < g.max; }); return { range: g.label, count: ir.length, winCount: ir.filter((b) => b.result === 'Win').length }; }).filter((x) => x.count > 0); };
const buildRoi = (s) => s.map((w) => ({ week: `Εβδ. ${w.week}`, weekNum: w.week, roi: w.weeklyROI }));
const buildCumRoi = (s) => s.map((w) => ({ week: `Εβδ. ${w.week}`, weekNum: w.week, roi: parseFloat(w.cumulativeROI.toFixed(2)) }));
const buildWinRate = (s) => s.map((w) => ({ week: `Εβδ. ${w.week}`, weekNum: w.week, winRate: parseFloat((w.winRate * 100).toFixed(1)) }));

// Custom tooltips
const BudgetTT = ({ active, payload, label }) => { if (!active || !payload?.length) return null; const d = payload[0]?.payload; return (<div className="custom-tooltip"><p className="custom-tooltip__title">Στοίχημα #{label}</p><p>Budget: <strong>{d?.value?.toFixed(2)}€</strong></p><p>Αποτέλεσμα: <strong className={d?.result === 'Win' ? 'tt-win' : 'tt-lose'}>{d?.result === 'Win' ? 'Νίκη' : 'Ήττα'}</strong> | Απόδοση: {d?.odds?.toFixed(2)}</p><p>Κέρδος/Ζημία: {d?.profitLoss >= 0 ? '+' : ''}{d?.profitLoss?.toFixed(2)}€</p></div>); };
const WeeklyTT = ({ active, payload }) => { if (!active || !payload?.length) return null; const d = payload[0]?.payload; return (<div className="custom-tooltip"><p className="custom-tooltip__title">{d?.week}</p>{d?.dateRange && <p className="custom-tooltip__sub">{d.dateRange}</p>}{payload.map((p, i) => <p key={i}>{p.name}: <strong>{typeof p.value === 'number' ? `${p.value.toFixed?.(2) ?? p.value}${p.name.includes('%') || p.name.includes('ROI') ? '%' : '€'}` : p.value}</strong></p>)}</div>); };
const formatChartMetric = (value, name, item) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;
  const metric = String(item?.dataKey ?? name ?? '').toLowerCase();
  const isPercentage = metric.includes('rate') || metric.includes('win%') || metric.includes('roi') || metric.includes('percent');
  return [`${numericValue.toFixed(2)}${isPercentage ? '%' : '€'}`, name];
};

// CSV export — includes betType column
const exportCSV = (data, fn = 'betcast_export.csv') => { const h = ['#', 'Εβδομάδα', 'Στοίχημα', 'Τύπος', 'Εταιρία', 'Αποδόσεις', 'Ποντάρισμα (€)', 'Αποτέλεσμα', 'Κέρδος/Ζημία (€)', 'Budget (€)']; const r = data.map((b) => [b.id, b.week, b.betNumber, b.betType || '', b.company || '', safeNumber(b.odds).toFixed(2), safeNumber(b.stake).toFixed(2), b.result === 'Win' ? 'Νίκη' : 'Ήττα', safeNumber(b.profitLoss).toFixed(2), safeNumber(b.cumulativeBudget).toFixed(2)]); const csv = [h.join(','), ...r.map((x) => x.join(','))].join('\n'); const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fn; a.click(); };

// Viz options
const VIZ_OPTIONS = [
  { id: 'budget', name: 'Εξέλιξη Budget', icon: 'chart' },
  { id: 'weeklyProfit', name: 'Εβδομ. Κέρδη', icon: 'chart' },
  { id: 'winLossRatio', name: 'Νίκες/Ήττες', icon: 'chart' },
  { id: 'oddsDistribution', name: 'Αποδόσεις', icon: 'chart' },
  { id: 'profitByOdds', name: 'Κέρδος ανά απόδοση', icon: 'chart' },
  { id: 'evTracking', name: 'Αναμενόμενη αξία', icon: 'chart' },
  { id: 'kelly', name: 'Kelly', icon: 'chart' },
  { id: 'betSize', name: 'Ποντάρισμα', icon: 'chart' },
  { id: 'winRateByWeek', name: 'Ποσοστό νικών', icon: 'chart' },
  { id: 'weeklyROI', name: 'Εβδομ. ROI', icon: 'chart' },
  { id: 'cumulativeROI', name: 'Συνολ. ROI', icon: 'chart' },
  { id: 'compareWeeks', name: 'Σύγκριση', icon: 'chart' },
  { id: 'dataTable', name: 'Πίνακας', icon: 'chart' },
];

const TABLE_COLS = [
  { key: 'id', label: '#', align: 'center' }, { key: 'week', label: 'Εβδ.', align: 'center' },
  { key: 'betNumber', label: 'Στ.', align: 'center' },
  { key: 'betType', label: 'Τύπος Στοιχήματος', align: 'left' },
  { key: 'company', label: 'Εταιρία', align: 'center' },
  { key: 'odds', label: 'Odds', align: 'right' },
  { key: 'stake', label: 'Ποντάρισμα', align: 'right' }, { key: 'result', label: 'Αποτ.', align: 'center' },
  { key: 'profitLoss', label: 'Κέρδος/Ζημία', align: 'right' }, { key: 'cumulativeBudget', label: 'Budget', align: 'right' },
];
const ROWS_PP = 15;
const AUTO_REFRESH_MS = 3 * 60 * 1000; // #13 — 3 min
const EMBED_PARAM = 'embed';
const DATA_SOURCE_PARAM = 'season';
const EMBED_MIN_HEIGHT = 960;
const EMBED_RESIZE_EVENT = 'betcast:resize';
const EMBED_TITLE = 'BetCast F1 Stories';
const DEFAULT_DATA_SOURCE = 'current';
const DATA_SOURCE_OPTIONS = Object.values(DATA_SOURCES);

const getNumericParam = (params, key) => {
  const value = params.get(key);
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normaliseDataSourceId = (value) => DATA_SOURCES[value] ? value : DEFAULT_DATA_SOURCE;

const buildShareUrl = ({ selectedViz, dataSource, weekFrom, weekTo, highlightedWeek, cmpWeekA, cmpWeekB, embedded = false, isDarkMode = true }) => {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams();
  if (selectedViz !== 'budget') params.set('viz', selectedViz);
  if (dataSource && dataSource !== DEFAULT_DATA_SOURCE) params.set(DATA_SOURCE_PARAM, dataSource);
  if (weekFrom != null) params.set('from', String(weekFrom));
  if (weekTo != null) params.set('to', String(weekTo));
  if (highlightedWeek != null) params.set('week', String(highlightedWeek));
  if (cmpWeekA != null) params.set('cmpA', String(cmpWeekA));
  if (cmpWeekB != null) params.set('cmpB', String(cmpWeekB));
  if (embedded) params.set(EMBED_PARAM, '1');
  if (embedded) params.set('theme', isDarkMode ? 'dark' : 'light');
  const queryString = params.toString();
  return `${window.location.origin}${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
};

const buildEmbedSnippet = (embedUrl) => `<iframe src="${embedUrl}" title="${EMBED_TITLE}" loading="lazy" style="width:100%;min-height:${EMBED_MIN_HEIGHT}px;border:0;"></iframe>`;

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }
};

// ============================================================================
const BettingVisualizations = ({ embedded = false }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bettingData, setBettingData] = useState([]);
  const [selectedViz, setSelectedViz] = useState('budget');
  const [dataSource, setDataSource] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_DATA_SOURCE;
    return normaliseDataSourceId(new URLSearchParams(window.location.search).get(DATA_SOURCE_PARAM));
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [weekFrom, setWeekFrom] = useState(null);
  const [weekTo, setWeekTo] = useState(null);
  const [highlightedWeek, setHighlightedWeek] = useState(null);
  const [sortCol, setSortCol] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [tablePage, setTablePage] = useState(0);
  const [lastFetched, setLastFetched] = useState(null);
  const [fullscreen, setFullscreen] = useState(false); // #9
  const [cmpWeekA, setCmpWeekA] = useState(null); // #11
  const [cmpWeekB, setCmpWeekB] = useState(null);
  const [shareFeedback, setShareFeedback] = useState('');

  const mainContentRef = useRef(null);
  const chartRef = useRef(null); // #8 scroll target
  const [urlStateInitialized, setUrlStateInitialized] = useState(false);
  const touchStartX = useRef(null); // #10 swipe
  const lastPostedHeightRef = useRef(0);

  const { isDark: isDarkMode } = useTheme();
  const C = CHART_COLORS;
  const [reduceMotion, setReduceMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    query?.addEventListener('change', update);
    return () => query?.removeEventListener('change', update);
  }, []);

  const allWeeks = useMemo(() => [...new Set(bettingData.map((b) => b.week))].sort((a, b) => a - b), [bettingData]);
  const filteredData = useMemo(() => { let d = bettingData; if (weekFrom != null) d = d.filter((b) => b.week >= weekFrom); if (weekTo != null) d = d.filter((b) => b.week <= weekTo); return d; }, [bettingData, weekFrom, weekTo]);
  const filteredSummary = useMemo(() => calculateWeeklySummary(filteredData), [filteredData]);

  // Chart data
  const rawBudget = useMemo(() => buildBudgetData(filteredData), [filteredData]);
  const budgetData = useMemo(() => addRollingAverage(rawBudget, 5), [rawBudget]);
  const milestones = useMemo(() => { if (!budgetData.length) return { high: null, low: null }; let h = budgetData[0], l = budgetData[0]; for (const d of budgetData) { if (d.value > h.value) h = d; if (d.value < l.value) l = d; } return { high: h, low: l }; }, [budgetData]);
  const wkProfitData = useMemo(() => buildWkProfitData(filteredSummary), [filteredSummary]);
  const wlData = useMemo(() => buildWLData(filteredData), [filteredData]);
  const oddsDist = useMemo(() => buildOddsDist(filteredData), [filteredData]);
  const roiData = useMemo(() => buildRoi(filteredSummary), [filteredSummary]);
  const cumRoi = useMemo(() => buildCumRoi(filteredSummary), [filteredSummary]);
  const winRate = useMemo(() => buildWinRate(filteredSummary), [filteredSummary]);
  const avgOdds = useMemo(() => calculateAvgOdds(filteredData), [filteredData]);
  const profitByOdds = useMemo(() => calculateProfitByOddsRange(filteredData), [filteredData]);
  const evData = useMemo(() => calculateEVByOddsRange(filteredData), [filteredData]);
  const bestWorst = useMemo(() => findBestWorstWeeks(filteredSummary), [filteredSummary]);
  const streaks = useMemo(() => calculateStreaks(filteredData), [filteredData]);
  const kellyData = useMemo(() => { const lb = filteredData.length > 0 ? safeNumber(filteredData[filteredData.length - 1].cumulativeBudget) : 100; return calculateKelly(filteredData, lb); }, [filteredData]);
  const varianceStats = useMemo(() => calculateVariance(filteredData), [filteredData]);
  const betSizeData = useMemo(() => buildBetSizeAnalysis(filteredData), [filteredData]);

  // Derived display
  const totalBets = filteredData.length;
  const wins = wlData[0]?.value || 0;
  const winPct = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : '0.0';
  const lastBudget = totalBets > 0 ? safeNumber(filteredData[totalBets - 1].cumulativeBudget) : 0;
  const totalStake = filteredData.reduce((s, b) => s + safeNumber(b.stake), 0);
  const totalProfit = filteredData.reduce((s, b) => s + safeNumber(b.profitLoss), 0);
  const overallROI = calculateROI(totalStake, totalProfit);
  const hasData = filteredData.length > 0;

  // Data loading
  const processData = useCallback((data) => {
    startTransition(() => {
      setBettingData(data);
      setLastFetched(getLastFetchedTimestamp(dataSource));
    });
  }, [dataSource]);
  const refreshData = useCallback((shouldApply = () => true) => fetchBettingData((fresh) => {
    if (shouldApply()) processData(fresh);
  }, dataSource).then((data) => {
    if (shouldApply()) processData(data);
    return data;
  }), [dataSource, processData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { setLoading(true); setError(null); await refreshData(() => !cancelled); }
      catch { if (!cancelled) setError('Αποτυχία φόρτωσης δεδομένων.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [refreshData]);

  // #13 — Auto-refresh interval
  useEffect(() => {
    const refreshIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      refreshData().catch(() => {});
    };

    const interval = setInterval(refreshIfVisible, AUTO_REFRESH_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshIfVisible();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshData]);

  // #2 — URL deep-linking: read on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedViz = params.get('viz');
    if (requestedViz && VIZ_OPTIONS.some((option) => option.id === requestedViz)) setSelectedViz(requestedViz);
    setDataSource(normaliseDataSourceId(params.get(DATA_SOURCE_PARAM)));
    setWeekFrom(getNumericParam(params, 'from'));
    setWeekTo(getNumericParam(params, 'to'));
    setHighlightedWeek(getNumericParam(params, 'week'));
    setCmpWeekA(getNumericParam(params, 'cmpA'));
    setCmpWeekB(getNumericParam(params, 'cmpB'));
    setUrlStateInitialized(true);
  }, []);

  // #2 — URL deep-linking: write on state change
  useEffect(() => {
    if (!urlStateInitialized) return;
    const params = new URLSearchParams();
    if (selectedViz !== 'budget') params.set('viz', selectedViz);
    if (dataSource !== DEFAULT_DATA_SOURCE) params.set(DATA_SOURCE_PARAM, dataSource);
    if (weekFrom != null) params.set('from', String(weekFrom));
    if (weekTo != null) params.set('to', String(weekTo));
    if (highlightedWeek != null) params.set('week', String(highlightedWeek));
    if (cmpWeekA != null) params.set('cmpA', String(cmpWeekA));
    if (cmpWeekB != null) params.set('cmpB', String(cmpWeekB));
    if (embedded) { params.set(EMBED_PARAM, '1'); params.set('theme', isDarkMode ? 'dark' : 'light'); }
    const queryString = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${queryString ? `?${queryString}` : ''}`);
  }, [selectedViz, dataSource, weekFrom, weekTo, highlightedWeek, cmpWeekA, cmpWeekB, embedded, urlStateInitialized, isDarkMode]);

  useEffect(() => {
    if (!shareFeedback) return undefined;
    const timeout = setTimeout(() => setShareFeedback(''), 2400);
    return () => clearTimeout(timeout);
  }, [shareFeedback]);

  const handleRetry = useCallback(() => { clearCache(dataSource); setError(null); setLoading(true); refreshData().catch(() => setError('Αποτυχία.')).finally(() => setLoading(false)); }, [dataSource, refreshData]);
  const handleChartWeekClick = useCallback((wn) => startTransition(() => setHighlightedWeek((p) => p === wn ? null : wn)), []);
  const updateDataSource = useCallback((value) => startTransition(() => {
    setDataSource(normaliseDataSourceId(value));
    setWeekFrom(null);
    setWeekTo(null);
    setHighlightedWeek(null);
    setCmpWeekA(null);
    setCmpWeekB(null);
    setTablePage(0);
  }), []);
  const updateWeekFrom = useCallback((value) => startTransition(() => { setWeekFrom(value); setTablePage(0); }), []);
  const updateWeekTo = useCallback((value) => startTransition(() => { setWeekTo(value); setTablePage(0); }), []);
  const resetWeekRange = useCallback(() => startTransition(() => { setWeekFrom(null); setWeekTo(null); setTablePage(0); }), []);
  const clearHighlightedWeek = useCallback(() => startTransition(() => setHighlightedWeek(null)), []);
  const resetAllFilters = useCallback(() => startTransition(() => { setWeekFrom(null); setWeekTo(null); setHighlightedWeek(null); setTablePage(0); }), []);
  const updateCompareWeekA = useCallback((value) => startTransition(() => setCmpWeekA(value)), []);
  const updateCompareWeekB = useCallback((value) => startTransition(() => setCmpWeekB(value)), []);

  // #8 — Scroll to chart on tab change
  const changeViz = useCallback((id) => {
    startTransition(() => {
      setSelectedViz(id);
      setTablePage(0);
    });
    if (!embedded) setTimeout(() => chartRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }), 100);
  }, [embedded, reduceMotion]);

  // #10 — Swipe gestures
  const onTouchStart = useCallback((e) => { touchStartX.current = e.target.closest?.('.data-table-wrap, select, button, input') ? null : e.touches[0].clientX; }, []);
  const onTouchEnd = useCallback((e) => {
    if (e.target.closest?.('.data-table-wrap')) { touchStartX.current = null; return; }
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    const idx = VIZ_OPTIONS.findIndex((v) => v.id === selectedViz);
    if (dx < 0 && idx < VIZ_OPTIONS.length - 1) changeViz(VIZ_OPTIONS[idx + 1].id);
    if (dx > 0 && idx > 0) changeViz(VIZ_OPTIONS[idx - 1].id);
  }, [selectedViz, changeViz]);

  // Table sorting
  const handleSort = useCallback((col) => { startTransition(() => { setSortDir(sortCol === col && sortDir === 'asc' ? 'desc' : 'asc'); setSortCol(col); setTablePage(0); }); }, [sortCol, sortDir]);
  const sortedTable = useMemo(() => { const d = highlightedWeek != null ? filteredData.filter((b) => b.week === highlightedWeek) : [...filteredData]; d.sort((a, b) => { const va = a[sortCol], vb = b[sortCol]; if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va; return sortDir === 'asc' ? String(va ?? '').localeCompare(String(vb ?? '')) : String(vb ?? '').localeCompare(String(va ?? '')); }); return d; }, [filteredData, highlightedWeek, sortCol, sortDir]);
  const paged = useMemo(() => sortedTable.slice(tablePage * ROWS_PP, (tablePage + 1) * ROWS_PP), [sortedTable, tablePage]);
  const totalPages = Math.ceil(sortedTable.length / ROWS_PP);

  // Pie
  const onPieEnter = useCallback((_, i) => setActiveIndex(i), []);
  const renderActiveShape = ({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent }) => (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 3} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <text x={cx} y={cy - 10} textAnchor="middle" fill={C.labelColor} fontSize={24}>{(percent * 100).toFixed(1)}%</text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill={C.detailColor} fontSize={12}>{payload.name} · {payload.value}</text>
    </g>
  );

  // Last updated
  const lastUpdated = useMemo(() => { if (!lastFetched) return null; const m = Math.floor((Date.now() - lastFetched) / 60000); if (m < 1) return 'μόλις τώρα'; return `πριν ${m} λεπτά`; }, [lastFetched]);
  const shareContext = useMemo(() => ({ selectedViz, dataSource, weekFrom, weekTo, highlightedWeek, cmpWeekA, cmpWeekB, isDarkMode }), [selectedViz, dataSource, weekFrom, weekTo, highlightedWeek, cmpWeekA, cmpWeekB, isDarkMode]);
  const fullAppUrl = useMemo(() => buildShareUrl({ ...shareContext, embedded: false }), [shareContext]);
  const embedUrl = useMemo(() => buildShareUrl({ ...shareContext, embedded: true }), [shareContext]);
  const embedSnippet = useMemo(() => buildEmbedSnippet(embedUrl), [embedUrl]);

  const handleCopyLink = useCallback(async () => {
    const copied = await copyText(fullAppUrl);
    setShareFeedback(copied ? 'Το link αντιγράφηκε.' : 'Δεν ήταν δυνατή η αντιγραφή του link.');
  }, [fullAppUrl]);

  const handleCopyEmbed = useCallback(async () => {
    const copied = await copyText(embedSnippet);
    setShareFeedback(copied ? 'Το iframe code αντιγράφηκε.' : 'Δεν ήταν δυνατή η αντιγραφή του iframe code.');
  }, [embedSnippet]);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'BetCast Stats', url: fullAppUrl });
        setShareFeedback('Το link κοινοποιήθηκε.');
        return;
      }
      const copied = await copyText(fullAppUrl);
      setShareFeedback(copied ? 'Το link αντιγράφηκε.' : 'Δεν ήταν δυνατή η κοινοποίηση του link.');
    } catch {
      setShareFeedback('Δεν ήταν δυνατή η κοινοποίηση του link.');
    }
  }, [fullAppUrl]);

  useEffect(() => {
    if (!embedded || window.parent === window || !mainContentRef.current) return undefined;

    const postHeight = () => {
      const height = Math.ceil(mainContentRef.current?.getBoundingClientRect().height ?? 0);
      if (height > 0 && height !== lastPostedHeightRef.current) {
        lastPostedHeightRef.current = height;
        window.parent.postMessage({ type: EMBED_RESIZE_EVENT, height }, '*');
      }
    };

    const postHeightSoon = () => window.requestAnimationFrame(postHeight);
    postHeightSoon();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(postHeightSoon);
    observer.observe(mainContentRef.current);
    return () => observer.disconnect();
  }, [embedded, loading, error, selectedViz, dataSource, tablePage, weekFrom, weekTo, highlightedWeek, cmpWeekA, cmpWeekB, hasData]);

  // =========================================================================
  // Chart renderers
  // =========================================================================
  const R_budget = () => (<div className="card mb-section"><h3 className="card-chart-title">Εξέλιξη Budget</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={budgetData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><defs><linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.budgetLine} stopOpacity={0.8} /><stop offset="95%" stopColor={C.budgetLine} stopOpacity={0.05} /></linearGradient></defs><XAxis minTickGap={26} tickLine={false} dataKey="id" interval="preserveStartEnd" /><YAxis width={56} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} /><CartesianGrid strokeDasharray="2 4" vertical={false} /><Tooltip wrapperStyle={{ maxWidth: 'calc(100vw - 56px)' }} content={<BudgetTT />} /><Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /><Area type="monotone" dataKey="value" name="Budget" stroke={C.budgetLine} strokeWidth={2} fillOpacity={0.07} fill={C.budgetLine} isAnimationActive={!reduceMotion} animationDuration={800} /><Line isAnimationActive={!reduceMotion} type="monotone" dataKey="rollingAvg" name="Μ.Ο. 5 στοιχημάτων" stroke={C.rolling} strokeWidth={2} strokeDasharray="4 2" dot={false} connectNulls={false} /><Line isAnimationActive={!reduceMotion} dataKey={() => 100} name="Αρχικό ποσό" stroke={C.darkGray} strokeDasharray="5 5" dot={false} />{milestones.high && <ReferenceDot x={milestones.high.id} y={milestones.high.value} r={5} fill={C.milestone} stroke="none" />}{milestones.low && <ReferenceDot x={milestones.low.id} y={milestones.low.value} r={5} fill={C.lose} stroke="none" />}</ComposedChart></ResponsiveContainer></div></div>);

  const R_weeklyProfit = () => (<div className="card mb-section"><h3 className="card-chart-title">Κέρδη/Ζημίες ανά Εβδομάδα</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={wkProfitData} onClick={(e) => e?.activePayload?.[0]?.payload?.weekNum && handleChartWeekClick(e.activePayload[0].payload.weekNum)}><CartesianGrid strokeDasharray="2 4" vertical={false} /><XAxis minTickGap={26} tickLine={false} dataKey="week" /><YAxis width={56} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} /><Tooltip wrapperStyle={{ maxWidth: 'calc(100vw - 56px)' }} content={<WeeklyTT />} /><Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /><Bar dataKey="profit" name="Κέρδος/Ζημία" radius={[1, 1, 0, 0]} isAnimationActive={!reduceMotion}>{wkProfitData.map((e, i) => <Cell key={i} fill={e.profit >= 0 ? C.profit : C.loss} fillOpacity={highlightedWeek != null && highlightedWeek !== e.weekNum ? 0.3 : 0.8} />)}</Bar><Line isAnimationActive={!reduceMotion} type="monotone" dataKey="budget" name="Budget" stroke={C.referenceLine} dot={{ r: 3 }} strokeWidth={2} /></ComposedChart></ResponsiveContainer></div></div>);

  const R_winLoss = () => (<div className="card mb-section"><div className="card-chart-title">Νίκες/Ήττες</div><div className="streaks-row" style={{ justifyContent: 'center', marginBottom: '0.5rem' }}><span className="streak-badge streak-badge--win">Μ.Ο. Νικών: {avgOdds.avgWinOdds}</span><span className="streak-badge streak-badge--loss">Μ.Ο. Ηττών: {avgOdds.avgLossOdds}</span></div><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie activeIndex={activeIndex} activeShape={renderActiveShape} data={wlData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" onMouseEnter={onPieEnter} isAnimationActive={!reduceMotion}>{wlData.map((_, i) => <Cell key={i} fill={i === 0 ? C.win : C.lose} />)}</Pie><Tooltip wrapperStyle={{ maxWidth: 'calc(100vw - 56px)' }} formatter={(value) => [value, 'Στοιχήματα']} /><Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /></PieChart></ResponsiveContainer></div></div>);

  const R_oddsDist = () => (<div className="card mb-section"><h3 className="card-chart-title">Κατανομή Αποδόσεων</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={oddsDist} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}><CartesianGrid strokeDasharray="2 4" vertical={false} /><XAxis minTickGap={26} tickLine={false} dataKey="range" angle={-45} textAnchor="end" height={70} /><YAxis width={48} tickLine={false} axisLine={false} label={{ value: 'Στοιχήματα', angle: -90, position: 'insideLeft' }} /><Tooltip wrapperStyle={{ maxWidth: 'calc(100vw - 56px)' }} formatter={(value, name) => [value, name === 'Σύνολο' ? 'Σύνολο' : 'Νίκες']} /><Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /><Bar dataKey="count" name="Σύνολο" fill={C.neutral} fillOpacity={0.6} radius={[1, 1, 0, 0]} isAnimationActive={!reduceMotion} /><Bar dataKey="winCount" name="Νίκες" fill={C.win} radius={[1, 1, 0, 0]} isAnimationActive={!reduceMotion} /></BarChart></ResponsiveContainer></div></div>);

  const R_profitByOdds = () => (<div className="card mb-section"><h3 className="card-chart-title">Κέρδος/Ζημία ανά απόδοση</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={profitByOdds}><CartesianGrid strokeDasharray="2 4" vertical={false} /><XAxis minTickGap={26} tickLine={false} dataKey="range" /><YAxis width={56} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} /><Tooltip wrapperStyle={{ maxWidth: 'calc(100vw - 56px)' }} formatter={formatChartMetric} /><Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /><Bar dataKey="profit" name="Κέρδος/Ζημία" radius={[1, 1, 0, 0]} isAnimationActive={!reduceMotion}>{profitByOdds.map((e, i) => <Cell key={i} fill={e.profit >= 0 ? C.profit : C.loss} />)}</Bar></BarChart></ResponsiveContainer></div></div>);

  const R_ev = () => (<div className="card mb-section"><h3 className="card-chart-title">Αναμενόμενη αξία</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={evData}><CartesianGrid strokeDasharray="2 4" vertical={false} /><XAxis minTickGap={26} tickLine={false} dataKey="range" /><YAxis width={48} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} /><Tooltip wrapperStyle={{ maxWidth: 'calc(100vw - 56px)' }} formatter={(v) => [`${v}%`]} /><Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /><Bar dataKey="impliedProb" name="Implied %" fill={C.neutral} fillOpacity={0.5} radius={[1, 1, 0, 0]} isAnimationActive={!reduceMotion} /><Bar dataKey="actualWinRate" name="Actual %" fill={C.win} radius={[1, 1, 0, 0]} isAnimationActive={!reduceMotion} /></BarChart></ResponsiveContainer></div><div className="streaks-row" style={{ marginTop: '0.5rem' }}>{evData.map((d) => <span key={d.range} className={`streak-badge ${d.edge >= 0 ? 'streak-badge--win' : 'streak-badge--loss'}`}>{d.range}: {d.edge >= 0 ? '+' : ''}{d.edge}%</span>)}</div></div>);

  // #4 — Kelly
  const R_kelly = () => (<div className="card mb-section"><h3 className="card-chart-title">Kelly Criterion — Προτεινόμενο Ποντάρισμα</h3>{kellyData.length === 0 ? <div className="empty-state"><p>Χρειάζονται τουλάχιστον 5 στοιχήματα ανά εύρος αποδόσεων.</p></div> : (<div className="data-table-wrap" tabIndex={0} role="region" aria-label="Πίνακας με οριζόντια κύλιση"><table className="data-table"><thead><tr><th>Αποδόσεις</th><th>Μ.Ο.</th><th>Ποσοστό νικών</th><th>Kelly %</th><th>Ποντάρισμα ({lastBudget.toFixed(0)}€)</th><th>Δείγμα</th></tr></thead><tbody>{kellyData.map((d) => (<tr key={d.range}><td>{d.range}</td><td>{d.avgOdds}</td><td className={d.winProb >= 50 ? 'cell-win' : 'cell-lose'}>{d.winProb}%</td><td>{d.kellyPct}%</td><td><strong>{d.suggestedStake}€</strong></td><td>{d.sampleSize}</td></tr>))}</tbody></table></div>)}<div className="streaks-row" style={{ marginTop: '0.5rem' }}><span className="streak-badge">Τυπική απόκλιση Κέρδος/Ζημία: {varianceStats.stdDev}€</span><span className="streak-badge">Μ.Ο. Κέρδος/Ζημία: {varianceStats.mean}€</span></div></div>);

  // #7 — Bet size analysis
  const R_betSize = () => (<div className="card mb-section"><h3 className="card-chart-title">Ανάλυση Ποντάρισματος</h3>{betSizeData.length <= 1 ? <div className="empty-state"><p>Χρειάζονται διαφορετικά ποσά ποντάρισματος για ανάλυση.</p><p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Σταθερό ποντάρισμα: {betSizeData[0]?.stake ?? 10}€ | Μ.Ο. Κέρδος/Ζημία: {betSizeData[0]?.avgPL ?? 0}€ | Ποσοστό νικών: {betSizeData[0]?.winRate ?? 0}%</p></div> : (<div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={betSizeData}><CartesianGrid strokeDasharray="2 4" vertical={false} /><XAxis minTickGap={26} tickLine={false} dataKey="stake" height={52} label={{ value: 'Ποντάρισμα (€)', position: 'insideBottom', offset: 0 }} /><YAxis width={56} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} /><Tooltip wrapperStyle={{ maxWidth: 'calc(100vw - 56px)' }} formatter={formatChartMetric} /><Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /><Bar dataKey="avgPL" name="Μ.Ο. Κέρδος/Ζημία" radius={[1, 1, 0, 0]} isAnimationActive={!reduceMotion}>{betSizeData.map((e, i) => <Cell key={i} fill={e.avgPL >= 0 ? C.profit : C.loss} />)}</Bar></BarChart></ResponsiveContainer></div>)}</div>);

  const R_winRate = () => (<div className="card mb-section"><h3 className="card-chart-title">Ποσοστό νικών ανά εβδομάδα</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={winRate} onClick={(e) => e?.activePayload?.[0]?.payload?.weekNum && handleChartWeekClick(e.activePayload[0].payload.weekNum)}><CartesianGrid strokeDasharray="2 4" vertical={false} /><XAxis minTickGap={26} tickLine={false} dataKey="week" /><YAxis width={48} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} /><Tooltip wrapperStyle={{ maxWidth: 'calc(100vw - 56px)' }} formatter={(v) => [`${v}%`]} /><Bar dataKey="winRate" name="Ποσοστό νικών" radius={[1, 1, 0, 0]} isAnimationActive={!reduceMotion}>{winRate.map((e, i) => <Cell key={i} fill={e.winRate >= 50 ? C.win : C.lose} fillOpacity={highlightedWeek != null && highlightedWeek !== e.weekNum ? 0.3 : 0.75} />)}</Bar><Line isAnimationActive={!reduceMotion} dataKey={() => 50} stroke={C.referenceLine} strokeDasharray="3 3" dot={false} /></BarChart></ResponsiveContainer></div></div>);

  const R_weeklyROI = () => (<div className="card mb-section"><h3 className="card-chart-title">Εβδομαδιαίο ROI</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={roiData} onClick={(e) => e?.activePayload?.[0]?.payload?.weekNum && handleChartWeekClick(e.activePayload[0].payload.weekNum)}><CartesianGrid strokeDasharray="2 4" vertical={false} /><XAxis minTickGap={26} tickLine={false} dataKey="week" /><YAxis width={48} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} /><Tooltip wrapperStyle={{ maxWidth: 'calc(100vw - 56px)' }} formatter={(v) => [`${v}%`]} /><Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /><Bar dataKey="roi" name="ROI%" radius={[1, 1, 0, 0]} isAnimationActive={!reduceMotion}>{roiData.map((e, i) => <Cell key={i} fill={e.roi >= 0 ? C.profit : C.loss} fillOpacity={highlightedWeek != null && highlightedWeek !== e.weekNum ? 0.3 : 0.8} />)}</Bar><Line isAnimationActive={!reduceMotion} dataKey={() => 0} stroke={C.referenceLine} strokeDasharray="3 3" dot={false} /></BarChart></ResponsiveContainer></div></div>);

  const R_cumROI = () => (<div className="card mb-section"><h3 className="card-chart-title">Συνολικό ROI</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={cumRoi}><defs><linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.budgetLine} stopOpacity={0.8} /><stop offset="95%" stopColor={C.budgetLine} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="2 4" vertical={false} /><XAxis minTickGap={26} tickLine={false} dataKey="week" /><YAxis width={48} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} /><Tooltip wrapperStyle={{ maxWidth: 'calc(100vw - 56px)' }} formatter={(v) => [`${v}%`]} /><Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /><Area type="monotone" dataKey="roi" name="ROI%" stroke={C.budgetLine} strokeWidth={2} fillOpacity={0.07} fill={C.budgetLine} isAnimationActive={!reduceMotion} /><Line isAnimationActive={!reduceMotion} type="monotone" dataKey="roi" stroke={C.budgetLine} legendType="none" dot={{ r: 3 }} /><Line isAnimationActive={!reduceMotion} dataKey={() => 0} stroke={C.darkGray} legendType="none" strokeDasharray="5 5" dot={false} /></ComposedChart></ResponsiveContainer></div></div>);

  // #11 — Compare weeks
  const R_compare = () => {
    const wA = filteredSummary.find((w) => w.week === cmpWeekA);
    const wB = filteredSummary.find((w) => w.week === cmpWeekB);
    const delta = (a, b) => { const d = a - b; return d >= 0 ? `+${d.toFixed(1)}` : d.toFixed(1); };
    return (<div className="card mb-section"><h3 className="card-chart-title">Σύγκριση Εβδομάδων</h3><div className="filter-bar" style={{ justifyContent: 'center', marginBottom: '1rem' }}><select aria-label="Εβδομάδα A" value={cmpWeekA ?? ''} onChange={(e) => updateCompareWeekA(e.target.value ? Number(e.target.value) : null)}><option value="">Εβδ. A</option>{allWeeks.map((w) => <option key={w} value={w}>{w}</option>)}</select><span>vs</span><select aria-label="Εβδομάδα B" value={cmpWeekB ?? ''} onChange={(e) => updateCompareWeekB(e.target.value ? Number(e.target.value) : null)}><option value="">Εβδ. B</option>{allWeeks.map((w) => <option key={w} value={w}>{w}</option>)}</select></div>
      {wA && wB ? (<div className="compare-grid"><div className="compare-col"><h4>Εβδ. {wA.week}</h4><p>Κέρδος/Ζημία: <strong className={wA.totalProfitLoss >= 0 ? 'tt-win' : 'tt-lose'}>{wA.totalProfitLoss >= 0 ? '+' : ''}{wA.totalProfitLoss}€</strong></p><p>Ποσοστό νικών: {(wA.winRate * 100).toFixed(0)}%</p><p>ROI: {wA.weeklyROI}%</p><p>{wA.wins}W / {wA.losses}L</p></div><div className="compare-delta"><p>Δ Κέρδος/Ζημία: {delta(wA.totalProfitLoss, wB.totalProfitLoss)}€</p><p>Δ Ποσοστό νικών: {delta(wA.winRate * 100, wB.winRate * 100)}%</p><p>Δ ROI: {delta(wA.weeklyROI, wB.weeklyROI)}%</p></div><div className="compare-col"><h4>Εβδ. {wB.week}</h4><p>Κέρδος/Ζημία: <strong className={wB.totalProfitLoss >= 0 ? 'tt-win' : 'tt-lose'}>{wB.totalProfitLoss >= 0 ? '+' : ''}{wB.totalProfitLoss}€</strong></p><p>Ποσοστό νικών: {(wB.winRate * 100).toFixed(0)}%</p><p>ROI: {wB.weeklyROI}%</p><p>{wB.wins}W / {wB.losses}L</p></div></div>) : <div className="empty-state"><p>Επιλέξτε δύο εβδομάδες για σύγκριση.</p></div>}
    </div>);
  };

  // Data table — now includes betType column + week filter
  const R_table = () => (
    <div className="card mb-section">
      <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
        <h3 className="card-chart-title" style={{ marginBottom: 0 }}>Πίνακας</h3>
        <button className="export-btn" onClick={() => exportCSV(sortedTable, `betcast_${dataSource}_export.csv`)}><UiIcon name="download" /> CSV</button>
      </div>
      <div className="filter-bar table-filter-bar">
        <label htmlFor="table-week-filter">Φίλτρο εβδομάδας</label>
        <select
          id="table-week-filter"
          value={highlightedWeek ?? ''}
          onChange={(e) => startTransition(() => {
            setHighlightedWeek(e.target.value ? Number(e.target.value) : null);
            setTablePage(0);
          })}
        >
          <option value="">Όλες οι εβδομάδες</option>
          {allWeeks.map((w) => <option key={w} value={w}>Εβδ. {w}</option>)}
        </select>
        {highlightedWeek != null && (
          <button className="filter-reset-btn" onClick={() => startTransition(() => { setHighlightedWeek(null); setTablePage(0); })} aria-label="Καθαρισμός επιλογής">×</button>
        )}
        <span className="table-filter-count">{sortedTable.length} στοιχήματα</span>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {TABLE_COLS.map((c) => (
                <th key={c.key} style={{ textAlign: c.align }} onClick={() => handleSort(c.key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(c.key); } }} tabIndex={0} aria-sort={sortCol === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  {c.label}
                  <span className={`sort-arrow ${sortCol === c.key ? 'sort-arrow--active' : ''}`}>{sortCol === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={10} className="empty-state">Κανένα στοίχημα</td></tr>
            ) : paged.map((b) => (
              <tr key={b.id} className={highlightedWeek != null && b.week === highlightedWeek ? 'row-highlight' : ''}>
                <td style={{ textAlign: 'center' }}>{b.id}</td>
                <td style={{ textAlign: 'center' }}>{b.week}</td>
                <td style={{ textAlign: 'center' }}>{b.betNumber}</td>
                <td style={{ textAlign: 'left' }}>{b.betType || '—'}</td>
                <td className="bookmaker-cell"><BookmakerLogo company={b.company} /></td>
                <td style={{ textAlign: 'right' }}>{safeNumber(b.odds).toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{safeNumber(b.stake).toFixed(2)}€</td>
                <td style={{ textAlign: 'center' }} className={b.result === 'Win' ? 'cell-win' : 'cell-lose'}>{b.result === 'Win' ? '✓' : '✗'}</td>
                <td style={{ textAlign: 'right' }} className={safeNumber(b.profitLoss) >= 0 ? 'cell-win' : 'cell-lose'}>{safeNumber(b.profitLoss) >= 0 ? '+' : ''}{safeNumber(b.profitLoss).toFixed(2)}€</td>
                <td style={{ textAlign: 'right' }}>{safeNumber(b.cumulativeBudget).toFixed(2)}€</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="table-pagination">
          <button aria-label="Προηγούμενη σελίδα" disabled={tablePage === 0} onClick={() => setTablePage((p) => p - 1)}>←</button>
          <span>{tablePage + 1}/{totalPages}</span>
          <button aria-label="Επόμενη σελίδα" disabled={tablePage >= totalPages - 1} onClick={() => setTablePage((p) => p + 1)}>→</button>
        </div>
      )}
    </div>
  );

  const RENDERERS = { budget: R_budget, weeklyProfit: R_weeklyProfit, winLossRatio: R_winLoss, oddsDistribution: R_oddsDist, profitByOdds: R_profitByOdds, evTracking: R_ev, kelly: R_kelly, betSize: R_betSize, winRateByWeek: R_winRate, weeklyROI: R_weeklyROI, cumulativeROI: R_cumROI, compareWeeks: R_compare, dataTable: R_table };

  const chartNotes = {
    budget: 'Ποσά σε € · Οριζόντιος άξονας: σειρά στοιχημάτων · Μ.Ο. 5 στοιχημάτων.',
    weeklyProfit: 'Κέρδος/ζημία και Budget σε € ανά εβδομάδα. Πατήστε μία εβδομάδα για επιλογή.',
    winLossRatio: 'Πλήθος και ποσοστό ολοκληρωμένων στοιχημάτων ανά αποτέλεσμα.',
    oddsDistribution: 'Πλήθος στοιχημάτων ανά εύρος απόδοσης.',
    profitByOdds: 'Κέρδος/ζημία σε € ανά εύρος απόδοσης.',
    evTracking: 'Πιθανότητα βάσει απόδοσης και πραγματικό ποσοστό νικών (%).',
    kelly: 'Ποσοστό Kelly και προτεινόμενο ποντάρισμα σε € ανά εύρος απόδοσης.',
    betSize: 'Μέσο κέρδος/ζημία σε € ανά ποσό πονταρίσματος.',
    winRateByWeek: 'Ποσοστό νικών (%) ανά εβδομάδα.',
    weeklyROI: 'Απόδοση πονταρίσματος (%) ανά εβδομάδα.',
    cumulativeROI: 'Συνολική απόδοση πονταρίσματος (%) έως κάθε εβδομάδα.',
    compareWeeks: 'Διαφορά Α − Β · Κέρδος/ζημία σε € · Διαφορά ποσοστών σε ποσοστιαίες μονάδες.',
    dataTable: 'Ποσά σε € · Επιλέξτε επικεφαλίδα για ταξινόμηση. Ο πίνακας κυλά οριζόντια.',
  };
  const selectedOption = VIZ_OPTIONS.find((option) => option.id === selectedViz);
  const groups = [
    { name: 'Εξέλιξη & απόδοση', ids: ['budget', 'weeklyProfit', 'weeklyROI', 'cumulativeROI'] },
    { name: 'Στοιχήματα & πιθανότητες', ids: ['winLossRatio', 'oddsDistribution', 'profitByOdds', 'evTracking', 'kelly', 'betSize', 'winRateByWeek'] },
    { name: 'Σύγκριση & στοιχεία', ids: ['compareWeeks', 'dataTable'] },
  ];

  if (loading) return (
    <main className={`main-content${embedded ? ' main-content--embedded' : ''}`} aria-busy="true">
      <p className="section-label">01 / BETCAST</p><h1 className="page-title">BETCAST<span className="brand-dot">.</span></h1>
      <p role="status" className="state-copy">Φόρτωση στοιχημάτων…</p>
      <div className="skeleton skeleton-stat" /><div className="skeleton skeleton-chart" />
    </main>
  );

  return (
    <main id="main" ref={mainContentRef} className={`main-content${embedded ? ' main-content--embedded' : ''}`}>
      <div className="page-toolbar">
        <div className="page-toolbar__heading">
          <p className="section-label">01 / BETCAST <span>F1 STORIES / ΣΤΟΙΧΗΜΑΤΙΚΗ ΑΝΑΛΥΣΗ</span></p>
          <h1 className="page-title">BETCAST<span className="brand-dot">.</span></h1>
          <p className="page-intro">Στοιχηματική ανάλυση. Κάθε επιλογή, κάθε εβδομάδα.</p>
        </div>
      </div>

      <section className="scope-bar" aria-label="Κοινά φίλτρα ανάλυσης">
        <label className="field"><span>Σεζόν</span><select value={dataSource} onChange={(e) => updateDataSource(e.target.value)}>
          {DATA_SOURCE_OPTIONS.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
        </select></label>
        {!embedded && <>
          <label className="field"><span>Από εβδομάδα</span><select value={weekFrom ?? ''} onChange={(e) => updateWeekFrom(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Όλες</option>{allWeeks.map((w) => <option key={w} value={w}>{w}</option>)}
          </select></label>
          <label className="field"><span>Έως εβδομάδα</span><select value={weekTo ?? ''} onChange={(e) => updateWeekTo(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Όλες</option>{allWeeks.map((w) => <option key={w} value={w}>{w}</option>)}
          </select></label>
        </>}
        <div className="scope-context">
          <span>{weekFrom == null && weekTo == null ? 'Όλες οι εβδομάδες' : `Εβδ. ${weekFrom ?? 1}–${weekTo ?? allWeeks[allWeeks.length - 1] ?? ''}`}</span>
          {(weekFrom != null || weekTo != null) && !embedded && <button className="text-action" onClick={resetWeekRange}>Καθαρισμός</button>}
          <small>Κοινή περίοδος για όλα τα στοιχεία</small>
        </div>
      </section>

      {error && <div className="error-banner" role="alert"><strong>Τα δεδομένα δεν φορτώθηκαν.</strong><p>{error}</p><button className="export-btn" onClick={handleRetry}>Επανάληψη</button></div>}

      <section className="metrics" aria-label="Σύνοψη επιλεγμένης περιόδου">
        <dl className="primary-metrics">
          <div><dt>Budget <span>Διαθέσιμο ποσό</span></dt><dd>{lastBudget.toFixed(2)}<span>€</span></dd></div>
          <div><dt>ROI <span>Απόδοση πονταρίσματος</span></dt><dd className={overallROI < 0 ? 'tt-lose' : 'tt-win'}>{overallROI.toFixed(1)}<span>%</span></dd></div>
        </dl>
        <dl className="secondary-metrics">
          <div><dt>Στοιχήματα</dt><dd>{totalBets}</dd></div>
          <div><dt>Νίκες</dt><dd>{wins}</dd></div>
          <div><dt>Ποσοστό νικών</dt><dd>{winPct}%</dd></div>
        </dl>
      </section>

      <section ref={chartRef} className="analysis-section" aria-labelledby="analysis-heading">
        <div className="analysis-heading">
          <h2 id="analysis-heading" className="section-label">02 / ΑΝΑΛΥΣΗ</h2>
          <label className="chart-selector field" htmlFor="chart-select"><span>Προβολή</span>
            <select id="chart-select" value={selectedViz} onChange={(e) => changeViz(e.target.value)}>
              {groups.map((group) => <optgroup key={group.name} label={group.name}>
                {group.ids.map((id) => { const item = VIZ_OPTIONS.find((option) => option.id === id); return <option key={id} value={id}>{item.name}</option>; })}
              </optgroup>)}
            </select>
          </label>
        </div>
        {highlightedWeek != null && <p className="week-highlight-notice">Επιλεγμένη εβδομάδα: {highlightedWeek} <button className="text-action" onClick={clearHighlightedWeek}>Καθαρισμός</button></p>}
        <div className={fullscreen ? 'fullscreen-overlay' : 'chart-panel'} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} role="region" aria-label={selectedOption?.name}>
          {fullscreen && <button className="fullscreen-close" onClick={() => setFullscreen(false)}>Κλείσιμο πλήρους οθόνης</button>}
          {!hasData ? <div className="empty-state" role="status"><h3>Δεν βρέθηκαν στοιχήματα.</h3><p>Επιλέξτε άλλη περίοδο για να δείτε την ανάλυση.</p><button className="export-btn" onClick={resetAllFilters}>Όλες οι εβδομάδες</button></div> : RENDERERS[selectedViz]?.()}
        </div>
        {hasData && <p className="chart-caption">{chartNotes[selectedViz]}</p>}
        <div className="analysis-meta">
          <p className="last-updated">{lastUpdated ? `Τελευταία ενημέρωση: ${lastUpdated}` : 'Αναμονή ενημέρωσης δεδομένων'}</p>
          {!embedded ? <div className="toolbar-share-group" aria-label="Κοινοποίηση ανάλυσης">
            <button className="text-action" onClick={handleShare}>Κοινοποίηση</button>
            <button className="text-action" onClick={handleCopyLink}>Link</button>
            <button className="text-action" onClick={handleCopyEmbed}>Embed</button>
          </div> : <a className="text-action" href={fullAppUrl} target="_blank" rel="noopener noreferrer">Άνοιγμα BetCast ↗</a>}
        </div>
        {shareFeedback && <p className="share-feedback" role="status">{shareFeedback}</p>}
      </section>

      <details className="stats-details">
        <summary><span className="section-label">03 / ΣΤΟΙΧΕΙΑ</span><span>Σερί & διακύμανση</span></summary>
        <dl className="detail-metrics">
          <div><dt>Τρέχον σερί</dt><dd>{streaks.currentStreak.count} {streaks.currentStreak.type === 'Win' ? 'νίκες' : 'ήττες'}</dd></div>
          <div><dt>Μεγαλύτερο σερί νικών</dt><dd>{streaks.longestWin}</dd></div>
          <div><dt>Μεγαλύτερο σερί ηττών</dt><dd>{streaks.longestLoss}</dd></div>
          {bestWorst.best && <div><dt>Καλύτερη εβδομάδα · {bestWorst.best.week}</dt><dd className="tt-win">{bestWorst.best.totalProfitLoss.toFixed(2)}€</dd></div>}
          {bestWorst.worst && <div><dt>Χειρότερη εβδομάδα · {bestWorst.worst.week}</dt><dd className="tt-lose">{bestWorst.worst.totalProfitLoss.toFixed(2)}€</dd></div>}
          <div><dt>Τυπική απόκλιση</dt><dd>{varianceStats.stdDev}€</dd></div>
        </dl>
      </details>
    </main>
  );
};

export default BettingVisualizations;
