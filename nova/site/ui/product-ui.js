const LISTENING = new Set(['spatial','focus','ambient']);
const NOISE = new Set(['adaptive','transparency']);
const FOLD = new Set(['open','fold']);
const INSPECTION = new Set(['front','side','rear']);
const TOUR_ORDER = ['comfort','fold','controls'];
const NAV_TARGET = {
  hero:'#hero',
  design:'#design',
  spatial:'#sound',
  adaptive:'#control',
  form:'#form',
  inspect:'#experience',
  resolution:'#discover',
  behind:'#behind'
};

const STORY_META = {
  hero:['01 / 08','Arrival','FORM REVEAL'],
  design:['02 / 08','Design','CUSHION → HINGE → TOUCH'],
  spatial:['03 / 08','Sound','WIRELESS LINK'],
  adaptive:['04 / 08','Control','QUIET ↔ AWARE'],
  form:['05 / 08','Flexibility','OPEN → FOLD → OPEN'],
  inspect:['06 / 08','360°','FRONT / SIDE / REAR'],
  resolution:['07 / 08','Specifications','BATTERY / BT / MULTIPOINT'],
  behind:['08 / 08','Build','REAL-TIME GLTF SYSTEM']
};

const LISTENING_COPY = {
  spatial:'LDAC is included in the reference codec set for compatible Bluetooth source devices.',
  focus:'AAC is included in the reference codec set for practical playback across supported devices.',
  ambient:'LC3 is included alongside SBC, AAC and LDAC in the reference Bluetooth codec set.'
};
const NOISE_COPY = {
  adaptive:'Noise Canceling is the reference mode for reducing outside sound during travel, work and focused listening.',
  transparency:'Ambient Sound keeps useful surroundings available when awareness matters.'
};

const actions = {};
let bound = false;

function setPressed(selector,value,dataKey){
  document.querySelectorAll(selector).forEach(button => {
    const active = button.dataset[dataKey] === value;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('is-active', active);
  });
}

function setDescription(id,label,copy){
  const el=document.querySelector(id);
  if(el) el.innerHTML='<strong>'+label+'</strong> '+copy;
}

function setDialog({open,bodyKey,trigger,panel,shell,focusTarget}){
  document.body.dataset[bodyKey]=open?'open':'closed';
  trigger?.setAttribute('aria-expanded',String(open));
  panel?.setAttribute('aria-hidden',String(!open));
  shell?.setAttribute('aria-hidden',String(!open));
  if(open) requestAnimationFrame(()=>focusTarget?.focus?.());
  else trigger?.focus?.();
}

export function set3dAvailability(available){
  const value=Boolean(available);
  document.body.dataset.threeDAvailable=String(value);
  document.querySelectorAll('[data-requires-3d="true"]').forEach(control=>{
    if('disabled' in control) control.disabled=!value;
    control.setAttribute('aria-disabled',String(!value));
  });
}

