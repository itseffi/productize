import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  categoryOrder,
  cleanScalar,
  inferLifecycle,
  inferOutputArtifact,
  normalizeCategory,
  parseFrontmatter,
  repoRoot,
  shortDescription,
  skillsRoot,
  stripGeneratedHeader,
  titleCaseFromSlug,
  writeText,
} from "./lib/productize.mjs";
import {
  isGenericMetadataText,
  isSpecificArtifact,
  specificDoNotUseWhen,
  specificExample,
  specificFailureModes,
  specificFrameworkFit,
  specificOutputArtifact,
} from "./lib/metadata-quality.mjs";

const changed = [];
const stopWords = new Set([
  "and",
  "for",
  "from",
  "into",
  "the",
  "this",
  "that",
  "with",
  "when",
  "user",
  "users",
  "product",
  "products",
  "using",
  "based",
  "related",
  "skill",
  "skills",
  "analysis",
  "strategy",
]);

for (const dirName of skillDirs()) {
  const skillDir = path.join(skillsRoot, dirName);
  const skillFile = path.join(skillDir, "SKILL.md");
  if (!existsSync(skillFile)) continue;

  const source = readFileSync(skillFile, "utf8");
  const manifestPath = path.join(skillDir, "productize.json");
  const existingManifest = readJson(manifestPath, {});
  const frontmatter = parseFrontmatter(source);
  const skillName = cleanScalar(frontmatter.name || dirName);
  const title = cleanScalar(existingManifest.title || firstHeading(source) || titleCaseFromSlug(skillName));
  const category = normalizeCategory(existingManifest.category || inferCategory({ skillName, title, description: frontmatter.description }));
  const tags = normalizeTags(existingManifest.tags, { skillName, title, category, description: frontmatter.description });
  const lifecycle = cleanScalar(existingManifest.lifecycle || inferLifecycle({ skillName, title, category, tags }));
  const inferredOutputArtifact = cleanScalar(existingManifest.output_artifact || inferOutputArtifact({ title, category, lifecycle }));
  const outputArtifact = isSpecificArtifact(inferredOutputArtifact)
    ? inferredOutputArtifact
    : specificOutputArtifact({ title, category, lifecycle });
  const routingSignals = normalizeTags(existingManifest.routing_signals, {
    skillName,
    title,
    category,
    description: `${frontmatter.description || ""} ${tags.join(" ")}`,
  });
  const references = collectOptionalReferences(skillDir);

  const manifest = {
    ...existingManifest,
    title,
    category,
    lifecycle,
    tags,
    use_when: specificUseWhen(existingManifest.use_when, { title, lifecycle, category, outputArtifact, description: frontmatter.description }),
    do_not_use_when: specificDoNotUseWhenField(existingManifest.do_not_use_when, { title, category, lifecycle }),
    output_artifact: outputArtifact,
    routing_signals: routingSignals,
    framework_fit: specificFrameworkFitField(existingManifest.framework_fit, { title, category, lifecycle, outputArtifact }),
    failure_modes: specificFailureModesField(existingManifest.failure_modes, { title, category, lifecycle, outputArtifact }),
    examples: specificExamplesField(existingManifest.examples, { skillName, title, outputArtifact, routingSignals }),
  };
  if (references.length) manifest.references = references;

  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  if (!existsSync(manifestPath) || readFileSync(manifestPath, "utf8") !== manifestText) {
    writeText(manifestPath, manifestText);
    changed.push(path.relative(repoRoot, manifestPath));
  }

  const templatePath = path.join(skillDir, "SKILL.md.tmpl");
  const templateSource = existsSync(templatePath) ? readFileSync(templatePath, "utf8") : source;
  const template = normalizeTemplate(templateSource);
  if (!existsSync(templatePath) || readFileSync(templatePath, "utf8") !== template) {
    writeText(templatePath, template);
    changed.push(path.relative(repoRoot, templatePath));
  }
}

function specificUseWhen(existing, { title, lifecycle, category, outputArtifact, description }) {
  const value = cleanScalar(existing);
  if (value && !isGenericMetadataText(value) && value.length >= 70) return value;
  const source = cleanScalar(description);
  if (source && !isGenericMetadataText(source) && source.length >= 70) return source;
  return `Use ${title} when the user needs ${outputArtifact} for ${category} work in the ${lifecycle} lifecycle. Best when the request includes product context, evidence, constraints, and a decision that must become an actionable artifact.`;
}

function specificDoNotUseWhenField(existing, context) {
  const value = cleanScalar(existing);
  if (value && !isGenericMetadataText(value) && value.length >= 70) return value;
  return specificDoNotUseWhen(context);
}

function specificFrameworkFitField(existing, context) {
  const value = cleanScalar(existing);
  if (value && !isGenericMetadataText(value) && value.length >= 70) return value;
  return specificFrameworkFit(context);
}

function specificFailureModesField(existing, context) {
  if (Array.isArray(existing) && existing.length >= 3 && existing.every((item) => !isGenericMetadataText(item) && cleanScalar(item).length >= 55)) {
    return existing;
  }
  return specificFailureModes(context);
}

function specificExamplesField(existing, context) {
  if (
    Array.isArray(existing) &&
    existing.length &&
    existing.every((item) => !isGenericMetadataText(item?.prompt) && isSpecificArtifact(item?.expected_artifact))
  ) {
    return existing;
  }
  return [specificExample(context)];
}

if (changed.length) {
  console.log(`Normalized ${changed.length} skill file(s).`);
  for (const file of changed.slice(0, 30)) console.log(`- ${file}`);
  if (changed.length > 30) console.log(`- ... ${changed.length - 30} more`);
} else {
  console.log("All skills already normalized.");
}

