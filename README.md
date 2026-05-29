<div align="center">
  <h1>Productize</h1>
  <p><strong>Orchestrate AI coding agents from idea to shipped code — in a single pipeline.</strong></p>
</div>

One CLI to replace scattered prompts, manual task tracking, and copy-paste review cycles. Productize drives the full lifecycle of AI-assisted development: product ideation, technical specification, task breakdown with codebase-informed enrichment, concurrent execution across agents, and automated PR review remediation.

## Highlights

- **One command, 40+ agents.** Install core workflow skills into Claude Code, Codex, Cursor, Droid, OpenCode, Pi, Gemini, and 40+ other agents and editors with `productize setup`, plus any setup assets shipped by enabled extensions.
- **Idea to code in a structured pipeline.** Optional Idea → PRD → TechSpec → Tasks → Execution → Review. Each phase produces plain markdown artifacts that feed into the next. Start from an idea for full research and debate, or jump straight to PRD if you already have a clear scope.
- **Codebase-aware enrichment.** Tasks aren't generic prompts. Productize spawns parallel agents to explore your codebase, discover patterns, and ground every task in real project context.
- **Multi-agent execution.** Run tasks through ACP-capable runtimes like Claude Code, Codex, Cursor, Droid, OpenCode, Pi, or Gemini — just change `--ide`. Concurrent batch processing uses configurable timeouts, retries, and exponential backoff.
- **Reusable agents.** Package a prompt, runtime defaults, and optional agent-local MCP servers under `.productize/agents/<name>/`, then run it from `productize exec --agent <name>` or through nested `run_agent` calls.
- **Workflow memory between runs.** Agents inherit context from every previous task — decisions, learnings, errors, and handoffs. Two-tier markdown memory with automatic compaction keeps context fresh without manual bookkeeping.
- **Provider-agnostic reviews.** Fetch review comments from CodeRabbit, GitHub, or run AI-powered reviews internally. All normalize to the same format. Provider threads resolve automatically after fixes.
- **Markdown everywhere.** PRDs, specs, tasks, reviews, and ADRs are human-readable markdown files. Version-controlled, diffable, editable between steps. No vendor lock-in.
- **Frontmatter for machine-readable metadata.** Tasks and review issues keep parseable metadata in standard YAML frontmatter instead of custom XML tags.
- **Executable extensions.** Intercept and modify any pipeline phase with subprocess hooks. Ship custom prompt decorators, lifecycle observers, review providers, and skill packs using the TypeScript or Go SDKs.
- **Single binary, local-first.** Compiles to one Go binary with zero runtime dependencies. Your code and data stay on your machine.
- **Embeddable.** Use as a standalone CLI or import as a Go package into your own tools.

## 📦 Installation

#### Homebrew

```bash
brew install --cask itseffi/productize/productize
```

#### NPM

```bash
npm install -g @productize/cli
```

#### Go

```bash
go install github.com/itseffi/productize/cmd/productize@latest
```

#### From Source

```bash
git clone git@github.com:itseffi/productize.git
cd productize && make verify && go build ./cmd/productize
```

Then install Productize skills into your AI agents:

```bash
productize setup          # interactive — install the full bundled catalog
productize setup --core-only
```

`productize setup` installs Productize's full bundled skill catalog plus any setup assets shipped by enabled extensions.

If you want the optional ideation workflow and advisor roster, install the first-party `idea-forge` extension first:

```bash
productize ext install --yes itseffi/productize --remote github --ref <tag> --subdir extensions/idea-forge
productize ext enable idea-forge
productize setup
```

Execution runtimes are separate from skill installation. To run `productize exec`, `productize tasks run`, or `productize reviews fix`, install an ACP-capable runtime or adapter on `PATH` for the `--ide` you choose:

| Runtime            | `--ide` flag   | Expected ACP command             |
| ------------------ | -------------- | -------------------------------- |
| Claude Agent       | `claude`       | `claude-agent-acp`               |
| Codex CLI          | `codex`        | `codex-acp`                      |
| GitHub Copilot CLI | `copilot`      | `copilot --acp`                  |
| Cursor             | `cursor-agent` | `cursor-agent acp`               |
| Droid              | `droid`        | `droid exec --output-format acp` |
| OpenCode           | `opencode`     | `opencode acp`                   |
| pi ACP             | `pi`           | `pi-acp`                         |
| Gemini CLI         | `gemini`       | `gemini --acp`                   |

