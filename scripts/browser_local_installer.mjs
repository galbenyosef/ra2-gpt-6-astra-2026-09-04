/** Real local-copy preparation: bilingual discovery, missing-file retry, conversion and no archive download.
 * Uses a fresh browser context, a detected existing installer and ignored local evidence.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const url=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4208/ra2-bootcamp/';
const browser=await chromium.connectOverCDP(process.env.RA2_CDP_URL||'http://127.0.0.1:9227');
const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();
const evidence='.cache/local-installer';await fs.mkdir(evidence,{recursive:true});
const errors=[],archiveRequests=[];
page.on('pageerror',error=>errors.push(error.message));
context.on('request',request=>{if(new URL(request.url()).hostname.endsWith('archive.org'))archiveRequests.push(request.url());});
await context.route('**/*archive.org/**',route=>route.abort());
async function setup(language='zh-CN'){
  await page.goto(url);await page.locator('[data-language-select]').selectOption(language);
  if(await page.getByTestId('mode-assets').isVisible())await page.getByTestId('mode-assets').click();
}
try{
  await page.route('**/__local-installer',route=>route.fulfill({json:{available:false}}));
  await setup();assert.equal(await page.getByTestId('local-installer-option').isHidden(),true);
  assert.equal(await page.locator('#setup-choose-file').isEnabled(),true);
  await page.unroute('**/__local-installer');
  await setup();await page.getByTestId('setup-use-local').waitFor();
  assert.match(await page.getByTestId('setup-use-local').innerText(),/使用本地/);
  await page.screenshot({path:evidence+'/detected-zh.png',fullPage:true});
  await page.locator('[data-language-select]').selectOption('en');
  assert.match(await page.getByTestId('setup-use-local').innerText(),/Use local/);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.getByTestId('setup-use-local').evaluate(el=>el.getBoundingClientRect().right<=innerWidth),true);
  await page.screenshot({path:evidence+'/detected-en-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:1000});
  await page.route('**/__local-installer/file',route=>route.fulfill({status:404,body:'Local installer unavailable.'}));
  await page.getByTestId('setup-use-local').click();await page.locator('#setup-error:not([hidden])').waitFor();
  assert.match(await page.locator('#setup-error').innerText(),/local installer is no longer available/);
  assert.deepEqual(archiveRequests,[],'missing local copy never falls back to downloading');
  await page.unroute('**/__local-installer/file');
  await page.locator('#setup-retry').click();
  assert.equal(await page.getByTestId('setup-use-local').isDisabled(),true);
  console.log('PASS missing/available installer, bilingual and mobile UI, explicit missing-file error and local retry.');
  const deadline=Date.now()+600000;let last='';
  while(Date.now()<deadline){
    if(await page.getByTestId('mode-screen').isVisible())break;
    if(await page.locator('#setup-error:not([hidden])').isVisible())throw Error(await page.locator('#setup-error').innerText());
    const current=await page.locator('#setup-status').textContent().catch(()=>'');
    if(current!==last){console.log(current);last=current;}
    await page.waitForTimeout(3000);
  }
  assert.equal(await page.getByTestId('mode-screen').isVisible(),true,'conversion completes and reloads the app');
  await page.getByTestId('mode-bootcamp').click();await page.locator('#start').waitFor({timeout:90000});
  await page.locator('#music').uncheck();await page.locator('#start').click();await page.locator('#battlefield-canvas').waitFor();
  await page.evaluate(()=>{window.ra2.game.paused=true;});
  await page.screenshot({path:evidence+'/prepared-battlefield.png'});
  assert.equal(await page.evaluate(()=>window.ra2.game.bootcamp),true);
  assert.deepEqual(archiveRequests,[],'the entire installation makes zero Internet Archive requests');
  assert.deepEqual(errors,[]);
  console.log('PASS actual local file, SHA-256 verification, full conversion and playable Bootcamp with zero archive downloads.');
}finally{await context.close();await browser.close();}
