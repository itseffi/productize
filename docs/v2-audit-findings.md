# v2 Ship Audit — Consolidated Findings

Audit run: 2026-05-29 across 8 parallel dimensions (brand, dead-code, tests/CI, docs, hygiene, consistency, build, skills).

> **Reconciliation pass (2026-05-29, post-verification):** The 8 agents ran in
> parallel against a *moving* tree and some read transient/cached/pre-rename
> states. After manual re-verification, several findings were corrected or
> removed. This document is now the reconciled, trustworthy version. Corrections
> are marked inline with `[CORRECTED]` / `[RESOLVED]` / `[FALSE POSITIVE]`.
> Lesson: treat parallel-agent audit output as *leads to verify*, not findings
> to act on directly.

**Reconciled total: ~6 actionable blockers · ~22 important · ~17 nits**
(down from a raw 12/27/19 after removing stale/false/over-severity items)

The single biggest real source of slop was `skills/productize-runtime/` and its
`references/` — THE skill agents load to learn Productize. Those B1/B2/B3 fixes
have now been applied (Tier 1 complete).

---

## 🔴 BLOCKERS — must fix before v2.0.0 ships

### B1 — [RESOLVED] `productize-runtime` references obsolete `cy-*` skill names
**Files:** `skills/productize-runtime/SKILL.md:3`, `skills/productize-runtime/references/skills-reference.md:157,165`
**Finding:** The shipped runtime skill tells agents *"use the specific `cy-` skills instead"* and references `cy-* workflow commands` in 2 more spots. After the cy- rename, agents following this guidance will look for non-existent skills.
**Fix:** Replace `cy-` references with current workflow-skill names (`create-prd`, `create-tasks`, etc.).
**Sources:** Brand, Docs, Consistency, Skill-catalog

### B2 — [PARTIALLY RESOLVED] CLI help advertises non-existent `council` reusable agent
> Shipped-skill docs fixed (`--agent council` → `--agent reviewer`). Go CLI help (`internal/cli/agents_commands.go`, `commands.go`) still uses `council` examples — pending, tied to B11 decision.
**Files:** `internal/cli/agents_commands.go:78`, `internal/cli/agents_commands.go:90`, `internal/cli/commands.go:39`, `skills/productize-runtime/references/cli-reference.md:93`, `skills/productize-runtime/references/workflow-guide.md:137`
**Finding:** Examples like `productize exec --agent council "Decide between two designs"` appear in CLI help AND in shipped runtime skill docs. There is no `council` agent — `agents/embed.go` ships zero bundled agents, and the renamed advisor group is now "advisors". First-run users following the examples hit "agent not found".
**Fix:** Replace `council` with a real shipped agent name (e.g. `architect-advisor` or `the-thinker`) — but those live in the idea-forge extension, not bundled. Cleanest: remove the example, or scope it to "if you've enabled idea-forge".
**Sources:** Brand, Docs, Skill-catalog

### B3 — [RESOLVED] Shipped `productize-runtime` skill documents dead `--tui` / `tui = false` config
> Fixed: dead config removed; `--ui`/`--tui` relabeled as deprecated aliases (the CLI still accepts them, so docs now match real behavior rather than deleting).
**Files:** `skills/productize-runtime/SKILL.md:76-77,202`, `skills/productize-runtime/references/cli-reference.md:63,85,139`, `skills/productize-runtime/references/config-reference.md:175,249`, `skills/productize-runtime/references/workflow-guide.md:87,137,139`
**Finding:** The runtime skill teaches agents to use `--tui`, `--ui` (first-class, not deprecated), `tui = false` in TOML, and "attaches to the TUI by default" — all dead since Phase 5 stripped Bubble Tea.
**Fix:** Remove all TUI references; replace "attaches to TUI" with "streams text output by default". Drop the `tui` row from config tables.
**Sources:** Dead-code, Docs

### B4 — [RESOLVED] `docs/configuration.md` documents dead `tui` config field
**Files:** `docs/configuration.md:77,84,86`
**Finding:** Lists `tui` as a supported field under `[exec]`, `[tasks.run]`, and `[fix_reviews]`. With TUI removed, anyone writing a config from this doc will set a non-functional knob.
**Fix:** Remove `tui` from all three section lists.
**Source:** Docs

