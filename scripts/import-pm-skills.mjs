import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  cleanScalar,
  insertGeneratedHeader,
  openaiYaml,
  renderTemplate,
  repoRoot,
  skillsRoot,
  slugify,
  writeText,
} from "./lib/productize.mjs";

const pmRoot = path.resolve(repoRoot, "..", "pm-skills-main");

const importedSkills = [
  {
    name: "ab-test-analysis",
    source: "pm-data-analytics/skills/ab-test-analysis/SKILL.md",
    title: "A/B Test Analysis",
    category: "Analytics",
    lifecycle: "Measure",
    tags: ["ab-testing", "experiments", "statistics", "ship-decision", "confidence", "sample-size"],
    artifact: "A/B test decision memo with statistical readout and ship, extend, or stop recommendation",
    useWhen:
      "Use when evaluating A/B test results, checking statistical significance, validating sample size, reading confidence intervals, or deciding whether to ship, extend, or stop an experiment.",
    doNotUseWhen:
      "Do not use for general product health, qualitative launch feedback, or exploratory analysis without an experiment design and variant result data.",
    frameworkFit:
      "Best for completed or in-flight controlled experiments where the product team needs a decision tied to significance, power, effect size, sample quality, and business risk.",
    alternateLifecycles: ["Launch & Learn"],
  },
  {
    name: "cohort-analysis",
    source: "pm-data-analytics/skills/cohort-analysis/SKILL.md",
    title: "Cohort Analysis",
    category: "Analytics",
    lifecycle: "Measure",
    tags: ["cohorts", "retention", "activation", "churn", "engagement", "feature-adoption"],
    artifact: "Cohort retention and engagement diagnosis with segment-level actions",
    useWhen:
      "Use when analyzing retention by signup, activation, usage, plan, feature adoption, or customer segment, especially when churn, engagement, or product health needs cohort evidence.",
    doNotUseWhen:
      "Do not use when the user only needs a single aggregate metric, a qualitative churn synthesis, or a growth strategy without cohort data.",
    frameworkFit:
      "Best for existing products with event, account, or subscription data where averages hide retention, activation, or adoption differences across cohorts.",
    alternateLifecycles: ["Growth"],
  },
  {
    name: "north-star-metric",
    source: "pm-marketing-growth/skills/north-star-metric/SKILL.md",
    title: "North Star Metric",
    category: "Analytics",
    lifecycle: "Measure",
    tags: ["north-star", "input-metrics", "metrics-constellation", "product-health", "business-game"],
    artifact: "North Star metric definition with input metrics, validation criteria, and instrumentation notes",
    useWhen:
      "Use when choosing or revising a North Star Metric, defining input metrics, aligning teams around product value, or deciding what the product should measure.",
    doNotUseWhen:
      "Do not use for broad strategy, vanity KPI lists, dashboard visualization, or metric troubleshooting after a specific metric has already been chosen.",
    frameworkFit:
      "Best when the team needs one value-aligned metric plus controllable input metrics that connect user value to business outcomes.",
  },
  {
    name: "growth-loops",
    source: "pm-go-to-market/skills/growth-loops/SKILL.md",
    title: "Growth Loops",
    category: "Growth",
    lifecycle: "Growth",
    tags: ["growth-loops", "plg", "flywheel", "viral", "referral", "collaboration", "user-generated"],
    artifact: "Growth loop map with loop mechanics, inputs, outputs, constraints, and experiments",
    useWhen:
      "Use when designing product-led growth loops, referral loops, collaboration loops, usage loops, or flywheels that reduce dependence on paid acquisition.",
    doNotUseWhen:
      "Do not use for one-off campaigns, generic funnel diagnosis, or GTM channel selection without a product mechanism that can compound.",
    frameworkFit:
      "Best for products where user behavior can create acquisition, activation, retention, or content/distribution effects that feed the next cycle.",
  },
  {
    name: "gtm-motions",
    source: "pm-go-to-market/skills/gtm-motions/SKILL.md",
    title: "GTM Motions",
    category: "Growth",
    lifecycle: "Growth",
    tags: ["gtm", "plg", "sales-led", "inbound", "outbound", "abm", "partners", "community"],
    artifact: "GTM motion selection brief with channel fit, operating requirements, and experiment plan",
    useWhen:
      "Use when selecting between PLG, sales-led, inbound, outbound, paid, community, partner, ABM, or hybrid go-to-market motions.",
    doNotUseWhen:
      "Do not use when the user only needs launch copy, a broad market strategy, or a growth-loop design rather than motion selection.",
    frameworkFit:
      "Best when the product has a defined audience and the team needs to choose acquisition and sales motions that match ACV, buyer, urgency, and product complexity.",
  },
  {
    name: "beachhead-segment",
    source: "pm-go-to-market/skills/beachhead-segment/SKILL.md",
    title: "Beachhead Segment",
    category: "Venture / 0-1",
    lifecycle: "Strategize",
    tags: ["beachhead", "segment", "market-entry", "wedge", "icp", "0-to-1"],
    artifact: "Beachhead segment decision brief with scoring, wedge rationale, and expansion path",
    useWhen:
      "Use when choosing the first market segment, entry wedge, launch audience, early ICP, or 0-to-1 customer focus.",
    doNotUseWhen:
      "Do not use when the user already has a validated ICP and needs growth execution, or when the request is only to size a market.",
    frameworkFit:
      "Best for founders and product leaders deciding where to concentrate scarce discovery, sales, product, and launch effort first.",
    alternateLifecycles: ["Growth"],
  },
  {
    name: "gtm-strategy",
    source: "pm-go-to-market/skills/gtm-strategy/SKILL.md",
    title: "GTM Strategy",
    category: "Growth",
    lifecycle: "Growth",
    tags: ["gtm", "launch", "channels", "messaging", "success-metrics", "timeline"],
    artifact: "Go-to-market plan with audience, positioning, channels, metrics, and launch timeline",
    useWhen:
      "Use when creating a full go-to-market plan for a product, feature, market entry, launch, or repositioning effort.",
    doNotUseWhen:
      "Do not use for narrow channel selection, pure launch comms, or a strategy memo without GTM execution requirements.",
    frameworkFit:
      "Best when the team needs a launchable GTM plan connecting target audience, message, channels, motions, timeline, owners, and metrics.",
    alternateLifecycles: ["Launch & Learn"],
  },
  {
    name: "market-sizing",
    source: "pm-market-research/skills/market-sizing/SKILL.md",
    title: "Market Sizing",
    category: "Venture / 0-1",
    lifecycle: "Strategize",
    tags: ["tam", "sam", "som", "market-sizing", "market-entry", "investor"],
    artifact: "TAM/SAM/SOM market sizing model with assumptions, confidence, and decision implications",
    useWhen:
      "Use when estimating TAM, SAM, SOM, addressable market, serviceable market, market-entry upside, or investor-ready opportunity size.",
    doNotUseWhen:
      "Do not use when the user needs a qualitative market scan, competitive analysis, or ICP selection without sizing assumptions.",
    frameworkFit:
      "Best when a product or market decision depends on top-down and bottom-up market size assumptions that must be made explicit.",
  },
  {
    name: "pricing-strategy",
    source: "pm-product-strategy/skills/pricing-strategy/SKILL.md",
    title: "Pricing Strategy",
    category: "Business Model",
    lifecycle: "Strategize",
    tags: ["pricing", "packaging", "willingness-to-pay", "price-elasticity", "freemium", "tiers"],
    artifact: "Pricing strategy brief with model, package logic, willingness-to-pay assumptions, and validation plan",
    useWhen:
      "Use when setting price, changing packaging, comparing pricing models, evaluating freemium versus paid, or designing pricing experiments.",
    doNotUseWhen:
      "Do not use when the user needs a broader monetization model, cost accounting, or growth funnel diagnosis unrelated to pricing.",
    frameworkFit:
      "Best when customer value, buyer willingness to pay, competitive pricing, packaging, and adoption risk need to be weighed together.",
    alternateLifecycles: ["Growth"],
  },
  {
    name: "monetization-strategy",
    source: "pm-product-strategy/skills/monetization-strategy/SKILL.md",
    title: "Monetization Strategy",
    category: "Business Model",
    lifecycle: "Strategize",
    tags: ["monetization", "revenue-model", "business-model", "subscription", "usage-based", "marketplace"],
    artifact: "Monetization options brief with audience fit, risks, and validation experiments",
    useWhen:
      "Use when deciding how a product should make money, comparing revenue models, or exploring monetization options before detailed pricing.",
    doNotUseWhen:
      "Do not use when the revenue model is fixed and the team only needs price points, package design, or discount policy.",
    frameworkFit:
      "Best for new or changing products where the core question is how value will be captured, not just what price to charge.",
  },
  {
    name: "product-vision",
    source: "pm-product-strategy/skills/product-vision/SKILL.md",
    title: "Product Vision",
    category: "Strategy",
    lifecycle: "Strategize",
    tags: ["vision", "north-star", "alignment", "narrative", "product-direction"],
    artifact: "Product vision statement with audience, future state, strategic principles, and alignment notes",
    useWhen:
      "Use when defining, sharpening, or stress-testing a product vision that needs to motivate teams and align stakeholders.",
    doNotUseWhen:
      "Do not use for detailed PRDs, roadmap sequencing, or brand taglines without product direction decisions.",
    frameworkFit:
      "Best when a product team needs a crisp future-state statement that guides decisions and stakeholder communication.",
    alternateLifecycles: ["Align"],
  },
  {
    name: "lean-canvas",
    source: "pm-product-strategy/skills/lean-canvas/SKILL.md",
    title: "Lean Canvas",
    category: "Business Model",
    lifecycle: "Think",
    tags: ["lean-canvas", "startup", "problem-solution", "uvp", "riskiest-assumptions"],
    artifact: "Lean Canvas with problem, solution, UVP, metrics, channels, revenue, costs, and risk priorities",
    useWhen:
      "Use when turning a startup idea or early product concept into a Lean Canvas with hypotheses and validation priorities.",
    doNotUseWhen:
      "Do not use when the user needs a mature business model canvas, platform model, or detailed GTM execution plan.",
    frameworkFit:
      "Best for 0-to-1 products where problem, segment, unfair advantage, channels, and revenue are still assumptions.",
    alternateLifecycles: ["Strategize"],
  },
  {
    name: "startup-canvas",
    source: "pm-product-strategy/skills/startup-canvas/SKILL.md",
    title: "Startup Canvas",
    category: "Venture / 0-1",
    lifecycle: "Think",
    tags: ["startup-canvas", "0-to-1", "business-model", "product-strategy", "founder"],
    artifact: "Startup Canvas combining product strategy, business model, risks, and next validation steps",
    useWhen:
      "Use when evaluating a startup concept or new product that needs product strategy and business model logic in one founder-ready artifact.",
    doNotUseWhen:
      "Do not use for a narrow Lean Canvas, mature-company strategy memo, or execution plan after the concept is already validated.",
    frameworkFit:
      "Best for founders and 0-to-1 teams that need one artifact connecting customer, problem, solution, growth, economics, and assumptions.",
    alternateLifecycles: ["Strategize"],
  },
  {
    name: "pre-mortem",
    source: "pm-execution/skills/pre-mortem/SKILL.md",
    title: "Pre-Mortem",
    category: "Delivery",
    lifecycle: "Plan",
    tags: ["pre-mortem", "risk", "launch-risk", "prd-review", "go-no-go", "scope"],
    artifact: "Pre-mortem risk report with launch blockers, mitigations, and go/no-go checklist",
    useWhen:
      "Use when stress-testing a PRD, launch plan, product bet, or feature before execution or release.",
    doNotUseWhen:
      "Do not use when the product has already launched and the team needs post-launch analysis, or when the request is only bug triage.",
    frameworkFit:
      "Best before committing to build, launch, or scale when the team needs to expose likely failure modes and mitigations.",
    alternateLifecycles: ["Launch & Learn"],
  },
  {
    name: "release-notes",
    source: "pm-execution/skills/release-notes/SKILL.md",
    title: "Release Notes",
    category: "Stakeholder Communication",
    lifecycle: "Launch & Learn",
    tags: ["release-notes", "changelog", "launch-comms", "product-update", "customer-communication"],
    artifact: "User-facing release notes organized by features, improvements, fixes, and user value",
    useWhen:
      "Use when turning tickets, PRDs, changelogs, or shipped work into clear user-facing release notes or product update copy.",
    doNotUseWhen:
      "Do not use for internal launch readiness, technical changelog generation, or executive status updates.",
    frameworkFit:
      "Best after shipping or preparing to ship when the audience needs concise value-oriented communication about what changed.",
    alternateLifecycles: ["Align"],
  },
  {
    name: "outcome-roadmap",
    source: "pm-execution/skills/outcome-roadmap/SKILL.md",
    title: "Outcome Roadmap",
    category: "Delivery",
    lifecycle: "Plan",
    tags: ["outcome-roadmap", "roadmap", "outcomes", "feature-roadmap", "strategic-intent"],
    artifact: "Outcome-focused roadmap that rewrites feature work into user and business outcomes",
    useWhen:
      "Use when converting a feature roadmap into an outcome roadmap, making roadmap communication more strategic, or reframing initiatives around impact.",
    doNotUseWhen:
      "Do not use when the user needs low-level sprint planning, a roadmap tradeoff decision, or a blank roadmap from vision only.",
    frameworkFit:
      "Best for product leaders who need roadmap items to communicate why the work matters, not just what will ship.",
    alternateLifecycles: ["Strategize"],
  },
  {
    name: "prioritization-frameworks",
    source: "pm-execution/skills/prioritization-frameworks/SKILL.md",
    title: "Prioritization Frameworks",
    category: "Strategy",
    lifecycle: "Plan",
    tags: ["prioritization", "rice", "ice", "kano", "moscow", "opportunity-score", "framework-selection"],
    artifact: "Prioritization framework recommendation with scoring template and decision rationale",
    useWhen:
      "Use when selecting or comparing prioritization frameworks such as RICE, ICE, Kano, MoSCoW, Opportunity Score, cost of delay, or impact-effort.",
    doNotUseWhen:
      "Do not use when the user already chose a framework and needs the actual ranked backlog, or when the work is only P0/P1/P2 requirements classification.",
    frameworkFit:
      "Best when the team needs the right prioritization method for the decision context before scoring work.",
  },
  {
    name: "analyze-feature-requests",
    source: "pm-product-discovery/skills/analyze-feature-requests/SKILL.md",
    title: "Analyze Feature Requests",
    category: "Delivery",
    lifecycle: "Plan",
    tags: ["feature-requests", "backlog", "triage", "customer-requests", "prioritization", "themes"],
    artifact: "Feature-request triage report with themes, strategic fit, effort/risk, and backlog recommendations",
    useWhen:
      "Use when reviewing customer, sales, support, or stakeholder feature requests and turning them into prioritized product decisions.",
    doNotUseWhen:
      "Do not use for raw support-ticket insight mining, detailed PRD writing, or general feature prioritization without request evidence.",
    frameworkFit:
      "Best for existing products where many requests need to be clustered, interpreted, and converted into backlog recommendations.",
    alternateLifecycles: ["Discover"],
  },
  {
    name: "test-scenarios",
    source: "pm-execution/skills/test-scenarios/SKILL.md",
    title: "Test Scenarios",
    category: "AI Execution",
    lifecycle: "Build With AI",
    tags: ["test-scenarios", "qa", "acceptance-tests", "user-stories", "validation", "edge-cases"],
    artifact: "QA-ready test scenarios with roles, preconditions, steps, expected outcomes, and coverage matrix",
    useWhen:
      "Use when creating test scenarios from user stories, feature specs, PRDs, acceptance criteria, or agent-ready implementation plans.",
    doNotUseWhen:
      "Do not use for broad product verification strategy, unit test implementation, or post-launch metrics analysis.",
    frameworkFit:
      "Best when product requirements need to become concrete QA or acceptance scenarios before build or release.",
    alternateLifecycles: ["Launch & Learn"],
  },
  {
    name: "wwas",
    source: "pm-execution/skills/wwas/SKILL.md",
    title: "Why-What-Acceptance",
    category: "Delivery",
    lifecycle: "Plan",
    tags: ["wwa", "why-what-acceptance", "backlog-items", "acceptance-criteria", "strategic-context"],
    artifact: "Why-What-Acceptance backlog items with strategic context and acceptance criteria",
    useWhen:
      "Use when writing backlog items in Why-What-Acceptance format, breaking features into independent valuable work, or adding strategic context to delivery items.",
    doNotUseWhen:
      "Do not use when the user explicitly wants classic user stories, job stories, or a full PRD.",
    frameworkFit:
      "Best when delivery teams need backlog items that preserve why the work matters, what must change, and how acceptance will be judged.",
    alternateLifecycles: ["Build With AI"],
  },
  {
    name: "draft-nda",
    source: "pm-toolkit/skills/draft-nda/SKILL.md",
    title: "Draft NDA",
    category: "Operations",
    lifecycle: "Align",
    tags: ["nda", "confidentiality", "partnership", "legal-review", "stakeholder"],
    artifact: "NDA draft for legal review with assumptions, clauses, and review flags",
    useWhen:
      "Use when drafting a confidentiality or NDA document for partnership, customer, vendor, hiring, or product collaboration discussions.",
    doNotUseWhen:
      "Do not use as legal advice, for jurisdiction-specific legal compliance decisions, or when a lawyer-provided template must be followed exactly.",
    frameworkFit:
      "Best for creating a structured NDA draft and issue list that counsel or an authorized legal reviewer can assess.",
  },
  {
    name: "privacy-policy",
    source: "pm-toolkit/skills/privacy-policy/SKILL.md",
    title: "Privacy Policy",
    category: "Operations",
    lifecycle: "Launch & Learn",
    tags: ["privacy-policy", "data-collection", "gdpr", "compliance", "launch-readiness", "legal-review"],
    artifact: "Privacy policy draft for legal review with data practices, assumptions, and compliance flags",
    useWhen:
      "Use when drafting or updating a privacy policy for a product, launch, website, app, or customer-facing workflow.",
    doNotUseWhen:
      "Do not use as legal advice, for final compliance sign-off, or when regulatory obligations must be determined by counsel.",
    frameworkFit:
      "Best for producing a clear product/data collection draft that a legal reviewer can validate before launch.",
  },
];

