![Productize](assets/productize.png)

# Productize

**Productize is an engineered distribution and runtime system for
building, shipping, operating, and growing AI products inside your
coding harness.**

Three playbooks: **`/productize-0-1`** (raw idea → shipped product),
**`/productize-operate`** (production, incidents, error budgets),
**`/productize-grow`** (aha-moment → retention → PLG). Nine gates
that gate every move. One meta-runner. 238 routed skills underneath.
Five host adapters. One workflow runtime. MIT.

Your AI coding agent — Codex, Claude Code, Cursor, OpenCode, Factory,
or the next harness you adopt — is the **harness**. It writes the code,
runs the tools, edits the files. Productize is the **product team
around the harness**: `thesis-review` sharpens the bet,
`product-review` locks the spec, `design-review` kills the slop,
`eng-review` challenges the architecture, `qa` runs the evals,
`release` owns the ship gate, `docs` catches drift, `dx-review`
protects developer experience, and `comms-review` writes the narrative.

Without a harness, Productize is inert. Without Productize, the
harness is undirected. It will write any code you ask, beautifully,
for the wrong product.

## Quick start

Install Productize into the harness you use:

```sh
npm install -g @productize/agent-skills
productize --host auto
```

Or install from source:

```sh
git clone --single-branch --depth 1 https://github.com/itseffi/productize.git productize
cd productize
./setup --host auto
```

Then ask your harness to build a product:

```text
/productize-0-1
Build a Twitter clone. Make it secure. Have real AI agents use it.
```

Productize routes the request, fires the right gate at every
move, produces the artifacts, edits the code through the harness,
runs the evals, applies the fixes, and tells you what to decide next.

## See it work

```
You:    /productize-0-1
        Build a Twitter clone. Make it secure. Have real AI agents use it.

Agent:  Before I write anything, I'm tightening the ask.
        A Twitter clone is the implementation shape, not the product.
        The product is an agent-native social arena: humans and AI
        agents can post, reply, follow, report, coordinate, spam,
        hit rate limits, and expose the trust and moderation
        problems that only appear when autonomous users are active.

        [Move 1 — Scope capability + curate data]
        [thesis-review + product-review fire — rate the premise, find
        three risky assumptions, ask one blocking question about the
        wedge]

        Beachhead: builders testing real agent behavior in social
        products. Wedge: a small social graph where agent accounts are
        first-class users and adversarial QA from day one. First
        capability: human accounts, agent accounts, posts, replies,
        follows, reports, rate limits, audit logs, seeded agents, and
        evals that score whether agents can use the product without
        breaking trust or safety.

You:    Approve. Continue.

Agent:  [Move 2a — Design]   design-review fires on the feed, composer,
                                profile, notifications, reports, and
                                moderation queue.
        [Move 2b — Architect] eng-review fires on auth, permissions,
                                agent identity, event logs, prompt
                                injection boundaries, content provenance,
                                rate limits, and abuse controls.
        [Move 2c — Spec]     product-review fires on acceptance criteria.
        [Move 2d — Build]    writes the first slice: accounts, agent
                                accounts, feed, posting, replies, follows,
                                reports, seeded agent scripts, and
                                browser-driven evals.

You:    /productize-autoplan

Agent:  [Runs thesis-review, product-review, design-review, eng-review,
        qa, release, docs, dx-review, and comms-review. Auto-applies
        safe decisions. Surfaces two product/security calls. You decide.
        It proceeds.]

You:    Move 3 — design the evals.

Agent:  [Move 3 — qa + product-review fire. Eval users defined:
        normal poster, reply farmer, spammer, brigader, reporter,
        lurker, and moderator. Ship gates cover signup, posting,
        following, reporting, moderation, rate limits, and abuse paths.]

        [Deploy gate — release fires. One block: no kill switch for
        seeded agents. Add it before running live evals.]

        [Move 4 — qa runs the evals in a browser. One failure:
        agent-generated text leaks unsafe instructions into notifications.]

        [Move 5 — eng-review analyzes the trace and finds the boundary:
        feed content is escaped, notification previews are not.]

        [Move 6 — design-review + qa apply and verify the fix: sanitize
        previews, add regression coverage, rerun the abuse-path evals.]

You:    Ship.

Agent:  [Move 7 — release + docs + comms-review fire together.
        Launch checklist, security notes, moderation runbook, seeded
        agent scenarios, public narrative, first-week operate loop,
        next-lap learning plan.]
```

You said "build a Twitter clone." Productize turned it into the
smallest real social platform where AI agents are users, adversaries,
testers, and the first source of product evidence. One builder gets the
thesis pressure, product spec, architecture review, security posture,
QA, release, docs, and launch narrative of a full product team.

## The loop

Productize is a process, not a catalog. One playbook drives the work
from raw idea to shipped product:

**Scope → Design → Architect → Spec → Build → Evals → Deploy → Run →
Analyze → Fix → Ship → Learn**

Then back to Scope with new evidence. Same moves, every lap. First
lap is sparse data and wild evals. Hundredth lap is dense data and
tight evals. Same shape.