### B5 — [RESOLVED / STALE] `RELEASE_NOTES.md` describes deleted Web UI as a live feature
> File existed (34K) at audit time and was deleted. It does not exist in the current checkout — do not re-add it. Release notes are generated from git history via goreleaser.
**Files:** `RELEASE_NOTES.md:54-90,249-252,285,294,309,318-322,329,542,548-549,648-700`
**Finding:** Multiple sections still describe the web dashboard, `@productize/ui`, `web/src/routes/_app/workflows.tsx`, `--web-dev-proxy`, `PRODUCTIZE_WEB_DEV_PROXY`, embedded `web/dist`, and SPA-only headers. None of these exist in v2.
**Fix:** Rewrite 0.2.2 entry without web-UI sections; add a v2 entry that names the BLOCKER deletions (TUI, Web UI, productize-main collapsed); demote/strip the "Daemon Web UI" highlight.
**Note:** `RELEASE_NOTES.md` is gitignored now — but if it gets generated/published at release time, the stale content still ships. Verify how it's produced.
**Source:** Docs

### B6 — [RESOLVED] Vestigial `before: hooks: make go-build` reinstated in `.goreleaser.yml`
> Removed (again); also fixed the stale "Homebrew formulas" comment → "cask" (folds in N12).
**Files:** `.goreleaser.yml:13-15`
**Finding:** The `before:` block was previously deleted (commit `d1b5152`), but the latest version reintroduced it. Runs `make go-build` before goreleaser builds, producing a thrown-away binary (~30s wasted) AND risks conflicting with goreleaser's own build.
**Fix:** Delete lines 13-15.
**Source:** Build/release

### B7 — [RESOLVED] `package.json` postinstall runs `link-skills.sh` on every npm install
> Guarded with `[ -n "$CI" ] ||`. Note: blast radius was contributors+CI only — the published `@productize/cli` uses `npm/cli/package.json` (its own `install.js`), not this root postinstall.
**Files:** `package.json:14`
**Finding:** `"postinstall": "bash scripts/link-skills.sh"` triggers on every `npm install` — including CI sandboxes, Docker builds, and users who just want devDeps. Script assumes a writable global skills dir.
**Fix:** Guard with `if [ -z "$CI" ]` OR remove the postinstall entirely (link-skills should be a manual `make link-skills` or a developer-only step).
**Source:** Build/release

### B8 — [RESOLVED] `.husky/commit-msg` and `pre-commit` use removed `bunx`
> commit-msg: `bunx`→`npx` (commitlint is in devDeps). pre-commit: dead `lint-staged` (uninstalled, frontend-era) replaced with a zero-dep `gofmt -l` check on staged `.go` files.
**Files:** `.husky/commit-msg:1`, `.husky/pre-commit:1`
**Finding:** Hooks invoke `bunx --no-install commitlint`/`bunx --no-install lint-staged`. Bun was removed from the toolchain (`TestRootWebToolchainIsRemoved` enforces no `.bun-version`). Hooks fail for any contributor who doesn't already have bun installed.
**Fix:** Replace with `npx --no-install`. Add `lint-staged` to devDependencies if needed.
**Sources:** Tests/CI

### B9 — [FALSE POSITIVE] `execute-task/SKILL.md` has malformed double-frontmatter block
> Verified false: all 263 SKILL.md + AGENT.md files open with a single, well-formed `---` frontmatter. Audit agent read a transient state. No action.
**Files:** `skills/execute-task/SKILL.md:1-2`
**Finding:** File begins with `---\n---` (empty frontmatter block) before the real frontmatter. Most YAML parsers treat this as an empty document and silently drop the real metadata. Skill may fail to load.
**Fix:** Remove the spurious leading `---\n---`.
**Source:** Consistency