When the direct ACP command is not installed, Productize can also fall back to supported launchers such as `npx @zed-industries/codex-acp` when the launcher is available locally. Codex defaults to `gpt-5.5`; using that model with a local `codex-acp` binary requires `@zed-industries/codex-acp >= 0.12.0`. Update with `npm install -g @zed-industries/codex-acp@latest`, or explicitly choose a model supported by your installed adapter.

## 🔄 How It Works

Workflow artifacts stay in `.productize/tasks/<name>/`. These are the PRDs, TechSpecs, ADRs, tasks, reviews, and memory files that you read and edit between steps.

The daemon owns runtime state under `~/.productize/`. Daemon-managed task runs, review-fix runs, and persisted exec sessions allocate `~/.productize/runs/<run-id>/`, while attach and watch clients reconnect through daemon snapshots and streams instead of reading workspace-local run files directly.

Task and review issue files use YAML frontmatter for parseable metadata such as `status`, `title`, `type`, `severity`, and `provider_ref`. `productize sync` now reconciles authored workflow artifacts into the daemon `global.db` catalog and performs one-time cleanup for legacy generated `_meta.md` / `_tasks.md` artifacts when they are encountered. `productize archive` moves completed workflows only after synced daemon state says they are eligible. If you have an older project with XML-tagged artifacts, run `productize migrate` once before using daemon-backed workflow commands.

### Daemon Runtime Model

- `productize daemon start|status|stop` manages the home-scoped daemon lifecycle. `daemon start` is idempotent, and task/review/exec commands auto-start the daemon when needed.
- `productize workspaces list|show|register|unregister|resolve` exposes the daemon workspace registry. Workspaces are also lazily registered when you run daemon-backed commands inside them.
- `productize tasks run <slug>` is the canonical workflow runner. It auto-starts the daemon when needed and streams run observation by default. Use `--stream`, `--detach`, or `--attach` to control whether the command follows the run or returns immediately; `--ui` remains a deprecated alias for `--stream`.
- `productize runs attach <run-id>` and `productize runs watch <run-id>` both stream textual observation from the same snapshot-plus-stream transport.
- `productize reviews fetch|list|show|fix` is the canonical review command family.

### Task Schema v2

Task files now use the v2 frontmatter shape: `status`, `title`, `type`, `complexity`, and `dependencies`. Legacy v1 task-only keys are no longer part of the schema. `type` must come from the workspace task type registry: either `[tasks].types` in `.productize/config.toml` or the built-in defaults `frontend`, `backend`, `docs`, `test`, `infra`, `refactor`, `chore`, `bugfix`.

```md
---
status: pending
title: Add task validation preflight to tasks run
type: backend
complexity: medium
dependencies:
  - task_02
---
```

Validate task files at any time with `productize tasks validate --name <feature>`. `productize tasks run <feature>` runs the same preflight automatically; use `--skip-validation` only when tasks were validated elsewhere, or `--force` to continue after validation failures in non-interactive runs.

## ⚙️ Config Files

Productize can load global defaults from `~/.productize/config.toml` and override them per workspace with `.productize/config.toml`.

- The CLI discovers the nearest `.productize/` directory by walking upward from the current working directory.
- If `~/.productize/config.toml` exists, Productize loads it once at command startup.
- If `.productize/config.toml` exists in the resolved workspace, it overrides the global config field by field.
- Explicit CLI flags always win over config values.

Precedence is:

```text
explicit flags > workspace command section > workspace [defaults] > global command section > global [defaults] > built-in defaults
```

Example:

```toml
[defaults]
ide = "codex"
model = "gpt-5.5"
reasoning_effort = "medium"
access_mode = "full"
timeout = "10m"
tail_lines = 0
add_dirs = ["../shared"]
auto_commit = false
max_retries = 2
retry_backoff_multiplier = 1.5

[tasks]
types = ["frontend", "backend", "docs", "test", "infra", "refactor", "chore", "bugfix"]

[tasks.run]
include_completed = false

[exec]
output_format = "text"

[fix_reviews]
concurrent = 2
batch_size = 3
include_resolved = false

[fetch_reviews]
provider = "coderabbit"
nitpicks = false
```

Supported sections:

- `[defaults]` for shared execution defaults such as `ide`, `model`, `reasoning_effort`, `access_mode`, `timeout`, `tail_lines`, `add_dirs`, `auto_commit`, `max_retries`, and `retry_backoff_multiplier`
- `[exec]` for `output_format` plus exec-specific runtime overrides such as `ide`, `model`, `reasoning_effort`, `access_mode`, `timeout`, `tail_lines`, `add_dirs`, `max_retries`, and `retry_backoff_multiplier`
- `[tasks]` for the allowed task `type` list used by `create-tasks` and `productize tasks validate`
- `[tasks.run]` for workflow-run defaults used by `productize tasks run`, such as `include_completed`
- `[fix_reviews]` for `concurrent`, `batch_size`, and `include_resolved`
- `[fetch_reviews]` for `provider` and `nitpicks` (controls CodeRabbit review-body comments; default is enabled when unset)
- `[sound]` for optional run-completion audio presets or absolute file paths

