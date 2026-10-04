// Optional external puppeteer-core / Chrome prerequisites: docs/visual-design.md.
// Capture `before`, rebuild, then run `after`. Never sends a share externally.
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../../artifacts/visual-rework/interactions');
const stage = process.argv[2];
const base = process.env.AUDIT_URL || 'http://localhost:3017/';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
assert(['before', 'after'].includes(stage), 'Specify before or after');

async function snapshot(page) {
  return page.evaluate(() => {
    const round = n => Math.round(n * 100) / 100;
    const bounds = el => {
      const r = el.getBoundingClientRect();
      return { x: round(r.x), y: round(r.y + window.scrollY), width: round(r.width), height: round(r.height) };
    };
    const visible = el => el.getClientRects().length > 0;
    const controls = [...document.querySelectorAll('a, button, select, summary, [tabindex]')].filter(visible).map(el => {
      const visual = bounds(el), pseudo = getComputedStyle(el, '::after');
      const expanded = el.matches('.text-action') && pseudo.content !== 'none';
      const width = expanded ? parseFloat(pseudo.width) : visual.width;
      const height = expanded ? parseFloat(pseudo.height) : visual.height;
      const labels = [...el.labels || []].map(label => label.querySelector('span')?.textContent || label.textContent.split('\n')[0]);
      return { tag: el.tagName, class: el.className.baseVal ?? el.className, id: el.id,
        name: el.getAttribute('aria-label') || labels.join(' ') || el.textContent.trim(),
        disabled: !!el.disabled, visual,
        hit: { x: round(visual.x + (visual.width - width) / 2), y: round(visual.y + (visual.height - height) / 2), width: round(width), height: round(height) } };
    });
    const regions = Object.fromEntries(['.app-header', '.scope-bar', '.analysis-heading', '.chart-panel', '.chart-wrapper', '.data-table-wrap', '.compare-table', '.analysis-meta', '.toolbar-share-group', 'footer'].map(selector => [selector, document.querySelector(selector) ? bounds(document.querySelector(selector)) : null]));
    const panel = document.querySelector('.chart-panel').getBoundingClientRect();
    const chart = [...document.querySelectorAll('.chart-panel svg *')].map(el => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return { tag: el.tagName, class: el.getAttribute('class'), path: el.getAttribute('d'),
        x: round(r.x - panel.x), y: round(r.y - panel.y), width: round(r.width), height: round(r.height),
        fill: s.fill, stroke: s.stroke, opacity: s.opacity, fillOpacity: s.fillOpacity, stopColor: s.stopColor, stopOpacity: s.stopOpacity };
    });
    return { controls, regions, chart, metrics: document.querySelector('.metrics').innerText,
      table: document.querySelector('.data-table-wrap')?.innerText,
      comparison: document.querySelector('.compare-table')?.innerText,
      overflow: document.documentElement.scrollWidth > window.innerWidth };
  });
}

async function accessibility(page, enforce) {
  const cdp = await page.createCDPSession();
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const controls = nodes.filter(node => ['combobox', 'button', 'link', 'DisclosureTriangle'].includes(node.role?.value)).map(node => ({ role: node.role.value, name: node.name?.value || '' }));
  if (enforce) assert(controls.every(control => control.name.trim()), `Unnamed control: ${JSON.stringify(controls)}`);
  return controls;
}

async function checkFocusAndContrast(page) {
  await page.keyboard.press('Tab');
  const results = [];
  for (const el of await page.$$('a, button, select, summary, [tabindex]')) {
    if (!(await el.evaluate(el => el.getClientRects().length && !el.disabled && el.tabIndex >= 0))) continue;
    await el.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await el.focus();
    const result = await el.evaluate(el => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      const extent = Math.max(0, parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth));
      const clipped = [];
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const ps = getComputedStyle(parent), pr = parent.getBoundingClientRect();
        if (ps.overflowX !== 'visible' && (r.left - extent < pr.left - .5 || r.right + extent > pr.right + .5)) clipped.push(`${parent.className}:x`);
        if (ps.overflowY !== 'visible' && (r.top - extent < pr.top - .5 || r.bottom + extent > pr.bottom + .5)) clipped.push(`${parent.className}:y`);
      }
      const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = rgb => rgb.map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
      let bg;
      for (let parent = el; parent; parent = parent.parentElement) {
        const color = getComputedStyle(parent).backgroundColor;
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') { bg = rgb(color); break; }
      }
      bg ||= rgb(getComputedStyle(document.body).backgroundColor);
      return { tag: el.tagName, class: el.getAttribute('class'), name: el.getAttribute('aria-label') || el.id || el.textContent.trim().slice(0, 40),
        focus: el.matches(':focus-visible'), outline: s.outlineWidth, style: s.outlineStyle, offset: s.outlineOffset,
        clipped, textContrast: ratio(rgb(s.color), bg), focusContrast: ratio(rgb(s.outlineColor), bg),
        overflow: document.documentElement.scrollWidth > window.innerWidth };
    });
    assert(result.focus && result.outline === '2px' && result.style === 'solid', JSON.stringify(result));
    assert.deepEqual(result.clipped, [], JSON.stringify(result));
    assert(!result.overflow, JSON.stringify(result));
    assert(result.textContrast >= 4.5 && result.focusContrast >= 3, JSON.stringify(result));
    if (result.tag === 'TH') assert.equal(result.offset, '-3px');
    results.push(result);
  }
  return results;
}