export function bindProductUI(nextActions={}){
  Object.assign(actions,nextActions);
  if(bound) return;
  bound=true;

  document.body.dataset.mobileNav='closed';
  document.body.dataset.productFacts='closed';
  document.body.dataset.guidedTour='closed';

  document.querySelectorAll('[data-listening-mode]').forEach(button => {
    button.addEventListener('click', () => {
      const mode=button.dataset.listeningMode;
      if(!LISTENING.has(mode)) return;
      setPressed('[data-listening-mode]',mode,'listeningMode');
      setDescription('#listeningModeDescription',button.textContent.trim(),LISTENING_COPY[mode]);
      actions.setListeningMode?.(mode);
    });
  });

  document.querySelectorAll('[data-noise-mode]').forEach(button => {
    button.addEventListener('click', () => {
      const mode=button.dataset.noiseMode;
      if(!NOISE.has(mode)) return;
      setPressed('[data-noise-mode]',mode,'noiseMode');
      setDescription('#noiseModeDescription',button.textContent.trim(),NOISE_COPY[mode]);
      actions.setNoiseMode?.(mode);
    });
  });

  document.querySelectorAll('[data-fold-state]').forEach(button => {
    button.addEventListener('click', () => {
      const state=button.dataset.foldState;
      if(!FOLD.has(state) || button.disabled) return;
      setPressed('[data-fold-state]',state,'foldState');
      actions.setFoldState?.(state);
    });
  });

  document.querySelectorAll('[data-inspection-view]').forEach(button=>{
    button.addEventListener('click',()=>{
      const view=button.dataset.inspectionView;
      if(!INSPECTION.has(view) || button.disabled) return;
      setPressed('[data-inspection-view]',view,'inspectionView');
      actions.setInspectionView?.(view);
    });
  });

  document.querySelectorAll('[data-hotspot]').forEach(button => {
    button.addEventListener('click', () => {
      if(button.disabled) return;
      const expanded=button.getAttribute('aria-expanded')==='true';
      if(expanded) actions.clearHotspot?.();
      else actions.focusHotspot?.(button.dataset.hotspot);
    });
  });

  document.querySelectorAll('[data-detail-id]').forEach(button=>{
    button.addEventListener('click',()=>{
      const target=button.dataset.detailTarget;
      const detail=button.dataset.detailId;
      const hotspot=target?document.querySelector('[data-hotspot="'+target+'"]'):null;
      if(hotspot?.getAttribute('aria-expanded')==='true') actions.clearHotspot?.();
      else if(detail&&target) actions.selectDesignDetail?.(detail,target);
    });
  });

  document.querySelector('#inspectionReset')?.addEventListener('click', event => {
    if(event.currentTarget.disabled) return;
    setPressed('[data-inspection-view]','front','inspectionView');
    actions.resetInspection?.();
  });
  document.querySelector('#replay')?.addEventListener('click', () => actions.replay?.());

  const mobileToggle=document.querySelector('#mobileNavToggle');
  const mobilePanel=document.querySelector('#mobileNavPanel');
  const setMobileNav=open=>{
    document.body.dataset.mobileNav=open?'open':'closed';
    mobileToggle?.setAttribute('aria-expanded',String(open));
    mobilePanel?.setAttribute('aria-hidden',String(!open));
  };
  mobileToggle?.addEventListener('click',()=>setMobileNav(document.body.dataset.mobileNav!=='open'));
  mobilePanel?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMobileNav(false)));

  const tourTrigger=document.querySelector('#guidedTourStart');
  const tourPanel=document.querySelector('#guidedTourPanel');
  const tourShell=document.querySelector('.tour-shell');
  const tourStatus=document.querySelector('#guidedTourStatus');
  let tourIndex=0;
  const setTourOpen=open=>setDialog({
    open,bodyKey:'guidedTour',trigger:tourTrigger,panel:tourPanel,shell:tourShell,focusTarget:tourPanel
  });
  const activateTourStep=(step,{move=true}={})=>{
    const index=TOUR_ORDER.indexOf(step);
    if(index<0) return;
    tourIndex=index;
    document.querySelectorAll('[data-tour-step]').forEach(button=>{
      const active=button.dataset.tourStep===step;
      button.setAttribute('aria-pressed',String(active));
      button.classList.toggle('is-active',active);
    });
    const next=document.querySelector('[data-tour-next]');
    const prev=document.querySelector('[data-tour-prev]');
    if(prev) prev.disabled=tourIndex===0;
    if(next) next.textContent=tourIndex===TOUR_ORDER.length-1?'Finish tour':'Next moment';
    if(tourStatus){
      const label=document.querySelector('[data-tour-step="'+step+'"] strong')?.textContent || step;
      tourStatus.textContent='Moment '+(tourIndex+1)+' of '+TOUR_ORDER.length+' / '+label;
    }
    if(move) actions.tourTo?.(step);
  };
  tourTrigger?.addEventListener('click',()=>{
    setTourOpen(true);
    activateTourStep('comfort');
  });
  document.querySelectorAll('[data-tour-step]').forEach(button=>button.addEventListener('click',()=>{
    activateTourStep(button.dataset.tourStep);
  }));
  document.querySelector('[data-tour-prev]')?.addEventListener('click',()=>{
    activateTourStep(TOUR_ORDER[Math.max(0,tourIndex-1)]);
  });
  document.querySelector('[data-tour-next]')?.addEventListener('click',()=>{
    if(tourIndex>=TOUR_ORDER.length-1){
      setTourOpen(false);
      return;
    }
    activateTourStep(TOUR_ORDER[tourIndex+1]);
  });
  document.querySelectorAll('[data-tour-close]').forEach(button=>button.addEventListener('click',()=>setTourOpen(false)));

  const factsTrigger=document.querySelector('#productFactsTrigger');
  const factsPanel=document.querySelector('#productFactsPanel');
  const factsShell=document.querySelector('.facts-shell');
  const setFactsOpen=open=>setDialog({
    open,bodyKey:'productFacts',trigger:factsTrigger,panel:factsPanel,shell:factsShell,focusTarget:factsPanel
  });
  factsTrigger?.addEventListener('click',()=>setFactsOpen(true));
  document.querySelectorAll('[data-facts-close]').forEach(button=>button.addEventListener('click',()=>setFactsOpen(false)));

  const projectBrief='I would like an interactive 3D product website similar to NOVA, adapted to my real product, brand, assets and conversion goal.';
  const briefButton=document.querySelector('#copyProjectBrief');
  const briefStatus=document.querySelector('#projectBriefStatus');
  briefButton?.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText(projectBrief);
      if(briefStatus) briefStatus.textContent='Project brief copied.';
    }catch{
      if(briefStatus) briefStatus.textContent=projectBrief;
    }
  });

  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape') return;
    if(document.body.dataset.productFacts==='open') setFactsOpen(false);
    if(document.body.dataset.guidedTour==='open') setTourOpen(false);
    if(document.body.dataset.mobileNav==='open') setMobileNav(false);
  });
}

