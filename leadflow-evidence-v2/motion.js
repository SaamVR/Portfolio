/**
 * LeadFlow V2 Motion Director
 *
 * Cinematography and interaction layer. It does not mutate qualification,
 * CRM, API commands, or storage. Success motion begins only after an actual
 * successful server response has been validated by app.js.
 *
 * All animation is opt-out and honors prefers-reduced-motion.
 */
const stages = [
  {
    title: "Lead intake",
    detail: "The browser sends an allowlisted synthetic scenario. The endpoint validates the command before beginning the run.",
    signal: "01 — VALIDATED INPUT"
  },
  {
    title: "Qualification engine",
    detail: "Deterministic scoring evaluates budget, urgency and intent. The backend—not the animation—sets the score and route.",
    signal: "02 — SERVER POLICY"
  },
  {
    title: "CRM sandbox",
    detail: "A contract-valid CRM payload is created. All external writes remain disabled; injected timeouts are sandbox events.",
    signal: "03 — SANDBOX ADAPTER"
  },
  {
    title: "Human oversight",
    detail: "A follow-up is drafted for review. Nothing is sent automatically and the demo CRM remains browser-local.",
    signal: "04 — HUMAN APPROVAL"
  }
];
const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const prefersFinePointer = () => window.matchMedia("(pointer: fine)").matches;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

class LeadFlowMotionDirector {
  constructor() {
    this.enabled = !prefersReduced();
    this.timerIds = new Set();
    this.animations = new Set();
    this.epoch = 0;
    this.selectedStage = 0;
    this.status = "idle";
    this.lastResult = null;
    this.scrollQueued = false;
    this.media = window.matchMedia("(prefers-reduced-motion: reduce)");
  }

  init() {
    document.documentElement.dataset.motion = this.enabled ? "on" : "off";
    this.nodes = [...document.querySelectorAll(".flow-node[data-stage-index]")];
    this.hero = document.querySelector(".hero-visual");
    this.lab = document.querySelector("#lab");
    this.inspectorTitle = document.getElementById("stage-title");
    this.inspectorDetail = document.getElementById("stage-description");
    this.inspectorStep = document.getElementById("stage-label");
    this.progress = document.getElementById("reading-progress");
    this.toggler = document.getElementById("motion-toggle");
    this.signal = document.getElementById("execution-signal");
    this.signalText = document.getElementById("execution-signal-text");
    this.stageAdvance = document.getElementById("stage-advance");
    this.replayStages = document.getElementById("replay-stages");
    this.replayVisual = document.getElementById("replay-visual-button");
    this.phases = [...document.querySelectorAll("[data-execution-phase]")];
    this.phaseLabel = document.getElementById("execution-map-label");
    this.factorsPanel = document.getElementById("score-factors");
    this.updateToggle();
    this.updateStage(0);
    this.bindStageInspection();
    this.bindScrollReveal();
    this.bindParallax();
    this.bindReadingProgress();
    this.bindMotionSettings();
    this.bindScenarioMicroMotion();
    this.bindMagneticButtons();
    this.bindTour();
    this.replayVisual?.addEventListener("click", () => {
      if (this.lastResult && this.status !== "running") this.onSuccess(this.lastResult);
    });
  }

  bindMotionSettings() {
    this.toggler?.addEventListener("click", () => {
      this.enabled = !this.enabled && !prefersReduced();
      document.documentElement.dataset.motion = this.enabled ? "on" : "off";
      this.stopAnimations();
      this.restoreConfirmedState();
      document.querySelectorAll(".reveal").forEach(e => e.classList.add("in-view"));
      this.hero?.style.removeProperty("--scene-x");
      this.hero?.style.removeProperty("--scene-y");
      this.updateToggle();
    });
    const onPreference = event => {
      this.enabled = !event.matches;
      document.documentElement.dataset.motion = this.enabled ? "on" : "off";
      this.stopAnimations();
      this.restoreConfirmedState();
      document.querySelectorAll(".reveal").forEach(e => e.classList.add("in-view"));
      this.updateToggle();
    };
    if (this.media.addEventListener) this.media.addEventListener("change", onPreference);
    else this.media.addListener(onPreference);
  }