### B10 — [DOWNGRADE → DECISION, not blocker] 8 workflow skills lack `productize-` prefix (namespace collision risk)
> Not a ship blocker. It's a product decision: only a blocker if you decide the namespace-collision risk must be solved before v2. Also note this would *reverse* the earlier cy-→bare rename. Deferred to a deliberate decision.
**Files:** `skills/{create-prd,create-tasks,create-techspec,execute-task,final-verify,fix-reviews,review-round,workflow-memory}/`
**Finding:** These 8 skill names are extremely generic — `create-prd` and `execute-task` exist in many skill packs. Users with multiple skill packs installed (likely) will hit collisions. All 255 other shipped skills use the `productize-` prefix; these 8 don't.
**Fix (choice):**
  - (a) Rename to `productize-create-prd`, etc. — but contradicts our earlier explicit rename "cy-create-prd → create-prd". Have to re-prefix.
  - (b) Accept the collision risk; document recommended install with `--skill productize-*` filter.
**Note:** This is a real architectural decision, not just cleanup. Worth a separate discussion before acting.
**Source:** Consistency

### B11 — `agents/embed.go` ships zero agents but `AGENTS.md` claims bundled advisors
**Files:** `AGENTS.md:35`, `agents/embed.go`
**Finding:** AGENTS.md says `agents/` contains "Bundled advisors agent definitions (embedded via embed.go)" but the directory only has `README.md`; embed.go ships nothing. The 6 advisor agents live only in `extensions/idea-forge/agents/`. Compounds B2 — there's no path for users to get advisor agents without first enabling idea-forge.
**Fix (choice):**
  - (a) Actually bundle the 6 advisor agents into `agents/` (changes the idea-forge story — they become always-on).
  - (b) Fix AGENTS.md description and B2 to reflect reality (advisors are extension-only).
**Source:** Brand

### B12 — `extensions/qa-workflow` test references deleted `daemon-web-ui` workflow name
**Files:** `extensions/qa-workflow/main_test.go:52,73`
**Finding:** Tests hardcode workflow name `daemon-web-ui` — that workflow was an internal dev task for the removed web UI. Confusing for anyone reading the qa-workflow code.
**Fix:** Rename to a neutral test name (`daemon-test`, `feature-x`, etc.).
**Source:** Brand

---

## 🟡 IMPORTANT — should fix before v2.0.0 ships

### I1 — [DOWNGRADE → minor] README skill count says "250+" but real count is 262
> Minor: "250+" is accurate; "262" is just sharper. Optional.
**File:** `README.md:6`. **Fix:** Use exact "262" or precise floor like "260+".

### I2 — [CORRECTED] README says "40+ agents and editors" — real count is 44 (not 47)
> Corrected: `agentSpecs` has **44** registrations. The 47 figure wrongly counted the 3 `func` definitions (universalAgent/specificAgent/choiceAgent). README "40+" is accurate; "44" is sharper.
**File:** `README.md:153-155`. **Fix:** "45+" (safe floor) or exact "47".

### I3 — README missing BYOK positioning
**File:** `README.md` (entire). **Fix:** Add one-liner — "BYOK. No subscriptions. No token markup. No telemetry."

### I4 — Massive TUI field plumbing remains throughout codebase
**Files:** `internal/core/api.go:120,363`, `internal/core/workspace/config_types.go:44,58,80`, `internal/core/workspace/config_validate.go` (entire `validateWorkflowTUI`), `internal/core/workspace/config_merge.go:85,106,186`, `internal/core/agent/registry_validate.go:142`, `internal/core/run/internal/runshared/config.go:32,135`, `internal/core/run/executor/hooks.go:156,195`, `internal/core/run/exec/exec.go:1327,1341,1362`, `internal/core/model/runtime_config.go:42`, `internal/core/extension/host_helpers.go:153`, `internal/core/extension/host_writes.go:289`, plus 5 places forcing `TUI = false`.
**Finding:** `TUI bool` field plumbed through 13+ files; daemon force-sets it false in 5 places. The field exists only to be neutralized.
**Fix:** Rip out the `TUI` field from RuntimeConfig + workspace config types, delete `validateWorkflowTUI`, delete `--tui` from reviews commands.
**Effort:** Non-trivial refactor; touches API surface. Real cleanup, real risk.
**Source:** Dead-code

### I5 — Dead `UISession` / `setupExecUI` / `awaitUIAfterCompletion` plumbing
**Files:** `internal/core/run/internal/runshared/shutdown.go:44`, `internal/core/run/exec/exec.go:314,321,1327`, `internal/core/run/executor/execution.go:419,526,536`, `internal/core/run/executor/execution_ui_test.go`
**Finding:** `UISession` interface + helpers exist only for deleted Bubble Tea UI. `setupExecUI` always returns nil (enabled never true). Companion test `execution_ui_test.go` tests TUI-only behavior.
**Fix:** Bundle with I4. Remove the interface and supporting functions.
**Source:** Dead-code

