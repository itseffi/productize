# CLI Reference

This page keeps the long command tables out of the root README.

## `productize setup`

Install Productize skills and reusable agents.

```bash
productize setup [flags]
```

| Flag | Default | Description |
| ---- | ------- | ----------- |
| `--agent`, `-a` | | Target agent name, repeatable |
| `--skill`, `-s` | | Skill name to install, repeatable |
| `--global`, `-g` | `false` | Install to user directory instead of project |
| `--copy` | `false` | Copy files instead of symlinking |
| `--list`, `-l` | `false` | List setup assets without installing |
| `--yes`, `-y` | `false` | Skip confirmation prompts |
| `--core-only` | `false` | Install only core workflow, lifecycle, and gate skills |
| `--no-tactical` | `false` | Alias for `--core-only` |
| `--all` | `false` | Deprecated: setup installs all skills by default; also skips prompts |

## `productize upgrade`

Upgrade Productize to the latest release.

```bash
productize upgrade
```

Package-manager installs print the command to run. Direct binary installs
perform an in-place self-update.

## `productize migrate`

Convert legacy XML-tagged artifacts to frontmatter.

```bash
productize migrate [flags]
```

| Flag | Default | Description |
| ---- | ------- | ----------- |
| `--root-dir` | `.productize/tasks` | Workflow root to scan recursively |
| `--name` | | Restrict migration to one workflow name |
| `--tasks-dir` | | Restrict migration to one task workflow directory |
| `--reviews-dir` | | Restrict migration to one review round directory |
| `--dry-run` | `false` | Preview migrations without writing files |

## `productize sync`

Reconcile workflow artifacts into daemon state.

```bash
productize sync [flags]
```

| Flag | Default | Description |
| ---- | ------- | ----------- |
| `--root-dir` | `.productize/tasks` | Workflow root to scan |
| `--name` | | Restrict sync to one workflow name |
| `--tasks-dir` | | Restrict sync to one task workflow directory |
| `--format` | `text` | Output format: `text` or `json` |

## `productize daemon`

Manage the shared home-scoped daemon.

```bash
productize daemon start
productize daemon status
productize daemon stop [--force]
```

Use `daemon start` for explicit bootstrap, `daemon status` for health and
transport info, and `daemon stop` for graceful shutdown. Most workflow commands
auto-start the daemon.

## `productize workspaces`

Manage daemon workspace registrations.

```bash
productize workspaces list [--format text|json]
productize workspaces show <id-or-path> [--format text|json]
productize workspaces register <path> [--name display-name] [--format text|json]
productize workspaces unregister <id-or-path> [--format text|json]
productize workspaces resolve <path> [--format text|json]
```

The daemon lazily registers workspaces on first use, but the `workspaces` family
gives operators explicit control over the registry.

## `productize tasks validate`

Validate task metadata before execution.

```bash
productize tasks validate [--name my-feature | --tasks-dir .productize/tasks/my-feature] [--format text|json]
```

Use `tasks validate` to check every `task_*.md` file in a workflow directory
against the task metadata schema before `tasks run`.

## `productize tasks run`

Start one daemon-backed workflow run.

```bash
productize tasks run <slug> [flags]
```

The CLI resolves workspace defaults locally, validates task metadata, auto-starts
the daemon when needed, and starts the workflow through daemon transport.

| Flag | Default | Description |
| ---- | ------- | ----------- |
| `--name` | | Workflow slug, defaults to positional slug |
| `--include-completed` | `false` | Re-run completed tasks |
| `--skip-validation` | `false` | Skip task metadata preflight; use only when validation already ran elsewhere |
| `--force` | `false` | Continue after task metadata validation fails in non-interactive mode |
| `--attach` | `auto` | Attach mode: `auto`, `stream`, or `detach`; legacy `ui` maps to `stream` |
| `--ui` | `false` | Deprecated alias for `--stream` |
| `--stream` | `false` | Force textual stream attach mode |
| `--detach` | `false` | Start the run without attaching a client |
| `--task-runtime` | | Per-task runtime override rule such as `type=...`, `id=...`, `ide=...`, `model=...` |

## `productize reviews`

Inspect and remediate review workflows.

```bash
productize reviews fetch <slug> [--provider coderabbit --pr 42 --round N]
productize reviews list <slug>
productize reviews show <slug> [round]
productize reviews fix <slug> [flags]
productize reviews watch <slug> [flags]
```

