import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BetCast from './BetCast';
import { ThemeProvider } from '../context/ThemeContext';
import { fetchBettingData } from '../services/googleSheetService';

jest.mock('../services/googleSheetService', () => ({
  ...jest.requireActual('../services/googleSheetService'),
  fetchBettingData: jest.fn(),
}));
jest.mock('recharts', () => ({ ...jest.requireActual('recharts'), ResponsiveContainer: () => null }));

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const execCommand = document.execCommand;

beforeEach(() => {
  window.history.replaceState(null, '', '/?from=2&to=4');
  localStorage.clear();
  fetchBettingData.mockResolvedValue([
    { id: 1, week: 2, betNumber: 1, betType: 'Test', company: 'stoiximan', odds: 2, stake: 10, result: 'Win', profitLoss: 10, cumulativeBudget: 110 },
  ]);
});

afterEach(() => {
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  else delete navigator.clipboard;
  if (execCommand) document.execCommand = execCommand;
  else delete document.execCommand;
  jest.restoreAllMocks();
});

test.each(['success', 'failure', 'exception'])('clipboard fallback restores focus and removes its textarea on %s', async outcome => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: jest.fn().mockRejectedValue(new Error('Permission denied')) },
  });
  let copied;
  document.execCommand = jest.fn(() => {
    copied = document.querySelector('textarea').value;
    if (outcome === 'exception') throw new Error('Copy failed');
    return outcome === 'success';
  });
  render(<ThemeProvider><BetCast /></ThemeProvider>);
  const link = await screen.findByRole('button', { name: 'Link' });
  link.focus();
  const focus = jest.spyOn(link, 'focus');
  fireEvent.click(link);
  expect(await screen.findByText(outcome === 'success' ? 'Το link αντιγράφηκε.' : 'Δεν ήταν δυνατή η αντιγραφή του link.')).toBeInTheDocument();
  expect(copied).toBe(`${window.location.origin}/?from=2&to=4`);
  expect(document.execCommand).toHaveBeenCalledWith('copy');
  expect(document.querySelector('textarea')).toBeNull();
  expect(link).toHaveFocus();
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});

test('article presentation renders only the selected view and keeps its fixed scope on the full-app link', async () => {
  window.history.replaceState(null, '', '/?embed=1&presentation=article&viz=dataTable&from=2&to=4');
  render(<ThemeProvider><BetCast embedded articlePresentation /></ThemeProvider>);
  expect(await screen.findByRole('heading', { name: 'Πίνακας' })).toBeInTheDocument();
  expect(screen.getByText(/Εβδ\. 2–4/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Άνοιγμα BetCast ↗' })).toHaveAttribute('href', `${window.location.origin}/?viz=dataTable&from=2&to=4`);
  expect(screen.queryByLabelText('Προβολή')).not.toBeInTheDocument();
  expect(screen.queryByText('03 / ΣΤΟΙΧΕΙΑ')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Όλες οι εβδομάδες' })).not.toBeInTheDocument();
});

test('article compare view keeps the comparison controls while omitting the global selector', async () => {
  window.history.replaceState(null, '', '/?embed=1&presentation=article&viz=compareWeeks&cmpA=2&cmpB=2');
  render(<ThemeProvider><BetCast embedded articlePresentation /></ThemeProvider>);
  expect(await screen.findByText('Metric')).toBeInTheDocument();
  expect(screen.getByLabelText('Εβδομάδα A')).toBeInTheDocument();
  expect(screen.getByLabelText('Εβδομάδα B')).toBeInTheDocument();
  expect(screen.queryByLabelText('Προβολή')).not.toBeInTheDocument();
});

test('article presentation keeps the same compact shell for errors and empty selections', async () => {
  window.history.replaceState(null, '', '/?embed=1&presentation=article&viz=budget&from=20&to=20');
  fetchBettingData.mockRejectedValueOnce(new Error('offline'));
  const errorView = render(<ThemeProvider><BetCast embedded articlePresentation /></ThemeProvider>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Τα δεδομένα δεν φορτώθηκαν.');
  expect(screen.getByRole('link', { name: 'Άνοιγμα BetCast ↗' })).toHaveAttribute('href', `${window.location.origin}/?from=20&to=20`);
  errorView.unmount();

  fetchBettingData.mockResolvedValueOnce([]);
  render(<ThemeProvider><BetCast embedded articlePresentation /></ThemeProvider>);
  expect(await screen.findByText('Δεν βρέθηκαν στοιχήματα.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Όλες οι εβδομάδες' })).not.toBeInTheDocument();
});

test('plain embed retains the dashboard controls', async () => {
  window.history.replaceState(null, '', '/?embed=1&viz=dataTable');
  render(<ThemeProvider><BetCast embedded /></ThemeProvider>);
  expect(await screen.findByLabelText('Προβολή')).toBeInTheDocument();
  expect(screen.getByLabelText('Σύνοψη επιλεγμένης περιόδου')).toBeInTheDocument();
});

test.each([
  ['budget', 'Εξέλιξη Budget'], ['weeklyProfit', 'Εβδομ. Κέρδη'], ['winLossRatio', 'Νίκες/Ήττες'],
  ['oddsDistribution', 'Αποδόσεις'], ['profitByOdds', 'Κέρδος ανά απόδοση'], ['evTracking', 'Αναμενόμενη αξία'],
  ['kelly', 'Kelly'], ['betSize', 'Ποντάρισμα'], ['winRateByWeek', 'Ποσοστό νικών'], ['weeklyROI', 'Εβδομ. ROI'],
  ['cumulativeROI', 'Συνολ. ROI'], ['compareWeeks', 'Σύγκριση'], ['dataTable', 'Πίνακας'],
])('article presentation loads the fixed %s view', async (viz, title) => {
  window.history.replaceState(null, '', `/?embed=1&presentation=article&viz=${viz}&cmpA=2&cmpB=2`);
  render(<ThemeProvider><BetCast embedded articlePresentation /></ThemeProvider>);
  await waitFor(() => expect(document.querySelector('.article-presentation__content')).toBeInTheDocument());
  expect(within(document.querySelector('.article-presentation__header')).getByRole('heading', { name: title })).toBeInTheDocument();
  expect(screen.queryByLabelText('Προβολή')).not.toBeInTheDocument();
  expect(screen.queryByText('03 / ΣΤΟΙΧΕΙΑ')).not.toBeInTheDocument();
});
