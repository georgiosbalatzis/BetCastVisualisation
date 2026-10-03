// Same external puppeteer-core / Chrome prerequisites as the existing audits.
// Run `node scripts/visual-audit/tokens.cjs before`, migrate/build, then run `after`.
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../../artifacts/visual-rework/tokens');
const stage = process.argv[2];
const baseUrl = process.env.AUDIT_URL || 'http://localhost:3017/';
assert(['before', 'after'].includes(stage), 'Specify before or after');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function inspectUI(page) {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../docs/design-tokens.json'), 'utf8'));
  const theme = await page.$eval('body', element => element.classList.contains('light-mode') ? 'light' : 'dark');
  const primitives = await page.$eval('body', element => {
    const style = getComputedStyle(element);
    return Object.fromEntries(['--bg-base', '--bg-surface', '--bg-surface-alt', '--text-primary', '--text-secondary', '--border', '--accent', '--signal'].map(token => [token, style.getPropertyValue(token).trim()]));
  });
  for (const [token, value] of Object.entries(primitives)) assert.equal(value, manifest.themes[theme][token], `${theme}: computed ${token}`);
  await page.select('#chart-select', 'budget');
  await pause(300);
  await page.$eval('.stats-details', element => { element.open = true; });
  const collectContrast = () => page.evaluate(() => {
    const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = color => rgb(color).map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const background = element => {
      for (let parent = element; parent; parent = parent.parentElement) {
        const value = getComputedStyle(parent).backgroundColor;
        if (value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') return value;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    return Array.from(document.querySelectorAll('.page-intro, .section-label, .field > span, .scope-context, .primary-metrics dt, .secondary-metrics dt, .last-updated, .data-table th, .data-table td, .stats-details dt, .stats-details dd, .sponsor-strip__label, .sponsor-strip__logos span, .footer-mission, .footer-index a, .footer-links a, .header-nav a, .recharts-cartesian-axis-tick-value')).filter(element => element.getClientRects().length).map(element => {
      const style = getComputedStyle(element), foreground = element instanceof SVGElement ? style.fill : style.color, a = luminance(foreground), b = luminance(background(element));
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
      return { class: element.className, text: element.textContent.trim().slice(0, 48), foreground, background: background(element), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), minimum: large ? 3 : 4.5 };
    });
  });
  const contrast = await collectContrast();
  await page.select('#chart-select', 'dataTable');
  await pause(300);
  contrast.push(...await collectContrast());
  for (const item of contrast) assert(item.ratio >= item.minimum, `${theme}: contrast ${JSON.stringify(item)}`);
  await page.keyboard.press('Tab');
  const focus = [];
  for (const element of await page.$$('header a, header button, main button, main select, main summary, main [tabindex], .sponsor-strip a, footer a')) {
    if (!(await element.evaluate(element => element.getClientRects().length && !element.disabled))) continue;
    await element.evaluate(element => element.scrollIntoView({ block: 'center' }));
    await element.focus();
    const item = await element.evaluate(element => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      const extent = Math.max(0, parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth));
      const clipped = [];
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const ancestor = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
        if (ancestor.overflowX !== 'visible' && (rect.left - extent < bounds.left - .5 || rect.right + extent > bounds.right + .5)) clipped.push(`${parent.className}:x`);
        if (ancestor.overflowY !== 'visible' && (rect.top - extent < bounds.top - .5 || rect.bottom + extent > bounds.bottom + .5)) clipped.push(`${parent.className}:y`);
      }
      return { tag: element.tagName, class: element.getAttribute('class'), visible: element.matches(':focus-visible'), width: style.outlineWidth, style: style.outlineStyle, offset: style.outlineOffset, clipped };
    });
    assert(item.visible && item.width === '2px' && item.style === 'solid', `${theme}: focus ${JSON.stringify(item)}`);
    assert.deepEqual(item.clipped, [], `${theme}: clipped focus ${JSON.stringify(item)}`);
    focus.push(item);
  }
  return { theme, primitives, contrast, focus };
}

