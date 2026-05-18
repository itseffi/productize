import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { findDistributionInternals } from "../scripts/lib/distribution.mjs";
import { pluginsRoot, repoRoot } from "../scripts/lib/productize.mjs";

const pluginInternals = findDistributionInternals(pluginsRoot);
assert.deepEqual(
  pluginInternals,
  [],
  `Plugin bundles must not include canonical internals:\n${formatInternals(pluginInternals)}`,
);

for (const hostRoot of [".agents/skills", ".claude/skills", ".cursor/skills", ".opencode/skills", ".factory/skills"]) {
  const absolute = path.join(repoRoot, hostRoot);
  if (!existsSync(absolute)) continue;
  const internals = findDistributionInternals(absolute);
  assert.deepEqual(
    internals,
    [],
    `${hostRoot} must not include canonical internals:\n${formatInternals(internals)}`,
  );
}

assertFile("plugins/productize-growth/skills/productize-plg-growth-playbook/SKILL.md");
assertNoFile("plugins/productize-growth/skills/plg-growth-playbook/SKILL.md");
assertFile("plugins/productize-finance/skills/productize-finance-modeling-kernel/finance-modeling-kernel/dcf.py");
assertNoFile("plugins/productize-finance/skills/productize-finance-modeling-kernel/finance-modeling-kernel/tests/test_acceptance.py");
assertNoFile(".agents/skills/productize-finance-modeling-kernel/finance-modeling-kernel/tests/test_acceptance.py");

console.log("Plugin distribution tests passed.");

function assertFile(relativePath) {
  assert.ok(existsSync(path.join(repoRoot, relativePath)), `Missing file: ${relativePath}`);
}

function assertNoFile(relativePath) {
  assert.ok(!existsSync(path.join(repoRoot, relativePath)), `Forbidden file exists: ${relativePath}`);
}

function formatInternals(items) {
  return items.map((item) => `- ${item.path} (${item.reason})`).join("\n");
}
