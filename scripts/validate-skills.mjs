import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { externalSkillName, hosts } from "../hosts/index.mjs";
import { findDistributionInternals } from "./lib/distribution.mjs";
import { metadataQualityIssues } from "./lib/metadata-quality.mjs";
import {
  categoryOrder,
  categoryCrossLinks,
  lifecycleOrder,
  parseFrontmatter,
  pluginsRoot,
  readAllSkills,
  registryRoot,
  repoRoot,
  routeSkillForText,
  rootSkillFile,
  rootSkillTemplate,
  skillsRoot,
} from "./lib/productize.mjs";

const skills = readAllSkills();
const errors = [];
const warnings = [];
const knownCategories = new Set(categoryOrder);
const knownLifecycles = new Set(lifecycleOrder);

validateRootSkill();
validateHostAdapters();
validateCanonicalSkills();
validateRegistry();
validateGeneratedHosts();
validatePlugins();
validateRouterSamples();

if (warnings.length) {
  console.warn(`Validation warnings (${warnings.length}):`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${skills.length} skills, generated host outputs, registry, router samples, and plugin manifests.`);

function validateRootSkill() {
  if (!existsSync(rootSkillTemplate)) errors.push("Missing root skill template: SKILL.md.tmpl");
  if (!existsSync(rootSkillFile)) errors.push("Missing generated root skill: SKILL.md");
  if (existsSync(rootSkillFile)) validateSkillMarkdown(rootSkillFile, "productize");
  const rootOpenai = path.join(repoRoot, "agents", "openai.yaml");
  if (!existsSync(rootOpenai)) errors.push("Missing root OpenAI agent metadata: agents/openai.yaml");
}

function validateCanonicalSkills() {
  for (const skill of skills) {
    const skillDir = path.join(skillsRoot, skill.skillName);
    const skillFile = path.join(skillDir, "SKILL.md");
    const templateFile = path.join(skillDir, "SKILL.md.tmpl");
    const manifestFile = path.join(skillDir, "productize.json");
    const openaiFile = path.join(skillDir, "agents", "openai.yaml");

    if (!existsSync(skillFile)) {
      errors.push(`Missing skill file: ${rel(skillFile)}`);
      continue;
    }
    validateSkillMarkdown(skillFile, skill.skillName);

    if (!existsSync(templateFile)) errors.push(`Missing template: ${rel(templateFile)}`);
    else if (!readFileSync(templateFile, "utf8").includes("{{PRODUCTIZE_PREAMBLE}}")) {
      errors.push(`Template does not inject Productize preamble: ${rel(templateFile)}`);
    }

    if (!existsSync(manifestFile)) {
      errors.push(`Missing productize metadata: ${rel(manifestFile)}`);
    } else {
      validateManifest(manifestFile, skill);
    }

    if (!existsSync(openaiFile)) errors.push(`Missing openai.yaml: ${rel(openaiFile)}`);
    if (!knownCategories.has(skill.category)) errors.push(`Unknown category "${skill.category}" in ${rel(manifestFile)}`);
    if (!knownLifecycles.has(skill.lifecycle)) errors.push(`Unknown lifecycle "${skill.lifecycle}" in ${rel(manifestFile)}`);
    validateReferencedFiles(skillDir, skillFile);
  }
}

function validateHostAdapters() {
  for (const host of hosts) {
    for (const field of ["name", "displayName", "hostSubdir", "outputRoot", "frontmatter", "generatedSkillPath", "adapterSource", "configSource"]) {
      if (!host[field]) errors.push(`Host ${host.name || "(unknown)"} missing adapter field: ${field}`);
    }
    if (host.configSource !== "esm") errors.push(`Host ${host.name} must load from an ESM host config`);
    if (!host.adapterSource.endsWith(".mjs")) errors.push(`Host ${host.name} adapterSource must point to .mjs config: ${host.adapterSource}`);
    if (host.frontmatter !== "yaml") errors.push(`Unsupported frontmatter format for ${host.name}: ${host.frontmatter}`);
    if (!Array.isArray(host.pathRewrites)) errors.push(`Host ${host.name} pathRewrites must be an array`);
    if (!Array.isArray(host.toolWordingRewrites)) errors.push(`Host ${host.name} toolWordingRewrites must be an array`);
    if (!Array.isArray(host.skippedSkills)) errors.push(`Host ${host.name} skippedSkills must be an array`);
    if (!Array.isArray(host.runtimeSidecars) || host.runtimeSidecars.length === 0) {
      errors.push(`Host ${host.name} must declare runtimeSidecars`);
    } else {
      for (const sidecar of host.runtimeSidecars) {
        if (!existsSync(path.join(repoRoot, sidecar))) errors.push(`Host ${host.name} missing runtime sidecar source: ${sidecar}`);
      }
    }
    validateRewriteTuples(host, "pathRewrites");
    validateRewriteTuples(host, "toolWordingRewrites");
  }
}

function validateRewriteTuples(host, field) {
  if (!Array.isArray(host[field])) return;
  host[field].forEach((entry, index) => {
    if (!Array.isArray(entry) || entry.length !== 2 || entry.some((value) => typeof value !== "string")) {
      errors.push(`Host ${host.name} ${field}[${index}] must be a two-string tuple`);
    }
  });
}

function validateManifest(manifestFile, skill) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  } catch (error) {
    errors.push(`Invalid JSON in ${rel(manifestFile)}: ${error.message}`);
    return;
  }
  for (const field of [
    "title",
    "category",
    "lifecycle",
    "tags",
    "use_when",
    "do_not_use_when",
    "output_artifact",
    "routing_signals",
    "failure_modes",
    "framework_fit",
  ]) {
    if (manifest[field] === undefined || manifest[field] === "" || (Array.isArray(manifest[field]) && manifest[field].length === 0)) {
      errors.push(`Missing metadata field "${field}" in ${rel(manifestFile)}`);
    }
  }
  if (!Array.isArray(manifest.examples) || manifest.examples.length === 0) {
    const evalsDir = path.join(path.dirname(manifestFile), "evals");
    if (!existsSync(evalsDir)) errors.push(`Missing examples or evals for ${skill.skillName}`);
  }
  if (Array.isArray(manifest.references)) {
    for (const reference of manifest.references) {
      const refPath = path.join(path.dirname(manifestFile), reference);
      if (!existsSync(refPath)) errors.push(`Missing manifest reference ${reference} in ${rel(manifestFile)}`);
    }
  }
  for (const issue of metadataQualityIssues({ skillName: skill.skillName, manifest })) {
    errors.push(`Metadata quality issue in ${rel(manifestFile)}: ${issue}`);
  }
}

function validateSkillMarkdown(skillFile, expectedName) {
  const content = readFileSync(skillFile, "utf8");
  const frontmatter = parseFrontmatter(content);
  if (!content.startsWith("---\n")) errors.push(`Missing frontmatter: ${rel(skillFile)}`);
  if (frontmatter.name !== expectedName) errors.push(`Invalid name "${frontmatter.name || ""}" in ${rel(skillFile)}; expected ${expectedName}`);
  if (!frontmatter.description) errors.push(`Missing description: ${rel(skillFile)}`);
  if (frontmatter.description && frontmatter.description.length > 1400) {
    warnings.push(`Long canonical description in ${rel(skillFile)} (${frontmatter.description.length} chars)`);
  }
  if (content.includes("## Prompt Contract")) {
    for (const section of ["INPUTS", "GOAL", "CONSTRAINTS", "FORMAT", "FAILURE"]) {
      if (!content.includes(section)) errors.push(`Missing ${section}: ${rel(skillFile)}`);
    }
  }
}

function validateReferencedFiles(skillDir, skillFile) {
  const content = readFileSync(skillFile, "utf8");
  const referenceMatches = content.matchAll(/(?:^|[\s`"'(])((?:references|assets|scripts)\/[A-Za-z0-9._/-]+)/g);
  for (const match of referenceMatches) {
    const localPath = path.join(skillDir, match[1]);
    if (!existsSync(localPath)) errors.push(`Stale path in ${rel(skillFile)}: ${match[1]}`);
  }
}

function validateRegistry() {
  for (const file of ["skills.json", "lifecycle.json", "categories.json", "plugins.json", "site-index.json"]) {
    const fullPath = path.join(registryRoot, file);
    if (!existsSync(fullPath)) {
      errors.push(`Missing registry file: ${rel(fullPath)}`);
      continue;
    }
    try {
      JSON.parse(readFileSync(fullPath, "utf8"));
    } catch (error) {
      errors.push(`Invalid JSON in ${rel(fullPath)}: ${error.message}`);
    }
  }
  const lifecycleFile = path.join(registryRoot, "lifecycle.json");
  if (existsSync(lifecycleFile)) {
    const lifecycleRegistry = JSON.parse(readFileSync(lifecycleFile, "utf8"));
    const lifecycleNames = new Set(lifecycleRegistry.map((entry) => entry.lifecycle));
    for (const lifecycle of lifecycleOrder) {
      if (!lifecycleNames.has(lifecycle)) errors.push(`Registry lifecycle section missing: ${lifecycle}`);
    }
    const growth = lifecycleRegistry.find((entry) => entry.lifecycle === "Growth");
    if (!growth || growth.skill_count === 0) errors.push("Registry Growth lifecycle section must contain growth skills");
  }
  const skillNames = new Set(skills.map((skill) => skill.skillName));
  for (const [category, relatedSkills] of Object.entries(categoryCrossLinks)) {
    if (!knownCategories.has(category)) errors.push(`Category cross-link uses unknown category: ${category}`);
    for (const related of relatedSkills) {
      if (!skillNames.has(related.skill)) errors.push(`Category cross-link target missing: ${category} -> ${related.skill}`);
      if (!knownCategories.has(related.category)) errors.push(`Category cross-link target has unknown category: ${related.skill} -> ${related.category}`);
    }
  }
}

function validateGeneratedHosts() {
  const freshness = spawnSync(process.execPath, ["scripts/gen-skill-docs.mjs", "--host", "all", "--dry-run", "--quiet"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (freshness.status !== 0) {
    const output = `${freshness.stdout || ""}${freshness.stderr || ""}`.trim();
    errors.push(`Generated skill outputs are stale.${output ? `\n${output}` : ""}`);
  }

  for (const host of hosts) {
    const outputRoot = path.join(repoRoot, host.outputRoot);
    if (!existsSync(outputRoot)) {
      errors.push(`Missing host output root for ${host.name}: ${rel(outputRoot)}`);
      continue;
    }
    validateNoDistributionInternals(outputRoot, `${host.name} generated skills`);
    const rootSkill = path.join(outputRoot, "productize", "SKILL.md");
    if (!existsSync(rootSkill)) errors.push(`Missing root generated skill for ${host.name}: ${rel(rootSkill)}`);
    const runtimeManifest = path.join(repoRoot, host.hostSubdir, "productize-runtime.json");
    if (!existsSync(runtimeManifest)) errors.push(`Missing runtime sidecar manifest for ${host.name}: ${rel(runtimeManifest)}`);
    for (const skill of skills) {
      if ((host.skippedSkills || []).includes(skill.skillName)) continue;
      const generatedName = externalSkillName(skill.skillName, host);
      const generatedFile = path.join(outputRoot, generatedName, "SKILL.md");
      if (!existsSync(generatedFile)) {
        errors.push(`Missing generated ${host.name} skill: ${rel(generatedFile)}`);
        continue;
      }
      const generatedContent = readFileSync(generatedFile, "utf8");
      if (!generatedContent.includes("AUTO-GENERATED")) errors.push(`Generated file missing header: ${rel(generatedFile)}`);
      if (host.name === "codex") {
        const description = parseFrontmatter(generatedContent).description || "";
        if (description.length > 1024) errors.push(`Codex description exceeds 1024 chars: ${rel(generatedFile)}`);
      }
    }
  }
}

function validatePlugins() {
  if (!existsSync(pluginsRoot)) {
    errors.push(`Missing plugins root: ${rel(pluginsRoot)}`);
    return;
  }
  validateNoDistributionInternals(pluginsRoot, "Codex plugin bundles");
  for (const pluginName of readdirSync(pluginsRoot)) {
    const pluginRoot = path.join(pluginsRoot, pluginName);
    const pluginJson = path.join(pluginsRoot, pluginName, ".codex-plugin", "plugin.json");
    if (!existsSync(pluginJson)) {
      errors.push(`Missing plugin manifest: plugins/${pluginName}/.codex-plugin/plugin.json`);
      continue;
    }
    try {
      const manifest = JSON.parse(readFileSync(pluginJson, "utf8"));
      if (manifest.name !== pluginName) errors.push(`Manifest name mismatch in ${rel(pluginJson)}`);
      if (!manifest.skills) errors.push(`Missing skills path in ${rel(pluginJson)}`);
      if (!manifest.interface?.shortDescription) errors.push(`Missing interface.shortDescription in ${rel(pluginJson)}`);
    } catch (error) {
      errors.push(`Invalid JSON in ${rel(pluginJson)}: ${error.message}`);
    }
    const skillsDir = path.join(pluginRoot, "skills");
    if (!existsSync(skillsDir)) {
      errors.push(`Missing plugin skills directory: ${rel(skillsDir)}`);
      continue;
    }
    for (const skillDirName of readdirSync(skillsDir)) {
      const skillFile = path.join(skillsDir, skillDirName, "SKILL.md");
      const openaiFile = path.join(skillsDir, skillDirName, "agents", "openai.yaml");
      if (!existsSync(skillFile)) {
        errors.push(`Missing plugin skill file: ${rel(skillFile)}`);
        continue;
      }
      if (skillDirName !== "productize" && !skillDirName.startsWith("productize-")) {
        errors.push(`Codex plugin skill must use generated productize-* name: ${rel(path.join(skillsDir, skillDirName))}`);
      }
      const frontmatter = parseFrontmatter(readFileSync(skillFile, "utf8"));
      if (frontmatter.name !== skillDirName) {
        errors.push(`Plugin skill name mismatch in ${rel(skillFile)}: ${frontmatter.name || "(missing)"} != ${skillDirName}`);
      }
      if ((frontmatter.description || "").length > 1024) {
        errors.push(`Plugin Codex description exceeds 1024 chars: ${rel(skillFile)}`);
      }
      if (!existsSync(openaiFile)) errors.push(`Missing plugin OpenAI metadata: ${rel(openaiFile)}`);
    }
  }
}

function validateNoDistributionInternals(root, label) {
  for (const item of findDistributionInternals(root)) {
    errors.push(`${label} includes ${item.reason}: ${rel(path.join(root, item.path))}`);
  }
}

function validateRouterSamples() {
  const samples = [
    ["I have an idea for a new product", ["Think", "Strategize", "Discover"]],
    ["I need positioning and growth strategy", ["Strategize", "Growth"]],
    ["I need a PRD or spec", ["Plan", "Build With AI"]],
    ["I need user research", ["Discover"]],
    ["I need metrics and PMF", ["Measure"]],
    ["I need to build with AI agents", ["Build With AI", "Plan"]],
    ["I need stakeholder material for execs", ["Align"]],
  ];
  for (const [query, expectedLifecycles] of samples) {
    const routes = routeSkillForText(query, skills, 5);
    if (!routes.length) {
      errors.push(`Router returned no result for sample query: ${query}`);
      continue;
    }
    if (!routes.some((route) => expectedLifecycles.includes(route.skill.lifecycle))) {
      errors.push(
        `Router missed expected lifecycle for "${query}". Got: ${routes
          .map((route) => `${route.skill.skillName}/${route.skill.lifecycle}`)
          .join(", ")}`,
      );
    }
  }
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join("/");
}
