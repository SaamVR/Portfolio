const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("workspace exposes practical dashboard regions", () => {
  for (const id of ["opsDistribution","opsDistributionLegend","opsScoreTrend","opsActionQueue","opsSourceQuality","opsUrgencyMix","opsTechnicalActivity"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
});

test("workspace removes old thumbnail chart contract", () => {
  assert.doesNotMatch(html, /id=["']opsScoreChart["']/);
  assert.doesNotMatch(html, /id=["']opsSourceList["']/);
  assert.doesNotMatch(html, /class=["'][^"']*ops-input-panel/);
});

test("pipeline table includes next action column", () => {
  assert.match(html, /<th>Next action<\/th>/i);
});
