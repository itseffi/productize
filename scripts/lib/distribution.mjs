import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const forbiddenFileNames = new Set(["SKILL.md.tmpl", "productize.json", ".DS_Store"]);
const forbiddenDirectoryNames = new Set(["test", "tests", "eval", "evals", ".pytest_cache", "__pycache__"]);
const forbiddenExtensions = new Set([".pyc", ".pyo"]);

export function copyDistributionTree(sourceRoot, destinationRoot, options = {}) {
  const includeSkillMarkdown = options.includeSkillMarkdown !== false;
  const includeAgents = options.includeAgents !== false;

  if (!existsSync(sourceRoot)) {
    throw new Error(`Distribution source does not exist: ${sourceRoot}`);
  }

  mkdirSync(destinationRoot, { recursive: true });
  copyChildren(sourceRoot, destinationRoot, "");

  function copyChildren(sourceDir, destinationDir, relativeDir) {
    for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
      const relativePath = toPosix(path.join(relativeDir, entry.name));
      if (!includeSkillMarkdown && relativePath === "SKILL.md") continue;
      if (!includeAgents && (relativePath === "agents" || relativePath.startsWith("agents/"))) continue;
      if (isDistributionInternalPath(relativePath, entry.isDirectory())) continue;

      const source = path.join(sourceDir, entry.name);
      const destination = path.join(destinationDir, entry.name);
      if (entry.isDirectory()) {
        mkdirSync(destination, { recursive: true });
        copyChildren(source, destination, relativePath);
      } else {
        mkdirSync(path.dirname(destination), { recursive: true });
        cpSync(source, destination);
      }
    }
  }
}

export function findDistributionInternals(root) {
  const found = [];
  if (!existsSync(root)) return found;
  walk(root, "");
  return found;

  function walk(currentDir, relativeDir) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const relativePath = toPosix(path.join(relativeDir, entry.name));
      const reason = distributionInternalReason(relativePath, entry.isDirectory());
      if (reason) {
        found.push({ path: relativePath, reason });
        continue;
      }
      if (entry.isDirectory()) walk(path.join(currentDir, entry.name), relativePath);
    }
  }
}

export function isDistributionInternalPath(relativePath, isDirectory = false) {
  return Boolean(distributionInternalReason(relativePath, isDirectory));
}

export function distributionInternalReason(relativePath, isDirectory = false) {
  const parts = toPosix(relativePath).split("/").filter(Boolean);
  const basename = parts.at(-1) || "";
  if (forbiddenFileNames.has(basename)) return "canonical source file";
  if (parts.some((part) => forbiddenDirectoryNames.has(part))) return "canonical test/eval directory";
  if (!isDirectory && forbiddenExtensions.has(path.extname(basename))) return "compiled cache file";
  return "";
}

export function cleanDistributionDestination(destinationRoot) {
  rmSync(destinationRoot, { recursive: true, force: true });
  mkdirSync(destinationRoot, { recursive: true });
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}
