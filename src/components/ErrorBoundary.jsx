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