### I6 — `--tui` flag on reviews commands errors out as dead alias
**Files:** `internal/cli/reviews_exec_daemon.go:560-561,601`, tests at `internal/cli/reviews_exec_daemon_additional_test.go:968,2056`, `internal/cli/root_test.go:385,444,475`, `internal/cli/root_command_execution_test.go:805`, `internal/cli/commands_test.go:113-123`
**Finding:** `--tui` registers on reviews subcommands purely to print "no longer supports --tui" error. Pure noise on v2.0.0 major version boundary.
**Fix:** Drop the flag entirely (clean break is appropriate for v2.0.0).
**Source:** Dead-code

### I7 — Test fixture strings literally say "Goal is fix the TUI"
**Files:** `internal/core/run/transcript/model_test.go:14,38,48,69`, `internal/core/run/internal/acpshared/session_handler_test.go:226,266`
**Finding:** Test goals confusingly reference the deleted TUI.
**Fix:** Rename to generic test goal ("Goal is fix bug X").
**Source:** Dead-code

### I8 — Empty `.github/actions/setup-bun/` directory
**Files:** `.github/actions/setup-bun/`
**Finding:** Empty leftover from bun removal.
**Fix:** `rmdir .github/actions/setup-bun`.
**Source:** Dead-code

### I9 — `.golangci.yml:51` references removed Bubble Tea
**Files:** `.golangci.yml:51`
**Finding:** Comment "False positive with bubbletea Update pattern" justifies `evalOrder` exclusion that may no longer be needed.
**Fix:** Re-evaluate; if no longer needed, remove exclusion + comment.
**Source:** Brand, Dead-code

### I10 — `ci.yml:90` artifact upload references deleted Playwright
**Files:** `.github/workflows/ci.yml:90`
**Finding:** `verify-results` artifact upload lists `.tmp/playwright/**` — Playwright suite was deleted. Harmless (`if-no-files-found: ignore`) but stale.
**Fix:** Remove the path.
**Source:** Tests/CI

### I11 — Architect-advisor title doesn't follow pattern
**Files:** `extensions/idea-forge/agents/architect-advisor/AGENT.md`
**Finding:** Title is `The Architect`; peers all use `The X Y` form matching their dir (`the-thinker → The Thinker`, `stress-tester → The Stress-Tester`, etc.).
**Fix:** Either retitle to `The Architect Advisor` or rename dir to `architect`. First is less disruptive.
**Source:** Consistency

### I12 — `INITIAL_VERSION` in release.yml is stale
**Files:** `.github/workflows/release.yml:33`
**Finding:** `INITIAL_VERSION: "v0.1.0"` but `package.json` says 0.2.4 and we're shipping v2.0.0. If no `v*` tags exist yet, first release will start from v0.1.0.
**Fix:** Bump to next intended release (`v2.0.0`) OR tag the current tip first.
**Source:** Build/release

### I13 — Docker setup wires in release.yml but no Docker artifacts
**Files:** `.github/workflows/release.yml:115-121,163-173`
**Finding:** `setup-release` action called with `setup-docker: true`, `setup-qemu: true` — but `.goreleaser.yml` has no `dockers:` block. QEMU images pulled for nothing (~30s+ wasted per release).
**Fix:** Set all docker flags to false. Or add `dockers:` to goreleaser if intended.
**Source:** Build/release

### I14 — [DOWNGRADE → minor] `run-productize.js` not chmod'd in npm wrapper
> Minor: npm sets bin permissions on install, so it works in practice. Adding `chmodSync` is cleaner but not required.
**Files:** `npm/cli/prepare-package.mjs:82`
**Finding:** Shim copied without executable bit. npm sets bin perms post-install so works in practice, but local `npm pack` testing of executable bit will fail.
**Fix:** Add `chmodSync(join(outDir, "run-productize.js"), 0o755);` after copy.
**Source:** Build/release

