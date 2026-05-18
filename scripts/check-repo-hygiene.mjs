import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { repoRoot } from "./lib/productize.mjs";

const args = new Set(process.argv.slice(2));
const allowCopiedTree = args.has("--allow-copied-tree");
const errors = [];
const warnings = [];

checkGitCheckout();
checkGitignore();
checkForbiddenFiles();
checkFreshnessWorkflow();

if (warnings.length) {
  console.warn(`Repo hygiene warnings (${warnings.length}):`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error(`Repo hygiene failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Repo hygiene passed${allowCopiedTree ? " for copied-tree mode" : ""}.`);

function checkGitCheckout() {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const message =
      "This directory is not a git checkout. CI freshness gates require .git metadata for git diff and git ls-files.";
    if (allowCopiedTree) warnings.push(`${message} Skipping git-only checks because --allow-copied-tree was passed.`);
    else errors.push(`${message} Use a real clone or pass --allow-copied-tree for local copied-tree checks.`);
    return;
  }

  const topLevel = path.resolve(result.stdout.trim());
  if (topLevel !== repoRoot) {
    errors.push(`Git top-level mismatch: expected ${repoRoot}, got ${topLevel}`);
  }
}

function checkGitignore() {
  const gitignore = path.join(repoRoot, ".gitignore");
  if (!existsSync(gitignore)) {
    errors.push("Missing .gitignore");
    return;
  }
  const lines = readFileSync(gitignore, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.includes(".DS_Store")) errors.push(".gitignore must ignore .DS_Store");
}

function checkForbiddenFiles() {
  const forbidden = [];
  walk(repoRoot, "");
  for (const file of forbidden) errors.push(`Forbidden local artifact present: ${file}`);

  function walk(dir, relativeDir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const relativePath = toPosix(path.join(relativeDir, entry.name));
      if (shouldSkip(relativePath, entry)) continue;
      if (entry.name === ".DS_Store") forbidden.push(relativePath);
      if (entry.isDirectory()) walk(path.join(dir, entry.name), relativePath);
    }
  }
}

function checkFreshnessWorkflow() {
  const workflow = path.join(repoRoot, ".github", "workflows", "skill-docs.yml");
  if (!existsSync(workflow)) {
    errors.push("Missing freshness workflow: .github/workflows/skill-docs.yml");
    return;
  }
  const content = readFileSync(workflow, "utf8");
  if (!content.includes("actions/checkout@")) errors.push("Freshness workflow must checkout the git repository before git freshness checks");
  if (!content.includes("git diff --exit-code")) errors.push("Freshness workflow must use git diff to detect stale generated files");
  if (!content.includes("git ls-files --others --exclude-standard")) {
    errors.push("Freshness workflow must use git ls-files --others --exclude-standard to detect new untracked generated files");
  }
}

function shouldSkip(relativePath, entry) {
  const parts = relativePath.split("/");
  if (parts.includes(".git")) return true;
  if (parts.includes("node_modules")) return true;
  if (parts.includes(".productize-evals")) return true;
  if (parts.includes(".tmp-productize-eval")) return true;
  if (parts.includes("dist")) return true;
  return false;
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}
