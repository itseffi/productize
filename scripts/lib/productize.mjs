import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { routeProductizeSkills, scoreProductizeSkill } from "../../bin/productize-routing.mjs";

export const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);
export const skillsRoot = path.join(repoRoot, "skills");
export const pluginsRoot = path.join(repoRoot, "plugins");
export const registryRoot = path.join(repoRoot, "registry");
export const catalogRoot = registryRoot;
export const rootSkillFile = path.join(repoRoot, "SKILL.md");
export const rootSkillTemplate = path.join(repoRoot, "SKILL.md.tmpl");

export const categoryAliases = new Map([
  ["Business Analysis", "Analytics"],
  ["Business Model Innovation", "Business Model"],
  ["Communication & Influence", "Stakeholder Communication"],
  ["Data & Reporting", "Analytics"],
  ["Design & Prototyping", "Design"],
  ["Ideation & Creativity", "Discovery"],
  ["Marketing Strategy", "Marketing"],
  ["Corporate Finance", "Finance"],
  ["Deal Pricing", "Finance"],
  ["Financial Modeling", "Finance"],
  ["Valuation", "Finance"],
  ["Presentation & Communication", "Stakeholder Communication"],
  ["Product Strategy", "Strategy"],
  ["Project Management", "Delivery"],
  ["Stakeholder Management", "Stakeholder Communication"],
  ["Technical", "AI Execution"],
  ["User Research", "Discovery"],
  ["Venture Strategy", "Venture / 0-1"],
]);

export const categoryOrder = [
  "Discovery",
  "Strategy",
  "Decision Making",
  "Growth",
  "Analytics",
  "Finance",
  "Delivery",
  "Design",
  "Marketing",
  "Operations",
  "Stakeholder Communication",
  "AI Execution",
  "Business Model",
  "Venture / 0-1",
];

export const categoryDescriptions = {
  Discovery: "Product learning, qualitative research, JTBD, assumptions, opportunity mapping, ideation, personas, and synthesis.",
  Strategy: "Positioning, market structure, moats, prioritization logic, roadmaps, OKRs, competitive choices, and strategic decisions.",
  "Decision Making": "Strategic decision quality, bias and heuristic review, visual decision support, group decision process, role identity, and decision records.",
  Growth: "Activation, retention, expansion, PLG, PQLs, growth loops, lifecycle triggers, GTM motions, and sustainable growth experiments.",
  Analytics: "Product metrics, dashboards, SQL, cohorts, experiments, data quality, statistical analysis, and instrumentation.",
  Finance: "Valuation, DCF, NPV, IRR, WACC, CAPM, capital structure, startup financing, cap tables, dilution, deal pricing, and market context.",
  Delivery: "PRDs, requirements, backlog items, sprint plans, QA scenarios, launch readiness, release notes, and execution planning.",
  Design: "UX, prototypes, design systems, accessibility, product experience, interface analysis, and design handoff.",
  Marketing: "Brand, positioning copy, messaging, market orientation, battlecards, launches, campaigns, and product marketing artifacts.",
  Operations: "Product operating cadence, governance, decision rights, meeting systems, policies, team workflows, and reusable product rituals.",
  "Stakeholder Communication": "Executive updates, stakeholder narratives, decks, meeting plans, influence, alignment, and difficult conversations.",
  "AI Execution": "AI-builder handoff, technical specs, architecture briefs, verification, TDD, debugging, and agent-ready implementation planning.",
  "Business Model": "Business model design, monetization, pricing, packaging, value capture, platform economics, and sustainability logic.",
  "Venture / 0-1": "Founder framing, venture opportunities, beachhead segments, market sizing, startup canvases, wedges, pivot decisions, and routing into Finance for fundraising or term-sheet math.",
};

export const categoryCrossLinks = {
  "Venture / 0-1": [
    {
      skill: "venture-capital-deal-modeling",
      category: "Finance",
      use_when:
        "Founder fundraising, VC rounds, term sheets, pre-money/post-money, cap tables, dilution, option pools, convertible notes, SAFEs, preferred stock, liquidation preference, burn, or runway.",
    },
    {
      skill: "valuation-and-deal-pricing",
      category: "Finance",
      use_when:
        "Startup or acquisition valuation where the user asks what the company is worth, what to pay, what ownership to receive, or how enterprise value, equity value, and price per share connect.",
    },
  ],
};

