# Complete Web/TUI Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the web-UI/TUI removal that stopped at the frontend layer — strip the now-dead `RuntimeConfig.TUI` field + UISession machinery (Cluster A) and the orphaned browser-facing daemon HTTP API surface (Cluster B), so no removed-feature code, config, or API spec remains.

**Architecture:** v2 removed `web/`, `packages/ui`, static serving, and Bubble Tea, but left two clusters of *live-but-orphaned* code that compiles and tests green while serving a deleted client:
- **Cluster A — TUI:** `RuntimeConfig.TUI bool` is plumbed through 17 source files and force-set to `false` everywhere; `UIEnabled()` hardcodes `return false` and both `setupUI()` are `return nil` stubs. All provably dead.
- **Cluster B — Browser API:** the daemon's HTTP/TCP server carries browser-only middleware (CSRF cookies, Origin/Host validation, active-workspace) and a `/api/ui/dashboard` endpoint that fed the deleted web dashboard. The UDS server (what the CLI uses by default) uses none of it.

**Tech Stack:** Go 1.26, gin, the daemon's dual-transport (`udsapi` unix socket + `httpapi` TCP), goreleaser-free OpenAPI contract test.

**Delivery constraints (this project):**
- Branches off `v2`; commit local-only as `v2` via `git commit --no-verify` (+ Co-Authored-By trailer).
- `make verify` is the gate (now uncached via `test-nocache`). Run it after each cluster.
- This is a **breaking change to the public `productize.Config` Go API** (the embeddable surface re-exported by `productize.go`) and to the daemon OpenAPI contract. That is appropriate at the v2.0.0 major boundary, but deliberate — note it in the changelog.

---

## ⚠️ Gating risk — resolve in Task 0 before any Cluster B removal

Removing browser middleware (CSRF/Origin/Host) is only safe if the **CLI-over-HTTP fallback transport does not depend on it.** The CLI uses the unix socket (`SocketPath`) by default but `internal/api/client/client.go` has an HTTP fallback (`http://127.0.0.1:<port>`). Task 0 must prove that fallback either (a) is never used in practice, or (b) does not send/require CSRF tokens — before deleting the middleware. Do not skip Task 0.

---

## File Structure

### Cluster A — TUI (config field + UISession machinery)
- `internal/core/model/runtime_config.go` — **remove** `TUI bool` field (the canonical definition, line ~42).
- `internal/core/api.go` — **remove** `Config.TUI` field + its mapping (lines ~120, ~363). *Public API surface.*
- `internal/core/run/internal/runshared/config.go` — **remove** `TUI` field (~32) + mapping (~135); delete `UIEnabled()` (~90, already `return false`).
- `internal/core/run/internal/runshared/shutdown.go` — **remove** `UISession` interface (~44).
- `internal/core/run/exec/exec.go` — **remove** `setupExecUI`/`waitExecUI` (~314-326), the `useUI`/`ui` call sites (~240-243), and the `tui` field on `execPreparedStateConfig` + its mutation check (~1341, ~1362).
- `internal/core/run/exec/aliases.go` — **remove** `uiSession` alias (~18) + `setupUI` stub (~40).
- `internal/core/run/executor/aliases.go` — **remove** `uiSession` alias (~26) + `setupUI` stub (~65).
- `internal/core/run/executor/execution.go` — **remove** `awaitUIAfterCompletion` + `shutdownUI` (~526, ~536) + the `ui` field on `jobExecutionContext` + call sites (~509).
- `internal/core/run/executor/shutdown.go` — **remove** `awaitUIAfterCompletion`/`shutdownUI` calls (~120, ~134).
- `internal/core/run/executor/hooks.go` — **remove** `TUI` copy (~156) + `dst.TUI = updated.TUI` (~195).
- `internal/core/workspace/config_types.go` — **remove** `TUI *bool` from the 3 sections (~44, ~58, ~80).
- `internal/core/workspace/config_validate.go` — **delete** `validateWorkflowTUI` (~322) + its 2 call sites (~90, ~136) + the `cfg.TUI` JSON-format rejection (~246).
- `internal/core/workspace/config_merge.go` — **remove** the 3 `TUI:` merge lines (~85, ~106, ~186).
- `internal/core/agent/registry_validate.go` — **remove** the `cfg.TUI` JSON/raw-json rejection (~142).
- `internal/core/model/runtime_config.go` consumers in `internal/core/agents/mcpserver/engine.go` (~219 `runtime.TUI = false`), `internal/core/extension/host_helpers.go` (~153 `tui` json field), `internal/core/extension/host_writes.go` (~289 `TUI:` copy) — **remove** each.
- `internal/daemon/run_manager.go` — **remove** `TUI *bool` json field (~164) + 3 `runtimeCfg.TUI = false` (~782, ~907, ~1027).
- `internal/daemon/review_watch.go` — **remove** `runtimeCfg.TUI = false` (~206).
- `internal/daemon/extension_bridge.go` — **remove** `normalized.TUI = false` (~122).
- `internal/cli/state.go` — **remove** `TUI: s.tui` (~332).
- `internal/cli/workspace_config.go` — **remove** the 3 `applyConfig(cmd, "tui", …)` (~133, ~145, ~166) + the `s.tui` field.
- `internal/cli/reviews_exec_daemon.go` — **remove** the dead `--tui` flag registration + its error handler (~560-561, ~601).
- **Test files (9):** `internal/core/workspace/config_test.go`, `internal/core/agent/registry_test.go`, `internal/core/run/exec/exec_test.go`, `internal/core/run/executor/execution_acp_test.go`, `internal/core/run/executor/execution_ui_test.go` (**delete whole file** — tests only TUI behavior), `internal/core/kernel/commands/commands_test.go`, `internal/cli/workspace_config_test.go`, `internal/cli/reviews_exec_daemon_additional_test.go`, `internal/cli/root_test.go`, `internal/cli/commands_test.go`, `internal/cli/root_command_execution_test.go` — remove TUI assertions/fixtures.