| Move | Gate | What it does |
|---|---|---|
| 1. Scope capability + curate data | `thesis-review` + `product-review` | Sharpen who, win, why now, why us. Kill the request that isn't the real job. Surface risky assumptions before code. |
| 2a. Design | `design-review` | Hierarchy, friction, AI slop detection. Rate each dimension 0-10. Edit the plan to ship a 10. |
| 2b. Architect | `eng-review` | Data flow, agent shape, edge cases, build risk. Force hidden assumptions into the open. |
| 2c. Spec | `product-review` | Requirements, acceptance criteria, dependency risk, scope cuts. |
| 2d. Build | `eng-review` + `qa` | The harness writes the code. Productize checks build risk, test shape, and verification coverage. |
| 3. Design evals | `qa` + `product-review` | Golden examples, adversarial inputs, behavioral traces, ship gates — defined *before* you measure. |
| Deploy gate | `release` | Check launch readiness, rollback path, kill switch, and release blockers before live evals or production exposure. |
| 4. Run evals | `qa` | Real traffic. Pass/fail. Trace evidence. |
| 5. Analyze | `eng-review` | Error clusters, root cause, prompt failure modes, UX friction. |
| 6. Apply fixes | `design-review` + `qa` | Atomic fixes. Before/after evidence. Re-review until clean. |
| 7. Ship + Learn | `release` + `docs` + `comms-review` | Launch readiness, kill switch, comms plan, board narrative, doc drift caught, next-lap learning plan. |

For developer-facing products, `dx-review` fires at Move 2 and Move 7:
onboarding, API ergonomics, TTHW, error messages.

## Access surface

Three playbooks. Nine gates. One meta-runner. 238 routed skills underneath.

| Layer | Entry points |
|---|---|
| **Playbooks** | `/productize-0-1` (build loop), `/productize-operate` (production), `/productize-grow` (PMF → scale) |
| **Gates** | `thesis-review`, `product-review`, `design-review`, `eng-review`, `qa`, `release`, `docs`, `dx-review`, `comms-review` |
| **Meta** | `/productize-autoplan` — runs every relevant gate in parallel, auto-applies safe decisions, surfaces only taste calls |
| **Routed skills** | 238 skills called internally by the playbooks and gates |

You almost never call a routed skill directly. You enter at a playbook.
The playbook walks the moves. The gates fire at decision points. The routed
skills do the tactical work. You only see the decisions that matter.

## HTML artifacts and implementation notes

Productize treats HTML as an **artifact format**, not as a separate
playbook. Route by the product job first, then choose the format:

- use Markdown for short notes, repo-native docs, changelog fragments,
  and artifacts where clean diffs matter
- use self-contained HTML for long reviews, visual plans, diagrams,
  dashboards, PR explainers, shareable reports, and interactive tuning
  artifacts

HTML artifacts must be portable by default: one file, embedded CSS/JS,
no remote dependencies unless requested, readable without a dev server,
responsive, accessible, and organized for fast human review.

The Build With AI lifecycle also includes **`implementation-notes`**.
When a user asks the harness to implement a spec and maintain
`implementation-notes.md` or `implementation-notes.html`, Productize
records:

- design decisions where the spec was ambiguous
- intentional deviations from the spec and why
- tradeoffs considered and accepted
- open questions for user confirmation
- verification evidence and remaining gaps

This lets the harness make reasonable implementation decisions without
hiding the interpretation work from the user.

## Routing map

| Need | Productize routes to |
|---|---|
| "I have an idea" | `/productize-0-1` Move 1 — `thesis-review` + `product-review`, thesis framing, beachhead, risky assumptions |
| "Messy transcript → PRD" | `/productize-0-1` Move 2c — `product-review` + JTBD synthesis, requirements, acceptance criteria |
| "Design the UX" | `/productize-0-1` Move 2a — `design-review` + flows, hierarchy, edge cases |
| "Architect the agent" | `/productize-0-1` Move 2b — `eng-review` + agent shape, retrieval, edge cases |
| "Evals before shipping" | `/productize-0-1` Move 3 — `qa` + `product-review`, golden/adversarial examples, ship gates |
| "Production is broken" | `/productize-operate` — incident response, root cause, comms |
| "Activation is flat" | `/productize-grow` — aha-moment, PLG diagnostics, lifecycle triggers |
| "Board narrative" | `comms-review` + executive update, decision logic, tradeoffs |
| "Deal math" | Routed skills: DCF, WACC, CAPM, cap tables, VC modeling |
| "DX audit" | `dx-review` — onboarding, API ergonomics, error messages |

## Guardrails

Every generated skill receives the shared Productize preamble. The
preamble forces the harness to classify:

- **persona** — founder, product leader, AI PM, AI builder, stakeholder, or unknown
- **product stage** — idea, validation, PMF search, growth, scale, pivot, or unknown
- **artifact mode** — strategy memo, PRD, research plan, positioning, experiment, deck, roadmap, execution brief, diagnostic, decision record
- **artifact format** — Markdown for short/diff-sensitive work; HTML for long, visual, shareable, interactive, or explicitly requested artifacts
- **evidence state** — known facts, assumptions, missing inputs, risky leaps
- **decision mode** — recommend, ask for a blocking input, or proceed with explicit assumptions

