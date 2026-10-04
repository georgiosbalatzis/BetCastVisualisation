// Focused touch/keyboard flows. Same optional prerequisites as interactions.cjs.
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../../artifacts/visual-rework/interactions');
const base = process.env.AUDIT_URL || 'http://localhost:3017/';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function tapTarget(page, selector, outsideVisual = false) {
  await page.$eval(selector, el => el.scrollIntoView({ block: 'center' }));
  const point = await page.$eval(selector, (el, outside) => {
    const r = el.getBoundingClientRect(), pseudo = getComputedStyle(el, '::after');
    const width = el.matches('.text-action') ? parseFloat(pseudo.width) : r.width;
    const height = el.matches('.text-action') ? parseFloat(pseudo.height) : r.height;
    const x = r.x + (r.width - width) / 2 + 1, y = r.y + (r.height - height) / 2 + 1;
    const hit = document.elementFromPoint(x, y);
    return { x, y, width, height, hit: hit === el || el.contains(hit), outside: x < r.left || y < r.top, requiredOutside: outside };
  }, outsideVisual);
  assert(point.width >= 44 && point.height >= 44 && point.hit, JSON.stringify(point));
  if (outsideVisual) assert(point.outside, 'Tap must exercise the transparent extension');
  await page.touchscreen.tap(point.x, point.y);
  return point;
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, protocolTimeout: 60000, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const page = await browser.newPage(), errors = [], results = [];
    page.on('pageerror', error => errors.push(error.message));
    const seed = JSON.parse(fs.readFileSync(path.join(out, 'fixture.json')));
    await page.evaluateOnNewDocument(seed => {
      Date.now = () => seed.timestamp;
      sessionStorage.setItem('betcast_data_cache_current', seed.data);
      sessionStorage.setItem('betcast_data_cache_ts_current', String(seed.timestamp));
    }, seed);
    const open = async query => {
      await page.goto(base + query, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#chart-select', { timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
    };
    // Finish the initial font load before later navigations. Interrupting an
    // in-flight webfont request on a throwaway visit can strand fonts.ready.
    await open('?theme=light');
    for (const width of [390, 375, 320]) for (const [preference, os] of [['light', 'light'], ['dark', 'dark'], ['auto', 'light'], ['auto', 'dark']]) {
      console.log(`Touch flow ${width}/${preference}/${os}`);
      await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true });
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: os }]);
      await page.evaluate(preference => localStorage.setItem('f1stories-theme', preference), preference);
      await open('?viz=dataTable&from=2&to=4&week=3&cmpA=2&cmpB=3');
      assert.equal(await page.$eval('body', el => el.className), `${preference === 'auto' ? os : preference}-mode`);
      await page.evaluate(() => {
        window.copied = [];
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => window.copied.push(text) } });
        Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      });
      const share = '.toolbar-share-group button:first-child', link = '.toolbar-share-group button:nth-child(2)', embed = '.toolbar-share-group button:nth-child(3)';
      const linkHit = await tapTarget(page, link, true);
      await page.waitForFunction(() => window.copied.length === 1);
      const expected = `${base}?viz=dataTable&from=2&to=4&week=3&cmpA=2&cmpB=3`;
      assert.equal(await page.evaluate(() => window.copied[0]), expected);
      await page.focus(link); await page.keyboard.press('Space');
      await page.waitForFunction(() => window.copied.length === 2);
      assert(await page.$eval(link, el => el === document.activeElement));
      await tapTarget(page, embed, true);
      await page.waitForFunction(() => window.copied.length === 3);
      const snippet = await page.evaluate(() => window.copied[2]);
      const src = snippet.match(/src="([^"]+)"/)[1];
      assert.equal(src, expected + `&embed=1&theme=${preference === 'auto' ? os : preference}`);
      assert(snippet.includes('title="BetCast F1 Stories"'));
      const shareHit = await tapTarget(page, share, true);
      await page.waitForFunction(() => window.copied.length === 4);
      assert.equal(await page.evaluate(() => window.copied[3]), expected);
      // Native sharing is stubbed; test the pending promise without an external recipient.
      await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: payload => { window.shared = payload; return new Promise(resolve => { window.resolveShare = resolve; }); } }));
      await page.focus(share); await page.keyboard.press('Enter');
      await page.waitForFunction(() => !!window.resolveShare);
      assert.deepEqual(await page.evaluate(() => window.shared), { title: 'BetCast Stats', url: expected });
      assert(await page.$eval(share, el => el === document.activeElement));
      await page.evaluate(() => window.resolveShare());
      await page.waitForFunction(() => document.querySelector('.share-feedback').textContent === 'Το link κοινοποιήθηκε.');
      assert(await page.$eval(share, el => el === document.activeElement));
      // Clipboard fallback must preserve payload, clean up and restore keyboard focus.
      for (const success of [true, false]) {
        await page.evaluate(success => {
          navigator.clipboard.writeText = async () => { throw new Error('Permission denied'); };
          document.execCommand = () => { window.fallbackText = document.querySelector('textarea').value; return success; };
        }, success);
        await page.focus(link); await page.keyboard.press('Enter');
        await page.waitForFunction(success => document.querySelector('.share-feedback').textContent === (success ? 'Το link αντιγράφηκε.' : 'Δεν ήταν δυνατή η αντιγραφή του link.'), {}, success);
        assert.equal(await page.evaluate(() => window.fallbackText), expected);
        assert(await page.$eval(link, el => el === document.activeElement && el.matches(':focus-visible')));
        assert.equal(await page.$('textarea'), null);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      }
      await page.screenshot({ path: path.join(out, 'after', `${preference}-${os}-${width}-share-focus.png`) });
      // Native selectors, narrow reset controls and the expanded inline resets.
      assert.equal(await page.$eval('#chart-select', el => el.labels[0].querySelector('span').textContent), 'Προβολή');
      const resetHit = await tapTarget(page, '.filter-reset-btn');
      await page.waitForFunction(() => document.querySelector('#table-week-filter').value === '');
      const rangeResetHit = await tapTarget(page, '.scope-context button', true);
      await page.waitForFunction(() => !new URLSearchParams(window.location.search).has('from'));
      await page.select('#table-week-filter', '3');
      await tapTarget(page, '.week-highlight-notice button', true);
      await page.waitForFunction(() => document.querySelector('#table-week-filter').value === '');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      assert.equal(await page.evaluate(() => localStorage.getItem('f1stories-theme')), preference);
      results.push({ width, preference, os, linkHit, shareHit, resetHit, rangeResetHit, fallbackFocus: true });
    }
    // Verify actual tab order and native disabled pagination on mouse + touch.
    const keyboard = [];
    for (const width of [1440, 390]) {
      await page.setViewport({ width, height: 900, isMobile: width < 640, hasTouch: width < 640 });
      await open('?viz=dataTable&theme=dark');
      await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
      const order = [];
      const total = await page.$$eval('a, button, select, summary, [tabindex]', els => els.filter(el => el.getClientRects().length && !el.disabled && el.tabIndex >= 0).length);
      for (let i = 0; i < total; i++) {
        await page.keyboard.press('Tab');
        order.push(await page.evaluate(() => ({ tag: document.activeElement.tagName, class: document.activeElement.getAttribute('class'), name: document.activeElement.getAttribute('aria-label') || document.activeElement.id || document.activeElement.textContent.trim().slice(0, 40) })));
      }
      assert(order.every(el => el.tag !== 'BODY' && !/recharts/.test(el.class || '')), 'No chart/decorative duplicate focus stops');
      assert.equal(order.filter(el => el.tag === 'SELECT').length, 5);
      assert.equal(order.filter(el => el.tag === 'TH').length, width === 1440 ? 10 : 0);
      assert.equal(order.filter(el => el.name === 'Προηγούμενη σελίδα').length, 0);
      assert.equal(order.filter(el => el.name === 'Επόμενη σελίδα').length, 1);
      assert(order.findIndex(el => el.tag === 'SELECT') < order.findIndex(el => el.class === 'export-btn'));
      assert(order.findIndex(el => el.class === 'export-btn') < order.findIndex(el => el.name === 'Link'));
      assert(order.findIndex(el => el.name === 'Link') < order.findIndex(el => el.name === 'Όροι Χρήσης'));
      const disabled = await page.$eval('.table-pagination button:first-child', el => ({ disabled: el.disabled, color: getComputedStyle(el).color, opacity: getComputedStyle(el).opacity, border: getComputedStyle(el).borderStyle }));
      assert(disabled.disabled && disabled.opacity === '1' && disabled.border === 'dashed');
      if (width < 640) await tapTarget(page, '.table-pagination button:last-child');
      else { await page.focus('.table-pagination button:last-child'); await page.keyboard.press('Enter'); }
      await page.waitForFunction(() => document.querySelector('.table-pagination span').textContent.startsWith('2/'));
      const next = await page.$('.table-pagination button:last-child');
      for (let i = 0; i < 10 && !(await next.evaluate(el => el.disabled)); i++) { await next.click(); await pause(60); }
      assert(await next.evaluate(el => el.disabled));
      const end = await page.$eval('.table-pagination span', el => el.textContent);
      await next.click(); assert.equal(await page.$eval('.table-pagination span', el => el.textContent), end);
      if (width === 1440) {
        // Test pointer hover in the fine-pointer desktop workflow. Mobile
        // browsers can retain their existing sticky :hover after a touch tap.
        const share = '.toolbar-share-group button:first-child';
        await page.mouse.move(0, 0);
        const beforeHover = await page.$eval(share, el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, color: getComputedStyle(el).color }));
        await page.hover(share); await pause(200);
        const afterHover = await page.$eval(share, el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, color: getComputedStyle(el).color }));
        assert.equal(beforeHover.width, afterHover.width);
        assert.equal(beforeHover.height, afterHover.height);
        assert.notEqual(beforeHover.color, afterHover.color);
        await page.mouse.move(0, 0);
      }
      // Keyboard CSV exports the full filtered dataset, including rows outside
      // the current page. Intercept the local download, without changing bytes.
      await page.evaluate(() => {
        const createObjectURL = URL.createObjectURL.bind(URL);
        URL.createObjectURL = blob => { window.exportBlob = blob; return createObjectURL(blob); };
        const click = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
          if (this.download) window.exportFilename = this.download;
          else click.call(this);
        };
      });
      await page.focus('.export-btn'); await page.keyboard.press('Enter');
      await page.waitForFunction(() => !!window.exportBlob);
      const csv = await page.evaluate(async () => ({ filename: window.exportFilename, text: await window.exportBlob.text(), bom: [...new Uint8Array(await window.exportBlob.arrayBuffer()).slice(0, 3)] }));
      assert.equal(csv.filename, 'betcast_current_export.csv');
      assert.deepEqual(csv.bom, [239, 187, 191]);
      assert.equal(csv.text.trim().split('\n').length - 1, JSON.parse(seed.data).length);
      assert(csv.text.includes('Ποντάρισμα (€)') && csv.text.includes('Κέρδος/Ζημία (€)'));
      keyboard.push({ width, order, disabled, end });
    }
    // Empty-state recovery is still a real touch target.
    await page.setViewport({ width: 320, height: 844, isMobile: true, hasTouch: true });
    await open('?from=999&to=999&theme=light');
    const emptyHit = await tapTarget(page, '.empty-state button');
    await page.waitForFunction(() => !document.querySelector('.empty-state'));
    // The same export chrome serves retry; exercise it at the narrowest width.
    let failData = true;
    await page.setRequestInterception(true);
    const dataRequests = request => {
      if (failData && /docs.google|googleusercontent|corsproxy|allorigins/.test(request.url())) request.abort();
      else request.continue();
    };
    page.on('request', dataRequests);
    await open('?season=lastYear&theme=light');
    await page.waitForSelector('.error-banner', { timeout: 60000 });
    await page.screenshot({ path: path.join(out, 'after', 'light-320-retry.png'), fullPage: true });
    failData = false;
    const retryHit = await tapTarget(page, '.error-banner button');
    await page.waitForFunction(() => !document.querySelector('.error-banner') && document.querySelector('#chart-select') && JSON.parse(sessionStorage.getItem('betcast_data_cache_lastYear'))?.length > 0, { timeout: 60000 });
    page.off('request', dataRequests);
    await page.setRequestInterception(false);
    // Coarse pointer at desktop width is supported; fine tablet layout stays compact.
    const pointerModes = [];
    for (const [width, touch] of [[1440, true], [768, false]]) {
      await page.setViewport({ width, height: 900, hasTouch: touch });
      await open('?theme=dark');
      const size = await page.$eval('#chart-select', el => el.getBoundingClientRect().height);
      assert.equal(size, touch ? 44 : 40);
      pointerModes.push({ width, touch, selectHeight: size });
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'flows.json'), JSON.stringify({ results, keyboard, pointerModes, retryHit, emptyHit, errors }, null, 2));
    console.log(JSON.stringify({ touchThemeFlows: results.length, keyboardFlows: keyboard.length, pointerModes, errors }));
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
