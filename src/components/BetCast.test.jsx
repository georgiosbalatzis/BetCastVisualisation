import { fireEvent, render, screen } from '@testing-library/react';
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
