/** Footer arrows extended below side3 and clipped at some heights; reserve their full frames.
 * These fixtures also reject old/truncated atlases instead of silently displaying wrong states.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {sidebarLayout,nativeUiAssets,missingNativeUiAssets,framePosition,clockFrame} from '../src/hud/skin';
import type {Sprite} from '../src/assets';
const sprite=(w:number,h:number,frames=1):Sprite=>({src:'/synthetic.png',width:w*Math.min(16,frames),height:h*Math.ceil(frames/16),frameWidth:w,frameHeight:h,frames,columns:Math.min(16,frames),anchorX:0,anchorY:0});
for(const arrowHeight of [25,27])test(`native ${arrowHeight}px arrows fit all supported sidebar heights`,()=>{
  const ui={credits:sprite(168,16),top:sprite(168,32),radar:sprite(168,110),side1:sprite(168,69),side2:sprite(168,50),side3:sprite(168,26),'r-up':sprite(46,arrowHeight),'r-dn':sprite(46,arrowHeight)};
  for(let height=311;height<=1100;height++){
    const l=sidebarLayout(height,ui);
    assert.equal(l.cardsY,227);assert.equal(l.bottomY-l.cardsY,l.rows*50);
    assert.ok(l.bottomY+7+arrowHeight<=height,`arrows clipped at ${height}px`);
    assert.ok(height-(l.bottomY+7+arrowHeight)<50,'use all complete rows');
  }
});
test('readiness rejects missing and truncated state atlases',()=>{
  const ui=Object.fromEntries(nativeUiAssets.map(({key,frames})=>[key,sprite(60,48,frames)]));
  assert.deepEqual(missingNativeUiAssets(ui),[]);
  delete ui['sidec01-tab00'];ui['sidec02-gclock2']=sprite(60,48,40);
  assert.deepEqual(new Set(missingNativeUiAssets(ui)),new Set(['sidec01-tab00','sidec02-gclock2']));
});
test('progress reaches the last of 55 source frames and crosses atlas rows',()=>{
  const s=sprite(60,48,55);
  assert.equal(clockFrame(0,55),1);assert.equal(clockFrame(.5,55),27);assert.equal(clockFrame(1,55),54);
  assert.equal(framePosition(s,16),'0px -48px');assert.equal(framePosition(s,54),'-360px -144px');
});
