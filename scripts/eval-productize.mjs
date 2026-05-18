import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { readAllSkills, repoRoot, routeSkillForText } from "./lib/productize.mjs";

const options = parseArgs(process.argv.slice(2));
const explicitMode =
  options.flags.has("--router-only") ||
  options.flags.has("--e2e") ||
  options.flags.has("--e2e-only") ||
  options.flags.has("--llm") ||
  options.flags.has("--llm-only") ||
  options.flags.has("--llm-required");

const reportDir = resolveReportDir(options.values.get("--report-dir") || process.env.PRODUCTIZE_EVAL_REPORT_DIR);
const artifactsDir = path.join(reportDir, "artifacts");
const startedAt = new Date();
const results = [];

mkdirSync(artifactsDir, { recursive: true });
writeFileSync(path.join(reportDir, "results.jsonl"), "");

if (options.flags.has("--router-only") || (!options.flags.has("--e2e-only") && !options.flags.has("--llm-only"))) {
  runRouterEvals();
}
if (options.flags.has("--e2e") || options.flags.has("--e2e-only") || (!explicitMode && !options.flags.has("--router-only"))) {
  runSidecarEvals();
}
if (
  options.flags.has("--llm") ||
  options.flags.has("--llm-only") ||
  options.flags.has("--llm-required")
) {
  runLlmEvals({ required: options.flags.has("--llm-required") });
}

const summary = writeSummary();
if (summary.failed > 0) {
  throw new Error(`${summary.failed} Productize eval case(s) failed. See ${reportDir}`);
}

console.log(
  `Productize evals passed: ${summary.passed}/${summary.cases} cases, score ${summary.score}/${summary.max_score}. Report: ${reportDir}`,
);

function runRouterEvals() {
  const cases = readRouterCases();
  const skills = readAllSkills();
  for (const testCase of cases) {
    const caseStarted = Date.now();
    const routes = routeSkillForText(testCase.query, skills, 8);
    const skillNames = routes.map((route) => route.skill.skillName);
    const lifecycles = new Set(routes.map((route) => route.skill.lifecycle));
    const checks = [];

    checks.push(check("router returned candidates", routes.length > 0, { weight: 1, actual: routes.length }));
    if (testCase.expected_lifecycles?.length) {
      checks.push(
        check(
          "expected lifecycle present",
          testCase.expected_lifecycles.some((lifecycle) => lifecycles.has(lifecycle)),
          {
            weight: 2,
            expected: testCase.expected_lifecycles,
            actual: [...lifecycles],
          },
        ),
      );
    }
    if (testCase.expected_any_skills?.length) {
      checks.push(
        check(
          "expected skill present",
          testCase.expected_any_skills.some((name) => skillNames.includes(name)),
          {
            weight: 3,
            expected: testCase.expected_any_skills,
            actual: skillNames,
          },
        ),
      );
    }
    if (testCase.expected_top_skill) {
      checks.push(
        check("expected top skill", skillNames[0] === testCase.expected_top_skill, {
          weight: 4,
          expected: testCase.expected_top_skill,
          actual: skillNames[0],
        }),
      );
    }
    if (testCase.disallowed_top_lifecycles?.length) {
      checks.push(
        check(!testCase.disallowed_top_lifecycles.includes(routes[0]?.skill.lifecycle), {
          name: "disallowed lifecycle avoided",
          weight: 2,
          expected: `not ${testCase.disallowed_top_lifecycles.join(", ")}`,
          actual: routes[0]?.skill.lifecycle,
        }),
      );
    }

    recordCase({
      suite: testCase.suite,
      kind: "router",
      name: testCase.name,
      input: { query: testCase.query },
      output: routes.map((route) => ({
        skill: route.skill.skillName,
        lifecycle: route.skill.lifecycle,
        category: route.skill.category,
        score: route.score,
      })),
      checks,
      durationMs: Date.now() - caseStarted,
    });
  }
}

function readRouterCases() {
  return readdirSync(path.join(repoRoot, "evals"))
    .filter((file) => file.endsWith("router-cases.json"))
    .sort()
    .flatMap((file) => readJson(path.join("evals", file)).map((testCase) => ({ suite: file, ...testCase })));
}

