export const lifecycleRoutingBoosts = Object.freeze([
  [/idea|founder|wedge|opportunity|startup|venture/, "Think"],
  [/research|interview|jtbd|customer|persona|icp|survey/, "Discover"],
  [/position|market|moat|strategy|competitor|business model|blue ocean/, "Strategize"],
  [/design|prototype|\bux\b|\bui\b|wireframe|figma|accessibility/, "Design"],
  [/prd|spec|requirement|roadmap|okr|prioriti|plan/, "Plan"],
  [/metric|pmf|dashboard|funnel|experiment|retention|churn|analytics|data/, "Measure"],
  [/valuation|deal pricing|enterprise value|equity value|dcf|npv|irr|wacc|capm|cost of capital|capital structure|cap table|dilution|convertible note|safe|preferred stock|option pool/, "Measure"],
  [/growth|gtm|go to market|brand|lifecycle|activation|referral/, "Growth"],
  [/stakeholder|exec|deck|narrative|update|communication|meeting/, "Align"],
  [/ai|agent|architecture|handoff|technical|build|code|verification|implementation notes|implementation-notes/, "Build With AI"],
  [/launch|feedback|support|qa|release|post-launch|learn/, "Launch & Learn"],
]);

export const skillRoutingBoosts = Object.freeze([
  [/0[- ]?1|zero[- ]to[- ]one|zero to one|raw idea.*build|build.*first product|first product slice|first version|new product.*build|mvp.*eval|scope capability|curate data.*eval|design evals.*run evals|apply fixes.*repeat/, "0-1", 720],
  [/productize[- ]operate|\boperate\b|production deploy|live product|operating cadence|health review|incident triage|support themes|production monitoring|post deploy/, "operate", 700],
  [/productize[- ]grow|\bgrow playbook\b|run grow|stable product.*activation|stable activation|growth target hit|growth target.*pivot/, "grow", 700],
  [/productize[- ]autoplan|\bautoplan\b|run.*reviewers|which gates|review router|gate matrix|all relevant reviewers|meta runner|review order/, "autoplan", 720],
  [/productize[- ]thesis[- ]review|thesis[- ]review|thesis review|product thesis|market thesis|strategic challenge|new bet|wedge.*positioning|positioning.*pricing|kill decision/, "thesis-review", 620],
  [/productize[- ]product[- ]review|(?:use|run|call|do)\s+(?:the\s+)?product review|product[- ]review|product gate|pm review|requirements review|scope review|product judgment|feature scope|prd review/, "product-review", 620],
  [/productize[- ]design[- ]review|design[- ]review|design review|design gate|visual qa|ux review|experience review|responsive behavior|design handoff|ui polish/, "design-review", 620],
  [/productize[- ]eng[- ]review|eng[- ]review|eng review|engineering review|architecture review|technical review|data flow|implementation risk|build readiness|system boundaries/, "eng-review", 620],
  [/productize[- ]qa|(?:use|run|call|do)\s+(?:the\s+)?qa\b|qa gate|quality gate|verification evidence|regression risk|retest|eval results/, "qa", 620],
  [/productize[- ]release|ship gate|ship readiness|deployment decision|staged release|go no-go|rollback path|launch coordination/, "release", 620],
  [/productize[- ]docs|docs gate|documentation gate|docs consistency|update docs|documentation review|migration notes|help content|readme.*guide/, "docs", 620],
  [/productize[- ]dx[- ]review|dx[- ]review|dx review|developer experience|api review|cli review|sdk review|developer onboarding|time to hello world|integration friction|error messages/, "dx-review", 620],
  [/productize[- ]comms[- ]review|comms[- ]review|comms review|communications gate|stakeholder narrative|executive update|customer announcement|launch message|audience map|message review/, "comms-review", 620],
  [/implementation[- ]notes(?:\.(?:html|md))?|running implementation notes|running notes.*implement|decisions.*not.*spec|spec ambiguit|deviations.*spec|tradeoffs.*implement|open questions.*implement|keep.*loop.*implement/, "implementation-notes", 640],
  [/product[- ]market fit|\bpmf\b|is this pmf|sales pull|repeat usage/, "product-market-fit-cycle", 620],
  [/\ba\/b\b|ab test|split test|experiment results|statistical significance|sample ratio mismatch|ship.*variant|extend.*test/, "ab-test-analysis", 440],
  [/cohort|retention curve|signup month|feature adoption trend|cohort retention|engagement cohort/, "cohort-analysis", 420],
  [/north star|nsm|input metrics|metrics constellation|business game|one metric that matters/, "north-star-metric", 420],
  [/\bcac\b|\bltv\b|customer acquisition cost|payback|growth bottleneck|acquisition cost|rising acquisition/, "aarrr-growth-diagnostics", 420],
  [/growth loop|growth loops|flywheel|viral loop|referral loop|collaboration loop|product-led traction/, "growth-loops", 430],
  [/plg growth playbook|product-led growth playbook|product led growth diagnosis|pql|product qualified lead|growth pod|lifecycle triggers|behavior-triggered|behavior triggered/, "plg-growth-playbook", 520],
  [/gtm motion|go-to-market motion|sales-led|sales led|product-led|plg|abm|partner motion|inbound vs outbound|outbound vs inbound/, "gtm-motions", 430],
  [/full gtm|go-to-market plan|gtm strategy|launch strategy|market launch plan|launch timeline.*channels/, "gtm-strategy", 400],
  [/beachhead|first customer segment|first market segment|market entry segment|initial customer segment|entry wedge/, "beachhead-segment", 450],
  [/\btam\b|\bsam\b|\bsom\b|market sizing|addressable market|serviceable market|market size/, "market-sizing", 420],
  [/pricing strategy|pricing model|price point|willingness to pay|price elasticity|freemium.*paid|packaging tiers/, "pricing-strategy", 420],
  [/monetization|revenue model|how.*make money|subscription vs usage|usage-based|marketplace fee|capture value/, "monetization-strategy", 420],
  [/product vision|vision statement|future state|inspiring vision|align.*vision/, "product-vision", 390],
  [/lean canvas|problem solution canvas|uvp|unfair advantage|riskiest assumptions/, "lean-canvas", 420],
  [/startup canvas|startup concept|founder canvas|0-to-1 canvas|new venture canvas/, "startup-canvas", 420],
  [/pre[- ]mortem|premortem|what could go wrong|go\/no-go|go no-go|launch risk|stress-test.*launch|stress test.*prd/, "pre-mortem", 430],
  [/release notes|changelog|product update copy|what shipped|user-facing update/, "release-notes", 430],
  [/outcome roadmap|outcome-focused roadmap|feature roadmap.*outcome|rewrite.*roadmap.*outcome/, "outcome-roadmap", 420],
  [/\brice\b|\bice\b|\bkano\b|moscow|prioritization framework|opportunity score|impact effort|cost of delay/, "prioritization-frameworks", 420],
  [/feature requests|request triage|customer requests|stakeholder requests|triage.*backlog|prioritize.*requests/, "analyze-feature-requests", 420],
  [/test scenarios|test cases|qa scenarios|acceptance tests|coverage matrix|happy path.*edge cases/, "test-scenarios", 420],
  [/why[- ]what[- ]acceptance|\bwwa\b|wwas|why what acceptance|backlog items.*strategic context/, "wwas", 420],
  [/\bnda\b|non-disclosure|nondisclosure|confidentiality agreement|mutual nda/, "draft-nda", 400],
  [/privacy policy|data collection policy|gdpr policy|privacy notice|data practices/, "privacy-policy", 400],
  [/valuation|deal pricing|what.*worth|what should we pay|enterprise value|equity value|price per share|comparable company|precedent transaction|exit multiple/, "valuation-and-deal-pricing", 620],
  [/project valuation|project npv|investment decision|free cash flow|terminal value|gordon growth|growing perpetuity|\bnpv\b|\birr\b|payback|profitability index|sunk cost|cannibalization/, "managerial-finance-dcf", 560],
  [/cost of capital|discount rate|\bwacc\b|\bcapm\b|cost of equity|beta|market risk premium|risk-free|risk free|systematic risk|unlever beta|relever beta/, "risk-return-cost-of-capital", 560],
  [/capital structure|debt versus equity|debt vs equity|apv|tax shield|bond price|yield to maturity|credit spread|leverage|ipo|seo|warrant|covenant/, "capital-structure-financing", 540],
  [/vc deal|venture capital|pre-money|post-money|cap table|dilution|convertible note|safe|option pool|preferred stock|liquidation preference|runway|burn rate|term sheet/, "venture-capital-deal-modeling", 600],
  [/market cap|market capitalization|index weight|market portfolio|public comparables|listed firms|sector shift|index concentration|global market weight/, "financial-markets-context", 500],
  [/formula validation|finance formula|finance calculation engine|finance modeling kernel|cash flows at different dates|units check|finance guardrails/, "finance-modeling-kernel", 520],
  [/strategic decision making|decision quality|bounded rational|system 1|system 2|satisficing|base rate|representativeness|availability heuristic|anchoring|framing effect|confirmation bias|sunk cost|status quo bias|optimism bias|loss aversion|risk aversion/, "strategic-decision-making-quality-review", 560],
  [/innovation heuristic|decision heuristic|decision rules|simple rules|rules of thumb|tailored heuristic|noisy uncertain decision|time-sensitive decision|time sensitive decision|pivot rule/, "innovation-decision-making-heuristics", 520],
  [/visual decision|decision visualization|visual bias|chart bias|misleading chart|graph validity|visual overconfidence|visual anchor|dashboard.*bias|slide.*bias/, "visual-decision-making-review", 520],
  [/group decision|groupthink|group polarization|conformity bias|authority bias|common information effect|private voting|silent write|devil.?s advocate|consensus without conflict/, "group-decision-making-quality-review", 560],
  [/role identity|logic of appropriateness|organizational identity|social categorization|in-group|out-group|role pressure|wearing hats|cross-functional decision|this is how we have always done it/, "role-identity-decision-making-map", 540],
  [/activation|onboarding|time[- ]to[- ]value|first successful|setup completion/, "onboarding-flow-optimization-from-product-data-to-user-success", 340],
  [/churn|retention.*strong|retention.*weak|cancellation|pricing change|retention looks better/, "churn-reduction-from-customer-data-and-exit-survey-analysis", 420],
  [/support ticket|support tickets|ticket themes|support volume|product themes|prioritized improvements/, "support-tickets-as-actionable-product-improvements", 420],
  [/launched.*missed|missed adoption|feature.*adoption|iterate.*rollback|rollback.*kill|analyze.*results/, "feature-results-analysis-from-draft-to-final-report", 380],
  [/post[- ]launch|after launch|launched feature|v2 improvements|learning loop/, "post-launch-feedback-loop", 320],
  [/roadmap debate|sales wants|engineering wants|customers want|options.*tradeoffs|tradeoffs.*recommendation|decision memo/, "roadmap-update", 360],
  [/prioritize.*roadmap|requirements prioritization|p0|p1|p2|scope tradeoff/, "requirements-prioritization-with-p0-p1-p2-framework", 300],
  [/workflow is confusing|confusing workflow|completion dropped|usability|ux review|design fixes/, "design-critique", 360],
  [/workflow is confusing|confusing workflow|edge cases|completion dropped/, "ux-edge-cases-from-product-briefs", 260],
  [/dashboard metrics disagree|warehouse data|data validation|validate.*data|metrics.*warehouse|aggregation logic/, "validate-data", 380],
  [/dashboard metrics|metrics review|product health|metric review/, "metrics-review", 300],
  [/expand to|deepen .*workflow|deepen .*workflows|adjacent segment|segment expansion/, "market-opportunity", 360],
  [/where should we play|which market|market opportunity|choose.*wedge|beachhead|first customer segment|0-to-1 wedge/, "market-opportunity", 380],
  [/niche|narrow segment|beachhead|first customer segment/, "defining-the-niche-from-user-input", 260],
  [/job stor|jtbd|interview transcript/, "actionable-job-stories-from-interview-transcripts", 360],
  [/risky assumption|riskiest assumption|assumption.*validation/, "risky-assumption-prioritization-for-rapid-validation", 300],
  [/messy transcript|conversation transcript|sales calls|design reviews/, "structured-requirements-from-conversation-transcripts", 340],
  [/\bprd\b|product requirement|requirements doc|v0 spec|mvp spec/, "prds-from-industry-and-feature-specifications", 340],
  [/board update|board narrative|executive update|exec update|investor update|leadership narrative|leadership update/, "stakeholder-update", 680],
  [/board|deck|narrative|storyline|investor update/, "slide-decks-from-problem-statements-and-context", 320],
  [/agent-ready|coding-agent|agent handoff|implementation spec|eval plan|verification plan|ai builder|ai pm/, "dual-mode-ai-coding-assistant-staff-eng-intern", 360],
  [/implementation spec|technical spec|architecture risk|interfaces|system design/, "spec-writing", 320],
  [/verification|test plan|acceptance criteria|quality gate/, "verification", 260],
]);