Notes:

- Both `~/.productize/config.toml` and `.productize/config.toml` are optional. If both are absent, Productize keeps the current built-in defaults.
- `.productize/tasks` remains the fixed workflow root in this version; the config file does not change the workflow root path.
- Unknown keys and invalid value types are rejected during config loading.
- Relative `add_dirs` are resolved against the owning config scope: the user home directory for `~/.productize/config.toml` and the workspace root for `.productize/config.toml`.
- `max_retries` applies to execution-stage ACP failures and inactivity timeouts for `productize exec`, `productize tasks run`, and `productize reviews fix`.
- Built-in CLI defaults retry timed-out or transient ACP failures twice; set `max_retries = 0` or pass `--max-retries 0` to opt out.
- `retry_backoff_multiplier` only increases the next attempt timeout; retries restart immediately and do not add a sleep delay.

## Reusable Agents

Reusable agents are flat filesystem bundles discovered from two scopes:

- workspace: `.productize/agents/<name>/`
- global: `~/.productize/agents/<name>/`

When the same agent name exists in both places, the workspace directory wins as a whole. Productize does not merge `AGENT.md` from one scope with `mcp.json` from the other.

Each agent directory contains:

- required `AGENT.md` with YAML frontmatter plus a markdown body
- optional `mcp.json` using the standard top-level `mcpServers` shape

Agent directory names are the canonical agent ids. They must match `^[a-z][a-z0-9-]{0,63}$`, and `productize` is reserved.

Quick start:

```bash
productize agents list
productize agents inspect reviewer
productize exec --agent reviewer "Review the staged changes"
```

Runtime precedence for `productize exec --agent ...` is:

```text
explicit CLI flags > AGENT.md runtime defaults > workspace/global config > built-in defaults
```

`mcp.json` is only for agent-local MCP servers. The reserved Productize MCP server is also named `productize`, but it is injected by the host and must not appear in `mcp.json`. That reserved server exists only to expose host-owned tools such as `run_agent`. Child agent runs receive the reserved `productize` server plus the child agent's own `mcp.json`; they do not inherit the parent agent's local MCP servers.

Use these committed example fixtures as starting points:

- [`docs/examples/agents/reviewer/AGENT.md`](docs/examples/agents/reviewer/AGENT.md) for a minimal reusable agent
- [`docs/examples/agents/repo-copilot/AGENT.md`](docs/examples/agents/repo-copilot/AGENT.md) and [`docs/examples/agents/repo-copilot/mcp.json`](docs/examples/agents/repo-copilot/mcp.json) for an agent with external MCP dependencies

The detailed guide lives in [`docs/reusable-agents.md`](docs/reusable-agents.md).

## 🔌 Extensions

Productize extensions are executable subprocess plugins that intercept and modify pipeline behavior without rebuilding the binary. Extensions communicate with the host over JSON-RPC 2.0 on stdin/stdout and can observe lifecycle events, mutate prompts, inject plan sources, modify agent sessions, gate retries, ship skill packs, and register review providers.

### SDK support

| Language   | Package                                           | Install                                           |
| ---------- | ------------------------------------------------- | ------------------------------------------------- |
| TypeScript | [`@productize/extension-sdk`](sdk/extension-sdk-ts/) | `npm install @productize/extension-sdk`              |
| Go         | [`sdk/extension`](sdk/extension/)                 | `go get github.com/itseffi/productize/sdk/extension` |

Scaffold a new extension project with starter templates:

```bash
npx @productize/create-extension my-ext
npx @productize/create-extension my-ext --template prompt-decorator
npx @productize/create-extension my-ext --runtime go
```

Available templates: `lifecycle-observer`, `prompt-decorator`, `review-provider`, `skill-pack`.

### Extension CLI

```bash
productize ext list                   # discover extensions across all scopes
productize ext inspect <name>         # show manifest, capabilities, enablement status
productize ext install <source>       # install from a local path or GitHub repo archive
productize ext uninstall <name>       # remove a user-scoped extension
productize ext enable <name>          # enable on this machine
productize ext disable <name>         # disable on this machine
productize ext doctor                 # validate manifests and report health warnings
```