function runSidecarEvals() {
  const cases = readJson("evals/e2e-cases.json");
  for (const testCase of cases) {
    const caseStarted = Date.now();
    const [command, ...commandArgs] = testCase.command;
    const result = spawnSync(path.join(repoRoot, command), commandArgs, {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, PRODUCTIZE_STATE_DIR: path.join(repoRoot, ".tmp-productize-eval") },
    });
    const output = `${result.stdout || ""}${result.stderr || ""}`;
    const checks = [
      check("command exits successfully", result.status === 0, {
        weight: 2,
        expected: 0,
        actual: result.status,
        message: output,
      }),
      check("output is nonempty", output.trim().length > 0, { weight: 1 }),
      ...containsChecks(output, testCase.must_contain, { prefix: "required output", flags: "" }),
      ...mustNotContainChecks(output, testCase.must_not_contain, { prefix: "forbidden output", flags: "" }),
      ...rubricChecks(output, testCase.rubric),
    ];

    recordCase({
      suite: "e2e-cases.json",
      kind: "e2e",
      name: testCase.name,
      input: { command: testCase.command },
      output,
      checks,
      durationMs: Date.now() - caseStarted,
    });
  }
}

function runLlmEvals({ required }) {
  const commandTemplate = process.env.PRODUCTIZE_LLM_EVAL_COMMAND;
  if (!commandTemplate) {
    if (required) {
      throw new Error("PRODUCTIZE_LLM_EVAL_COMMAND is required for Productize LLM evals.");
    }
    return;
  }
  if (!commandTemplate.includes("{prompt}")) {
    throw new Error("PRODUCTIZE_LLM_EVAL_COMMAND must include a {prompt} placeholder.");
  }

  const cases = readJson("evals/llm-cases.json");
  for (const testCase of cases) {
    const caseStarted = Date.now();
    const command = commandTemplate.replaceAll("{prompt}", shellSafe(testCase.prompt));
    const result = spawnSync(command, {
      cwd: repoRoot,
      encoding: "utf8",
      shell: true,
      env: process.env,
    });
    const output = `${result.stdout || ""}${result.stderr || ""}`;
    const checks = [
      check("LLM command exits successfully", result.status === 0, {
        weight: 2,
        expected: 0,
        actual: result.status,
        message: output,
      }),
      ...containsChecks(output, testCase.must_contain, { prefix: "required artifact content", flags: "i" }),
      ...mustNotContainChecks(output, testCase.must_not_contain, { prefix: "forbidden artifact content", flags: "i" }),
      ...rubricChecks(output, defaultLlmRubric(testCase).concat(testCase.rubric || [])),
    ];

    recordCase({
      suite: "llm-cases.json",
      kind: "llm",
      name: testCase.name,
      input: { prompt: testCase.prompt },
      output,
      checks,
      durationMs: Date.now() - caseStarted,
      metrics: estimateLlmCost(testCase.prompt, output),
    });
  }
}

function defaultLlmRubric() {
  return [
    {
      name: "states route or skill decision",
      pattern: "\\b(Route|Routed|Skill|Use)\\b",
      weight: 1,
    },
    {
      name: "states evidence, assumptions, missing inputs, or risks",
      pattern: "\\b(Evidence|known|assumption|assumed|missing|risk|risky)\\b",
      weight: 1,
    },
    {
      name: "states concrete next action or handoff",
      pattern: "\\b(Next action|owner|validation|metric|handoff|decision|recommendation)\\b",
      weight: 1,
    },
    {
      name: "avoids generic strategy filler",
      must_not_contain: ["generic strategy", "best practices", "synergy", "quick wins"],
      weight: 1,
    },
  ];
}

function containsChecks(output, values = [], { prefix, flags }) {
  return values.map((value) =>
    check(`${prefix}: ${value}`, new RegExp(escapeRegex(value), flags).test(output), {
      weight: 1,
      expected: value,
      actual: truncate(output, 500),
    }),
  );
}

function mustNotContainChecks(output, values = [], { prefix, flags }) {
  return values.map((value) =>
    check(`${prefix}: ${value}`, !new RegExp(escapeRegex(value), flags).test(output), {
      weight: 1,
      expected: `not ${value}`,
      actual: truncate(output, 500),
    }),
  );
}

