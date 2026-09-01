import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

const script = resolve(process.cwd(), "scripts/vercel/ignore-legacy-project-build.sh");

function run(projectId?: string) {
  const env = { ...process.env };
  if (projectId === undefined) delete env.VERCEL_PROJECT_ID;
  else env.VERCEL_PROJECT_ID = projectId;

  const result = spawnSync("bash", [script], { env, encoding: "utf8" });
  assert.equal(result.signal, null);
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

test("canonical Vercel project continues building", () => {
  const result = run("prj_PQVPlfPZCmHicvEcqDsIQT0vWdIF");
  assert.equal(result.status, 1);
  assert.match(result.output, /build allowed/i);
});

test("legacy duplicate projects are ignored", () => {
  for (const projectId of [
    "prj_lHzMV1KlUFZxW8bnhQ2URGdmjHkc",
    "prj_eyHSFXjl5GQ6Ik5OJNcJ04jEDWkr",
  ]) {
    const result = run(projectId);
    assert.equal(result.status, 0);
    assert.match(result.output, /build ignored/i);
  }
});

test("unknown or missing project ids fail open and build", () => {
  assert.equal(run("prj_future_project").status, 1);
  assert.equal(run().status, 1);
});
