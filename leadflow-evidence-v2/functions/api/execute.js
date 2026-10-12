import { ENGINE_VERSION, SCENARIOS, runSyntheticWorkflow } from "../lib/engine.mjs";
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" } });
}
export function onRequestGet() {
  return json({ ok: true, service: "leadflow-evidence-v2", version: ENGINE_VERSION, mode: "synthetic-sandbox", scenarios: Object.keys(SCENARIOS), externalCrm: false, llm: false });
}
export async function onRequestPost({ request }) {
  const requestId = crypto.randomUUID();
  try {
    if (Number(request.headers.get("content-length") || 0) > 2048) return json({ ok: false, error: "payload_too_large", requestId }, 413);
    if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) return json({ ok: false, error: "json_required", requestId }, 415);
    const text = await request.text();
    if (text.length > 2048) return json({ ok: false, error: "payload_too_large", requestId }, 413);
    let command;
    try { command = JSON.parse(text); } catch { return json({ ok: false, error: "invalid_json", requestId }, 400); }
    try { return json({ requestId, ...(await runSyntheticWorkflow(command)) }); }
    catch (error) { return json({ ok: false, error: error.code || "execution_failed", message: error.status === 400 ? error.message : undefined, requestId }, error.status === 400 ? 400 : 500); }
  } catch { return json({ ok: false, error: "request_failed", requestId }, 400); }
}
