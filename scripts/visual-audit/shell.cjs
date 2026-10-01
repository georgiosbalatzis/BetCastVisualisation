// Same external puppeteer-core / Chrome prerequisites as capture.cjs.
const p = require(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const out = path.resolve(__dirname, '../../artifacts/visual-rework/shell');
const expectedLinks = [
  ['Αρχική', 'https://f1stories.gr/'],
  ['Άρθρα', 'https://f1stories.gr/blog-module/blog/index.html'],
  ['YouTube', 'https://www.youtube.com/@f1_stories_original'],
  ['Βαθμολογία', 'https://f1stories.gr/standings/'],
  ['Δεδομένα', 'https://f1stories.gr/standings/?tab=tyre-pace'],
  ['Συντάκτες', 'https://f1stories.gr/authors/'],
  ['BetCast', 'https://georgiosbalatzis.github.io/BetCastVisualisation/'],
];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await p.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const page = await browser.newPage();
    const results = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    for (const theme of ['light', 'dark']) for (const width of [1440, 1280, 768, 390, 375]) {
      await page.setViewport({ width, height: 900 });
      await page.goto(`http://localhost:3017/?theme=${theme}`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('#chart-select', { timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.$eval('body', el => el.className), `${theme}-mode`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: page overflow`);
      assert.equal(await page.$eval('h1', el => el.textContent), 'BETCAST.');
      assert.equal(await page.$eval('.app-header', el => el.getBoundingClientRect().height), width < 992 ? 68 : 76);
      await page.screenshot({ path: path.join(out, `after-${theme}-${width}-header.png`) });
      const nav = width < 992 ? '.header-mobile-nav' : '.header-nav';
      if (width < 992) {
        await page.focus('.menu-toggle');
        await page.keyboard.press('Enter');
        assert.equal(await page.$eval('.menu-toggle', el => el.getAttribute('aria-expanded')), 'true');
        await page.keyboard.press('Tab');
        assert(await page.$eval(`${nav} a`, el => el === document.activeElement && getComputedStyle(el).outlineStyle === 'solid'));
        await page.screenshot({ path: path.join(out, `after-${theme}-${width}-menu.png`) });
      }
      assert.deepEqual(await page.$$eval(`${nav} a`, links => links.map(el => [el.textContent, el.href])), expectedLinks);
      assert.deepEqual(await page.$$eval(`${nav} [aria-current]`, links => links.map(el => el.textContent)), ['BetCast']);
      assert(await page.$$eval(`${nav} a, .header-actions button, footer a`, links => links.filter(el => el.getClientRects().length).every(el => el.getBoundingClientRect().height >= 44)));
      assert(await page.$$eval('header a[target="_blank"], footer a[target="_blank"]', links => links.every(el => el.rel.includes('noopener') && el.rel.includes('noreferrer'))));
      if (width < 992) {
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.keyboard.press('Escape');
        assert(await page.$eval('.menu-toggle', el => el === document.activeElement && el.getAttribute('aria-expanded') === 'false'));
        await page.keyboard.press('Tab');
        assert(await page.evaluate(() => !document.activeElement.closest('.header-mobile-nav')));
      } else {
        assert(await page.evaluate(() => {
          const nav = document.querySelector('.header-nav').getBoundingClientRect();
          const actions = document.querySelector('.header-actions').getBoundingClientRect();
          return nav.right <= actions.left;
        }));
      }
      await page.click('.theme-toggle');
      assert.equal(await page.$eval('body', el => el.className), theme === 'light' ? 'dark-mode' : 'light-mode');
      assert.equal(await page.evaluate(() => localStorage.getItem('betcast_theme')), theme === 'light' ? 'dark' : 'light');
      await page.click('.theme-toggle');
      await page.$eval('footer', el => el.scrollIntoView());
      await page.waitForFunction(() => document.querySelector('footer').getBoundingClientRect().bottom <= innerHeight + 1);
      await page.screenshot({ path: path.join(out, `after-${theme}-${width}-footer.png`) });
      await page.focus('.footer-links a');
      await page.keyboard.press('Tab');
      assert(await page.evaluate(() => document.activeElement.closest('.footer-links') && getComputedStyle(document.activeElement).outlineStyle === 'solid'));
      results.push({ theme, width, pass: true });
    }
    // A menu opened on mobile must not reappear after a desktop round trip.
    await page.setViewport({ width: 390, height: 900 });
    await page.click('.menu-toggle');
    await page.setViewport({ width: 1280, height: 900 });
    await page.waitForFunction(() => document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'false');
    await page.setViewport({ width: 390, height: 900 });
    assert(await page.$eval('.header-mobile-nav', el => el.hidden));
    // Embeds keep their own layout and URL-selected visualization.
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('http://localhost:3017/?embed=1&theme=dark&viz=dataTable', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#chart-select');
    assert.equal(await page.$('header, footer'), null);
    assert.equal(await page.$eval('.App', el => getComputedStyle(el).paddingTop), '0px');
    assert.equal(await page.$eval('#chart-select', el => el.value), 'dataTable');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'shell-results.json'), JSON.stringify({ results, errors }, null, 2));
    console.log(JSON.stringify({ viewportChecks: results.length, errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
