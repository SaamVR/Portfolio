// Sample the desired source gesture, then blend joints in physical space.
// Interpolating clip time between gestures would play unrelated twists/folds.
export function createArticulation({root,mixer,clipDuration}){
  if(!root || !mixer) return null;
  const nodes=[];
  root.traverse(node=>nodes.push({node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()}));
  let initialized=false;
  return {
    apply(pose,dt,{snap=false}={}){
      mixer.setTime(pose*clipDuration);
      const amount=snap||!initialized?1:1-Math.exp(-10*dt);
      for(const entry of nodes){
        entry.position.lerp(entry.node.position,amount);
        entry.quaternion.slerp(entry.node.quaternion,amount);
        entry.scale.lerp(entry.node.scale,amount);
        entry.node.position.copy(entry.position);
        entry.node.quaternion.copy(entry.quaternion);
        entry.node.scale.copy(entry.scale);
      }
      initialized=true;
    }
  };
}