function skillDirs() {
  if (!existsSync(skillsRoot)) return [];
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function firstHeading(content) {
  const match = String(content).match(/^#\s+(.+)$/m);
  return match ? cleanScalar(match[1]) : "";
}

function inferCategory({ skillName, title, description }) {
  const haystack = `${skillName} ${title} ${description || ""}`.toLowerCase();
  for (const category of categoryOrder) {
    const normalized = category.toLowerCase();
    if (haystack.includes(normalized)) return category;
  }
  if (/(valuation|deal pricing|enterprise value|equity value|price per share|dcf|discounted cash flow|\bnpv\b|\birr\b|\bwacc\b|\bcapm\b|cost of capital|beta|risk-free|risk free|free cash flow|terminal value|capital structure|\bapv\b|tax shield|bond price|yield to maturity|venture capital|vc method|pre-money|post-money|cap table|dilution|convertible note|\bsafe\b|preferred stock|liquidation preference|option pool|market cap|index weight|public comparables)/.test(haystack)) return "Finance";
  if (/(growth|plg|pql|activation|retention|expansion|gtm|go-to-market|growth loop|lifecycle|onboarding|churn|cac|ltv|pmf)/.test(haystack)) return "Growth";
  if (/(metric|dashboard|sql|data|analytics|experiment|ab test|cohort|nps|statistics|instrumentation)/.test(haystack)) return "Analytics";
  if (/(research|interview|jtbd|persona|survey|customer|assumption|opportunity solution|opportunity-solution|idea|brainstorm|creative|ideation)/.test(haystack)) return "Discovery";
  if (/(business model|canvas|revenue|pricing|monetization|packaging|value capture|platform economics)/.test(haystack)) return "Business Model";
  if (/(venture|startup|beachhead|market sizing|tam|sam|som|wedge|0-to-1|founder)/.test(haystack)) return "Venture / 0-1";
  if (/(decision making|strategic decision|decision quality|bounded rational|heuristic|bias|groupthink|group polarization|conformity|authority bias|role identity|organizational identity|logic of appropriateness)/.test(haystack)) return "Decision Making";
  if (/(design|prototype|ux|ui|wireframe|accessibility|figma)/.test(haystack)) return "Design";
  if (/(prd|requirement|roadmap|sprint|qa|test scenario|backlog|acceptance|release|launch|delivery|project plan|scope)/.test(haystack)) return "Delivery";
  if (/(stakeholder|executive|communication|deck|presentation|narrative|update|influence|meeting|brief)/.test(haystack)) return "Stakeholder Communication";
  if (/(technical|architecture|backend|frontend|debug|agent|ai coding|handoff|verification|tdd)/.test(haystack)) return "AI Execution";
  if (/(brand|positioning|copy|campaign|battlecard|message|market orientation|marketing)/.test(haystack)) return "Marketing";
  if (/(decision rights|davci|governance|operating|policy|workflow|ritual|team)/.test(haystack)) return "Operations";
  if (/(prioriti|root cause|reversib|strategy|competitive|market|moat|okr|swot|crux)/.test(haystack)) return "Strategy";
  return "Strategy";
}

function normalizeTags(existing, { skillName, title, category, description }) {
  const raw = Array.isArray(existing) ? existing : [];
  const words = `${skillName} ${title} ${category} ${description || ""}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
  const tags = [...raw, skillName, ...words.slice(0, 10)]
    .map((tag) => cleanScalar(tag).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean);
  return [...new Set(tags)].slice(0, 14);
}

function collectOptionalReferences(skillDir) {
  const refs = [];
  for (const dirname of ["references", "assets", "scripts", "examples", "evals"]) {
    const full = path.join(skillDir, dirname);
    if (!existsSync(full)) continue;
    for (const entry of readdirSync(full, { withFileTypes: true })) {
      if (entry.isFile()) refs.push(`${dirname}/${entry.name}`);
    }
  }
  return refs.sort();
}

function normalizeTemplate(content) {
  let template = stripGeneratedHeader(content).replace(/\r\n/g, "\n").trimEnd();
  template = removeRenderedPreamble(template);
  if (template.includes("{{PRODUCTIZE_PREAMBLE}}")) return `${template}\n`;

  const frontmatterEnd = template.startsWith("---\n") ? template.indexOf("\n---", 4) : -1;
  const bodyStart = frontmatterEnd === -1 ? 0 : template.indexOf("\n", frontmatterEnd + 1) + 1;
  const beforeBody = template.slice(0, bodyStart);
  const body = template.slice(bodyStart).replace(/^\n+/, "");
  const heading = body.match(/^#\s+.+$/m);
  if (!heading || heading.index === undefined) {
    return `${beforeBody}\n{{PRODUCTIZE_PREAMBLE}}\n\n${body}`.replace(/\n{4,}/g, "\n\n\n").trimEnd() + "\n";
  }
  const headingEnd = heading.index + heading[0].length;
  return `${beforeBody}${body.slice(0, headingEnd)}\n\n{{PRODUCTIZE_PREAMBLE}}\n\n${body.slice(headingEnd).replace(/^\n+/, "")}`
    .replace(/\n{4,}/g, "\n\n\n")
    .trimEnd() + "\n";
}

function removeRenderedPreamble(content) {
  return String(content)
    .replace(/\n## Productize Preamble\n[\s\S]*?(?=\n## |\n# |$)/, "\n")
    .replace(/\n{3,}/g, "\n\n");
}
