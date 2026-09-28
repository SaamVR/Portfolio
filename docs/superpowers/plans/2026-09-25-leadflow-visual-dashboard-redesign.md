# LeadFlow Visual + Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make LeadFlow’s refined root build consistently readable in both themes and replace the current miniature CRM preview with a practical, data-derived Lead Operations dashboard containing clear infographics, next-action context, and presentation-grade motion.

**Architecture:** Keep the existing static HTML/CSS/JavaScript application and Cloudflare Pages Function architecture. Extract dashboard derivation into a small pure `dashboard.js` module so analytics logic can be unit-tested independently, while `app.js` remains responsible for DOM rendering and interaction. The redesign is root-only; the frozen `/v1` bundle and v1 API remain untouched.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node.js built-in test runner, SVG generated in the browser, agent-browser runtime verification, Cloudflare Pages/Wrangler.

**Spec:** `docs/superpowers/specs/2026-09-25-leadflow-visual-dashboard-redesign.md`

## Global Constraints

- Preserve the refined root application's current functionality and APIs.
- Preserve `/v1` exactly as the legacy version.
- Do not add fabricated client results, production integrations, or external delivery claims.
- Dashboard metrics and infographics must be derived from the existing browser-local demo lead records.
- Red remains reserved for action, urgency, high-priority state, and failure/timeout cues.
- Green remains the product/system/completion color.
- Amber represents human review.
- Neutral/sage represents nurture and supporting information.
- Respect `prefers-reduced-motion`.
- Maintain responsive support at 390, 768, 1024, and 1440px widths.
- No important UI or explanatory text may render below 12px.
- Root qualification API must remain `deterministic-qualification-v2`; `/v1/api/qualify` remains v1.

## Review Focus

1. **Empty browser-local CRM:** dashboard must render a useful zero/empty state without NaN, Infinity, empty SVG failures, or fake analytics.
2. **Sparse/partial lead records:** missing source, action, intent, or timeline values must fall into honest `Other` / `Unspecified` buckets rather than crashing.
3. **Large and uneven datasets:** percentages must sum sensibly, source bars must scale against the largest real value, and recent-score visuals must cap their visible sample without corrupting totals.
4. **Reduced-motion users:** all dashboard draw/count/reveal animations must become immediately readable static states under `prefers-reduced-motion: reduce`.
5. **Small screens and text zoom pressure:** 390px layouts and dense dashboard/table regions must avoid horizontal page overflow while preserving readable type and usable controls.

---

## File Structure

- **Create:** `dashboard.js` — pure dashboard analytics/model derivation, no DOM dependency.
- **Create:** `tests/leadflow-dashboard-model.test.js` — Node unit tests for dashboard derivation and edge cases.
- **Modify:** `index.html` — dashboard semantic structure and `dashboard.js` script load.
- **Modify:** `app.js` — render dashboard model into KPI, SVG infographic, table, queue, and human-readable activity views.
- **Modify:** `styles.css` — typography/contrast tokens, dashboard composition, infographic styles, responsive rules, animation/reduced-motion states.
- **No changes:** `v1/*`, `functions/v1/*`, `functions/api/qualify.js` unless a regression is discovered during verification.

---

### Task 1: Extract a Testable Dashboard Data Model

**Files:**
- Create: `dashboard.js`
- Create: `tests/leadflow-dashboard-model.test.js`
- Modify: `index.html` to load `dashboard.js` before `app.js`

**Interfaces:**
- Consumes: existing lead records shaped approximately as `{name, company, score, status, source?, timeline?, timelineLabel?, action?, intent?}`.
- Produces: `LeadFlowDashboard.buildDashboardModel(leads)`.
- Return shape:
  ```js
  {
    total,
    status: { hot, review, nurture, other },
    statusPct: { hot, review, nurture, other },
    averageScore,
    immediate: { count, pct },
    actions: { salesReview, humanReview, nurture, other },
    sources: [{ name, count, averageScore }],
    urgency: [{ key, label, count, pct }],
    recentScores: [{ name, company, score, status }]
  }
  ```

- [ ] **Step 1: Write the failing Node tests**