### Cluster B — Browser API
- `internal/api/httpapi/browser_middleware.go` — **delete the browser-only middleware** (`csrfMiddleware`, `ensureCSRFCookie`, `newCSRFToken`, `originValidationMiddleware`, `hostValidationMiddleware`, and `csrfCookieLifetime`) after Task 0 clears them. Keep `activeWorkspaceMiddleware`/`requiresActiveWorkspace`/`validateWorkspaceRoot` only if still needed by non-browser routes (verify).
- `internal/api/httpapi/routes.go` / `internal/api/httpapi/server.go` — **remove** the wiring that applies the deleted middleware.
- `internal/api/core/routes.go` — **remove** `ui.GET("/dashboard", handlers.GetDashboard)` (~30) and the `ui` route group if it becomes empty.
- `internal/api/core/handlers.go` — **remove** `GetDashboard` (~573-585+).
- `internal/api/core/interfaces.go` — **remove** `Dashboard(...)` from the interface (~60) + `DashboardPayload` + `DashboardQueueSummary` types (~190-202).
- `internal/daemon/query_service.go`, `internal/daemon/task_transport_service.go`, `internal/daemon/transport_mappers.go` — **remove** the `Dashboard` implementations + mappers.
- `internal/api/contract/routes.go` — **remove** the `/api/ui/dashboard` route entry (~64-69).
- `openapi/productize-daemon.json` — **remove** the `/api/ui/dashboard` path + `DashboardPayload`/`DashboardQueueSummary` schemas; **retitle** `info.title` "Productize Daemon Browser API" → "Productize Daemon API"; scrub "browser"/"Session" wording tied to the removed surface.
- `internal/api/httpapi/openapi_contract_test.go` — keep; it will re-validate spec == routes after both are updated.

---

## Task 0: Resolve the CSRF / HTTP-fallback gating risk

**Files:** read-only investigation; produce a decision note.

- [ ] **Step 1: Determine whether the CLI-over-HTTP fallback sends CSRF tokens**

Run:
```bash
grep -rn 'HeaderCSRF\|X-CSRF\|csrf' internal/api/client/ --include='*.go'
grep -rn 'baseURL.*127.0.0.1\|HTTPPort' internal/api/client/client.go
```
Expected: the CLI client does **not** set a CSRF header (it talks UDS by default; the HTTP path is a bare JSON client). If confirmed, the CSRF middleware only ever served the browser → safe to remove.

