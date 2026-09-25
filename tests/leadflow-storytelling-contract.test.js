const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.join(__dirname,"..");

function fakeClassList(){
  const set=new Set();
  return {add(...xs){xs.forEach(x=>set.add(x))},remove(...xs){xs.forEach(x=>set.delete(x))},toggle(x,on){if(on===undefined){set.has(x)?set.delete(x):set.add(x);return set.has(x)}on?set.add(x):set.delete(x);return on},contains(x){return set.has(x)}};
}
function fakeElement(rect={left:0,top:0,width:100,height:40}){
  return {style:{},dataset:{},classList:fakeClassList(),getBoundingClientRect(){return rect},setAttribute(){},animate(){return{finished:Promise.resolve(),cancel(){}}}};
}
function makeSandbox(){
  const section=fakeElement(),packet=fakeElement({left:0,top:0,width:70,height:28});
  const caption=fakeElement(),detail=fakeElement(),track=fakeElement({left:0,top:0,width:700,height:200});
  const stages=[
    fakeElement({left:0,top:40,width:120,height:120}),
    fakeElement({left:180,top:40,width:120,height:120}),
    fakeElement({left:360,top:40,width:120,height:120}),
    fakeElement({left:540,top:40,width:120,height:120})
  ];
  const connectors=[fakeElement(),fakeElement(),fakeElement()];
  const map=new Map([
    ["#workflow",section],
    ["#workflowStoryPacket",packet],
    ["#workflowStoryCaption",caption],
    ["#workflowStoryDetail",detail],
    ["#workflow .workflow-story-track",track]
  ]);
  const document={
    documentElement:{dataset:{},classList:fakeClassList()},
    querySelector(sel){return map.get(sel)||null},
    querySelectorAll(sel){
      if(sel==="#workflow .workflow-stage")return stages;
      if(sel==="#workflow .workflow-story-connector")return connectors;
      return [];
    }
  };
  return {window:{},setTimeout,clearTimeout,matchMedia:()=>({matches:true}),document};
}

test("root loads storytelling before app",()=>{
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  const story=html.indexOf('<script src="./storytelling.js"></script>');
  const app=html.indexOf('<script src="./app.js"></script>');
  assert.ok(story>=0,"storytelling.js missing");
  assert.ok(app>story,"storytelling.js must load before app.js");
});

test("storytelling controller exposes four directors and cancellation",()=>{
  const code=fs.readFileSync(path.join(root,"storytelling.js"),"utf8");
  const sandbox=makeSandbox();
  sandbox.window.window=sandbox.window;
  vm.runInNewContext(code,sandbox);
  const api=sandbox.window.LeadFlowStorytelling;
  assert.equal(typeof api?.createController,"function");
  const c=api.createController({root:sandbox.document});
  for(const name of ["playWorkflowStory","playLeadOperationsStory","playReliabilityStory","playArchitectureStory","cancelAll"]){
    assert.equal(typeof c[name],"function",name);
  }
});

test("director promises can be cancelled and reduced motion is surfaced",async()=>{
  const code=fs.readFileSync(path.join(root,"storytelling.js"),"utf8");
  const sandbox=makeSandbox();
  sandbox.window.window=sandbox.window;
  vm.runInNewContext(code,sandbox);
  const c=sandbox.window.LeadFlowStorytelling.createController({root:sandbox.document});
  const p=c.playWorkflowStory({lead:{name:"Sarah",company:"Acme Dental",score:92,status:"hot",action:"Sales review"}});
  c.cancelAll();
  const result=await p;
  assert.equal(result.status,"cancelled");
  assert.equal(result.story,"workflow");
  assert.equal(result.reducedMotion,true);
});

test("base story CSS hooks exist",()=>{
  const css=fs.readFileSync(path.join(root,"styles.css"),"utf8");
  for(const selector of [".story-active",".story-focus",".story-packet",".story-replay"]){
    assert.ok(css.includes(selector),selector);
  }
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*\.story-packet/);
});
