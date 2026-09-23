const clamp01=v=>Math.max(0,Math.min(1,v));
const LISTENING=new Set(['spatial','focus','ambient']);
const NOISE=new Set(['adaptive','transparency']);

export function createModeController(){
  let listening='spatial', noise='adaptive', listeningWeight=0, noiseWeight=0;
  return {
    setListening(mode){ if(LISTENING.has(mode)){listening=mode; listeningWeight=Math.max(listeningWeight,.001);} },
    setNoise(mode){ if(NOISE.has(mode)){noise=mode; noiseWeight=Math.max(noiseWeight,.001);} },
    update(dt){
      const step=Math.max(0,Number(dt)||0);
      listeningWeight=clamp01(listeningWeight + step*4.5);
      noiseWeight=clamp01(noiseWeight + step*4.5);
    },
    getInfluence(){
      return {
        listening:{mode:listening,weight:listeningWeight},
        noise:{mode:noise,weight:noiseWeight}
      };
    }
  };
}
