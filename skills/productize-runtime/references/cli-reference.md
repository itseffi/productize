# CLI Command Reference

Complete reference for all Productize CLI commands, flags, and usage examples.

## Common Flags

These flags are shared by `tasks run`, `exec`, and `reviews fix`:

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--ide` | string | `codex` | ACP runtime: claude, codex, copilot, cursor-agent, droid, gemini, opencode, pi |
| `--model` | string | per-IDE | Model override (codex/droid=gpt-5.5, claude=opus, copilot=claude-sonnet-4.6, cursor-agent=composer-1, opencode/pi=anthropic/claude-opus-4-6, gemini=gemini-2.5-pro) |
| `--reasoning-effort` | string | | Reasoning effort: low, medium, high, xhigh |
| `--add-dir` | string[] | | Additional directories for ACP runtimes (claude and codex only; repeatable or comma-separated) |
| `--auto-commit` | bool | false | Include automatic commit instructions at task/batch completion |
| `--dry-run` | bool | false | Generate prompts without running IDE tool |

---

## Setup & Config

### `productize setup`

Install core workflow skills into target agents plus any setup assets shipped by enabled extensions.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--agent`, `-a` | string[] | | Target agent/editor name (repeatable) |
| `--skill`, `-s` | string[] | | Setup skill name to install (repeatable) |
| `--global`, `-g` | bool | false | Install to user directory instead of project |
| `--copy` | bool | false | Copy files instead of symlinking |
| `--list`, `-l` | bool | false | List core skills and enabled extension assets without installing |
| `--yes`, `-y` | bool | false | Skip confirmation prompts |
| `--all` | bool | false | Install all skills to all agents without prompts |

```
productize setup
productize setup --list
productize setup --agent codex --agent claude --skill create-prd --yes
productize setup --all
productize setup --agent cursor --global --copy --yes
```

### `productize upgrade`

Update the Productize CLI to the latest release. No flags.

---

## Workflow Execution

### `productize tasks run`

Execute PRD task files sequentially from a workflow directory through the shared daemon.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--name` | string | | Task workflow name (resolves to `.productize/tasks/<name>`) |
| `--include-completed` | bool | false | Include tasks already marked as completed |
| `--skip-validation` | bool | false | Skip task metadata preflight check |
| `--force` | bool | false | Continue after validation fails in non-interactive mode |
| `--attach` | string | auto | Attach mode: auto, ui, stream, detach |
| `--ui` | bool | false | Force interactive TUI attach mode |
| `--stream` | bool | false | Force textual stream attach mode |
| `--detach` | bool | false | Start the run without attaching a client |
| `--task-runtime` | string[] | | Per-task runtime override rules |
| + common flags | | | `--ide`, `--model`, `--reasoning-effort`, `--add-dir`, `--auto-commit`, `--dry-run` |

```
productize tasks run multi-repo --ide claude
productize tasks run --name multi-repo --ide codex --auto-commit
productize tasks run multi-repo --stream
```

### `productize exec [prompt]`

Execute a single ad hoc prompt through the ACP runtime. Provide prompt as argument, via `--prompt-file`, or stdin.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--agent` | string | | Reusable agent from `.productize/agents` or `~/.productize/agents` |
| `--prompt-file` | string | | Path to a file containing the prompt text |
| `--format` | string | text | Output format: text, json, raw-json |
| `--verbose` | bool | false | Emit operational runtime logs to stderr |
| `--tui` | bool | false | Open the interactive TUI |
| `--persist` | bool | false | Save artifacts under `~/.productize/runs/<run-id>/` |
| `--extensions` | bool | false | Enable executable extensions for this run |
| `--run-id` | string | | Resume a previously persisted session |
| + common flags | | | `--ide`, `--model`, `--reasoning-effort`, `--add-dir`, `--auto-commit`, `--dry-run` |

```
productize exec "Summarize the current repository changes"
productize exec --agent council "Decide between two designs"
productize exec --prompt-file prompt.md --format json
cat prompt.md | productize exec
productize exec --persist "Review the latest changes"
productize exec --run-id exec-20260405-120000-000000000 "Continue"
```

---

## Review

### `productize reviews fetch`