async function checkHitAreas(page) {
  const selectors = 'main select, main .text-action, main .export-btn, main .filter-reset-btn, .table-pagination button';
  const results = [];
  for (const el of await page.$$(selectors)) {
    await el.evaluate(el => el.scrollIntoView({ block: 'center' }));
    const result = await el.evaluate(el => {
      const r = el.getBoundingClientRect(), pseudo = getComputedStyle(el, '::after');
      const expanded = el.matches('.text-action') && pseudo.content !== 'none';
      const width = expanded ? parseFloat(pseudo.width) : r.width;
      const height = expanded ? parseFloat(pseudo.height) : r.height;
      const left = r.x + (r.width - width) / 2, top = r.y + (r.height - height) / 2;
      const points = [[left + 1, top + 1], [left + width - 1, top + 1], [left + 1, top + height - 1], [left + width - 1, top + height - 1]];
      const hits = el.disabled ? [] : points.map(([x, y]) => { const hit = document.elementFromPoint(x, y); return hit === el || el.contains(hit); });
      return { name: el.getAttribute('aria-label') || el.id || el.textContent.trim().slice(0, 30), width, height, hits, disabled: el.disabled };
    });
    assert(result.width >= 44 && result.height >= 44, JSON.stringify(result));
    assert(result.hits.every(Boolean), `Occluded expanded target: ${JSON.stringify(result)}`);
    results.push(result);
  }
  return results;
}

