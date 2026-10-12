/**
 * LeadFlow Director's Cut: deterministic cinematic score.
 * 
 * Scene timings are presentation time, NEVER timestamps of network/CRM calls.
 * A qualifying server receipt is mandatory for any playback. No scene may
 * claim an external CRM write, model inference, or automated outreach.
 */
export const DURATION_MS = 24400;
export const ACTS = Object.freeze([
  { id: 'arrival', start: 0, end: 4000, title: 'Every system begins with a person.', overline: 'ACT I  /  THE ARRIVAL', detail: 'An enquiry enters. Before anything happens, we establish who needs help and why.', beat: 'Receive the enquiry' },
  { id: 'verification', start: 4000, end: 8550, title: 'First, earn the right to act.', overline: 'ACT II  /  THE CHECK', detail: 'The API validates a predefined synthetic scenario before deterministic qualification.', beat: 'Verify the input' },
  { id: 'decision', start: 8550, end: 13700, title: 'Make the decision visible.', overline: 'ACT III  /  THE DECISION', detail: 'Budget, urgency and intent resolve into an explainable score, rather than an opaque AI claim.', beat: 'Explain the score' },
  { id: 'handoff', start: 13700, end: 19000, title: 'A handoff must survive friction.', overline: 'ACT IV  /  THE HANDOFF', detail: 'The CRM payload enters a contract-validated sandbox. Any retries here are explicitly simulated.', beat: 'Test the connector' },
  { id: 'resolution', start: 19000, end: DURATION_MS, title: 'The final decision stays human.', overline: 'ACT V  /  THE RESOLUTION', detail: 'A reviewable action and a draft—not an unsolicited message—complete the accountable workflow.', beat: 'Present for approval' }
]);
export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { const n = clamp(t); return n * n * (3 - 2 * n); };
export const powerOut = t => 1 - Math.pow(1 - clamp(t), 4);
export const powerInOut = t => { const n = clamp(t); return n < .5 ? 8*n*n*n*n : 1 - Math.pow(-2*n+2,4)/2; };
export const backOut = (t, overshoot = 1.24) => { const n = clamp(t) - 1; return 1 + (overshoot+1)*n*n*n+overshoot*n*n; };
export const range = (time, start, end, easing = smooth) => easing(clamp((time - start) / (end - start)));
export function actAt(time) { const t = clamp(time, 0, DURATION_MS); return Math.max(0, ACTS.findIndex(a => t >= a.start && t < a.end) === -1 ? ACTS.length-1 : ACTS.findIndex(a => t >= a.start && t < a.end)); }

/** Accept only a real, recognized response from the running server. */
export function validReceipt(receipt) {
  return Boolean(receipt && receipt.ok === true && typeof receipt.runId === 'string' &&
    receipt.execution?.api === 'server-executed' &&
    receipt.execution?.crm === 'sandbox-contract-only' &&
    receipt.execution?.outbound === 'disabled' &&
    receipt.execution?.model === 'not-configured' &&
    Number.isFinite(receipt.qualification?.score) &&
    ['sales','review','nurture'].includes(receipt.qualification?.lane) &&
    Array.isArray(receipt.qualification?.factors) &&
    Array.isArray(receipt.events) &&
    receipt.events.some(event => event.stage === 'workflow.completed') &&
    receipt.crm?.adapter === 'sandbox' &&
    receipt.crm?.status === 'accepted' &&
    receipt.followup?.mode === 'draft-only');
}