Create `tests/leadflow-dashboard-model.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildDashboardModel } = require("../dashboard.js");

test("buildDashboardModel derives real pipeline analytics", () => {
  const model = buildDashboardModel([
    { name: "Sarah", company: "Acme", score: 92, status: "hot", source: "Website Form", timeline: "asap", action: "Sales review" },
    { name: "Maya", company: "Northstar", score: 64, status: "review", source: "Meta Lead Ads", timeline: "month", action: "Human review" },
    { name: "Ryan", company: "Independent", score: 33, status: "nurture", source: "Website Form", timeline: "exploring", action: "Nurture" }
  ]);

  assert.equal(model.total, 3);
  assert.deepEqual(model.status, { hot: 1, review: 1, nurture: 1, other: 0 });
  assert.equal(model.averageScore, 63);
  assert.deepEqual(model.immediate, { count: 1, pct: 33 });
  assert.deepEqual(model.actions, { salesReview: 1, humanReview: 1, nurture: 1, other: 0 });
  assert.deepEqual(model.sources, [
    { name: "Website Form", count: 2, averageScore: 63 },
    { name: "Meta Lead Ads", count: 1, averageScore: 64 }
  ]);
});

test("empty input returns zero-safe analytics", () => {
  const model = buildDashboardModel([]);
  assert.equal(model.total, 0);
  assert.equal(model.averageScore, 0);
  assert.deepEqual(model.immediate, { count: 0, pct: 0 });
  assert.deepEqual(model.sources, []);
  assert.deepEqual(model.recentScores, []);
});

test("sparse lead values fall back without throwing", () => {
  const model = buildDashboardModel([{ name: "Unknown", score: 50 }]);
  assert.equal(model.total, 1);
  assert.equal(model.status.other, 1);
  assert.equal(model.actions.other, 1);
  assert.equal(model.sources[0].name, "Unspecified");
  assert.equal(model.urgency.reduce((sum, item) => sum + item.count, 0), 1);
});

test("recentScores caps the visible sample while totals remain complete", () => {
  const leads = Array.from({ length: 15 }, (_, i) => ({
    name: `Lead ${i + 1}`,
    company: "Demo",
    score: 40 + i,
    status: i % 2 ? "review" : "nurture",
    source: "Website Form",
    timeline: "month",
    action: "Human review"
  }));
  const model = buildDashboardModel(leads);
  assert.equal(model.total, 15);
  assert.equal(model.recentScores.length, 8);
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:
```bash
node --test tests/leadflow-dashboard-model.test.js
```

Expected: FAIL because `../dashboard.js` does not exist.

- [ ] **Step 3: Implement the pure model**

Create `dashboard.js` with a browser + CommonJS export wrapper:

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LeadFlowDashboard = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const clampScore = value => Math.max(0, Math.min(100, Number(value) || 0));
  const pct = (value, total) => total ? Math.round((value / total) * 100) : 0;

  function sourceName(lead) {
    return String(lead?.source || "Unspecified").trim() || "Unspecified";
  }

  function actionKey(lead) {
    const raw = String(lead?.action || "").toLowerCase();
    if (raw.includes("sales")) return "salesReview";
    if (raw.includes("human") || raw.includes("review")) return "humanReview";
    if (raw.includes("nurture")) return "nurture";
    return "other";
  }

  function urgencyKey(lead) {
    const raw = String(lead?.timeline || lead?.timelineLabel || "").toLowerCase();
    if (raw.includes("asap") || raw.includes("immediate")) return "asap";
    if (raw.includes("1–2") || raw.includes("1-2") || raw.includes("week")) return "weeks";
    if (raw.includes("month")) return "month";
    return "other";
  }

  function buildDashboardModel(input) {
    const leads = Array.isArray(input) ? input : [];
    const total = leads.length;
    const status = { hot: 0, review: 0, nurture: 0, other: 0 };
    const actions = { salesReview: 0, humanReview: 0, nurture: 0, other: 0 };
    const sourceMap = new Map();
    const urgencyCounts = { asap: 0, weeks: 0, month: 0, other: 0 };

    let scoreTotal = 0;
    for (const lead of leads) {
      const statusKey = ["hot", "review", "nurture"].includes(lead?.status) ? lead.status : "other";
      status[statusKey] += 1;
      actions[actionKey(lead)] += 1;
      urgencyCounts[urgencyKey(lead)] += 1;

      const score = clampScore(lead?.score);
      scoreTotal += score;
      const source = sourceName(lead);
      const current = sourceMap.get(source) || { count: 0, scoreTotal: 0 };
      current.count += 1;
      current.scoreTotal += score;
      sourceMap.set(source, current);
    }

    const sources = [...sourceMap.entries()]
      .map(([name, value]) => ({
        name,
        count: value.count,
        averageScore: Math.round(value.scoreTotal / value.count)
      }))
      .sort((a, b) => b.count - a.count || b.averageScore - a.averageScore || a.name.localeCompare(b.name));

    const urgencyLabels = {
      asap: "ASAP",
      weeks: "1–2 weeks",
      month: "Within a month",
      other: "Exploring / other"
    };

    return {
      total,
      status,
      statusPct: Object.fromEntries(Object.entries(status).map(([key, value]) => [key, pct(value, total)])),
      averageScore: total ? Math.round(scoreTotal / total) : 0,
      immediate: { count: urgencyCounts.asap, pct: pct(urgencyCounts.asap, total) },
      actions,
      sources,
      urgency: Object.entries(urgencyCounts).map(([key, count]) => ({
        key,
        label: urgencyLabels[key],
        count,
        pct: pct(count, total)
      })),
      recentScores: leads.slice(0, 8).map(lead => ({
        name: String(lead?.name || "Unnamed lead"),
        company: String(lead?.company || ""),
        score: clampScore(lead?.score),
        status: ["hot", "review", "nurture"].includes(lead?.status) ? lead.status : "other"
      }))
    };
  }

  return { buildDashboardModel };
});
```

