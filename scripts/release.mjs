import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { repoRoot } from "./lib/productize.mjs";

const argv = process.argv.slice(2);
const args = new Set(argv);
const dryRun = args.has("--dry-run");
const skipBuild = args.has("--skip-build");
const skipTests = args.has("--skip-tests");
const skipEvals = args.has("--skip-evals");
const skipSmoke = args.has("--skip-smoke");
const version = valueFor("--version") || currentVersion();

assert.match(version, /^\d+\.\d+\.\d+(-[A-Za-z0-9.-]+)?$/, "Release version must be semver");

if (valueFor("--version")) {
  updateVersionFiles(version);
}

const commands = [];
if (!skipBuild) commands.push(["npm", "run", "build"]);
if (!skipTests) commands.push(["npm", "run", "test"]);
if (!skipEvals) commands.push(["npm", "run", "eval"]);
if (!skipSmoke) commands.push(["npm", "run", "install:smoke"]);
commands.push(["npm", "run", "release:check"]);
commands.push(["npm", "run", "upgrade:check"]);

for (const command of commands) {
  run(command);
}

writeReleaseManifest(version, commands);
console.log(`Productize ${version} release ${dryRun ? "dry run" : "automation"} completed.`);

function currentVersion() {
  return readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
}

function updateVersionFiles(nextVersion) {
  const packagePath = path.join(repoRoot, "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  packageJson.version = nextVersion;
  writeIfNeeded("VERSION", `${nextVersion}\n`);
  writeIfNeeded("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
  ensureChangelogSection(nextVersion);
}

function ensureChangelogSection(nextVersion) {
  const changelogPath = path.join(repoRoot, "CHANGELOG.md");
  const changelog = readFileSync(changelogPath, "utf8");
  if (new RegExp(`^## ${escapeRegex(nextVersion)}\\b`, "m").test(changelog)) return;
  const today = new Date().toISOString().slice(0, 10);
  const insertion = `## ${nextVersion} - ${today}\n\n- Release pending.\n\n`;
  const updated = changelog.replace(/(## \d+\.\d+\.\d+[^\n]*\n)/, `${insertion}$1`);
  writeIfNeeded("CHANGELOG.md", updated === changelog ? `${changelog.trimEnd()}\n\n${insertion}` : updated);
}

function writeReleaseManifest(releaseVersion, commandsRun) {
  const manifest = {
    version: releaseVersion,
    dry_run: dryRun,
    generated_at: new Date().toISOString(),
    commands: commandsRun.map((command) => command.join(" ")),
  };
  const outPath = path.join(repoRoot, "dist", `productize-release-${releaseVersion}.json`);
  if (dryRun) {
    console.log(`DRY RUN would write ${path.relative(repoRoot, outPath)}`);
    return;
  }
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function run(command) {
  if (dryRun) {
    console.log(`DRY RUN ${command.join(" ")}`);
    return;
  }
  const result = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
  assert.equal(result.status, 0, `${command.join(" ")} failed`);
}

function writeIfNeeded(relativePath, content) {
  const file = path.join(repoRoot, relativePath);
  if (dryRun) {
    const current = existsSync(file) ? readFileSync(file, "utf8") : null;
    if (current !== content) console.log(`DRY RUN would update ${relativePath}`);
    return;
  }
  writeFileSync(file, content, "utf8");
}

function valueFor(flag) {
  const equals = argv.find((arg) => arg.startsWith(`${flag}=`));
  if (equals) return equals.slice(flag.length + 1);
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
