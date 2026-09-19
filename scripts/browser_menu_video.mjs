/** Real menu playback, reference typography, teardown, failure fallback and browser Bink encoding. */
// Slightly over 5 KB: one browser lifecycle also verifies nested-worker conversion.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const url=process.env.RA2_BROWSER_URL||'http://127.0.0.1:4226/';
await mkdir('.cache/menu-video',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto(url);await page.locator('.entry-splash').waitFor({state:'hidden'});
  await page.waitForFunction(()=>{const v=document.querySelector('.menu-video');return v?.readyState>=2&&!v.paused&&v.currentTime>.1;});
  const state=await page.evaluate(async()=>{await document.fonts.ready;const v=document.querySelector('.menu-video');window.oldMenuVideo=v;
    const button=document.querySelector('[data-testid=mode-skirmish]');return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,loop:v.loop,muted:v.muted,inline:v.playsInline,controls:v.controls,font:getComputedStyle(button).fontFamily,weight:getComputedStyle(button).fontWeight,fontLoaded:document.fonts.check('500 13px "Fira Sans Condensed"')};});
  assert.deepEqual([state.width,state.height],[632,570]);assert.ok(state.duration>28&&state.duration<30);
  assert.ok(state.loop&&state.muted&&state.inline&&!state.controls&&state.fontLoaded);assert.match(state.font,/Fira Sans Condensed/);assert.equal(state.weight,'500');
  const before=await page.locator('.menu-video').evaluate(v=>v.currentTime);await page.waitForTimeout(700);
  assert.ok(await page.locator('.menu-video').evaluate(v=>v.currentTime)>before+.3);
  await page.screenshot({path:'.cache/menu-video/main-menu-video.png'});
  await page.locator('.menu-video').evaluate(v=>v.currentTime=v.duration-.2);await page.waitForTimeout(600);
  assert.ok(await page.locator('.menu-video').evaluate(v=>v.currentTime)<2,'original movie loops');
  await page.getByTestId('mode-bootcamp').click();await page.locator('#start').waitFor({timeout:60000});
  assert.deepEqual(await page.evaluate(()=>({paused:window.oldMenuVideo.paused,source:window.oldMenuVideo.getAttribute('src'),connected:window.oldMenuVideo.isConnected})),{paused:true,source:null,connected:false});
  await page.getByTestId('mode-back').click();await page.locator('.menu-monitor.has-video').waitFor();
  assert.equal(await page.locator('.menu-video').count(),1);
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url);await page.locator('.entry-splash').waitFor({state:'hidden'});await page.locator('.menu-monitor.has-video').waitFor();
  assert.equal(await page.locator('.menu-video').evaluate(v=>v.paused),true);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.route('**/assets/ui/ra2ts_l.webm',route=>route.abort());await page.goto(url);await page.locator('.entry-splash').waitFor({state:'hidden'});
  await page.waitForTimeout(500);assert.equal(await page.locator('.menu-monitor.has-video').count(),0);assert.equal(await page.getByTestId('mode-skirmish').isEnabled(),true);
  await page.unroute('**/assets/ui/ra2ts_l.webm');
  if(process.env.RA2_TEST_VIDEO_CONVERTER==='1') {
    const bik=await readFile('.cache/menu-video/ra2ts_l.bik');
    await page.route('**/test-menu.bik',route=>route.fulfill({body:bik,contentType:'application/octet-stream'}));
    const result=await page.evaluate(async()=>{
      const script=`import {convertMenuVideo} from '${location.origin}/src/menu-video-converter.ts'; self.onmessage=async e=>{try{const out=await convertMenuVideo(e.data);postMessage({bytes:out},[out.buffer]);}catch(error){postMessage({error:String(error)});}}`;
      const workerURL=URL.createObjectURL(new Blob([script],{type:'text/javascript'}));const worker=new Worker(workerURL,{type:'module'});
      try {
        const data=new Uint8Array(await (await fetch('/test-menu.bik')).arrayBuffer());
        const bytes=await new Promise((resolve,reject)=>{worker.onmessage=e=>e.data.error?reject(Error(e.data.error)):resolve(e.data.bytes);worker.onerror=e=>reject(Error(e.message));worker.postMessage(data,[data.buffer]);});
        const video=document.createElement('video');video.muted=true;const blobURL=URL.createObjectURL(new Blob([bytes],{type:'video/webm'}));video.src=blobURL;
        try {await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=reject;});return {length:bytes.length,width:video.videoWidth,height:video.videoHeight,duration:video.duration};}
        finally {video.removeAttribute('src');video.load();URL.revokeObjectURL(blobURL);}
      } finally {worker.terminate();URL.revokeObjectURL(workerURL);}
    });
    assert.equal(result.width,632);assert.equal(result.height,570);assert.ok(result.duration>28);assert.ok(result.length>1000);console.log('PASS nested-worker browser Bink conversion',result);
  }
  assert.deepEqual(errors,[]);console.log('PASS original menu video, loop, Fira font, teardown, reduced motion and fallback');
} finally {await browser.close();}
