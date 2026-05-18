import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { route as runtimeRoute } from "../bin/productize-runtime.mjs";
import { routeProductizeSkills } from "../bin/productize-routing.mjs";
import { readAllSkills, repoRoot } from "../scripts/lib/productize.mjs";

const canonicalSkills = readAllSkills();
const registrySkills = JSON.parse(readFileSync(path.join(repoRoot, "registry", "skills.json"), "utf8"));

const cases = [
  {
    name: "0-1 product build loop",
    query:
      "Use productize-0-1 to build the first version of a new AI workflow product: scope capability, curate data, design evals, run evals, analyze failures, and apply fixes.",
    top: "0-1",
    lifecycle: "Think",
  },
  {
    name: "0-1 founder beachhead",
    query: "We are pre-seed and need to choose the first beachhead segment for a workflow automation idea",
    top: "beachhead-segment",
    lifecycle: "Strategize",
  },
  {
    name: "PLG bottleneck",
    query: "Our CAC is rising and activation is flat; diagnose the PLG growth bottleneck and PQL handoff",
    top: "plg-growth-playbook",
    lifecycle: "Growth",
  },
  {
    name: "messy transcript to PRD",
    query: "Write a PRD from this messy sales call transcript and design notes",
    top: "prds-from-industry-and-feature-specifications",
    lifecycle: "Plan",
  },
  {
    name: "CPO board update",
    query: "We need a board update narrative for an executive product review",
    top: "stakeholder-update",
    lifecycle: "Align",
  },
  {
    name: "PMF check",
    query: "Is this PMF? We have repeat usage but weak referrals",
    top: "product-market-fit-cycle",
    lifecycle: "Growth",
    disallowedTop: ["structured-product-strategy-from-product-context", "task-specific-product-strategy-design"],
  },
  {
    name: "AI builder handoff",
    query: "Create an agent-ready implementation spec and verification plan for an AI builder",
    top: "spec-writing",
    lifecycle: "Build With AI",
  },
  {
    name: "running implementation notes",
    query:
      "Implement this spec and maintain implementation-notes.html with decisions not in the spec, deviations, tradeoffs, open questions, and verification.",
    top: "implementation-notes",
    lifecycle: "Build With AI",
  },
  {
    name: "valuation deal pricing",
    query: "What should we pay for this company? Need enterprise value, equity value, and price per share",
    top: "valuation-and-deal-pricing",
    category: "Finance",
  },
  {
    name: "group decision quality",
    query: "The team is stuck in groupthink and needs a better decision process before the roadmap call",
    top: "group-decision-making-quality-review",
    category: "Decision Making",
  },
];

for (const testCase of cases) {
  const canonical = routeProductizeSkills(testCase.query, canonicalSkills, 5);
  const registry = routeProductizeSkills(testCase.query, registrySkills, 5);
  const runtime = runtimeRoute(testCase.query, 5);
  assert.ok(canonical.length, `${testCase.name}: canonical route returned no results`);
  assert.ok(registry.length, `${testCase.name}: registry route returned no results`);
  assert.ok(runtime.length, `${testCase.name}: runtime route returned no results`);
  assert.equal(canonical[0].skill.skillName, testCase.top, `${testCase.name}: canonical top route`);
  assert.equal(registry[0].skill.name, testCase.top, `${testCase.name}: registry top route`);
  assert.equal(runtime[0].skill.name, testCase.top, `${testCase.name}: runtime top route`);
  if (testCase.lifecycle) assert.equal(runtime[0].skill.lifecycle, testCase.lifecycle, `${testCase.name}: lifecycle`);
  if (testCase.category) assert.equal(runtime[0].skill.category, testCase.category, `${testCase.name}: category`);
  assert.ok(!testCase.disallowedTop?.includes(runtime[0].skill.name), `${testCase.name}: disallowed top route`);
}

for (const testCase of readRouterEvalCases()) {
  const routes = runtimeRoute(testCase.query, 8);
  const names = routes.map((route) => route.skill.name);
  const lifecycles = new Set(routes.map((route) => route.skill.lifecycle));
  if (testCase.expected_top_skill) {
    assert.equal(names[0], testCase.expected_top_skill, `${testCase.suite}/${testCase.name}: top route`);
  }
  if (testCase.expected_any_skills?.length) {
    assert.ok(
      testCase.expected_any_skills.some((skill) => names.includes(skill)),
      `${testCase.suite}/${testCase.name}: expected one of ${testCase.expected_any_skills.join(", ")}; got ${names.join(", ")}`,
    );
  }
  if (testCase.expected_lifecycles?.length) {
    assert.ok(
      testCase.expected_lifecycles.some((lifecycle) => lifecycles.has(lifecycle)),
      `${testCase.suite}/${testCase.name}: expected lifecycle ${testCase.expected_lifecycles.join(", ")}`,
    );
  }
}

console.log("Route regression tests passed.");

function readRouterEvalCases() {
  return readdirSync(path.join(repoRoot, "evals"))
    .filter((file) => file.endsWith("router-cases.json"))
    .sort()
    .flatMap((file) => JSON.parse(readFileSync(path.join(repoRoot, "evals", file), "utf8")).map((testCase) => ({ suite: file, ...testCase })));
}
