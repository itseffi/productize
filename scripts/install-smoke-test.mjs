import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { repoRoot } from "./lib/productize.mjs";

const args = new Set(process.argv.slice(2));
const host = valueFor("--host") || "codex";
const keep = args.has("--keep");
const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "productize-install-smoke-"));
const hostRoot = path.join(tmpRoot, host);
const skillsRoot = path.join(hostRoot, "skills");
const marketplacePath = path.join(hostRoot, "plugins", "productize-skills.json");

try {
  const setupArgs = ["./setup", "--host", host, "--mode", "copy", "--force", "--dest", skillsRoot];
  if (host === "codex") setupArgs.push("--marketplace", marketplacePath);
  run(setupArgs);

  assertFile(path.join(skillsRoot, "productize", "SKILL.md"), "root installed skill");
  assertFile(path.join(skillsRoot, "productize-product-market-fit-cycle", "SKILL.md"), "sample installed skill");

  const runtimeRoot = path.join(path.dirname(skillsRoot), "productize");
  assertFile(path.join(runtimeRoot, "runtime.json"), "runtime manifest");
  assertFile(path.join(runtimeRoot, "registry", "skills.json"), "runtime registry");
  assertFile(path.join(runtimeRoot, "bin", "productize-runtime.mjs"), "runtime sidecar");
  assertFile(path.join(runtimeRoot, "bin", "productize-skill-router"), "router sidecar");
  assertFile(path.join(runtimeRoot, "bin", "productize-workflow"), "workflow sidecar");

  const runtime = JSON.parse(readFileSync(path.join(runtimeRoot, "runtime.json"), "utf8"));
  assert.equal(runtime.host, host, "runtime host must match smoke-test host");
  assert.equal(runtime.skills_root, skillsRoot, "runtime skills_root must point at smoke install root");

  if (host === "codex") {
    assertFile(marketplacePath, "Codex marketplace install record");
    const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));
    assert.equal(marketplace.skills, skillsRoot, "Codex marketplace must point at smoke install root");
  }

  const router = spawnSync(process.execPath, [path.join(runtimeRoot, "bin", "productize-skill-router"), "Is this PMF?"], {
    cwd: tmpRoot,
    encoding: "utf8",
    env: { ...process.env, PRODUCTIZE_STATE_DIR: path.join(tmpRoot, "state") },
  });
  const output = `${router.stdout || ""}${router.stderr || ""}`;
  assert.equal(router.status, 0, `installed router failed\n${output}`);
  assert.match(output, /product-market-fit-cycle/, "installed router should resolve PMF request");

  console.log(`Install smoke test passed for ${host} at ${skillsRoot}`);
} finally {
  if (!keep) rmSync(tmpRoot, { recursive: true, force: true });
  else console.log(`Kept smoke-test install root: ${tmpRoot}`);
}

function run(command) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, PRODUCTIZE_STATE_DIR: path.join(tmpRoot, "state") },
  });
  assert.equal(result.status, 0, `${command.join(" ")} failed`);
}

function assertFile(file, label) {
  assert.ok(existsSync(file), `Missing ${label}: ${file}`);
}

function valueFor(flag) {
  const argv = process.argv.slice(2);
  const equals = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (equals) return equals.slice(flag.length + 1);
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}