Add before `app.js` in `index.html`:

```html
<script src="./dashboard.js"></script>
<script src="./app.js"></script>
```

- [ ] **Step 4: Run model tests**

Run:
```bash
node --test tests/leadflow-dashboard-model.test.js
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add dashboard.js tests/leadflow-dashboard-model.test.js index.html
git commit -m "test and add LeadFlow dashboard model"
```

---

### Task 2: Replace the CRM Preview with a Practical Dashboard Structure

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

**Interfaces:**
- Consumes: IDs populated by Task 3.
- Produces dashboard DOM IDs:
  - `opsTotal`, `opsHot`, `opsHotRate`, `opsAverage`, `opsImmediate`, `opsImmediateRate`
  - `opsDistribution`, `opsDistributionLegend`
  - `opsScoreTrend`
  - `opsActionQueue`
  - `opsSourceQuality`
  - `opsUrgencyMix`
  - `opsPipelineRows`, `opsPipelineCount`
  - `opsActivityFeed`, `opsTechnicalActivity`

- [ ] **Step 1: Capture the current dashboard DOM contract**

Run:
```bash
grep -n 'id="workspace"' -A12 index.html
```

Expected: old `ops-input-panel` sidebar, `ops-main-grid`, `opsScoreChart`, and `opsSourceList` are present.

- [ ] **Step 2: Replace the workspace markup**

Use one dashboard shell with this hierarchy:

