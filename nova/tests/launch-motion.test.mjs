import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const timeline=await import('../site/runtime/launch-timeline.js').catch(()=>null);
assert.ok(timeline, 'Launch choreography must be available independently of the archive');
const {sampleTimeline,getSectionProgress,progressToScroll,EXPERIENCE_RANGES}=timeline;
const sections=Object.keys(EXPERIENCE_RANGES).map((range,i)=>({range,top:i*1370,end:(i+1)*1370}));
for(const section of sections){
  const p=getSectionProgress(section.top+685,sections);
  assert.equal(sampleTimeline(p).range,section.range);
  assert.ok(Math.abs(progressToScroll(p,sections)-(section.top+685))<1e-6,'Tour must use the same measured section coordinates as scrolling');
}
for(const viewport of ['desktop','tablet','mobile']){
  for(let p=0;p<=1;p+=.001){
    const s=sampleTimeline(p,viewport);
    assert.ok([...s.camera.position,...s.camera.target,s.camera.fov,s.product.pose,s.product.scale].every(Number.isFinite));
    assert.ok(s.product.scale>0 && s.camera.fov>15 && s.camera.fov<45);
    if(!['form','flex'].includes(s.range)) assert.ok(Math.abs(s.product.pose-.72)<1e-6,'Articulation must belong to its feature chapter');
    if(s.range==='flex') assert.ok(s.product.pose>=.24 && s.product.pose<=.30);
    if(s.range==='form') assert.ok(s.product.pose>=.82 && s.product.pose<=.92);
  }
}
for(const [start,end] of Object.values(EXPERIENCE_RANGES)){
  const mid=(start+end)/2;
  const a=sampleTimeline(mid-.001),b=sampleTimeline(mid+.001);
  assert.ok(Math.abs(a.product.inspectionYaw-b.product.inspectionYaw)<.02,'Reading orbit must stay gentle');
}
const html=await readFile(new URL('../site/index.html',import.meta.url),'utf8');
assert.equal((html.match(/data-range-anchor=/g)||[]).length,8,'Launch must have eight product chapters');
assert.ok(!html.includes('id="services"')&&!html.includes('id="case-study"'),'Buyer journey must end with the product');
console.log('launch-motion: PASS (measured chapter timing, reversible tour mapping, stable poses, eight chapters)');
