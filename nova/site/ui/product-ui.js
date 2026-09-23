const LISTENING = new Set(['spatial','focus','ambient']);
const NOISE = new Set(['adaptive','transparency']);
const FOLD = new Set(['open','fold']);

function setPressed(selector,value,dataKey){
  document.querySelectorAll(selector).forEach(button => {
    const active = button.dataset[dataKey] === value;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('is-active', active);
  });
}

export function bindProductUI(actions){
  document.querySelectorAll('[data-listening-mode]').forEach(button => {
    button.addEventListener('click', () => {
      const mode=button.dataset.listeningMode;
      if(LISTENING.has(mode)) actions.setListeningMode?.(mode);
    });
  });
  document.querySelectorAll('[data-noise-mode]').forEach(button => {
    button.addEventListener('click', () => {
      const mode=button.dataset.noiseMode;
      if(NOISE.has(mode)) actions.setNoiseMode?.(mode);
    });
  });
  document.querySelectorAll('[data-fold-state]').forEach(button => {
    button.addEventListener('click', () => {
      const state=button.dataset.foldState;
      if(FOLD.has(state)) actions.setFoldState?.(state);
    });
  });
  document.querySelectorAll('[data-hotspot]').forEach(button => {
    button.addEventListener('click', () => actions.focusHotspot?.(button.dataset.hotspot));
  });
  document.querySelector('#inspectionReset')?.addEventListener('click', () => actions.resetInspection?.());
  document.querySelector('#replay')?.addEventListener('click', () => actions.replay?.());
  document.querySelector('#notifyConcept')?.addEventListener('click', () => {
    document.body.dataset.notifyConcept = document.body.dataset.notifyConcept === 'open' ? 'closed' : 'open';
  });
}

export function updateProductUI(state){
  const ui=state?.ui || {};
  document.body.dataset.range=ui.range || state?.range || 'hero';
  document.body.dataset.theme=ui.dark ? 'dark' : 'light';
  document.body.dataset.settled=String(Boolean(ui.settled));
  document.querySelector('#experienceProgress')?.style.setProperty('width', `${Math.round((state?.progress||0)*100)}%`);
  if(state?.interaction){
    setPressed('[data-listening-mode]',state.interaction.listeningMode,'listeningMode');
    setPressed('[data-noise-mode]',state.interaction.noiseMode,'noiseMode');
    setPressed('[data-fold-state]',state.interaction.foldState,'foldState');
  }
}
