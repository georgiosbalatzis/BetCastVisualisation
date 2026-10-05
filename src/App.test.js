import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import EmbedFrameBridge from './components/EmbedFrameBridge';

jest.mock('./siteUrls', () => ({ siteUrl: (pathname) => pathname, betcastUrl: '/betcast/' }));

jest.mock('./components/BetCast', () => ({ embedded, articlePresentation }) => <main data-testid="betcast" data-embedded={String(embedded)} data-article={String(articlePresentation)}><h1>BETCAST.</h1><p>BetCast content</p></main>);

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});

const navigation = [
  ['Αρχική', '/'],
  ['Άρθρα', '/blog-module/blog/index.html'],
  ['YouTube', 'https://www.youtube.com/@f1_stories_original'],
  ['Βαθμολογία', '/standings/'],
  ['Δεδομένα', '/standings/?tab=tyre-pace'],
  ['Συντάκτες', '/authors/'],
  ['BetCast', '/betcast/'],
];

function expectCanonicalNavigation(nav) {
  const links = within(nav).getAllByRole('link');
  expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual(navigation);
  expect(links.filter((link) => link.hasAttribute('aria-current'))).toEqual([links[6]]);
  expect(links[6]).toHaveAttribute('aria-current', 'page');
  expect(links[6]).not.toHaveAttribute('target');
  expect(links[2]).toHaveAttribute('target', '_blank');
  expect(links[2]).toHaveAttribute('rel', 'noopener noreferrer');
}