```html
<div class="ops-dashboard">
  <header class="ops-dashboard-toolbar">
    <div class="ops-dashboard-title">
      <span class="ops-brand-mark">LF</span>
      <div>
        <small>LEAD OPERATIONS</small>
        <h3>Qualification workspace</h3>
      </div>
    </div>
    <div class="ops-toolbar-actions">
      <div class="ops-sync-state"><i class="ops-live-dot"></i><span>Demo workspace</span><small id="opsLastSync">Synced now</small></div>
      <a class="secondary-btn" href="#demo">Run another lead</a>
      <button class="secondary-btn" id="opsOpenCrm" type="button">Open full CRM ↗</button>
    </div>
  </header>

  <div class="ops-kpis">
    <article><span>Pipeline</span><strong id="opsTotal">0</strong><small>browser-local leads</small></article>
    <article class="ops-kpi-attention"><span>High priority</span><strong id="opsHot">0</strong><small id="opsHotRate">0% of pipeline</small></article>
    <article><span>Average score</span><strong><span id="opsAverage">0</span><em>/100</em></strong><small>qualification score</small></article>
    <article><span>Immediate follow-up</span><strong id="opsImmediate">0</strong><small id="opsImmediateRate">0% ASAP</small></article>
  </div>

  <div class="ops-analytics-primary">
    <section class="ops-panel ops-distribution-panel">
      <header class="ops-panel-head"><div><small>PIPELINE MIX</small><b>Qualification distribution</b></div><span>Current records</span></header>
      <div class="ops-distribution-layout">
        <div id="opsDistribution" class="ops-donut" role="img" aria-label="Qualification distribution"></div>
        <div id="opsDistributionLegend" class="ops-donut-legend"></div>
      </div>
    </section>

    <section class="ops-panel ops-trend-panel">
      <header class="ops-panel-head"><div><small>SCORE TREND</small><b>Recent qualification scores</b></div><span>0–100</span></header>
      <div id="opsScoreTrend" class="ops-score-trend"></div>
    </section>
  </div>

  <div class="ops-analytics-secondary">
    <section class="ops-panel">
      <header class="ops-panel-head"><div><small>NEXT ACTION</small><b>Attention queue</b></div><span>What happens next</span></header>
      <div id="opsActionQueue" class="ops-action-queue"></div>
    </section>
    <section class="ops-panel">
      <header class="ops-panel-head"><div><small>SOURCE QUALITY</small><b>Inbound mix + score</b></div><span>Count / average</span></header>
      <div id="opsSourceQuality" class="ops-source-quality"></div>
    </section>
    <section class="ops-panel">
      <header class="ops-panel-head"><div><small>URGENCY</small><b>Timeline mix</b></div><span>Current records</span></header>
      <div id="opsUrgencyMix" class="ops-urgency-mix"></div>
    </section>
  </div>

  <section class="ops-panel ops-pipeline-panel">…table…</section>

  <section class="ops-panel ops-activity-panel">
    <header class="ops-panel-head"><div><small>RECENT ACTIVITY</small><b>What changed</b></div><span><i class="ops-live-dot"></i> local state</span></header>
    <div id="opsActivityFeed" class="ops-activity-feed"></div>
    <details class="ops-technical-details">
      <summary>Technical event details</summary>
      <div id="opsTechnicalActivity"></div>
    </details>
  </section>
</div>
```

Add a `Next action` table column.

- [ ] **Step 3: Add the dashboard composition CSS**

Implement:
- dashboard toolbar;
- 4-column KPI strip;
- 2-column primary analytics row;
- 3-column secondary analytics row;
- one operational table region;
- activity/disclosure;
- 8–10px consistent radius;
- no nested glow/glass effects;
- responsive collapse at 1024/768/680 without page overflow.

Use visible minimums:
```css
.ops-dashboard { font-size: 14px; }
.ops-panel-head small,
.ops-sync-state small,
.ops-kpis small,
.ops-table th,
.ops-technical-details summary { font-size: 12px; }
.ops-panel-head b { font-size: 15px; }
.ops-table td { font-size: 14px; }
.ops-kpis > article > span { font-size: 13px; }
```

- [ ] **Step 4: Run the static DOM checks**

Run:
```bash
grep -q 'id="opsDistribution"' index.html &&
grep -q 'id="opsScoreTrend"' index.html &&
grep -q 'id="opsActionQueue"' index.html &&
grep -q 'id="opsSourceQuality"' index.html &&
grep -q 'id="opsUrgencyMix"' index.html &&
! grep -q 'id="opsScoreChart"' index.html
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css
git commit -m "redesign LeadFlow operations dashboard structure"
```

---

### Task 3: Render Data-Driven Infographics and Human Activity

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Test: `tests/leadflow-dashboard-model.test.js`

**Interfaces:**
- Consumes: `window.LeadFlowDashboard.buildDashboardModel(leads)`.
- Produces: all Task 2 dashboard IDs populated from the model.

- [ ] **Step 1: Add one model test for source-average accuracy and action fallback**

Append:
```js
test("source averages and unknown actions stay honest", () => {
  const model = buildDashboardModel([
    { name: "A", score: 90, source: "Referral", action: "Sales review", status: "hot", timeline: "asap" },
    { name: "B", score: 50, source: "Referral", action: "Unmapped", status: "review", timeline: "month" }
  ]);
  assert.equal(model.sources[0].averageScore, 70);
  assert.equal(model.actions.salesReview, 1);
  assert.equal(model.actions.other, 1);
});
```