Rules that matter:

1. No generic strategy filler.
2. Tie recommendations to evidence, stage, and decision pressure.
3. Ask only for inputs that materially change the output.
4. Produce the artifact, not a description of the method.
5. End with a concrete owner, validation step, metric, or handoff.

## Install

Productize generates and installs skills for multiple harnesses:

```sh
./setup
./setup --host auto
./setup --host codex
./setup --host claude
./setup --host cursor
./setup --host opencode
./setup --host factory
./setup --host all
```

Setup regenerates skills, validates outputs, installs or symlinks
host skills, creates runtime sidecars, checks dependencies, detects
installed harnesses for `--host auto`, saves prefix preference, uses
restrictive file permissions for local state, and falls back to copy
mode on Windows unless symlinks are explicitly allowed.

Prefix options:

```sh
./setup --prefix
./setup --no-prefix
```

Team mode:

```sh
./setup --team
bin/productize-team-init required
```

Use `optional` instead of `required` when teammates should be nudged
but not blocked.

## Runtime tools

Productize ships local sidecars for routing, state, context, artifacts,
completion, and upgrade workflows:

| Command | Purpose |
|---|---|
| `productize-workflow` | Start and complete durable product workflows with routing, context, session, artifact, and completion logs |
| `productize-skill-router` | Resolve a product request to the best skill or skill sequence |
| `productize-registry-search` | Search the generated skill registry |
| `productize-session-log` | Record workflow decisions |
| `productize-artifact-log` | Record produced artifacts |
| `productize-context-save` | Save durable context |
| `productize-context-restore` | Restore previous context before restarting work |
| `productize-config` | Read and write local or team preferences |
| `productize-update-check` | Check generated distribution freshness and update state |
| `productize-completion-status` | Log completion, blocked, deferred, or needs-review state |
| `productize-upgrade` | Upgrade installed Productize skills and runtime sidecars |
| `productize-team-init` | Bootstrap shared repo-local Productize instructions |

## Architecture

Canonical source stays separate from generated distribution output:

```text
SKILL.md.tmpl            root router template
SKILL.md                 generated root router skill
skills/                  canonical one-level skill directories
skills/*/SKILL.md.tmpl   skill template source
skills/*/SKILL.md        generated canonical skill with shared preamble
skills/*/productize.json explicit metadata and routing fields
hosts/                   host adapters (one per harness)
.agents/skills/          generated Codex skills
.claude/skills/          generated Claude skills
.cursor/skills/          generated Cursor skills
.opencode/skills/        generated OpenCode skills
.factory/skills/         generated Factory skills
plugins/                 generated plugin bundles
registry/                generated skill, lifecycle, category, plugin, and site indexes
bin/                     runtime utilities
test/                    parser, generator, registry, setup, release, runtime, routing, and eval tests
```

Host adapters control frontmatter, description limits, generated
output paths, metadata behavior, path rewrites, skipped skills, and
runtime sidecars per harness.

## Build and validate

```sh
npm run build
npm run skill:check
npm run test:free
```

The build normalizes metadata, generates canonical and host skills,
audits skills, builds registries, builds plugin bundles, builds the
site index, and runs `skill:check`.

Validation checks:

- frontmatter and metadata
- lifecycle and category values
- reference paths
- generated host output freshness
- Codex description limits
- plugin manifests
- registry files
- sample router resolution
- metadata quality and artifact specificity
- generated distribution boundaries

## Evals and CI

Productize has separate CI lanes for freshness, evals, periodic evals,
and version gates:

```text
.github/workflows/ci.yml
.github/workflows/skill-docs.yml
.github/workflows/evals.yml
.github/workflows/evals-periodic.yml
.github/workflows/version-gate.yml
```

Useful commands:

```sh
npm run eval
npm run eval:router
npm run eval:e2e
npm run eval:llm:offline
npm run eval:report
npm run install:smoke
npm run release:check
npm run upgrade:check
```

Offline evals do not require paid model calls. External LLM evals are
opt-in only when a command is configured by the runner.

## Release and upgrade

Release metadata lives in:

```text
VERSION
CHANGELOG.md
RELEASE.md
UPGRADE.md
```

Release commands:

```sh
npm run release:check
npm run release:dry-run
npm run release
productize-upgrade --host all --force
```

`release:check` is the non-mutating gate. `release:dry-run` must not
mutate files.

## Contributing a skill

Each skill should have:

```text
skills/<skill-name>/
  SKILL.md.tmpl
  SKILL.md
  productize.json
  references/       optional
  examples/         optional
  evals/            optional
```

The metadata must state:

- when to use the skill
- when not to use it
- the expected artifact
- framework fit, when relevant
- failure modes
- routing signals
- examples or eval cases

Run before proposing changes:

```sh
npm run build
npm run test:free
npm run eval
```

## License

MIT.
