import { chmodSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, symlinkSync, cpSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getHost } from "../hosts/index.mjs";
import { repoRoot, skillsRoot } from "./lib/productize.mjs";
import { ensureStateDir, readJson, writeJson } from "../bin/productize-runtime.mjs";

process.umask(0o077);

const args = process.argv.slice(2);
const hostName = getFlagValue("--host") || "codex";
const mode = getFlagValue("--mode") || "symlink";
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const prefixFlagSet = args.includes("--prefix") || args.includes("--no-prefix");
const prefix = resolvePrefixPreference();

if (!["copy", "symlink"].includes(mode)) fail("Use --mode copy or --mode symlink.");
if (process.platform === "win32" && mode === "symlink" && process.env.PRODUCTIZE_ALLOW_WINDOWS_SYMLINK !== "1") {
  fail("Windows symlink installs require developer/admin symlink support. Use --mode copy or set PRODUCTIZE_ALLOW_WINDOWS_SYMLINK=1.");
}

const host = getHost(hostName);
const generatedRoot = path.join(repoRoot, host.outputRoot);
const installRoot = path.resolve(expandHome(getFlagValue("--dest") || defaultHostSkillRoot(host.name)));

if (!existsSync(generatedRoot)) fail(`Missing generated host output: ${rel(generatedRoot)}. Run ./setup --host ${host.name} first.`);
guardInstallRoot(installRoot, generatedRoot);

mkdirSync(installRoot, { recursive: true });

for (const entry of listDirs(generatedRoot)) {
  const installName = prefix ? entry : entry.replace(/^productize-/, "");
  const source = path.join(generatedRoot, entry);
  const dest = path.join(installRoot, installName);
  if (dryRun) {
    console.log(`${mode.toUpperCase()} ${source} -> ${dest}`);
    continue;
  }
  if (existsSync(dest)) {
    if (!force) fail(`Destination exists: ${dest}. Use --force to replace it.`);
    rmSync(dest, { recursive: true, force: true });
  }
  if (mode === "symlink") {
    try {
      symlinkSync(source, dest, "dir");
    } catch (error) {
      fail(`Could not symlink ${dest}: ${error.message}. Retry with --mode copy.`);
    }
  } else {
    cpSync(source, dest, { recursive: true });
    hardenTree(dest);
  }
}

installRuntimeSidecars(host, installRoot);
if (host.name === "codex") writeCodexMarketplace(installRoot);
console.log(`Installed ${listDirs(generatedRoot).length} ${host.displayName} skills into ${installRoot}`);

function installRuntimeSidecars(host, installRoot) {
  const runtimeRoot = path.join(path.dirname(installRoot), "productize");
  const runtimeBin = path.join(runtimeRoot, "bin");
  const runtimeRegistry = path.join(runtimeRoot, "registry");
  const sidecars = [...new Set([...(host.runtimeSidecars || []), "bin/productize-runtime.mjs"])].sort();

  if (dryRun) {
    for (const sidecar of sidecars) {
      console.log(`RUNTIME ${path.join(repoRoot, sidecar)} -> ${path.join(runtimeBin, path.basename(sidecar))}`);
    }
    console.log(`RUNTIME ${path.join(repoRoot, "registry")} -> ${runtimeRegistry}`);
    return;
  }

  rmSync(runtimeBin, { recursive: true, force: true });
  mkdirSync(runtimeBin, { recursive: true });
  for (const sidecar of sidecars) {
    const source = path.join(repoRoot, sidecar);
    if (!existsSync(source)) fail(`Missing runtime sidecar: ${rel(source)}`);
    const destination = path.join(runtimeBin, path.basename(sidecar));
    cpSync(source, destination);
    chmodSync(destination, isExecutable(source) ? 0o700 : 0o600);
  }

  rmSync(runtimeRegistry, { recursive: true, force: true });
  cpSync(path.join(repoRoot, "registry"), runtimeRegistry, { recursive: true });
  hardenTree(runtimeRegistry);
  writeFileSync(
    path.join(runtimeRoot, "runtime.json"),
    `${JSON.stringify(
      {
        host: host.name,
        display_name: host.displayName,
        adapter_source: host.adapterSource,
        installed_at: new Date().toISOString(),
        skills_root: installRoot,
        sidecars: sidecars.map((sidecar) => path.join("bin", path.basename(sidecar))),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`Installed ${sidecars.length} runtime sidecar(s) into ${runtimeBin}`);
}

function writeCodexMarketplace(installRoot) {
  const marketplacePath = path.resolve(expandHome(getFlagValue("--marketplace") || "~/.codex/plugins/productize-skills.json"));
  const marketplace = {
    name: "productize-skills",
    interface: {
      displayName: "Productize Skills",
    },
    skills: installRoot,
  };
  if (dryRun) {
    console.log(`MARKETPLACE ${marketplacePath}`);
    return;
  }
  mkdirSync(path.dirname(marketplacePath), { recursive: true });
  writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`, "utf8");
}

function listDirs(root) {
  return existsSync(root)
    ? readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];
}

function defaultHostSkillRoot(name) {
  if (name === "codex") return "~/.codex/skills";
  if (name === "claude") return "~/.claude/skills";
  if (name === "cursor") return "~/.cursor/skills";
  if (name === "opencode") return "~/.config/opencode/skills";
  if (name === "factory") return "~/.factory/skills";
  return `~/.${name}/skills`;
}

function resolvePrefixPreference() {
  if (args.includes("--no-prefix")) {
    saveConfig("skill_prefix", false);
    return false;
  }
  if (args.includes("--prefix")) {
    saveConfig("skill_prefix", true);
    return true;
  }
  const config = readConfig();
  if (typeof config.skill_prefix === "boolean") return config.skill_prefix;
  saveConfig("skill_prefix", true);
  return true;
}

function readConfig() {
  return readJson(path.join(ensureStateDir(), "config.json"), {});
}

function saveConfig(key, value) {
  if (dryRun) return;
  if (!prefixFlagSet && key === "skill_prefix") {
    const config = readConfig();
    if (config.skill_prefix !== undefined) return;
  }
  const config = readConfig();
  config[key] = value;
  writeJson(path.join(ensureStateDir(), "config.json"), config);
}

function guardInstallRoot(installRoot, generatedRoot) {
  const blockedRoots = [
    repoRoot,
    skillsRoot,
    generatedRoot,
    path.join(repoRoot, ".agents"),
    path.join(repoRoot, ".claude"),
    path.join(repoRoot, ".cursor"),
    path.join(repoRoot, ".opencode"),
    path.join(repoRoot, ".factory"),
    path.join(repoRoot, "plugins"),
  ].map((item) => path.resolve(item));

  for (const blocked of blockedRoots) {
    if (installRoot === blocked || installRoot.startsWith(`${blocked}${path.sep}`)) {
      fail(`Refusing to install into repository-managed output path: ${installRoot}`);
    }
  }
}

function hardenTree(root) {
  if (!existsSync(root)) return;
  const stats = statSync(root);
  if (stats.isDirectory()) {
    chmodSync(root, 0o700);
    for (const entry of readdirSync(root)) hardenTree(path.join(root, entry));
  } else if (stats.isFile()) {
    chmodSync(root, isExecutable(root) ? 0o700 : 0o600);
  }
}

function isExecutable(file) {
  return Boolean(statSync(file).mode & 0o111);
}

function getFlagValue(flag) {
  const equals = args.find((arg) => arg.startsWith(`${flag}=`));
  if (equals) return equals.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function expandHome(value) {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join("/");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
