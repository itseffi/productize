# Configuration Reference

Productize can load global defaults from `~/.productize/config.toml` and
override them per workspace with `.productize/config.toml`.

- The CLI discovers the nearest `.productize/` directory by walking upward from
  the current working directory.
- If `~/.productize/config.toml` exists, Productize loads it once at command
  startup.
- If `.productize/config.toml` exists in the resolved workspace, it overrides
  the global config field by field.
- Explicit CLI flags always win over config values.

Precedence:

```text
explicit flags > workspace command section > workspace [defaults] > global command section > global [defaults] > built-in defaults
```

Example:

```toml
[defaults]
ide = "codex"
model = "gpt-5.5"
reasoning_effort = "medium"
output_format = "text"
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
output_format = "text"

[exec]
output_format = "text"
verbose = false
persist = false

[fix_reviews]
concurrent = 2
batch_size = 3
include_resolved = false
output_format = "text"

[fetch_reviews]
provider = "coderabbit"
nitpicks = false

[watch_reviews]
max_rounds = 5
poll_interval = "30s"
review_timeout = "30m"
quiet_period = "2m"
until_clean = true
auto_push = false

[runs]
default_attach_mode = "stream"
keep_terminal_days = 30
keep_max = 500
```

## Supported Sections

- `[defaults]` for shared execution defaults such as `ide`, `model`,
  `reasoning_effort`, `output_format`, `access_mode`, `timeout`, `tail_lines`,
  `add_dirs`, `auto_commit`, `max_retries`, and `retry_backoff_multiplier`
- `[exec]` for `output_format`, `verbose`, `persist`, plus exec-specific
  runtime overrides such as `ide`, `model`, `reasoning_effort`, `access_mode`,
  `timeout`, `tail_lines`, `add_dirs`, `max_retries`, and
  `retry_backoff_multiplier`
- `[tasks]` for the allowed task `type` list used by `create-tasks` and
  `productize tasks validate`
- `[tasks.run]` for workflow-run defaults used by `productize tasks run`, such
  as `include_completed`, `output_format`, and `task_runtime_rules`
- `[fix_reviews]` for `concurrent`, `batch_size`, `include_resolved`, and
  `output_format`
- `[fetch_reviews]` for `provider` and `nitpicks`
- `[watch_reviews]` for `max_rounds`, `poll_interval`, `review_timeout`,
  `quiet_period`, `auto_push`, `until_clean`, `push_remote`, and `push_branch`
- `[runs]` for `default_attach_mode`, `keep_terminal_days`, `keep_max`, and
  `shutdown_drain_timeout`
- `[sound]` for optional run-completion audio presets or absolute file paths

## Notes

- Both `~/.productize/config.toml` and `.productize/config.toml` are optional.
  If both are absent, Productize keeps the built-in defaults.
- `.productize/tasks` remains the fixed workflow root in this version.
- Unknown keys and invalid value types are rejected during config loading.
- Relative `add_dirs` are resolved against the owning config scope: the user
  home directory for `~/.productize/config.toml` and the workspace root for
  `.productize/config.toml`.
- `max_retries` applies to execution-stage ACP failures and inactivity timeouts
  for `productize exec`, `productize tasks run`, and `productize reviews fix`.
- Built-in CLI defaults retry timed-out or transient ACP failures twice. Set
  `max_retries = 0` or pass `--max-retries 0` to opt out.
- `retry_backoff_multiplier` only increases the next attempt timeout. Retries
  restart immediately and do not add a sleep delay.
