import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.articlePresentation) {
        const url = new URL(window.location.href);
        url.searchParams.delete('embed');
        url.searchParams.delete('presentation');
        url.searchParams.delete('theme');
        return (
          <main className="main-content main-content--article-presentation">
            <header className="article-presentation__header"><p className="article-presentation__brand">BETCAST <span aria-hidden="true">·</span> F1 STORIES</p><h1>Η ανάλυση δεν είναι διαθέσιμη</h1></header>
            <div className="inline-error" role="alert"><p>Παρουσιάστηκε σφάλμα κατά την εμφάνιση. Δοκιμάστε ξανά.</p><button className="export-btn" onClick={this.handleRetry}>Επανάληψη</button></div>
            <footer className="article-presentation__footer"><a href={`${url.pathname}${url.search}`} target="_blank" rel="noopener noreferrer">Άνοιγμα BetCast ↗</a></footer>
          </main>
        );
      }
      return (
        <div className="inline-error" role="alert" style={{ margin: '2rem auto', maxWidth: '500px' }}>
          <h2 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>Κάτι πήγε στραβά</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Παρουσιάστηκε σφάλμα κατά την εμφάνιση. Δοκιμάστε ξανά.
          </p>
          <button className="export-btn" onClick={this.handleRetry}>
            Επανάληψη
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
