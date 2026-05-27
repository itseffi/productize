package cli

import (
	core "github.com/itseffi/productize/internal/core"
	"github.com/spf13/cobra"
)

func addWorkflowOutputFlags(cmd *cobra.Command, state *commandState) {
	cmd.Flags().StringVar(
		&state.outputFormat,
		"format",
		string(core.OutputFormatText),
		"Output format: text, json, or raw-json",
	)
	cmd.Flags().BoolVar(
		&state.tui,
		"tui",
		false,
		"Deprecated; workflow observation uses textual streams",
	)
}

func newExecCommandWithDefaults(defaults commandStateDefaults) *cobra.Command {
	state := newCommandStateWithDefaults(commandKindExec, core.ModeExec, defaults)
	cmd := &cobra.Command{
		Use:          "exec [prompt]",
		Short:        "Execute one ad hoc prompt through the shared ACP runtime",
		SilenceUsage: true,
		Args:         cobra.MaximumNArgs(1),
		Long: `Execute a single ad hoc prompt using the shared Productize planning and ACP execution pipeline.

Provide the prompt as one positional argument, with --prompt-file, or via stdin. By default the
command is headless and ephemeral: text mode writes only the final assistant response to stdout and
json mode streams lean JSONL events to stdout, while raw-json preserves the full event stream.
Operational runtime logs stay silent unless you opt into --verbose. Use --persist to save
resumable artifacts under
~/.productize/runs/<run-id>/. Use --run-id to resume a previously persisted exec session.`,
		Example: `  productize exec "Summarize the current repository changes"
  productize exec --agent council "Decide between two designs"
  productize exec --prompt-file prompt.md
  cat prompt.md | productize exec --format json
  productize exec --format raw-json "Inspect every streamed event"
  productize exec --persist "Review the latest changes"
  productize exec --run-id exec-20260405-120000-000000000 "Continue from the previous session"`,
		RunE: state.execDaemon,
	}

	addCommonFlags(cmd, state, commonFlagOptions{})
	cmd.Flags().StringVar(
		&state.agentName,
		"agent",
		"",
		"Reusable agent to execute from .productize/agents or ~/.productize/agents",
	)
	cmd.Flags().StringVar(&state.promptFile, "prompt-file", "", "Path to a file containing the prompt text")
	cmd.Flags().StringVar(
		&state.outputFormat,
		"format",
		string(core.OutputFormatText),
		"Output format: text, json, or raw-json",
	)
	cmd.Flags().BoolVar(&state.verbose, "verbose", false, "Emit operational runtime logs to stderr during exec")
	cmd.Flags().BoolVar(&state.tui, "tui", false, "Deprecated; exec uses headless text or event output")
	cmd.Flags().BoolVar(&state.persist, "persist", false, "Persist exec artifacts under ~/.productize/runs/<run-id>/")
	cmd.Flags().BoolVar(&state.extensionsEnabled, "extensions", false, "Enable executable extensions for this exec run")
	cmd.Flags().StringVar(&state.runID, "run-id", "", "Resume a previously persisted exec session by run id")
	return cmd
}
