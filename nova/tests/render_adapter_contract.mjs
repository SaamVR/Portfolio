import assert from 'node:assert/strict';
import { createRenderAdapter } from '../site/runtime/render-adapter.js';

const damp=(current,target,lambda,dt)=>current+(target-current)*(1-Math.exp(-lambda*dt));
const vec=(x=0,y=0,z=0)=>({x,y,z});
const THREE={MathUtils:{damp}};
const camera={position:vec(),fov:30,updateProjectionMatrix(){},lookAt(){}};
const presentation={position:vec(),rotation:vec(),scale:vec(1,1,1)};
const renderer={toneMappingExposure:1};
const mixer={times:[],setTime(value){this.times.push(value);}};
const environment={apply(){}};

const adapter=createRenderAdapter({
  THREE,camera,presentation,mixer,clipDuration:10,renderer,lights:{},environment,orientationX:0
});

const base={
  product:{position:[0,0,0],scale:1,yaw:0,pitch:0,pose:.20},
  camera:{position:[0,0,4],target:[0,0,0],fov:30},
  lighting:{exposure:1,hemi:1,key:1,fill:1,rim:1,warm:1,keyColor:0xffffff,rimColor:0xffffff,keyPosition:[1,1,1]},
  environment:{tone:0,spatialAmount:0,spatialSpread:0,adaptiveAmount:0,openness:0,motion:0}
};

adapter.apply(base,1/60);
adapter.apply({...base,product:{...base.product,pose:.80}},1/60);

assert.equal(mixer.times.length,2);
assert.ok(Math.abs(mixer.times[0]-2)<.001,'initial source pose should initialize immediately');
assert.ok(mixer.times[1]>mixer.times[0],'source pose should move toward the new target');
assert.ok(mixer.times[1]<8,'source pose must be damped instead of snapping directly to target');
console.log('render_adapter_contract: PASS');
