import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/BetCast', () => () => <div>BetCast content</div>);

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

test('renders the full application chrome by default', async () => {
  render(<App />);
  expect(await screen.findByText('BetCast content')).toBeInTheDocument();
  expect(screen.getByRole('banner')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'F1 Stories — Αρχική' })).toHaveAttribute('href', 'https://f1stories.gr/');
  expect(screen.getByText('BETCAST')).toBeInTheDocument();
});

test('hides the outer chrome in embed mode', async () => {
  window.history.replaceState(null, '', '/?embed=1');

  render(<App />);

  expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  expect(screen.queryByText(/Powered by Georgios Balatzis/i)).not.toBeInTheDocument();
  expect(await screen.findByText('BetCast content')).toBeInTheDocument();
});
