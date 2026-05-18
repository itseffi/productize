import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { groupByCategory, readAllSkills, repoRoot, skillsRoot, slugify } from "./lib/productize.mjs";

const args = process.argv.slice(2);
const force = args.includes("--force");
const destRoot = path.resolve(expandHome(getFlagValue("--dest") || ".claude/skills"));
const requested = positionals();

const skills = readAllSkills();
const groups = new Map(groupByCategory(skills).map(([category, categorySkills]) => [`productize-${slugify(category, 48)}`, categorySkills]));
groups.set("productize-all", skills);

const selectedGroups = requested.length ? requested : [...groups.keys()].filter((name) => name !== "productize-all");
const selectedSkills = new Map();

for (const groupName of selectedGroups) {
  if (!groups.has(groupName)) {
    console.error(`Unknown group: ${groupName}`);
    console.error(`Available groups: ${[...groups.keys()].join(", ")}`);
    process.exit(1);
  }
  for (const prompt of groups.get(groupName)) selectedSkills.set(prompt.skillName, prompt);
}

mkdirSync(destRoot, { recursive: true });

for (const skillName of selectedSkills.keys()) {
  const source = path.join(skillsRoot, skillName);
  const dest = path.join(destRoot, skillName);
  if (!existsSync(source)) {
    console.error(`Missing canonical skill: ${path.relative(repoRoot, source)}.`);
    process.exit(1);
  }
  if (existsSync(dest)) {
    if (!force) {
      console.error(`Destination exists: ${dest}. Use --force to replace it.`);
      process.exit(1);
    }
    rmSync(dest, { recursive: true, force: true });
  }
  cpSync(source, dest, { recursive: true });
}

console.log(`Installed ${selectedSkills.size} skills into ${destRoot}`);
console.log("Restart Claude Code if it does not pick up the new project skills.");

function getFlagValue(flag) {
  const withEquals = args.find((arg) => arg.startsWith(`${flag}=`));
  if (withEquals) return withEquals.slice(flag.length + 1);
  const index = args.indexOf(flag);
  if (index !== -1) return args[index + 1];
  return undefined;
}

function positionals() {
  const out = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.includes("=") && arg.startsWith("--")) continue;
    if (["--dest"].includes(arg)) {
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) continue;
    out.push(arg);
  }
  return out;
}

function expandHome(value) {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}
