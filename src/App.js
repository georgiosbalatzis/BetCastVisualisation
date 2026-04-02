import React, { Suspense, lazy } from 'react';
import './App.css';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

const lazyWithRetry = (importer, key) => lazy(async () => {
  try {
    const module = await importer();
    try { sessionStorage.removeItem(key); } catch {}
    return module;
  } catch (error) {
    console.error(`Failed to load lazy chunk: ${key}`, error);
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem(key);
    } catch {}
    throw error;
  }
});

const BettingVisualizations = lazyWithRetry(() => import('./components/BetCast'), 'betcast_chunk_retry');

const EMBED_PARAM = 'embed';
const isTruthyParam = (value) => value != null && !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
const getEmbedMode = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const embedValue = params.get(EMBED_PARAM);
  if (embedValue != null) return isTruthyParam(embedValue);
  return window.self !== window.top;
};

// Theme toggle
const MODE_DISPLAY = { auto: { icon: '◐', label: 'Auto', next: 'Dark' }, dark: { icon: '🌙', label: 'Dark', next: 'Light' }, light: { icon: '☀️', label: 'Light', next: 'Auto' } };
function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const { icon, label } = MODE_DISPLAY[mode] || MODE_DISPLAY.auto;
  return (<button className="theme-toggle" onClick={toggle} aria-label={`Theme: ${label}`} title={`→ ${MODE_DISPLAY[mode]?.next}`}><span className="theme-toggle__icon">{icon}</span><span className="theme-toggle__label">{label}</span></button>);
}

// #14 — Inline SVG social icons (eliminates 82KB Font Awesome dependency)
const SocialIcon = ({ href, label, children, ...props }) => (
  <a href={href} target={href.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer" aria-label={label} {...props}>
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">{children}</svg>
  </a>
);

function AppContent({ embedded }) {
  return (
    <div className={`App${embedded ? ' App--embedded' : ''}`}>
      {!embedded && (
        <header className="app-header">
          <div className="container">
            <div className="header-brand">
              <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="F1 Stories Logo" />
              <h1>BetCast F1Stories</h1>
            </div>
            <div className="header-actions">
              <span className="header-meta">Powered by Georgios Balatzis &amp; F1 Stories</span>
              <ThemeToggle />
            </div>
          </div>
        </header>
      )}

      <ErrorBoundary>
        <Suspense fallback={<VisualizationFallback embedded={embedded} />}>
          <BettingVisualizations embedded={embedded} />
        </Suspense>
      </ErrorBoundary>

      {!embedded && (
        <footer className="app-footer">
          <div className="container">
            <p>© {new Date().getFullYear()} BetCast - Αναλυτικά Στατιστικά Στοιχημάτων</p>
            <p className="mt-sub"><a href="https://f1stories.gr" target="_blank" rel="noopener noreferrer">F1Stories.gr</a></p>
            <div className="social-media">
              <SocialIcon href="https://www.youtube.com/@F1_Stories_Original" label="YouTube">
                <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.6 31.6 0 000 12a31.6 31.6 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.6 31.6 0 0024 12a31.6 31.6 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
              </SocialIcon>
              <SocialIcon href="https://www.facebook.com/f1storiess" label="Facebook">
                <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.33l-.53 3.49h-2.8v8.44C19.61 23.08 24 18.09 24 12.07z"/>
              </SocialIcon>
              <SocialIcon href="https://www.instagram.com/myf1stories/" label="Instagram">
                <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.86 3.9 2.31 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.7.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.63-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.41-11.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z"/>
              </SocialIcon>
              <SocialIcon href="https://www.tiktok.com/@f1stories6" label="TikTok">
                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.01 1.52-.04 3.04-.04 4.56-.93-.3-2.01-.15-2.79.39a3.3 3.3 0 00-1.39 2.02c-.08.4-.09.84.01 1.24.25 1.2 1.36 2.2 2.6 2.27 .78.05 1.57-.18 2.15-.68.38-.33.67-.76.82-1.24.08-.29.14-.59.14-.89.02-2.89 0-5.78.01-8.67V.02z"/>
              </SocialIcon>
              <SocialIcon href="mailto:myf1stories@gmail.com" label="Email">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </SocialIcon>
              <SocialIcon href="https://open.spotify.com/show/0qC80ahDY824BME9FtxryS?si=bae4f48cf1ee4ded" label="Spotify">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-.99-.12-1.11-.6-.12-.48.12-.99.6-1.11 4.38-1.32 9.78-.66 13.5 1.62.36.18.54.78.21 1.17zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-.96.6-1.56.3z"/>
              </SocialIcon>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

function VisualizationFallback({ embedded }) {
  return (
    <div className={`main-content${embedded ? ' main-content--embedded' : ''}`}>
      <div className="card mb-section">
        <div className="skeleton" style={{ width: '10rem', height: '1.25rem', marginBottom: '1rem' }} />
        <div className="stats-grid">
          {[...Array(5)].map((_, index) => <div key={index} className="skeleton skeleton-stat" />)}
        </div>
      </div>
      <div className="card mb-section">
        <div className="skeleton skeleton-chart" />
      </div>
    </div>
  );
}

function App() {
  const embedded = getEmbedMode();
  return (<ThemeProvider><AppContent embedded={embedded} /></ThemeProvider>);
}

export default App;
