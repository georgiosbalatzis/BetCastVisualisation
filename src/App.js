import React, { useEffect } from 'react';
import './App.css';
import BettingVisualizations from './components/BetCast';

// Dark mode is currently the only supported theme.
// When a toggle is added, convert this to useState and wire it through context.
const DARK_MODE = true;

function App() {
  useEffect(() => {
    document.body.className = DARK_MODE ? 'dark-mode' : 'light-mode';
  }, []);

  return (
    <div className="App">
      <header className="app-header">
        <div className="container">
          <div className="header-brand">
            <img
              src={`${process.env.PUBLIC_URL}/logo.png`}
              alt="F1 Stories Logo"
            />
            <h1>BetCast F1Stories</h1>
          </div>
          <div className="header-meta">
            Powered by Georgios Balatzis &amp; F1 Stories
          </div>
        </div>
      </header>

      <BettingVisualizations />

      <footer className="app-footer">
        <div className="container">
          <p>© {new Date().getFullYear()} BetCast - Αναλυτικά Στατιστικά Στοιχημάτων</p>
          <p className="mt-sub">
            <a
              href="https://f1stories.gr"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit us at F1Stories.gr
            </a>
          </p>
          <div className="social-media">
            <a href="https://www.youtube.com/@F1_Stories_Original" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <i className="fab fa-youtube"></i>
            </a>
            <a href="https://www.facebook.com/f1storiess" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="https://www.instagram.com/myf1stories/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://www.tiktok.com/@f1stories6" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <i className="fab fa-tiktok"></i>
            </a>
            <a href="mailto:myf1stories@gmail.com" aria-label="Email">
              <i className="fas fa-envelope"></i>
            </a>
            <a href="https://open.spotify.com/show/0qC80ahDY824BME9FtxryS?si=bae4f48cf1ee4ded" target="_blank" rel="noopener noreferrer" aria-label="Spotify">
              <i className="fab fa-spotify"></i>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
