import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { repoRoot } from "../scripts/lib/productize.mjs";

const local = run(["scripts/check-repo-hygiene.mjs", "--allow-copied-tree"]);
assert.match(`${local.stdout}${local.stderr}`, /Repo hygiene passed/);

const strict = spawnSync(process.execPath, ["scripts/check-repo-hygiene.mjs"], {
  cwd: repoRoot,
  encoding: "utf8",
});

if (strict.status === 0) {
  assert.match(strict.stdout, /Repo hygiene passed/);
} else {
  assert.match(`${strict.stdout || ""}${strict.stderr || ""}`, /not a git checkout|Git top-level mismatch/);
}

console.log("Repo hygiene tests passed.");

function run(command) {
  const result = spawnSync(process.execPath, command, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  assert.equal(result.status, 0, `${command.join(" ")} failed\n${output}`);
  return result;
}
