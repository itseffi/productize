import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pluginsRoot, readAllSkills, registryRoot, repoRoot } from "./lib/productize.mjs";

const version = readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));

assert.match(version, /^\d+\.\d+\.\d+(-[A-Za-z0-9.-]+)?$/, "VERSION must be semver");
assert.equal(packageJson.version, version, "package.json version must match VERSION");

for (const file of ["CHANGELOG.md", "RELEASE.md", "UPGRADE.md"]) {
  assert.ok(existsSync(path.join(repoRoot, file)), `Missing release file: ${file}`);
}

const changelog = readFileSync(path.join(repoRoot, "CHANGELOG.md"), "utf8");
assert.match(changelog, new RegExp(`## ${escapeRegex(version)}`), "CHANGELOG must include current VERSION");

for (const registryFile of ["skills.json", "lifecycle.json", "categories.json", "plugins.json", "site-index.json"]) {
  assert.ok(existsSync(path.join(registryRoot, registryFile)), `Missing registry file: ${registryFile}`);
}

const skills = readAllSkills();
assert.ok(skills.length > 0, "No skills found");

for (const pluginName of readdirSync(pluginsRoot)) {
  const pluginManifest = path.join(pluginsRoot, pluginName, ".codex-plugin", "plugin.json");
  assert.ok(existsSync(pluginManifest), `Missing plugin manifest: ${pluginName}`);
  const manifest = JSON.parse(readFileSync(pluginManifest, "utf8"));
  assert.equal(manifest.version, version, `${pluginName} plugin version must match VERSION`);
}

const codexMarketplace = path.join(repoRoot, ".agents", "plugins", "marketplace.json");
assert.ok(existsSync(codexMarketplace), "Missing Codex marketplace index");
const codexMarketplaceJson = JSON.parse(readFileSync(codexMarketplace, "utf8"));
assert.equal(codexMarketplaceJson.version, version, "Codex marketplace version must match VERSION");
assert.equal(codexMarketplaceJson.metadata?.version, version, "Codex marketplace metadata.version must match VERSION");

const claudeMarketplace = path.join(repoRoot, ".claude-plugin", "marketplace.json");
assert.ok(existsSync(claudeMarketplace), "Missing Claude marketplace index");
const claudeMarketplaceJson = JSON.parse(readFileSync(claudeMarketplace, "utf8"));
assert.equal(claudeMarketplaceJson.metadata?.version, version, "Claude marketplace metadata.version must match VERSION");

console.log(`Release check passed for Productize ${version}.`);

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