const mergeTargets = [
  {
    target: "business-model-design",
    sources: ["pm-product-strategy/skills/business-model/SKILL.md"],
    signals: ["business model canvas", "bmc", "all modes", "value proposition mode"],
    note:
      "Use the PM source to strengthen Business Model Canvas coverage and mode switching between BMC, Lean Canvas, Startup Canvas, and Value Proposition views.",
  },
  {
    target: "write-spec",
    sources: ["pm-execution/skills/create-prd/SKILL.md"],
    signals: ["create prd", "8-section prd", "feature spec", "release planning"],
    note:
      "Use the PM source to sharpen PRD structure around problem, objectives, segments, value proposition, solution, scope, and release planning.",
  },
  {
    target: "competitive-brief",
    sources: ["pm-go-to-market/skills/competitive-battlecard/SKILL.md", "pm-market-research/skills/competitor-analysis/SKILL.md"],
    signals: ["competitive battlecard", "sales battlecard", "objection handling", "win loss"],
    note:
      "Use the PM sources when the competitive artifact must become sales-ready battlecard material, not only product strategy research.",
  },
  {
    target: "ideal-customer-profile-icp-representative-for-x-product",
    sources: ["pm-go-to-market/skills/ideal-customer-profile/SKILL.md"],
    signals: ["ideal customer profile", "icp", "pmf survey", "best customers"],
    note:
      "Use the PM source to make ICP outputs sharper on demographics, behaviors, JTBD, PMF evidence, and best-customer patterns.",
  },
  {
    target: "effective-customer-interview-guides-for-any-topic",
    sources: ["pm-product-discovery/skills/interview-script/SKILL.md"],
    signals: ["interview script", "mom test", "warm-up", "jtbd probing"],
    note:
      "Use the PM source to strengthen interview scripts with warm-up, core exploration, wrap-up, Mom Test behavior, and non-leading JTBD probes.",
  },
  {
    target: "opportunity-solution-tree-from-input",
    sources: ["pm-product-discovery/skills/opportunity-solution-tree/SKILL.md"],
    signals: ["opportunity solution tree", "ost", "continuous discovery"],
    note:
      "Use the PM source to tighten OST outputs around desired outcome, opportunity branches, solution options, and experiments.",
  },
  {
    target: "write-query",
    sources: ["pm-data-analytics/skills/sql-queries/SKILL.md"],
    signals: ["sql generator", "bigquery", "postgres", "mysql", "schema diagram"],
    note:
      "Use the PM source to strengthen SQL generation across dialects and schema interpretation from product analytics questions.",
  },
  {
    target: "stakeholder-power-interest-and-influence-map",
    sources: ["pm-execution/skills/stakeholder-map/SKILL.md"],
    signals: ["power interest grid", "stakeholder communication plan", "raci", "escalation path"],
    note:
      "Use the PM source to add a power-interest grid, quadrant-specific communication plan, escalation path, and optional RACI matrix.",
  },
  {
    target: "structured-interview-notes-from-transcript-using-flexible",
    sources: ["pm-product-discovery/skills/summarize-interview/SKILL.md"],
    signals: ["summarize interview", "interview notes", "satisfaction signals", "action items"],
    note:
      "Use the PM source to make interview transcript summaries include JTBD, satisfaction signals, quotes, and action items.",
  },
  {
    target: "proto-persona-profiles-from-user-research-and-market-data",
    sources: ["pm-market-research/skills/user-personas/SKILL.md"],
    signals: ["user personas", "proto persona", "persona from research", "segment profiles"],
    note:
      "Use the PM source to sharpen persona profiles with JTBD, pains, gains, segment traits, unexpected insights, and decision implications.",
  },
  {
    target: "user-stories-with-gherkin-acceptance-criteria-from-requirements",
    sources: ["pm-execution/skills/user-stories/SKILL.md"],
    signals: ["3 cs", "invest", "user stories", "conversation confirmation"],
    note:
      "Use the PM source to improve story quality with 3 Cs, INVEST checks, conversation notes, design links, and acceptance criteria.",
  },
  {
    target: "positioning-statements-from-competitive-analysis-and-value",
    sources: ["pm-marketing-growth/skills/value-prop-statements/SKILL.md"],
    signals: ["value proposition statements", "marketing copy", "sales messaging", "onboarding messages"],
    note:
      "Use the PM source when a positioning or value proposition must be translated into channel-specific marketing, sales, or onboarding statements.",
  },
];

