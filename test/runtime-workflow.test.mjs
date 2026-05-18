import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { repoRoot } from "../scripts/lib/productize.mjs";

const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "productize-runtime-workflow-test-"));
const stateDir = path.join(tmpRoot, "state");

try {
  const started = runJson(["bin/productize-workflow", "start", "--json", "Is this PMF for our freemium product?"]);
  assert.ok(started.id, "workflow start must return id");
  assert.equal(started.status, "started");
  assert.equal(started.classification.product_stage, "PMF search");
  assert.equal(started.classification.artifact_mode, "diagnostic");
  assert.equal(started.routes[0].name, "product-market-fit-cycle");

  assertFile(path.join(stateDir, "workflows", `${started.id}.json`));
  assertFile(path.join(stateDir, "session-log.jsonl"));
  assertFile(path.join(stateDir, "routing-log.jsonl"));
  assert.match(readFileSync(path.join(stateDir, "session-log.jsonl"), "utf8"), /workflow_started/);
  assert.match(readFileSync(path.join(stateDir, "routing-log.jsonl"), "utf8"), /route_resolved/);

  const completed = runJson([
    "bin/productize-workflow",
    "complete",
    "--json",
    "--id",
    started.id,
    "--status",
    "completed",
    "--artifact-type",
    "PMF cycle diagnosis",
    "--summary",
    "Diagnosed PMF risks and next validation loop.",
    "--context-summary",
    "PMF context saved for follow-up.",
  ]);
  assert.equal(completed.status, "completed");
  assert.equal(completed.artifact_type, "PMF cycle diagnosis");
  assert.ok(completed.saved_context, "completed workflow should save context");

  assert.match(readFileSync(path.join(stateDir, "artifact-log.jsonl"), "utf8"), /PMF cycle diagnosis/);
  assert.match(readFileSync(path.join(stateDir, "completion-status.jsonl"), "utf8"), /completed/);
  assert.ok(readdirSync(path.join(stateDir, "contexts")).some((file) => file.endsWith(".json")));
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

console.log("Runtime workflow tests passed.");

function runJson(command) {
  const result = spawnSync(process.execPath, command, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, PRODUCTIZE_STATE_DIR: stateDir },
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  assert.equal(result.status, 0, `${command.join(" ")} failed\n${output}`);
  return JSON.parse(result.stdout);
}

function assertFile(file) {
  assert.ok(existsSync(file), `Missing file: ${file}`);
}
