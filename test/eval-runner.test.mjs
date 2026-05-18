import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { repoRoot } from "../scripts/lib/productize.mjs";

const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "productize-eval-runner-test-"));

try {
  const reportDir = path.join(tmpRoot, "llm-report");
  const result = spawnSync(
    process.execPath,
    ["scripts/eval-productize.mjs", "--llm-only", "--llm-required", "--report-dir", reportDir],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PRODUCTIZE_LLM_EVAL_COMMAND: `${process.execPath} test/fixtures/fake-llm-eval.mjs {prompt}`,
        PRODUCTIZE_LLM_INPUT_COST_PER_1K: "0.001",
        PRODUCTIZE_LLM_OUTPUT_COST_PER_1K: "0.002",
      },
    },
  );
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  assert.equal(result.status, 0, output);

  const summaryPath = path.join(reportDir, "summary.json");
  const jsonlPath = path.join(reportDir, "results.jsonl");
  const markdownPath = path.join(reportDir, "summary.md");
  const artifactsPath = path.join(reportDir, "artifacts");
  assert.ok(existsSync(summaryPath), "summary.json should exist");
  assert.ok(existsSync(jsonlPath), "results.jsonl should exist");
  assert.ok(existsSync(markdownPath), "summary.md should exist");
  assert.ok(existsSync(artifactsPath), "artifacts directory should exist");

  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  assert.equal(summary.failed, 0);
  assert.equal(summary.cases, 9);
  assert.ok(summary.score > 0);
  assert.ok(summary.max_score >= summary.score);
  assert.ok(summary.estimated_llm_cost_usd > 0);
  assert.ok(summary.estimated_llm_input_tokens > 0);
  assert.ok(summary.estimated_llm_output_tokens > 0);
  assert.ok(summary.by_suite["llm:llm-cases.json"]);

  const resultLines = readFileSync(jsonlPath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(resultLines.length, summary.cases);
  assert.ok(resultLines.every((line) => line.kind === "llm"));
  assert.ok(resultLines.every((line) => line.metrics.estimated_cost_usd > 0));
  assert.ok(resultLines.every((line) => line.artifact_path));

  const artifactFiles = readdirSync(artifactsPath).filter((file) => file.endsWith(".json"));
  assert.equal(artifactFiles.length, summary.cases);

  const markdown = readFileSync(markdownPath, "utf8");
  assert.match(markdown, /Productize Eval Report/);
  assert.match(markdown, /Estimated LLM cost/);

  const report = spawnSync(process.execPath, ["scripts/report-eval-results.mjs", reportDir], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(report.status, 0, `${report.stdout || ""}${report.stderr || ""}`);
  assert.match(report.stdout, /Productize Eval Report/);
  assert.match(report.stdout, /9/);

  const noCostDefaultReport = path.join(tmpRoot, "default-report");
  const noCostDefault = spawnSync(process.execPath, ["scripts/eval-productize.mjs", "--report-dir", noCostDefaultReport], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PRODUCTIZE_LLM_EVAL_COMMAND: `${process.execPath} -e "process.exit(42)" {prompt}`,
    },
  });
  assert.equal(noCostDefault.status, 0, `${noCostDefault.stdout || ""}${noCostDefault.stderr || ""}`);
  const noCostSummary = JSON.parse(readFileSync(path.join(noCostDefaultReport, "summary.json"), "utf8"));
  assert.equal(noCostSummary.estimated_llm_input_tokens, 0);
  assert.equal(noCostSummary.estimated_llm_output_tokens, 0);
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

console.log("Eval runner tests passed.");