Extensions are discovered from three scopes with workspace > user > bundled precedence. User and workspace extensions start disabled and must be explicitly enabled by the local operator.

### Learn more

- [Extension author guide](.productize/docs/extensibility/index.md)
- [Architecture overview](.productize/docs/extensibility/architecture.md)
- [Hook reference](.productize/docs/extensibility/hook-reference.md) -- 32 hooks across 6 pipeline phases
- [Host API reference](.productize/docs/extensibility/host-api-reference.md) -- 11 typed host methods
- [Capability reference](.productize/docs/extensibility/capability-reference.md) -- 19 capability grants
- [Trust and enablement](.productize/docs/extensibility/trust-and-enablement.md)
- [Testing guide](.productize/docs/extensibility/testing.md)

## ⚡ Ad Hoc Exec

Use `productize exec` when you want one prompt through the same ACP-backed execution stack without creating a full workflow first.

```bash
productize exec "Summarize the current repository changes"
productize exec --prompt-file prompt.md
cat prompt.md | productize exec --format json
productize exec --persist "Review the latest changes"
productize exec --run-id exec-20260405-120000-000000000 "Continue from the previous session"
```

Prompt source rules are explicit:

- pass one positional prompt for short inline runs
- use `--prompt-file` for longer or reusable prompts
- pipe `stdin` only when neither of the above is provided
- ambiguous combinations are rejected instead of guessed

Output modes:

- `--format text` is headless by default and writes only the final assistant response to stdout
- `--format json` streams the lean JSONL contract to stdout and filters ACP metadata that is mostly useful for debugging
- `--format raw-json` streams the full raw JSONL event trace to stdout
- when `--persist` is enabled, `~/.productize/runs/<run-id>/events.jsonl` always stores the full raw event stream regardless of the selected stdout format
- operational ACP/runtime logs stay silent by default; use `--verbose` when you want lifecycle logs on stderr
- `--tui` is a deprecated compatibility flag and is rejected for new exec runs
- `--persist` stores a resumable conversation under `~/.productize/runs/<run-id>/`
- `--run-id` loads a previously persisted ACP session and appends a new turn

Persisted `exec` runs use this layout:

```text
~/.productize/runs/<run-id>/run.db
~/.productize/runs/<run-id>/run.json
~/.productize/runs/<run-id>/events.jsonl
~/.productize/runs/<run-id>/turns/0001/prompt.md
~/.productize/runs/<run-id>/turns/0001/response.txt
~/.productize/runs/<run-id>/turns/0001/result.json
```

`productize exec` uses the same config merge rule as the rest of the CLI: `flags > workspace [exec] > workspace [defaults] > global [exec] > global [defaults] > built-in defaults`.

## 🚀 Quick Start

This walkthrough builds a feature called **user-auth** from idea to shipped code.

### 1. Install skills

```bash
productize setup
```

Auto-detects installed agents, copies (or symlinks) core skills into their configuration directories, and installs setup assets shipped by enabled extensions.
`productize tasks run` and `productize reviews fix` now verify that bundled Productize skills are installed for the selected agent before running. Missing installs block the run, and outdated installs prompt for refresh in interactive terminals.

### 2. (Optional) Create an Issue

Inside your AI agent (Claude Code, Codex, Cursor, OpenCode, Pi, etc.):

```bash
productize ext install --yes itseffi/productize --remote github --ref <tag> --subdir extensions/idea-forge
productize ext enable idea-forge
productize setup
```

Then:

```
/idea-forge user-auth
```

Transforms a raw idea into a structured idea spec — asks targeted questions, researches market and codebase in parallel, runs business analysis and advisors debate, suggests high-leverage alternatives, and produces a research-backed idea. Skip this step if you already have a clear feature scope.

### 3. Create a PRD

```
/create-prd user-auth
```

Interactive brainstorming session — reads the idea if one exists, asks clarifying questions, spawns parallel agents to research your codebase and the web, produces a business-focused PRD with ADRs.

### 4. Create a TechSpec

```
/create-techspec user-auth
```

Reads your PRD, explores the codebase architecture, asks technical clarification questions. Produces architecture specs, API designs, and data models.

### 5. Break down into tasks

```
/create-tasks user-auth
```

Analyzes both documents, explores your codebase for relevant files and patterns, produces individually executable task files with status tracking, context, and acceptance criteria.
Generated task files use task schema v2 (`status`, `title`, `type`, `complexity`, `dependencies`). Validate them any time with `productize tasks validate --name user-auth`.

### 6. Execute tasks

