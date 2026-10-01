import React, { Suspense, lazy } from 'react';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import SiteMasthead from './components/SiteMasthead';
import SponsorStrip from './components/SponsorStrip';
import SiteFooter from './components/SiteFooter';
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

function AppContent({ embedded }) {
  return (
    <div className={`App${embedded ? ' App--embedded' : ''}`}>
      {!embedded && <SiteMasthead />}
      <ErrorBoundary>
        <Suspense fallback={<VisualizationFallback embedded={embedded} />}>
          <BettingVisualizations embedded={embedded} />
        </Suspense>
      </ErrorBoundary>
      {!embedded && <>
        <SponsorStrip />
        <SiteFooter />
      </>}
    </div>
  );
}

function VisualizationFallback({ embedded }) {
  return (
    <main className={`main-content${embedded ? ' main-content--embedded' : ''}`} aria-busy="true">
      <div className="page-toolbar"><div className="page-toolbar__heading"><h1 className="page-title">BETCAST<span className="brand-dot">.</span></h1><p className="page-intro">Στοιχηματική ανάλυση. Κάθε επιλογή, κάθε εβδομάδα.</p></div></div>
      <section className="scope-bar loading-scope" aria-label="Φόρτωση φίλτρων"><span className="skeleton skeleton-control" /><span className="skeleton skeleton-control" /><span className="skeleton skeleton-control" /></section>
      <section className="metrics loading-metrics" aria-label="Φόρτωση σύνοψης"><div className="skeleton skeleton-value" /><div className="skeleton skeleton-value" /></section>
      <section className="analysis-section loading-analysis"><div className="analysis-heading"><span className="section-label">02 / ΑΝΑΛΥΣΗ</span><span className="skeleton skeleton-selector" /></div><p role="status" className="state-copy">Φόρτωση στοιχημάτων…</p><div className="skeleton skeleton-chart" /></section>
    </main>
  );
}

function App() {
  const embedded = getEmbedMode();
  return (<ThemeProvider><AppContent embedded={embedded} /></ThemeProvider>);
}

export default App;
