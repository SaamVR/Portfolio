import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTS,DURATION_MS,actAt,frameAt,validReceipt,advanceClock,smooth} from '../storyboard-core.mjs';
const makeReceipt = (timeout = false) => ({
  ok:true,runId:'real-test-run-1234',
  execution:{api:'server-executed',crm:'sandbox-contract-only',outbound:'disabled',model:'not-configured'},
  lead:{name:'Alex Morgan',company:'Northstar Dental',source:'Synthetic website'},
  qualification:{score:96,lane:'sales',action:'Sales review required',factors:[{label:'Baseline',points:30},{label:'Budget fit',points:26},{label:'Time sensitivity',points:24},{label:'Intent signals',points:16}]},
  crm:{adapter:'sandbox',status:'accepted',attempts:timeout?3:1},
  followup:{mode:'draft-only'},
  events:[{stage:'lead.accepted'},...(timeout ? [{stage:'crm.sandbox.timeout'}, {stage:'crm.sandbox.timeout'}]:[]),{stage:'workflow.completed'}]
});

test('five directed acts have contiguous windows and ample holds',()=>{
 assert.equal(ACTS.length,5);
 assert.equal(ACTS[0].start,0);
 assert.equal(ACTS.at(-1).end,DURATION_MS);
 assert.ok(DURATION_MS>=22000);
 for(let i=0;i<ACTS.length;i++){
  assert.ok(ACTS[i].end-ACTS[i].start>=3900);
  if(i>0) assert.equal(ACTS[i-1].end,ACTS[i].start);
  assert.equal(actAt(ACTS[i].start),i);
 }
 assert.equal(actAt(DURATION_MS),4);
});
test('reject any non-server receipt or false integration claims',()=>{
 const valid=makeReceipt();assert.equal(validReceipt(valid),true);
 assert.equal(validReceipt(null),false);
 assert.equal(validReceipt({ok:true}),false);
 for(const [key,value] of [['api','browser-only'],['crm','production-connected'],['outbound','enabled'],['model','gpt-configured']]){
  const wrong=structuredClone(valid);wrong.execution[key]=value;
  assert.equal(validReceipt(wrong),false,`unexpectedly accepted ${key}:${value}`);
  assert.throws(()=>frameAt(1200,wrong));
 }
 const failed=structuredClone(valid);failed.events=[];
 assert.equal(validReceipt(failed),false);
});
test('all five sampled scenes use actual score, route and company',()=>{
 const receipt=makeReceipt();
 for(const act of ACTS){
  const frame=frameAt(act.start+1400,receipt);
  assert.equal(frame.org,'Northstar Dental');
  assert.equal(frame.score,96);
  assert.equal(frame.lane,'sales');
  assert.equal(frame.routeLabel,'Sales review required');
  assert.equal(frame.act.id,act.id);
  assert.ok(frame.route>=0 && frame.route<=1);
 }
});
test('direction contains deliberate anticipation, eased arcs, holds and closure',()=>{
 const receipt=makeReceipt();
 const at=t=>frameAt(t,receipt);
 assert.equal(at(0).route,0);
 assert.equal(at(300).route,0);
 assert.ok(at(1500).route>0);
 assert.equal(at(3600).route,.125);
 assert.equal(at(8300).route,.32);
 assert.ok(at(10800).route>.32 && at(10800).route<.56);
 assert.equal(at(13200).route,.56);
 assert.equal(at(24200).route,.94);
 assert.ok(at(9000).scoreDisplayed<96);
 assert.equal(at(13000).scoreDisplayed,96);
 assert.ok(at(21000).approvalReveal<1);
 assert.equal(at(23000).approvalReveal,1);
 assert.ok(at(24000).endReveal>.7);
 assert.equal(at(DURATION_MS).endReveal,1);
 assert.equal(smooth(0),0);assert.equal(smooth(1),1);
});
test('timeout beats only play if confirmed receipt has matching injected event',()=>{
 const normal=makeReceipt(),timeout=makeReceipt(true);
 assert.equal(frameAt(16700,normal).isFault,false);
 assert.equal(frameAt(16700,timeout).faultSequence,1);
 assert.equal(frameAt(17700,timeout).faultSequence,2);
 assert.equal(frameAt(18500,timeout).connectorAccepted,true);
 assert.equal(frameAt(18500,timeout).attempts,3);
 assert.equal(frameAt(18500,normal).attempts,1);
 assert.ok(frameAt(16700,timeout).route < frameAt(16500,normal).route);
});
test('clock advances monotonically and clamps at film end',()=>{
 assert.equal(advanceClock({playhead:5000,elapsed:1000,speed:1.5}),6500);
 assert.equal(advanceClock({playhead:4000,elapsed:-20,speed:1}),4000);
 assert.equal(advanceClock({playhead:24000,elapsed:800,speed:1.5}),DURATION_MS);
 assert.equal(advanceClock({playhead:0,elapsed:1000,speed:0.75}),750);
});

test('camera direction, card elevation and route-lane focus are intentional',()=>{
  const receipt=makeReceipt();const at=t=>frameAt(t,receipt);
  assert.equal(at(0).cameraX,0,'establish before the camera begins its move');
  assert.ok(at(10900).cameraX>2,'rack focus visibly shifts perspective');
  assert.ok(at(20600).cameraX>5,'handoff and resolution continue the camera travel');
  assert.ok(at(11500).cameraScale>1.035,'decision is an actual close-up');
  assert.ok(at(22900).cameraScale<1.01,'final act widens for resolution');
  assert.ok(at(6400).cardLift>60,'physical source card stays above the rail');
  assert.ok(at(11400).cardHorizontalOffset < -25,'card clears the score panel');
  assert.equal(at(15000).cardHorizontalOffset,0,'card returns to its carrier by handoff');
  assert.ok(at(1800).beaconReveal>.5,'beacon exists on the actual source path');
  assert.equal(at(0).beaconReveal,0,'no visual token before arrival');
});
test('proof precedes verdict and simulated setbacks have distinguishable causality',()=>{
  const normal=makeReceipt(),failure=makeReceipt(true);
  const n=t=>frameAt(t,normal),f=t=>frameAt(t,failure);
  assert.equal(n(6900).validationReveal,0,'do not stamp before validation');
  assert.ok(n(7900).validationReveal>.5,'validation acceptance has its own narrative beat');
  assert.equal(n(11500).routeDecisionReveal,0,'verdict cannot enter before score factors resolve');
  assert.ok(n(13350).routeDecisionReveal>=1,'verdict resolves after evidence');
  assert.equal(n(16000).attemptStates.length,1,'normal sandbox receipt contains one attempt');
  assert.equal(n(18800).attemptStates[0],'accepted');
  assert.equal(n(16700).isFault,false);
  assert.equal(f(16700).attemptStates[0],'simulated-fault');
  assert.equal(f(16800).attemptStates[1],'processing');
  assert.equal(f(17600).attemptStates[1],'simulated-fault');
  assert.equal(f(18000).attemptStates[2],'processing');
  assert.equal(f(18500).attemptStates[2],'accepted');
  assert.equal(f(0).retryReveal,0);
  assert.ok(f(15900).retryReveal>.95);
  assert.equal(f(21500).retryReveal,0);
  assert.ok(n(22200).approvalSealReveal>.15 && n(22200).approvalSealReveal<1.2);
  assert.equal(n(DURATION_MS).approvalSealReveal,1);
});
