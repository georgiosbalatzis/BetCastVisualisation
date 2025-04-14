import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, AreaChart, Area,
    BarChart, Bar, PieChart, Pie, Cell, Sector,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Treemap, RadialBarChart, RadialBar,
    ComposedChart, Scatter
} from 'recharts';

// Custom colors
const COLORS = {
    win: '#00C49F',
    lose: '#FF5252',
    neutral: '#8884d8',
    profit: '#4CAF50',
    loss: '#F44336',
    background: '#f8f9fa',
    chartBackground: '#ffffff',
    gradientStart: '#8884d8',
    gradientEnd: '#82ca9d',
    budgetLine: '#3f51b5',
    referenceStart: '#0088FE',
    referenceEnd: '#FFBB28',
    lightGray: '#f1f1f1',
    darkGray: '#333333'
};

/**
 * Fetches betting data from Google Sheets using a CORS proxy
 *
 * @returns {Promise<Array>} An array of betting data objects
 */
const fetchBettingData = async () => {
    try {
        // Use cors-anywhere proxy to get around CORS issues
        // Note: For production use, you should set up your own proxy or backend
        const corsProxy = 'https://corsproxy.io/?';
        const SHEET_ID = 'e/2PACX-1vTbj_mc5tRE9rQsBFNlEDO78wJRcmfHYNWHM75WRdTJ37GXjNSYsgIs-AiNuj3wjG8eGRHNbEwlEuEx';
        const GID = '0'; // First sheet
        const url = `${corsProxy}https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?gid=${GID}&single=true&output=csv`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status}`);
        }

        const csvText = await response.text();
        const parsedData = parseCSV(csvText);

        return parsedData;
    } catch (error) {
        console.error('Error fetching Google Sheet data:', error);

        // Return sample data as fallback
        console.warn('Using sample data as fallback');
        return generateSampleData();
    }
};

/**
 * Parse CSV data into an array of objects
 *
 * @param {string} csvText - Raw CSV text from Google Sheets
 * @returns {Array} Parsed data as an array of objects
 */
/**
 * Parse CSV data into an array of objects
 *
 * @param {string} csvText - Raw CSV text from Google Sheets
 * @returns {Array} Parsed data as an array of objects
 */
const parseCSV = (csvText) => {
    try {
        // Simple CSV parser
        const lines = csvText.trim().split('\n');

        // Debug: Show raw CSV data
        console.log('CSV first 200 chars:', csvText.substring(0, 200));
        console.log('Number of lines:', lines.length);

        const headers = lines[0].split(',').map(header => header.trim().replace(/^["']|["']$/g, ''));
        console.log('Headers:', headers);

        const data = [];
        let currentId = 1;
        let currentWeek = null;
        let weekBetCount = 0;

        for (let i = 1; i < lines.length; i++) {
            try {
                // Handle potential quoted values with commas inside them
                let line = lines[i];
                const values = [];
                let insideQuotes = false;
                let currentValue = '';

                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if (char === '"' || char === "'") {
                        insideQuotes = !insideQuotes;
                    } else if (char === ',' && !insideQuotes) {
                        values.push(currentValue.trim());
                        currentValue = '';
                    } else {
                        currentValue += char;
                    }
                }

                // Push the last value
                values.push(currentValue.trim());

                if (values.length === headers.length) {
                    // Create mapping from your column names to the expected names
                    const row = {};

                    // Map each header to the corresponding value
                    headers.forEach((header, index) => {
                        const value = values[index];
                        const numericValue = !isNaN(parseFloat(value)) ? parseFloat(value) : value;

                        // Map your column names to the expected property names
                        switch(header) {
                            case 'Week':
                                row.week = numericValue;
                                // Track the current week for betNumber calculation
                                if (currentWeek !== numericValue) {
                                    currentWeek = numericValue;
                                    weekBetCount = 0;
                                }
                                break;
                            case 'Date Range':
                                row.dateRange = value;
                                break;
                            case 'Stake':
                                row.stake = numericValue;
                                break;
                            case 'odd':
                                row.odds = numericValue;
                                break;
                            case 'Win / Lose':
                                row.result = value;
                                break;
                            case 'Profit / Loss':
                                row.profitLoss = numericValue;
                                break;
                            case 'Symbol (Win / Loss)':
                                row.symbol = value;
                                break;
                            case 'Cumulative Budget':
                                row.cumulativeBudget = numericValue;
                                break;
                            default:
                                row[header] = numericValue;
                        }
                    });

                    // Add generated ID and betNumber
                    row.id = currentId++;
                    weekBetCount++;
                    row.betNumber = weekBetCount;

                    // Print a debug row for the first few entries
                    if (data.length < 3) {
                        console.log('Parsed row:', row);
                    }

                    data.push(row);
                } else {
                    console.warn(`Line ${i} has ${values.length} values but there are ${headers.length} headers`);
                }
            } catch (lineError) {
                console.error(`Error parsing line ${i}:`, lineError);
            }
        }

        console.log(`Successfully parsed ${data.length} rows of data`);
        return data;
    } catch (error) {
        console.error('CSV parsing error:', error);
        return [];
    }
};

/**
 * Generate sample betting data if the fetch fails
 * This replicates the same structure as expected from the Google Sheet
 *
 * @returns {Array} Sample betting data
 */
const generateSampleData = () => {
    const weeks = 8;
    const betsPerWeek = 5;
    let data = [];
    let cumulativeBudget = 100;

    for (let week = 1; week <= weeks; week++) {
        const startDay = (week - 1) * 7 + 1;
        const endDay = week * 7;
        const dateRange = `${startDay}-${endDay}/5/2025`;

        for (let bet = 1; bet <= betsPerWeek; bet++) {
            const stake = 10;
            const odds = (1.5 + Math.random() * 2).toFixed(2);
            const isWin = Math.random() > 0.45; // Slightly better than 50% win rate
            const result = isWin ? "Win" : "Lose";
            const profitLoss = isWin ? stake * (parseFloat(odds) - 1) : -stake;
            cumulativeBudget += profitLoss;

            data.push({
                id: data.length + 1,
                week: week,
                dateRange: dateRange,
                betNumber: bet,
                stake: stake,
                odds: parseFloat(odds),
                result: result,
                profitLoss: profitLoss,
                symbol: isWin ? "✓" : "✗",
                cumulativeBudget: parseFloat(cumulativeBudget.toFixed(2))
            });
        }
    }

    return data;
};

/**
 * Calculate weekly summary statistics from betting data
 *
 * @param {Array} data - Betting data array
 * @returns {Array} Weekly summary statistics
 */
const calculateWeeklySummary = (data) => {
    const weeklySummary = [];
    const weeks = [...new Set(data.map(item => item.week))];

    weeks.forEach(weekNum => {
        const weekBets = data.filter(bet => bet.week === weekNum);
        const wins = weekBets.filter(bet => bet.result === "Win").length;
        const losses = weekBets.filter(bet => bet.result === "Lose").length;
        const weeklyProfit = weekBets.reduce((sum, bet) => sum + bet.profitLoss, 0);
        const lastBet = weekBets[weekBets.length - 1];

        weeklySummary.push({
            week: weekNum,
            dateRange: weekBets[0].dateRange,
            wins: wins,
            losses: losses,
            winRate: wins / (wins + losses),
            totalProfitLoss: parseFloat(weeklyProfit.toFixed(2)),
            cumulativeBudget: lastBet.cumulativeBudget
        });
    });

    return weeklySummary;
};

const BettingVisualizations = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [bettingData, setBettingData] = useState([]);
    const [summaryData, setSummaryData] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedVisualization, setSelectedVisualization] = useState('budget');

    // Data for various charts
    const [budgetChartData, setBudgetChartData] = useState([]);
    const [weeklyProfitData, setWeeklyProfitData] = useState([]);
    const [winLossData, setWinLossData] = useState([{ name: 'Νίκες', value: 0 }, { name: 'Ήττες', value: 0 }]);
    const [oddsDistributionData, setOddsDistributionData] = useState([]);
    const [weekdayData, setWeekdayData] = useState([]);
    const [winRateByWeek, setWinRateByWeek] = useState([]);

    // Fetch data on component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Try to fetch from Google Sheets, fall back to sample data
                const data = await fetchBettingData();
                setBettingData(data);

                // Calculate summary statistics
                const summary = calculateWeeklySummary(data);
                setSummaryData(summary);

                setLoading(false);
            } catch (err) {
                console.error('Error loading data:', err);
                setError('Failed to load betting data. Using sample data instead.');

                // Use sample data as fallback
                const sampleData = generateSampleData();
                setBettingData(sampleData);
                setSummaryData(calculateWeeklySummary(sampleData));

                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Process chart data whenever betting data changes
    useEffect(() => {
        if (bettingData.length > 0 && summaryData.length > 0) {
            // Budget chart data
            setBudgetChartData(bettingData.map(item => ({
                id: item.id,
                value: item.cumulativeBudget,
                result: item.result
            })));

            // Weekly profit data
            setWeeklyProfitData(summaryData.map(week => ({
                week: `Εβδ. ${week.week}`,
                profit: week.totalProfitLoss,
                budget: week.cumulativeBudget
            })));

            // Win/Loss ratio data
            setWinLossData([
                { name: 'Νίκες', value: bettingData.filter(bet => bet.result === 'Win').length },
                { name: 'Ήττες', value: bettingData.filter(bet => bet.result === 'Lose').length }
            ]);

            // Odds distribution data
            const oddsData = Array.from({ length: 10 }, (_, i) => {
                const min = 1.5 + i * 0.25;
                const max = min + 0.25;
                const count = bettingData.filter(bet => bet.odds >= min && bet.odds < max).length;
                return {
                    range: `${min.toFixed(2)} - ${max.toFixed(2)}`,
                    count: count,
                    winCount: bettingData.filter(bet => bet.odds >= min && bet.odds < max && bet.result === 'Win').length
                };
            }).filter(item => item.count > 0);
            setOddsDistributionData(oddsData);

            // Weekday data
            // Note: For real data, you'd extract this from dates in the Google Sheet
            setWeekdayData([
                { name: 'Δευτέρα', value: 7, winRate: 0.71 },
                { name: 'Τρίτη', value: 6, winRate: 0.5 },
                { name: 'Τετάρτη', value: 4, winRate: 0.25 },
                { name: 'Πέμπτη', value: 5, winRate: 0.6 },
                { name: 'Παρασκευή', value: 8, winRate: 0.625 },
                { name: 'Σάββατο', value: 5, winRate: 0.4 },
                { name: 'Κυριακή', value: 5, winRate: 0.6 }
            ]);

            // Win rate by week
            setWinRateByWeek(summaryData.map(week => ({
                week: `Εβδ. ${week.week}`,
                winRate: parseFloat((week.winRate * 100).toFixed(1))
            })));
        }
    }, [bettingData, summaryData]);

    const onPieEnter = (_, index) => {
        setActiveIndex(index);
    };

    const renderActiveShape = (props) => {
        const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
            fill, payload, percent, value } = props;
        const sin = Math.sin(-midAngle * Math.PI / 180);
        const cos = Math.cos(-midAngle * Math.PI / 180);
        const sx = cx + (outerRadius + 10) * cos;
        const sy = cy + (outerRadius + 10) * sin;
        const mx = cx + (outerRadius + 30) * cos;
        const my = cy + (outerRadius + 30) * sin;
        const ex = mx + (cos >= 0 ? 1 : -1) * 22;
        const ey = my;
        const textAnchor = cos >= 0 ? 'start' : 'end';

        return (
            <g>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 6}
                    outerRadius={outerRadius + 10}
                    fill={fill}
                />
                <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
                <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
                <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${payload.name}`}</text>
                <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
                    {`${value} στοιχήματα (${(percent * 100).toFixed(2)}%)`}
                </text>
            </g>
        );
    };

    const renderVisualizations = () => {
        switch(selectedVisualization) {
            case 'budget':
                return (
                    <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
                        <h3 className="text-xl font-bold mb-4 text-center">Εξέλιξη Διαθέσιμου Ποσού</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={budgetChartData}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS.budgetLine} stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor={COLORS.budgetLine} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="id" name="Στοίχημα" />
                                    <YAxis />
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <Tooltip
                                        formatter={(value) => [`${value}€`, "Διαθέσιμο Ποσό"]}
                                        labelFormatter={(value) => `Στοίχημα #${value}`}
                                    />
                                    <Legend />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        name="Διαθέσιμο Ποσό"
                                        stroke={COLORS.budgetLine}
                                        fillOpacity={1}
                                        fill="url(#colorBudget)"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        name="Διαθέσιμο Ποσό"
                                        stroke={COLORS.budgetLine}
                                        dot={{
                                            stroke: COLORS.darkGray,
                                            strokeWidth: 2,
                                            r: 4,
                                            fill: (entry) => entry.result === 'Win' ? COLORS.win : COLORS.lose
                                        }}
                                        activeDot={{ r: 8 }}
                                    />
                                    <Scatter
                                        dataKey="value"
                                        fill={(entry) => entry.result === 'Win' ? COLORS.win : COLORS.lose}
                                        opacity={0}
                                    />
                                    <Line
                                        dataKey={() => 100}
                                        name="Αρχικό Ποσό"
                                        stroke={COLORS.darkGray}
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );

            case 'weeklyProfit':
                return (
                    <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
                        <h3 className="text-xl font-bold mb-4 text-center">Κέρδη/Ζημίες ανά Εβδομάδα</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={weeklyProfitData}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="week" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value) => [`${value}€`, "Κέρδος/Ζημιά"]}
                                    />
                                    <Legend />
                                    <Bar
                                        dataKey="profit"
                                        name="Εβδομαδιαίο Κέρδος/Ζημιά"
                                        radius={[5, 5, 0, 0]}
                                    >
                                        {weeklyProfitData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.profit >= 0 ? COLORS.profit : COLORS.loss}
                                                fillOpacity={0.8}
                                            />
                                        ))}
                                    </Bar>
                                    <Line
                                        type="monotone"
                                        dataKey="budget"
                                        name="Συνολικό Διαθέσιμο"
                                        stroke="#ff7300"
                                        dot={{ r: 5 }}
                                        strokeWidth={2}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );

            case 'winLossRatio':
                return (
                    <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
                        <h3 className="text-xl font-bold mb-4 text-center">Αναλογία Νικών/Ηττών</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        activeIndex={activeIndex}
                                        activeShape={renderActiveShape}
                                        data={winLossData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        fill="#8884d8"
                                        dataKey="value"
                                        onMouseEnter={onPieEnter}
                                    >
                                        {winLossData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={index === 0 ? COLORS.win : COLORS.lose}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name) => [`${value} στοιχήματα`, name]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );

            case 'oddsDistribution':
                return (
                    <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
                        <h3 className="text-xl font-bold mb-4 text-center">Κατανομή Αποδόσεων και Επιτυχία</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={oddsDistributionData}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="range" angle={-45} textAnchor="end" height={70} />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value, name) => [
                                            value,
                                            name === 'count' ? 'Συνολικά Στοιχήματα' : 'Επιτυχημένα Στοιχήματα'
                                        ]}
                                    />
                                    <Legend />
                                    <Bar
                                        dataKey="count"
                                        name="Συνολικά Στοιχήματα"
                                        fill={COLORS.neutral}
                                        fillOpacity={0.6}
                                        radius={[5, 5, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="winCount"
                                        name="Επιτυχημένα Στοιχήματα"
                                        fill={COLORS.win}
                                        radius={[5, 5, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );

            case 'winRateByWeek':
                return (
                    <div className="mb-8 bg-white p-6 rounded-lg shadow-lg">
                        <h3 className="text-xl font-bold mb-4 text-center">Ποσοστό Επιτυχίας ανά Εβδομάδα</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={winRateByWeek}
                                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="week" />
                                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                    <Tooltip formatter={(value) => [`${value}%`, "Ποσοστό Επιτυχίας"]} />
                                    <Bar
                                        dataKey="winRate"
                                        name="Ποσοστό Επιτυχίας"
                                        fill="#8884d8"
                                        radius={[5, 5, 0, 0]}
                                    >
                                        {winRateByWeek.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.winRate >= 50 ? COLORS.win : COLORS.lose}
                                                fillOpacity={0.7 + (entry.winRate / 200)}
                                            />
                                        ))}
                                    </Bar>
                                    <Line
                                        type="monotone"
                                        dataKey={() => 50}
                                        name="Όριο Κερδοφορίας"
                                        stroke="#ff7300"
                                        strokeDasharray="3 3"
                                        dot={false}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // If loading, show a loading indicator
    if (loading) {
        return (
            <div className="min-h-screen p-6 bg-gray-100 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                    <div className="mb-4 text-3xl">⏳</div>
                    <h2 className="text-xl font-bold mb-2">Φόρτωση Δεδομένων</h2>
                    <p className="text-gray-600">Παρακαλώ περιμένετε καθώς φορτώνουμε τα δεδομένα από το Google Sheets...</p>
                </div>
            </div>
        );
    }
    // Calculate win percentage safely
    const winPercentage = winLossData[0].value > 0 && bettingData.length > 0
        ? ((winLossData[0].value / bettingData.length) * 100).toFixed(1)
        : "0.0";

// Get last budget value safely
    const lastBudget = bettingData.length > 0
        ? bettingData[bettingData.length - 1].cumulativeBudget
        : 0;
    return (
        <div className="min-h-screen p-6 bg-gray-100">
            <h1 className="text-3xl font-bold mb-6 text-center">Αναλυτικά Στατιστικά Στοιχημάτων</h1>

            {error && (
                <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow">
                    <p className="font-bold">Προσοχή</p>
                    <p>{error}</p>
                </div>
            )}

            <div className="mb-6 bg-white p-4 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">Βασικά Στατιστικά</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-lg text-center shadow">
                        <p className="text-xl font-bold text-blue-800">{bettingData.length}</p>
                        <p className="text-sm text-blue-600">Συνολικά Στοιχήματα</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-lg text-center shadow">
                        <p className="text-xl font-bold text-green-800">{winLossData[0].value}</p>
                        <p className="text-sm text-green-600">Επιτυχημένα Στοιχήματα</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 rounded-lg text-center shadow">
                        <p className="text-xl font-bold text-purple-800">
                            {winPercentage}%
                        </p>
                        <p className="text-sm text-purple-600">Ποσοστό Επιτυχίας</p>
                    </div>
                    <div className={`bg-gradient-to-r ${
                        lastBudget >= 100
                            ? 'from-green-100 to-green-200'
                            : 'from-red-100 to-red-200'
                    } p-4 rounded-lg text-center shadow`}>
                        <p className={`text-xl font-bold ${
                            lastBudget >= 100
                                ? 'text-green-800'
                                : 'text-red-800'
                        }`}>
                            {lastBudget.toFixed(2)}€
                        </p>
                        <p className={`text-sm ${
                            bettingData[bettingData.length - 1].cumulativeBudget >= 100
                                ? 'text-green-600'
                                : 'text-red-600'
                        }`}>
                            Τρέχον Διαθέσιμο Ποσό
                        </p>
                    </div>
                </div>
            </div>

            <div className="mb-6 bg-white p-4 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">Επιλογή Γραφήματος</h2>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {[
                        { id: 'budget', name: 'Εξέλιξη Ποσού', icon: '📈' },
                        { id: 'weeklyProfit', name: 'Εβδομαδιαία Κέρδη', icon: '💰' },
                        { id: 'winLossRatio', name: 'Νίκες/Ήττες', icon: '🎯' },
                        { id: 'oddsDistribution', name: 'Αποδόσεις', icon: '📊' },
                        { id: 'winRateByWeek', name: 'Επιτυχία ανά Εβδομάδα', icon: '🏆' }
                    ].map(item => (
                        <button
                            key={item.id}
                            className={`p-3 rounded-lg text-center transition-all ${
                                selectedVisualization === item.id
                                    ? 'bg-blue-500 text-white shadow-md transform scale-105'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            onClick={() => setSelectedVisualization(item.id)}
                        >
                            <div className="text-2xl mb-1">{item.icon}</div>
                            <div className="text-xs">{item.name}</div>
                        </button>
                    ))}
                </div>
            </div>

            {renderVisualizations()}
        </div>
    );
};

export default BettingVisualizations;