function rubricChecks(output, rubric = []) {
  return rubric.map((item) => {
    const weight = item.weight ?? 1;
    const flags = item.flags ?? "i";
    if (item.pattern) {
      return check(item.name || `matches ${item.pattern}`, new RegExp(item.pattern, flags).test(output), {
        weight,
        required: item.required ?? true,
        expected: item.pattern,
        actual: truncate(output, 500),
      });
    }
    if (item.must_contain?.length) {
      const missing = item.must_contain.filter((value) => !new RegExp(escapeRegex(value), flags).test(output));
      return check(item.name || `contains ${item.must_contain.join(", ")}`, missing.length === 0, {
        weight,
        required: item.required ?? true,
        expected: item.must_contain,
        actual: truncate(output, 500),
        message: missing.length ? `Missing: ${missing.join(", ")}` : undefined,
      });
    }
    if (item.any_contain?.length) {
      const matched = item.any_contain.some((value) => new RegExp(escapeRegex(value), flags).test(output));
      return check(item.name || `contains one of ${item.any_contain.join(", ")}`, matched, {
        weight,
        required: item.required ?? true,
        expected: item.any_contain,
        actual: truncate(output, 500),
      });
    }
    if (item.must_not_contain?.length) {
      const found = item.must_not_contain.filter((value) => new RegExp(escapeRegex(value), flags).test(output));
      return check(item.name || `excludes ${item.must_not_contain.join(", ")}`, found.length === 0, {
        weight,
        required: item.required ?? true,
        expected: `not ${item.must_not_contain.join(", ")}`,
        actual: truncate(output, 500),
        message: found.length ? `Found: ${found.join(", ")}` : undefined,
      });
    }
    return check(item.name || "rubric item is configured", false, {
      weight,
      required: true,
      message: "Rubric item must define pattern, must_contain, any_contain, or must_not_contain.",
    });
  });
}

function check(nameOrPassed, passedOrOptions, maybeOptions = {}) {
  let name = nameOrPassed;
  let passed = passedOrOptions;
  let options = maybeOptions;
  if (typeof nameOrPassed === "boolean") {
    passed = nameOrPassed;
    options = passedOrOptions || {};
    name = options.name;
  }
  const weight = options.weight ?? 1;
  return {
    name,
    status: passed ? "passed" : "failed",
    required: options.required ?? true,
    weight,
    score: passed ? weight : 0,
    expected: options.expected,
    actual: options.actual,
    message: passed ? undefined : options.message || `${name} failed`,
  };
}

function recordCase({ suite, kind, name, input, output, checks, durationMs, metrics = {} }) {
  const requiredFailures = checks.filter((item) => item.required !== false && item.status !== "passed");
  const status = requiredFailures.length ? "failed" : "passed";
  const maxScore = checks.reduce((sum, item) => sum + item.weight, 0);
  const score = checks.reduce((sum, item) => sum + item.score, 0);
  const artifactPath = path.join(artifactsDir, `${safeFileName(`${kind}-${suite}-${name}`)}.json`);
  const result = {
    suite,
    kind,
    name,
    status,
    score,
    max_score: maxScore,
    duration_ms: durationMs,
    checks,
    input,
    output_sample: typeof output === "string" ? truncate(output, 1200) : output,
    artifact_path: path.relative(reportDir, artifactPath),
    metrics,
  };
  const artifact = {
    ...result,
    output,
  };
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  results.push(result);
  writeFileSync(path.join(reportDir, "results.jsonl"), `${results.map((item) => JSON.stringify(item)).join("\n")}\n`);
}