let changed = 0;

for (const skill of importedSkills) {
  importSkill(skill);
}

for (const merge of mergeTargets) {
  mergeSkill(merge);
}

console.log(`Imported or merged ${changed} PM skill file(s).`);

function importSkill(skill) {
  const sourceFile = path.join(pmRoot, skill.source);
  if (!existsSync(sourceFile)) throw new Error(`Missing PM source skill: ${sourceFile}`);
  const skillDir = path.join(skillsRoot, skill.name);
  mkdirSync(path.join(skillDir, "agents"), { recursive: true });

  const sourceBody = toAscii(stripSource(readFileSync(sourceFile, "utf8"))).trim();
  const description = frontmatterDescription(skill);
  const template = `---\nname: ${skill.name}\ndescription: >-\n${foldYaml(description)}\n---\n# ${skill.title}\n\n{{PRODUCTIZE_PREAMBLE}}\n\n${skill.useWhen}\n\n## Productize Contract\n\n- **Primary lifecycle**: ${skill.lifecycle}\n- **Supporting lifecycle**: ${(skill.alternateLifecycles || []).join(", ") || "none"}\n- **Primary artifact**: ${skill.artifact}\n- **Source method**: pm-skills-main/${skill.source}\n\n${legalGuardrail(skill)}## Method\n\n${sourceBody}\n\n## Productize Output Rules\n\n- Produce the artifact named in the Productize contract, not a generic framework summary.\n- Separate known facts, assumptions, missing evidence, and risky leaps before recommending.\n- Convert uncertain claims into validation steps, metrics, owner decisions, or launch/readout checks.\n- If the PM source method conflicts with Productize evidence standards, keep the Productize standard.\n`;

  const manifest = {
    title: skill.title,
    category: skill.category,
    lifecycle: skill.lifecycle,
    tags: unique([skill.name, ...skill.tags, ...(skill.alternateLifecycles || []).map((item) => slugify(item))]),
    use_when: skill.useWhen,
    do_not_use_when: skill.doNotUseWhen,
    output_artifact: skill.artifact,
    routing_signals: unique([skill.name, ...skill.tags, ...skill.useWhen.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3)]).slice(0, 24),
    framework_fit: skill.frameworkFit,
    failure_modes: [
      "Produces generic advice that is not tied to the user's product stage, evidence, or decision pressure.",
      "Fails to distinguish known facts from assumptions and risky missing evidence.",
      "Uses the PM source as a rigid template instead of adapting it to the user's artifact and decision.",
    ],
    examples: [
      {
        prompt: `Use $${skill.name} for this product context and produce the expected artifact.`,
        expected_artifact: skill.artifact,
      },
    ],
    imported_from: `pm-skills-main/${skill.source}`,
  };

  const rendered = insertGeneratedHeader(renderTemplate(template, {
    skillName: skill.name,
    title: skill.title,
    category: skill.category,
    lifecycle: skill.lifecycle,
    outputArtifact: skill.artifact,
  }));

  writeIfChanged(path.join(skillDir, "SKILL.md.tmpl"), template);
  writeIfChanged(path.join(skillDir, "SKILL.md"), rendered);
  writeIfChanged(path.join(skillDir, "productize.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeIfChanged(path.join(skillDir, "agents", "openai.yaml"), openaiYaml({
    skillName: skill.name,
    title: skill.title,
    category: skill.category,
    lifecycle: skill.lifecycle,
    outputArtifact: skill.artifact,
    content: rendered,
  }, true));
}

