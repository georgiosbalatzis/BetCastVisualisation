import React from 'react';
import { DATA_SOURCES, VIZ_OPTIONS, rendererTitles } from './loadingMetadata';

// Keep the loading geometry governed by the same rules as the populated dashboard.
export default function LoadingDashboard({ embedded, dataSource = 'current', weekFrom = null, weekTo = null, highlightedWeek = null, selectedViz = 'budget', allWeeks = [], focusRef }) {
  const viz = VIZ_OPTIONS.find(option => option.id === selectedViz) || VIZ_OPTIONS[0];
  const scope = weekFrom == null && weekTo == null ? 'Όλες οι εβδομάδες' : `Εβδ. ${weekFrom ?? 1}–${weekTo ?? allWeeks[allWeeks.length - 1] ?? ''}`;
  return (
    <main ref={focusRef} tabIndex={focusRef ? -1 : undefined} className={`main-content${embedded ? ' main-content--embedded' : ' main-content--with-sponsors'}`} aria-busy="true">
      <div className="page-toolbar"><div className="page-toolbar__heading"><h1 className="page-title">BETCAST<span className="brand-dot">.</span></h1><p className="page-intro">Στοιχηματική ανάλυση. Κάθε επιλογή, κάθε εβδομάδα.</p></div></div>
      <div className="scope-bar" aria-hidden="true">
        <div className="field"><span>Σεζόν</span><select disabled tabIndex="-1"><option>{DATA_SOURCES[dataSource]?.label || DATA_SOURCES.current.label}</option></select></div>
        {!embedded && <><div className="field"><span>Από εβδομάδα</span><select disabled tabIndex="-1"><option>{weekFrom ?? 'Όλες'}</option></select></div><div className="field"><span>Έως εβδομάδα</span><select disabled tabIndex="-1"><option>{weekTo ?? 'Όλες'}</option></select></div></>}
        <div className="scope-context"><span>{scope}</span>{(weekFrom != null || weekTo != null) && !embedded && <button className="text-action" disabled tabIndex="-1">Καθαρισμός</button>}</div>
      </div>
      <div className="metrics" aria-hidden="true">
        <dl className="primary-metrics"><div><dt>Budget <span>Διαθέσιμο ποσό</span></dt><dd className="loading-value"></dd></div><div><dt>ROI <span>Απόδοση πονταρίσματος</span></dt><dd className="loading-value"></dd></div></dl>
        <dl className="secondary-metrics"><div><dt>Στοιχήματα</dt><dd className="loading-value"></dd></div><div><dt>Νίκες</dt><dd className="loading-value"></dd></div><div><dt>Ποσοστό νικών</dt><dd className="loading-value"></dd></div></dl>
      </div>
      <div className="analysis-section">
        <div className="analysis-heading" aria-hidden="true"><span className="section-label">02 / ΑΝΑΛΥΣΗ</span><div className="chart-selector field"><span>Προβολή</span><select disabled tabIndex="-1"><option>{viz.name}</option></select></div></div>
        {highlightedWeek != null && <p className="week-highlight-notice" aria-hidden="true">Επιλεγμένη εβδομάδα: {highlightedWeek} <button className="text-action" disabled tabIndex="-1">Καθαρισμός</button></p>}
        <div className="chart-panel"><div className="card mb-section"><div className="card-chart-title" aria-hidden="true">{rendererTitles[viz.id]}</div><div className="chart-wrapper loading-chart"><p role="status" className="state-copy">Φόρτωση στοιχημάτων…</p></div></div></div>
      </div>
    </main>
  );
}