function writeSummary() {
  const endedAt = new Date();
  const summary = {
    run_id: process.env.GITHUB_RUN_ID || startedAt.toISOString().replaceAll(/[:.]/g, "-"),
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_ms: endedAt.getTime() - startedAt.getTime(),
    report_dir: reportDir,
    cases: results.length,
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    score: results.reduce((sum, result) => sum + result.score, 0),
    max_score: results.reduce((sum, result) => sum + result.max_score, 0),
    estimated_llm_cost_usd: roundMoney(results.reduce((sum, result) => sum + (result.metrics.estimated_cost_usd || 0), 0)),
    estimated_llm_input_tokens: results.reduce((sum, result) => sum + (result.metrics.estimated_input_tokens || 0), 0),
    estimated_llm_output_tokens: results.reduce((sum, result) => sum + (result.metrics.estimated_output_tokens || 0), 0),
    by_suite: summarizeBySuite(results),
    failures: results
      .filter((result) => result.status === "failed")
      .map((result) => ({
        suite: result.suite,
        kind: result.kind,
        name: result.name,
        failed_checks: result.checks
          .filter((item) => item.required !== false && item.status !== "passed")
          .map((item) => ({ name: item.name, message: item.message, expected: item.expected, actual: item.actual })),
        artifact_path: result.artifact_path,
      })),
  };
  summary.pass_rate = summary.cases ? Number((summary.passed / summary.cases).toFixed(4)) : 0;
  summary.score_rate = summary.max_score ? Number((summary.score / summary.max_score).toFixed(4)) : 0;
  writeFileSync(path.join(reportDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(path.join(reportDir, "summary.md"), renderSummaryMarkdown(summary));
  return summary;
}

function summarizeBySuite(items) {
  const suites = new Map();
  for (const item of items) {
    const key = `${item.kind}:${item.suite}`;
    const current = suites.get(key) || { cases: 0, passed: 0, failed: 0, score: 0, max_score: 0 };
    current.cases += 1;
    if (item.status === "passed") current.passed += 1;
    if (item.status === "failed") current.failed += 1;
    current.score += item.score;
    current.max_score += item.max_score;
    suites.set(key, current);
  }
  return Object.fromEntries(
    [...suites.entries()].map(([suite, value]) => [
      suite,
      {
        ...value,
        score_rate: value.max_score ? Number((value.score / value.max_score).toFixed(4)) : 0,
      },
    ]),
  );
}

function renderSummaryMarkdown(summary) {
  const lines = [
    "# Productize Eval Report",
    "",
    `- Cases: ${summary.cases}`,
    `- Passed: ${summary.passed}`,
    `- Failed: ${summary.failed}`,
    `- Score: ${summary.score}/${summary.max_score} (${Math.round(summary.score_rate * 100)}%)`,
    `- Estimated LLM cost: $${summary.estimated_llm_cost_usd.toFixed(6)}`,
    `- Report directory: ${summary.report_dir}`,
    "",
    "## Suites",
    "",
    "| Suite | Cases | Passed | Failed | Score |",
    "|---|---:|---:|---:|---:|",
  ];
  for (const [suite, value] of Object.entries(summary.by_suite)) {
    lines.push(`| ${suite} | ${value.cases} | ${value.passed} | ${value.failed} | ${value.score}/${value.max_score} |`);
  }
  if (summary.failures.length) {
    lines.push("", "## Failures", "");
    for (const failure of summary.failures) {
      lines.push(`- ${failure.kind}/${failure.name}: ${failure.failed_checks.map((item) => item.name).join(", ")}`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function estimateLlmCost(prompt, output) {
  const inputTokens = estimateTokens(prompt);
  const outputTokens = estimateTokens(output);
  const inputCost = Number(process.env.PRODUCTIZE_LLM_INPUT_COST_PER_1K || 0);
  const outputCost = Number(process.env.PRODUCTIZE_LLM_OUTPUT_COST_PER_1K || 0);
  return {
    estimated_input_tokens: inputTokens,
    estimated_output_tokens: outputTokens,
    input_cost_per_1k_usd: inputCost,
    output_cost_per_1k_usd: outputCost,
    estimated_cost_usd: roundMoney((inputTokens / 1000) * inputCost + (outputTokens / 1000) * outputCost),
  };
}

function estimateTokens(text) {
  return Math.ceil(String(text || "").length / 4);
}

function roundMoney(value) {
  return Number(value.toFixed(8));
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function parseArgs(argv) {
  const flags = new Set();
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.includes("=")) {
      const [key, ...valueParts] = arg.split("=");
      flags.add(key);
      values.set(key, valueParts.join("="));
    } else if (arg === "--report-dir") {
      flags.add(arg);
      values.set(arg, argv[index + 1]);
      index += 1;
    } else {
      flags.add(arg);
    }
  }
  return { flags, values };
}

function resolveReportDir(value) {
  const requested = value || path.join(".productize-evals", "latest");
  return path.isAbsolute(requested) ? requested : path.join(repoRoot, requested);
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160);
}

function truncate(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shellSafe(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}
