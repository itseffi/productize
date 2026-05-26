package cli

import (
	"log/slog"
	"sync"

	extcli "github.com/itseffi/productize/internal/cli/extension"
	"github.com/itseffi/productize/internal/core/agent"

	// Register the extension-backed run-scope factory used by kernel dispatchers.
	_ "github.com/itseffi/productize/internal/core/extension"
	"github.com/itseffi/productize/internal/core/kernel"
	"github.com/itseffi/productize/internal/core/workspace"
	"github.com/itseffi/productize/pkg/productize/events"
	"github.com/spf13/cobra"
)

type commandKind string

const (
	commandKindFetchReviews commandKind = "reviews fetch"
	commandKindFixReviews   commandKind = "reviews fix"
	commandKindWatchReviews commandKind = "reviews watch"
	commandKindExec         commandKind = "exec"
	commandKindArchive      commandKind = "archive"
	commandKindTasksRun     commandKind = "tasks run"
	commandKindSync         commandKind = "sync"
)

var validateRootDispatcher = kernel.ValidateDefaultRegistry

func newRootDispatcher() *kernel.Dispatcher {
	deps := kernel.KernelDeps{
		Logger:        slog.Default(),
		EventBus:      events.New[events.Event](0),
		Workspace:     workspace.Context{},
		AgentRegistry: agent.DefaultRegistry(),
	}

	dispatcher := kernel.BuildDefault(deps)
	if err := validateRootDispatcher(dispatcher); err != nil {
		slog.Default().Error("kernel dispatcher validation failed", "error", err)
	}
	return dispatcher
}

func newLazyRootDispatcher() func() *kernel.Dispatcher {
	return sync.OnceValue(newRootDispatcher)
}

// NewRootCommand returns the reusable productize Cobra command.
func NewRootCommand() *cobra.Command {
	return newRootCommandWithDefaults(newLazyRootDispatcher(), defaultCommandStateDefaults())
}

func newRootCommandWithDefaults(dispatcher func() *kernel.Dispatcher, defaults commandStateDefaults) *cobra.Command {
	root := &cobra.Command{
		Use:          "productize",
		Short:        "Run AI review remediation and PRD task workflows",
		SilenceUsage: true,
		Long: `Productize manages review rounds and PRD execution workflows.

Defaults can be stored in ~/.productize/config.toml and overridden per workspace in
.productize/config.toml. Explicit CLI flags always override values loaded from config files.

Use explicit workflow subcommands:
  productize setup         Install bundled public skills for supported agents
  productize agents        Discover and inspect reusable agents
  productize upgrade       Update the CLI to the latest release
  productize ext           Manage bundled, user, and workspace extensions
  productize migrate       Convert legacy workflow artifacts to frontmatter
  productize daemon        Manage the home-scoped daemon bootstrap lifecycle
  productize workspaces    Inspect daemon workspace registrations
  productize tasks         Inspect, validate, and run task workflows
  productize reviews       Fetch, inspect, and remediate review workflows
  productize runs          Inspect and clean persisted daemon run artifacts
  productize sync          Reconcile workflow artifacts into global.db
  productize archive       Move fully completed workflows into .productize/tasks/_archived/
  productize exec          Execute one ad hoc prompt through the shared ACP runtime`,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return cmd.Help()
		},
	}

	root.AddCommand(
		newSetupCommand(nil),
		newAgentsCommand(),
		newUpgradeCommand(),
		extcli.NewExtCommand(nil),
		newMigrateCommand(dispatcher),
		newDaemonCommand(),
		newWorkspacesCommand(),
		newTasksCommand(nil, defaults),
		newReviewsCommandWithDefaults(defaults),
		newRunsCommandWithDefaults(defaults),
		newSyncCommand(dispatcher),
		newArchiveCommand(dispatcher),
		newExecCommandWithDefaults(defaults),
		newMCPServeCommand(),
	)
	return root
}
