export const genericOutputArtifacts = new Set([
  "Product work artifact",
  "Research brief or insight synthesis",
  "Strategy memo or decision brief",
  "Design critique, UX spec, or prototype brief",
  "PRD, roadmap, requirements, or execution plan",
  "Metric diagnosis, scorecard, or experiment plan",
  "Growth diagnosis or GTM action plan",
  "Stakeholder narrative, update, deck outline, or comms plan",
  "Agent-ready implementation brief or technical plan",
  "Launch/readout plan or learning loop",
]);

const genericPatterns = [
  /\bUse when the user needs [^.]+\.?$/i,
  /different lifecycle artifact, a purely technical implementation without product judgment/i,
  /Appropriate when the user's context matches the .+ method and the work should produce a concrete/i,
  /Produces generic advice that is not tied to the user's product stage, evidence, or decision pressure/i,
  /Fails to distinguish known facts from assumptions and risky missing evidence/i,
  /Routes to this skill when another Productize lifecycle skill would produce a sharper artifact/i,
  /produce the expected artifact/i,
  /^.+ artifact for .+$/i,
];

const concreteArtifactNouns = /\b(diagnosis|brief|memo|plan|scorecard|readout|model|map|canvas|playbook|roadmap|criteria|analysis|recommendation|decision|narrative|deck|workflow|report|spec|schema|matrix|draft|calculation|contract|guide|script|backlog|experiment|table|waterfall|cap table|valuation|forecast|audit|review)\b/i;

export function isGenericMetadataText(value) {
  const text = stringify(value);
  if (!text) return true;
  return genericPatterns.some((pattern) => pattern.test(text));
}

export function isSpecificArtifact(value) {
  const text = stringify(value);
  if (!text || genericOutputArtifacts.has(text)) return false;
  if (/^.+ artifact for .+$/i.test(text)) return false;
  if (text.length < 28) return false;
  return concreteArtifactNouns.test(text);
}

export function metadataQualityIssues({ skillName, manifest }) {
  const issues = [];
  for (const field of ["use_when", "do_not_use_when", "framework_fit"]) {
    const value = manifest[field];
    if (!stringify(value)) {
      issues.push(`${field} is missing`);
    } else if (isGenericMetadataText(value)) {
      issues.push(`${field} uses generic normalized placeholder text`);
    } else if (stringify(value).length < 70) {
      issues.push(`${field} is too thin to route safely`);
    }
  }

  if (!isSpecificArtifact(manifest.output_artifact)) {
    issues.push("output_artifact is not a specific product artifact");
  }

  if (!Array.isArray(manifest.failure_modes) || manifest.failure_modes.length < 3) {
    issues.push("failure_modes must contain at least three skill-specific risks");
  } else {
    manifest.failure_modes.forEach((failureMode, index) => {
      if (isGenericMetadataText(failureMode)) issues.push(`failure_modes[${index}] uses generic normalized placeholder text`);
      if (stringify(failureMode).length < 55) issues.push(`failure_modes[${index}] is too thin`);
    });
  }

  if (!Array.isArray(manifest.examples) || manifest.examples.length === 0) {
    issues.push("examples must include at least one routing example");
  } else {
    manifest.examples.forEach((example, index) => {
      const prompt = stringify(example?.prompt);
      const expectedArtifact = stringify(example?.expected_artifact);
      if (!prompt) issues.push(`examples[${index}].prompt is missing`);
      if (!expectedArtifact) issues.push(`examples[${index}].expected_artifact is missing`);
      if (isGenericMetadataText(prompt)) issues.push(`examples[${index}].prompt uses generic normalized placeholder text`);
      if (!isSpecificArtifact(expectedArtifact)) issues.push(`examples[${index}].expected_artifact is not specific`);
      if (prompt && !mentionsSkillConcept(prompt, skillName, manifest)) {
        issues.push(`examples[${index}].prompt does not mention a skill-specific concept`);
      }
    });
  }

  return issues;
}