```bash
productize tasks run user-auth --ide claude
```

Each pending task is processed sequentially through the shared daemon — the agent reads the spec, implements the code, validates it, and updates the task status. Use `--dry-run` to preview prompts without executing.
`productize tasks run` validates task metadata before execution. Use `--skip-validation` when validation already ran elsewhere, or `--force` to continue after validation failures in non-interactive environments.

### 7. Review

**Option A** — AI-powered review inside your agent:

```
/review-round user-auth
```

**Option B** — Fetch from an external provider:

```bash
productize reviews fetch user-auth --provider coderabbit --pr 42
```

Both produce the same output: `.productize/tasks/user-auth/reviews-001/issue_*.md`

### 8. Fix review issues

```bash
productize reviews fix user-auth --ide claude --concurrent 2 --batch-size 3
```

Agents triage each issue as valid or invalid, implement fixes for valid issues, and update statuses. Provider threads are resolved automatically.

### 9. Iterate and ship

Repeat steps 7–8. Each cycle creates a new review round (`reviews-002/`, `reviews-003/`), preserving full history. When clean — merge and ship.

## 🧩 Skills

Productize bundles its core workflow skills plus the Productize skill catalog. They
run inside your AI agent — no context switching to external tools.

| Skill                | Purpose                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `create-prd`      | Idea → Product Requirements Document with ADRs                             |
| `create-techspec` | PRD → Technical Specification with architecture exploration                |
| `create-tasks`    | PRD + TechSpec → Independently implementable task files                    |
| `execute-task`    | Executes one task end-to-end: implement, validate, track, commit           |
| `workflow-memory` | Maintains cross-task context so agents pick up where the last one left off |
| `review-round`    | Comprehensive code review → structured issue files                         |
| `fix-reviews`     | Triage, fix, verify, and resolve review issues                             |
| `final-verify`    | Enforces verification evidence before any completion claim                 |

Optional first-party extension skills:

| Skill             | Purpose                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `idea-forge` | Raw idea → structured idea spec with market research, business analysis, and advisors debate |

Install the optional ideation extension with:

```bash
productize ext install --yes itseffi/productize --remote github --ref <tag> --subdir extensions/idea-forge
productize ext enable idea-forge
productize setup
```

Bundled Productize skills include `/productize`, `/productize-0-1`,
`/productize-product-review`, `/productize-design-review`,
`/productize-eng-review`, `/productize-qa`, `/productize-release`,
`/productize-docs`, `/productize-dx-review`, `/productize-comms-review`, and
the rest of the Productize strategy, growth, finance, design, analytics,
delivery, operations, and AI-execution catalog.

### 🧠 Workflow Memory

When agents execute tasks, context gets lost between runs — decisions made, errors hit, patterns discovered. Productize solves this with a two-tier memory system that gives each agent a running history of the workflow.

Every task execution automatically bootstraps two markdown files inside `.productize/tasks/<name>/memory/`:

| File         | Scope              | What goes here                                                                  |
| ------------ | ------------------ | ------------------------------------------------------------------------------- |
| `MEMORY.md`  | Cross-task, shared | Architecture decisions, discovered patterns, open risks, handoffs between tasks |
| `task_01.md` | Single task        | Objective snapshot, files touched, errors hit, what's ready for the next run    |

**How it works:**

1. Before a task runs, Productize creates the memory directory and scaffolds both files with section templates if they don't exist yet.
2. The agent reads both memory files before writing any code — treating them as mandatory context, not optional notes.
3. During execution, the agent keeps task memory current: decisions, learnings, errors, and corrections.
4. Only durable, cross-task context gets promoted to shared memory. Task-local details stay in the task file.
5. Before completion, the agent updates memory with anything that helps the next run start faster.

**Automatic compaction.** Memory files have soft limits (150 lines / 12 KB for shared, 200 lines / 16 KB per task). When a file exceeds its threshold, Productize flags it for compaction — the agent trims noise and repetition while preserving active risks, decisions, and handoffs.

**No duplication.** Memory files don't copy what's already in the repo, git history, PRD, or task specs. They capture only what would otherwise be lost between runs: the _why_ behind decisions, surprising findings, and context that makes the next agent immediately productive.

The `workflow-memory` skill handles all of this automatically when referenced in task prompts. No manual setup required — run `productize tasks run <workflow>` and agents inherit context from every previous run.

### 🤖 Supported Agents

**Execution** (`productize exec`, `productize tasks run`, `productize reviews fix`) — ACP-capable runtimes that can run ad hoc prompts and daemon-backed workflow tasks:

