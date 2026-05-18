import path from "node:path";
import {
  categoryDescriptions,
  categoryCrossLinks,
  groupByCategory,
  groupByLifecycle,
  lifecycleDescriptions,
  readAllSkills,
  registryRoot,
  writeText,
} from "./lib/productize.mjs";

const skills = readAllSkills();
const groups = groupByCategory(skills);

writeText(
  path.join(registryRoot, "site-index.json"),
  JSON.stringify(
    {
      name: "Productize AI",
      tagline: "Agent skills for turning product ambiguity into shipped work.",
      counts: {
        skills: skills.length,
        category_plugins: groups.length,
      },
      navigation: ["Skills", "Plugins", "MCPs", "Guides", "Contributors"],
      categories: groups.map(([category, categoryPrompts]) => ({
        category,
        description: categoryDescriptions[category] || `${category} product skills.`,
        skill_count: categoryPrompts.length,
        related_skills: categoryCrossLinks[category] || [],
        skills: categoryPrompts.map((prompt) => ({
          name: prompt.skillName,
          title: prompt.title,
          tags: prompt.tags,
          lifecycle: prompt.lifecycle,
        })),
      })),
      lifecycle: groupByLifecycle(skills).map(([lifecycle, lifecycleSkills]) => ({
        lifecycle,
        description: lifecycleDescriptions[lifecycle] || `${lifecycle} product work.`,
        skill_count: lifecycleSkills.length,
        skills: lifecycleSkills.map((skill) => ({
          name: skill.skillName,
          title: skill.title,
          output_artifact: skill.outputArtifact,
        })),
      })),
      mcps: [
        { name: "GitHub", use: "Issues, PRDs, code reviews, implementation tasks, and release workflows." },
        { name: "Linear or Jira", use: "Roadmaps, prioritization, issue creation, and delivery tracking." },
        { name: "Figma", use: "Design assets, UI analysis, prototyping, and acceptance criteria." },
        { name: "Notion or Google Drive", use: "Research repositories, docs, PRDs, and meeting notes." },
        { name: "Slack or Gmail", use: "Stakeholder communication, meeting prep, and executive updates." },
        { name: "PostHog, Amplitude, or Mixpanel", use: "Product analytics, funnels, retention, and experiments." },
        { name: "BigQuery or Snowflake", use: "SQL analysis, metric diagnosis, event schemas, and impact sizing." },
      ],
    },
    null,
    2,
  ),
);

console.log(`Wrote Lawve-style site index for ${skills.length} skills.`);