- [ ] **Step 2: Run the model tests**

Run:
```bash
node --test tests/leadflow-dashboard-model.test.js
```

Expected: PASS.

- [ ] **Step 3: Replace the old `renderOps()` rendering**

Implement helpers in `app.js`:

```js
function dashboardStatusLabel(key) {
  return ({ hot: "High priority", review: "Needs review", nurture: "Nurture", other: "Other" })[key] || "Other";
}

function nextActionLabel(lead) {
  const raw = String(lead.action || "");
  if (/sales/i.test(raw)) return "Sales review";
  if (/human|review/i.test(raw)) return "Human review";
  if (/nurture/i.test(raw)) return "Nurture";
  return raw || "Review lead";
}

function activitySentence(lead) {
  const name = escapeHtml(lead.name || "Lead");
  if (lead.status === "hot") return `${name} qualified as high priority`;
  if (lead.status === "review") return `${name} routed to human review`;
  if (lead.status === "nurture") return `${name} moved to nurture`;
  return `${name} updated in the demo CRM`;
}
```

Within `renderOps()`:
```js
const model = window.LeadFlowDashboard.buildDashboardModel(leads);
$("#opsTotal").textContent = model.total;
$("#opsHot").textContent = model.status.hot;
$("#opsHotRate").textContent = `${model.statusPct.hot}% of pipeline`;
$("#opsAverage").textContent = model.averageScore;
$("#opsImmediate").textContent = model.immediate.count;
$("#opsImmediateRate").textContent = `${model.immediate.pct}% ASAP`;
```

Render an accessible SVG donut using real percentages. For zero records, render an empty ring with center `0 leads`.

Render recent scores as SVG or structured bars with 0/55/80/100 guides and direct lead-name labels.

Render:
- action queue from `model.actions`;
- source quality using `model.sources`, with count + average score;
- urgency segmented bar + direct labels from `model.urgency`;
- table with `nextActionLabel(lead)`;
- human-readable activity first;
- technical code rows inside `#opsTechnicalActivity`.

- [ ] **Step 4: Add infographic and semantic-state CSS**

Use CSS custom properties for status:
```css
:root {
  --status-hot: var(--action);
  --status-review: #C9922D;
  --status-nurture: #70867A;
}
```

Charts use these same semantic colors. Do not introduce new decorative hues.

Add draw transitions via transform/opacity and SVG `stroke-dashoffset` only.

- [ ] **Step 5: Runtime browser check on populated dashboard**

Start local server:
```bash
python3 -m http.server 8797 --bind 127.0.0.1
```

Then:
```bash
agent-browser open http://127.0.0.1:8797/
agent-browser wait --load networkidle
agent-browser find text "CRM workspace" click
agent-browser screenshot --annotate
agent-browser eval 'JSON.stringify({
  donut: !!document.querySelector("#opsDistribution svg"),
  trend: !!document.querySelector("#opsScoreTrend svg, #opsScoreTrend .ops-trend-bars"),
  queue: document.querySelector("#opsActionQueue")?.innerText.trim().length > 0,
  sources: document.querySelector("#opsSourceQuality")?.innerText.trim().length > 0,
  urgency: document.querySelector("#opsUrgencyMix")?.innerText.trim().length > 0
})'
```

Expected: all values true.

- [ ] **Step 6: Commit**

```bash
git add app.js styles.css tests/leadflow-dashboard-model.test.js
git commit -m "add data-driven LeadFlow dashboard infographics"
```

---

### Task 4: Enforce the Visibility and Typography System

**Files:**
- Modify: `styles.css`
- Modify: `index.html` only if redundant micro labels need removal

**Interfaces:**
- Produces computed minimum readable sizes and contrast roles across root build.

- [ ] **Step 1: Create a runtime small-text audit before fixing**

Run with local server active:
```bash
agent-browser open http://127.0.0.1:8797/
agent-browser wait --load networkidle
agent-browser eval --stdin <<'EVALEOF'
JSON.stringify(
  [...document.querySelectorAll("body *")]
    .filter(el => el.children.length === 0 && el.textContent.trim() && el.getClientRects().length)
    .map(el => ({
      tag: el.tagName,
      cls: el.className || "",
      text: el.textContent.trim().slice(0, 80),
      size: parseFloat(getComputedStyle(el).fontSize),
      color: getComputedStyle(el).color
    }))
    .filter(x => x.size < 12),
  null, 2
)
EVALEOF
```

