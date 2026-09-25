import assert from 'node:assert/strict';
import { createFoldController } from '../site/interactions/fold-controller.js';
import { createInspectionController } from '../site/interactions/inspection-controller.js';
import { createModeController } from '../site/interactions/mode-controller.js';
import { createHotspotController } from '../site/interactions/hotspot-controller.js';
import { normalizeEnvironmentState, createEnvironment } from '../site/runtime/environment.js';
import { createRenderAdapter } from '../site/runtime/render-adapter.js';

const fold = createFoldController({ openPose:.20, foldedPose:.40, duration:.7 });
fold.begin('fold', .24);
fold.update(.35, { scrollActive:false, timelinePose:.25 });
let influence = fold.getInfluence();
assert.equal(influence.active, true);
assert.ok(influence.weight > 0);
assert.ok(influence.targetPose > .24);
fold.update(.5, { scrollActive:true, timelinePose:.28 });
influence = fold.getInfluence();
assert.ok(influence.weight < 1, 'scroll resumption must release fold ownership');

const inspect = createInspectionController({ maxYaw:.52, maxPitch:.12 });
inspect.setActive(true);
inspect.dragBy(500, 300, { width:1000, height:800 });
let i = inspect.getInfluence();
assert.ok(Math.abs(i.yaw) <= .52);
assert.ok(Math.abs(i.pitch) <= .12);
inspect.reset();
i = inspect.getInfluence();
assert.equal(i.yaw, 0);
assert.equal(i.pitch, 0);

const modes = createModeController();
modes.setListening('focus');
modes.setNoise('transparency');
modes.update(.2);
const m = modes.getInfluence();
assert.equal(m.listening.mode, 'focus');
assert.equal(m.noise.mode, 'transparency');
assert.ok(m.listening.weight > 0);
assert.ok(m.noise.weight > 0);
modes.setListening('invalid');
assert.equal(modes.getInfluence().listening.mode, 'focus');


const normalized=normalizeEnvironmentState({tone:2,spatialAmount:-1,spatialSpread:9,adaptiveAmount:.5,openness:.8,motion:.4});
assert.equal(normalized.tone,1);
assert.equal(normalized.spatialAmount,0);
assert.equal(normalized.spatialSpread,2);
assert.equal(typeof createEnvironment,'function');