  updateToggle() {
    if (!this.toggler) return;
    this.toggler.setAttribute("aria-pressed", String(this.enabled));
    const inner = this.toggler.querySelector(".motion-toggle-state");
    if (inner) inner.textContent = this.enabled ? "ON" : "OFF";
    this.toggler.setAttribute("aria-label", this.enabled ? "Turn decorative motion off" : "Turn decorative motion on");
    this.toggler.title = prefersReduced() ? "Your device requests reduced motion" : "Toggle decorative motion";
  }

  bindStageInspection() {
    this.nodes.forEach((node, index) => {
      node.addEventListener("click", () => this.updateStage(index, true));
      node.addEventListener("focus", () => this.updateStage(index, false));
      node.addEventListener("mouseenter", () => {
        if (prefersFinePointer()) this.updateStage(index, false);
      });
    });
    this.stageAdvance?.addEventListener("click", () => this.updateStage((this.selectedStage + 1) % stages.length, true));
  }

  updateStage(index, fromClick = false) {
    if (!this.nodes?.length) return;
    this.selectedStage = clamp(index, 0, stages.length - 1);
    const stage = stages[this.selectedStage];
    this.nodes.forEach((node, i) => {
      const selected = i === this.selectedStage;
      node.classList.toggle("is-inspected", selected);
      node.setAttribute("aria-pressed", String(selected));
    });
    if (this.inspectorTitle) this.inspectorTitle.textContent = stage.title;
    if (this.inspectorDetail) this.inspectorDetail.textContent = stage.detail;
    if (this.inspectorStep) this.inspectorStep.textContent = stage.signal;
    if (fromClick) {
      const target = this.inspectorTitle?.closest(".stage-inspector");
      this.spring(target, 1.012);
    }
  }

  bindScrollReveal() {
    const targets = [
      ...document.querySelectorAll(".section-heading, .scenario-panel, .monitor-panel, .output-panel, .arch-card, .architecture-note, .failure-feature, .failure-steps, .evidence-table, .evidence-foot, .compare-card")
    ];
    if (!this.enabled || !("IntersectionObserver" in window)) return;
    // IntersectionObserver is observed before visibility styling is enabled.
    targets.forEach((node, index) => {
      node.classList.add("reveal");
      node.style.setProperty("--reveal-index", String(index % 4));
    });
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -18px 0px" });
    targets.forEach(node => io.observe(node));
    this.revealObserver = io;
  }

  bindParallax() {
    if (!this.hero) return;
    this.hero.addEventListener("pointermove", event => {
      if (!this.enabled || event.pointerType === "touch" || !prefersFinePointer()) return;
      const rect = this.hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      this.hero.style.setProperty("--scene-x", String((x * 3.4).toFixed(3)) + "deg");
      this.hero.style.setProperty("--scene-y", String((-y * 2.9).toFixed(3)) + "deg");
    }, { passive: true });
    this.hero.addEventListener("pointerleave", () => {
      this.hero.style.setProperty("--scene-x", "0deg");
      this.hero.style.setProperty("--scene-y", "0deg");
    });
  }