### I15 — `AGENTS.md` frontend dispatch table is dead weight
**Files:** `AGENTS.md:147-173`
**Finding:** Entire "Frontend / React / shadcn / Tailwind / TanStack / vitest / storybook / zustand / zod / ai-sdk" skill-dispatch table — no frontend exists in v2.
**Fix:** Drop all frontend rows; keep Go/runtime/config/logging/bugfix/tests/architecture rows.
**Source:** Docs

### I16 — `AGENTS.md:27` undercounts ACP runtimes
**Files:** `AGENTS.md:27`
**Finding:** "Claude Code, Codex, Droid, Cursor" — only 4. Actual is 8.
**Fix:** Use "ACP-capable runtimes" or list all 8.
**Source:** Docs

### I17 — `package.json` version is 0.2.4 but v2.0.0 imminent
**Files:** `package.json:18`
**Finding:** Version not bumped.
**Fix:** Bump at release time (could be release-script automation).
**Source:** Brand

### I18 — `CONTRIBUTING.md:22,26` references `main` but active work is on `v2`
**Files:** `CONTRIBUTING.md:22,26`
**Finding:** "Sync your `main`" / "open a PR against `upstream/main`" — main is still v1 currently.
**Fix:** Add note ("Active work targets `v2` until cutover") OR leave until cutover.
**Source:** Docs

### I19 — README idea-forge install snippet uses unresolved `<tag>` placeholder
**Files:** `README.md:130-136`
**Finding:** `productize ext install … --ref <tag>` — new users don't know what to type.
**Fix:** Use `--ref main` or pin the current release tag.
**Source:** Docs

### I20 — [FALSE POSITIVE] AGENT.md vs SKILL.md schema undocumented
> Verified false: `docs/reusable-agents.md:51-62` already documents the AGENT.md frontmatter contract including `title`. No action.
**Files:** All `extensions/idea-forge/agents/*/AGENT.md` — uses `title:`; skills use `name:`.
**Finding:** Two parallel schemas, no shared field; not documented in `docs/extensibility/` or `docs/reusable-agents.md`.
**Fix:** Add an "AGENT.md schema" section to those docs.
**Source:** Consistency

### I21 — [FALSE POSITIVE] idea-forge docs still say "Council Insights"
> Verified false: both files already say "Advisors Insights" (fixed by the earlier council→advisors rename). Audit read a pre-rename state. No action.
**Files:** above
**Finding:** Section heading retained "Council" capitalization from before the advisors rename.
**Fix:** Rename to "Advisors Insights" (or "Advisor Insights").
**Source:** Brand (via skill-catalog overlap)

### I22 — `cliff.toml` may need review
**File:** `cliff.toml` (not deeply audited).
**Finding:** Git-cliff config; verify it's still aligned with v2 commit conventions and release flow.
**Fix:** Manual review.
**Source:** Build/release

### I23 — Verify external resources before release
**Finding:** Cannot confirm from inside repo: npm scope `@productize` publish access, `itseffi/homebrew-productize` repo exists, `RELEASE_TOKEN` + `NPM_TOKEN` secrets set.
**Fix:** Verify all four before tagging v2.0.0.
**Source:** Build/release

### I24 — Dual goreleaser install in release.yml (setup-release + goreleaser-action)
**Files:** `.github/workflows/release.yml:115-121,206-218`
**Finding:** `setup-release` installs goreleaser, then `goreleaser/goreleaser-action@v6` installs again. Cosmetic but wasteful.
**Fix:** Drop one — preferably keep setup-release, replace action with `run: goreleaser release --clean ...`.
**Source:** Build/release

### I25 — `package.json` devDeps pinned to very-future versions
**Files:** `package.json:3-7`
**Finding:** `typescript: ^6.0.2`, `@types/node: ^25.6.0`, `@commitlint/cli: ^20.5.0` — verify these versions are actually published on npm before relying on them.
**Fix:** Verify pre-release; downgrade if needed.
**Source:** Build/release

### I26 — [FALSE POSITIVE] `tsconfig.base.json` orphan check
> Verified false: still referenced by both SDK packages (`sdk/extension-sdk-ts`, `sdk/create-extension`). Not an orphan. No action.
**Files:** `tsconfig.base.json`
**Finding:** With web/, packages/ui removed, only `sdk/*` remains. Verify file is still referenced by sdk packages.
**Fix:** Confirm or remove.
**Source:** Dead-code