| Agent          | `--ide` flag   |
| -------------- | -------------- |
| Claude Code    | `claude`       |
| Codex          | `codex`        |
| GitHub Copilot | `copilot`      |
| Cursor         | `cursor-agent` |
| Droid          | `droid`        |
| OpenCode       | `opencode`     |
| Pi             | `pi`           |
| Gemini         | `gemini`       |

**Skill installation** (`productize setup`) — 40+ agents and editors, including Claude Code, Codex, Cursor, Droid, OpenCode, Pi, Gemini CLI, GitHub Copilot, Windsurf, Amp, Continue, Goose, Roo Code, Augment, Kiro CLI, Cline, and many more. `productize setup` installs core workflow skills plus any setup assets shipped by enabled extensions. Run `productize setup` to see all detected agents on your system.

When installing to multiple agents, Productize offers two modes:

- **Symlink** _(default)_ — One canonical copy with symlinks from each agent directory. All agents stay in sync.
- **Copy** — Independent copies per agent. Use `--copy` when symlinks are not supported.

## 📖 CLI Reference

<details>
<summary><code>productize setup</code> — Install core skills and enabled extension assets</summary>

```bash
productize setup [flags]
```

| Flag             | Default | Description                                                      |
| ---------------- | ------- | ---------------------------------------------------------------- |
| `--agent`, `-a`  |         | Target agent name (repeatable)                                   |
| `--skill`, `-s`  |         | Skill name to install (repeatable)                               |
| `--global`, `-g` | `false` | Install to user directory instead of project                     |
| `--copy`         | `false` | Copy files instead of symlinking                                 |
| `--list`, `-l`   | `false` | List core skills and enabled extension assets without installing |
| `--yes`, `-y`    | `false` | Skip confirmation prompts                                        |
| `--all`          | `false` | Install all skills to all agents                                 |

</details>

<details>
<summary><code>productize migrate</code> — Convert legacy XML-tagged artifacts to frontmatter</summary>

```bash
productize migrate [flags]
```

| Flag            | Default          | Description                                       |
| --------------- | ---------------- | ------------------------------------------------- |
| `--root-dir`    | `.productize/tasks` | Workflow root to scan recursively                 |
| `--name`        |                  | Restrict migration to one workflow name           |
| `--tasks-dir`   |                  | Restrict migration to one task workflow directory |
| `--reviews-dir` |                  | Restrict migration to one review round directory  |
| `--dry-run`     | `false`          | Preview migrations without writing files          |

</details>

<details>
<summary><code>productize sync</code> — Reconcile workflow artifacts into daemon state</summary>

```bash
productize sync [flags]
```

| Flag          | Default          | Description                                  |
| ------------- | ---------------- | -------------------------------------------- |
| `--root-dir`  | `.productize/tasks` | Workflow root to scan                        |
| `--name`      |                  | Restrict sync to one workflow name           |
| `--tasks-dir` |                  | Restrict sync to one task workflow directory |

</details>

<details>
<summary><code>productize daemon</code> — Manage the shared home-scoped daemon</summary>

```bash
productize daemon start
productize daemon status
productize daemon stop [--force]
```

Use `daemon start` for an explicit bootstrap, `daemon status` for health and transport info, and `daemon stop` for graceful shutdown. Most workflow commands auto-start the daemon for you.

</details>

<details>
<summary><code>productize workspaces</code> — Manage daemon workspace registrations</summary>

```bash
productize workspaces list [--format text|json]
productize workspaces show <id-or-path> [--format text|json]
productize workspaces register <path> [--name display-name] [--format text|json]
productize workspaces unregister <id-or-path> [--format text|json]
productize workspaces resolve <path> [--format text|json]
```

The daemon lazily registers workspaces on first use, but the `workspaces` family gives operators explicit control over the registry.

</details>

<details>
<summary><code>productize tasks validate</code> — Validate task metadata before execution</summary>

```bash
productize tasks validate [--name my-feature | --tasks-dir .productize/tasks/my-feature] [--format text|json]
```

Use `tasks validate` to check every `task_*.md` file in a workflow directory against the v2 task metadata schema before you run `tasks run`.

</details>

<details>
<summary><code>productize tasks run</code> — Start one daemon-backed workflow run</summary>

```bash
productize tasks run <slug> [flags]
```

The CLI resolves workspace defaults locally, validates the task metadata, auto-starts the daemon when needed, and then starts the workflow through the daemon transport.

