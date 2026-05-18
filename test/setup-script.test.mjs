import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { repoRoot } from "../scripts/lib/productize.mjs";

const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "productize-setup-script-test-"));

try {
  const fakeBin = path.join(tmpRoot, "bin");
  mkdirSync(fakeBin, { recursive: true });
  const fakeCodex = path.join(fakeBin, "codex");
  writeFileSync(fakeCodex, "#!/usr/bin/env sh\nexit 0\n", { mode: 0o700 });
  chmodSync(fakeCodex, 0o700);

  const env = {
    ...process.env,
    PATH: `${fakeBin}${path.delimiter}${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ""}`,
    PRODUCTIZE_STATE_DIR: path.join(tmpRoot, "state"),
  };

  run(["./setup", "--dry-run", "--host", "auto"], env, /Hosts: codex/);

  run([process.execPath, "bin/productize-config", "set", "skill_prefix", "false"], env);
  run(["./setup", "--dry-run", "--host", "auto"], env, /Skill prefix: flat/);

  const configPath = path.join(env.PRODUCTIZE_STATE_DIR, "config.json");
  const configMode = statMode(configPath);
  assert.ok((configMode & 0o077) === 0, `config file must not be group/world readable: ${configMode.toString(8)}`);

  const help = run(["./setup", "--help"], env);
  assert.match(help.stdout, /--host auto\|codex\|claude\|cursor\|opencode\|factory\|all/);
  assert.match(help.stdout, /--dry-run/);
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

console.log("Setup script tests passed.");

function run(command, env = process.env, expectedStdout) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    encoding: "utf8",
    env,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  assert.equal(result.status, 0, `${command.join(" ")} failed\n${output}`);
  if (expectedStdout) assert.match(result.stdout, expectedStdout);
  return result;
}

function statMode(file) {
  return os.platform() === "win32" ? 0o600 : statSync(file).mode & 0o777;
}