`reviews fetch` imports provider feedback into
`.productize/tasks/<slug>/reviews-NNN/`. `reviews fix` uses the same
daemon-backed runtime model as `tasks run`, including `--attach`, `--stream`,
and `--detach`; `--ui` remains a deprecated alias for `--stream`.

`reviews watch` waits for provider feedback, imports actionable rounds, starts
child review-fix runs, and can optionally push committed fixes.

## `productize runs`

Reattach, observe, and clean daemon-managed runs.

```bash
productize runs attach <run-id>
productize runs watch <run-id>
productize runs purge
```

Use `runs attach` or `runs watch` for textual streaming observation of an
existing run. Use `runs purge` to delete terminal run artifacts according to the
configured retention policy.

## `productize archive`

Move fully completed workflows into the archive root.

```bash
productize archive [flags]
```

| Flag | Default | Description |
| ---- | ------- | ----------- |
| `--root-dir` | `.productize/tasks` | Workflow root to scan |
| `--name` | | Restrict archiving to one workflow name |
| `--tasks-dir` | | Restrict archiving to one task workflow directory |
| `--format` | `text` | Output format: `text` or `json` |

## `productize exec`

Execute one ad hoc prompt.

```bash
productize exec [prompt] [flags]
```

Provide exactly one prompt source: a positional prompt, `--prompt-file`, or
`stdin`.

`productize exec` is headless and ephemeral by default. Use `--agent <name>` to
execute a reusable agent, `--persist` to create `~/.productize/runs/<run-id>/`
for resumable sessions, `--run-id` to continue a persisted session,
`--format json` for lean JSONL, and `--format raw-json` for the full raw event
stream.

| Flag | Default | Description |
| ---- | ------- | ----------- |
| `--ide` | `codex` | Runtime: `claude`, `codex`, `copilot`, `cursor-agent`, `droid`, `gemini`, `opencode`, `pi` |
| `--model` | per IDE | Model override |
| `--agent` | | Reusable agent to execute from `.productize/agents/` or `~/.productize/agents/` |
| `--prompt-file` | | Read prompt text from a file |
| `--format` | `text` | Output contract: `text`, `json`, or `raw-json` |
| `--reasoning-effort` | `medium` | `low`, `medium`, `high`, `xhigh` |
| `--access-mode` | `full` | `default` or `full` runtime access policy |
| `--timeout` | `10m` | Activity timeout per job |
| `--max-retries` | `2` | Retry execution-stage ACP failures or timeouts N times |
| `--retry-backoff-multiplier` | `1.5` | Multiplier applied to the next timeout after each retry |
| `--tail-lines` | `0` | Maximum log lines retained per job; `0` means full history |
| `--add-dir` | | Additional directories to allow, repeatable |
| `--auto-commit` | `false` | Include automatic commit instructions when the prompt asks for code changes |
| `--extensions` | `false` | Enable executable extensions for this exec run |
| `--verbose` | `false` | Emit operational runtime logs to stderr during exec |
| `--tui` | `false` | Deprecated compatibility flag; new exec runs remain headless |
| `--persist` | `false` | Persist exec artifacts under `~/.productize/runs/<run-id>/` |
| `--run-id` | | Resume a previously persisted exec session by run id |
| `--dry-run` | `false` | Preview prompts without executing |

## `productize agents`

Discover and inspect reusable agents.

```bash
productize agents list
productize agents inspect <name>
```

`productize agents list` prints resolved agents from workspace and global scope,
then reports invalid definitions without hiding valid ones. `productize agents
inspect <name>` prints source, runtime defaults, MCP summary, and validation
status for one agent.

## `productize ext`

Manage executable extensions.

```bash
productize ext <subcommand> [flags]
```

| Subcommand | Description |
| ---------- | ----------- |
| `ext list` | List discovered extensions across all scopes |
| `ext inspect <name>` | Show manifest, capabilities, and enablement status |
| `ext install <source>` | Install from a local path or GitHub repo archive |
| `ext uninstall <name>` | Remove a user-scoped extension |
| `ext enable <name>` | Enable an extension on this machine |
| `ext disable <name>` | Disable an extension on this machine |
| `ext doctor` | Validate manifests and report health warnings |

`ext install` accepts `--yes` / `-y`, `--remote local|github`, `--ref`, and
`--subdir`.