| Flag                  | Default | Description                                                                         |
| --------------------- | ------- | ----------------------------------------------------------------------------------- |
| `--name`              |         | Workflow slug (defaults to the positional slug)                                     |
| `--include-completed` | `false` | Re-run completed tasks                                                              |
| `--skip-validation`   | `false` | Skip task metadata preflight; use only when validation already ran elsewhere        |
| `--force`             | `false` | Continue after task metadata validation fails in non-interactive mode               |
| `--attach`            | `auto`  | Attach mode: `auto`, `stream`, or `detach`; legacy `ui` maps to `stream`            |
| `--ui`                | `false` | Deprecated alias for `--stream`                                                     |
| `--stream`            | `false` | Force textual stream attach mode                                                    |
| `--detach`            | `false` | Start the run without attaching a client                                            |
| `--task-runtime`      |         | Per-task runtime override rule (`type=...`, `id=...`, `ide=...`, `model=...`, etc.) |

</details>

<details>
<summary><code>productize reviews</code> — Inspect and remediate review workflows</summary>

```bash
productize reviews fetch <slug> [--provider coderabbit --pr 42 --round N]
productize reviews list <slug>
productize reviews show <slug> [round]
productize reviews fix <slug> [flags]
```

`reviews fetch` imports provider feedback into `.productize/tasks/<slug>/reviews-NNN/`. `reviews fix` uses the same daemon-backed runtime model as `tasks run`, including `--attach`, `--stream`, and `--detach`; `--ui` remains a deprecated alias for `--stream`.

</details>

<details>
<summary><code>productize runs</code> — Reattach, observe, and clean daemon-managed runs</summary>

```bash
productize runs attach <run-id>
productize runs watch <run-id>
productize runs purge
```

Use `runs attach` or `runs watch` for textual streaming observation of an existing run, and `runs purge` to delete terminal run artifacts according to the configured retention policy.

</details>

<details>
<summary><code>productize archive</code> — Move fully completed workflows into the archive root</summary>

```bash
productize archive [flags]
```

| Flag          | Default          | Description                                       |
| ------------- | ---------------- | ------------------------------------------------- |
| `--root-dir`  | `.productize/tasks` | Workflow root to scan                             |
| `--name`      |                  | Restrict archiving to one workflow name           |
| `--tasks-dir` |                  | Restrict archiving to one task workflow directory |

</details>

<details>
<summary><code>productize exec</code> — Execute one ad hoc prompt</summary>

```bash
productize exec [prompt] [flags]
```

Provide exactly one prompt source: a positional prompt, `--prompt-file`, or `stdin`. When present, `~/.productize/config.toml` and `.productize/config.toml` can provide exec defaults through `[exec]` and shared runtime defaults through `[defaults]`.

`productize exec` is headless and ephemeral by default. Use `--agent <name>` to execute a reusable agent from `.productize/agents/` or `~/.productize/agents/`, `--persist` to create `~/.productize/runs/<run-id>/` for resumable sessions, `--run-id` to continue a persisted session, `--format json` for lean JSONL, and `--format raw-json` for the full raw event stream. `--tui` is kept only as a deprecated compatibility flag and is rejected for new exec runs.

| Flag                         | Default     | Description                                                                                |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `--ide`                      | `codex`     | Runtime: `claude`, `codex`, `copilot`, `cursor-agent`, `droid`, `gemini`, `opencode`, `pi` |
| `--model`                    | _(per IDE)_ | Model override                                                                             |
| `--agent`                    |             | Reusable agent to execute from `.productize/agents/` or `~/.productize/agents/`                  |
| `--prompt-file`              |             | Read prompt text from a file                                                               |
| `--format`                   | `text`      | Output contract: `text`, `json`, or `raw-json`                                             |
| `--reasoning-effort`         | `medium`    | `low`, `medium`, `high`, `xhigh`                                                           |
| `--access-mode`              | `full`      | `default` or `full` runtime access policy                                                  |
| `--timeout`                  | `10m`       | Activity timeout per job                                                                   |
| `--max-retries`              | `2`         | Retry execution-stage ACP failures or timeouts N times                                     |
| `--retry-backoff-multiplier` | `1.5`       | Multiplier applied to the next timeout after each retry                                    |
| `--tail-lines`               | `0`         | Maximum log lines retained per job (`0` = full history)                                    |
| `--add-dir`                  |             | Additional directories to allow (repeatable; currently `claude` and `codex` only)          |
| `--auto-commit`              | `false`     | Include automatic commit instructions when the prompt asks for code changes                |
| `--verbose`                  | `false`     | Emit operational runtime logs to stderr during exec                                        |
| `--tui`                      | `false`     | Deprecated compatibility flag; new exec runs remain headless                               |
| `--persist`                  | `false`     | Persist exec artifacts under `~/.productize/runs/<run-id>/`                                   |
| `--run-id`                   |             | Resume a previously persisted exec session by run id                                       |
| `--dry-run`                  | `false`     | Preview prompts without executing                                                          |

