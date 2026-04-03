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
  calculateKelly, calculateVariance, buildBetSizeAnalysis,
} from '../services/googleSheetService';
import { useTheme } from '../context/ThemeContext';

// Theme
const THEMES = {
  dark: { win: '#4caf50', lose: '#f44336', neutral: '#7986cb', profit: '#4caf50', loss: '#f44336', budgetLine: '#5c6bc0', darkGray: '#9e9e9e', labelColor: '#e0e0e0', detailColor: '#9e9e9e', referenceLine: '#ff7300', rolling: '#ffab40', milestone: '#e040fb' },
  light: { win: '#00695c', lose: '#c62828', neutral: '#5c6bc0', profit: '#00695c', loss: '#c62828', budgetLine: '#3949ab', darkGray: '#455a64', labelColor: '#333333', detailColor: '#999999', referenceLine: '#ff7300', rolling: '#e65100', milestone: '#7b1fa2' },
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

// Chart builders
const buildBudgetData = (d) => d.map((x) => ({ id: x.id, value: safeNumber(x.cumulativeBudget), result: x.result, week: x.week, odds: safeNumber(x.odds), profitLoss: safeNumber(x.profitLoss) }));
const buildWkProfitData = (s) => s.map((w) => ({ week: `Εβδ. ${w.week}`, weekNum: w.week, profit: w.totalProfitLoss, budget: w.cumulativeBudget, dateRange: w.dateRange }));
const buildWLData = (d) => [{ name: 'Νίκες', value: d.filter((b) => b.result === 'Win').length }, { name: 'Ήττες', value: d.filter((b) => b.result === 'Lose').length }];
const buildOddsDist = (d) => { const gs = [...Array.from({ length: 8 }, (_, i) => { const m = 1.5 + i * 0.25; return { min: m, max: m + 0.25, label: `${m.toFixed(2)}-${(m + 0.25).toFixed(2)}` }; }), { min: 3.5, max: 5, label: '3.50-5.00' }, { min: 5, max: Infinity, label: '5.00+' }]; return gs.map((g) => { const ir = d.filter((b) => { const o = safeNumber(b.odds); return o >= g.min && o < g.max; }); return { range: g.label, count: ir.length, winCount: ir.filter((b) => b.result === 'Win').length }; }).filter((x) => x.count > 0); };
const buildRoi = (s) => s.map((w) => ({ week: `Εβδ. ${w.week}`, weekNum: w.week, roi: w.weeklyROI }));
const buildCumRoi = (s) => s.map((w) => ({ week: `Εβδ. ${w.week}`, weekNum: w.week, roi: parseFloat(w.cumulativeROI.toFixed(2)) }));
const buildWinRate = (s) => s.map((w) => ({ week: `Εβδ. ${w.week}`, weekNum: w.week, winRate: parseFloat((w.winRate * 100).toFixed(1)) }));

// Custom tooltips
const BudgetTT = ({ active, payload, label }) => { if (!active || !payload?.length) return null; const d = payload[0]?.payload; return (<div className="custom-tooltip"><p className="custom-tooltip__title">Στοίχημα #{label}</p><p>Budget: <strong>{d?.value?.toFixed(2)}€</strong></p><p>Αποτέλ: <strong className={d?.result === 'Win' ? 'tt-win' : 'tt-lose'}>{d?.result}</strong> | Odds: {d?.odds?.toFixed(2)}</p><p>Κ/Ζ: {d?.profitLoss >= 0 ? '+' : ''}{d?.profitLoss?.toFixed(2)}€</p></div>); };
const WeeklyTT = ({ active, payload }) => { if (!active || !payload?.length) return null; const d = payload[0]?.payload; return (<div className="custom-tooltip"><p className="custom-tooltip__title">{d?.week}</p>{d?.dateRange && <p className="custom-tooltip__sub">{d.dateRange}</p>}{payload.map((p, i) => <p key={i}>{p.name}: <strong>{typeof p.value === 'number' ? `${p.value.toFixed?.(2) ?? p.value}${p.name.includes('%') || p.name.includes('ROI') ? '%' : '€'}` : p.value}</strong></p>)}</div>); };

// CSV export — includes betType column
const exportCSV = (data, fn = 'betcast_export.csv') => { const h = ['#', 'Εβδ', 'Στοίχ', 'Τύπος', 'Εταιρία', 'Odds', 'Stake', 'Result', 'P/L', 'Budget']; const r = data.map((b) => [b.id, b.week, b.betNumber, b.betType || '', b.company || '', safeNumber(b.odds).toFixed(2), safeNumber(b.stake).toFixed(2), b.result, safeNumber(b.profitLoss).toFixed(2), safeNumber(b.cumulativeBudget).toFixed(2)]); const csv = [h.join(','), ...r.map((x) => x.join(','))].join('\n'); const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fn; a.click(); };

// #1 — Screenshot/share
const shareScreenshot = async (ref) => {
  try {
    const html2canvas = window.html2canvas;
    if (typeof html2canvas !== 'function') throw new Error('html2canvas unavailable');
    const canvas = await html2canvas(ref, { backgroundColor: null, scale: 2 });
    canvas.toBlob(async (blob) => {
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'betcast.png', { type: 'image/png' })] })) {
        await navigator.share({ files: [new File([blob], 'betcast.png', { type: 'image/png' })], title: 'BetCast Stats' });
      } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'betcast_stats.png'; a.click();
      }
    }, 'image/png');
  } catch { alert('Screenshot is not available in this build.'); }
};

