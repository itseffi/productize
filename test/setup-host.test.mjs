import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { repoRoot } from "../scripts/lib/productize.mjs";

const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "productize-setup-host-test-"));

try {
  const installRoot = path.join(tmpRoot, "codex", "skills");
  const marketplacePath = path.join(tmpRoot, "codex", "plugins", "productize-skills.json");
  run([
    process.execPath,
    "scripts/setup-host.mjs",
    "--host",
    "codex",
    "--mode",
    "copy",
    "--force",
    "--dest",
    installRoot,
    "--marketplace",
    marketplacePath,
  ]);

  assertFile(path.join(installRoot, "productize", "SKILL.md"));
  assertFile(path.join(installRoot, "productize-product-market-fit-cycle", "SKILL.md"));

  const runtimeRoot = path.join(path.dirname(installRoot), "productize");
  const runtimeManifest = JSON.parse(readFileSync(path.join(runtimeRoot, "runtime.json"), "utf8"));
  assert.equal(runtimeManifest.host, "codex");
  assert.equal(runtimeManifest.skills_root, installRoot);
  assert.ok(runtimeManifest.sidecars.includes("bin/productize-runtime.mjs"));
  assert.ok(runtimeManifest.sidecars.includes("bin/productize-routing.mjs"));
  assert.ok(runtimeManifest.sidecars.includes("bin/productize-workflow"));
  assertFile(path.join(runtimeRoot, "bin", "productize-runtime.mjs"));
  assertFile(path.join(runtimeRoot, "bin", "productize-routing.mjs"));
  assertFile(path.join(runtimeRoot, "bin", "productize-skill-router"));
  assertFile(path.join(runtimeRoot, "bin", "productize-workflow"));
  assertFile(path.join(runtimeRoot, "registry", "skills.json"));
  assertOwnerOnly(path.join(installRoot, "productize-product-market-fit-cycle", "SKILL.md"));
  assertOwnerOnly(path.join(runtimeRoot, "registry", "skills.json"));
  assertExecutableOwnerOnly(path.join(runtimeRoot, "bin", "productize-skill-router"));
  assertExecutableOwnerOnly(path.join(runtimeRoot, "bin", "productize-workflow"));

  const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));
  assert.equal(marketplace.skills, installRoot);

  const router = spawnSync(process.execPath, [path.join(runtimeRoot, "bin", "productize-skill-router"), "Is this PMF?"], {
    cwd: tmpRoot,
    encoding: "utf8",
    env: { ...process.env, PRODUCTIZE_STATE_DIR: path.join(tmpRoot, "state") },
  });
  const routerOutput = `${router.stdout || ""}${router.stderr || ""}`;
  assert.equal(router.status, 0, routerOutput);
  assert.match(routerOutput, /^product-market-fit-cycle\t/m);

  const noPrefixRoot = path.join(tmpRoot, "codex-no-prefix", "skills");
  const dryRun = run([
    process.execPath,
    "scripts/setup-host.mjs",
    "--host",
    "codex",
    "--mode",
    "copy",
    "--dry-run",
    "--no-prefix",
    "--dest",
    noPrefixRoot,
  ]);
  assert.match(dryRun.stdout, /productize-product-market-fit-cycle.+product-market-fit-cycle/);
  assert.match(dryRun.stdout, /productize-routing\.mjs/);

  run([process.execPath, "bin/productize-config", "set", "skill_prefix", "false"]);
  const savedPreferenceDryRun = run([
    process.execPath,
    "scripts/setup-host.mjs",
    "--host",
    "codex",
    "--mode",
    "copy",
    "--dry-run",
    "--dest",
    path.join(tmpRoot, "codex-saved-prefix", "skills"),
  ]);
  assert.match(savedPreferenceDryRun.stdout, /productize-product-market-fit-cycle.+product-market-fit-cycle/);
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

console.log("Setup-host tests passed.");

function run(command) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, PRODUCTIZE_STATE_DIR: path.join(tmpRoot, "state") },
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  assert.equal(result.status, 0, `${command.join(" ")} failed\n${output}`);
  return result;
}

function assertFile(file) {
  assert.ok(existsSync(file), `Missing file: ${file}`);
}

function assertOwnerOnly(file) {
  if (os.platform() === "win32") return;
  const mode = statSync(file).mode & 0o777;
  assert.ok((mode & 0o077) === 0, `${file} must not be group/world accessible: ${mode.toString(8)}`);
}

function assertExecutableOwnerOnly(file) {
  if (os.platform() === "win32") return;
  const mode = statSync(file).mode & 0o777;
  assert.equal(mode, 0o700, `${file} must be owner-executable only: ${mode.toString(8)}`);
}
