/**
 * LeadFlow V2 — director-led animated narrative.
 * Everything shown in film mode is a reconstruction of a confirmed API receipt.
 * Timeline time is cinematic time, distinct from server duration. No invented
 * CRM/provider, LLM, outbound or real-time progress claims.
 */
import { ACTS, DURATION_MS, frameAt, validReceipt, advanceClock, clamp } from './storyboard-core.mjs';
const $ = id => document.getElementById(id);
const prettyTime = ms => `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor((ms%60000)/1000)).padStart(2,'0')}`;
const prefersReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function setText(el, value) { if (el) el.textContent = String(value); }
function setTransform(el, value) { if (el) el.style.transform = value; }

export class StoryDirector {
  constructor() {
    this.receipt = null;
    this.playhead = 0;
    this.speed = 1;
    this.playing = false;
    this.raf = 0;
    this.previousTick = null;
    this.lastAct = -1;
    this.pathLength = 0;
    this.lastFrame = null;
    this.initialized = false;
    this.render = this.render.bind(this);
    this.tick = this.tick.bind(this);
  }
  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.section = $('film'); this.stage = $('film-stage');
    this.title = $('film-title'); this.detail = $('film-detail');
    this.actLabel = $('film-act'); this.subtitle = $('film-subtitle');
    this.status = $('film-status'); this.announce = $('film-announcement');
    this.packet = $('film-packet'); this.packetName = $('film-packet-name');
    this.packetCompany = $('film-packet-company'); this.track = $('film-track');
    this.routeLine = $('film-route-line'); this.routeProgress = $('film-route-progress');
    this.stations = [...document.querySelectorAll('[data-film-station]')];
    this.scan = $('film-scan'); this.scanBand = $('film-scan-band');
    this.score = $('film-score'); this.scoreNumber = $('film-score-number');
    this.scoreLane = $('film-score-lane'); this.factors = $('film-factor-list');
    this.fault = $('film-fault'); this.faultLabel = $('film-fault-label');
    this.approval = $('film-approval'); this.approvalAction = $('film-approval-action');
    this.ending = $('film-ending'); this.endingLabel = $('film-ending-label');
    this.progress = $('film-progress'); this.clock = $('film-clock');
    this.playPause = $('film-pause'); this.replay = $('film-replay');
    this.skip = $('film-skip'); this.speedControl = $('film-speed');
    this.chapterBtns = [...document.querySelectorAll('[data-film-chapter]')];
    this.badge = $('film-receipt-label'); this.poster = $('film-poster');
    this.curtain = $('film-curtain');
    this.foreground = $('film-foreground');
    this.chip = $('film-chip');
    this.scanWord = $('film-scan-word');
    this.pathLength = this.routeLine?.getTotalLength?.() || 1;
    // Station markers share the exact physical SVG route used by the token.
    const anchors = [.125, .32, .56, .75, .94];
    this.stations.forEach((node, index) => {
      const point = this.routeLine.getPointAtLength(this.pathLength * anchors[index]);
      node.style.left = `${(point.x / 10).toFixed(3)}%`;
      node.style.top = `${(point.y / 4.6).toFixed(3)}%`;
    });
    this.routeProgress.style.strokeDasharray = String(this.pathLength);
    this.routeProgress.style.strokeDashoffset = String(this.pathLength);
    this.playPause?.addEventListener('click', () => this.playing ? this.pause() : this.play());
    this.replay?.addEventListener('click', () => this.replayFromStart());
    this.skip?.addEventListener('click', () => this.skipToEnd());
    this.progress?.addEventListener('input', () => this.seek(Number(this.progress.value), { fromUser: true }));
    this.speedControl?.addEventListener('change', () => { this.speed = Number(this.speedControl.value) || 1; });
    for (const button of this.chapterBtns) {
      button.addEventListener('click', () => this.seek(ACTS[Number(button.dataset.filmChapter)]?.start || 0, { fromUser: true }));
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.playing) this.pause({ visibility: true });
    });
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    if (query.addEventListener) query.addEventListener('change', e => { if (e.matches && this.receipt) this.skipToEnd({ reduced: true }); });
    this.resetUnverified();
  }

  resetUnverified() {
    this.pause({silent:true});
    this.receipt = null;
    this.playhead = 0;
    this.lastAct = -1;
    this.stage.dataset.state = 'idle';
    this.stage.dataset.act = 'arrival';
    setText(this.status, 'AWAITING VERIFIED DATA');
    setText(this.announce, 'Watch the story by running a verified synthetic workflow.');
    setText(this.badge, 'NO SERVER RECEIPT YET');
    this.setControls(false);
    this.progress.value = '0';
    setText(this.clock, `00:00 / ${prettyTime(DURATION_MS)}`);
    setText(this.title, ACTS[0].title);
    setText(this.detail, 'A real server response will supply the characters, score, routing decision and retry evidence in this story.');
    setText(this.actLabel, ACTS[0].overline);
    setText(this.subtitle, 'An authored playback of a verified API receipt — not a simulation of network progress.');
    this.packet?.style.setProperty('opacity', '0');
    if (this.poster) this.poster.hidden = false;
  }

  waiting() {
    this.resetUnverified();
    this.stage.dataset.state = 'waiting';
    setText(this.status, 'WAITING FOR REAL API');
    setText(this.announce, 'Waiting for a confirmed API response. No story has started.');
    setText(this.detail, 'The browser has requested a synthetic workflow run. Playback begins only after its server receipt is validated.');
  }
  fail() {
    this.resetUnverified();
    this.stage.dataset.state = 'failed';
    setText(this.status, 'API REQUEST FAILED');
    setText(this.announce, 'API request failed. No cinematic success story was played.');
    setText(this.detail, 'A verified receipt was not received. Try again when the API is available.');
  }

  setControls(available) {
    for (const el of [this.playPause, this.replay, this.skip, this.speedControl, this.progress, ...this.chapterBtns]) {
      if (el) el.disabled = !available;
    }
    this.updateTransport();
  }

  load(receipt, { autoplay = true, scroll = true } = {}) {
    this.init();
    if (!validReceipt(receipt)) {
      this.fail();
      throw new Error('Refusing to choreograph an unconfirmed or untrusted server response.');
    }
    this.pause({silent:true});
    this.receipt = receipt;
    this.playhead = 0;
    this.lastAct = -1;
    this.stage.dataset.state = 'ready';
    this.section?.classList.add('film-ready');
    setText(this.packetName, receipt.lead.name);
    setText(this.packetCompany, receipt.lead.company);
    setText(this.scoreLane, receipt.qualification.lane.toUpperCase());
    setText(this.approvalAction, receipt.qualification.action);
    setText(this.endingLabel, `${receipt.qualification.score}/100 · ${receipt.qualification.action}`);
    setText(this.badge, `SERVER RECEIPT / ${receipt.runId.slice(0,8)} / SYNTHETIC`);
    setText(this.announce, 'Confirmed server receipt received. Five-act visual story ready.');
    this.prepareFactorBars(receipt.qualification.factors);
    this.setControls(true);
    this.seek(0);
    if (this.poster) this.poster.hidden = true;
    if (scroll && this.section) this.section.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
    if (prefersReduced()) {
      this.skipToEnd({ reduced: true });
    } else if (autoplay) {
      this.play();
    }
  }

  prepareFactorBars(factors) {
    if (!this.factors) return;
    this.factors.replaceChildren();
    for (const [index, factor] of factors.entries()) {
      const row = document.createElement('div'); row.className = 'film-factor';
      row.dataset.factorIndex = String(index);
      const name = document.createElement('span'); name.className='film-factor-name'; name.textContent = factor.label;
      const rail = document.createElement('div'); rail.className='film-factor-rail';
      const fill = document.createElement('span'); fill.className='film-factor-fill';
      if (factor.points < 0) fill.classList.add('negative');
      rail.append(fill);
      const points = document.createElement('strong'); points.className='film-factor-value'; points.textContent = `${factor.points>=0 ? '+' : ''}${factor.points}`;
      row.append(name,rail,points);
      this.factors.append(row);
    }
  }

  play() {
    if (!this.receipt) return;
    if (prefersReduced()) { this.skipToEnd({ reduced: true }); return; }
    if (this.playhead >= DURATION_MS - 1) this.seek(0);
    if (this.playing) return;
    this.playing = true;
    this.stage.dataset.state = 'playing';
    this.previousTick = null;
    this.raf = requestAnimationFrame(this.tick);
    setText(this.status, 'DIRECTED PLAYBACK / SERVER VERIFIED');
    this.updateTransport();
  }
  pause({silent = false, visibility = false} = {}) {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.previousTick = null;
    if (this.receipt && this.playhead < DURATION_MS) {
      this.stage.dataset.state = 'paused';
      if (!silent) setText(this.status, visibility ? 'PAUSED / TAB IN BACKGROUND' : 'PAUSED / CINEMATIC TIMELINE');
    }
    this.updateTransport();
  }
  tick(timeNow) {
    if (!this.playing) return;
    if (this.previousTick === null) this.previousTick = timeNow;
    const delta = Math.min(100, Math.max(0, timeNow - this.previousTick));
    this.previousTick = timeNow;
    this.playhead = advanceClock({playhead: this.playhead, elapsed: delta, speed: this.speed});
    this.render(this.playhead);
    if (this.playhead >= DURATION_MS) {
      this.playing = false;
      this.raf = 0;
      this.stage.dataset.state = 'finished';
      setText(this.status,'THE STORY IS COMPLETE / RECEIPT VERIFIED');
      setText(this.announce,'Narrative complete. Human review required; no external CRM writes or messages were sent.');
      this.updateTransport();
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  }
  seek(next, {fromUser = false} = {}) {
    if (!this.receipt) return;
    this.playhead = clamp(next,0,DURATION_MS);
    this.previousTick = null;
    this.render(this.playhead);
    if (this.playhead >= DURATION_MS) {
      this.playing = false;
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.stage.dataset.state = 'finished';
      setText(this.status,'THE STORY IS COMPLETE / RECEIPT VERIFIED');
    } else if (fromUser && !this.playing) {
      this.stage.dataset.state = 'paused';
      setText(this.status,'SCRUBBED / CINEMATIC TIMELINE');
    }
    this.updateTransport();
  }
  replayFromStart() { if (!this.receipt) return; this.pause({silent:true}); this.seek(0); this.play(); }
  skipToEnd({reduced = false} = {}) {
    if (!this.receipt) return;
    this.pause({silent:true});
    this.seek(DURATION_MS);
    setText(this.status, reduced ? 'REDUCED MOTION / VERIFIED RESULT' : 'SKIPPED TO VERIFIED RESULT');
    setText(this.announce,'The score, sandbox state and human approval outcome are available without animation.');
  }
  updateTransport() {
    if (this.playPause) {
      this.playPause.textContent = this.playing ? 'Pause story ❚❚' : this.playhead >= DURATION_MS ? 'Play again ↺' : 'Play story ▶';
      this.playPause.setAttribute('aria-label',this.playing?'Pause cinematic story':'Play cinematic story');
    }
    if (this.progress) {
      this.progress.value = String(Math.round(this.playhead));
      this.progress.style.setProperty('--film-progress',`${this.playhead/DURATION_MS*100}%`);
    }
    setText(this.clock,`${prettyTime(this.playhead)} / ${prettyTime(DURATION_MS)}`);
  }

  render(time) {
    if (!this.receipt) return;
    const frame=frameAt(time,this.receipt);
    this.lastFrame = frame;
    const actChanged = frame.actIndex !== this.lastAct;
    if (actChanged) this.setAct(frame);
    this.stage.dataset.act=frame.act.id;
    this.stage.style.setProperty('--film-camera-x',`${(-frame.cameraX/100).toFixed(3)}%`);
    this.stage.style.setProperty('--film-camera-y',`${(frame.cameraY/100).toFixed(3)}%`);
    const length = this.pathLength || 1;
    const point = this.routeLine.getPointAtLength(length*frame.route);
    const nextPoint = this.routeLine.getPointAtLength(length*Math.min(.999,frame.route+.003));
    const tilt = clamp(Math.atan2(nextPoint.y-point.y,nextPoint.x-point.x)*180/Math.PI,-20,20);
    const x = point.x/10, y=point.y/4.6;
    this.packet.style.left=`${x}%`;
    this.packet.style.top=`${y}%`;
    this.packet.style.opacity=String(frame.packetOpacity);
    setTransform(this.packet,`translate(-50%,-50%) rotate(${tilt*.32}deg) scale(${frame.packetScale.toFixed(3)})`);
    this.routeProgress.style.strokeDashoffset=String((1-frame.route)*length);
    this.scan.style.opacity=String(frame.scanOpacity);
    this.scan.style.left=`${(20+frame.scan*65).toFixed(2)}%`;
    setTransform(this.scanBand,`translateX(${(-100+frame.scan*200).toFixed(1)}%)`);
    this.score.style.opacity=String(frame.scoreReveal);
    setTransform(this.score,`translate3d(0,${((1-frame.scoreReveal)*27).toFixed(1)}px,0) scale(${(.95+.05*frame.scoreReveal).toFixed(3)})`);
    setText(this.scoreNumber, String(frame.scoreDisplayed).padStart(2,'0'));
    this.factors.querySelectorAll('.film-factor').forEach((row,index) => {
      const factor=frame.factorRows[index];
      if (!factor) return;
      row.style.opacity=String(factor.reveal);
      setTransform(row,`translate3d(0,${(1-factor.reveal)*14}px,0)`);
      const fill=row.querySelector('.film-factor-fill');
      if (fill) fill.style.transform=`scaleX(${(factor.amount*factor.reveal).toFixed(3)})`;
    });
    this.approval.style.opacity=String(frame.approvalReveal);
    setTransform(this.approval,`translate3d(0,${((1-frame.approvalReveal)*33).toFixed(1)}px,0) rotate(${((1-frame.approvalReveal)*-6).toFixed(2)}deg)`);
    this.ending.style.opacity=String(frame.endReveal);
    this.curtain.style.opacity=String(frame.endReveal*.87);
    this.fault.style.opacity=frame.isFault?'1':'0';
    this.fault.dataset.active=frame.isFault?'true':'false';
    if (frame.isFault) setText(this.faultLabel,`SIMULATED CRM TIMEOUT / ATTEMPT ${frame.faultSequence} OF ${frame.attempts}`);
    if (this.chip) {
      this.chip.className='film-chip'+(frame.isFault?' is-fault':frame.connectorAccepted?' is-accepted':'');
      setText(this.chip,frame.isFault ? `Sandbox timeout ${frame.faultSequence}/2` : frame.connectorAccepted ? 'Sandbox contract accepted' : 'Contract only · no external write');
    }
    this.stations.forEach((station,index) => {
      const threshold=[.08,.28,.5,.74,.92][index];
      const active=frame.route>=threshold-.08 && frame.route<=threshold+.06;
      const done=frame.route > threshold+.06 || (frame.endReveal > .6);
      station.classList.toggle('is-current',active);
      station.classList.toggle('is-confirmed',done);
      station.classList.toggle('is-fault',index===3 && frame.isFault);
    });
    this.chapterBtns.forEach((button,index) => {
      const active=index===frame.actIndex;
      button.classList.toggle('is-active',active);
      if(active) button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    });
    if(this.foreground) this.foreground.style.opacity=String(.5+frame.scanOpacity*.3+frame.endReveal*.2);
    this.progress.value=String(Math.round(frame.t));
    this.progress.style.setProperty('--film-progress',`${(frame.fraction*100).toFixed(2)}%`);
    setText(this.clock,`${prettyTime(frame.t)} / ${prettyTime(DURATION_MS)}`);
  }

  setAct(frame) {
    this.lastAct=frame.actIndex;
    let detail=frame.act.detail;
    if(frame.act.id==='arrival') detail=`${frame.recordName} at ${frame.org} submits a synthetic enquiry. Here begins a trace we can inspect.`;
    if(frame.act.id==='decision') detail=`The verified server response gives ${frame.score}/100 and the ${frame.lane.toUpperCase()} lane. Every factor can be explained.`;
    if(frame.act.id==='handoff') detail=frame.showFaults?`The confirmed trace contains two simulated sandbox timeouts, then acceptance on attempt ${frame.attempts}. This is not an external provider outage.`:'A contract-validated CRM payload is accepted in a sandbox, not sent to an external provider.';
    if(frame.act.id==='resolution') detail=`The final action is “${frame.routeLabel}.” Follow-up remains a draft requiring human approval.`;
    setText(this.title,frame.act.title);
    setText(this.detail,detail);
    setText(this.actLabel,frame.act.overline);
    setText(this.subtitle,`${String(frame.actIndex+1).padStart(2,'0')} / ${frame.act.beat.toUpperCase()} · AUTHORED REPLAY OF A CONFIRMED SERVER RECEIPT`);
    setText(this.announce,`${frame.act.overline}. ${detail}`);
    if (!prefersReduced() && this.title?.animate && this.playing) {
      this.title.animate([{opacity:.25,transform:'translate3d(0,20px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:730,easing:'cubic-bezier(.16,1,.3,1)'});
      this.detail?.animate([{opacity:0,transform:'translate3d(0,14px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:830,delay:140,easing:'cubic-bezier(.16,1,.3,1)'});
    }
  }
}
export const film = new StoryDirector();