// Viz options
const VIZ_OPTIONS = [
  { id: 'budget', name: 'Εξέλιξη Ποσού', icon: '📈' },
  { id: 'weeklyProfit', name: 'Εβδομ. Κέρδη', icon: '💰' },
  { id: 'winLossRatio', name: 'Νίκες/Ήττες', icon: '🎯' },
  { id: 'oddsDistribution', name: 'Αποδόσεις', icon: '📊' },
  { id: 'profitByOdds', name: 'Κέρδος/Odds', icon: '💎' },
  { id: 'evTracking', name: 'Exp. Value', icon: '🧮' },
  { id: 'kelly', name: 'Kelly', icon: '🎰' },
  { id: 'betSize', name: 'Ποντάρισμα', icon: '💵' },
  { id: 'winRateByWeek', name: 'Win Rate', icon: '🏆' },
  { id: 'weeklyROI', name: 'Εβδομ. ROI', icon: '💹' },
  { id: 'cumulativeROI', name: 'Συνολ. ROI', icon: '📈' },
  { id: 'compareWeeks', name: 'Σύγκριση', icon: '⚖️' },
  { id: 'dataTable', name: 'Πίνακας', icon: '📋' },
];

const TABLE_COLS = [
  { key: 'id', label: '#', align: 'center' }, { key: 'week', label: 'Εβδ.', align: 'center' },
  { key: 'betNumber', label: 'Στ.', align: 'center' },
  { key: 'betType', label: 'Τύπος Στοιχήματος', align: 'left' },
  { key: 'company', label: 'Εταιρία', align: 'center' },
  { key: 'odds', label: 'Odds', align: 'right' },
  { key: 'stake', label: 'Stake', align: 'right' }, { key: 'result', label: 'Res.', align: 'center' },
  { key: 'profitLoss', label: 'P/L', align: 'right' }, { key: 'cumulativeBudget', label: 'Budget', align: 'right' },
];
const ROWS_PP = 15;
const AUTO_REFRESH_MS = 3 * 60 * 1000; // #13 — 3 min
const EMBED_PARAM = 'embed';
const EMBED_MIN_HEIGHT = 960;
const EMBED_RESIZE_EVENT = 'betcast:resize';
const EMBED_TITLE = 'BetCast F1Stories';

