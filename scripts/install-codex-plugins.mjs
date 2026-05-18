import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, cpSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { groupByCategory, pluginsRoot, readAllSkills, repoRoot, slugify } from "./lib/productize.mjs";

const args = process.argv.slice(2);
const mode = getFlagValue("--mode") || "symlink";
const force = args.includes("--force");
const destRoot = path.resolve(expandHome(getFlagValue("--dest") || "~/plugins"));
const marketplacePath = path.resolve(expandHome(getFlagValue("--marketplace") || "~/.agents/plugins/marketplace.json"));
const requested = positionals();

if (!["copy", "symlink"].includes(mode)) {
  console.error("Use --mode symlink or --mode copy.");
  process.exit(1);
}

const skills = readAllSkills();
const categoryPlugins = groupByCategory(skills).map(([category]) => `productize-${slugify(category, 48)}`);
const available = new Set([...categoryPlugins, "productize-all"]);
const selected = requested.length ? requested : categoryPlugins;

for (const name of selected) {
  if (!available.has(name)) {
    console.error(`Unknown plugin: ${name}`);
    console.error(`Available: ${[...available].join(", ")}`);
    process.exit(1);
  }
}

mkdirSync(destRoot, { recursive: true });

for (const name of selected) {
  const source = path.join(pluginsRoot, name);
  const dest = path.join(destRoot, name);
  if (!existsSync(source)) {
    console.error(`Missing built plugin: ${path.relative(repoRoot, source)}. Run npm run plugins:build first.`);
    process.exit(1);
  }
  if (existsSync(dest)) {
    if (!force) {
      console.error(`Destination exists: ${dest}. Use --force to replace it.`);
      process.exit(1);
    }
    rmSync(dest, { recursive: true, force: true });
  }
  if (mode === "symlink") {
    symlinkSync(source, dest, "dir");
  } else {
    cpSync(source, dest, { recursive: true });
  }
  console.log(`${mode === "symlink" ? "Linked" : "Copied"} ${name} -> ${dest}`);
}

mkdirSync(path.dirname(marketplacePath), { recursive: true });
const marketplace = existsSync(marketplacePath)
  ? JSON.parse(readFileSync(marketplacePath, "utf8"))
  : { name: "local-productize", interface: { displayName: "Local Productize" }, plugins: [] };

marketplace.name ||= "local-productize";
marketplace.interface ||= { displayName: "Local Productize" };
marketplace.plugins ||= [];

for (const name of selected) {
  const entry = {
    name,
    source: {
      source: "local",
      path: `./plugins/${name}`,
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL",
    },
    category: "Productivity",
  };
  const existingIndex = marketplace.plugins.findIndex((plugin) => plugin.name === name);
  if (existingIndex >= 0) marketplace.plugins[existingIndex] = entry;
  else marketplace.plugins.push(entry);
}

writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`, "utf8");
console.log(`Updated ${marketplacePath}`);
console.log("Restart Codex to pick up newly installed local plugins.");

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
    if (["--mode", "--dest", "--marketplace"].includes(arg)) {
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
