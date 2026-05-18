import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { repoRoot } from "../scripts/lib/productize.mjs";

const packagePath = path.join(repoRoot, "package.json");
const versionPath = path.join(repoRoot, "VERSION");
const changelogPath = path.join(repoRoot, "CHANGELOG.md");

const beforePackage = readFileSync(packagePath, "utf8");
const beforeVersion = readFileSync(versionPath, "utf8");
const beforeChangelog = readFileSync(changelogPath, "utf8");
const dryRunVersion = `0.0.0-dryrun.${Date.now()}`;
const dryRunManifest = path.join(repoRoot, "dist", `productize-release-${dryRunVersion}.json`);

const releaseCheck = run([process.execPath, "scripts/release-check.mjs"]);
assert.match(releaseCheck.stdout, /Release check passed/);

assert.equal(existsSync(dryRunManifest), false, "dry-run test manifest should not already exist");
const dryRun = run([
  process.execPath,
  "scripts/release.mjs",
  "--dry-run",
  "--version",
  dryRunVersion,
  "--skip-build",
  "--skip-tests",
  "--skip-evals",
  "--skip-smoke",
]);
assert.match(dryRun.stdout, /DRY RUN npm run release:check/);
assert.match(dryRun.stdout, /DRY RUN npm run upgrade:check/);
assert.doesNotMatch(dryRun.stdout, /Release check passed/);
assertUnchanged();
assert.equal(existsSync(dryRunManifest), false, "release dry-run must not write a release manifest");

const invalid = spawnSync(
  process.execPath,
  ["scripts/release.mjs", "--dry-run", "--version", "not-a-version", "--skip-build", "--skip-tests", "--skip-evals", "--skip-smoke"],
  {
    cwd: repoRoot,
    encoding: "utf8",
  },
);
assert.notEqual(invalid.status, 0, "invalid release version must fail");
assert.match(`${invalid.stdout || ""}${invalid.stderr || ""}`, /semver/);
assertUnchanged();

console.log("Release tests passed.");

function run(command) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  assert.equal(result.status, 0, `${command.join(" ")} failed\n${output}`);
  return result;
}

function assertUnchanged() {
  assert.equal(readFileSync(packagePath, "utf8"), beforePackage, "release tests must not mutate package.json");
  assert.equal(readFileSync(versionPath, "utf8"), beforeVersion, "release tests must not mutate VERSION");
  assert.equal(readFileSync(changelogPath, "utf8"), beforeChangelog, "release tests must not mutate CHANGELOG.md");
}