Expected before fix: non-empty list demonstrating the current problem.

- [ ] **Step 2: Consolidate color/type tokens**

Append/replace root tokens so both themes use:
```css
:root {
  --text-primary: #F3F7F4;
  --text-secondary: #B8C7BF;
  --text-muted-readable: #8FA39A;
  --accent-readable: #7BEFB2;
  --action-readable: #E0524D;
}
html[data-theme="light"] {
  --text-primary: #102018;
  --text-secondary: #40594C;
  --text-muted-readable: #607468;
  --accent-readable: #0B6D45;
  --action-readable: #B93632;
}
```

Map ordinary supporting text to `--text-secondary` and only incidental metadata to `--text-muted-readable`.

- [ ] **Step 3: Raise important small text**

Enforce:
```css
body { font-size: 16px; }
.section-head > p,
.hero-lede,
.case-copy > p,
.portfolio-next-copy > p,
.final-cta p { color: var(--text-secondary); }

label,
.card-title small,
.exec-step small,
.ops-dashboard,
.crm-table td,
.drawer-fields b,
.message-preview p { font-size: max(13px, 0.8125rem); }

.eyebrow,
.tag,
.hero-proof,
.panel-top,
.backend-proof b,
.backend-proof small,
.ops-panel-head small,
.ops-sync-state small,
.ops-kpis small,
.ops-table th,
.reliability-copy small,
.architecture small,
.implementation-proof small,
.crm-topbar small,
.crm-panel-head small,
.automation-header small,
.message-preview small { font-size: 12px; }
```

Remove or override all important 7–11.5px computed text. Keep 11px only for clearly incidental code/technical notation.

- [ ] **Step 4: Run the runtime small-text audit again**

Repeat Step 1.

Expected: no important UI or explanatory text below 12px. Any remaining under-12 text must be limited to incidental technical notation and listed explicitly in the audit notes.

- [ ] **Step 5: Test both themes visually**

```bash
agent-browser screenshot light-readable.png --full
agent-browser find role button click --name "Theme"
agent-browser screenshot dark-readable.png --full
```

Check:
- muted text remains readable;
- red labels are legible;
- table labels do not disappear;
- dashboard legends are readable.

- [ ] **Step 6: Commit**

```bash
git add styles.css index.html
git commit -m "fix LeadFlow small-text visibility and contrast"
```

---

### Task 5: Add Presentation Motion, Responsive Behavior, and Empty States

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: dashboard model and current reveal system.
- Produces: count-up/draw animation classes without changing data semantics.

- [ ] **Step 1: Add empty-state rendering paths**

In `renderOps()`, when `model.total === 0`:
- KPI values remain zero;
- donut shows neutral empty ring;
- score trend says `Run a lead to build the score trend.`;
- action queue says `No queued actions yet.`;
- source quality says `No source data yet.`;
- urgency says `No timeline data yet.`;
- table body renders one accessible empty row spanning all columns;
- activity says `Run the interactive demo to create the first local record.`.

- [ ] **Step 2: Add presentation-safe metric animation helper**

```js
function animateNumber(el, to, suffix = "") {
  if (!el) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    el.textContent = `${to}${suffix}`;
    return;
  }
  const from = Number(el.dataset.value || 0);
  const start = performance.now();
  const duration = 420;
  const tick = now => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = `${Math.round(from + (to - from) * eased)}${suffix}`;
    if (p < 1) requestAnimationFrame(tick);
    else el.dataset.value = String(to);
  };
  requestAnimationFrame(tick);
}
```

Use it only for KPI values.

- [ ] **Step 3: Add chart/reveal motion classes**

