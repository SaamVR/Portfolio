const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.join(__dirname,"..");

function load(){
  const sandbox={window:{},setTimeout,clearTimeout,matchMedia:()=>({matches:true}),document:{documentElement:{classList:{add(){},remove(){}}},querySelector(){return null},querySelectorAll(){return[]}}};
  sandbox.window.window=sandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(root,"dashboard.js"),"utf8"),sandbox);
  vm.runInNewContext(fs.readFileSync(path.join(root,"storytelling.js"),"utf8"),sandbox);
  return sandbox.window;
}

const base=[
  {id:"a",name:"Mina",company:"Studio Eight",score:67,status:"review",timeline:"month",source:"Meta Lead Ads",action:"Human review"},
  {id:"b",name:"Ryan",company:"Independent",score:39,status:"nurture",timeline:"exploring",source:"Referral",action:"Nurture"}
];

test("inserted hot lead produces truthful before/after operations delta",()=>{
  const w=load();
  const sarah={id:"c",name:"Sarah",company:"Acme Dental",score:92,status:"hot",timeline:"asap",source:"Website Form",action:"Sales review"};
  const ctx=w.LeadFlowStorytelling.buildOperationsStoryContext([sarah,...base],{id:"c",mode:"insert"},w.LeadFlowDashboard.buildDashboardModel);
  assert.equal(ctx.mode,"insert");
  assert.equal(ctx.beforeModel.total,2);
  assert.equal(ctx.afterModel.total,3);
  assert.equal(ctx.delta.total,1);
  assert.equal(ctx.delta.hot,1);
  assert.equal(ctx.delta.salesReview,1);
  assert.equal(ctx.latestLead.name,"Sarah");
});

test("duplicate update never invents a pipeline increment",()=>{
  const w=load();
  const previous={...base[0]};
  const updated={...previous,score:92,status:"hot",timeline:"asap",action:"Sales review"};
  const after=[updated,base[1]];
  const ctx=w.LeadFlowStorytelling.buildOperationsStoryContext(after,{id:"a",mode:"update",previousLead:previous},w.LeadFlowDashboard.buildDashboardModel);
  assert.equal(ctx.mode,"update");
  assert.equal(ctx.beforeModel.total,2);
  assert.equal(ctx.afterModel.total,2);
  assert.equal(ctx.delta.total,0);
  assert.equal(ctx.delta.hot,1);
  assert.equal(ctx.latestLead.score,92);
});

test("operations story markup includes impact ribbon token and replay",()=>{
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  for(const id of ["opsStoryRibbon","opsStoryHeadline","opsStoryDetail","opsStoryToken","opsStoryReplay"]){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
});

test("operations story uses shared director and pending viewport trigger",()=>{
  const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
  assert.match(app,/playLeadOperationsStory/);
  assert.match(app,/pendingOpsStory/);
  assert.match(app,/workspaceStoryObserver/);
  assert.match(app,/mode:duplicate\?"update":"insert"/);
});

