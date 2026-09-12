#!/usr/bin/env node
import { performance } from "node:perf_hooks";

const argv = process.argv.slice(2);
const value = (name, fallback = null) => argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const baseUrl = value("base-url");
if (!baseUrl) {
  console.error("Usage: node scripts/storefront-load-smoke.mjs --base-url=http://127.0.0.1:8080 --homepage=/ --catalog=/shop --products-api=/api/... --search=/api/... --product=/product/...");
  process.exit(1);
}

const url = new URL(baseUrl);
const safeHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  || /(^|[.-])(preview|staging|stage|test)([.-]|$)/i.test(url.hostname);
if (!safeHost && process.env.ALLOW_STOREFRONT_LOAD_TARGET !== "1") {
  console.error(`Refusing load test against non-local/non-staging host ${url.hostname}. Set ALLOW_STOREFRONT_LOAD_TARGET=1 only with explicit approval.`);
  process.exit(2);
}

const requests = Math.min(Math.max(Number(value("requests", "10")) || 10, 1), 100);
const concurrency = Math.min(Math.max(Number(value("concurrency", "2")) || 2, 1), 10);
const targets = ["homepage", "catalog", "products-api", "search", "product"]
  .map((name) => [name, value(name)])
  .filter(([, path]) => path);
if (targets.length === 0) targets.push(["homepage", "/"]);

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

async function runTarget(name, path) {
  const timings = [];
  let errors = 0;
  let completed = 0;
  const started = performance.now();
  const workers = Array.from({ length: Math.min(concurrency, requests) }, async () => {
    while (true) {
      const index = completed++;
      if (index >= requests) break;
      const requestStarted = performance.now();
      try {
        const response = await fetch(new URL(path, url), { redirect: "manual", headers: { "User-Agent": "ezcomo-storefront-load-smoke/1.0" } });
        await response.arrayBuffer();
        if (!response.ok && response.status !== 301 && response.status !== 302 && response.status !== 307 && response.status !== 308) errors += 1;
      } catch {
        errors += 1;
      } finally {
        timings.push(performance.now() - requestStarted);
      }
    }
  });
  await Promise.all(workers);
  const durationSeconds = Math.max((performance.now() - started) / 1000, 0.001);
  return {
    name, path, requests, concurrency,
    p50Ms: Number(percentile(timings, 0.50).toFixed(1)),
    p95Ms: Number(percentile(timings, 0.95).toFixed(1)),
    errorRate: Number((errors / requests).toFixed(4)),
    throughputRps: Number((requests / durationSeconds).toFixed(2)),
  };
}

const results = [];
for (const [name, path] of targets) results.push(await runTarget(name, path));
console.log(JSON.stringify({ baseUrl: url.origin, controlled: safeHost, results }, null, 2));
