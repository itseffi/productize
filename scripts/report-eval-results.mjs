import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./lib/productize.mjs";

const rootArg = process.argv[2] || ".productize-evals";
const root = path.isAbsolute(rootArg) ? rootArg : path.join(repoRoot, rootArg);
const summaries = findSummaryFiles(root).map((file) => JSON.parse(readFileSync(file, "utf8")));

if (!summaries.length) {
  console.log(`# Productize Eval Report\n\nNo eval summaries found under ${root}.\n`);
  process.exit(0);
}

const total = summaries.reduce(
  (acc, summary) => {
    acc.cases += summary.cases || 0;
    acc.passed += summary.passed || 0;
    acc.failed += summary.failed || 0;
    acc.score += summary.score || 0;
    acc.max_score += summary.max_score || 0;
    acc.cost += summary.estimated_llm_cost_usd || 0;
    return acc;
  },
  { cases: 0, passed: 0, failed: 0, score: 0, max_score: 0, cost: 0 },
);

const lines = [
  "# Productize Eval Report",
  "",
  `- Cases: ${total.cases}`,
  `- Passed: ${total.passed}`,
  `- Failed: ${total.failed}`,
  `- Score: ${total.score}/${total.max_score}`,
  `- Estimated LLM cost: $${total.cost.toFixed(6)}`,
  "",
  "| Report | Cases | Passed | Failed | Score | Cost |",
  "|---|---:|---:|---:|---:|---:|",
];

for (const summary of summaries) {
  lines.push(
    `| ${summaryLabel(summary)} | ${summary.cases} | ${summary.passed} | ${summary.failed} | ${summary.score}/${summary.max_score} | $${Number(summary.estimated_llm_cost_usd || 0).toFixed(6)} |`,
  );
}

const failures = summaries.flatMap((summary) =>
  (summary.failures || []).map((failure) => ({
    report: summaryLabel(summary),
    ...failure,
  })),
);

if (failures.length) {
  lines.push("", "## Failures", "");
  for (const failure of failures) {
    lines.push(`- ${failure.report} ${failure.kind}/${failure.name}: ${failure.failed_checks.map((item) => item.name).join(", ")}`);
  }
}

console.log(`${lines.join("\n")}\n`);

function findSummaryFiles(dir) {
  if (!existsSync(dir)) return [];
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findSummaryFiles(absolute));
    if (entry.isFile() && entry.name === "summary.json") found.push(absolute);
  }
  return found.sort();
}

function summaryLabel(summary) {
  if (!summary.report_dir) return summary.run_id;
  return path.isAbsolute(summary.report_dir) ? path.relative(root, summary.report_dir) || summary.run_id : summary.report_dir;
}
