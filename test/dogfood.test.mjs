import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { routeProductizeSkills } from "../bin/productize-routing.mjs";
import { readAllSkills, repoRoot, skillsRoot } from "../scripts/lib/productize.mjs";

const dogfoodDir = path.join(skillsRoot, "dogfood");
const templatePath = path.join(dogfoodDir, "SKILL.md.tmpl");
const manifestPath = path.join(dogfoodDir, "productize.json");
const taxonomyPath = path.join(dogfoodDir, "references", "issue-taxonomy.md");
const reportTemplatePath = path.join(dogfoodDir, "templates", "dogfood-report-template.md");

for (const file of [templatePath, manifestPath, taxonomyPath, reportTemplatePath]) {
  assert.ok(existsSync(file), `Missing dogfood file: ${path.relative(repoRoot, file)}`);
}

const skillTemplate = readFileSync(templatePath, "utf8");
assert.match(skillTemplate, /Check the console after every navigation and every significant interaction/);
assert.match(skillTemplate, /Screenshots\/Evidence/);
assert.match(skillTemplate, /Pages Tested/);
assert.match(skillTemplate, /Flows Tested/);
assert.match(skillTemplate, /Severity Table/);
assert.match(skillTemplate, /Blockers/);

const taxonomy = readFileSync(taxonomyPath, "utf8");
for (const severity of ["P0", "P1", "P2", "P3"]) {
  assert.match(taxonomy, new RegExp(`\\b${severity}\\b`), `taxonomy should define ${severity}`);
}
for (const category of ["Functional", "Visual", "Accessibility", "Console", "UX", "Content", "Performance", "Data"]) {
  assert.match(taxonomy, new RegExp(`### ${category}\\b`), `taxonomy should define ${category}`);
}

const reportTemplate = readFileSync(reportTemplatePath, "utf8");
for (const section of [
  "Pages Tested",
  "Flows Tested",
  "Console Errors",
  "Screenshots / Evidence",
  "Severity Table",
  "Blockers",
]) {
  assert.match(reportTemplate, new RegExp(section.replace("/", "\\/")), `report template should include ${section}`);
}

const qaTemplate = readFileSync(path.join(skillsRoot, "qa", "SKILL.md.tmpl"), "utf8");
const releaseTemplate = readFileSync(path.join(skillsRoot, "release", "SKILL.md.tmpl"), "utf8");
const operateTemplate = readFileSync(path.join(skillsRoot, "operate", "SKILL.md.tmpl"), "utf8");
assert.match(qaTemplate, /\$dogfood/);
assert.match(releaseTemplate, /\$dogfood/);
assert.match(operateTemplate, /\$dogfood/);

const routes = routeProductizeSkills(
  "Dogfood this local web app and test http://localhost:3000 end-to-end with screenshots and console checks.",
  readAllSkills(),
  5,
);
assert.equal(routes[0]?.skill.skillName, "dogfood");

console.log("Dogfood skill tests passed.");