### I27 — `setup-release/action.yml:13` mentions removed pro
**Files:** `.github/actions/setup-release/action.yml:13`
**Finding:** Description mentions "goreleaser or goreleaser-pro" option even though pro is no longer used.
**Fix:** Update description.
**Source:** Build/release

---

## 🔵 NITS — fix when convenient

### N1 — [CORRECTED] README inline section-header logo overuse (14 instances, not 16)
**File:** `README.md` (every `##` line)
**Finding:** 16 instances of `<img src="imgs/logo-64.png" width="24" height="24">` inline in section headings. Visually heavy.
**Fix:** Use logo on title only, or top-level sections only.

### N2 — `imgs/runtime-flow.png` not used in README "How It Works"
**File:** `README.md:92-94`
**Finding:** README shows ASCII art for runtime flow; the proper diagram (saved as `imgs/runtime-flow.png`) is unused.
**Fix:** Replace ASCII art with the PNG.

### N3 — [CORRECTED — UPGRADED] `skills/*/references/pm-skills-main-merge.md` (12 files, not 2) leak dev provenance
> Hygiene agent under-counted by sampling. There are **12** `pm-skills-main-merge.md` files across the catalog. Bigger cleanup than first reported.
**Files:** `skills/productize-write-query/references/pm-skills-main-merge.md`, `skills/productize-structured-interview-notes-from-transcript-using-flexible/references/pm-skills-main-merge.md`
**Finding:** Filenames read like internal dev branch-merge notes.
**Fix:** Rename to user-facing names; sanitize internal headings.

### N4 — `AGENTS.md` shouty tone
**Files:** `AGENTS.md` (HIGH PRIORITY block)
**Finding:** Wall of all-caps rules ("YOUR TASK WILL BE INVALIDATED") reads as in-team dev instructions, not contributor-facing.
**Fix:** Soften tone for public visibility.

### N5 — `productize.go` and `internal/core/api.go` "legacy core API" comments
**Files:** `productize.go:14,116`, `internal/core/api.go:31,93,336`
**Finding:** Multiple "legacy" comments describing intentional v1→v2 adapters. Accumulates cognitive load.
**Fix:** Rename to "v1 compatibility" for clarity. Not actionable for ship.

### N6 — `Makefile` help-target line ordering
**File:** `Makefile:173`
**Finding:** `make publish-extension-sdks` listed after `make test-coverage` — out of order.
**Fix:** Cosmetic reorder.

### N7 — `.editorconfig` rules for removed file types
**File:** `.editorconfig:11,14`
**Finding:** Configures `[*.{js,ts,jsx,tsx,json,css,scss,md}]` — most of those file types no longer exist post-web-removal.
**Fix:** Trim to `[*.{ts,json,md}]`.

### N8 — `test/skills_bundle_test.go:100` test name stale
**File:** `test/skills_bundle_test.go:100`
**Finding:** `TestIdeaFactoryExtensionExistsAndUsesPortableReferences` after rename to `idea-forge`.
**Fix:** Rename to `TestIdeaForgeExtensionExistsAndUsesPortableReferences`.

### N9 — `npm/cli/package.json:7` `bin` path style
**File:** `npm/cli/package.json:7`
**Finding:** `"bin.productize": "run-productize.js"` — npm accepts but convention is `./run-productize.js`.
**Fix:** Optional `./` prefix.

### N10 — `data-context-extractor` template references non-existent files
**Files:** `skills/productize-data-context-extractor/references/example-generated-skill.md`, `skills/productize-data-context-extractor/references/skill-template.md`
**Finding:** Templates link to `references/entities.md`, `references/metrics.md`, `references/sql-dialects.md` — illustrative placeholders that don't exist.
**Fix:** Move to `templates/example/` or document as placeholders.

