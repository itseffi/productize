import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { externalSkillName, getHost, hosts } from "../hosts/index.mjs";
import { copyDistributionTree } from "./lib/distribution.mjs";
import {
  cleanScalar,
  ensureCleanDir,
  generatedHeader,
  insertGeneratedHeader,
  normalizeCategory,
  openaiYaml,
  parseFrontmatter,
  readAllSkills,
  readJson,
  readRootSkill,
  renderTemplate,
  repoRoot,
  rootSkillFile,
  rootSkillTemplate,
  shortDescription,
  skillsRoot,
  stripGeneratedHeader,
  titleCaseFromSlug,
  writeText,
} from "./lib/productize.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const quiet = args.includes("--quiet");
const hostArg = getFlagValue("--host") || "canonical";
const hostsToGenerate =
  hostArg === "all" ? ["canonical", ...hosts.map((host) => host.name)] : [hostArg];

let stale = false;

for (const hostName of hostsToGenerate) {
  if (hostName === "canonical") {
    generateCanonical();
  } else {
    generateHost(getHost(hostName));
  }
}

if (dryRun && stale) {
  process.exitCode = 1;
}

function generateCanonical() {
  const skills = readAllSkills();
  const rootSkill = {
    skillName: "productize",
    title: "Productize",
    category: "Operations",
    lifecycle: "Think",
    outputArtifact: "Routed Productize workflow",
    tags: ["productize", "router", "product-operating-system"],
    isRoot: true,
  };
  if (existsSync(rootSkillTemplate)) {
    const renderedRoot = insertGeneratedHeader(renderTemplate(readFileSync(rootSkillTemplate, "utf8"), rootSkill));
    writeGenerated(rootSkillFile, renderedRoot);
    if (!dryRun) writeText(path.join(repoRoot, "agents", "openai.yaml"), openaiYaml({ ...rootSkill, content: renderedRoot }, true));
  }

  for (const dirName of skillDirs()) {
    const skillDir = path.join(skillsRoot, dirName);
    const template = path.join(skillDir, "SKILL.md.tmpl");
    if (!existsSync(template)) continue;
    const skill = canonicalSkillFor(dirName, skills);
    const output = path.join(skillDir, "SKILL.md");
    const rendered = insertGeneratedHeader(renderTemplate(readFileSync(template, "utf8"), skill));
    writeGenerated(output, rendered);
    if (!dryRun) writeText(path.join(skillDir, "agents", "openai.yaml"), openaiYaml({ ...skill, content: rendered }, true));
  }
}

function generateHost(host) {
  const outRoot = path.join(repoRoot, host.outputRoot);
  if (!dryRun) ensureCleanDir(outRoot);
  writeHostRuntimeManifest(host);

  const rootSkill = readRootSkill() || {
    skillName: "productize",
    title: "Productize",
    category: "Operations",
    lifecycle: "Think",
    outputArtifact: "Routed Productize workflow",
    tags: ["productize"],
    content: existsSync(rootSkillFile) ? readFileSync(rootSkillFile, "utf8") : "",
    isRoot: true,
  };
  writeHostSkill(host, rootSkill, repoRoot);

  for (const skill of readAllSkills()) {
    if ((host.skippedSkills || []).includes(skill.skillName)) continue;
    writeHostSkill(host, skill, path.join(skillsRoot, skill.skillName));
  }
}

function writeHostSkill(host, skill, sourceDir) {
  const name = externalSkillName(skill.skillName, host);
  const outputDir = path.join(repoRoot, host.outputRoot, name);
  if (!dryRun) mkdirSync(outputDir, { recursive: true });

  const templateFile = skill.isRoot ? rootSkillTemplate : path.join(sourceDir, "SKILL.md.tmpl");
  const sourceContent = existsSync(templateFile)
    ? renderTemplate(readFileSync(templateFile, "utf8"), skill)
    : stripGeneratedHeader(skill.content);
  let content = transformForHost(insertGeneratedHeader(sourceContent), host, name);

  for (const [from, to] of host.pathRewrites || []) {
    content = content.replaceAll(from, to);
  }

  writeGenerated(path.join(outputDir, "SKILL.md"), content);
  if (!dryRun && path.resolve(sourceDir) !== path.resolve(repoRoot)) {
    copyDistributionTree(sourceDir, outputDir, { includeSkillMarkdown: false, includeAgents: false });
  }

  if (!dryRun && host.generateOpenAI) {
    writeText(path.join(outputDir, "agents", "openai.yaml"), openaiYaml({ ...skill, skillName: name, content }, true));
  }
}

