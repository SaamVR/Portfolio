/** LeadFlow V2 portfolio engine. Synthetic data only; sandbox CRM, not an external integration. */
export const SCENARIOS = Object.freeze({
  qualified: { id: "sample-qualified", name: "Alex Morgan", company: "Northstar Dental", source: "Website enquiry", budget: 7800, timeline: "asap", need: "We need to automate appointment booking, lead follow-up and CRM routing." },
  review: { id: "sample-review", name: "Jordan Lee", company: "Cedar Studio", source: "Contact form", budget: 3200, timeline: "month", need: "We are considering an automated workflow for our enquiries." },
  nurture: { id: "sample-nurture", name: "Taylor Chen", company: "Orbit Creative", source: "Newsletter reply", budget: 800, timeline: "exploring", need: "Just exploring a possible project someday. No immediate timeline." },
  timeout: { id: "sample-timeout", name: "Morgan Reed", company: "Bluebird Services", source: "Referral", budget: 6200, timeline: "weeks", need: "We need lead automation and CRM integration to follow up on new enquiries." }
});
export const ENGINE_VERSION = "leadflow-evidence-v2.1";
export const THRESHOLDS = { sales: 78, review: 54 };
const INTENT = ["need", "automat", "appointment", "follow-up", "crm", "sales", "integrat", "booking"];
const EXPLORING = ["just exploring", "someday", "no immediate", "maybe"];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export function validateCommand(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "invalid_command", message: "Expected an object." };
  if (!Object.hasOwn(SCENARIOS, body.scenario)) return { error: "invalid_scenario", message: "Choose a supported synthetic scenario." };
  if (body.idempotencyKey !== undefined && (typeof body.idempotencyKey !== "string" || !/^[a-zA-Z0-9_-]{8,72}$/.test(body.idempotencyKey))) return { error: "invalid_idempotency_key", message: "Invalid idempotency key." };
  if (body.replay !== undefined && typeof body.replay !== "boolean") return { error: "invalid_replay_flag", message: "Replay must be a boolean." };
  return { scenario: body.scenario, idempotencyKey: body.idempotencyKey || "synthetic-run", replay: Boolean(body.replay) };
}
export function qualifyLead(lead) {
  const text = lead.need.toLowerCase();
  const budget = lead.budget >= 7000 ? 26 : lead.budget >= 3000 ? 16 : 5;
  const urgency = { asap: 24, weeks: 19, month: 10, exploring: 4 }[lead.timeline] || 4;
  const intent = Math.min(16, INTENT.filter(term => text.includes(term)).length * 4);
  const exploratory = Math.min(12, EXPLORING.filter(term => text.includes(term)).length * 4);
  const score = Math.min(98, Math.max(0, 30 + budget + urgency + intent - exploratory));
  const lane = score >= THRESHOLDS.sales ? "sales" : score >= THRESHOLDS.review ? "review" : "nurture";
  const action = lane === "sales" ? "Sales review required" : lane === "review" ? "Human qualification review" : "Nurture queue";
  const factors = [{ label: "Baseline", points: 30 }, { label: "Budget fit", points: budget }, { label: "Time sensitivity", points: urgency }, { label: "Intent signals", points: intent }];
  if (exploratory) factors.push({ label: "Exploratory signals", points: -exploratory });
  return { score, lane, action, factors, thresholds: THRESHOLDS, algorithm: "deterministic-rules-v2" };
}
export function crmContract(lead, qualification, key) {
  return { external_id: lead.id, display_name: lead.name, company: lead.company, source: lead.source, qualification_score: qualification.score, qualification_lane: qualification.lane, next_action: qualification.action, idempotency_key: key };
}
export async function runSyntheticWorkflow(body, opts = {}) {
  const command = validateCommand(body);
  if (command.error) throw Object.assign(new Error(command.message), { code: command.error, status: 400 });
  const start = Date.now();
  const events = [];
  function emit(stage, detail, status = "ok") { events.push({ index: events.length + 1, atMs: Date.now() - start, stage, detail, status }); }
  const lead = { ...SCENARIOS[command.scenario] };
  const qualification = qualifyLead(lead);
  const contract = crmContract(lead, qualification, command.idempotencyKey);
  emit("lead.accepted", "Allowlisted synthetic lead accepted.");
  emit("input.validated", "No arbitrary customer data accepted.");
  emit("qualification.scored", "Server calculated " + qualification.score + "/100 by deterministic rules.");
  emit("policy.routed", qualification.action + "; outbound requires human approval.");
  const fail = command.scenario === "timeout" ? 2 : 0;
  let attempts = 0;
  for (let attempt = 1; attempt <= 3; attempt++) {
    attempts = attempt;
    await sleep(opts.fast ? 1 : 48);
    if (attempt <= fail) {
      emit("crm.sandbox.timeout", "Injected sandbox fault on attempt " + attempt + ".", "simulated_failure");
      emit("retry.backoff", "Retry requested in sandbox, with no external side effect.", "retry");
    } else { emit("crm.sandbox.accepted", "Validated connector contract accepted in sandbox.", "sandbox"); break; }
  }
  emit("followup.drafted", "Draft prepared; no message sent.", "draft");
  if (qualification.lane !== "sales") emit("approval.gate", "Next step requires human review.", "approval");
  emit("workflow.completed", "Run completed. Browser may save CRM record locally.");
  return {
    ok: true, version: ENGINE_VERSION,
    runId: opts.id ? opts.id() : crypto.randomUUID(),
    processedAt: opts.now ? opts.now() : new Date().toISOString(),
    durationMs: Date.now() - start,
    execution: { api: "server-executed", crm: "sandbox-contract-only", storage: "browser-local", model: "not-configured", outbound: "disabled", idempotency: "client-local-only", replayRequested: command.replay },
    lead, qualification,
    crm: { adapter: "sandbox", status: "accepted", attempts, contract },
    followup: { mode: "draft-only", requiresApproval: true, subject: "Enquiry from " + lead.company, body: "Thanks for your enquiry. Our team will review the details and follow up personally." },
    events
  };
}