- [ ] **Step 2: Confirm the HTTP fallback path is reachable only without CSRF, or unused**

Read `internal/api/client/client.go` transport selection. Document: when is `SocketPath` empty (HTTP fallback taken)? If always set by CLI commands (it is — `daemon_commands.go:162`, `daemon.go:256`), the HTTP server currently serves no first-party client that passes CSRF, so the CSRF/Origin/Host middleware is browser-only.

- [ ] **Step 3: Write the decision**

Record in the PR description: "Browser middleware (CSRF/Origin/Host) confirmed browser-only — UDS uses only RequestID+Error middleware; CLI uses UDS; HTTP fallback sends no CSRF token. Safe to remove." OR, if a dependency is found, stop and revise this plan.

---

## Task 1: Remove the UISession machinery (Cluster A, leaf-first)

**Files:** `runshared/shutdown.go`, `runshared/config.go`, `exec/aliases.go`, `executor/aliases.go`, `exec/exec.go`, `executor/execution.go`, `executor/shutdown.go`, `executor/execution_ui_test.go`

- [ ] **Step 1: Delete the dead UI test**

```bash
git rm internal/core/run/executor/execution_ui_test.go
```
Rationale: it only exercises `awaitCompletion` waiting on a UI quit — behavior that no longer exists.

- [ ] **Step 2: Remove UISession interface + setupUI stubs + wrappers**

Delete `UISession` (`runshared/shutdown.go`), `UIEnabled()` (`runshared/config.go`), the `uiSession` aliases + `setupUI` stubs (`exec/aliases.go`, `executor/aliases.go`), `setupExecUI`/`waitExecUI` (`exec/exec.go`), `awaitUIAfterCompletion`/`shutdownUI` + the `ui` field on `jobExecutionContext` (`executor/execution.go`, `executor/shutdown.go`). Replace the `useUI`/`ui` call sites in `ExecuteExec` with the direct non-UI path (the function already runs headless).

- [ ] **Step 3: Compile**