test('renders the canonical global shell with BetCast identity in the content', async () => {
  render(<App />);
  expect(await screen.findByText('BetCast content')).toBeInTheDocument();
  const header = screen.getByRole('banner');
  expect(within(header).getByRole('link', { name: 'F1 Stories — Αρχική' })).toHaveAttribute('href', '/');
  expect(header).not.toHaveTextContent('BETCAST');
  expect(header).not.toHaveTextContent('Data Hub');
  expectCanonicalNavigation(screen.getByRole('navigation', { name: 'Κύρια πλοήγηση' }));
  expect(within(screen.getByRole('main')).getByRole('heading', { name: 'BETCAST.' })).toBeInTheDocument();
  const footer = screen.getByRole('contentinfo');
  expect(footer).toHaveTextContent('Τεχνική ανάλυση, άποψη και ελληνική F1 κοινότητα.');
  expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} F1 Stories.`);
  expect(footer).not.toHaveTextContent('Powered by');
  expect(within(footer).getByRole('link', { name: 'Πολιτική Απορρήτου' })).toHaveAttribute('href', '/privacy/privacy.html');
  expect(within(footer).getByRole('link', { name: 'Όροι Χρήσης' })).toHaveAttribute('href', '/privacy/terms.html');
  expect(within(footer).getAllByRole('link', { name: /F1 Stories στο|Email στο/ })).toHaveLength(5);
});

test('opts into article presentation only for an embedded article URL', async () => {
  window.history.replaceState(null, '', '/betcast/?embed=1&presentation=article');
  render(<App />);
  expect(await screen.findByTestId('betcast')).toHaveAttribute('data-embedded', 'true');
  expect(screen.getByTestId('betcast')).toHaveAttribute('data-article', 'true');
  expect(screen.queryByRole('navigation', { name: 'Κύρια πλοήγηση' })).not.toBeInTheDocument();
});

test('embed measurement wrapper reports intrinsic size and replies only to the approved parent handshake', () => {
  const originalParent = window.parent;
  const parent = { messages: [], postMessage(data, origin) { this.messages.push({ data, origin }); } };
  Object.defineProperty(window, 'parent', { configurable: true, value: parent });
  let pendingFrame;
  const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { pendingFrame = callback; return 1; });
  const view = render(<EmbedFrameBridge embedded><div>article content</div></EmbedFrameBridge>);
  const wrapper = view.container.querySelector('.embed-content-root');
  Object.defineProperty(wrapper, 'getBoundingClientRect', { value: () => ({ height: 432 }) });
  act(() => pendingFrame());
  expect(parent.messages.at(-1)).toEqual({ data: { type: 'betcast:resize', height: 432 }, origin: '*' });

  const handshake = (source, origin, data) => {
    const event = new MessageEvent('message', { data, origin });
    Object.defineProperty(event, 'source', { value: source });
    act(() => window.dispatchEvent(event));
  };
  handshake(parent, 'https://evil.example', { type: 'betcast:measure' });
  handshake({}, 'https://f1stories.gr', { type: 'betcast:measure' });
  expect(parent.messages).toHaveLength(1);
  handshake(parent, 'https://f1stories.gr', { type: 'betcast:measure', extra: true });
  expect(parent.messages).toHaveLength(1);
  handshake(parent, 'https://f1stories.gr', { type: 'betcast:measure' });
  act(() => pendingFrame());
  expect(parent.messages.at(-1)).toEqual({ data: { type: 'betcast:resize', height: 432 }, origin: 'https://f1stories.gr' });

  view.unmount();
  raf.mockRestore();
  Object.defineProperty(window, 'parent', { configurable: true, value: originalParent });
});

test('renders every F1Stories sponsor with a local image and safe external link', async () => {
  render(<App />);
  const sponsors = screen.getByRole('region', { name: 'ΜΑΖΙ ΣΤΗΝ ΕΚΚΙΝΗΣΗ' });
  const links = within(sponsors).getAllByRole('link');
  expect(links).toHaveLength(6);
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    'https://balatzis.gr/',
    'https://pourtsidisgenerators.gr/',
    'https://balatzis.gr/#domika',
    'https://ambrosiadis.gr/',
    'https://www.bedandhome.gr/',
    'https://www.grandrealm.gr/',
  ]);
  links.forEach((link) => {
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer sponsored');
  });
  expect(within(sponsors).getAllByRole('img')).toHaveLength(6);
  expect(within(sponsors).getAllByRole('img').every((image) => image.getAttribute('src').startsWith('/sponsors/'))).toBe(true);
});

test('mobile disclosure exposes the same links, closes on Escape and restores focus', async () => {
  render(<App />);
  await screen.findByText('BetCast content');
  const toggle = screen.getByRole('button', { name: 'Εναλλαγή μενού' });
  const menu = screen.getByLabelText('Κύρια πλοήγηση για κινητά');
  expect(menu).toHaveAttribute('id', toggle.getAttribute('aria-controls'));
  expect(menu).not.toBeVisible();
  toggle.focus();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expectCanonicalNavigation(menu);
  within(menu).getByRole('link', { name: 'Αρχική' }).focus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(menu).not.toBeVisible();
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveFocus();
  fireEvent.click(toggle);
  const link = within(menu).getByRole('link', { name: 'Αρχική' });
  link.addEventListener('click', (event) => event.preventDefault(), { once: true });
  fireEvent.click(link);
  expect(menu).not.toBeVisible();
});

test('theme toggle writes only the shared F1Stories key and preserves URL state', async () => {
  window.history.replaceState(null, '', '/?theme=light&from=2&to=4&viz=dataTable');
  localStorage.setItem('betcast_theme', 'light');
  render(<App />);
  await screen.findByText('BetCast content');
  expect(document.body).toHaveClass('light-mode');
  expect(localStorage.getItem('f1stories-theme')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Σκούρο θέμα' }));
  expect(document.body).toHaveClass('dark-mode');
  expect({ ...localStorage }).toEqual({ 'f1stories-theme': 'dark' });
  fireEvent.click(screen.getByRole('button', { name: 'Φωτεινό θέμα' }));
  expect(document.body).toHaveClass('light-mode');
  expect({ ...localStorage }).toEqual({ 'f1stories-theme': 'light' });
  expect(window.location.search).toBe('?theme=light&from=2&to=4&viz=dataTable');
});

test('hides both global components in embed mode', async () => {
  window.history.replaceState(null, '', '/?embed=1');
  render(<App />);
  expect(await screen.findByText('BetCast content')).toBeInTheDocument();
  expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
});


test('mobile menu closes when keyboard focus continues to content without stealing focus', async () => {
  render(<App />);
  await screen.findByText('BetCast content');
  const toggle = screen.getByRole('button', { name: 'Εναλλαγή μενού' });
  const menu = screen.getByLabelText('Κύρια πλοήγηση για κινητά');
  fireEvent.click(toggle);
  const links = within(menu).getAllByRole('link');
  links[0].focus();
  links[1].focus();
  expect(menu).toBeVisible();
  const footerLink = within(screen.getByRole('contentinfo')).getAllByRole('link')[0];
  act(() => footerLink.focus());
  expect(menu).not.toBeVisible();
  expect(footerLink).toHaveFocus();
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('the menu trigger closes a menu after a link had keyboard focus', async () => {
  render(<App />);
  await screen.findByText('BetCast content');
  const toggle = screen.getByRole('button', { name: 'Εναλλαγή μενού' });
  const menu = screen.getByLabelText('Κύρια πλοήγηση για κινητά');
  fireEvent.click(toggle);
  within(menu).getAllByRole('link')[0].focus();
  act(() => toggle.focus());
  expect(menu).toBeVisible();
  fireEvent.click(toggle);
  expect(menu).not.toBeVisible();
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
