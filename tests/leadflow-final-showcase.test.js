const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

test("final showcase has a persistent presentation progress rail", () => {
  assert.match(html, /id=["']presentationProgressBar["']/);
  assert.match(css, /.presentation-progress/);
  assert.match(app, /presentationProgressBar/);
});

test("workflow blueprint is demoted into a collapsible planning tool", () => {
  assert.match(html, /<details[^>]+class=["'][^"']*blueprint-disclosure/);
  assert.match(html, /Explore the workflow planning tool/i);
});

test("mobile workspace pipeline has card labels instead of requiring table reading", () => {
  assert.match(app, /data-label=["']Lead["']/);
  assert.match(app, /data-label=["']Next action["']/);
  assert.match(css, /@media\(max-width:680px\)[\s\S]*\.ops-table tbody tr/);
});

test("light blueprint nodes and final CTA define explicit readable colors", () => {
  assert.match(css, /html\[data-theme=light\] \.bp-node\s*\{[^}]*color:/);
  assert.match(css, /html\[data-theme=light\] \.bp-node\.selected\s*\{[^}]*color:/);
  assert.match(css, /html\[data-theme=light\] \.final-cta>div>p:not\(\.tag\)/);
});

test("navigation uses deterministic reading-line state rather than section intersection ratios", () => {
  assert.match(app, /function updateReadingState/);
  assert.doesNotMatch(app, /const navObserver=new IntersectionObserver/);
});


test("architecture keeps core flow visible and collapses secondary implementation detail", () => {
  assert.match(html, /<details[^>]+class=["'][^"']*architecture-more/);
  assert.match(html, /Explore integration and implementation details/i);
});

test("mobile showcase uses compact workflow timeline and snap analytics rail", () => {
  assert.match(css, /@media\(max-width:680px\)[\s\S]*\.ops-analytics-secondary\s*\{[^}]*scroll-snap-type:x mandatory/);
  assert.match(css, /@media\(max-width:680px\)[\s\S]*\.workflow-map article\s*\{[^}]*grid-template-columns:40px 1fr/);
});

test("navigation leaves section links neutral while the hero is still above the reading line", () => {
  assert.match(app, /const firstTarget=/);
  assert.match(app, /firstTarget&&firstTarget\.getBoundingClientRect\(\)\.top>readingLine/);
});
