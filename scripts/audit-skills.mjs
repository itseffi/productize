import { readAllSkills } from "./lib/productize.mjs";

const skills = readAllSkills();
const skillNames = skills.map((skill) => skill.skillName);
const duplicateSkillNames = skillNames.filter((name, index, names) => names.indexOf(name) !== index);

const categoryCounts = skills.reduce((acc, skill) => {
  acc[skill.category] = (acc[skill.category] || 0) + 1;
  return acc;
}, {});

console.log("Productize skill audit");
console.log(`- canonical skills: ${skills.length}`);
console.log(`- duplicate skill names: ${duplicateSkillNames.length}`);
console.log("");
console.log("Canonical category counts:");
for (const [category, countForCategory] of Object.entries(categoryCounts).sort()) {
  console.log(`- ${category}: ${countForCategory}`);
}

if (duplicateSkillNames.length) {
  console.log("");
  console.log("Duplicate skill names:");
  for (const name of duplicateSkillNames) console.log(`- ${name}`);
  process.exitCode = 1;
}