(async () => {
  fs.mkdirSync(path.join(out, stage), { recursive: true });
  const browser = await puppeteer.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Hold application scripts until the unchanged webfonts are ready. Recharts
    // caches early text measurements, so waiting after mount alone is insufficient.
    await page.setRequestInterception(true);
    page.on('request', async request => {
      try {
        if (request.resourceType() === 'script' && request.url().startsWith(baseUrl)) {
          await page.waitForFunction(() => Array.from(document.fonts).some(face => face.family.includes('IBM Plex Sans')));
          await page.evaluate(() => Promise.all([
            ...[400, 500, 600, 700].map(weight => document.fonts.load(`${weight} 12px "IBM Plex Sans"`, '0123456789 Στοίχημα Budget')),
            ...[600, 700].map(weight => document.fonts.load(`${weight} 28px "Barlow Condensed"`, 'F1 STORIES BETCAST')),
          ]));
        }
        await request.continue();
      } catch (error) {
        errors.push(error.message);
        if (!request.isInterceptResolutionHandled()) await request.abort();
      }
    });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    let fixture;
    if (stage === 'before') {
      await page.goto(`${baseUrl}?theme=light`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('#chart-select', { timeout: 60000 });
      fixture = await page.evaluate(() => ({ data: sessionStorage.getItem('betcast_data_cache_current'), timestamp: Number(sessionStorage.getItem('betcast_data_cache_ts_current')) }));
      assert(JSON.parse(fixture.data)?.length, 'Capture real fetched data, not sample fallback');
      fs.writeFileSync(path.join(out, 'fixture.json'), JSON.stringify(fixture));
    } else fixture = JSON.parse(fs.readFileSync(path.join(out, 'fixture.json'), 'utf8'));
    await page.evaluateOnNewDocument(seed => {
      Date.now = () => seed.timestamp;
      sessionStorage.setItem('betcast_data_cache_current', seed.data);
      sessionStorage.setItem('betcast_data_cache_ts_current', String(seed.timestamp));
    }, fixture);
    const results = [], uiChecks = [];
    for (const theme of ['light', 'dark']) for (const width of [1440, 1280, 768, 390, 375]) {
      await page.setViewport({ width, height: width < 640 ? 844 : 900 });
      await page.goto(`${baseUrl}?theme=${theme}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#chart-select', { timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      const ids = await page.$$eval('#chart-select option', options => options.map(option => option.value));
      // Recharts measures ticks on mount, sometimes before webfonts finish loading.
      // Remount the first chart after fonts are ready, for both baseline and migration.
      await page.select('#chart-select', ids[1]);
      await pause(300);
      for (const id of ids) {
        await page.select('#chart-select', id);
        await page.$eval('.chart-panel', element => element.scrollIntoView({ block: 'center' }));
        await pause(300);
        // Full-page captures include offscreen lazy media; decode it explicitly.
        await page.$$eval('img', images => Promise.all(images.map(image => {
          image.loading = 'eager';
          return image.decode();
        })));
        await page.evaluate(() => window.scrollTo(0, 0));
        const snapshot = await page.evaluate(() => {
          const round = number => Math.round(number * 100) / 100;
          const visible = element => element.getClientRects().length && getComputedStyle(element).display !== 'none';
          const geometry = Array.from(document.querySelectorAll('.app-header, .app-header .container, .page-title, .page-intro, .scope-bar, .scope-bar *, .metrics, .metrics *, .analysis-heading, .analysis-heading *, .chart-panel, .chart-wrapper, .chart-panel svg *, .data-table-wrap, .data-table *, .analysis-meta, .analysis-meta *, .stats-details, .sponsor-strip, .sponsor-strip *, footer, footer *')).filter(visible).map(element => {
            const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
            return { tag: element.tagName, class: element.getAttribute('class'), x: round(rect.x), y: round(rect.y + window.scrollY), width: round(rect.width), height: round(rect.height), font: style.fontFamily, size: style.fontSize, weight: style.fontWeight, line: style.lineHeight, padding: style.padding, margin: style.margin, border: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth], radius: style.borderRadius, path: element.getAttribute('d') };
          });
          const series = Array.from(document.querySelectorAll('.recharts-bar-rectangle path, .recharts-area-area, .recharts-area-curve, .recharts-line-curve, .recharts-reference-dot circle, .recharts-reference-line line, .recharts-pie-sector path, stop')).map(element => {
            const style = getComputedStyle(element);
            return { class: element.getAttribute('class'), fill: style.fill, stroke: style.stroke, opacity: style.opacity, fillOpacity: style.fillOpacity, strokeOpacity: style.strokeOpacity, stopColor: style.stopColor, stopOpacity: style.stopOpacity };
          });
          return { geometry, series, metrics: document.querySelector('.metrics').innerText, overflow: document.documentElement.scrollWidth > window.innerWidth };
        });
        assert(!snapshot.overflow, `${theme}/${width}/${id}: overflow`);
        results.push({ theme, width, id, ...snapshot });
        if (['budget', 'oddsDistribution', 'dataTable'].includes(id)) await page.screenshot({ path: path.join(out, stage, `${theme}-${width}-${id}.png`), fullPage: true });
      }
      await page.select('#chart-select', 'budget');
      await pause(300);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(out, stage, `${theme}-${width}-top.png`) });
      await page.$eval('.stats-details', element => { element.open = true; element.scrollIntoView({ block: 'center' }); });
      await page.screenshot({ path: path.join(out, stage, `${theme}-${width}-details.png`) });
      await page.$eval('footer', element => element.scrollIntoView({ block: 'end' }));
      await page.screenshot({ path: path.join(out, stage, `${theme}-${width}-footer.png`) });
      if (width < 992) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.focus('.menu-toggle');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.screenshot({ path: path.join(out, stage, `${theme}-${width}-menu-focus.png`) });
        await page.keyboard.press('Escape');
      }
      if (stage === 'after') uiChecks.push({ width, ...await inspectUI(page) });
    }
    if (stage === 'after') {
      for (const preference of ['light', 'dark', 'auto']) for (const os of (preference === 'auto' ? ['light', 'dark'] : ['light'])) {
          await page.evaluate(preference => localStorage.setItem('f1stories-theme', preference), preference);
          await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: os }]);
          await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#chart-select', { timeout: 60000 });
          const expected = preference === 'auto' ? os : preference;
          assert.equal(await page.$eval('body', element => element.className), `${expected}-mode`);
          const checks = await inspectUI(page);
          assert.equal(await page.evaluate(() => localStorage.getItem('f1stories-theme')), preference);
          uiChecks.push({ preference, os, ...checks });
        }
      }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, `${stage}.json`), JSON.stringify({ results, uiChecks, errors }, null, 2));
    if (stage === 'after') {
      const before = JSON.parse(fs.readFileSync(path.join(out, 'before.json'), 'utf8')).results;
      assert.equal(results.length, before.length);
      results.forEach((result, index) => {
        const label = `${result.theme}/${result.width}/${result.id}`;
        assert.deepEqual(result.geometry, before[index].geometry, `${label}: geometry changed`);
        assert.deepEqual(result.series, before[index].series, `${label}: data-series inks changed`);
        assert.equal(result.metrics, before[index].metrics, `${label}: metrics changed`);
      });
    }
    console.log(JSON.stringify({ stage, views: results.length, geometryAndSeriesCompared: stage === 'after', errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