const getNumericParam = (params, key) => {
  const value = params.get(key);
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildShareUrl = ({ selectedViz, weekFrom, weekTo, highlightedWeek, cmpWeekA, cmpWeekB, embedded = false }) => {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams();
  if (selectedViz !== 'budget') params.set('viz', selectedViz);
  if (weekFrom != null) params.set('from', String(weekFrom));
  if (weekTo != null) params.set('to', String(weekTo));
  if (highlightedWeek != null) params.set('week', String(highlightedWeek));
  if (cmpWeekA != null) params.set('cmpA', String(cmpWeekA));
  if (cmpWeekB != null) params.set('cmpB', String(cmpWeekB));
  if (embedded) params.set(EMBED_PARAM, '1');
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
  const tabBarRef = useRef(null);
  const chartRef = useRef(null); // #8 scroll target
  const shareRef = useRef(null); // #1 screenshot target
  const touchStartX = useRef(null); // #10 swipe
  const lastPostedHeightRef = useRef(0);

  const { isDark: isDarkMode } = useTheme();
  const C = isDarkMode ? THEMES.dark : THEMES.light;

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
      setLastFetched(getLastFetchedTimestamp());
    });
  }, []);
  const refreshData = useCallback((shouldApply = () => true) => fetchBettingData((fresh) => {
    if (shouldApply()) processData(fresh);
  }).then((data) => {
    if (shouldApply()) processData(data);
    return data;
  }), [processData]);

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
    setWeekFrom(getNumericParam(params, 'from'));
    setWeekTo(getNumericParam(params, 'to'));
    setHighlightedWeek(getNumericParam(params, 'week'));
    setCmpWeekA(getNumericParam(params, 'cmpA'));
    setCmpWeekB(getNumericParam(params, 'cmpB'));
  }, []);

  // #2 — URL deep-linking: write on state change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedViz !== 'budget') params.set('viz', selectedViz);
    if (weekFrom != null) params.set('from', String(weekFrom));
    if (weekTo != null) params.set('to', String(weekTo));
    if (highlightedWeek != null) params.set('week', String(highlightedWeek));
    if (cmpWeekA != null) params.set('cmpA', String(cmpWeekA));
    if (cmpWeekB != null) params.set('cmpB', String(cmpWeekB));
    if (embedded) params.set(EMBED_PARAM, '1');
    const queryString = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${queryString ? `?${queryString}` : ''}`);
  }, [selectedViz, weekFrom, weekTo, highlightedWeek, cmpWeekA, cmpWeekB, embedded]);

  useEffect(() => {
    if (!shareFeedback) return undefined;
    const timeout = setTimeout(() => setShareFeedback(''), 2400);
    return () => clearTimeout(timeout);
  }, [shareFeedback]);

  const handleRetry = useCallback(() => { clearCache(); setError(null); setLoading(true); refreshData().catch(() => setError('Αποτυχία.')).finally(() => setLoading(false)); }, [refreshData]);
  const handleChartWeekClick = useCallback((wn) => startTransition(() => setHighlightedWeek((p) => p === wn ? null : wn)), []);
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
    if (!embedded) setTimeout(() => chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [embedded]);

  // #10 — Swipe gestures
  const onTouchStart = useCallback((e) => { touchStartX.current = e.touches[0].clientX; }, []);
  const onTouchEnd = useCallback((e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    const idx = VIZ_OPTIONS.findIndex((v) => v.id === selectedViz);
    if (dx < 0 && idx < VIZ_OPTIONS.length - 1) changeViz(VIZ_OPTIONS[idx + 1].id);
    if (dx > 0 && idx > 0) changeViz(VIZ_OPTIONS[idx - 1].id);
  }, [selectedViz, changeViz]);

  // Keyboard tabs
  const handleTabKey = useCallback((e) => { const btns = tabBarRef.current?.querySelectorAll('.tab-btn'); if (!btns?.length) return; const idx = Array.from(btns).findIndex((b) => b === document.activeElement); if (idx === -1) return; let n = idx; if (e.key === 'ArrowRight') { e.preventDefault(); n = (idx + 1) % btns.length; } else if (e.key === 'ArrowLeft') { e.preventDefault(); n = (idx - 1 + btns.length) % btns.length; } else return; btns[n].focus(); btns[n].click(); }, []);

  // Table sorting
  const handleSort = useCallback((col) => { startTransition(() => { setSortCol((p) => { if (p === col) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); return col; } setSortDir('asc'); return col; }); setTablePage(0); }); }, []);
  const sortedTable = useMemo(() => { const d = highlightedWeek != null ? filteredData.filter((b) => b.week === highlightedWeek) : [...filteredData]; d.sort((a, b) => { const va = a[sortCol], vb = b[sortCol]; if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va; return sortDir === 'asc' ? String(va ?? '').localeCompare(String(vb ?? '')) : String(vb ?? '').localeCompare(String(va ?? '')); }); return d; }, [filteredData, highlightedWeek, sortCol, sortDir]);
  const paged = useMemo(() => sortedTable.slice(tablePage * ROWS_PP, (tablePage + 1) * ROWS_PP), [sortedTable, tablePage]);
  const totalPages = Math.ceil(sortedTable.length / ROWS_PP);

  // Pie
  const onPieEnter = useCallback((_, i) => setActiveIndex(i), []);
  const renderActiveShape = (props) => { const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props; const R = Math.PI / 180, sin = Math.sin(-midAngle * R), cos = Math.cos(-midAngle * R); const ex = cx + (outerRadius + 30) * cos + (cos >= 0 ? 22 : -22), ey = cy + (outerRadius + 30) * sin; return (<g><Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} /><Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} /><text x={ex} y={ey} textAnchor={cos >= 0 ? 'start' : 'end'} fill={C.labelColor}>{payload.name}</text><text x={ex} y={ey} dy={18} textAnchor={cos >= 0 ? 'start' : 'end'} fill={C.detailColor}>{`${value} (${(percent * 100).toFixed(1)}%)`}</text></g>); };

  // Last updated
  const lastUpdated = useMemo(() => { if (!lastFetched) return null; const m = Math.floor((Date.now() - lastFetched) / 60000); if (m < 1) return 'μόλις τώρα'; return `πριν ${m} λεπτά`; }, [lastFetched]);
  const shareContext = useMemo(() => ({ selectedViz, weekFrom, weekTo, highlightedWeek, cmpWeekA, cmpWeekB }), [selectedViz, weekFrom, weekTo, highlightedWeek, cmpWeekA, cmpWeekB]);
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
  }, [embedded, loading, error, selectedViz, tablePage, weekFrom, weekTo, highlightedWeek, cmpWeekA, cmpWeekB, hasData]);

  // =========================================================================
  // Chart renderers
  // =========================================================================
  const R_budget = () => (<div className="card mb-section"><h3 className="card-chart-title">Εξέλιξη Budget</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={budgetData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><defs><linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.budgetLine} stopOpacity={0.8} /><stop offset="95%" stopColor={C.budgetLine} stopOpacity={0.05} /></linearGradient></defs><XAxis dataKey="id" /><YAxis /><CartesianGrid strokeDasharray="3 3" /><Tooltip content={<BudgetTT />} /><Legend /><Area type="monotone" dataKey="value" name="Budget" stroke={C.budgetLine} fillOpacity={1} fill="url(#gB)" isAnimationActive animationDuration={800} /><Line type="monotone" dataKey="rollingAvg" name="Μ.Ο.5" stroke={C.rolling} strokeWidth={2} strokeDasharray="4 2" dot={false} connectNulls={false} /><Line dataKey={() => 100} name="Αρχικό" stroke={C.darkGray} strokeDasharray="5 5" dot={false} />{milestones.high && <ReferenceDot x={milestones.high.id} y={milestones.high.value} r={5} fill={C.milestone} stroke="none" />}{milestones.low && <ReferenceDot x={milestones.low.id} y={milestones.low.value} r={5} fill={C.lose} stroke="none" />}</ComposedChart></ResponsiveContainer></div></div>);

  const R_weeklyProfit = () => (<div className="card mb-section"><h3 className="card-chart-title">Κέρδη/Ζημίες ανά Εβδομάδα</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={wkProfitData} onClick={(e) => e?.activePayload?.[0]?.payload?.weekNum && handleChartWeekClick(e.activePayload[0].payload.weekNum)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" /><YAxis /><Tooltip content={<WeeklyTT />} /><Legend /><Bar dataKey="profit" name="Κ/Ζ" radius={[5, 5, 0, 0]} isAnimationActive>{wkProfitData.map((e, i) => <Cell key={i} fill={e.profit >= 0 ? C.profit : C.loss} fillOpacity={highlightedWeek != null && highlightedWeek !== e.weekNum ? 0.3 : 0.8} />)}</Bar><Line type="monotone" dataKey="budget" name="Budget" stroke={C.referenceLine} dot={{ r: 3 }} strokeWidth={2} /></BarChart></ResponsiveContainer></div></div>);

  const R_winLoss = () => (<div className="card mb-section"><div className="card-chart-title">Νίκες/Ήττες</div><div className="streaks-row" style={{ justifyContent: 'center', marginBottom: '0.5rem' }}><span className="streak-badge streak-badge--win">Μ.Ο. Νικών: {avgOdds.avgWinOdds}</span><span className="streak-badge streak-badge--loss">Μ.Ο. Ηττών: {avgOdds.avgLossOdds}</span></div><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie activeIndex={activeIndex} activeShape={renderActiveShape} data={wlData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" onMouseEnter={onPieEnter} isAnimationActive>{wlData.map((_, i) => <Cell key={i} fill={i === 0 ? C.win : C.lose} />)}</Pie></PieChart></ResponsiveContainer></div></div>);

  const R_oddsDist = () => (<div className="card mb-section"><h3 className="card-chart-title">Κατανομή Αποδόσεων</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={oddsDist} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="range" angle={-45} textAnchor="end" height={70} /><YAxis /><Tooltip /><Legend /><Bar dataKey="count" name="Σύνολο" fill={C.neutral} fillOpacity={0.6} radius={[5, 5, 0, 0]} isAnimationActive /><Bar dataKey="winCount" name="Νίκες" fill={C.win} radius={[5, 5, 0, 0]} isAnimationActive /></BarChart></ResponsiveContainer></div></div>);

  const R_profitByOdds = () => (<div className="card mb-section"><h3 className="card-chart-title">Κέρδος/Ζημία ανά Odds</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={profitByOdds}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="range" /><YAxis /><Tooltip formatter={(v, n) => [n === 'profit' ? `${v}€` : `${v}%`, n === 'profit' ? 'P/L' : 'Win%']} /><Legend /><Bar dataKey="profit" name="P/L" radius={[5, 5, 0, 0]} isAnimationActive>{profitByOdds.map((e, i) => <Cell key={i} fill={e.profit >= 0 ? C.profit : C.loss} />)}</Bar></BarChart></ResponsiveContainer></div></div>);

  const R_ev = () => (<div className="card mb-section"><h3 className="card-chart-title">Expected Value</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={evData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="range" /><YAxis tickFormatter={(v) => `${v}%`} /><Tooltip formatter={(v) => [`${v}%`]} /><Legend /><Bar dataKey="impliedProb" name="Implied %" fill={C.neutral} fillOpacity={0.5} radius={[5, 5, 0, 0]} isAnimationActive /><Bar dataKey="actualWinRate" name="Actual %" fill={C.win} radius={[5, 5, 0, 0]} isAnimationActive /></BarChart></ResponsiveContainer></div><div className="streaks-row" style={{ marginTop: '0.5rem' }}>{evData.map((d) => <span key={d.range} className={`streak-badge ${d.edge >= 0 ? 'streak-badge--win' : 'streak-badge--loss'}`}>{d.range}: {d.edge >= 0 ? '+' : ''}{d.edge}%</span>)}</div></div>);

  // #4 — Kelly
  const R_kelly = () => (<div className="card mb-section"><h3 className="card-chart-title">Kelly Criterion — Προτεινόμενο Ποντάρισμα</h3>{kellyData.length === 0 ? <div className="empty-state"><p>Χρειάζονται τουλάχιστον 5 στοιχήματα ανά εύρος odds.</p></div> : (<div className="data-table-wrap"><table className="data-table"><thead><tr><th>Odds</th><th>Μ.Ο.</th><th>Win%</th><th>Kelly%</th><th>Stake ({lastBudget.toFixed(0)}€)</th><th>N</th></tr></thead><tbody>{kellyData.map((d) => (<tr key={d.range}><td>{d.range}</td><td>{d.avgOdds}</td><td className={d.winProb >= 50 ? 'cell-win' : 'cell-lose'}>{d.winProb}%</td><td>{d.kellyPct}%</td><td><strong>{d.suggestedStake}€</strong></td><td>{d.sampleSize}</td></tr>))}</tbody></table></div>)}<div className="streaks-row" style={{ marginTop: '0.5rem' }}><span className="streak-badge">σ P/L: {varianceStats.stdDev}€</span><span className="streak-badge">Μ.Ο. P/L: {varianceStats.mean}€</span></div></div>);

  // #7 — Bet size analysis
  const R_betSize = () => (<div className="card mb-section"><h3 className="card-chart-title">Ανάλυση Ποντάρισματος</h3>{betSizeData.length <= 1 ? <div className="empty-state"><p>Χρειάζονται διαφορετικά ποσά ποντάρισματος για ανάλυση.</p><p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Σταθερό stake: {betSizeData[0]?.stake ?? 10}€ | Avg P/L: {betSizeData[0]?.avgPL ?? 0}€ | Win%: {betSizeData[0]?.winRate ?? 0}%</p></div> : (<div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={betSizeData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="stake" label={{ value: 'Stake (€)', position: 'bottom' }} /><YAxis /><Tooltip formatter={(v, n) => [n === 'avgPL' ? `${v}€` : `${v}%`, n === 'avgPL' ? 'Avg P/L' : 'Win%']} /><Legend /><Bar dataKey="avgPL" name="Avg P/L" radius={[5, 5, 0, 0]} isAnimationActive>{betSizeData.map((e, i) => <Cell key={i} fill={e.avgPL >= 0 ? C.profit : C.loss} />)}</Bar></BarChart></ResponsiveContainer></div>)}</div>);

  const R_winRate = () => (<div className="card mb-section"><h3 className="card-chart-title">Win Rate / Εβδομάδα</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={winRate} onClick={(e) => e?.activePayload?.[0]?.payload?.weekNum && handleChartWeekClick(e.activePayload[0].payload.weekNum)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" /><YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} /><Tooltip formatter={(v) => [`${v}%`]} /><Bar dataKey="winRate" name="Win%" radius={[5, 5, 0, 0]} isAnimationActive>{winRate.map((e, i) => <Cell key={i} fill={e.winRate >= 50 ? C.win : C.lose} fillOpacity={highlightedWeek != null && highlightedWeek !== e.weekNum ? 0.3 : 0.75} />)}</Bar><Line dataKey={() => 50} stroke={C.referenceLine} strokeDasharray="3 3" dot={false} /></BarChart></ResponsiveContainer></div></div>);

  const R_weeklyROI = () => (<div className="card mb-section"><h3 className="card-chart-title">Εβδομαδιαίο ROI</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={roiData} onClick={(e) => e?.activePayload?.[0]?.payload?.weekNum && handleChartWeekClick(e.activePayload[0].payload.weekNum)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" /><YAxis tickFormatter={(v) => `${v}%`} /><Tooltip formatter={(v) => [`${v}%`]} /><Legend /><Bar dataKey="roi" name="ROI%" radius={[5, 5, 0, 0]} isAnimationActive>{roiData.map((e, i) => <Cell key={i} fill={e.roi >= 0 ? C.profit : C.loss} fillOpacity={highlightedWeek != null && highlightedWeek !== e.weekNum ? 0.3 : 0.8} />)}</Bar><Line dataKey={() => 0} stroke={C.referenceLine} strokeDasharray="3 3" dot={false} /></BarChart></ResponsiveContainer></div></div>);

  const R_cumROI = () => (<div className="card mb-section"><h3 className="card-chart-title">Συνολικό ROI</h3><div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={cumRoi}><defs><linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.budgetLine} stopOpacity={0.8} /><stop offset="95%" stopColor={C.budgetLine} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" /><YAxis tickFormatter={(v) => `${v}%`} /><Tooltip formatter={(v) => [`${v}%`]} /><Legend /><Area type="monotone" dataKey="roi" name="ROI%" stroke={C.budgetLine} fillOpacity={1} fill="url(#gR)" isAnimationActive /><Line type="monotone" dataKey="roi" stroke={C.budgetLine} dot={{ r: 3 }} /><Line dataKey={() => 0} stroke={C.darkGray} strokeDasharray="5 5" dot={false} /></ComposedChart></ResponsiveContainer></div></div>);

  // #11 — Compare weeks
  const R_compare = () => {
    const wA = filteredSummary.find((w) => w.week === cmpWeekA);
    const wB = filteredSummary.find((w) => w.week === cmpWeekB);
    const delta = (a, b) => { const d = a - b; return d >= 0 ? `+${d.toFixed(1)}` : d.toFixed(1); };
    return (<div className="card mb-section"><h3 className="card-chart-title">Σύγκριση Εβδομάδων</h3><div className="filter-bar" style={{ justifyContent: 'center', marginBottom: '1rem' }}><select value={cmpWeekA ?? ''} onChange={(e) => updateCompareWeekA(e.target.value ? Number(e.target.value) : null)}><option value="">Εβδ. A</option>{allWeeks.map((w) => <option key={w} value={w}>{w}</option>)}</select><span>vs</span><select value={cmpWeekB ?? ''} onChange={(e) => updateCompareWeekB(e.target.value ? Number(e.target.value) : null)}><option value="">Εβδ. B</option>{allWeeks.map((w) => <option key={w} value={w}>{w}</option>)}</select></div>
      {wA && wB ? (<div className="compare-grid"><div className="compare-col"><h4>Εβδ. {wA.week}</h4><p>P/L: <strong className={wA.totalProfitLoss >= 0 ? 'tt-win' : 'tt-lose'}>{wA.totalProfitLoss >= 0 ? '+' : ''}{wA.totalProfitLoss}€</strong></p><p>Win%: {(wA.winRate * 100).toFixed(0)}%</p><p>ROI: {wA.weeklyROI}%</p><p>{wA.wins}W / {wA.losses}L</p></div><div className="compare-delta"><p>Δ P/L: {delta(wA.totalProfitLoss, wB.totalProfitLoss)}€</p><p>Δ Win%: {delta(wA.winRate * 100, wB.winRate * 100)}%</p><p>Δ ROI: {delta(wA.weeklyROI, wB.weeklyROI)}%</p></div><div className="compare-col"><h4>Εβδ. {wB.week}</h4><p>P/L: <strong className={wB.totalProfitLoss >= 0 ? 'tt-win' : 'tt-lose'}>{wB.totalProfitLoss >= 0 ? '+' : ''}{wB.totalProfitLoss}€</strong></p><p>Win%: {(wB.winRate * 100).toFixed(0)}%</p><p>ROI: {wB.weeklyROI}%</p><p>{wB.wins}W / {wB.losses}L</p></div></div>) : <div className="empty-state"><p>Επιλέξτε δύο εβδομάδες για σύγκριση.</p></div>}
    </div>);
  };

  // Data table — now includes betType column
  const R_table = () => (<div className="card mb-section"><div className="flex-between" style={{ marginBottom: '0.75rem' }}><h3 className="card-chart-title" style={{ marginBottom: 0 }}>Πίνακας</h3><button className="export-btn" onClick={() => exportCSV(sortedTable)}>⬇ CSV</button></div><div className="data-table-wrap"><table className="data-table"><thead><tr>{TABLE_COLS.map((c) => <th key={c.key} style={{ textAlign: c.align }} onClick={() => handleSort(c.key)}>{c.label}<span className={`sort-arrow ${sortCol === c.key ? 'sort-arrow--active' : ''}`}>{sortCol === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span></th>)}</tr></thead><tbody>{paged.length === 0 ? <tr><td colSpan={10} className="empty-state">Κανένα στοίχημα</td></tr> : paged.map((b) => (<tr key={b.id} className={highlightedWeek != null && b.week === highlightedWeek ? 'row-highlight' : ''}><td style={{ textAlign: 'center' }}>{b.id}</td><td style={{ textAlign: 'center' }}>{b.week}</td><td style={{ textAlign: 'center' }}>{b.betNumber}</td><td style={{ textAlign: 'left' }}>{b.betType || '—'}</td><td className="bookmaker-cell"><BookmakerLogo company={b.company} /></td><td style={{ textAlign: 'right' }}>{safeNumber(b.odds).toFixed(2)}</td><td style={{ textAlign: 'right' }}>{safeNumber(b.stake).toFixed(2)}€</td><td style={{ textAlign: 'center' }} className={b.result === 'Win' ? 'cell-win' : 'cell-lose'}>{b.result === 'Win' ? '✓' : '✗'}</td><td style={{ textAlign: 'right' }} className={safeNumber(b.profitLoss) >= 0 ? 'cell-win' : 'cell-lose'}>{safeNumber(b.profitLoss) >= 0 ? '+' : ''}{safeNumber(b.profitLoss).toFixed(2)}€</td><td style={{ textAlign: 'right' }}>{safeNumber(b.cumulativeBudget).toFixed(2)}€</td></tr>))}</tbody></table></div>{totalPages > 1 && <div className="table-pagination"><button disabled={tablePage === 0} onClick={() => setTablePage((p) => p - 1)}>←</button><span>{tablePage + 1}/{totalPages}</span><button disabled={tablePage >= totalPages - 1} onClick={() => setTablePage((p) => p + 1)}>→</button></div>}</div>);

  const RENDERERS = { budget: R_budget, weeklyProfit: R_weeklyProfit, winLossRatio: R_winLoss, oddsDistribution: R_oddsDist, profitByOdds: R_profitByOdds, evTracking: R_ev, kelly: R_kelly, betSize: R_betSize, winRateByWeek: R_winRate, weeklyROI: R_weeklyROI, cumulativeROI: R_cumROI, compareWeeks: R_compare, dataTable: R_table };

  // Loading
  if (loading) return (<div className={`main-content${embedded ? ' main-content--embedded' : ''}`}><h1 className="page-title">Αναλυτικά Στατιστικά Στοιχημάτων</h1><div className="card mb-section"><div className="skeleton" style={{ width: '10rem', height: '1.25rem', marginBottom: '1rem' }} /><div className="stats-grid">{[...Array(5)].map((_, i) => <div key={i} className="skeleton skeleton-stat" />)}</div></div><div className="card mb-section"><div className="skeleton skeleton-chart" /></div></div>);

  // Render
  const chartContent = (
    <div ref={shareRef}>
      {/* Stats */}
      <div className="card mb-section">
        <div className="flex-between"><h2 className="card-title" style={{ marginBottom: 0 }}>Στατιστικά</h2><button className="export-btn" onClick={() => shareScreenshot(shareRef.current)} title="Screenshot">📸 Share</button></div>
        <div className="stats-grid" style={{ marginTop: '0.75rem' }}>
          <div className="stat-card stat-card--blue"><p className="stat-value animate-number">{totalBets}</p><p className="stat-label">Σύνολο</p></div>
          <div className="stat-card stat-card--green"><p className="stat-value animate-number">{wins}</p><p className="stat-label">Νίκες</p></div>
          <div className="stat-card stat-card--purple"><p className="stat-value animate-number">{winPct}%</p><p className="stat-label">Win%</p></div>
          <div className={`stat-card ${lastBudget >= 100 ? 'stat-card--green' : 'stat-card--red'}`}><p className="stat-value animate-number">{lastBudget.toFixed(2)}€</p><p className="stat-label">Budget</p></div>
          <div className={`stat-card ${overallROI >= 0 ? 'stat-card--amber' : 'stat-card--red'}`}><p className="stat-value animate-number">{overallROI.toFixed(1)}%</p><p className="stat-label">ROI</p></div>
        </div>
        <div className="streaks-row">
          <span className={`streak-badge ${streaks.currentStreak.type === 'Win' ? 'streak-badge--win' : 'streak-badge--loss'}`}>{streaks.currentStreak.type === 'Win' ? '🔥' : '❄️'} {streaks.currentStreak.count}{streaks.currentStreak.type === 'Win' ? 'W' : 'L'}</span>
          <span className="streak-badge streak-badge--win">🏆 {streaks.longestWin}W</span>
          <span className="streak-badge streak-badge--loss">📉 {streaks.longestLoss}L</span>
          {bestWorst.best && <span className="streak-badge streak-badge--win">⭐ Εβδ.{bestWorst.best.week} +{bestWorst.best.totalProfitLoss}€</span>}
          {bestWorst.worst && <span className="streak-badge streak-badge--loss">💀 Εβδ.{bestWorst.worst.week} {bestWorst.worst.totalProfitLoss}€</span>}
          <span className="streak-badge">σ: {varianceStats.stdDev}€</span>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={mainContentRef} className={`main-content${embedded ? ' main-content--embedded' : ''}`}>
      <div className="page-toolbar">
        <div className="page-toolbar__heading">
          {embedded && <p className="embed-eyebrow">Embed View</p>}
          <h1 className="page-title page-title--inline">BetCast Στατιστικά</h1>
        </div>
        <div className="page-toolbar__actions">
          {lastUpdated && <span className="last-updated">🔄 {lastUpdated}</span>}
          {!embedded && <button className="export-btn" onClick={handleCopyLink}>🔗 Link</button>}
          {!embedded && <button className="export-btn" onClick={handleCopyEmbed}>{"</> Embed"}</button>}
          {embedded && <a className="export-btn" href={fullAppUrl} target="_blank" rel="noopener noreferrer">↗ Full App</a>}
        </div>
      </div>
      {shareFeedback && <p className="share-feedback">{shareFeedback}</p>}

      {error && <div className="error-banner"><strong>Σφάλμα</strong><p>{error}</p><button className="filter-reset-btn" onClick={handleRetry} style={{ marginTop: '0.5rem' }}>Επανάληψη</button></div>}

      {chartContent}

      {/* Filters + tabs */}
      <div className="card mb-section">
        <div className="flex-between">
          <h2 className="card-title" style={{ marginBottom: 0 }}>Γραφήματα</h2>
          <div className="filter-bar">
            <select value={weekFrom ?? ''} onChange={(e) => updateWeekFrom(e.target.value ? Number(e.target.value) : null)}><option value="">Από</option>{allWeeks.map((w) => <option key={w} value={w}>{w}</option>)}</select>
            <span>—</span>
            <select value={weekTo ?? ''} onChange={(e) => updateWeekTo(e.target.value ? Number(e.target.value) : null)}><option value="">Έως</option>{allWeeks.map((w) => <option key={w} value={w}>{w}</option>)}</select>
            {(weekFrom != null || weekTo != null) && <button className="filter-reset-btn" onClick={resetWeekRange}>✕</button>}
            {fullscreen && <button className="filter-reset-btn" onClick={() => setFullscreen(false)}>✕ Fullscreen</button>}
          </div>
        </div>
        {highlightedWeek != null && <div style={{ marginTop: '0.5rem' }}><span className="week-highlight-notice">Εβδ. {highlightedWeek}<button onClick={clearHighlightedWeek}>✕</button></span></div>}
        <div className="tab-bar" style={{ marginTop: '0.75rem' }} ref={tabBarRef} role="tablist" onKeyDown={handleTabKey}>
          {VIZ_OPTIONS.map((item) => (
            <button key={item.id} role="tab" tabIndex={selectedViz === item.id ? 0 : -1} aria-selected={selectedViz === item.id}
              className={`tab-btn ${selectedViz === item.id ? 'tab-btn--active' : ''}`}
              onClick={() => changeViz(item.id)}>
              <span className="tab-icon">{item.icon}</span>{item.name}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area with swipe + fullscreen + scroll anchor */}
      <div ref={chartRef} className={fullscreen ? 'fullscreen-overlay' : ''} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {fullscreen && <button className="fullscreen-close" onClick={() => setFullscreen(false)}>✕</button>}
        {!hasData ? <div className="card mb-section"><div className="empty-state"><p>Δεν βρέθηκαν στοιχήματα.</p><button className="filter-reset-btn" onClick={resetAllFilters}>Reset</button></div></div> : RENDERERS[selectedViz]?.()}
      </div>
    </div>
  );
};

export default BettingVisualizations;
