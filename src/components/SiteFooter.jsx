import React from 'react';

const SocialIcon = ({ href, label, children }) => (
  <a href={href} target={href.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer" aria-label={label}>
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">{children}</svg>
  </a>
);

export default function SiteFooter() {
  return (
    <footer className="app-footer">
      <div className="container">
        <div className="footer-body">
          <div className="footer-colophon">
            <a className="footer-wordmark" href="https://f1stories.gr/" aria-label="F1 Stories, αρχική σελίδα">F1 STORIES<span className="footer-dot">.</span></a>
            <p className="footer-mission">Τεχνική ανάλυση, άποψη και ελληνική F1 κοινότητα.</p>
          </div>
          <nav className="footer-index" aria-label="Ενότητες">
            <a href="https://f1stories.gr/blog-module/blog/index.html">Άρθρα</a>
            <a href="https://f1stories.gr/standings/">Βαθμολογία</a>
            <a href="https://f1stories.gr/authors/">Συντάκτες</a>
            <a href="https://www.youtube.com/@f1_stories_original" target="_blank" rel="noopener noreferrer">YouTube ↗</a>
            <a href="https://georgiosbalatzis.github.io/BetCastVisualisation/" aria-current="page">BetCast</a>
          </nav>
          <p>© {new Date().getFullYear()} F1 Stories. Με επιφύλαξη παντός δικαιώματος.</p>
          <div className="social-media">
            <SocialIcon href="https://www.youtube.com/@f1_stories_original" label="F1 Stories στο YouTube">
              <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.6 31.6 0 000 12a31.6 31.6 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.6 31.6 0 0024 12a31.6 31.6 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
            </SocialIcon>
            <SocialIcon href="https://www.facebook.com/f1storiess" label="F1 Stories στο Facebook">
              <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.33l-.53 3.49h-2.8v8.44C19.61 23.08 24 18.09 24 12.07z"/>
            </SocialIcon>
            <SocialIcon href="https://www.instagram.com/myf1stories/" label="F1 Stories στο Instagram">
              <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.86 3.9 2.31 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.7.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.63-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.41-11.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z"/>
            </SocialIcon>
            <SocialIcon href="https://www.tiktok.com/@f1stories6" label="F1 Stories στο TikTok">
              <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.01 1.52-.04 3.04-.04 4.56-.93-.3-2.01-.15-2.79.39a3.3 3.3 0 00-1.39 2.02c-.08.4-.09.84.01 1.24.25 1.2 1.36 2.2 2.6 2.27 .78.05 1.57-.18 2.15-.68.38-.33.67-.76.82-1.24.08-.29.14-.59.14-.89.02-2.89 0-5.78.01-8.67V.02z"/>
            </SocialIcon>
            <SocialIcon href="mailto:myf1stories@gmail.com" label="Email στο F1 Stories">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </SocialIcon>
          </div>
          <div className="footer-links">
            <a href="https://f1stories.gr/privacy/privacy.html">Πολιτική Απορρήτου</a>
            <span className="footer-separator" aria-hidden="true">|</span>
            <a href="https://f1stories.gr/privacy/terms.html">Όροι Χρήσης</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