/** Five-act score, with anticipation, eased arcs, holds and follow-through. */
export function frameAt(timeMs, receipt) {
  if (!validReceipt(receipt)) throw new Error('A confirmed server execution receipt is required.');
  const time = clamp(timeMs, 0, DURATION_MS);
  const actIndex = actAt(time);
  const act = ACTS[actIndex];
  const hasFailure = receipt.events.some(e => e.stage === 'crm.sandbox.timeout');
  const attempts = receipt.crm.attempts;

  // The packet follows a continuous path across the set. Its movement is a
  // narrated reconstruction of server receipt data, not a network progress bar.
  let route;
  if (time < 650) route = 0;
  else if (time < 3200) route = lerp(0, .125, range(time, 650, 2650, backOut));
  else if (time < 4350) route = .125;
  else if (time < 7470) route = lerp(.125, .32, range(time, 4350, 7470, powerInOut));
  else if (time < 9050) route = .32;
  else if (time < 12100) route = lerp(.32, .56, range(time, 9050, 12100, powerInOut));
  else if (time < 14000) route = .56;
  else if (time < 16300) route = lerp(.56, .75, range(time, 14000, 16100, powerInOut));
  else if (time < 18700) {
    const faultMix = hasFailure ?
      (time < 17050 ? lerp(.75,.708,range(time,16300,16750,powerOut)) :
       time < 17750 ? lerp(.708,.746,range(time,17050,17550,powerOut)) :
       lerp(.746,.75,range(time,17750,18400,powerOut))) : .75;
    route = faultMix;
  }
  else if (time < 19850) route = .75;
  else if (time < 22400) route = lerp(.75, .94, range(time, 19850, 21950, powerInOut));
  else route = .94;

  const intro = range(time, 280, 1550, powerOut);
  const scoreReveal = range(time, 9400, 11750, powerOut);
  const routeReveal = range(time, 11600, 13000, backOut);
  const approvalReveal = range(time, 21100, 22600, backOut);
  const curtain = range(time, 23100, DURATION_MS, smooth);
  const approval = receipt.qualification.action;
  const hasFirstFault = hasFailure && time >= 16400 && time < 17250;
  const hasSecondFault = hasFailure && time >= 17420 && time < 18300;
  const faultSequence = hasFirstFault ? 1 : hasSecondFault ? 2 : 0;
  const connectorAccepted = time >= 18400;
  const details = receipt.qualification.factors.map((factor, index) => ({
    name: factor.label,
    value: factor.points,
    amount: clamp(Math.abs(factor.points) / 30),
    reveal: range(time, 8880 + 500*index, 10020 + 500*index, powerOut)
  }));
  const recordName = String(receipt.lead?.name || 'Synthetic lead');
  const org = String(receipt.lead?.company || 'Example company');
  const score = receipt.qualification.score;

  return {
    t: time,
    fraction: time / DURATION_MS,
    actIndex, act, org, recordName,
    route: clamp(route),
    packetOpacity: clamp(range(time,700,1360,powerOut) * (1-range(time,23100,24000,smooth))),
    packetScale: time < 2900 ? lerp(.55,1,range(time,780,2400,backOut)) : 1 + .075 * Math.sin(Math.PI * range(time,21000,23200)) * (time>21000 ? 1 : 0),
    cameraX: 22*range(time,3800,8550) + 22*range(time,8550,13700) + 20*range(time,13700,19000) + 15*range(time,19000,23500),
    cameraY: 8*Math.sin(time/3200),
    arrivalOpacity: intro,
    scan: range(time,4700,7400,powerInOut),
    scanOpacity: clamp(range(time,4300,4860) * (1-range(time,7500,8400))),
    scoreReveal,
    scoreDisplayed: Math.round(lerp(0, score, scoreReveal)),
    routeReveal,
    factorRows: details,
    approvalReveal,
    faultSequence,
    isFault: Boolean(faultSequence),
    connectorAccepted,
    pendingCrm: time>=14200 && !connectorAccepted,
    retryAttempt: faultSequence === 1 ? 1 : faultSequence === 2 ? 2 : connectorAccepted ? attempts : 0,
    showFaults: hasFailure,
    attempts,
    routeLabel: approval,
    lane: receipt.qualification.lane,
    score,
    endReveal: curtain,
    leadSource: receipt.lead?.source || 'Synthetic source',
    approvalLabel: 'DRAFT FOR HUMAN REVIEW',
    receiptId: receipt.runId.slice(0,8)
  };
}

/** Tick is monotonic elapsed *speed, never animation-time network simulation. */
export function advanceClock({playhead, elapsed, speed = 1}) {
  return clamp(playhead + Math.max(0, elapsed) * clamp(speed, .25, 2), 0, DURATION_MS);
}
