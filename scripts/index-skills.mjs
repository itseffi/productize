import path from "node:path";
import {
  groupByCategory,
  groupByLifecycle,
  categoryCrossLinks,
  categoryDescriptions,
  lifecycleDescriptions,
  registryRoot,
  skillRegistryRecord,
  ensureCleanDir,
  readAllSkills,
  writeText,
} from "./lib/productize.mjs";

const skills = readAllSkills();

ensureCleanDir(registryRoot);

writeText(
  path.join(registryRoot, "skills.json"),
  JSON.stringify(
    skills.map(skillRegistryRecord),
    null,
    2,
  ),
);

writeText(
  path.join(registryRoot, "lifecycle.json"),
  JSON.stringify(
    groupByLifecycle(skills).map(([lifecycle, lifecycleSkills]) => ({
      lifecycle,
      description: lifecycleDescriptions[lifecycle] || `${lifecycle} product work.`,
      skill_count: lifecycleSkills.length,
      skills: lifecycleSkills.map((skill) => skill.skillName),
    })),
    null,
    2,
  ),
);

writeText(
  path.join(registryRoot, "categories.json"),
  JSON.stringify(
    groupByCategory(skills).map(([category, categorySkills]) => ({
      category,
      description: categoryDescriptions[category] || `${category} product skills.`,
      skill_count: categorySkills.length,
      skills: categorySkills.map((skill) => skill.skillName),
      related_skills: categoryCrossLinks[category] || [],
    })),
    null,
    2,
  ),
);

console.log(`Indexed ${skills.length} canonical skills from skills`);
