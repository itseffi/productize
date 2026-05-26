package run

import (
	"context"

	"github.com/itseffi/productize/internal/core/model"
	execpkg "github.com/itseffi/productize/internal/core/run/exec"
	executorpkg "github.com/itseffi/productize/internal/core/run/executor"
	"github.com/itseffi/productize/internal/core/run/journal"
	"github.com/itseffi/productize/pkg/productize/events"
)

var execute = executorpkg.Execute
var executeExec = execpkg.ExecuteExec

func Execute(
	ctx context.Context,
	jobs []model.Job,
	runArtifacts model.RunArtifacts,
	runJournal *journal.Journal,
	bus *events.Bus[events.Event],
	cfg *model.RuntimeConfig,
	manager model.RuntimeManager,
) error {
	return execute(ctx, jobs, runArtifacts, runJournal, bus, cfg, manager)
}

func ExecuteExec(ctx context.Context, cfg *model.RuntimeConfig, scope model.RunScope) error {
	return executeExec(ctx, cfg, scope)
}
