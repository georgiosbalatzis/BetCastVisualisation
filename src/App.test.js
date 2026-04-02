import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/BetCast', () => () => <div>BetCast content</div>);

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

test('renders the full application chrome by default', async () => {
  render(<App />);
  expect(screen.getByRole('banner')).toBeInTheDocument();
  expect(screen.getByText(/BetCast F1Stories/i)).toBeInTheDocument();
  expect(await screen.findByText('BetCast content')).toBeInTheDocument();
});

test('hides the outer chrome in embed mode', async () => {
  window.history.replaceState(null, '', '/?embed=1');

  render(<App />);

  expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  expect(screen.queryByText(/Powered by Georgios Balatzis/i)).not.toBeInTheDocument();
  expect(await screen.findByText('BetCast content')).toBeInTheDocument();
});
