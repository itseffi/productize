import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { hosts } from "../hosts/index.mjs";
import { route as runtimeRoute } from "../bin/productize-runtime.mjs";
import {
  generatedHeader,
  groupByLifecycle,
  lifecycleOrder,
  parseFrontmatter,
  readAllSkills,
  renderTemplate,
  repoRoot,
  routeSkillForText,
  stripGeneratedHeader,
} from "./lib/productize.mjs";

testFrontmatterParser();
testGeneratedHeaderRoundTrip();
testTemplatePreambleInjection();
testHostAdapterImports();
testLifecycleRegistryCoverage();
testRouterGrowthCase();
testRoutingIsShared();

console.log("Skill parser tests passed.");

function testFrontmatterParser() {
  const parsed = parseFrontmatter(`---\nname: sample\ndescription: >-\n  First line\n  second line\n---\n# Body\n`);
  assert.equal(parsed.name, "sample");
  assert.equal(parsed.description, "First line second line");
}

function testGeneratedHeaderRoundTrip() {
  const source = `---\nname: demo\ndescription: Demo.\n---\n${generatedHeader("SKILL.md.tmpl")}\n# Demo\n`;
  assert.equal(stripGeneratedHeader(source).includes("AUTO-GENERATED"), false);
}

function testTemplatePreambleInjection() {
  const template = readFileSync(path.join(repoRoot, "SKILL.md.tmpl"), "utf8");
  const rendered = renderTemplate(template, {
    skillName: "productize",
    lifecycle: "Think",
    category: "Operations",
    outputArtifact: "Routed Productize workflow",
  });
  assert.match(rendered, /## Productize Preamble/);
  assert.match(rendered, /AskUserQuestion:/);
  assert.match(rendered, /productize-workflow start/);
  assert.match(rendered, /productize-completion-status/);
}

function testHostAdapterImports() {
  const codex = hosts.find((host) => host.name === "codex");
  assert.ok(codex, "codex host should load from hosts/codex.mjs");
  assert.equal(codex.adapterSource, "hosts/codex.mjs");
  assert.equal(codex.configSource, "esm");
  assert.equal(codex.frontmatter, "yaml");
  assert.equal(codex.descriptionLimit, 1024);
  assert.ok(codex.runtimeSidecars.includes("bin/productize-skill-router"));
  assert.ok(codex.runtimeSidecars.includes("bin/productize-workflow"));
  assert.ok(Array.isArray(codex.toolWordingRewrites));
  assert.ok(codex.toolWordingRewrites.some(([from, to]) => from === "Claude" && to === "Codex"));
}

function testLifecycleRegistryCoverage() {
  const grouped = groupByLifecycle(readAllSkills());
  const names = grouped.map(([name]) => name);
  for (const lifecycle of lifecycleOrder) {
    assert.ok(names.includes(lifecycle), `missing lifecycle group: ${lifecycle}`);
  }
}

function testRouterGrowthCase() {
  const skills = readAllSkills();
  const routes = routeSkillForText("I need growth activation retention and onboarding strategy", skills, 8);
  assert.ok(routes.some((route) => route.skill.lifecycle === "Growth"), "growth query should route to Growth");
  assert.ok(existsSync(path.join(repoRoot, "skills", "metrics-review", "productize.json")));
}

function testRoutingIsShared() {
  const runtimeSource = readFileSync(path.join(repoRoot, "bin", "productize-runtime.mjs"), "utf8");
  const buildSource = readFileSync(path.join(repoRoot, "scripts", "lib", "productize.mjs"), "utf8");
  assert.doesNotMatch(runtimeSource, /function\s+(scoreSkill|lifecycleBoost|directSkillBoost)\b/);
  assert.doesNotMatch(buildSource, /const\s+(intentBoosts|skillIntentBoosts)\s*=\s*\[/);
  const buildTop = routeSkillForText("Is this PMF?", readAllSkills(), 1)[0]?.skill.skillName;
  const runtimeTop = runtimeRoute("Is this PMF?", 1)[0]?.skill.name;
  assert.equal(buildTop, "product-market-fit-cycle");
  assert.equal(runtimeTop, buildTop);
}
