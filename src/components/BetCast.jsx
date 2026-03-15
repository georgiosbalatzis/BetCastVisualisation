import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Line, Bar, PieChart, Pie, Cell, Sector,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Scatter,
  BarChart, Area,
} from 'recharts';

// ---- Single source of truth: import data functions from the service ----
import {
  fetchBettingData,
  calculateWeeklySummary,
  calculateROI,
} from '../services/googleSheetService';

// ---------------------------------------------------------------------------
// Theme colours for Recharts (CSS vars don't work in SVG props, so we keep
// a JS object — but it's derived from the same design tokens as App.css)
// ---------------------------------------------------------------------------

const THEMES = {
  dark: {
    win: '#4caf50',
    lose: '#f44336',
    neutral: '#7986cb',
    profit: '#4caf50',
    loss: '#f44336',
    budgetLine: '#5c6bc0',
    darkGray: '#9e9e9e',
    labelColor: '#e0e0e0',
    detailColor: '#9e9e9e',
    referenceLine: '#ff7300',
  },
  light: {
    win: '#00695c',
    lose: '#c62828',
    neutral: '#5c6bc0',
    profit: '#00695c',
    loss: '#c62828',
    budgetLine: '#3949ab',
    darkGray: '#455a64',
    labelColor: '#333333',
    detailColor: '#999999',
    referenceLine: '#ff7300',
  },
};

// ---------------------------------------------------------------------------
// Safe number helper
// ---------------------------------------------------------------------------

const safeNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const n = parseFloat(value.replace(/[€\s]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

// ---------------------------------------------------------------------------
// Chart data builders (pure functions)
// ---------------------------------------------------------------------------

const buildBudgetChartData = (data) =>
  data.map((item) => ({
    id: item.id,
    value: safeNumber(item.cumulativeBudget),
    result: item.result,
  }));

const buildWeeklyProfitData = (summary) =>
  summary.map((w) => ({
    week: `Εβδ. ${w.week}`,
    profit: w.totalProfitLoss,
    budget: w.cumulativeBudget,
  }));

const buildWinLossData = (data) => {
  const wins = data.filter((b) => b.result === 'Win').length;
  const losses = data.filter((b) => b.result === 'Lose').length;
  return [
    { name: 'Νίκες', value: wins },
    { name: 'Ήττες', value: losses },
  ];
};

const buildOddsDistributionData = (data) => {
  const groups = [
    ...Array.from({ length: 8 }, (_, i) => {
      const min = 1.5 + i * 0.25;
      return { min, max: min + 0.25, label: `${min.toFixed(2)}-${(min + 0.25).toFixed(2)}` };
    }),
    { min: 3.5, max: 5.0, label: '3.50-5.00' },
    { min: 5.0, max: Infinity, label: '5.00+' },
  ];

  return groups
    .map((g) => {
      const inRange = data.filter((b) => {
        const odds = safeNumber(b.odds);
        return odds >= g.min && odds < g.max;
      });
      return {
        range: g.label,
        count: inRange.length,
        winCount: inRange.filter((b) => b.result === 'Win').length,
      };
    })
    .filter((d) => d.count > 0);
};

const buildRoiData = (summary) =>
  summary.map((w) => ({ week: `Εβδ. ${w.week}`, roi: w.weeklyROI }));

const buildCumulativeRoiData = (summary) =>
  summary.map((w) => ({ week: `Εβδ. ${w.week}`, roi: parseFloat(w.cumulativeROI.toFixed(2)) }));

const buildWinRateByWeek = (summary) =>
  summary.map((w) => ({ week: `Εβδ. ${w.week}`, winRate: parseFloat((w.winRate * 100).toFixed(1)) }));

// ---------------------------------------------------------------------------
// Visualization tab definitions
// ---------------------------------------------------------------------------

const VISUALIZATION_OPTIONS = [
  { id: 'budget',           name: 'Εξέλιξη Ποσού',          icon: '📈' },
  { id: 'weeklyProfit',     name: 'Εβδομαδιαία Κέρδη',      icon: '💰' },
  { id: 'winLossRatio',     name: 'Νίκες/Ήττες',            icon: '🎯' },
  { id: 'oddsDistribution', name: 'Αποδόσεις',              icon: '📊' },
  { id: 'winRateByWeek',    name: 'Επιτυχία/Εβδομάδα',      icon: '🏆' },
  { id: 'weeklyROI',        name: 'Εβδομαδιαίο ROI',        icon: '💹' },
  { id: 'cumulativeROI',    name: 'Συνολικό ROI',            icon: '📈' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BettingVisualizations = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bettingData, setBettingData] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedViz, setSelectedViz] = useState('budget');

  // Theme — hardcoded dark for now; trivial to wire up a toggle later
  const isDarkMode = true;
  const C = isDarkMode ? THEMES.dark : THEMES.light;

  // Derived chart data
  const budgetChartData       = useMemo(() => buildBudgetChartData(bettingData), [bettingData]);
  const weeklyProfitData      = useMemo(() => buildWeeklyProfitData(summaryData), [summaryData]);
  const winLossData           = useMemo(() => buildWinLossData(bettingData), [bettingData]);
  const oddsDistributionData  = useMemo(() => buildOddsDistributionData(bettingData), [bettingData]);
  const roiData               = useMemo(() => buildRoiData(summaryData), [summaryData]);
  const cumulativeRoiData     = useMemo(() => buildCumulativeRoiData(summaryData), [summaryData]);
  const winRateByWeek         = useMemo(() => buildWinRateByWeek(summaryData), [summaryData]);

  // ---- Data loading ----
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchBettingData();
        if (cancelled) return;
        setBettingData(data);
        setSummaryData(calculateWeeklySummary(data));
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading data:', err);
        setError('Αποτυχία φόρτωσης δεδομένων. Χρησιμοποιούνται δείγματα δεδομένων.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, []);

  // ---- Pie chart interaction ----
  const onPieEnter = useCallback((_, index) => setActiveIndex(index), []);

  // #6 — Pie labels now use theme-aware colours
  const renderActiveShape = (props) => {
    const {
      cx, cy, midAngle, innerRadius, outerRadius,
      startAngle, endAngle, fill, payload, percent, value,
    } = props;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius}
          startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle}
          innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill={C.labelColor}>
          {payload.name}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill={C.detailColor}>
          {`${value} στοιχήματα (${(percent * 100).toFixed(2)}%)`}
        </text>
      </g>
    );
  };

  // ===========================================================================
  // Chart renderers — all use the unified .card class (#5)
  // ===========================================================================

  const renderBudgetChart = () => (
    <div className="card mb-section">
      <h3 className="card-chart-title">Εξέλιξη Διαθέσιμου Ποσού</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={budgetChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBudget" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.budgetLine} stopOpacity={0.8} />
                <stop offset="95%" stopColor={C.budgetLine} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="id" name="Στοίχημα" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip
              formatter={(v) => [`${v}€`, 'Διαθέσιμο Ποσό']}
              labelFormatter={(v) => `Στοίχημα #${v}`}
            />
            <Legend />
            <Area type="monotone" dataKey="value" name="Διαθέσιμο Ποσό"
              stroke={C.budgetLine} fillOpacity={1} fill="url(#gradBudget)" />
            <Line type="monotone" dataKey="value" name="Διαθέσιμο Ποσό"
              stroke={C.budgetLine}
              dot={{ stroke: C.darkGray, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 8 }} />
            <Scatter dataKey="value" opacity={0} />
            <Line dataKey={() => 100} name="Αρχικό Ποσό"
              stroke={C.darkGray} strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderWeeklyProfitChart = () => (
    <div className="card mb-section">
      <h3 className="card-chart-title">Κέρδη/Ζημίες ανά Εβδομάδα</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyProfitData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip formatter={(v) => [`${v}€`, 'Κέρδος/Ζημιά']} />
            <Legend />
            <Bar dataKey="profit" name="Εβδομαδιαίο Κέρδος/Ζημιά" radius={[5, 5, 0, 0]}>
              {weeklyProfitData.map((entry, i) => (
                <Cell key={`cell-${i}`}
                  fill={entry.profit >= 0 ? C.profit : C.loss} fillOpacity={0.8} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="budget" name="Συνολικό Διαθέσιμο"
              stroke={C.referenceLine} dot={{ r: 5 }} strokeWidth={2} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderWinLossChart = () => (
    <div className="card mb-section">
      <h3 className="card-chart-title">Αναλογία Νικών/Ηττών</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie activeIndex={activeIndex} activeShape={renderActiveShape}
              data={winLossData} cx="50%" cy="50%"
              innerRadius={80} outerRadius={110}
              fill="#8884d8" dataKey="value" onMouseEnter={onPieEnter}>
              {winLossData.map((_, i) => (
                <Cell key={`cell-${i}`} fill={i === 0 ? C.win : C.lose} />
              ))}
            </Pie>
            <Tooltip formatter={(v, name) => [`${v} στοιχήματα`, name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderOddsDistributionChart = () => (
    <div className="card mb-section">
      <h3 className="card-chart-title">Κατανομή Αποδόσεων και Επιτυχία</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={oddsDistributionData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" angle={-45} textAnchor="end" height={70} />
            <YAxis />
            <Tooltip formatter={(v, name) => [v, name === 'count' ? 'Συνολικά' : 'Επιτυχημένα']} />
            <Legend />
            <Bar dataKey="count" name="Συνολικά Στοιχήματα" fill={C.neutral} fillOpacity={0.6} radius={[5, 5, 0, 0]} />
            <Bar dataKey="winCount" name="Επιτυχημένα" fill={C.win} radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderWinRateByWeekChart = () => (
    <div className="card mb-section">
      <h3 className="card-chart-title">Ποσοστό Επιτυχίας ανά Εβδομάδα</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={winRateByWeek} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v) => [`${v}%`, 'Ποσοστό Επιτυχίας']} />
            <Bar dataKey="winRate" name="Ποσοστό Επιτυχίας" radius={[5, 5, 0, 0]}>
              {winRateByWeek.map((entry, i) => (
                <Cell key={`cell-${i}`}
                  fill={entry.winRate >= 50 ? C.win : C.lose}
                  fillOpacity={0.7 + entry.winRate / 200} />
              ))}
            </Bar>
            <Line type="monotone" dataKey={() => 50} name="Όριο 50%"
              stroke={C.referenceLine} strokeDasharray="3 3" dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderWeeklyROIChart = () => (
    <div className="card mb-section">
      <h3 className="card-chart-title">Εβδομαδιαίο ROI %</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={roiData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" />
            <YAxis tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v) => [`${v}%`, 'ROI']} />
            <Legend />
            <Bar dataKey="roi" name="Εβδομαδιαίο ROI %" radius={[5, 5, 0, 0]}>
              {roiData.map((entry, i) => (
                <Cell key={`cell-${i}`}
                  fill={entry.roi >= 0 ? C.profit : C.loss} fillOpacity={0.8} />
              ))}
            </Bar>
            <Line type="monotone" dataKey={() => 0} name="Break-even"
              stroke={C.referenceLine} strokeDasharray="3 3" dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderCumulativeROIChart = () => (
    <div className="card mb-section">
      <h3 className="card-chart-title">Συνολικό ROI %</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={cumulativeRoiData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradROI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.budgetLine} stopOpacity={0.8} />
                <stop offset="95%" stopColor={C.budgetLine} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v) => [`${v}%`, 'Συνολικό ROI']} />
            <Legend />
            <Area type="monotone" dataKey="roi" name="Συνολικό ROI %"
              stroke={C.budgetLine} fillOpacity={1} fill="url(#gradROI)" />
            <Line type="monotone" dataKey="roi" name="Συνολικό ROI %"
              stroke={C.budgetLine} dot={{ r: 4 }} activeDot={{ r: 8 }} />
            <Line dataKey={() => 0} name="Break-even"
              stroke={C.darkGray} strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const CHART_RENDERERS = {
    budget: renderBudgetChart,
    weeklyProfit: renderWeeklyProfitChart,
    winLossRatio: renderWinLossChart,
    oddsDistribution: renderOddsDistributionChart,
    winRateByWeek: renderWinRateByWeekChart,
    weeklyROI: renderWeeklyROIChart,
    cumulativeROI: renderCumulativeROIChart,
  };

  // ===========================================================================
  // Loading state
  // ===========================================================================

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-box">
          <div className="spinner">⏳</div>
          <h2>Φόρτωση Δεδομένων</h2>
          <p>Παρακαλώ περιμένετε καθώς φορτώνουμε τα δεδομένα...</p>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Derived display values (#3 — 5th stat: overall ROI)
  // ===========================================================================

  const totalBets = bettingData.length;
  const wins = winLossData[0]?.value || 0;
  const winPercentage = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : '0.0';

  const lastBudget = totalBets > 0
    ? safeNumber(bettingData[totalBets - 1].cumulativeBudget)
    : 0;

  // Overall ROI from all bets
  const totalStake = bettingData.reduce((sum, b) => sum + safeNumber(b.stake), 0);
  const totalProfit = bettingData.reduce((sum, b) => sum + safeNumber(b.profitLoss), 0);
  const overallROI = calculateROI(totalStake, totalProfit);

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="main-content">
      <h1 className="page-title">Αναλυτικά Στατιστικά Στοιχημάτων</h1>

      {error && (
        <div className="error-banner">
          <strong>Προσοχή</strong>
          <p>{error}</p>
        </div>
      )}

      {/* ---- Stats cards (#3 — 5 cards, #5 — .card wrapper) ---- */}
      <div className="card mb-section">
        <h2 className="card-title">Βασικά Στατιστικά</h2>
        <div className="stats-grid">
          <div className="stat-card stat-card--blue">
            <p className="stat-value">{totalBets}</p>
            <p className="stat-label">Συνολικά Στοιχήματα</p>
          </div>
          <div className="stat-card stat-card--green">
            <p className="stat-value">{wins}</p>
            <p className="stat-label">Επιτυχημένα</p>
          </div>
          <div className="stat-card stat-card--purple">
            <p className="stat-value">{winPercentage}%</p>
            <p className="stat-label">Ποσοστό Επιτυχίας</p>
          </div>
          <div className={`stat-card ${lastBudget >= 100 ? 'stat-card--green' : 'stat-card--red'}`}>
            <p className="stat-value">{lastBudget.toFixed(2)}€</p>
            <p className="stat-label">Τρέχον Ποσό</p>
          </div>
          <div className={`stat-card ${overallROI >= 0 ? 'stat-card--amber' : 'stat-card--red'}`}>
            <p className="stat-value">{overallROI.toFixed(1)}%</p>
            <p className="stat-label">Συνολικό ROI</p>
          </div>
        </div>
      </div>

      {/* ---- Chart selector (#4 — horizontal scroll tab bar) ---- */}
      <div className="card mb-section">
        <h2 className="card-title">Επιλογή Γραφήματος</h2>
        <div className="tab-bar">
          {VISUALIZATION_OPTIONS.map((item) => (
            <button
              key={item.id}
              className={`tab-btn ${selectedViz === item.id ? 'tab-btn--active' : ''}`}
              onClick={() => setSelectedViz(item.id)}
            >
              <span className="tab-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Active chart ---- */}
      {CHART_RENDERERS[selectedViz]?.()}
    </div>
  );
};

export default BettingVisualizations;