  bindReadingProgress() {
    const update = () => {
      this.scrollQueued = false;
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      if (this.progress) this.progress.style.transform = "scaleX(" + clamp(scrollY / max, 0, 1) + ")";
      const sections = [...document.querySelectorAll("main section[id]")];
      const active = [...sections].reverse().find(e => e.getBoundingClientRect().top < innerHeight * 0.4);
      for (const link of document.querySelectorAll('.nav a[href^="#"]')) {
        const isCurrent = active && link.getAttribute("href") === "#" + active.id;
        link.classList.toggle("nav-active", Boolean(isCurrent));
        if (isCurrent) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
      }
    };
    addEventListener("scroll", () => {
      if (!this.scrollQueued) {
        this.scrollQueued = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    addEventListener("resize", () => requestAnimationFrame(update), { passive: true });
    requestAnimationFrame(update);
  }

  bindScenarioMicroMotion() {
    for (const btn of document.querySelectorAll("[data-scenario]")) {
      btn.addEventListener("click", () => {
        if (!this.enabled) return;
        this.spring(btn, 1.016);
      });
    }
  }

  bindMagneticButtons() {
    // A small physical response, not a cursor chase or heavy scroll animation.
    for (const el of document.querySelectorAll(".btn")) {
      el.addEventListener("pointerdown", () => {
        if (this.enabled) this.spring(el, 0.96);
      });
    }
  }

  bindTour() {
    this.replayStages?.addEventListener("click", () => {
      if (this.status === "running") return;
      this.stopAnimations();
      this.status = "exploring";
      let i = 0;
      const next = () => {
        this.updateStage(i++, false);
        this.spring(this.nodes[this.selectedStage], 1.03);
        if (i < stages.length) this.schedule(next, this.enabled ? 720 : 10);
        else this.schedule(() => { if (this.status === "exploring") this.status = "idle"; }, 300);
      };
      next();
    });
  }

  schedule(fn, ms) {
    const id = setTimeout(() => {
      this.timerIds.delete(id);
      fn();
    }, ms);
    this.timerIds.add(id);
    return id;
  }

  animate(el, frames, timing) {
    if (!this.enabled || !el || !el.isConnected || !el.animate) return null;
    const animation = el.animate(frames, { fill: "none", ...timing });
    this.animations.add(animation);
    animation.addEventListener("finish", () => this.animations.delete(animation), { once: true });
    animation.addEventListener("cancel", () => this.animations.delete(animation), { once: true });
    return animation;
  }

  spring(el, scale = 1.05) {
    this.animate(el, [
      { transform: "scale(1)" },
      { transform: "scale(" + scale + ")", offset: 0.46 },
      { transform: "scale(.992)", offset: .73 },
      { transform: "scale(1)" }
    ], { duration: 470, easing: "cubic-bezier(.22,.76,.2,1)" });
  }

  stopAnimations() {
    ++this.epoch;
    for (const id of this.timerIds) clearTimeout(id);
    this.timerIds.clear();
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
    document.querySelectorAll(".flow-node").forEach(node => {
      node.classList.remove("stage-running", "stage-done", "stage-fault");
      const dot = node.querySelector(".node-check");
      if (dot) dot.textContent = "·";
    });
    this.hero?.classList.remove("flow-playing", "flow-complete", "flow-fault");
    this.phases?.forEach(node => node.classList.remove("phase-pending", "phase-done", "phase-fault"));
    if (this.phaseLabel) this.phaseLabel.textContent = "AWAITING SERVER";
    document.body.classList.remove("workflow-running", "workflow-success");
  }

  restoreConfirmedState() {
    if (!this.lastResult) return;
    this.nodes?.forEach(node => this.markStage(node, "done"));
    this.phases?.forEach(node => this.markPhase(node, "done"));
    if (this.phaseLabel) this.phaseLabel.textContent = "SERVER TRACE COMPLETE";
  }

  onStart() {
    this.stopAnimations();
    this.lastResult = null;
    this.status = "running";
    document.body.classList.add("workflow-running");
    this.hero?.classList.add("flow-playing");
    this.updateStage(0);
    this.nodes?.[0]?.classList.add("stage-running");
    this.setSignal("Awaiting the actual API response", "running");
    this.phases?.[0]?.classList.add("phase-pending");
    if (this.factorsPanel) this.factorsPanel.hidden = true;
    if (this.phaseLabel) this.phaseLabel.textContent = "REQUEST IN FLIGHT";
    if (this.replayVisual) this.replayVisual.disabled = true;
    const active = document.getElementById("run-button");
    if (this.enabled) this.animate(active, [
      { boxShadow: "0 0 0 0 rgba(99,154,107,0)" },
      { boxShadow: "0 0 0 7px rgba(99,154,107,.16)" },
      { boxShadow: "0 0 0 0 rgba(99,154,107,0)" }
    ], { duration: 950, iterations: Infinity });
  }

  onSuccess(data) {
    this.stopAnimations();
    this.status = "confirmed";
    this.lastResult = data;
    this.hero?.classList.add("flow-playing");
    document.body.classList.add("workflow-success");
    const isFault = data.events.some(event => event.stage === "crm.sandbox.timeout");
    this.setSignal(isFault ? "Confirmed server trace · simulated recovery" : "Confirmed server trace · successful response", "confirmed");
    const phase = [0,1,2,3].filter(i => i !== 2 || data.crm?.status === "accepted");
    if (this.replayVisual) this.replayVisual.disabled = false;
    if (this.phaseLabel) this.phaseLabel.textContent = "CONFIRMED TRACE · VISUAL REPLAY";
    this.renderFactors(data.qualification?.factors || []);
    this.animatePacket(data.qualification?.lane || "review");
    this.spring(document.getElementById("score-value"), 1.12);
    this.spring(document.getElementById("local-count"), 1.1);
    this.animate(document.querySelector(".metrics-row"),[
      { backgroundColor: "rgba(211,238,164,.4)" },
      { backgroundColor: "transparent" }
    ], { duration: 900, easing: "ease-out" });
    document.querySelectorAll("#trace-list .trace-event").forEach((el, index) => {
      this.animate(el, [
        { opacity: .18, transform:"translate3d(0,12px,0)" },
        { opacity: 1, transform:"translate3d(0,0,0)" }
      ], { duration: 550, delay: Math.min(index, 12) * 72, easing: "cubic-bezier(.16,1,.3,1)" });
    });
    if (!this.enabled) {
      this.nodes?.forEach(node => this.markStage(node,"done"));
      this.phases?.forEach(node => this.markPhase(node, "done"));
      if (this.phaseLabel) this.phaseLabel.textContent = "SERVER TRACE COMPLETE";
      this.status="idle";
      return;
    }
    const startEpoch = this.epoch;
    let n = 0;
    const advance = () => {
      if (startEpoch !== this.epoch) return;
      if (n >= phase.length) {
        this.hero?.classList.add("flow-complete");
        if (this.phaseLabel) this.phaseLabel.textContent = "SERVER TRACE COMPLETE";
        this.status = "idle";
        return;
      }
      const idx = phase[n];
      this.updateStage(idx);
      if (idx === 2 && isFault) {
        this.nodes[idx]?.classList.add("stage-fault");
        this.markPhase(this.phases?.[idx], "fault");
        this.spring(this.nodes[idx], 1.025);
        this.schedule(() => {
          if (startEpoch !== this.epoch) return;
          this.nodes[idx]?.classList.remove("stage-fault");
          this.markStage(this.nodes[idx],"done");
          this.markPhase(this.phases?.[idx], "done");
          n++;
          this.schedule(advance, 210);
        }, 340);
      } else {
        this.markStage(this.nodes[idx],"done");
        this.markPhase(this.phases?.[idx], "done");
        this.spring(this.nodes[idx], 1.025);
        n++;
        this.schedule(advance, 250);
      }
    };
    advance();
  }

  markPhase(node, state) {
    if (!node) return;
    node.classList.remove("phase-pending","phase-done","phase-fault");
    node.classList.add(state === "fault" ? "phase-fault" : state === "done" ? "phase-done" : "phase-pending");
    if (state === "done") this.spring(node.querySelector(".execution-phase-icon"), 1.17);
  }

  renderFactors(factors) {
    if (!this.factorsPanel) return;
    this.factorsPanel.replaceChildren();
    const header = document.createElement("div");
    header.className="score-factors-head";
    const title = document.createElement("strong");
    title.textContent="EXPLAINABLE SCORE CONTRIBUTIONS";
    const note = document.createElement("span");
    note.textContent="FROM CONFIRMED API RESPONSE";
    header.append(title,note);
    this.factorsPanel.append(header);
    for (const factor of factors) {
      const row = document.createElement("div");
      row.className="score-factor" + (factor.points < 0 ? " negative" : "");
      const label = document.createElement("span");
      label.className="score-factor-label";
      label.textContent=factor.label;
      const barTrack=document.createElement("div");
      barTrack.className="score-factor-track";
      const fill=document.createElement("div");
      fill.className="score-factor-fill";
      fill.style.width=Math.min(100, Math.abs(factor.points)/30*100)+"%";
      barTrack.append(fill);
      const value=document.createElement("strong");
      value.textContent=(factor.points>=0?"+":"")+factor.points;
      row.append(label,barTrack,value);
      this.factorsPanel.append(row);
      this.animate(fill,[{transform:"scaleX(0)"},{transform:"scaleX(1)"}],{
        duration:680,delay:this.factorsPanel.children.length*72,easing:"cubic-bezier(.15,1,.3,1)"
      });
    }
    this.factorsPanel.hidden=false;
  }

  markStage(node, state) {
    if (!node) return;
    node.classList.remove("stage-running", "stage-fault");
    if (state==="done") node.classList.add("stage-done");
    const dot=node.querySelector(".node-check");
    if (dot) dot.textContent = state==="done" ? "✓" : "·";
  }

  onError() {
    this.stopAnimations();
    this.status = "error";
    this.setSignal("API request failed · no success animation", "error");
    if (this.phaseLabel) this.phaseLabel.textContent = "REQUEST FAILED · NO CONFIRMED TRACE";
    this.markPhase(this.phases?.[0], "fault");
    this.hero?.classList.add("flow-fault");
    this.updateStage(0);
    this.nodes?.[0]?.classList.add("stage-fault");
  }

  onScenarioSelected() {
    if (this.status === "running") return;
    this.stopAnimations();
    this.status = "idle";
    this.updateStage(0);
    this.setSignal("Choose a scenario to execute on the server", "idle");
    this.lastResult = null;
    if (this.replayVisual) this.replayVisual.disabled = true;
    if (this.phaseLabel) this.phaseLabel.textContent = "AWAITING FIRST RUN";
    if (this.factorsPanel) this.factorsPanel.hidden = true;
  }

  setSignal(text, state) {
    if (this.signalText) this.signalText.textContent = text;
    if (this.signal) this.signal.dataset.state = state;
  }

  animatePacket(lane) {
    if (!this.enabled) return;
    const from = document.querySelector(".scenario-panel .scenario.is-selected");
    const to = document.querySelector(".metrics-row");
    if (!from || !to) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    if (a.bottom < 0 || a.top > innerHeight || b.bottom < 0 || b.top > innerHeight) return;
    const startX = a.right-18, startY = a.top+a.height/2;
    const endX = b.left+Math.min(72,b.width/4), endY = b.top+Math.min(45,b.height/2);
    const dx=endX-startX, dy=endY-startY;
    const packet=document.createElement("span");
    packet.className = "motion-packet lane-"+(lane==="sales"?"sales":lane==="review"?"review":"nurture");
    packet.setAttribute("aria-hidden","true");
    packet.style.left=startX+"px";packet.style.top=startY+"px";
    document.body.append(packet);
    const a1=this.animate(packet,[
      {transform:"translate3d(0,0,0) scale(.5)", opacity:0,offset:0},
      {transform:"translate3d("+(dx*.18)+"px,"+(dy*.05-26)+"px,0) scale(1)",opacity:1,offset:.20},
      {transform:"translate3d("+(dx*.68)+"px,"+(dy*.72-40)+"px,0) scale(.9)",opacity:1,offset:.65},
      {transform:"translate3d("+dx+"px,"+dy+"px,0) scale(.4)",opacity:0,offset:1}
    ],{duration:780,easing:"cubic-bezier(.22,.75,.25,1)"});
    if (a1) {
      a1.addEventListener("finish",()=>packet.remove(),{once:true});
      a1.addEventListener("cancel",()=>packet.remove(),{once:true});
    } else packet.remove();
  }
}
export const motion = new LeadFlowMotionDirector();
