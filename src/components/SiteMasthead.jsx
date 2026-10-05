import { siteUrl, betcastUrl } from '../siteUrls';
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const NAV_LINKS = [
  ['Αρχική', siteUrl('/')],
  ['Άρθρα', siteUrl('/blog-module/blog/index.html')],
  ['YouTube', 'https://www.youtube.com/@f1_stories_original'],
  ['Βαθμολογία', siteUrl('/standings/')],
  ['Δεδομένα', siteUrl('/standings/?tab=tyre-pace')],
  ['Συντάκτες', siteUrl('/authors/')],
  ['BetCast', betcastUrl],
];

function NavigationLinks({ onNavigate }) {
  return NAV_LINKS.map(([label, href]) => (
    <a key={label} href={href} aria-current={label === 'BetCast' ? 'page' : undefined}
      target={label === 'YouTube' ? '_blank' : undefined}
      rel={label === 'YouTube' ? 'noopener noreferrer' : undefined} onClick={onNavigate}>
      {label}
    </a>
  ));
}

export default function SiteMasthead() {
  const { isDark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  const nextTheme = isDark ? 'Φωτεινό θέμα' : 'Σκούρο θέμα';

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const desktop = window.matchMedia?.('(min-width: 992px)');
    const onResize = () => setMenuOpen(false);
    document.addEventListener('keydown', onKeyDown);
    desktop?.addEventListener('change', onResize);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      desktop?.removeEventListener('change', onResize);
    };
  }, [menuOpen]);

  return (
    <header className="app-header">
      <div className="container">
        <a className="header-brand" href={siteUrl('/')} aria-label="F1 Stories — Αρχική">
          <img src={`${process.env.PUBLIC_URL}/logo192.png`} alt="" width="38" height="38" />
          <span>F1 STORIES.</span>
        </a>
        <nav className="header-nav" aria-label="Κύρια πλοήγηση">
          <NavigationLinks />
        </nav>
        <div className="header-actions">
          <button className="theme-toggle" type="button" onClick={toggle} aria-label={nextTheme} title={nextTheme}>
            <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true">
              {isDark ? <><circle cx="12" cy="12" r="3.5" /><path d="M12 3v2m0 14v2M3 12h2m14 0h2m-3.36-6.36l-1.41 1.41M6.77 17.23l-1.41 1.41m0-12.46l1.41 1.41m9.9 9.9l1.41 1.41" /></> : <path d="M20 15.5A8 8 0 018.5 4 8 8 0 1020 15.5z" />}
            </svg>
          </button>
          <button ref={menuButton} className="menu-toggle" type="button" aria-label="Εναλλαγή μενού"
            aria-expanded={menuOpen} aria-controls="site-mobile-nav" onClick={() => setMenuOpen((open) => !open)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
      <nav id="site-mobile-nav" className="header-mobile-nav" aria-label="Κύρια πλοήγηση για κινητά" hidden={!menuOpen} onBlur={(event) => {
        if (event.relatedTarget instanceof Node && event.relatedTarget !== menuButton.current && !event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
      }}>
        <NavigationLinks onNavigate={() => setMenuOpen(false)} />
      </nav>
    </header>
  );
}
