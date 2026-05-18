import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { routeProductizeSkills } from "./productize-routing.mjs";

process.umask?.(0o077);

export const productizeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const registryFile = path.join(productizeRoot, "registry", "skills.json");
export const versionFile = path.join(productizeRoot, "VERSION");

export function stateDir() {
  return path.resolve(process.env.PRODUCTIZE_STATE_DIR || path.join(process.cwd(), ".productize"));
}

export function ensureStateDir() {
  mkdirSync(stateDir(), { recursive: true });
  return stateDir();
}

export function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function appendJsonl(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify({ timestamp: new Date().toISOString(), cwd: process.cwd(), ...value })}\n`, "utf8");
}

export function readRegistry() {
  return readJson(registryFile, []);
}

export function route(query, limit = 5) {
  const skills = readRegistry();
  return routeProductizeSkills(query, skills, limit);
}

export function searchRegistry(query, limit = 10) {
  return route(query, limit).map(({ skill, score }) => ({ score, ...skill }));
}

export function printRoutes(routes) {
  for (const { skill, score } of routes) {
    console.log(`${skill.name}\t${score}\t${skill.lifecycle}\t${skill.category}\t${skill.title}`);
  }
}

export function recordRoutingDecision(query, routes, source = "router") {
  const file = path.join(ensureStateDir(), "routing-log.jsonl");
  appendJsonl(file, {
    event: "route_resolved",
    source,
    query,
    routes: routes.map(({ skill, score }) => ({
      score,
      name: skill.name,
      title: skill.title,
      lifecycle: skill.lifecycle,
      category: skill.category,
      output_artifact: skill.output_artifact,
    })),
  });
  return file;
}

export function classifyRequest(request, routes = route(request, 5)) {
  const text = String(request || "").toLowerCase();
  const topSkill = routes[0]?.skill || null;
  const artifactMode = inferArtifactMode(text, topSkill);
  return {
    persona: inferPersona(text),
    product_stage: inferProductStage(text),
    artifact_mode: artifactMode,
    evidence_standard: inferEvidenceStandard(text),
    decision_mode: inferDecisionMode(text),
    top_route: topSkill
      ? {
          name: topSkill.name,
          title: topSkill.title,
          lifecycle: topSkill.lifecycle,
          category: topSkill.category,
          output_artifact: topSkill.output_artifact,
        }
      : null,
    route_count: routes.length,
  };
}

export function startWorkflow(request, options = {}) {
  const trimmedRequest = String(request || "").trim();
  if (!trimmedRequest) throw new Error("Workflow request is required.");

  const workflowId = workflowIdForNow();
  const routes = route(trimmedRequest, Number(options.limit || process.env.PRODUCTIZE_ROUTE_LIMIT || 5));
  recordRoutingDecision(trimmedRequest, routes, "workflow");
  const classification = classifyRequest(trimmedRequest, routes);
  const context = latestContext();
  const status = updateStatus();
  const workflow = {
    id: workflowId,
    status: "started",
    started_at: new Date().toISOString(),
    request: trimmedRequest,
    classification,
    routes: routes.map(({ skill, score }) => ({
      score,
      name: skill.name,
      title: skill.title,
      lifecycle: skill.lifecycle,
      category: skill.category,
      output_artifact: skill.output_artifact,
    })),
    restored_context: context
      ? {
          timestamp: context.timestamp,
          summary: context.summary,
          artifact_type: context.artifact_type || null,
        }
      : null,
    update_status: status,
    required_completion: {
      command:
        "productize-workflow complete --id <id> --status completed|blocked|deferred|needs-review --artifact-type <type> --summary <summary>",
      required_fields: ["status", "artifact_type", "summary"],
    },
  };

  writeJson(workflowPath(workflowId), workflow);
  appendJsonl(path.join(ensureStateDir(), "session-log.jsonl"), {
    event: "workflow_started",
    workflow_id: workflowId,
    request: trimmedRequest,
    classification,
    top_route: workflow.routes[0] || null,
    restored_context: workflow.restored_context,
  });
  return workflow;
}

export function completeWorkflow({ id, status, artifactType, summary, contextSummary }) {
  if (!id) throw new Error("Workflow id is required.");
  const normalizedStatus = String(status || "").toLowerCase();
  if (!["completed", "blocked", "deferred", "needs-review"].includes(normalizedStatus)) {
    throw new Error("Status must be completed, blocked, deferred, or needs-review.");
  }
  if (!artifactType) throw new Error("Artifact type is required.");
  if (!summary) throw new Error("Summary is required.");

  const file = workflowPath(id);
  const workflow = readJson(file, null);
  if (!workflow) throw new Error(`Workflow not found: ${id}`);

  const completedAt = new Date().toISOString();
  const artifactFile = path.join(ensureStateDir(), "artifact-log.jsonl");
  appendJsonl(artifactFile, {
    event: "artifact_produced",
    workflow_id: id,
    artifact_type: artifactType,
    summary,
  });

  const completionFile = recordCompletionStatus(normalizedStatus, summary, {
    workflow_id: id,
    artifact_type: artifactType,
  });

  const savedContextFile =
    contextSummary || normalizedStatus === "completed"
      ? saveContext(contextSummary || summary, {
          workflow_id: id,
          artifact_type: artifactType,
          status: normalizedStatus,
        })
      : null;

  const updated = {
    ...workflow,
    status: normalizedStatus,
    completed_at: completedAt,
    artifact_type: artifactType,
    summary,
    artifact_log: artifactFile,
    completion_log: completionFile,
    saved_context: savedContextFile,
  };
  writeJson(file, updated);
  appendJsonl(path.join(ensureStateDir(), "session-log.jsonl"), {
    event: "workflow_completed",
    workflow_id: id,
    status: normalizedStatus,
    artifact_type: artifactType,
    summary,
  });
  return updated;
}

export function latestWorkflow() {
  const dir = workflowsDir();
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort();
  if (!files.length) return null;
  return readJson(path.join(dir, files[files.length - 1]), null);
}

export function workflowPath(id) {
  return path.join(workflowsDir(), `${id}.json`);
}

function workflowsDir() {
  const dir = path.join(ensureStateDir(), "workflows");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function latestContext() {
  const dir = path.join(stateDir(), "contexts");
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort();
  if (!files.length) return null;
  return readJson(path.join(dir, files[files.length - 1]), null);
}

export function saveContext(summary, metadata = {}) {
  const dir = path.join(ensureStateDir(), "contexts");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `${stamp}.json`);
  const context = { timestamp: new Date().toISOString(), cwd: process.cwd(), summary, ...metadata };
  writeJson(file, context);
  return file;
}

export function productizeVersion() {
  return existsSync(versionFile) ? readFileSync(versionFile, "utf8").trim() : "0.0.0";
}

export function updateStatus() {
  const config = readJson(path.join(stateDir(), "config.json"), {});
  return {
    version: productizeVersion(),
    productize_root: productizeRoot,
    state_dir: stateDir(),
    registry_present: existsSync(registryFile),
    update_check: config.update_check ?? "manual",
    preferred_persona: config.persona ?? null,
    preferred_artifact_mode: config.artifact_mode ?? null,
  };
}

export function recordCompletionStatus(status, summary, metadata = {}) {
  const normalized = String(status || "").toLowerCase();
  if (!["completed", "blocked", "deferred", "needs-review"].includes(normalized)) {
    throw new Error("Status must be completed, blocked, deferred, or needs-review.");
  }
  const file = path.join(ensureStateDir(), "completion-status.jsonl");
  appendJsonl(file, { status: normalized, summary, ...metadata });
  return file;
}

function workflowIdForNow() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${suffix}`;
}

