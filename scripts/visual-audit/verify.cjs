const p = require(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const fs = require('fs');
const path = require('path');
const out = path.resolve(__dirname, '../../artifacts/visual-rework');
fs.mkdirSync(out, { recursive: true });
const assert = require('assert/strict');
const pause = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser = await p.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page = await browser.newPage();
  const result = {charts:[],flows:{},errors:[],warnings:[]};
  let expectedFailure=false;
  page.on('pageerror', e=>result.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!expectedFailure)result.errors.push(m.text());if(m.type()==='warn')result.warnings.push(m.text())});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  const open=async(query='')=>{await page.goto('http://localhost:3017/?'+query,{waitUntil:'domcontentloaded'});await page.waitForSelector('#chart-select',{timeout:60000})};
  const click=async(text)=>{for(const el of await page.$$('button')){if((await el.evaluate(e=>e.textContent.trim()))===text){await el.click();return}}throw new Error('Missing button '+text)};
  await open('theme=dark');
  const actual = await page.evaluate(()=>JSON.parse(sessionStorage.getItem('betcast_data_cache_current')));
  assert(actual?.length>0,'Real fetched data must be cached; sample fallback is not sufficient');
  result.flows.actualData={count:actual.length,weeks:[...new Set(actual.map(b=>b.week))]};
  const ids=await page.$$eval('#chart-select option',es=>es.map(e=>e.value));
  for(const [state,query] of [['normal',''],['filtered','from=2&to=4'],['single','from=3&to=3'],['empty','from=999&to=999']]){
    await open(query+'&cmpA=2&cmpB=3');
    for(const id of ids){
      await page.select('#chart-select',id);await pause(220);
      const data=await page.evaluate(()=>({selected:document.querySelector('#chart-select').value,url:location.search,text:document.querySelector('.chart-panel').innerText,svg:!!document.querySelector('.chart-panel svg'),overflow:document.documentElement.scrollWidth>innerWidth,top:document.querySelector('.analysis-section').getBoundingClientRect().top}));
      assert.equal(data.selected,id);assert(!data.overflow);
      if(state==='empty')assert(data.text.includes('Δεν βρέθηκαν'));
      else assert(data.svg || /Kelly|Πίνακας|Σύγκριση|Χρειάζονται/.test(data.text));
      assert(data.top>=-1&&data.top<150,'Selector should remain in view after changing charts');
      result.charts.push({state,id,pass:true});
    }
  }
  await open('viz=dataTable&from=2&to=4&week=3&cmpA=2&cmpB=3&theme=light');
  await browser.defaultBrowserContext().overridePermissions('http://localhost:3017',['clipboard-read','clipboard-write']);
  await click('Link');await pause(100);
  const link=await page.evaluate(()=>navigator.clipboard.readText());
  for(const [k,v] of Object.entries({viz:'dataTable',from:'2',to:'4',week:'3',cmpA:'2',cmpB:'3'}))assert.equal(new URL(link).searchParams.get(k),v);
  result.flows.copiedLink=link;
  await click('Embed');await pause(100);
  const snippet=await page.evaluate(()=>navigator.clipboard.readText());
  const embed=snippet.match(/src="([^"]+)"/)[1];assert.equal(new URL(embed).searchParams.get('theme'),'light');
  const ep=await browser.newPage();await ep.goto(embed,{waitUntil:'networkidle2'});await ep.waitForSelector('#chart-select');
  assert.equal(await ep.$eval('#chart-select',e=>e.value),'dataTable');assert.equal(await ep.$eval('body',e=>e.className),'light-mode');assert.equal(new URL(ep.url()).searchParams.get('theme'),'light');assert.equal(await ep.$('header'),null);await ep.reload({waitUntil:'networkidle2'});assert.equal(await ep.$eval('body',e=>e.className),'light-mode');await ep.close();result.flows.embed=embed;
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:undefined}));
  await click('Κοινοποίηση');await page.waitForFunction(()=>document.querySelector('.share-feedback')?.textContent==='Το link αντιγράφηκε.');result.flows.share=await page.$eval('.share-feedback',e=>e.textContent);assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),link);
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.sharedPayload=payload}}));
  await click('Κοινοποίηση');await page.waitForFunction(()=>document.querySelector('.share-feedback')?.textContent==='Το link κοινοποιήθηκε.');assert.equal(await page.evaluate(()=>window.sharedPayload.url),link);result.flows.nativeSharePayload=true;
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new Error('User cancelled')}}));
  await click('Κοινοποίηση');await page.waitForFunction(()=>document.querySelector('.share-feedback')?.textContent==='Δεν ήταν δυνατή η κοινοποίηση του link.');result.flows.shareFailure=true;
  const cdp=await page.createCDPSession();const downloads=path.join(out,'downloads');fs.mkdirSync(downloads,{recursive:true});await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await click('CSV');await pause(500);const csv=fs.readFileSync(path.join(downloads,'betcast_current_export.csv'),'utf8');assert(csv.includes('Ποντάρισμα (€)'));const rows=csv.trim().split('\n').slice(1);assert(rows.length>0&&rows.every(row=>row.split(',')[1]==='3'));result.flows.csv={rows:rows.length,header:csv.split('\n')[0]};
  const wrap=await page.$('.data-table-wrap');await wrap.evaluate(e=>e.scrollIntoView({block:'center'}));
  const box=await wrap.boundingBox();const x=box.x+box.width-30,y=box.y+Math.min(100,box.height/2);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*35,y}]});await pause(30)}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(250);
  result.flows.tableScroll=await wrap.evaluate(e=>e.scrollLeft);assert(result.flows.tableScroll>0);assert.equal(await page.$eval('#chart-select',e=>e.value),'dataTable');
  await page.setViewport({width:1440,height:900});
  await page.focus('.data-table th');await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.data-table th').getAttribute('aria-sort')==='descending');await page.focus('.data-table th');await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('.data-table th').getAttribute('aria-sort')==='ascending');result.flows.sortKeyboard=true;
  await open('theme=dark');const focus=[];for(let i=0;i<16;i++){await page.keyboard.press('Tab');focus.push(await page.evaluate(()=>({tag:document.activeElement.tagName,text:(document.activeElement.textContent||'').trim().slice(0,45),outline:getComputedStyle(document.activeElement).outlineStyle})));}result.flows.keyboard=focus;
  await page.focus('#chart-select');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await pause(250);assert.equal(await page.$eval('#chart-select',e=>e.value),'weeklyProfit');result.flows.selectorKeyboard=true;
  await page.select('#chart-select','budget');await pause(250);await page.$eval('.chart-wrapper',e=>e.scrollIntoView({block:'center'}));const cb=await (await page.$('.recharts-wrapper')).boundingBox();await page.mouse.move(cb.x+cb.width/2,cb.y+100);await pause(300);
  result.flows.tooltip=await page.$eval('.recharts-tooltip-wrapper',e=>({text:e.innerText,visible:getComputedStyle(e).visibility,x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right}));assert.equal(result.flows.tooltip.visible,'visible');assert(result.flows.tooltip.text.includes('€'));
  await page.screenshot({path:path.join(out,'desktop-tooltip.png')});
  await page.click('.theme-toggle');assert.equal(await page.$eval('body',e=>e.className),'light-mode');result.flows.themeToggle=true;
  // Deliberately fail only data requests, leaving application assets available.
  expectedFailure=true;await page.setRequestInterception(true);let fail=true;page.on('request',req=>{if(fail&&/docs.google|googleusercontent|corsproxy|allorigins/.test(req.url()))req.abort();else req.continue()});
  await page.evaluate(()=>sessionStorage.clear());await open('season=lastYear');await page.waitForSelector('.error-banner',{timeout:60000});await page.screenshot({path:path.join(out,'retry-error.png'),fullPage:true});fail=false;await click('Επανάληψη');await page.waitForFunction(()=>!document.querySelector('.error-banner')&&Number(document.querySelector('.secondary-metrics dd')?.textContent)>0,{timeout:60000});result.flows.retry=true;
  result.flows.lastYearData=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('betcast_data_cache_lastYear'))?.length);expectedFailure=false;
  await click('Link');await pause(100);result.flows.lastYearLink=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(new URL(result.flows.lastYearLink).searchParams.get('season'),'lastYear');
  await open('theme=dark');
  const filters=await page.$$('.scope-bar select');await filters[1].select('2');await filters[2].select('4');await pause(150);
  assert.equal(await page.$eval('.secondary-metrics dd',e=>Number(e.textContent)),actual.filter(b=>b.week>=2&&b.week<=4).length);result.flows.filterControls=true;
  result.viewports=[];
  for(const theme of ['dark','light'])for(const [width,height] of [[390,844],[768,1024],[1440,900]]){
    await page.setViewport({width,height});await open('theme='+theme);
    for(const id of ids){await page.select('#chart-select',id);await pause(180);assert.equal(await page.$eval('#chart-select',e=>e.value),id);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));result.viewports.push({theme,width,id,pass:true});}
  }
  fs.writeFileSync(path.join(out,'verification-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({chartChecks:result.charts.length,viewportChecks:result.viewports.length,flows:result.flows,errors:result.errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
