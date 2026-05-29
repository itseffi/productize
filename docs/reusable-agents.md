# Reusable Agents

Reusable agents let you package a prompt, runtime defaults, and optional agent-local MCP servers into a directory that Productize can discover and execute.

The first-party `idea-forge` extension ships the council advisor roster below. Install and enable it, then run `productize setup` to provision those reusable agents in the selected scope:

```bash
productize ext install --yes itseffi/productize --remote github --ref <tag> --subdir extensions/idea-forge
productize ext enable idea-forge
productize setup
```

Council roster:

- `architect-advisor`
- `devils-advocate`
- `pragmatic-engineer`
- `product-mind`
- `security-advocate`
- `the-thinker`

Those extension-shipped council agents intentionally inherit the host runtime, which keeps council debates consistent across supported drivers.

## Discovery and Override Rules

Supported discovery scopes:

- workspace: `.productize/agents/<name>/`
- global: `~/.productize/agents/<name>/`

Rules:

- the directory name is the canonical agent id
- names must match `^[a-z][a-z0-9-]{0,63}$`
- `productize` is reserved and cannot be used as an agent name
- when a workspace and global agent share the same name, the workspace directory wins as a whole
- invalid agent directories are reported per-agent, but they do not prevent other valid agents from loading

Supported v1 files inside an agent directory:

- `AGENT.md`
- optional `mcp.json`

Deferred fields and folders stay out of scope in v1:

- frontmatter fields `extends`, `uses`, `skills`, and `memory` are rejected
- sibling `skills/` and `memory/` directories are ignored

## `AGENT.md`

`AGENT.md` uses YAML frontmatter plus a markdown body. Productize reads these frontmatter fields today:

| Field              | Purpose                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| `title`            | Human-facing name shown in inspect output                                       |
| `description`      | Short description shown in list output and the prompt-visible discovery catalog |
| `ide`              | Default runtime ide for this agent                                              |
| `model`            | Default model override                                                          |
| `reasoning_effort` | Default reasoning effort (`low`, `medium`, `high`, `xhigh`)                     |
| `access_mode`      | Default runtime access mode (`default` or `full`)                               |

Other frontmatter keys are not part of the supported v1 contract. Avoid relying on them.

Minimal example:

```md
---
title: Reviewer
description: Reviews implementation plans and diffs before code lands.
ide: codex
reasoning_effort: high
access_mode: default
---

Review the user's request, inspect the relevant diff or files, identify concrete risks first, and
then propose the smallest safe next step. Keep the answer concise and actionable.
```

Committed fixture:

- [`docs/examples/agents/reviewer/AGENT.md`](examples/agents/reviewer/AGENT.md)

## `mcp.json`

`mcp.json` is optional and uses the standard MCP config shape with a top-level `mcpServers` object.

Example:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${PROJECT_ROOT}"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

Committed fixtures:

- [`docs/examples/agents/repo-copilot/AGENT.md`](examples/agents/repo-copilot/AGENT.md)
- [`docs/examples/agents/repo-copilot/mcp.json`](examples/agents/repo-copilot/mcp.json)

Validation and merge rules:

- `${VAR}` placeholders expand in `command`, `args`, and `env` values when Productize loads the agent
- a missing environment variable is a validation error; Productize fails closed before starting the ACP session
- relative `command` paths are resolved against the agent directory
- `mcp.json` cannot declare a server named `productize`
- agent-local MCP servers are merged after the reserved host-owned `productize` MCP server

The reserved `productize` MCP server is not configured in `mcp.json`. Productize injects it automatically into ACP sessions it creates so runtimes can call the host-owned `run_agent` tool. This is the boundary to keep straight:

- `mcp.json` is for external, agent-local MCP servers that belong to one agent definition
- the reserved `productize` server is a host capability owned by Productize itself

Nested execution follows the same boundary:

- a child agent gets the reserved `productize` server plus the child's own `mcp.json`
- a child agent does not inherit the parent agent's local MCP servers implicitly

That automatic host injection is what lets optional extension skills such as `idea-forge` run council advisors through `run_agent` even when the top-level session was not started with `productize exec --agent ...`.

## Commands

List the currently resolved agents:

```bash
productize agents list
```

Inspect one definition:

```bash
productize agents inspect reviewer
```

Shortened example output with path lines omitted:

```text
Agent: reviewer
Status: valid
Source: workspace
Title: Reviewer
Description: Reviews implementation plans and diffs before code lands.
Runtime defaults: ide=codex model=gpt-5.5 reasoning=high access=default
MCP servers: none
Validation: OK
```

Execute an agent through the normal `exec` pipeline:

```bash
productize exec --agent reviewer "Review the staged changes"
```

You can still combine `--agent` with normal exec controls such as `--model`, `--reasoning-effort`, `--format`, `--persist`, and `--run-id`. Explicit CLI flags win over `AGENT.md` defaults, and `AGENT.md` runtime defaults still win over workspace/global config files. When an inspected agent is invalid, `productize agents inspect <name>` prints the validation report and exits non-zero so you can fix the definition before running it.