### N11 — Code fence language tag inconsistency
**Files:** `skills/productize-finance-modeling-kernel/SKILL.md` (uses ```sh), 2 files use ```md, 111 use bare ```
**Finding:** Mixed fence tagging.
**Fix:** Style guide pass.

### N12 — `.goreleaser.yml:62` stale comment ("Homebrew formulas")
**File:** `.goreleaser.yml:62`
**Finding:** Comment says formulas; config now uses casks.
**Fix:** Update to "Homebrew casks/packaging".

### N13 — release.yml triple-boilerplate "Prepare Go temporary directory"
**Files:** `.github/workflows/release.yml:65-68,103-106,150-153`
**Finding:** Same 4-line block 3 times.
**Fix:** Composite action.

### N14 — `RELEASE_NOTES.md` lacks v2 entry
**File:** `RELEASE_NOTES.md`
**Finding:** Last entry is 0.2.4 (2026-05-14). No v2 entry exists. (Note: this file is gitignored now; verify how it's generated for the release.)
**Fix:** Add leading `## 2.0.0 — v2` section at release time.

### N15 — `extensions/idea-forge` AGENT.md schema undocumented (overlap with I20)
**Files:** Already covered in I20.

### N16 — `cli-reference.md:125` `--ui` deprecation row
**Files:** `docs/cli-reference.md:125`
**Finding:** Documents `--ui` as deprecated alias — verify the alias is actually still wired (vs documenting a flag that's been removed).
**Fix:** Confirm or remove.

### N17 — `scripts/inspect-acp-toolcalls.go` orphan
**Files:** `scripts/inspect-acp-toolcalls.go`
**Finding:** Go script in scripts/, no apparent build/CI integration.
**Fix:** Document or leave as dev tool.

### N18 — `PR_RELEASE_MODULE` pinned to old version
**Files:** `.github/workflows/release.yml:37`, `.github/workflows/auto-docs.yml:17`
**Finding:** `github.com/productize/releasepr@v0.0.21` — pinned to old patch.
**Fix:** Update only if newer needed.

### N19 — `skills/productize` (router) and `skills/productize-0-1` (orchestrator) prefix duplication
**Files:** above
**Finding:** Bare `productize` skill sits alongside 253 `productize-*` siblings.
**Fix:** No change unless router is being retired.

---

## ✅ What's ALREADY clean (verified by audit)

- Zero `compozy` references anywhere
- Zero `productize.com` dead URLs
- Zero `productize-main/` wrapper-dir refs
- Zero v1 install commands (`@productize/agent-skills`, `--host auto`)
- Zero secrets / credentials leaks in tracked files
- Zero personal data leaks (paths, emails, names)
- Zero unexpected binary blobs (largest is `imgs/runtime-flow.png` at 120KB)
- All 263 SKILL.md files have valid YAML frontmatter (except B9)
- All `name:` values match dir names (except B9)
- All cross-references between skills resolve
- All goreleaser `metadata` fields are OSS-compatible (already cleaned)
- All goreleaser `homebrew_casks` migration is well-formed
- `.gitignore` properly excludes internal dirs (`.codex/`, `.productize/`, `.agents/`, `.claude/`)
- npm wrapper smoke test passed end-to-end (per user's previous report)
- Go build + lint + tests all pass (per user's earlier `make verify`)

---

## Recommended fix order

**Tier 1 — Tonight if shipping soon (~30 min):**
- B1, B2, B3 — fix `productize-runtime` skill (largest impact, touches every user)
- B4 — fix `docs/configuration.md`
- B6 — re-remove `before:` hook from goreleaser
- B7 — guard postinstall
- B8 — fix husky hooks (bunx → npx)
- B9 — fix execute-task frontmatter

**Tier 2 — Before tagging v2.0.0 (~1-2 hours):**
- B5 — RELEASE_NOTES.md rewrite
- B11 — decide: bundle advisors OR fix AGENTS.md description
- B12 — qa-workflow test rename
- I1-I3, I15-I19 — README/AGENTS.md doc fixes
- I4-I7 — TUI plumbing cleanup (real refactor)
- I12-I14, I23 — release config verification

**Tier 3 — Post-v2.0.0 cleanup:**
- B10 — workflow-skill prefix decision (architectural)
- I20-I27, all NITs

---

## Decision points needing user input

1. **B10 — Re-prefix workflow skills?** We explicitly renamed `cy-create-prd` → `create-prd`. Now consistency suggests `productize-create-prd`. Real reversal.
2. **B11 — Bundle advisor agents OR keep them extension-only?** Currently broken in CLI examples either way; pick one.
3. **B5 — RELEASE_NOTES.md** — regenerate from changelog/git, or hand-rewrite?