export function specificOutputArtifact({ title, category, lifecycle }) {
  const cleanTitle = String(title || "Productize").trim();
  if (category === "Finance") return `${cleanTitle} calculation memo with formulas, assumptions, result, interpretation, and warnings`;
  if (category === "Decision Making") return `${cleanTitle} decision record with evidence, decision roles, risks, and recommendation`;
  if (category === "Venture / 0-1") return `${cleanTitle} venture brief with target segment, wedge, assumptions, and validation path`;
  if (category === "Business Model") return `${cleanTitle} business-model memo with value capture logic, risks, and next tests`;
  if (lifecycle === "Think") return `${cleanTitle} decision-framing brief with issue tree, assumptions, options, and recommended next step`;
  if (lifecycle === "Discover") return `${cleanTitle} research brief with evidence, insight clusters, assumptions, and next validation steps`;
  if (lifecycle === "Strategize") return `${cleanTitle} strategy memo with choices, tradeoffs, risks, and recommended next move`;
  if (lifecycle === "Design") return `${cleanTitle} UX/design review with findings, constraints, fixes, and acceptance checks`;
  if (lifecycle === "Plan") return `${cleanTitle} delivery brief with scope, requirements, priorities, risks, and acceptance criteria`;
  if (lifecycle === "Measure") return `${cleanTitle} analytics diagnosis with metric readout, caveats, decision, and next instrumented step`;
  if (lifecycle === "Growth") return `${cleanTitle} growth playbook with bottleneck, segment, experiments, triggers, and sustainability checks`;
  if (lifecycle === "Align") return `${cleanTitle} stakeholder narrative with audience, message, risks, asks, and follow-up owner`;
  if (lifecycle === "Build With AI") return `${cleanTitle} AI-builder handoff with implementation scope, verification plan, and risks`;
  if (lifecycle === "Launch & Learn") return `${cleanTitle} launch learning report with release evidence, feedback, decision, and next iteration`;
  return `${cleanTitle} product artifact with evidence, risks, recommendation, and next action`;
}

export function specificDoNotUseWhen({ title, category, lifecycle }) {
  return `Do not use ${title} when the request is mainly ${misrouteFor(category, lifecycle)}; route to the narrower Productize skill that owns that artifact instead. Do not use it when the user lacks enough context to distinguish facts, assumptions, and decision risk.`;
}

export function specificFrameworkFit({ title, category, lifecycle, outputArtifact }) {
  return `${title} fits ${category} work in the ${lifecycle} lifecycle when the user needs ${outputArtifact} and has enough product context to make tradeoffs explicit. Use it to produce a decision-ready artifact, not a framework tour.`;
}

export function specificFailureModes({ title, category, lifecycle, outputArtifact }) {
  return [
    `Produces ${outputArtifact} without tying recommendations to the user's ${lifecycle} stage, evidence, and decision pressure.`,
    `Treats ${title} as generic ${category} advice instead of naming assumptions, missing inputs, risks, and the next validation step.`,
    `Fails to route away from ${title} when another Productize skill owns the requested artifact more directly.`,
  ];
}

export function specificExample({ skillName, title, outputArtifact, routingSignals = [] }) {
  const signal = routingSignals.find((item) => item && item !== skillName) || title.toLowerCase();
  return {
    prompt: `Use $${skillName} to turn this ${signal} context into a decision-ready ${outputArtifact}.`,
    expected_artifact: outputArtifact,
  };
}

function misrouteFor(category, lifecycle) {
  if (category === "Finance") return "qualitative product discovery, PRD drafting, or stakeholder narrative work";
  if (category === "AI Execution") return "market strategy, research synthesis, finance modeling, or executive communication";
  if (category === "Design") return "metric diagnosis, pricing, GTM, or implementation planning without UX evidence";
  if (lifecycle === "Discover") return "delivery planning, analytics readout, or stakeholder communication";
  if (lifecycle === "Measure") return "early ideation, qualitative research, or roadmap writing without metrics";
  if (lifecycle === "Growth") return "generic marketing copy, product discovery, or finance valuation";
  if (lifecycle === "Align") return "technical implementation, analytics modeling, or UX critique";
  return "a different lifecycle artifact";
}

function mentionsSkillConcept(prompt, skillName, manifest) {
  const text = prompt.toLowerCase();
  const tokens = new Set([
    ...String(skillName).toLowerCase().split(/[^a-z0-9]+/),
    ...String(manifest.title || "").toLowerCase().split(/[^a-z0-9]+/),
    ...(manifest.routing_signals || []).flatMap((signal) => String(signal).toLowerCase().split(/[^a-z0-9]+/)),
  ].filter((token) => token.length > 3 && !["product", "skill", "with", "from", "this", "that", "into"].includes(token)));
  return [...tokens].some((token) => text.includes(token));
}

function stringify(value) {
  return String(value ?? "").trim();
}
