# LeadFlow V2 — Director's treatment / event-grounded film

**Creative brief:** Make the movement communicate causality. We do not want a collection of one-second UI tricks. Build a 24.4-second five-act narrative with readable staging, controlled pacing, dimensional travel, reaction, consequence, and resolution. A visitor may pause, seek, replay, change speed or skip. A verified server receipt is required before play begins.

## Dramaturgy / five acts

| Act | Film time | Primary dramatic question | Visual direction |
|---|---:|---|---|
| Arrival | 0.0–4.0 s | Who is asking for help? | Silence and negative space; synthetic lead takes an eased arc into the system; overshoot, settle, breathe. |
| Verification | 4.0–8.55 s | May this information proceed? | Brief anticipation; a vertical scanning plane moves across the arrival; validation node brightens; hold after the check. |
| Decision | 8.55–13.7 s | Why does this lead get this route? | Camera favors policy; scoring contributions enter with overlapping offset; score count resolves to a real API value; route is revealed after evidence. |
| Handoff | 13.7–19.0 s | Can the CRM adapter cope with failure? | Packet follows a physically curved route; contract accepted. If and only if verified trace contains injected sandbox timeouts, two setbacks/recoils punctuate the transfer and recovery follows. |
| Resolution | 19.0–24.4 s | Who owns the next action? | A longer easing move to the human gate; approval card rises like a receipt and settles; hold on the explicit draft-only outcome. A closing visual bookend completes the film. |

## Animation principles applied

- **Staging:** one dominant focal element per act, copy directing attention into the scene.
- **Anticipation:** arrival silence, scanner buildup, policy score deferred until checks resolve.
- **Timing / spacing:** varied durations, strong ease-in/out, pauses between thought beats. No perpetual bounce.
- **Arcs:** the lead token travels along a continuous SVG Bezier path rather than teleporting between cards.
- **Squash / stretch:** restrained scale overshoot on the lead packet, not childish UI rubberiness.
- **Follow-through / overlapping action:** copy and factor bars settle after the packet travels; delayed scoring makes the relationships visible.
- **Slow in / slow out:** staged fourth-order easing and physical settling rather than uniform translation.
- **Secondary action:** scanner, lighting, factor fills, stage highlights and receipt seal support the main movement.
- **Appeal:** editorial typography and cinematic color pacing without obstructing the operational UI.

## Truth and event semantics

- The browser first calls `/api/execute` to receive a **real, validated server result**.
- The full film plays **after** the server has finished. Its duration measures storytelling, NOT API latency.
- The score, factors, route, incident count and actions come from that result, never fabricated.
- The story cannot play for a failed API response or a nonconforming receipt.
- The CRM adapter remains a **sandbox**, without a real external provider request.
- Faults in this video are explicitly **simulated sandbox timeouts** contained in that server trace.
- Follow-up remains **draft-only**, gated by human review. No email or SMS is dispatched.
- The physical staging is an artistically directed illustration, not a real-time visualization of network traffic.

## Interaction and accessibility

- Play, pause, replay, seek, five chapter shortcuts, speed choice, skip to verified result.
- Background-tab pause so hidden time does not advance and silently skip story.
- `prefers-reduced-motion` shows the complete outcome immediately. Readable five-act transcript remains available.
- Native buttons/range control ensure keyboard/touch access.
- No autoplay without the visitor requesting it. A visual hero CTA begins a real API run.
- Existing API exercise and JSON receipt controls remain independent.

## Portfolio proof

Use an actual 24-second recording (not a simulated screenshot) with two sequences: normal route and synthetic timeout/recovery route. Capture desktop and mobile, ensure the timeline can pause and scrub, and show the on-screen disclosure that film time differs from API duration. The original V1 and Upwork listing remain untouched until owner approval.
