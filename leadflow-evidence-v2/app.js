/* LeadFlow V2 — browser controller. Backend is authoritative for qualification.
   Local CRM is an explicitly labeled portfolio-only persistence adapter. */
const $ = id => document.getElementById(id);
const KEY = "leadflow-evidence-v2-local-crm";
const API = "./api/execute";
const DATA = {
  qualified: { name:"Alex Morgan", company:"Northstar Dental", budget:7800, timeline:"ASAP", need:"We need to automate appointment booking, lead follow-up and CRM routing." },
  review: { name:"Jordan Lee", company:"Cedar Studio", budget:3200, timeline:"This month", need:"We are considering an automated workflow for our enquiries." },
  nurture: { name:"Taylor Chen", company:"Orbit Creative", budget:800, timeline:"Exploring", need:"Just exploring a possible project someday. No immediate timeline." },
  timeout: { name:"Morgan Reed", company:"Bluebird Services", budget:6200, timeline:"Within weeks", need:"We need lead automation and CRM integration to follow up on new enquiries." }
};
let selected = "qualified";
let active = false;
let previous = null;
let last = null;
let lastCommand = null;
let isLocalExpanded = false;
const safeText = value => String(value ?? "");
const safeLocal = () => {
  try {
    const result = JSON.parse(localStorage.getItem(KEY) || "{}");
    return result && typeof result === "object" && !Array.isArray(result) ? result : {};
  } catch { return {}; }
};
const saveLocal = data => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; } };
const setText = (id, value) => { const el = $(id); if (el) el.textContent = safeText(value); };
function formatBudget(n) { return new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(n); }
function renderSelection() {
  for (const button of document.querySelectorAll("[data-scenario]")) {
    const on = button.dataset.scenario === selected;
    button.classList.toggle("is-selected", on);
    button.setAttribute("aria-pressed", String(on));
  }
  const lead = DATA[selected];
  const entries = [
    ["Name",lead.name],["Company",lead.company],["Budget",formatBudget(lead.budget)],["Timeline",lead.timeline]
  ];
  const root = $("lead-preview");
  root.replaceChildren();
  for (const [label,value] of entries) {
    const wrapper = document.createElement("div");
    const dt = document.createElement("dt"); dt.textContent = label;
    const dd = document.createElement("dd"); dd.textContent = value;
    wrapper.append(dt,dd); root.append(wrapper);
  }
  setText("lead-need",lead.need);
}
function renderLocal() {
  const local = safeLocal();
  const records = Object.values(local);
  setText("local-count",records.length);
  setText("local-note",records.length ?
    "These are synthetic records in this browser only. Fresh runs upsert by stable sample lead ID; replay never adds a second record." :
    "Complete a run to save a sample record in this browser. Replaying the same lead updates rather than duplicates it.");
  const root = $("local-records");
  root.replaceChildren();
  if (!records.length) {
    const line = document.createElement("p"); line.textContent = "No local records yet."; root.append(line);
  } else {
    for (const rec of records) {
      const row = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = rec.company + " · " + rec.score + "/100";
      const details = document.createElement("small");
      details.textContent = rec.lane.toUpperCase() + " · local upsert count " + rec.upserts + " · " + rec.lastUpdated;
      row.append(name,details); root.append(row);
    }
  }
  root.hidden = !isLocalExpanded;
}
function labelStatus(status) {
  const el = $("run-status");
  el.className = "monitor-state" + (status === "running" ? " running" : status === "complete" ? " complete" : status === "error" ? " error" : "");
  el.textContent = status === "running" ? "EXECUTING" : status === "complete" ? "COMPLETED" : status === "error" ? "FAILED" : "NOT STARTED";
}
function eventItem(event) {
  const li = document.createElement("li");
  li.className = "trace-event" + (event.status === "simulated_failure" || event.status === "retry" ? " warning" : event.status === "approval" ? " approval" : "");
  const ms = document.createElement("span");
  ms.className = "trace-time"; ms.textContent = String(event.atMs).padStart(3,"0") + "ms";
  const dot = document.createElement("span"); dot.className = "trace-dot"; dot.setAttribute("aria-hidden","true");
  const desc = document.createElement("div"); desc.className = "trace-content";
  const title = document.createElement("strong"); title.textContent = event.stage;
  const body = document.createElement("p"); body.textContent = event.detail;
  desc.append(title,body); li.append(ms,dot,desc); return li;
}
function showRun(data, localState) {
  last = data;
  setText("run-id",data.runId.substring(0,8));
  setText("score-value",data.qualification.score + "/100");
  setText("action-value",data.qualification.action);
  setText("duration-value",data.durationMs + " ms");
  const allEvents = [...data.events];
  if (localState) {
    allEvents.push({
      atMs:data.durationMs,
      stage:localState === "deduplicated" ? "browser.upsert.deduplicated" : "browser.upsert.saved",
      detail:localState === "deduplicated" ?
        "Existing synthetic record updated in this browser; unique count unchanged." :
        "Synthetic CRM record saved to this browser only.",
      status:"sandbox"
    });
  }
  const list = $("trace-list"); list.replaceChildren();
  for (const e of allEvents) list.append(eventItem(e));
  setText("event-count",allEvents.length + (allEvents.length === 1 ? " event" : " events"));
  $("crm-payload").textContent = JSON.stringify({
    adapter:data.crm.adapter, externalWrite:false, attempts:data.crm.attempts,
    payload:data.crm.contract, followup:data.followup.mode,
    durability:data.execution.idempotency
  },null,2);
  labelStatus("complete");
  $("download-button").disabled = false;
  $("replay-button").disabled = false;
}
function persistSyntheticRecord(data) {
  const all = safeLocal();
  const id = data.lead.id;
  const existed = Boolean(all[id]);
  all[id] = {
    id, company:data.lead.company, name:data.lead.name,
    score:data.qualification.score, lane:data.qualification.lane,
    upserts:existed ? all[id].upserts + 1 : 1,
    lastUpdated:new Date().toLocaleTimeString()
  };
  if (!saveLocal(all)) { renderLocal(); return null; }
  renderLocal();
  return existed ? "deduplicated" : "inserted";
}
function setBusy(on) {
  active = on;
  $("run-button").disabled = on;
  $("failure-button").disabled = on;
  $("replay-button").disabled = on || !last;
  $("run-button").textContent = on ? "Running API workflow…" : "Execute workflow  →";
}
async function execute(replay = false) {
  if (active) return;
  if (!replay) {
    previous = null;
    lastCommand = { scenario:selected, idempotencyKey:"lfv2-" + crypto.randomUUID().replaceAll("-","").slice(0,22) };
  }
  if (!lastCommand) return;
  const command = { ...lastCommand, replay };
  setBusy(true); labelStatus("running");
  setText("run-id","connecting"); setText("duration-value","— ms");
  setText("action-value","Processing");
  const list = $("trace-list");
  list.replaceChildren();
  const pending = document.createElement("li");
  pending.className = "empty-trace";
  pending.textContent = "Executing server workflow and waiting for receipt…";
  list.append(pending);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(),10000);
  try {
    const response = await fetch(API, {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(command),signal:controller.signal,cache:"no-store"
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw Error(data.error || "Request failed with " + response.status);
    previous = data;
    const localState = persistSyntheticRecord(data);
    showRun(data,localState);
  } catch (error) {
    labelStatus("error");
    setText("action-value","Could not complete");
    list.replaceChildren();
    const failure = document.createElement("li");
    failure.className = "empty-trace";
    failure.textContent = "Live API execution failed: " + error.message + ". No success receipt was generated. Check network/API availability and try again.";
    list.append(failure);
    setText("event-count","0 verified events");
    $("crm-payload").textContent = "No connector response. The workflow did not complete.";
  } finally { clearTimeout(timeout); setBusy(false); }
}
async function checkAPI() {
  try {
    const res = await fetch(API,{headers:{"accept":"application/json"},cache:"no-store"});
    const body = await res.json();
    if (!res.ok || body.mode !== "synthetic-sandbox" || body.externalCrm !== false) throw Error("Unexpected endpoint capability.");
    setText("api-status","LIVE EDGE API · sandbox mode");
  } catch { setText("api-status","API unavailable · runs will fail safely"); }
}
function downloadReceipt() {
  if (!last) return;
  const body = JSON.stringify({
    title:"LeadFlow V2 reproducible synthetic workflow receipt",
    note:"Synthetic portfolio run; external CRM, LLM and outbound messaging not connected.",
    endpoint:API, command:lastCommand, response:last
  },null,2);
  const url = URL.createObjectURL(new Blob([body],{type:"application/json"}));
  const a = document.createElement("a");
  a.href = url; a.download = "leadflow-v2-" + last.runId.substring(0,8) + ".json";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.querySelectorAll("[data-scenario]").forEach(button => {
  button.addEventListener("click", () => {
    if (active) return;
    selected = button.dataset.scenario;
    last = null; lastCommand = null;
    $("replay-button").disabled = true;
    renderSelection();
  });
});
$("run-button").addEventListener("click",()=>execute(false));
$("replay-button").addEventListener("click",()=>execute(true));
$("failure-button").addEventListener("click",()=>{
  selected="timeout"; last=null; lastCommand=null;renderSelection();
  document.getElementById("lab").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  execute(false);
});
$("reset-button").addEventListener("click",()=>{try{localStorage.removeItem(KEY)}catch{};renderLocal()});
$("show-local-button").addEventListener("click",()=>{
  isLocalExpanded = !isLocalExpanded;
  renderLocal();
  $("show-local-button").textContent = isLocalExpanded ? "Hide local records ↑" : "Inspect local records →";
});
$("download-button").addEventListener("click",downloadReceipt);
renderSelection();renderLocal();checkAPI();
