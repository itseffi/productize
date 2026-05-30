# Productize Completion Plugin

This plugin adds shell completion for `productize tasks run` so task slugs are completed from the
nearest `.productize/tasks` directory relative to your current working directory.

## What it does

- Completes `tasks` after `productize`
- Completes `run` after `productize tasks`
- Completes all directories under `.productize/tasks` after `productize tasks run`
- Works in worktrees and repository copies by scanning upward from `$PWD` until it finds `.productize/tasks`

## Installation

1. Copy the plugin file into your shell folder (already placed by default at:
   `~/.zsh/productize-completion/productize-completion.plugin.zsh`).

   ```zsh
   # if needed
   cp /path/to/productize/zsh/productize-completion/productize-completion.plugin.zsh \
     "$HOME/.zsh/productize-completion/productize-completion.plugin.zsh"
   ```

2. Source it from your `~/.zshrc`:

   ```zsh
   if [[ -f "$HOME/.zsh/productize-completion/productize-completion.plugin.zsh" ]]; then
     source "$HOME/.zsh/productize-completion/productize-completion.plugin.zsh"
   fi
   ```

3. Reload your shell:

   ```zsh
   source ~/.zshrc
   ```

## Quick usage

From any Productize workspace:

```zsh
cd /path/to/repo/.productize-task-root
productize tasks run <TAB>
```

The command will suggest task directory names found in `.productize/tasks`.

## Notes

- Keep `.productize/tasks` present in the workspace root or an ancestor directory.
- If there are no tasks, completion will fall back to default zsh behavior for that command position.
