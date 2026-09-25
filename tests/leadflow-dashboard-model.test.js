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
