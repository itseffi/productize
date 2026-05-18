import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  categoryOrder,
  lifecycleOrder,
  pluginsRoot,
  readAllSkills,
  registryRoot,
  repoRoot,
} from "../scripts/lib/productize.mjs";

const registrySkills = readRegistry("skills.json");
const canonicalSkills = readAllSkills();
const registryNames = new Set(registrySkills.map((skill) => skill.name));
const canonicalNames = new Set(canonicalSkills.map((skill) => skill.skillName));

assert.equal(registrySkills.length, canonicalSkills.length, "registry skills count must match canonical skills");
assert.deepEqual([...registryNames].sort(), [...canonicalNames].sort(), "registry skill names must match canonical skills");

for (const skill of registrySkills) {
  assert.ok(skill.name, "skill name is required");
  assert.ok(skill.title, `${skill.name} title is required`);
  assert.ok(skill.category, `${skill.name} category is required`);
  assert.ok(skill.lifecycle, `${skill.name} lifecycle is required`);
  assert.ok(Array.isArray(skill.routing_signals) && skill.routing_signals.length > 0, `${skill.name} routing_signals are required`);
  assert.ok(Array.isArray(skill.examples) && skill.examples.length > 0, `${skill.name} examples are required`);
  assertFile(skill.source_path);
  assertFile(skill.template_path);
  assert.ok(skill.plugin?.startsWith("productize-"), `${skill.name} must name a Productize plugin`);
}

const lifecycleRegistry = readRegistry("lifecycle.json");
const lifecycleCounts = countBy(registrySkills, "lifecycle");
assert.deepEqual(lifecycleRegistry.map((entry) => entry.lifecycle), lifecycleOrder);
for (const entry of lifecycleRegistry) {
  assert.equal(entry.skill_count, lifecycleCounts.get(entry.lifecycle) || 0, `${entry.lifecycle} count mismatch`);
  assert.equal(entry.skills.length, entry.skill_count, `${entry.lifecycle} skills list count mismatch`);
}
assert.equal([...lifecycleCounts.values()].reduce((sum, count) => sum + count, 0), registrySkills.length);

const categoryRegistry = readRegistry("categories.json");
const categoryCounts = countBy(registrySkills, "category");
assert.deepEqual(categoryRegistry.map((entry) => entry.category), categoryOrder);
for (const entry of categoryRegistry) {
  assert.equal(entry.skill_count, categoryCounts.get(entry.category) || 0, `${entry.category} count mismatch`);
  assert.equal(entry.skills.length, entry.skill_count, `${entry.category} skills list count mismatch`);
}

const plugins = readRegistry("plugins.json");
const allPlugin = plugins.find((plugin) => plugin.name === "productize-all");
assert.ok(allPlugin, "productize-all plugin registry entry is required");
assert.equal(allPlugin.skill_count, registrySkills.length, "productize-all skill count must match registry");
for (const category of categoryOrder) {
  const plugin = plugins.find((entry) => entry.name === `productize-${slug(category)}`);
  assert.ok(plugin, `Missing plugin registry entry for ${category}`);
  assert.equal(plugin.skill_count, categoryCounts.get(category) || 0, `${category} plugin skill count mismatch`);
  assertFile(path.join(pluginsRoot, plugin.name, ".codex-plugin", "plugin.json"));
}

console.log("Registry tests passed.");

function readRegistry(file) {
  return JSON.parse(readFileSync(path.join(registryRoot, file), "utf8"));
}

function assertFile(relativePath) {
  const absolute = path.isAbsolute(relativePath) ? relativePath : path.join(repoRoot, relativePath);
  assert.ok(existsSync(absolute), `Missing file: ${relativePath}`);
}

function countBy(items, field) {
  const counts = new Map();
  for (const item of items) counts.set(item[field], (counts.get(item[field]) || 0) + 1);
  return counts;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
