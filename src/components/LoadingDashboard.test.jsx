import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingDashboard from './LoadingDashboard';
import { parseLoadingMetadata } from './loadingMetadata';

const show = (query = '', embedded = false) => render(<LoadingDashboard embedded={embedded} {...parseLoadingMetadata(query)} />);
const values = container => [...container.querySelectorAll('.scope-bar select, .chart-selector select')].map(select => select.selectedOptions[0].textContent);

test('default loading labels and accessible status', () => {
  const { container } = show();
  expect(values(container)).toEqual(['Φέτος', 'Όλες', 'Όλες', 'Εξέλιξη Budget']);
  expect(container.querySelector('.scope-context')).toHaveTextContent('Όλες οι εβδομάδες');
  expect(screen.getAllByRole('status')).toHaveLength(1);
  expect([...container.querySelectorAll('select,button')].every(el => el.disabled && el.tabIndex === -1)).toBe(true);
  expect(container.querySelector('.scope-bar')).toHaveAttribute('aria-hidden', 'true');
});
test('URL selections populate labels and renderer title', () => {
  const { container } = show('?season=lastYear&from=2&to=4&viz=weeklyROI');
  expect(values(container)).toEqual(['Πέρσι', '2', '4', 'Εβδομ. ROI']);
  expect(container.querySelector('.scope-context')).toHaveTextContent('Εβδ. 2–4');
  expect(container.querySelector('.scope-context button')).toBeDisabled();
  expect(container.querySelector('.card-chart-title')).toHaveTextContent('Εβδομαδιαίο ROI');
});
test('invalid URL values use defaults', () => {
  const { container } = show('?season=bad&from=Infinity&to=no&week=NaN&viz=bad');
  expect(values(container)).toEqual(['Φέτος', 'Όλες', 'Όλες', 'Εξέλιξη Budget']);
  expect(container.querySelector('.week-highlight-notice')).toBeNull();
});
test('embedded scope has only season field and retains context', () => {
  const { container } = show('?from=2&to=4&week=3', true);
  expect(container.querySelectorAll('.scope-bar .field')).toHaveLength(1);
  expect(container.querySelector('.scope-context')).toHaveTextContent('Εβδ. 2–4');
  expect(container.querySelector('.week-highlight-notice')).toHaveTextContent('Επιλεγμένη εβδομάδα: 3');
});
