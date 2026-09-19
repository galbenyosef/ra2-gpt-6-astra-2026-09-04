// Readiness rejects previous schemas and missing native sidebar frames.
import { nativeUiAssets } from '../src/hud/skin';
import assert from 'node:assert/strict';
import test from 'node:test';
import { originalsReady, ORIGINAL_VERSION, SOURCE_SHA256, READY_URL } from '../src/browser-storage';

test('browser readiness requires a committed cache and every original file, including audio and maps',async()=>{
  const files=Array.from({length:3000},(_,i)=>`/assets/sprites/test-${i}.png`);
  files.push('/assets/audio/hm2.wav','/maps/mp22s8.map', ...nativeUiAssets.map(({key})=>`/assets/ui/${key}.png`));
  let stored=[...files],marker:unknown;
  const original=Object.getOwnPropertyDescriptor(globalThis,'caches');
  Object.defineProperty(globalThis,'caches',{configurable:true,value:{open:async()=>({
    match:async(url:string)=>url===READY_URL&&marker?Response.json(marker):undefined,
    keys:async()=>stored.map(file=>({url:'https://example.test'+file})),
  })}});
  try{
    assert.equal(await originalsReady(),false,'Partial conversion must never start the game');
    marker={version:ORIGINAL_VERSION,sourceSha256:SOURCE_SHA256,files,installedAt:'test'};
    assert.equal(await originalsReady(),true);
    for(const missing of ['/assets/audio/hm2.wav','/maps/mp22s8.map','/assets/ui/sidec02-gclock2.png','/assets/ui/sidec01-tab00.png','/assets/ui/mnbttn.png','/assets/ui/pudlgbgn.png']){
      stored=files.filter(file=>file!==missing);assert.equal(await originalsReady(),false,missing);stored=[...files];
    }
    marker={version:2,sourceSha256:SOURCE_SHA256,files};assert.equal(await originalsReady(),false,'Previous browser schema must reprepare using the cached installer');
    marker={version:0,sourceSha256:SOURCE_SHA256,files};assert.equal(await originalsReady(),false);
    marker={version:ORIGINAL_VERSION,sourceSha256:'unverified',files};assert.equal(await originalsReady(),false);
    marker={version:ORIGINAL_VERSION,sourceSha256:SOURCE_SHA256,files:[]};assert.equal(await originalsReady(),false);
  }finally{if(original)Object.defineProperty(globalThis,'caches',original);else Reflect.deleteProperty(globalThis,'caches');}
});
