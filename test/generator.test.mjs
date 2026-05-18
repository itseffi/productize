import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { hosts } from "../hosts/index.mjs";
import { parseFrontmatter, repoRoot } from "../scripts/lib/productize.mjs";

for (const host of ["canonical", "codex"]) {
  const dryRun = spawnSync(process.execPath, ["scripts/gen-skill-docs.mjs", "--host", host, "--dry-run", "--quiet"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const dryRunOutput = `${dryRun.stdout || ""}${dryRun.stderr || ""}`;
  assert.equal(dryRun.status, 0, `${host} generated skill outputs are stale\n${dryRunOutput}`);
  assert.doesNotMatch(dryRunOutput, /^STALE:/m);
}

const rootSkill = readFile("SKILL.md");
assert.match(rootSkill, /AUTO-GENERATED from SKILL\.md\.tmpl/);
assert.match(rootSkill, /## Productize Preamble/);
assert.match(rootSkill, /## Routing Map/);
assert.equal(parseFrontmatter(rootSkill).name, "productize");

const codexSkill = readFile(".agents/skills/productize-product-market-fit-cycle/SKILL.md");
const codexFrontmatter = parseFrontmatter(codexSkill);
assert.equal(codexFrontmatter.name, "productize-product-market-fit-cycle");
assert.ok(codexFrontmatter.description.length <= 1024, "Codex generated description must respect host limit");
assert.match(codexSkill, /AUTO-GENERATED/);
assert.doesNotMatch(codexSkill, /Claude Code/);

assertFile("agents/openai.yaml");
assertFile("skills/product-market-fit-cycle/agents/openai.yaml");
assertFile(".agents/skills/productize-product-market-fit-cycle/agents/openai.yaml");

for (const host of hosts) {
  const manifest = readJson(path.join(host.hostSubdir, "productize-runtime.json"));
  assert.equal(manifest.generated, true, `${host.name} runtime manifest must be generated`);
  assert.equal(manifest.host, host.name);
  assert.equal(manifest.adapter_source, host.adapterSource);
  assert.ok(
    manifest.sidecars.some((sidecar) => sidecar.source === "bin/productize-runtime.mjs"),
    `${host.name} runtime manifest must include productize-runtime.mjs`,
  );
  assert.ok(
    manifest.sidecars.some((sidecar) => sidecar.source === "bin/productize-routing.mjs"),
    `${host.name} runtime manifest must include shared routing module`,
  );
  assertFile(path.join(host.outputRoot, "productize", "SKILL.md"));
}

console.log("Generator tests passed.");

function readFile(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readFile(relativePath));
}

function assertFile(relativePath) {
  assert.ok(existsSync(path.join(repoRoot, relativePath)), `Missing file: ${relativePath}`);
}