(async () => {
  fs.mkdirSync(path.join(out, stage), { recursive: true });
  const browser = await puppeteer.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const page = await browser.newPage(), errors = [], results = [], checks = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    // Load the existing fonts before application mount to stabilize Recharts ticks.
    await page.setRequestInterception(true);
    page.on('request', async request => {
      try {
        if (request.resourceType() === 'script' && request.url().startsWith(base)) {
          await page.waitForFunction(() => Array.from(document.fonts).some(face => face.family.includes('IBM Plex Sans')));
          await page.evaluate(() => Promise.all([
            ...[400, 500, 600, 700].map(weight => document.fonts.load(`${weight} 12px "IBM Plex Sans"`, '0123456789 Στοίχημα Budget')),
            ...[600, 700].map(weight => document.fonts.load(`${weight} 28px "Barlow Condensed"`, 'F1 STORIES BETCAST')),
          ]));
        }
        await request.continue();
      } catch (error) { errors.push(error.message); if (!request.isInterceptResolutionHandled()) await request.abort(); }
    });
    let fixture;
    if (stage === 'before') {
      await page.goto(base, { waitUntil: 'networkidle2' });
      await page.waitForSelector('#chart-select', { timeout: 60000 });
      fixture = await page.evaluate(() => ({ data: sessionStorage.getItem('betcast_data_cache_current'), timestamp: Date.now() }));
      assert(JSON.parse(fixture.data)?.length, 'Use real sheet data rather than sample fallback');
      fs.writeFileSync(path.join(out, 'fixture.json'), JSON.stringify(fixture));
    } else fixture = JSON.parse(fs.readFileSync(path.join(out, 'fixture.json')));
    await page.evaluateOnNewDocument(seed => {
      Date.now = () => seed.timestamp;
      sessionStorage.setItem('betcast_data_cache_current', seed.data);
      sessionStorage.setItem('betcast_data_cache_ts_current', String(seed.timestamp));
    }, fixture);
    for (const theme of ['light', 'dark']) for (const width of [1440, 1280, 768, 390, 375, 320]) {
      const touch = width <= 768;
      await page.setViewport({ width, height: width < 640 ? 844 : 900, isMobile: width < 640, hasTouch: touch });
      await page.goto(`${base}?theme=${theme}&cmpA=2&cmpB=3`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#chart-select', { timeout: 60000 });
      const ids = await page.$$eval('#chart-select option', options => options.map(option => option.value));
      for (const id of ids) {
        await page.select('#chart-select', id);
        await page.$eval('.chart-panel', el => el.scrollIntoView({ block: 'center' }));
        await pause(250);
        await page.$$eval('img', images => Promise.all(images.map(img => { img.loading = 'eager'; return img.decode(); })));
        await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
        const data = await snapshot(page);
        assert(!data.overflow, `${theme}/${width}/${id}: overflow`);
        results.push({ theme, width, id, ...data });
        if (['budget', 'oddsDistribution', 'dataTable', 'compareWeeks'].includes(id)) {
          await page.screenshot({ path: path.join(out, stage, `${theme}-${width}-${id}.png`), fullPage: true });
          const names = await accessibility(page, stage === 'after');
          if (stage === 'after') {
            const targets = touch ? await checkHitAreas(page) : [];
            const focus = await checkFocusAndContrast(page);
            checks.push({ theme, width, id, names, targets, focus });
          } else checks.push({ theme, width, id, names });
        }
      }
      await page.select('#chart-select', 'budget');
      // changeViz schedules its scroll after 100ms; let it finish before the
      // top/footer captures so the screenshot cannot race that existing timer.
      await pause(250);
      await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
      await page.screenshot({ path: path.join(out, stage, `${theme}-${width}-top.png`) });
      await page.$eval('footer', el => el.scrollIntoView({ block: 'end' }));
      await page.screenshot({ path: path.join(out, stage, `${theme}-${width}-footer.png`) });
      if (width < 992) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.focus('.menu-toggle'); await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
        await page.screenshot({ path: path.join(out, stage, `${theme}-${width}-menu.png`) });
        await page.keyboard.press('Escape');
        assert(await page.$eval('.menu-toggle', el => el === document.activeElement));
      }
    }
    fs.writeFileSync(path.join(out, `${stage}.json`), JSON.stringify({ results, checks, errors }, null, 2));
    if (stage === 'after') {
      const before = JSON.parse(fs.readFileSync(path.join(out, 'before.json'))).results;
      const comparison = results.map((result, i) => {
        const previous = before[i], label = `${result.theme}/${result.width}/${result.id}`;
        assert.equal(result.metrics, previous.metrics, `${label}: metrics changed`);
        assert.equal(result.table, previous.table, `${label}: table changed`);
        assert.equal(result.comparison, previous.comparison, `${label}: comparison data changed`);
        // SVG definitions/empty groups have a viewport-origin zero rect, not
        // chart geometry. Normalize only their meaningless panel-relative origin.
        // The table's only SVG is the CSV button icon, centered in its taller
        // touch target. Its shape/inks/size must stay identical, not its origin.
        const chartGeometry = chart => chart.map(item => result.id === 'dataTable' || (item.width === 0 && item.height === 0) ? { ...item, x: 0, y: 0 } : item);
        assert.deepEqual(chartGeometry(result.chart), chartGeometry(previous.chart), `${label}: chart geometry/inks changed`);
        assert.equal(result.regions['.app-header'].height, previous.regions['.app-header'].height);
        for (const region of ['.scope-bar', '.analysis-heading', '.chart-panel', '.chart-wrapper', '.data-table-wrap', '.compare-table', '.analysis-meta', 'footer']) {
          if (result.regions[region]) assert.equal(result.regions[region].width, previous.regions[region].width, `${label}: ${region} width`);
        }
        if (result.width >= 1280) assert.deepEqual(result.regions, previous.regions, `${label}: desktop geometry changed`);
        assert.equal(result.controls.length, previous.controls.length);
        const controls = result.controls.map((control, index) => ({ name: control.name, before: previous.controls[index].visual, after: control.visual, beforeHit: previous.controls[index].hit, afterHit: control.hit }));
        const regions = Object.fromEntries(Object.entries(result.regions).filter(([, rect]) => rect).map(([key, rect]) => [key, { before: previous.regions[key], after: rect }]));
        return { label, controls, regions };
      });
      fs.writeFileSync(path.join(out, 'comparison.json'), JSON.stringify(comparison, null, 2));
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ stage, views: results.length, interactionStates: checks.length, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