function transformForHost(content, host, name) {
  if (host.frontmatter && host.frontmatter !== "yaml") {
    throw new Error(`Unsupported frontmatter format "${host.frontmatter}" for host ${host.name}`);
  }

  const frontmatter = parseFrontmatter(content);
  let description = cleanScalar(frontmatter.description || shortDescription({ title: name, content }));
  if (host.descriptionLimit && description.length > host.descriptionLimit) {
    description = `${description.slice(0, host.descriptionLimit - 3).replace(/\s+\S*$/, "")}...`;
  }

  const fmStart = content.indexOf("---\n");
  const fmEnd = content.indexOf("\n---", 4);
  const body = fmStart === 0 && fmEnd !== -1 ? content.slice(fmEnd + 4).replace(/^\n+/, "") : content;
  let output = `---\nname: ${name}\ndescription: >-\n${foldYaml(description)}\n---\n${generatedHeader()}\n${stripGeneratedHeader(body).replace(/^\n+/, "")}`;
  for (const [from, to] of host.toolWordingRewrites || []) {
    output = output.replaceAll(from, to);
  }
  return output;
}

function writeHostRuntimeManifest(host) {
  const sidecars = [...new Set([...(host.runtimeSidecars || []), "bin/productize-runtime.mjs"])]
    .sort()
    .map((source) => ({
      source,
      install_name: path.basename(source),
    }));
  const manifest = {
    generated: true,
    host: host.name,
    display_name: host.displayName,
    adapter_source: host.adapterSource,
    generated_skill_path: host.generatedSkillPath,
    sidecars,
  };
  writeGenerated(path.join(repoRoot, host.hostSubdir, "productize-runtime.json"), JSON.stringify(manifest, null, 2));
}

function foldYaml(text) {
  const words = String(text).replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > 92) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines.map((item) => `  ${item}`).join("\n");
}

function writeGenerated(file, content) {
  if (dryRun) {
    const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
    if (existing !== `${content.endsWith("\n") ? content : `${content}\n`}`) {
      console.log(`STALE: ${path.relative(repoRoot, file)}`);
      stale = true;
    } else if (!quiet) {
      console.log(`FRESH: ${path.relative(repoRoot, file)}`);
    }
    return;
  }
  writeText(file, content);
  if (!quiet) console.log(`GENERATED: ${path.relative(repoRoot, file)}`);
}

function canonicalSkillFor(dirName, skills) {
  const existing = skills.find((item) => item.skillName === dirName);
  if (existing) return existing;

  const manifest = readJson(path.join(skillsRoot, dirName, "productize.json"), {});
  return {
    skillName: dirName,
    title: cleanScalar(manifest.title || titleCaseFromSlug(dirName)),
    category: normalizeCategory(manifest.category || "Strategy"),
    lifecycle: cleanScalar(manifest.lifecycle || "Think"),
    outputArtifact: cleanScalar(manifest.output_artifact || "Product work artifact"),
    tags: Array.isArray(manifest.tags) ? manifest.tags.map(cleanScalar).filter(Boolean) : [],
    allowImplicitInvocation:
      typeof manifest.allow_implicit_invocation === "boolean" ? manifest.allow_implicit_invocation : undefined,
  };
}

function skillDirs() {
  if (!existsSync(skillsRoot)) return [];
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function getFlagValue(flag) {
  const equals = args.find((arg) => arg.startsWith(`${flag}=`));
  if (equals) return equals.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}
