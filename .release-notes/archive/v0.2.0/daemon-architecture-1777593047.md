---
title: Daemon-based architecture
type: breaking
---

Productize now runs every task, review, and exec workflow through a long-lived, home-scoped daemon at `~/.productize/`. The daemon owns runtime state in SQLite (`~/.productize/db/global.db` plus per-run `run.db`), exposes a UDS + HTTP API, and supports re-attach and observe across separate CLI invocations. Existing scripts that called `productize start` or `productize fix-reviews` need updates — most legacy top-level commands are gone or moved under the new `tasks`, `reviews`, `runs`, and `daemon` groups. The CLI auto-starts the daemon on first invocation, so most users do not need to start it explicitly.

### What's new

- `productize daemon start | status | stop` lifecycle commands, plus `--foreground` for attached runs and `--web-dev-proxy <url>` for proxying a frontend dev origin through the daemon HTTP transport.
- `productize workspaces list | show | register | unregister | resolve` workspace registry — workspaces are registered lazily on first use, or explicitly via `register`.
- `productize tasks run <slug>` daemon-backed workflow runner with `--attach auto|ui|stream|detach`, `--ui`, `--stream`, `--detach`, and `--task-runtime` overrides.
- `productize reviews fetch | list | show | fix` review command family (replaces the old top-level `fix-reviews` / `fetch-reviews`).
- `productize runs attach <run-id> | watch <run-id> | purge` for re-attaching to live runs and pruning terminal artifacts.
- `--format text|json` flag on operator/daemon commands for machine-readable output.
- New durable stores: `~/.productize/db/global.db` (workspaces, runs index) and per-run `~/.productize/runs/<run-id>/run.db`.
- `productize migrate` is now **required** before daemon-backed commands run on legacy projects (it also infers task types — see the dedicated note).

### Breaking changes

| Area                    | Before                                   | After                                                                                           |
| ----------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Workflow run            | `productize start --name <slug>`            | `productize tasks run <slug>` (top-level `start` is removed)                                       |
| Review fix              | `productize fix-reviews`                    | `productize reviews fix` (top-level `fix-reviews` kept as alias)                                   |
| Review fetch            | `productize fetch-reviews`                  | `productize reviews fetch` (top-level `fetch-reviews` kept as alias)                               |
| Per-task runtime config | `[[start.task_runtime_rules]]`           | `[[tasks.run.task_runtime_rules]]` (TOML), or `--task-runtime` (CLI/TUI)                        |
| Runtime artifacts       | `<workspace>/.productize/runs/<run-id>/`    | `~/.productize/runs/<run-id>/` (now includes durable `run.db`)                                     |
| Sync semantics          | `productize sync` regenerated `_meta.md`    | Reconciles workflow state into `global.db`; one-time cleanup of legacy `_meta.md` / `_tasks.md` |
| Preflight               | `productize start` skill check              | `tasks run` and `reviews fix` block on missing skill installs                                   |
| Public Go API           | File-based readers in `pkg/productize/runs` | Daemon-transport readers; signature changes in `Run`, `watch`, `tail`, `replay`                 |
| Migrate                 | Recommended                              | **Required** before any daemon-backed workflow command on legacy projects                       |

### New daemon workflow

```bash
# Lifecycle (most users do not need explicit start; tasks/reviews auto-start)
productize daemon start                                     # detached, returns status
productize daemon start --foreground                        # attached
productize daemon start --foreground \
  --web-dev-proxy http://127.0.0.1:3000                  # for UI development
productize daemon status --format json
productize daemon stop --force                              # cancel runs, then stop

# Workspaces
productize workspaces register .
productize workspaces list --format json
productize workspaces show <id-or-path>

# Run a workflow
productize tasks run user-auth                              # auto-attach (TUI if interactive)
productize tasks run user-auth --stream                     # textual stream
productize tasks run user-auth --detach                     # fire-and-forget
productize tasks run user-auth \
  --task-runtime type=frontend,ide=codex,model=gpt-5.5

# Reattach / observe / purge
productize runs attach <run-id>
productize runs watch  <run-id>
productize runs purge

# Reviews
productize reviews fetch user-auth --provider coderabbit --pr 42
productize reviews list  user-auth
productize reviews fix   user-auth --ide claude --concurrent 2 --batch-size 3
```

### Daemon lifecycle improvements

- `daemon start --foreground` runs the daemon attached to the current shell with structured logs.
- HTTP port defaults to OS-chosen (ephemeral) and is reported by `daemon status`. Pin it with `PRODUCTIZE_DAEMON_HTTP_PORT=<n>`. Bind host is loopback-only (`127.0.0.1`) and non-loopback origins are rejected at the middleware layer.
- Attaching to a run that has already settled now falls back to streaming the persisted event log instead of erroring.
- `daemon stop` accepts `--force` to cancel owned runs before shutdown; otherwise it drains gracefully.

### Migration steps

1. Upgrade the binary. On first invocation the daemon creates `~/.productize/{config.toml,agents,extensions,state,daemon,db,runs,logs,cache}`.
2. For legacy projects with XML-tagged artifacts: run `productize migrate` once before any daemon-backed command.
3. Replace scripts:
   - `productize start --name X` → `productize tasks run X`
   - `productize fix-reviews` → `productize reviews fix` (alias still works)
   - `productize fetch-reviews` → `productize reviews fetch` (alias still works)
4. Update TOML: rename `[[start.task_runtime_rules]]` to `[[tasks.run.task_runtime_rules]]`. Move `id=` selectors to `--task-runtime` (TOML rejects `id=` rules).
5. Stop reading `<workspace>/.productize/runs/` directly — runtime artifacts now live in `~/.productize/runs/<run-id>/` and include a durable `run.db`. Use `pkg/productize/runs` (daemon transport) or the daemon HTTP/UDS API.
6. Optional: set `PRODUCTIZE_DAEMON_HTTP_PORT=<n>` to pin the HTTP port (`0` requests an ephemeral port). `PRODUCTIZE_WEB_DEV_PROXY` mirrors `--web-dev-proxy`.
