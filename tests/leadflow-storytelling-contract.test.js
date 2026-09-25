const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.join(__dirname,"..");

test("root loads storytelling before app",()=>{
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  const story=html.indexOf('<script src="./storytelling.js"></script>');
  const app=html.indexOf('<script src="./app.js"></script>');
  assert.ok(story>=0,"storytelling.js missing");
  assert.ok(app>story,"storytelling.js must load before app.js");
});

test("storytelling controller exposes four directors and cancellation",()=>{
  const code=fs.readFileSync(path.join(root,"storytelling.js"),"utf8");
  const sandbox={
    window:{},
    setTimeout,
    clearTimeout,
    matchMedia:()=>({matches:true}),
    document:{documentElement:{dataset:{}}}
  };
  sandbox.window.window=sandbox.window;
  vm.runInNewContext(code,sandbox);
  const api=sandbox.window.LeadFlowStorytelling;
  assert.equal(typeof api?.createController,"function");
  const c=api.createController();
  for(const name of ["playWorkflowStory","playLeadOperationsStory","playReliabilityStory","playArchitectureStory","cancelAll"]){
    assert.equal(typeof c[name],"function",name);
  }
});

test("director promises can be cancelled and reduced motion is surfaced",async()=>{
  const code=fs.readFileSync(path.join(root,"storytelling.js"),"utf8");
  const sandbox={window:{},setTimeout,clearTimeout,matchMedia:()=>({matches:true}),document:{documentElement:{dataset:{}}}};
  sandbox.window.window=sandbox.window;
  vm.runInNewContext(code,sandbox);
  const c=sandbox.window.LeadFlowStorytelling.createController();
  const p=c.playWorkflowStory({beats:[{hold:50},{hold:50}]});
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

