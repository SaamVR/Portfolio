import assert from 'node:assert/strict';
import { createRenderAdapter } from '../site/runtime/render-adapter.js';

const damp=(current,target,lambda,dt)=>current+(target-current)*(1-Math.exp(-lambda*dt));
const THREE={MathUtils:{damp}};
const vec=(x=0,y=0,z=0)=>({x,y,z});
const camera={
  position:vec(),
  fov:30,
  updateProjectionMatrix(){},
  lookAt(){}
};
const presentation={
  position:vec(),
  rotation:vec(),
  scale:vec(1,1,1)
};
const renderer={toneMappingExposure:1};
const times=[];
const mixer={setTime(value){times.push(value);}};
const adapter=createRenderAdapter({
  THREE,camera,presentation,mixer,clipDuration:10,renderer,orientationX:0
});
const base={
  camera:{position:[0,0,5],target:[0,0,0],fov:28},
  product:{position:[0,0,0],pitch:0,yaw:0,scale:1,pose:.25},
  lighting:{exposure:1,keyPosition:[0,0,0]},
  environment:{}
};

adapter.apply(base,1/60);
adapter.apply({...base,product:{...base.product,pose:.75}},1/60);

assert.equal(times.length,2);
assert.ok(times[0]>2.4 && times[0]<2.6,'initial mixer pose should initialize at the authored state');
assert.ok(times[1]-times[0] < 2.0,
  `one 60Hz frame must not apply the full scroll pose jump; moved ${times[1]-times[0]} seconds`);
assert.ok(times[1] < 7.5,'damped mixer time must remain between current and target after one frame');

for(let frame=0;frame<180;frame++){
  adapter.apply({...base,product:{...base.product,pose:.75}},1/60);
}
const finalTime=times.at(-1);
assert.ok(Math.abs(finalTime-7.5)<.01,`pose clock should converge to target, got ${finalTime}`);

console.log('render_adapter_contract: PASS');
