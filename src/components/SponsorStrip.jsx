import React from 'react';

const sponsors = [
  ['Μπαλατζής Χωματουργικά', 'ΧΟΡΗΓΟΣ', 'https://balatzis.gr/', 'Balatzis.webp'],
  ['Πουρτσίδης Γεννήτριες', 'ΣΥΝΕΡΓΑΤΗΣ', 'https://pourtsidisgenerators.gr/', 'ps.webp'],
  ['Μπαλατζής Δομικά', 'POWERED BY', 'https://balatzis.gr/#domika', 'BalatzisDomika.webp'],
  ['Αμβροσιάδης', 'ΣΥΝΕΡΓΑΤΗΣ', 'https://ambrosiadis.gr/', 'am.webp'],
  ['Bed and Home', 'ADVERTISING PARTNER', 'https://www.bedandhome.gr/', 'bedhome.webp'],
  ['Grand Realm', 'ΣΥΝΕΡΓΑΤΗΣ', 'https://www.grandrealm.gr/', 'GrandRealm.webp'],
];

export default function SponsorStrip() {
  return (
    <section className="sponsor-strip" aria-labelledby="sponsor-strip-heading">
      <div className="container sponsor-strip__layout">
        <h2 id="sponsor-strip-heading" className="sponsor-strip__label">ΜΑΖΙ ΣΤΗΝ ΕΚΚΙΝΗΣΗ</h2>
        <ul className="sponsor-strip__logos">
          {sponsors.map(([name, relation, href, image]) => (
            <li key={name}>
              <a href={href} target="_blank" rel="noopener noreferrer sponsored" aria-label={`${name} — ${relation}`}>
                <img src={`${process.env.PUBLIC_URL}/sponsors/${image}`} alt={name} width="320" height="160" loading="lazy" decoding="async" />
                <span>{relation}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