Fetch review comments from a provider and write them into `.productize/tasks/<name>/reviews-NNN/`.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--provider` | string | | Review provider name (e.g., coderabbit) |
| `--pr` | string | | Pull request number |
| `[slug]` | string | | Workflow name (positional) |
| `--name` | string | | Workflow name |
| `--round` | int | next | Review round number (default: next available) |

```
productize reviews fetch my-feature --provider coderabbit --pr 259
productize reviews fetch --name my-feature --provider coderabbit --pr 259 --round 2
productize reviews fetch --name my-feature
```

By default, `reviews fetch` imports CodeRabbit review-body comments for `nitpick`, `minor`, and `major`.
Use `[fetch_reviews].nitpicks = false` in `.productize/config.toml` to disable that import.

### `productize reviews fix`

Process review issue files and dispatch agents to remediate feedback.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `[slug]` | string | | Workflow name (positional) |
| `--name` | string | | Workflow name |
| `--round` | int | latest | Review round number (default: latest existing) |
| `--reviews-dir` | string | | Path to a review round directory |
| `--batch-size` | int | 1 | Number of file groups per batch |
| `--include-resolved` | bool | false | Include already-resolved issues |
| `--concurrent` | int | 1 | Number of batches to process in parallel |
| `--attach` | string | auto | Attach mode: auto, ui, stream, detach |
| `--ui` | bool | false | Force interactive TUI attach mode |
| `--stream` | bool | false | Force textual stream attach mode |
| `--detach` | bool | false | Start the run without attaching a client |
| + common flags | | | `--ide`, `--model`, `--reasoning-effort`, `--add-dir`, `--auto-commit`, `--dry-run` |

```
productize reviews fix my-feature --ide codex --concurrent 2 --batch-size 3
productize reviews fix --name my-feature --round 2
productize reviews fix --reviews-dir .productize/tasks/my-feature/reviews-001
productize reviews fix --name my-feature
```

---

## Utilities

### `productize tasks validate`

Validate task file metadata before execution.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--name` | string | | Workflow name |
| `--tasks-dir` | string | | Path to tasks directory |
| `--format` | string | | Output format |

```
productize tasks validate --name my-feature
```

### `productize sync`

Reconcile authored workflow artifacts under `.productize/tasks/` into the daemon `global.db` catalog.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--root-dir` | string | `.productize/tasks` | Workflow root to scan |
| `--name` | string | | Restrict to one workflow |
| `--tasks-dir` | string | | Restrict to one directory |

```
productize sync
productize sync --name my-feature
```

### `productize archive`

Move workflows that synced daemon state marks as complete to `.productize/tasks/_archived/<timestamp>-<name>`.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--root-dir` | string | `.productize/tasks` | Workflow root to scan |
| `--name` | string | | Restrict to one workflow |
| `--tasks-dir` | string | | Restrict to one directory |

```
productize archive
productize archive --name my-feature
```

### `productize migrate`

Convert legacy XML-tagged artifacts to YAML frontmatter format.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--root-dir` | string | `.productize/tasks` | Workflow root to scan |
| `--name` | string | | Restrict to one workflow |
| `--tasks-dir` | string | | Restrict to one directory |
| `--reviews-dir` | string | | Restrict to one review round |
| `--dry-run` | bool | false | Plan without writing |

```
productize migrate
productize migrate --dry-run
productize migrate --name my-feature
```

---

## Agent Management

### `productize agents list`

List all resolved reusable agents (workspace and global). No flags.

### `productize agents inspect <name>`

View detailed agent definition, runtime defaults, and MCP servers for a named agent.

---

## Extensions

### `productize ext list`

List all extensions across all scopes. No flags.

### `productize ext inspect <name>`

View extension details including capabilities and status.

### `productize ext install <source>`

Install an extension from a local path or GitHub repo archive.

```bash
productize ext install ./my-extension
productize ext install --yes itseffi/productize --remote github --ref v1.2.3 --subdir extensions/idea-factory
```

### `productize ext uninstall <name>`

Remove an installed extension.

### `productize ext enable <name>` / `productize ext disable <name>`

Toggle extension enablement.

### `productize ext doctor`

Diagnose extension issues and validate configurations.