Use transform/opacity and SVG stroke-dash transitions. Under:
```css
@media (prefers-reduced-motion: reduce) {
  .ops-donut *,
  .ops-score-trend *,
  .ops-source-quality *,
  .ops-urgency-mix *,
  .ops-activity-row {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 4: Verify reduced motion**

```bash
agent-browser eval 'matchMedia("(prefers-reduced-motion: reduce)").matches'
```

Also run Chromium/agent-browser with reduced motion if supported; otherwise inspect CSS media rule and verify the final values are present without animation-dependent visibility.

- [ ] **Step 5: Verify responsive widths and overflow**

For 390 / 768 / 1024 / 1440, use browser viewport control or Chromium and evaluate:
```js
({
  viewport: innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  overflow: document.documentElement.scrollWidth > innerWidth
})
```

Expected: `overflow: false` at every tested width.

At 390:
- KPI grid may become 2x2 or 1-column;
- infographic panels stack;
- table scrolls within its own wrapper rather than widening the page;
- toolbar actions wrap;
- buttons remain usable.

- [ ] **Step 6: Commit**

```bash
git add app.js styles.css
git commit -m "polish LeadFlow dashboard motion and responsive states"
```

---

### Task 6: Full Runtime Audit, Review, Deploy, and Production Verification

**Files:**
- Modify only if verification discovers defects.
- Update: `docs/handoffs/leadflow-portfolio-refinement-handoff-2026-09-25.md` after successful deploy.

**Interfaces:**
- Verifies all prior tasks and production deployment.

- [ ] **Step 1: Run unit/static checks**

```bash
node --test tests/leadflow-dashboard-model.test.js
node --check dashboard.js
node --check app.js
node --check functions/api/qualify.js
git diff --check
```

Expected: all exit 0.

- [ ] **Step 2: Run agent-browser dev verification**

```bash
agent-browser open http://127.0.0.1:8797/
agent-browser wait --load networkidle
agent-browser eval 'document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"'
agent-browser eval 'document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay") ? "ERROR_OVERLAY" : "OK"'
agent-browser snapshot -i
agent-browser screenshot --annotate
```

Expected: `HAS_CONTENT`, `OK`, expected controls visible.

- [ ] **Step 3: Run all three lead presets**

For each preset:
1. select/click preset;
2. click `Run automation`;
3. wait for `COMPLETE`;
4. verify result and dashboard update;
5. capture dashboard screenshot.

Expected canonical outcomes remain:
- high-priority example: 92;
- review example: 64;
- nurture example: 33.

- [ ] **Step 4: Run empty-state and CRM verification**

Clear only LeadFlow demo localStorage keys in the local QA origin, reload, verify empty dashboard, then create leads again and open full CRM.

Expected:
- no crash/NaN;
- CRM table matches the local record set;
- dashboard totals match CRM totals.

- [ ] **Step 5: Run final text-size/contrast and responsive audit**

Re-run the computed small-text audit and widths 390/768/1024/1440.

Expected:
- no important text <12px;
- no page horizontal overflow;
- both themes visually readable.

- [ ] **Step 6: Run whole-branch review**

Use `superpowers:requesting-code-review` for a fresh review against the approved spec. Address any P0/P1 issue before deployment.

- [ ] **Step 7: Run verification-before-completion gate**

Use `superpowers:verification-before-completion`. Re-run the complete evidence commands immediately before claiming success.

- [ ] **Step 8: Merge/push the reviewed branch to main**

```bash
git push origin HEAD:main
```

Only after final verification succeeds.

- [ ] **Step 9: Deploy through authenticated samvr Wrangler CLI**

Stage only:
- `index.html`
- `app.js`
- `dashboard.js`
- `styles.css`
- `favicon.svg`
- `v1/`
- `functions/`

Then:
```bash
npx --yes wrangler@4 pages deploy . \
  --project-name leadflow-ai \
  --branch main \
  --commit-hash "$(git rev-parse HEAD)" \
  --commit-message "LeadFlow dashboard and readability redesign"
```

- [ ] **Step 10: Verify production**

Verify canonical production and immutable deployment:
- root contains the redesigned dashboard markers;
- root loads `dashboard.js`;
- root API reports `deterministic-qualification-v2`;
- Sarah/Acme POST returns 92;
- `/v1/` still contains legacy LeadFlow AI;
- `/v1/api/qualify` remains v1;
- agent-browser screenshots confirm light + dark dashboard readability in production.

- [ ] **Step 11: Record handoff**

Append:
- deployed commit;
- immutable Cloudflare URL;
- unit test results;
- browser QA results;
- width/overflow results;
- text-size audit summary;
- root/v1 API verification;
- any explicitly accepted residual issue.

Commit the handoff separately so production source SHA remains identifiable.
