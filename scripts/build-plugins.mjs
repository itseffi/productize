import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { externalSkillName, getHost } from "../hosts/index.mjs";
import { copyDistributionTree, cleanDistributionDestination } from "./lib/distribution.mjs";
import {
  catalogRoot,
  categoryColor,
  categoryDescriptions,
  groupByCategory,
  openaiYaml,
  pluginsRoot,
  readAllSkills,
  relativePosix,
  repoRoot,
  slugify,
  writeText,
} from "./lib/productize.mjs";

const args = new Set(process.argv.slice(2));
const buildCodex = args.size === 0 || args.has("--codex");
const buildClaude = args.size === 0 || args.has("--claude");
const skills = readAllSkills();
const groups = groupByCategory(skills);
const version = readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
const codexHost = getHost("codex");
const claudeHost = getHost("claude");

if (buildCodex) {
  rmSync(pluginsRoot, { recursive: true, force: true });
  mkdirSync(pluginsRoot, { recursive: true });

  for (const [category, categoryPrompts] of groups) {
    writeCodexPlugin(category, categoryPrompts, true);
  }
  writeCodexPlugin("All", skills, false, "productize-all");
  writeCodexMarketplace(groups);
}

if (buildClaude) {
  writeClaudeMarketplace(groups);
}

writeText(
  path.join(catalogRoot, "plugins.json"),
  JSON.stringify(
    [
      ...groups.map(([category, categoryPrompts]) => ({
        name: `productize-${slugify(category, 48)}`,
        title: `Productize ${category}`,
        category,
        skill_count: categoryPrompts.length,
        description: categoryDescriptions[category] || `${category} product skills.`,
      })),
      {
        name: "productize-all",
        title: "Productize All",
        category: "All",
        skill_count: skills.length,
        description: "All Productize skills with implicit invocation disabled in the Codex plugin copy.",
      },
    ],
    null,
    2,
  ),
);

console.log(`Built ${groups.length} category plugins${buildCodex ? " plus productize-all" : ""}.`);

function writeCodexPlugin(category, categoryPrompts, allowImplicit, overrideName) {
  const pluginName = overrideName || `productize-${slugify(category, 48)}`;
  const pluginRoot = path.join(pluginsRoot, pluginName);
  const pluginSkillsRoot = path.join(pluginRoot, "skills");
  mkdirSync(pluginSkillsRoot, { recursive: true });

  for (const prompt of categoryPrompts) {
    copyGeneratedCodexSkill(prompt, pluginSkillsRoot, allowImplicit);
  }
  if (overrideName === "productize-all") {
    copyGeneratedCodexSkill(
      {
        skillName: "productize",
        title: "Productize",
        category: "Operations",
        lifecycle: "Think",
        isRoot: true,
      },
      pluginSkillsRoot,
      true,
    );
  }

  const title = overrideName === "productize-all" ? "Productize All" : `Productize ${category}`;
  const description =
    overrideName === "productize-all"
      ? "All Productize product-management and AI-builder skills. Implicit invocation is disabled in this bundle to protect context budget."
      : categoryDescriptions[category] || `${category} product skills.`;

  writeText(
    path.join(pluginRoot, ".codex-plugin", "plugin.json"),
    JSON.stringify(
      {
        name: pluginName,
        version,
        description,
        author: {
          name: "Productize AI",
        },
        license: "MIT",
        keywords: ["product", "product-management", "agent-skills", "ai-builders", slugify(category)],
        skills: "./skills/",
        interface: {
          displayName: title,
          shortDescription: description.slice(0, 96),
          longDescription: description,
          developerName: "Productize AI",
          category: "Productivity",
          capabilities: ["Interactive"],
          defaultPrompt: [
            overrideName === "productize-all"
              ? "Use an explicit Productize skill for this product task."
              : `Use a Productize ${category} skill for this task.`,
          ],
          brandColor: categoryColor(category),
        },
      },
      null,
      2,
    ),
  );
}

function writeCodexMarketplace(groupsForMarketplace) {
  const entries = [
    ...groupsForMarketplace.map(([category]) => {
      const name = `productize-${slugify(category, 48)}`;
      return {
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
    }),
    {
      name: "productize-all",
      source: {
        source: "local",
        path: "./plugins/productize-all",
      },
      policy: {
        installation: "AVAILABLE",
        authentication: "ON_INSTALL",
      },
      category: "Productivity",
    },
  ];

  writeText(
    path.join(repoRoot, ".agents", "plugins", "marketplace.json"),
    JSON.stringify(
      {
        name: "productize-agent-skills",
        version,
        metadata: {
          version,
        },
        interface: {
          displayName: "Productize AI",
        },
        plugins: entries,
      },
      null,
      2,
    ),
  );
}

function writeClaudeMarketplace(groupsForMarketplace) {
  const plugins = [
    ...groupsForMarketplace.map(([category, categoryPrompts]) => ({
      name: `productize-${slugify(category, 48)}`,
      description: categoryDescriptions[category] || `${category} product skills.`,
      source: "./",
      strict: false,
      skills: categoryPrompts.map((prompt) => generatedSkillReference(claudeHost, prompt.skillName)),
    })),
    {
      name: "productize-all",
      description: "All Productize product-management and AI-builder skills.",
      source: "./",
      strict: false,
      skills: skills.map((skill) => generatedSkillReference(claudeHost, skill.skillName)),
    },
  ];

  writeText(
    path.join(repoRoot, ".claude-plugin", "marketplace.json"),
    JSON.stringify(
      {
        name: "productize-agent-skills",
        owner: {
          name: "Productize AI",
        },
        metadata: {
          description: "Agent skills for product leaders and AI builders.",
          version,
        },
        plugins,
      },
      null,
      2,
    ),
  );
}

function copyGeneratedCodexSkill(skill, pluginSkillsRoot, allowImplicit) {
  const generatedName = externalSkillName(skill.skillName, codexHost);
  const source = path.join(repoRoot, codexHost.outputRoot, generatedName);
  if (!existsSync(path.join(source, "SKILL.md"))) {
    throw new Error(`Missing generated Codex skill: ${relativePosix(repoRoot, source)}. Run npm run skills:generate:all first.`);
  }

  const destination = path.join(pluginSkillsRoot, generatedName);
  cleanDistributionDestination(destination);
  copyDistributionTree(source, destination, { includeSkillMarkdown: true, includeAgents: true });

  const content = readFileSync(path.join(destination, "SKILL.md"), "utf8");
  writeText(
    path.join(destination, "agents", "openai.yaml"),
    openaiYaml({ ...skill, skillName: generatedName, content }, allowImplicit),
  );
}

function generatedSkillReference(host, skillName) {
  return `./${relativePosix(repoRoot, path.join(repoRoot, host.outputRoot, externalSkillName(skillName, host)))}`;
}
