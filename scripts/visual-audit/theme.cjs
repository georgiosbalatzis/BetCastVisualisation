// Theme persistence in the production build (docs/theme.md).
// Same external puppeteer-core / Chrome prerequisites and :3017 server as shell.cjs.
const p = require(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const assert = require('assert/strict');
const URL = 'http://localhost:3017/';
const KEY = 'f1stories-theme';
const LEGACY = 'betcast_theme';

(async () => {
  const browser = await p.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const errors = [];
  let checks = 0;
  // One isolated profile per scenario: storage seeded once, every body class change recorded.
  async function open({ stored = {}, os = 'light', width = 1280, search = '', blockScripts = false } = {}) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: os }]);
    await page.setViewport({ width, height: 900 });
    await page.evaluateOnNewDocument((seed) => {
      if (!sessionStorage.getItem('seeded')) {
        Object.entries(seed).forEach(([key, value]) => localStorage.setItem(key, value));
        sessionStorage.setItem('seeded', '1');
      }
      // Every class the body ever has, from creation on: one entry = no flash.
      window.__bodyClasses = [];
      new MutationObserver(() => {
        const body = document.body;
        if (body && body.className && body.className !== window.__bodyClasses[window.__bodyClasses.length - 1]) window.__bodyClasses.push(body.className);
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    }, stored);
    if (blockScripts) {
      await page.setRequestInterception(true);
      page.on('request', request => (request.resourceType() === 'script' ? request.abort() : request.continue()));
    }
    await page.goto(URL + search, { waitUntil: 'networkidle2' });
    if (!blockScripts) await page.waitForSelector('.App');
    return { page, context };
  }
  const state = page => page.evaluate(() => ({ body: document.body.className, classes: window.__bodyClasses, storage: { ...localStorage } }));
  const check = async (page, expected) => {
    const actual = await state(page);
    assert.equal(actual.body, `${expected.resolved}-mode`);
    assert.deepEqual(actual.classes, [`${expected.resolved}-mode`], `body class flipped: ${actual.classes}`);
    assert.deepEqual(actual.storage, expected.storage);
    checks++;
  };

  try {
    // First paint before any app JS: the bundle is blocked, the inline script alone paints.
    for (const [stored, os, resolved] of [[{ [KEY]: 'dark' }, 'light', 'dark'], [{ [KEY]: 'auto' }, 'dark', 'dark'], [{ [KEY]: 'auto' }, 'light', 'light'], [{ [LEGACY]: 'dark' }, 'light', 'dark']]) {
      const { page, context } = await open({ stored, os, blockScripts: true });
      assert.equal(await page.$eval('body', el => el.className), `${resolved}-mode`);
      const background = await page.$eval('body', el => getComputedStyle(el).backgroundColor);
      await context.close();
      const app = await open({ stored, os });
      assert.equal(await app.page.$eval('body', el => getComputedStyle(el).backgroundColor), background, 'pre-paint and app backgrounds differ');
      await app.context.close();
      checks++;
    }

    // Values Ghost Car / Telemetry may leave on the shared origin, and legacy migration.
    const cases = [
      [{ [KEY]: 'light' }, 'dark', 'light', { [KEY]: 'light' }],
      [{ [KEY]: 'dark' }, 'light', 'dark', { [KEY]: 'dark' }],
      [{ [KEY]: 'auto' }, 'dark', 'dark', { [KEY]: 'auto' }],
      [{ [KEY]: 'auto' }, 'light', 'light', { [KEY]: 'auto' }],
      [{ [LEGACY]: 'dark' }, 'light', 'dark', { [KEY]: 'dark' }],
      [{ [LEGACY]: 'auto' }, 'dark', 'dark', { [KEY]: 'auto' }],
      [{ [KEY]: 'light', [LEGACY]: 'dark' }, 'dark', 'light', { [KEY]: 'light' }],
      [{ [KEY]: 'banana', [LEGACY]: 'auto' }, 'light', 'light', { [KEY]: 'auto' }],
      [{ [LEGACY]: 'banana' }, 'dark', 'dark', {}],
      [{}, 'dark', 'dark', {}],
      [{}, 'light', 'light', {}],
    ];
    for (const [stored, os, resolved, storage] of cases) {
      const { page, context } = await open({ stored, os });
      await check(page, { resolved, storage });
      await context.close();
    }

    // A share/embed ?theme= paints that theme without touching the stored preference.
    for (const search of ['?theme=light', '?embed=1&theme=light&viz=dataTable']) {
      const { page, context } = await open({ stored: { [KEY]: 'dark' }, os: 'dark', search });
      await check(page, { resolved: 'light', storage: { [KEY]: 'dark' } });
      await context.close();
    }

    // Real toggle, then reload, at desktop and mobile widths; keyboard operated.
    for (const width of [1440, 390]) {
      const { page, context } = await open({ stored: { [KEY]: 'auto', [LEGACY]: 'light' }, os: 'dark', width });
      await check(page, { resolved: 'dark', storage: { [KEY]: 'auto' } });
      assert.equal(await page.$eval('.theme-toggle', el => el.getAttribute('aria-label')), 'Φωτεινό θέμα');
      const box = await page.$eval('.theme-toggle', el => el.getBoundingClientRect().toJSON());
      assert(box.width >= 44 && box.height >= 44, 'theme toggle target below 44px');
      await page.focus('.theme-toggle');
      assert.equal(await page.$eval('.theme-toggle', el => getComputedStyle(el).outlineStyle), 'solid');
      for (const resolved of ['light', 'dark']) {
        await page.keyboard.press('Enter');
        assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), { [KEY]: resolved });
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForSelector('.theme-toggle');
        await check(page, { resolved, storage: { [KEY]: resolved } });
        // Explicit choices ignore the OS.
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: resolved === 'dark' ? 'light' : 'dark' }]);
        assert.equal(await page.$eval('body', el => el.className), `${resolved}-mode`);
        await page.focus('.theme-toggle');
      }
      await context.close();
    }

    // auto (no UI option; as left by an earlier choice) survives reload and follows live OS changes.
    const { page, context } = await open({ stored: { [KEY]: 'auto' }, os: 'light' });
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('.theme-toggle');
    await check(page, { resolved: 'light', storage: { [KEY]: 'auto' } });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.waitForFunction(() => document.body.className === 'dark-mode');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.waitForFunction(() => document.body.className === 'light-mode');
    assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), { [KEY]: 'auto' });
    checks++;
    await context.close();

    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ checks, errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