Run: `go build ./internal/core/run/...`
Expected: passes. Fix any reference to removed symbols.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "v2" -m "Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>" --no-verify
```

## Task 2: Remove the TUI config field (Cluster A, root)

**Files:** all `TUI`/`tui` sites listed in Cluster A File Structure (model, api, runshared, workspace config types/validate/merge, registry_validate, mcpserver, extension host, daemon ×5, cli state/workspace_config/reviews flag) + their tests.

- [ ] **Step 1: Remove the field definitions**

Remove `TUI bool` from `model/runtime_config.go`, `core/api.go` `Config`, `runshared/config.go`; remove `TUI *bool` from `workspace/config_types.go` (3 sites) and the `tui` json field from `daemon/run_manager.go` + `extension/host_helpers.go`.

- [ ] **Step 2: Remove all readers/writers**

Delete `validateWorkflowTUI` + call sites + the JSON-format `cfg.TUI` rejection (`config_validate.go`), the 3 `config_merge.go` `TUI:` lines, `registry_validate.go:142`, the `runtime.TUI = false` / `runtimeCfg.TUI = false` / `normalized.TUI = false` force-sets (mcpserver, daemon ×5), the `hooks.go` copies, `host_writes.go:289`, `cli/state.go:332`, the 3 `cli/workspace_config.go` `applyConfig(... "tui" ...)` + the `s.tui` field, and the `--tui` flag in `reviews_exec_daemon.go`.

- [ ] **Step 3: Update tests**

Remove TUI assertions/fixtures from the 9 test files. For `config_validate` tests that asserted `tui=true` is rejected, delete those cases (the knob no longer exists). For golden/help tests, regenerate expected output.

- [ ] **Step 4: Build + per-package tests**

Run: `go build ./... && go test -count=1 ./internal/core/... ./internal/cli/ ./internal/daemon/`
Expected: green.

- [ ] **Step 5: Commit** (same `v2` form)

## Task 3: Remove the browser middleware (Cluster B)

**Prerequisite:** Task 0 cleared CSRF/Origin/Host as browser-only.

**Files:** `httpapi/browser_middleware.go`, `httpapi/routes.go`, `httpapi/server.go`

- [ ] **Step 1: Remove the middleware functions + wiring**

Delete `csrfMiddleware`, `ensureCSRFCookie`, `newCSRFToken`, `csrfCookieLifetime`, `originValidationMiddleware`, `hostValidationMiddleware` and their `engine.Use(...)` wiring in the HTTP server setup. Re-evaluate `activeWorkspaceMiddleware`/`requiresActiveWorkspace`: keep only if a non-browser route needs active-workspace resolution; otherwise remove.

- [ ] **Step 2: Build + httpapi tests**

Run: `go build ./internal/api/... && go test -count=1 ./internal/api/...`
Expected: green (contract test still passes — routes unchanged yet).

- [ ] **Step 3: Commit** (`v2`)

## Task 4: Remove the `/api/ui/dashboard` endpoint chain (Cluster B)

**Files:** `core/routes.go`, `core/handlers.go`, `core/interfaces.go`, `daemon/query_service.go`, `daemon/task_transport_service.go`, `daemon/transport_mappers.go`, `contract/routes.go`, `openapi/productize-daemon.json`

- [ ] **Step 1: Remove route + handler + interface + impls**

Delete `ui.GET("/dashboard", ...)` (and the `ui` group if empty), `GetDashboard`, the `Dashboard(...)` interface method, `DashboardPayload`/`DashboardQueueSummary`, and the daemon-side `Dashboard` impls + mappers.

- [ ] **Step 2: Remove the route from the contract + spec, retitle the spec**

Delete the `/api/ui/dashboard` entry in `contract/routes.go`; in `openapi/productize-daemon.json` remove the path + the two Dashboard schemas, change `info.title` to "Productize Daemon API", and scrub browser/session wording tied to removed surface.

- [ ] **Step 3: Build + contract test**

Run: `go build ./... && go test -count=1 ./internal/api/httpapi/ -run OpenAPI`
Expected: contract test passes (spec now == 39 routes, dashboard gone).

- [ ] **Step 4: Commit** (`v2`)

## Task 5: Full gate + docs

- [ ] **Step 1: Run the full verification gate**

Run: `make verify`
Expected: `0 issues`, all tests pass, exit 0.

- [ ] **Step 2: Grep for any residual TUI/browser-API references**

```bash
grep -rnE '\bTUI\b|UISession|UIEnabled|/api/ui/dashboard|csrfMiddleware|Browser API' internal/ openapi/ --include='*.go' --include='*.json' | grep -v _test
```
Expected: empty (or only intentional deprecated `--tui`/`--ui` CLI aliases, if those are being kept — decide explicitly).

- [ ] **Step 3: Note the breaking changes**

Document in the changelog: removed `productize.Config.TUI`, the `tui` config key, `/api/ui/dashboard`, and the daemon browser middleware (CSRF/Origin/Host). Major-version-appropriate.

- [ ] **Step 4: Commit** (`v2`)

---

## Open decision (resolve before Task 2 Step 2)

The CLI still accepts `--ui` (alias for `--stream`) and `--tui` (deprecated, headless) on `tasks run`/`exec`. These are **separate** from the removed config field — they're CLI flags that map to stream behavior. Decide: keep them as deprecated aliases (current docs say so), or remove them too for a clean v2.0.0 surface. If removed, also update `docs/cli-reference.md` and the README/skill docs that document them as deprecated.

---

## Self-Review

- **Spec coverage:** Cluster A (TUI field + UISession) → Tasks 1-2; Cluster B (middleware + dashboard + spec) → Tasks 0,3,4; gate → Task 5. ✓
- **Placeholder scan:** file paths use `~line` markers because exact lines shift during removal; each task names the concrete symbols to delete, not "handle TUI." Acceptable — the symbols are exact. ✓
- **Risk gating:** Task 0 explicitly blocks Cluster B until CSRF-is-browser-only is proven. ✓
- **Ordering:** leaf-first (UISession stubs → field → middleware → endpoint → spec) so each task compiles. ✓
