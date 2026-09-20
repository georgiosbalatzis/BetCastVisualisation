// Run with PUPPETEER_MODULE pointing to an installed puppeteer-core module.
const p = require(process.env.PUPPETEER_MODULE || '/tmp/betcast-ui-audit/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const out = __dirname;
(async () => {
  const browser = await p.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page = await browser.newPage();
  // Freeze decorative entrance animations for reproducible visual comparisons.
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const results = [];
  for (const theme of ['dark', 'light']) {
    for (const [width, height] of [[390,844], [768,1024], [1440,900]]) {
      await page.setViewport({width,height});
      for (const [state,query] of [['default',''], ['table','viz=dataTable'], ['dense','viz=oddsDistribution'], ['empty','from=999&to=999']]) {
        await page.goto(`http://localhost:3017/?theme=${theme}&${query}`, {waitUntil:'networkidle2'});
        await page.waitForSelector('#chart-select', {timeout: 60000});
        await page.evaluate(() => document.fonts.ready);
        // Recharts defers offscreen animation frames; settle the visible plot before capture.
        await page.$eval('.chart-panel', e => e.scrollIntoView({block:'center'}));
        await new Promise(r => setTimeout(r, 2000));
        await page.evaluate(()=>window.scrollTo(0,0));
        await new Promise(r => setTimeout(r, 200));
        await page.screenshot({path:path.join(out, `${theme}-${width}-${state}.png`),fullPage:true});
        if (state === 'default') await page.screenshot({path:path.join(out,`${theme}-${width}-viewport.png`)});
        results.push(await page.evaluate((meta) => ({...meta, overflow:document.documentElement.scrollWidth>innerWidth,metrics:document.querySelector('.metrics').innerText,chartTop:document.querySelector('.analysis-section').getBoundingClientRect().top,bodyTheme:document.body.className,emptyVisible:!!document.querySelector('.empty-state'),select:document.querySelector('#chart-select').value}), {theme,width,state}));
      }
    }
  }
  fs.writeFileSync(path.join(out,'capture-results.json'),JSON.stringify({results,errors},null,2));
  console.log(JSON.stringify({states:results.length,overflow:results.filter(r=>r.overflow),errors}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