class FakeVector3 {
  constructor(){this.x=0;this.y=0;this.z=0;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  fromArray(v){return this.set(v[0],v[1],v[2]);}
  clone(){return new FakeVector3().set(this.x,this.y,this.z);}
  project(){return this;}
}
const fakeElement={dataset:{},style:{},setAttribute(){}};
const hotspots=createHotspotController({
  THREE:{Vector3:FakeVector3},
  camera:{},
  anchors:{cushion:{point:[.2,.1,0],cameraOffset:[.1,0,0],targetOffset:[0,.1,0]}},
  elements:{cushion:fakeElement}
});
hotspots.focus('cushion');
hotspots.update({modelRoot:{localToWorld:v=>v},viewport:{width:1000,height:800}});
assert.equal(fakeElement.dataset.visible,'true');
assert.ok(String(fakeElement.style.transform).includes('translate3d'));
assert.equal(hotspots.getInfluence().id,'cushion');


let boneReads=0;
const animatedBone={
  getWorldPosition(v){
    boneReads++;
    return v.set(.2,.1,0);
  }
};
const boneElement={dataset:{},style:{},setAttribute(){}};
const boneHotspots=createHotspotController({
  THREE:{Vector3:FakeVector3},
  camera:{},
  anchors:{earcup:{object:animatedBone,cameraOffset:[0,0,0],targetOffset:[0,0,0]}},
  elements:{earcup:boneElement}
});
boneHotspots.update({viewport:{width:1000,height:800}});
assert.equal(boneReads,1,'animated hotspot must read its bone world position each update');
assert.ok(String(boneElement.style.transform).includes('600px'),'bone X position should drive DOM projection');
assert.ok(String(boneElement.style.transform).includes('360px'),'bone Y position should drive DOM projection');

let surfaceReads=0;
const surfaceMesh={
  getVertexPosition(index,v){
    surfaceReads++;
    assert.equal(index,7);
    return v.set(.1,-.2,0);
  },
  localToWorld(v){ return v; }
};
const surfaceElement={dataset:{},style:{},setAttribute(){}};
const surfaceHotspots=createHotspotController({
  THREE:{Vector3:FakeVector3},
  camera:{},
  anchors:{surface:{mesh:surfaceMesh,vertexIndex:7,cameraOffset:[0,0,0],targetOffset:[0,0,0]}},
  elements:{surface:surfaceElement}
});
surfaceHotspots.update({viewport:{width:1000,height:800}});
assert.equal(surfaceReads,1,'surface hotspot must read current skinned vertex position each update');
assert.ok(String(surfaceElement.style.transform).includes('550px'));
assert.ok(String(surfaceElement.style.transform).includes('480px'));

let boundsReads=0;
class FakeBox3 {
  setFromObject(object,precise){
    boundsReads++;
    assert.equal(object.id,'earcup');
    assert.equal(precise,true);
    return this;
  }
  getCenter(v){ return v.set(.25,-.25,0); }
}
const boundsElement={dataset:{},style:{},setAttribute(){}};
const boundsHotspots=createHotspotController({
  THREE:{Vector3:FakeVector3,Box3:FakeBox3},
  camera:{},
  anchors:{earcup:{boundsObject:{id:'earcup'},cameraOffset:[0,0,0],targetOffset:[0,0,0]}},
  elements:{earcup:boundsElement}
});
boundsHotspots.update({viewport:{width:1000,height:800}});
assert.equal(boundsReads,1,'component bounds hotspot must sample precise animated bounds');
assert.ok(String(boundsElement.style.transform).includes('625px'));
assert.ok(String(boundsElement.style.transform).includes('500px'));

const offsetElement={dataset:{},style:{},setAttribute(){}};
const offsetHotspots=createHotspotController({
  THREE:{Vector3:FakeVector3},
  camera:{},
  anchors:{point:{point:[0,0,0],screenOffset:[.1,.2],cameraOffset:[0,0,0],targetOffset:[0,0,0]}},
  elements:{point:offsetElement}
});
offsetHotspots.update({modelRoot:{localToWorld:v=>v},viewport:{width:1000,height:800}});
assert.ok(String(offsetElement.style.transform).includes('600px'),'responsive screen offset should shift x by viewport fraction');
assert.ok(String(offsetElement.style.transform).includes('560px'),'responsive screen offset should shift y by viewport fraction');


const edgeSafeElement={dataset:{},style:{},setAttribute(){}};
const edgeSafeHotspots=createHotspotController({
  THREE:{Vector3:FakeVector3},
  camera:{},
  anchors:{edge:{point:[.98,0,0],cameraOffset:[0,0,0],targetOffset:[0,0,0]}},
  elements:{edge:edgeSafeElement}
});
edgeSafeHotspots.update({modelRoot:{localToWorld:v=>v},viewport:{width:390,height:844}});
assert.ok(String(edgeSafeElement.style.transform).includes('374px'),'mobile hotspot center must be clamped to a 16px safe inset');

console.log('interaction_contract: PASS');


inspect.setView('side');
inspect.update(.3);
i=inspect.getInfluence();
assert.equal(i.view,'side');
assert.ok(i.modelYaw>1,'side inspection view must rotate the product substantially');
inspect.setView('rear');
inspect.update(.5);
i=inspect.getInfluence();
assert.equal(i.view,'rear');
assert.ok(i.modelYaw>2.5,'rear inspection view must reveal the back of the product');
inspect.setView('front');
inspect.update(.5);
i=inspect.getInfluence();
assert.equal(i.view,'front');
assert.ok(Math.abs(i.modelYaw)<.2,'front inspection view must return toward the authored front');


const fadeElement={dataset:{},style:{},setAttribute(){}};
const smoothHotspots=createHotspotController({
  THREE:{Vector3:FakeVector3},
  camera:{},
  anchors:{
    a:{point:[0,0,0],cameraOffset:[.3,0,0],targetOffset:[.2,0,0]},
    b:{point:[0,0,0],cameraOffset:[-.3,0,0],targetOffset:[-.2,0,0]}
  },
  elements:{a:fadeElement,b:{dataset:{},style:{},setAttribute(){}}}
});
smoothHotspots.focus('a');
for(let n=0;n<12;n++) smoothHotspots.update({modelRoot:{localToWorld:v=>v},viewport:{width:1000,height:800},dt:1/60});
const focusedA=smoothHotspots.getInfluence();
assert.ok(focusedA.cameraOffset[0]>0,'focused hotspot should ease toward its camera offset');
smoothHotspots.focus('b');
smoothHotspots.update({modelRoot:{localToWorld:v=>v},viewport:{width:1000,height:800},dt:1/60});
const switched=smoothHotspots.getInfluence();
assert.ok(switched.cameraOffset[0]>-.25,'switching hotspot focus must not snap directly to the opposite camera offset');
smoothHotspots.clear();
smoothHotspots.update({modelRoot:{localToWorld:v=>v},viewport:{width:1000,height:800},dt:1/60});
const fading=smoothHotspots.getInfluence();
assert.ok(fading.weight>0,'clearing hotspot focus should fade ownership instead of snapping to zero');
assert.ok(Math.abs(fading.cameraOffset[0])>0,'camera offset should decay smoothly after hotspot clear');

const vec=()=>({x:0,y:0,z:0});
const fakeCamera={
  position:vec(),fov:30,
  updateProjectionMatrix(){},
  lookAt(x,y,z){this.lastLook=[x,y,z];}
};
const fakePresentation={position:vec(),rotation:vec(),scale:{x:1,y:1,z:1}};
const fakeMixer={lastTime:0,setTime(v){this.lastTime=v;}};
const fakeRenderer={toneMappingExposure:1};
const fakeThree={MathUtils:{damp:(current,target)=>current+(target-current)*.5}};
const renderAdapter=createRenderAdapter({
  THREE:fakeThree,camera:fakeCamera,presentation:fakePresentation,
  mixer:fakeMixer,clipDuration:10,renderer:fakeRenderer,lights:null,environment:null,orientationX:0
});
const visualState={
  camera:{position:[2,2,4],target:[1,1,0],fov:26},
  product:{position:[1,0,0],pitch:0,yaw:1,scale:1.2,pose:.8},
  lighting:{exposure:1,hemi:1,key:1,fill:1,rim:1,warm:1,keyColor:0,rimColor:0,keyPosition:[0,0,0]},
  environment:{}
};
renderAdapter.apply(visualState,1/60);
assert.ok(fakeCamera.lastLook[0]>0 && fakeCamera.lastLook[0]<1,'camera look target must damp instead of snapping');
assert.ok(fakeMixer.lastTime>0 && fakeMixer.lastTime<8,'GLTF pose time must damp instead of jumping to the scroll target');