const uiCache={
  range:null,theme:null,settled:null,designDetail:null,progress:-1,
  listeningMode:null,noiseMode:null,foldState:null,inspectionView:null
};

function updateStoryChrome(range){
  const meta=STORY_META[range]||STORY_META.hero;
  const index=document.querySelector('#storyChapterIndex');
  const title=document.querySelector('#storyChapterTitle');
  const cue=document.querySelector('#storyChapterCue');
  if(index) index.textContent=meta[0];
  if(title) title.textContent=meta[1];
  if(cue) cue.textContent=meta[2];
  document.querySelectorAll('[data-story-range]').forEach(link=>{
    const active=link.dataset.storyRange===range;
    link.classList.toggle('is-active',active);
    if(active) link.setAttribute('aria-current','step');
    else link.removeAttribute('aria-current');
  });
}

export function updateProductUI(state){
  const ui=state?.ui || {};
  const range=ui.range || state?.range || 'hero';
  const theme=ui.dark ? 'dark' : 'light';
  const settled=String(Boolean(ui.settled));

  if(uiCache.range!==range){
    uiCache.range=range;
    document.body.dataset.range=range;
    updateStoryChrome(range);
    const activeTarget=NAV_TARGET[range] || null;
    document.querySelectorAll('.product-nav a[href^="#"],.mobile-nav a[href^="#"]').forEach(link=>{
      const active=Boolean(activeTarget && link.getAttribute('href')===activeTarget);
      link.classList.toggle('is-active',active);
      if(active) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
  }
  if(uiCache.theme!==theme){
    uiCache.theme=theme;
    document.body.dataset.theme=theme;
  }
  if(uiCache.settled!==settled){
    uiCache.settled=settled;
    document.body.dataset.settled=settled;
  }

  const designDetail=range==='design'
    ? (state?.rangeProgress < .34 ? 'cushion' : state?.rangeProgress < .68 ? 'hinge' : 'controls')
    : 'none';
  if(uiCache.designDetail!==designDetail){
    uiCache.designDetail=designDetail;
    document.body.dataset.designDetail=designDetail;
    document.querySelectorAll('[data-detail-id]').forEach(button=>{
      const active=button.dataset.detailId===designDetail;
      button.setAttribute('aria-pressed',String(active));
      button.classList.toggle('is-active',active);
    });
  }

  const progress=Math.round(Math.max(0,Math.min(1,state?.progress||0))*1000)/1000;
  if(uiCache.progress!==progress){
    uiCache.progress=progress;
    document.documentElement.style.setProperty('--story-progress',String(progress));
  }

  const interaction=state?.interaction;
  if(interaction){
    if(uiCache.listeningMode!==interaction.listeningMode){
      uiCache.listeningMode=interaction.listeningMode;
      setPressed('[data-listening-mode]',interaction.listeningMode,'listeningMode');
    }
    if(uiCache.noiseMode!==interaction.noiseMode){
      uiCache.noiseMode=interaction.noiseMode;
      setPressed('[data-noise-mode]',interaction.noiseMode,'noiseMode');
    }
    if(uiCache.foldState!==interaction.foldState){
      uiCache.foldState=interaction.foldState;
      setPressed('[data-fold-state]',interaction.foldState,'foldState');
    }
    const view=interaction.inspectionView || 'front';
    if(uiCache.inspectionView!==view){
      uiCache.inspectionView=view;
      setPressed('[data-inspection-view]',view,'inspectionView');
    }
  }
}
