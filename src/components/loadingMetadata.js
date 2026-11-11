import { DATA_SOURCES } from '../services/bettingDataCore.mjs';

export const VIZ_OPTIONS = [
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

export { DATA_SOURCES };
export const getNumericParam = (params, key) => { const value = params.get(key); if (value == null || value === '') return null; const number = Number(value); return Number.isFinite(number) ? number : null; };
export const normaliseDataSourceId = value => Object.prototype.hasOwnProperty.call(DATA_SOURCES, value) ? value : 'current';
export const parseLoadingMetadata = search => { const params = new URLSearchParams(search); const viz = params.get('viz'); return { dataSource: normaliseDataSourceId(params.get('season')), weekFrom: getNumericParam(params, 'from'), weekTo: getNumericParam(params, 'to'), highlightedWeek: getNumericParam(params, 'week'), selectedViz: VIZ_OPTIONS.some(option => option.id === viz) ? viz : 'budget' }; };
export const rendererTitles = { budget: 'Εξέλιξη Budget', weeklyProfit: 'Κέρδη/Ζημίες ανά Εβδομάδα', winLossRatio: 'Νίκες/Ήττες', oddsDistribution: 'Κατανομή Αποδόσεων', profitByOdds: 'Κέρδος/Ζημία ανά απόδοση', evTracking: 'Αναμενόμενη αξία', kelly: 'Kelly Criterion — Προτεινόμενο Ποντάρισμα', betSize: 'Ανάλυση Ποντάρισματος', winRateByWeek: 'Ποσοστό νικών ανά εβδομάδα', weeklyROI: 'Εβδομαδιαίο ROI', cumulativeROI: 'Συνολικό ROI', compareWeeks: 'Σύγκριση Εβδομάδων', dataTable: 'Πίνακας' };
