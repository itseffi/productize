import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { metadataQualityIssues } from "../scripts/lib/metadata-quality.mjs";
import { readAllSkills, skillsRoot } from "../scripts/lib/productize.mjs";

const failures = [];

for (const skill of readAllSkills()) {
  const manifestPath = path.join(skillsRoot, skill.skillName, "productize.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const issues = metadataQualityIssues({ skillName: skill.skillName, manifest });
  if (issues.length) failures.push(`${skill.skillName}: ${issues.join("; ")}`);
}

assert.deepEqual(failures, [], `Metadata quality failures:\n${failures.join("\n")}`);

console.log("Metadata quality tests passed.");
