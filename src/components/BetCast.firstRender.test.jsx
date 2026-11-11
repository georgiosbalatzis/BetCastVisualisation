import React from 'react';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import BettingVisualizations from './BetCast';
import { fetchBettingData } from '../services/googleSheetService';

jest.mock('../services/googleSheetService', () => ({
  ...jest.requireActual('../services/googleSheetService'),
  fetchBettingData: jest.fn(() => new Promise(() => {})),
}));

test('first loading render uses URL selections and fetches the selected source once', () => {
  fetchBettingData.mockImplementation(() => new Promise(() => {}));
  window.history.replaceState(null, '', '?season=lastYear&from=2&to=4&week=3&viz=weeklyROI');
  const first = document.createElement('div');
  first.innerHTML = renderToString(<BettingVisualizations />);
  const values = root => [...root.querySelectorAll('.scope-bar select, .chart-selector select')].map(select => select.selectedOptions[0].textContent);
  expect(values(first)).toEqual(['Πέρσι', '2', '4', 'Εβδομ. ROI']);
  expect(first.querySelector('.scope-context')).toHaveTextContent('Εβδ. 2–4');
  expect(first.querySelector('.week-highlight-notice')).toHaveTextContent('Επιλεγμένη εβδομάδα: 3');
  expect(first.querySelector('.card-chart-title')).toHaveTextContent('Εβδομαδιαίο ROI');
  const { container } = render(<BettingVisualizations />);
  expect(values(container)).toEqual(values(first));
  expect(fetchBettingData).toHaveBeenCalledTimes(1);
  expect(fetchBettingData).toHaveBeenCalledWith(expect.any(Function), 'lastYear');
});