function inferPersona(text) {
  if (/\bfounder|cofounder|startup|0[- ]?1|pre[- ]seed|seed\b/.test(text)) return "founder";
  if (/\bcpo|chief product|vp product|product leader|portfolio|org\b/.test(text)) return "product leader";
  if (/\bai pm|product manager|pm\b/.test(text)) return "AI PM";
  if (/\bai builder|agent|build with ai|cursor|codex|claude|technical spec\b/.test(text)) return "AI builder";
  if (/\bboard|exec|stakeholder|leadership|investor\b/.test(text)) return "stakeholder";
  return "mixed/unknown";
}

function inferProductStage(text) {
  if (/\bidea|concept|0[- ]?1|starting|new product|wedge\b/.test(text)) return "idea";
  if (/\bvalidate|validation|prototype|pilot|mvp|interview|experiment\b/.test(text)) return "validation";
  if (/\bpmf|product[- ]market fit|retention|activation\b/.test(text)) return "PMF search";
  if (/\bgrowth|scale acquisition|plg|gtm|cac|ltv|expansion\b/.test(text)) return "growth";
  if (/\bscale|enterprise|platform|portfolio|operating model\b/.test(text)) return "scale";
  if (/\bpivot|reposition|restart|turnaround\b/.test(text)) return "pivot";
  return "unknown";
}

function inferArtifactMode(text, topSkill) {
  if (/\bprd|requirements?|spec|acceptance criteria|wwas\b/.test(text)) return "PRD/spec";
  if (/\bresearch plan|interview|survey|jtbd|insight\b/.test(text)) return "research plan";
  if (/\bpositioning|messaging|value prop|category\b/.test(text)) return "positioning";
  if (/\bexperiment|test|ab test|a\/b|hypothesis\b/.test(text)) return "experiment";
  if (/\bdeck|slides|board|narrative|update\b/.test(text)) return "deck/narrative";
  if (/\broadmap|plan|priorit/i.test(text)) return "roadmap";
  if (/\bmetric|dashboard|cohort|pmf|cac|ltv|analytics\b/.test(text)) return "diagnostic";
  if (/\bstrategy|memo|decision\b/.test(text)) return "strategy memo";
  return topSkill?.output_artifact || "product work artifact";
}

function inferEvidenceStandard(text) {
  if (/\bdata|metric|cohort|dashboard|sql|experiment|statistic|sample\b/.test(text)) return "quantitative evidence required";
  if (/\btranscript|interview|research|survey|customer quote|notes\b/.test(text)) return "qualitative evidence required";
  if (/\bidea|assumption|hypothesis|guess|unknown\b/.test(text)) return "assumptions must be made explicit";
  return "separate known facts, assumptions, missing inputs, and risky leaps";
}

function inferDecisionMode(text) {
  if (/\bchoose|decide|recommend|which|should we|tradeoff\b/.test(text)) return "recommend";
  if (/\bblocked|need input|unclear|missing\b/.test(text)) return "ask";
  return "proceed with explicit assumptions";
}
