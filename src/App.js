import React, { Suspense, lazy } from 'react';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import SiteMasthead from './components/SiteMasthead';
import SponsorStrip from './components/SponsorStrip';
import SiteFooter from './components/SiteFooter';
import ErrorBoundary from './components/ErrorBoundary';
import EmbedFrameBridge from './components/EmbedFrameBridge';

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

const getArticlePresentation = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return isTruthyParam(params.get('embed')) && params.get('presentation') === 'article';
};

function AppContent({ embedded, articlePresentation }) {
  return (
    <div className={`App${embedded ? ' App--embedded' : ''}`}>
      {!embedded && <SiteMasthead />}
      <EmbedFrameBridge embedded={embedded}>
        <ErrorBoundary articlePresentation={articlePresentation}>
          <Suspense fallback={<VisualizationFallback embedded={embedded} articlePresentation={articlePresentation} />}>
            <BettingVisualizations embedded={embedded} articlePresentation={articlePresentation} />
          </Suspense>
        </ErrorBoundary>
      </EmbedFrameBridge>
      {!embedded && <>
        <SponsorStrip />
        <SiteFooter />
      </>}
    </div>
  );
}

function VisualizationFallback({ embedded, articlePresentation }) {
  if (articlePresentation) {
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from');
    const to = params.get('to');
    const week = params.get('week');
    const scope = [params.get('season') === 'lastYear' ? 'Πέρσι' : params.get('season') || 'Φέτος'];
    if (from || to) scope.push(from && to ? `Εβδ. ${from}–${to}` : from ? `Από εβδ. ${from}` : `Έως εβδ. ${to}`);
    if (week) scope.push(`Εβδ. ${week}`);
    if (!from && !to && !week) scope.push('Όλες οι εβδομάδες');
    const title = ({ budget: 'Εξέλιξη Budget', weeklyProfit: 'Εβδομ. Κέρδη', winLossRatio: 'Νίκες/Ήττες', oddsDistribution: 'Αποδόσεις', profitByOdds: 'Κέρδος ανά απόδοση', evTracking: 'Αναμενόμενη αξία', kelly: 'Kelly', betSize: 'Ποντάρισμα', winRateByWeek: 'Ποσοστό νικών', weeklyROI: 'Εβδομ. ROI', cumulativeROI: 'Συνολ. ROI', compareWeeks: 'Σύγκριση', dataTable: 'Πίνακας' })[params.get('viz') || 'budget'] || 'Ανάλυση στοιχημάτων';
    const fullAppUrl = new URL(window.location.href);
    ['embed', 'presentation', 'theme'].forEach((key) => fullAppUrl.searchParams.delete(key));
    return (
      <main className="main-content main-content--article-presentation" aria-busy="true">
        <header className="article-presentation__header"><p className="article-presentation__brand">BETCAST <span aria-hidden="true">·</span> F1 STORIES</p><h1>{title}</h1><p className="article-presentation__scope">{scope.join(' · ')}</p></header>
        <p role="status" className="state-copy">Φόρτωση στοιχημάτων…</p>
        <div className="skeleton skeleton-chart" />
        <footer className="article-presentation__footer"><a href={`${fullAppUrl.pathname}${fullAppUrl.search}`} target="_blank" rel="noopener noreferrer">Άνοιγμα BetCast ↗</a></footer>
      </main>
    );
  }
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
  const articlePresentation = embedded && getArticlePresentation();
  return (<ThemeProvider><AppContent embedded={embedded} articlePresentation={articlePresentation} /></ThemeProvider>);
}

export default App;