export const lifecycleOrder = [
  "Think",
  "Discover",
  "Strategize",
  "Design",
  "Plan",
  "Measure",
  "Growth",
  "Align",
  "Build With AI",
  "Launch & Learn",
];

export const lifecycleDescriptions = {
  Think: "Founder framing, new ideas, opportunity shape, and narrow wedges.",
  Discover: "Research, JTBD, interviews, ICPs, assumptions, and customer insight.",
  Strategize: "Positioning, market structure, moats, blue ocean, business model, and venture choices.",
  Design: "UX, prototypes, design systems, accessibility, and product experience.",
  Plan: "PRDs, roadmaps, OKRs, requirements, prioritization, and execution plans.",
  Measure: "Metrics, dashboards, experiments, PMF, funnels, retention, CAC/LTV, and churn.",
  Growth: "Brand, GTM, lifecycle, growth loops, acquisition, activation, retention, and referral.",
  Align: "Stakeholder alignment, executive updates, narratives, decks, meetings, and influence.",
  "Build With AI": "AI PM handoff, specs, verification, technical planning, and agent-ready execution.",
  "Launch & Learn": "Launch planning, QA, post-launch feedback, iteration, learning loops, and release evidence.",
};

export function cleanScalar(value) {
  return String(value ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

export function normalizeCategory(category) {
  const cleaned = cleanScalar(category);
  return categoryAliases.get(cleaned) ?? cleaned;
}

export function slugify(value, maxLength = 63) {
  const base = cleanScalar(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (base.length <= maxLength) return base || "untitled-skill";
  const clipped = base.slice(0, maxLength).replace(/-[^-]*$/, "").replace(/-+$/g, "");
  return clipped || base.slice(0, maxLength).replace(/-+$/g, "");
}

export function titleCaseFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function yamlQuote(value) {
  return JSON.stringify(String(value ?? ""));
}

export function readAllSkills() {
  if (!existsSync(skillsRoot)) return [];
  const skills = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readSkill(entry.name))
    .filter(Boolean)
    .sort((a, b) => a.skillName.localeCompare(b.skillName));
  const seen = new Map();
  for (const skill of skills) {
    if (seen.has(skill.skillName)) {
      throw new Error(`Duplicate skill name: ${skill.skillName} (${seen.get(skill.skillName)} and ${skill.sourcePath})`);
    }
    seen.set(skill.skillName, skill.sourcePath);
  }
  return skills;
}

export function readRootSkill() {
  if (!existsSync(rootSkillFile)) return null;
  const content = readFileSync(rootSkillFile, "utf8");
  const frontmatter = parseFrontmatter(content);
  return {
    custom: true,
    title: "Productize",
    category: "Operations",
    originalCategory: "Operations",
    lifecycle: "Think",
    tags: ["productize", "router", "product-operating-system", "ai-product-management"],
    outputArtifact: "Routed Productize workflow",
    content,
    sourcePath: "SKILL.md",
    skillName: cleanScalar(frontmatter.name || "productize"),
    pluginName: "productize",
    contractRequired: false,
    allowImplicitInvocation: true,
    isRoot: true,
  };
}

function readSkill(dirName) {
  const skillDir = path.join(skillsRoot, dirName);
  const skillFile = path.join(skillDir, "SKILL.md");
  if (!existsSync(skillFile)) return null;

  const content = readFileSync(skillFile, "utf8");
  const frontmatter = parseFrontmatter(content);
  const manifestPath = path.join(skillDir, "productize.json");
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
  const skillName = cleanScalar(frontmatter.name || dirName);
  const title = cleanScalar(manifest.title || firstHeading(content) || titleCaseFromSlug(skillName));
  const category = normalizeCategory(manifest.category || inferCategory(content));
  const tags = Array.isArray(manifest.tags) ? manifest.tags.map(cleanScalar).filter(Boolean) : inferTags(content);
  const lifecycle = cleanScalar(manifest.lifecycle || inferLifecycle({ skillName, title, category, tags }));
  const allowImplicitInvocation =
    typeof manifest.allow_implicit_invocation === "boolean" ? manifest.allow_implicit_invocation : undefined;
  const outputArtifact = manifest.output_artifact || inferOutputArtifact({ skillName, title, category, lifecycle });
  const routingSignals = Array.isArray(manifest.routing_signals) ? manifest.routing_signals.map(cleanScalar).filter(Boolean) : tags;
  const failureModes = Array.isArray(manifest.failure_modes) ? manifest.failure_modes.map(cleanScalar).filter(Boolean) : [];
  const examples = Array.isArray(manifest.examples) ? manifest.examples : [];

  return {
    custom: Boolean(manifest.custom),
    title,
    category,
    originalCategory: normalizeCategory(manifest.original_category || category),
    lifecycle,
    tags,
    content,
    sourcePath: `skills/${skillName}/SKILL.md`,
    templatePath: `skills/${skillName}/SKILL.md.tmpl`,
    skillPath: `skills/${skillName}`,
    skillName,
    pluginName: `productize-${slugify(category, 48)}`,
    contractRequired: content.includes("## Prompt Contract"),
    allowImplicitInvocation,
    useWhen: manifest.use_when || "",
    doNotUseWhen: manifest.do_not_use_when || "",
    outputArtifact,
    routingSignals,
    failureModes,
    examples,
    frameworkFit: manifest.framework_fit || "",
  };
}

export function parseFrontmatter(content) {
  const match = String(content).match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const frontmatter = {};
  const lines = match[1].split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;
    const [, key, rawValue] = keyMatch;
    if ([">", ">-", "|", "|-"].includes(rawValue.trim())) {
      const block = [];
      while (index + 1 < lines.length && /^\s+/.test(lines[index + 1])) {
        index += 1;
        block.push(lines[index].trim());
      }
      frontmatter[key] = cleanScalar(block.join(" "));
    } else {
      frontmatter[key] = cleanScalar(rawValue);
    }
  }
  return frontmatter;
}

export function stripGeneratedHeader(content) {
  return String(content)
    .replace(/\n?<!-- AUTO-GENERATED from .*? -->\n<!-- Regenerate: .*? -->\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function firstHeading(content) {
  const match = String(content).match(/^#\s+(.+)$/m);
  return match ? cleanScalar(match[1]) : "";
}

function inferCategory(content) {
  const description = cleanScalar(parseFrontmatter(content).description).toLowerCase();
  for (const category of categoryOrder) {
    if (description.includes(`for ${category.toLowerCase()} related to`)) return category;
    if (description.includes(`${category.toLowerCase()},`)) return category;
  }
  return "Strategy";
}

function inferTags(content) {
  const description = cleanScalar(parseFrontmatter(content).description);
  const match = description.match(/Trigger terms:\s*([^.]*)\./i);
  if (!match) return [];
  return match[1].split(",").map(cleanScalar).filter(Boolean);
}

export function inferLifecycle({ skillName, title, category, tags = [] }) {
  const haystack = `${skillName} ${title} ${category} ${tags.join(" ")}`.toLowerCase();
  if (/(interview|jtbd|research|survey|persona|icp|assumption|opportunity-solution|customer insight|empathy)/.test(haystack)) return "Discover";
  if (/(valuation|deal pricing|enterprise value|equity value|dcf|npv|irr|wacc|capm|cost of capital|beta|capital structure|apv|bond|yield to maturity|vc method|cap table|dilution|convertible note|safe|preferred stock|option pool|terminal value|free cash flow)/.test(haystack)) return "Measure";
  if (/(growth|go-to-market|gtm|acquisition|referral|lifecycle|channel|revenue|pricing|onboarding|activation|retention)/.test(haystack)) return "Growth";
  if (/(decision|bias|heuristic|bounded rational|system 1|system 2|groupthink|polarization|conformity|authority bias|role identity|organizational identity)/.test(haystack)) return "Think";
  if (/(position|moat|strategy|market|competitive|business-model|blue-ocean|brand|archetype|bav|venture|commercialization|niche|swot|crux)/.test(haystack)) return "Strategize";
  if (/(design|prototype|ux|ui|accessibility|wireframe|affordance|signifier|visual|figma|cta)/.test(haystack)) return "Design";
  if (/(prd|requirement|roadmap|okr|prioriti|user-stor|gherkin|spec|project-plan|sprint|acceptance|scope|meeting-agenda)/.test(haystack)) return "Plan";
  if (/(metric|analytics|dashboard|sql|nps|churn|pmf|aarr|cac|ltv|experiment|cohort|activation|retention|funnel|data)/.test(haystack)) return "Measure";
  if (/(stakeholder|executive|deck|presentation|narrative|communication|meeting|influence|politics|demo|crisis|message|brief)/.test(haystack)) return "Align";
  if (/(technical|architecture|backend|frontend|tdd|debug|verification|ai coding|agent|handoff|shape-up)/.test(haystack)) return "Build With AI";
  if (/(launch|post-launch|feedback|support|qa|release|rollout|learn)/.test(haystack)) return "Launch & Learn";
  return "Think";
}

export function inferOutputArtifact({ title, category, lifecycle }) {
  if (category === "Finance") return "Valuation model, finance calculation, or deal-pricing memo";
  if (lifecycle === "Discover") return "Research brief or insight synthesis";
  if (lifecycle === "Strategize") return "Strategy memo or decision brief";
  if (lifecycle === "Design") return "Design critique, UX spec, or prototype brief";
  if (lifecycle === "Plan") return "PRD, roadmap, requirements, or execution plan";
  if (lifecycle === "Measure") return "Metric diagnosis, scorecard, or experiment plan";
  if (lifecycle === "Growth") return "Growth diagnosis or GTM action plan";
  if (lifecycle === "Align") return "Stakeholder narrative, update, deck outline, or comms plan";
  if (lifecycle === "Build With AI") return "Agent-ready implementation brief or technical plan";
  if (lifecycle === "Launch & Learn") return "Launch/readout plan or learning loop";
  return `${category} artifact for ${title}`;
}

export function ensureCleanDir(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

export function writeText(file, content) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

export function readJson(file, fallback = {}) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, "utf8"));
}

export function shortDescription(skill) {
  const frontmatterDescription = cleanScalar(parseFrontmatter(skill.content).description);
  const fallback = cleanScalar(skill.title);
  const text = frontmatterDescription || fallback;
  if (text.length <= 120) return text;
  return `${text.slice(0, 117).replace(/\s+\S*$/, "")}...`;
}

export function defaultPrompt(skill) {
  return skill.isRoot ? "Use $productize to route this product work." : `Use $${skill.skillName} with my product context.`;
}

export function openaiYaml(skill, allowImplicit = true) {
  const effectiveAllowImplicit = allowImplicit && skill.allowImplicitInvocation !== false;
  return `interface:\n  display_name: ${yamlQuote(skill.title)}\n  short_description: ${yamlQuote(shortDescription(skill))}\n  brand_color: ${yamlQuote(categoryColor(skill.category))}\n  default_prompt: ${yamlQuote(defaultPrompt(skill))}\n\npolicy:\n  allow_implicit_invocation: ${effectiveAllowImplicit ? "true" : "false"}\n`;
}

export function categoryColor(category) {
  const colors = {
    Discovery: "#0D9488",
    Strategy: "#059669",
    "Decision Making": "#7C2D12",
    Growth: "#C2410C",
    Analytics: "#0F766E",
    Finance: "#0369A1",
    Delivery: "#4F46E5",
    Design: "#DB2777",
    Marketing: "#EA580C",
    Operations: "#7C3AED",
    "Stakeholder Communication": "#0891B2",
    "AI Execution": "#334155",
    "Business Model": "#9333EA",
    "Venture / 0-1": "#0F766E",
  };
  return colors[normalizeCategory(category)] || "#1D4ED8";
}

export function groupByCategory(skills) {
  const groups = new Map();
  for (const skill of skills) {
    const category = normalizeCategory(skill.category);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(skill);
  }
  return [...groups.entries()].sort((a, b) => {
    const ai = categoryOrder.indexOf(a[0]);
    const bi = categoryOrder.indexOf(b[0]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a[0].localeCompare(b[0]);
  });
}

export function groupByLifecycle(skills) {
  const groups = new Map();
  for (const lifecycle of lifecycleOrder) groups.set(lifecycle, []);
  for (const skill of skills) {
    const lifecycle = cleanScalar(skill.lifecycle || inferLifecycle(skill));
    if (!groups.has(lifecycle)) groups.set(lifecycle, []);
    groups.get(lifecycle).push(skill);
  }
  return [...groups.entries()].sort((a, b) => {
    const ai = lifecycleOrder.indexOf(a[0]);
    const bi = lifecycleOrder.indexOf(b[0]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a[0].localeCompare(b[0]);
  });
}

export function skillRegistryRecord(skill) {
  return {
    name: skill.skillName,
    title: skill.title,
    category: skill.category,
    original_category: skill.originalCategory,
    lifecycle: skill.lifecycle,
    tags: skill.tags,
    use_when: skill.useWhen,
    do_not_use_when: skill.doNotUseWhen,
    output_artifact: skill.outputArtifact,
    routing_signals: skill.routingSignals,
    failure_modes: skill.failureModes || [],
    examples: skill.examples || [],
    framework_fit: skill.frameworkFit || "",
    source_path: skill.sourcePath,
    template_path: skill.templatePath,
    skill_path: skill.skillPath,
    plugin: skill.pluginName,
    custom: Boolean(skill.custom),
  };
}

export function generateProductizePreamble(skill) {
  return `## Productize Preamble

Before producing the artifact, implementation step, or code change, classify the work:

- **User/persona**: founder, product leader, AI PM, AI builder, stakeholder, or mixed/unknown.
- **Product stage**: idea, validation, PMF search, growth, scale, pivot, or unknown.
- **Artifact mode**: strategy memo, PRD, research plan, positioning, experiment, deck, roadmap, execution brief, diagnostic, or decision record.
- **Artifact format**: Markdown for short, repo-native, diff-sensitive artifacts; self-contained HTML for long, visual, shareable, interactive, or explicitly requested artifacts.
- **Evidence standard**: what is known, assumed, missing, and risky.
- **Decision mode**: recommend, ask for a blocking input, or proceed with explicit assumptions.

Operating rules:

1. Do not produce generic product strategy filler. Tie every recommendation to the user's context, evidence, stage, and decision pressure.
2. Separate facts from assumptions. Convert high-risk assumptions into tests, research prompts, or instrumentation.
3. Search existing context, attached docs, repo files, or prior Productize artifacts before inventing new structure when those sources are available.
4. Ask only for inputs that materially change the output. If the next step is obvious, proceed and state assumptions.
5. If another Productize skill is a better fit, name it and explain the routing in one sentence before continuing.
6. Enforce the output contract for this skill. Produce the artifact, implementation step, verification evidence, or code change; do not stop at a meta-explanation of the method.
7. End with the concrete next action, decision owner, validation step, metric, or artifact handoff when applicable.
8. Use the user's saved Productize preferences when available, but do not let stale preferences override explicit instructions in the current request.
9. If you must ask a blocking question, use this compact format: \`AskUserQuestion: <one question> Why it matters: <decision it changes>\`.
10. Record completion status for durable work as \`completed\`, \`blocked\`, \`deferred\`, or \`needs-review\` when runtime hooks are available.

Artifact format policy:

- Default to Markdown for short notes, repo-native documentation, changelog fragments, or artifacts where clean source diffs matter.
- Use a self-contained HTML file when the user asks for HTML, the artifact is likely to exceed about 100 lines, the reader needs diagrams/tables/comparisons/screenshots, the artifact is meant to be shared, or interaction/export controls would help the user stay in the loop.
- Route by product job first, then choose the format. Do not create a generic HTML workflow when a Productize playbook, gate, or routed skill owns the work.
- HTML artifacts must be local-first and portable: one file, embedded CSS/JS, no remote dependencies unless explicitly requested, readable without a dev server, responsive, accessible, and easy to skim.
- Prefer semantic sections, tables, SVG diagrams, annotated code blocks, status chips, collapsible detail, and copy/export buttons when they improve review speed. Avoid decorative complexity that hides the decision.
- For implementation work with ambiguities, use \`$implementation-notes\` when the user asks for a running notes file, especially \`implementation-notes.html\` or \`implementation-notes.md\`.

Runtime hooks, if available:

- Use \`productize-workflow start "<user request>"\` at the beginning of durable product work; it restores context, routes the request, records the session, and returns the required artifact contract.
- Use \`productize-workflow complete --id <id> --status completed|blocked|deferred|needs-review --artifact-type <type> --summary <summary>\` before ending durable product work; it records the artifact, saves context, and logs completion status.
- Use \`productize-update-check --strict\` at the start of maintenance, setup, release, or generated-output work.
- Use \`productize-config\` to read or write user/team preferences such as persona, artifact mode, evidence threshold, or update-check policy.
- Use \`productize-session-log\` to record important workflow decisions.
- Use \`productize-artifact-log\` when a durable artifact is produced.
- Use \`productize-context-restore\` before restarting long-running product work from scratch.
- Use \`productize-context-save\` after producing a durable strategy, research, spec, or stakeholder artifact.
- Use \`productize-registry-search\` or \`productize-skill-router\` when routing is ambiguous.
- Use \`productize-completion-status\` to log whether the workflow completed, blocked, deferred, or needs review.

Telemetry standard:

- Keep telemetry local by default in \`.productize/\` or \`PRODUCTIZE_STATE_DIR\`.
- Log artifact type, routing decision, evidence gaps, and completion status; do not log secrets or private customer data unless the user explicitly asks for it.

Current skill metadata:

- **Skill**: \`${skill.skillName}\`
- **Lifecycle**: ${skill.lifecycle || "Unknown"}
- **Category**: ${skill.category || "Unknown"}
- **Primary artifact**: ${skill.outputArtifact || "Product work artifact"}
`;
}

export function renderRootRouting(skills = readAllSkills()) {
  const surfaceSkillNames = new Set([
    "productize",
    "0-1",
    "operate",
    "grow",
    "autoplan",
    "thesis-review",
    "product-review",
    "design-review",
    "eng-review",
    "qa",
    "release",
    "docs",
    "dx-review",
    "comms-review",
  ]);
  const routedInternalCount = skills.filter((skill) => !surfaceSkillNames.has(skill.skillName)).length;
  const rows = [
    ["I have an idea", "Think", "thesis framing, opportunity, wedge"],
    ["I need positioning/growth", "Strategize / Growth", "positioning, brand, PMF, AARRR, CAC/LTV"],
    ["I need a PRD/spec", "Plan / Build With AI", "PRDs, requirements, technical handoff, implementation plan"],
    ["I need research", "Discover", "JTBD, interviews, assumptions, ICP, insight synthesis"],
    ["I need metrics/PMF", "Measure", "PMF, dashboards, funnels, experiments, churn"],
    ["I need valuation/deal pricing", "Finance", "DCF, WACC, CAPM, EV/equity bridge, cap tables, VC deals"],
    ["I need to make a better decision", "Think / Align", "decision quality, heuristics, group process, role identity, visual bias"],
    ["I need to build with AI", "Build With AI", "agent-ready specs, code implementation, verification, architecture"],
    ["I need stakeholder material", "Align", "updates, narratives, decks, stakeholder plans"],
  ];
  const lifecycleCounts = new Map(groupByLifecycle(skills).map(([name, items]) => [name, items.length]));
  const routing = rows.map(([intent, section, signals]) => `| ${intent} | ${section} | ${signals} |`).join("\n");
  const counts = lifecycleOrder
    .map((name) => `- **${name}**: ${lifecycleCounts.get(name) || 0} skills`)
    .join("\n");
  return `## Access Surface

Use the smallest entry point that owns the cadence:

**Playbooks**

- \`/productize-0-1\`: new bet or new capability; closes at ship gate, pivot, pause, or kill.
- \`/productize-operate\`: production deploy; continuous operating loop that does not close.
- \`/productize-grow\`: stable product with activation evidence; closes when the growth target is hit or the strategy pivots.

**Gates**

- \`thesis-review\`
- \`product-review\`
- \`design-review\`
- \`eng-review\`
- \`qa\`
- \`release\`
- \`docs\`
- \`dx-review\`
- \`comms-review\`

**Meta-runner**

- \`/productize-autoplan\`: detects the current gate and runs the relevant gates.

**Routed Skills**

- ${routedInternalCount} Productize routed skills called internally by the three playbooks and nine gates.

## Routing Map\n\n| User intent | Route | Signals |\n|---|---|---|\n${routing}\n\n## Lifecycle Index\n\n${counts}\n`;
}

export function renderTemplate(content, skill) {
  return String(content)
    .replaceAll("{{PRODUCTIZE_PREAMBLE}}", generateProductizePreamble(skill))
    .replaceAll("{{PRODUCTIZE_ROOT_ROUTING}}", renderRootRouting());
}

export function generatedHeader(source = "SKILL.md.tmpl") {
  return `<!-- AUTO-GENERATED from ${source} - do not edit directly -->\n<!-- Regenerate: npm run skills:generate -->\n`;
}

export function insertGeneratedHeader(content, source = "SKILL.md.tmpl") {
  const text = stripGeneratedHeader(content);
  const frontmatterEnd = text.indexOf("\n---", 4);
  if (frontmatterEnd === -1) return `${generatedHeader(source)}\n${text}`;
  const insertAt = text.indexOf("\n", frontmatterEnd + 1) + 1;
  return `${text.slice(0, insertAt)}${generatedHeader(source)}\n${text.slice(insertAt).replace(/^\n+/, "")}`;
}

export function relativePosix(from, to) {
  return path.relative(from, to).split(path.sep).join("/");
}

export function scoreSkillForQuery(skill, query) {
  return scoreProductizeSkill(skill, query);
}

export function routeSkillForText(query, skills = readAllSkills(), limit = 5) {
  return routeProductizeSkills(query, skills, limit);
}