</details>

<details>
<summary><code>productize agents</code> — Discover and inspect reusable agents</summary>

```bash
productize agents list
productize agents inspect <name>
```

`productize agents list` prints resolved agents from workspace and global scope, then reports any invalid definitions without hiding the valid ones. `productize agents inspect <name>` prints the resolved source, runtime defaults, MCP summary, and validation status for one agent. Invalid inspections print the validation report first and then exit non-zero.

Examples:

```bash
productize agents list
productize agents inspect reviewer
productize agents inspect repo-copilot
```

</details>

<details>
<summary><code>productize ext</code> — Manage executable extensions</summary>

```bash
productize ext <subcommand> [flags]
```

| Subcommand             | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `ext list`             | List discovered extensions across all scopes       |
| `ext inspect <name>`   | Show manifest, capabilities, and enablement status |
| `ext install <path>`   | Install an extension into the user scope           |
| `ext uninstall <name>` | Remove a user-scoped extension                     |
| `ext enable <name>`    | Enable an extension on this machine                |
| `ext disable <name>`   | Disable an extension on this machine               |
| `ext doctor`           | Validate manifests and report health warnings      |

</details>

<details>
<summary><strong>Go Package Usage</strong> — Use Productize as a library in your own tools</summary>

```go
// Prepare work without executing
prep, err := productize.Prepare(context.Background(), productize.Config{
    Name:     "multi-repo",
    TasksDir: ".productize/tasks/multi-repo",
    Mode:     productize.ModePRDTasks,
    DryRun:   true,
})

// Fetch reviews and run remediation
_, _ = productize.FetchReviews(context.Background(), productize.Config{
    Name:     "my-feature",
    Provider: "coderabbit",
    PR:       "259",
})

// Preview a legacy artifact migration
_, _ = productize.Migrate(context.Background(), productize.MigrationConfig{
    DryRun: true,
})

_ = productize.Run(context.Background(), productize.Config{
    Name:            "my-feature",
    Mode:            productize.ModePRReview,
    IDE:             productize.IDECodex,
    ReasoningEffort: "medium",
})

// Embed the Cobra command in another CLI
root := productize.NewCommand()
_ = root.Execute()
```

</details>

<details>
<summary><strong>Project Layout</strong></summary>

```
cmd/productize/             CLI entry point
productize.go               Public Go API + reusable Cobra command helpers
internal/cli/            Cobra flags, interactive form, CLI glue
internal/core/           Internal facade for preparation and execution
  agent/                 IDE command validation and process construction
  agents/                Reusable agent discovery, validation, MCP merge, nested execution
  extension/             Extension manifest, discovery, hooks, Host API, lifecycle
  memory/                Workflow memory bootstrapping, inspection, and compaction detection
  model/                 Shared runtime data structures
  plan/                  Input discovery, filtering, grouping, batch prep
  prompt/                Prompt builders emitting runtime context + skill names
  run/                   Execution pipeline, logging, shutdown, event streaming
internal/setup/          Bundled skill and advisors-agent installer (agent detection, symlink/copy)
internal/version/        Build metadata
sdk/extension/           Public Go SDK for extension authors
sdk/extension-sdk-ts/    Public TypeScript SDK for extension authors
sdk/create-extension/    CLI scaffolder for new extension projects
skills/                  Bundled installable skills
.productize/config.toml     Optional workspace defaults for CLI execution
.productize/agents/         Optional reusable agents (`AGENT.md` + optional `mcp.json`)
.productize/extensions/     Workspace-scoped extensions (starts disabled)
~/.productize/runs/         Home-scoped runtime artifacts for daemon-managed and persisted exec runs
.productize/tasks/          Default workflow artifact root (PRDs, TechSpecs, tasks, ADRs, reviews)
```

</details>

## 🛠️ Development

```bash
make verify    # Full pipeline: fmt → lint → test → build
make fmt       # Format code
make lint      # Lint (zero tolerance)
make test      # Tests with race detector
make build     # Compile binary
make deps      # Tidy and verify modules
```

## Star History

<a href="https://www.star-history.com/?repos=productize%2Fproductize&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=itseffi/productize&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=itseffi/productize&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=itseffi/productize&type=date&legend=top-left" />
 </picture>
</a>

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
