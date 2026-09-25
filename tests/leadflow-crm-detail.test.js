const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("full CRM leads view includes workspace-level operational analytics", () => {
  for (const id of [
    "crmOverviewDistribution",
    "crmOverviewDistributionLegend",
    "crmOverviewScoreTrend",
    "crmOverviewActionQueue",
    "crmOverviewSourceQuality",
    "crmOverviewUrgencyMix",
    "crmOverviewActivity",
    "crmAverage",
    "crmImmediate"
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
});

test("full CRM leads view keeps operational search and pipeline table", () => {
  assert.match(html, /id=["']crmSearch["']/);
  assert.match(html, /id=["']crmFilter["']/);
  assert.match(html, /id=["']crmRows["']/);
});

test("full CRM KPI set describes pipeline, priority, score, and urgency", () => {
  assert.match(html, />Pipeline</);
  assert.match(html, />High priority</);
  assert.match(html, />Average score</);
  assert.match(html, />Immediate follow-up</);
});

