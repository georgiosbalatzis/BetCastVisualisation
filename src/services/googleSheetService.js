/**
 * Service for fetching data from Google Sheets
 *
 * Due to CORS restrictions with GitHub Pages, we're using a proxy service
 * to fetch the Google Sheets data
 */

/**
 * Fetches betting data from Google Sheets using a CORS proxy
 *
 * @returns {Promise<Array>} An array of betting data objects
 */
export const fetchBettingData = async () => {
    try {
        // Use cors-anywhere proxy to get around CORS issues
        const corsProxy = 'https://corsproxy.io/?';
        const url = `${corsProxy}https://docs.google.com/spreadsheets/d/e/2PACX-1vTbj_mc5tRE9rQsBFNlEDO78wJRcmfHYNWHM75WRdTJ37GXjNSYsgIs-AiNuj3wjG8eGRHNbEwlEuEx/pub?output=csv`;

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
export const generateSampleData = () => {
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
export const calculateWeeklySummary = (data) => {
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