function mergeSkill(merge) {
  const skillDir = path.join(skillsRoot, merge.target);
  const templatePath = path.join(skillDir, "SKILL.md.tmpl");
  const manifestPath = path.join(skillDir, "productize.json");
  if (!existsSync(templatePath)) throw new Error(`Missing target template for merge: ${merge.target}`);
  if (!existsSync(manifestPath)) throw new Error(`Missing target metadata for merge: ${merge.target}`);

  const referencesDir = path.join(skillDir, "references");
  mkdirSync(referencesDir, { recursive: true });
  const referenceName = "pm-skills-main-merge.md";
  const referencePath = path.join(referencesDir, referenceName);
  const sourceSections = merge.sources
    .map((source) => {
      const sourceFile = path.join(pmRoot, source);
      if (!existsSync(sourceFile)) throw new Error(`Missing PM merge source skill: ${sourceFile}`);
      return `## ${source}\n\n${toAscii(stripSource(readFileSync(sourceFile, "utf8"))).trim()}`;
    })
    .join("\n\n");
  const reference = `# PM Skills Main Merge Notes\n\n${merge.note}\n\n## Routing Signals\n\n${merge.signals.map((signal) => `- ${signal}`).join("\n")}\n\n${sourceSections}\n`;
  writeIfChanged(referencePath, reference);

  const marker = "## PM Skills Main Merge";
  const hook = `${marker}\n\nLoad \`references/${referenceName}\` when the request mentions ${merge.signals.map((signal) => `\`${signal}\``).join(", ")}. Use the PM source material to sharpen this existing Productize skill rather than routing to a duplicate skill.\n\n`;
  const template = readFileSync(templatePath, "utf8");
  if (!template.includes(marker)) {
    const output = template.includes("\n## Workflow")
      ? template.replace("\n## Workflow", `\n${hook}## Workflow`)
      : `${template.trimEnd()}\n\n${hook}`;
    writeIfChanged(templatePath, output);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.tags = unique([...(manifest.tags || []), ...merge.signals.map((item) => slugify(item))]);
  manifest.routing_signals = unique([...(manifest.routing_signals || []), ...merge.signals]);
  manifest.references = unique([...(manifest.references || []), `references/${referenceName}`]);
  manifest.framework_fit = cleanScalar(`${manifest.framework_fit || ""} PM-skills-main merge: ${merge.note}`);
  manifest.examples = Array.isArray(manifest.examples) && manifest.examples.length ? manifest.examples : [
    {
      prompt: `Use $${merge.target} for this product context and produce the expected artifact.`,
      expected_artifact: manifest.output_artifact || "Productize artifact",
    },
  ];
  writeIfChanged(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function stripSource(content) {
  let body = String(content).replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
  body = body.replace(/^#\s+.+\n+/, "");
  return body;
}

function frontmatterDescription(skill) {
  return `${skill.title}. ${skill.useWhen}`;
}

function legalGuardrail(skill) {
  if (!["draft-nda", "privacy-policy"].includes(skill.name)) return "";
  return `## Legal Review Guardrail\n\nThis skill creates a product/legal working draft for review. Do not present the output as legal advice or final compliance approval. Flag jurisdiction, data, party, and policy assumptions for qualified review.\n\n`;
}

function foldYaml(text) {
  const words = String(text).replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > 88) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines.map((item) => `  ${item}`).join("\n");
}

function toAscii(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\u2014/g, "--")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2192/g, "->")
    .replace(/\u00D7/g, "x")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function unique(items) {
  return [...new Set(items.map((item) => cleanScalar(item)).filter(Boolean))];
}

function writeIfChanged(file, content) {
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  if (existsSync(file) && readFileSync(file, "utf8") === normalized) return;
  writeText(file, normalized);
  changed += 1;
}