export function routeProductizeSkills(query, skills = [], limit = 5) {
  const normalized = normalizeRouteQuery(query);
  const terms = routeTerms(normalized);
  return [...skills]
    .map((skill) => ({ skill, score: scoreProductizeSkillWithQuery(skill, normalized, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || skillRouteName(a.skill).localeCompare(skillRouteName(b.skill)))
    .slice(0, limit);
}

export function scoreProductizeSkill(skill, query) {
  const normalized = normalizeRouteQuery(query);
  return scoreProductizeSkillWithQuery(skill, normalized, routeTerms(normalized));
}

function scoreProductizeSkillWithQuery(skill, normalized, terms) {
  if (!normalized) return 0;
  const fields = [
    [skillRouteName(skill), 8],
    [skill.title, 6],
    [skill.category, 3],
    [skill.lifecycle, 5],
    [skill.outputArtifact ?? skill.output_artifact, 4],
    [arrayText(skill.tags), 5],
    [arrayText(skill.routingSignals ?? skill.routing_signals), 7],
    [skill.useWhen ?? skill.use_when, 5],
    [frontmatterDescription(skill.content), 3],
  ];
  let score = 0;
  for (const [field, weight] of fields) {
    const text = cleanRouteScalar(field).toLowerCase();
    if (!text) continue;
    if (text.includes(normalized)) score += weight * 4;
    for (const term of terms) {
      if (text.includes(term)) score += weight;
    }
  }
  for (const [pattern, lifecycle] of lifecycleRoutingBoosts) {
    if (pattern.test(normalized) && cleanRouteScalar(skill.lifecycle) === lifecycle) score += 200;
  }
  const name = skillRouteName(skill);
  for (const [pattern, skillName, boost] of skillRoutingBoosts) {
    if (pattern.test(normalized) && name === skillName) score += boost;
  }
  return score;
}

export function skillRouteName(skill) {
  return cleanRouteScalar(skill?.skillName ?? skill?.name);
}

function normalizeRouteQuery(query) {
  return cleanRouteScalar(query).toLowerCase();
}

function routeTerms(normalized) {
  return normalized.split(/[^a-z0-9]+/).filter((term) => term.length > 2);
}

function arrayText(value) {
  return Array.isArray(value) ? value.join(" ") : "";
}

function cleanRouteScalar(value) {
  return String(value ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

function frontmatterDescription(content) {
  if (!content) return "";
  const match = String(content).match(/^---\n([\s\S]*?)\n---/);
  if (!match) return "";
  const lines = match[1].split(/\r?\n/);
  const description = [];
  let capturing = false;
  for (const line of lines) {
    if (capturing) {
      if (/^\s+/.test(line)) {
        description.push(line.trim());
        continue;
      }
      break;
    }
    if (!line.startsWith("description:")) continue;
    const rest = line.slice("description:".length).trim();
    if (rest === ">-" || rest === ">" || rest === "|" || rest === "|-") {
      capturing = true;
    } else {
      return cleanRouteScalar(rest);
    }
  }
  return description.join(" ");
}
