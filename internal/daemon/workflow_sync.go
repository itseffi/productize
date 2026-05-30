package daemon

import (
	"context"
	"time"

	corepkg "github.com/itseffi/productize/internal/core"
	"github.com/itseffi/productize/internal/store"
	"github.com/itseffi/productize/internal/store/globaldb"
)

const (
	workflowSyncBusyRetryBudget = 2 * time.Second
	workflowSyncBusyRetryDelay  = 25 * time.Millisecond
)

func syncWorkflowWithOpenDB(
	ctx context.Context,
	db *globaldb.GlobalDB,
	workspace globaldb.Workspace,
	cfg corepkg.SyncConfig,
) (*corepkg.SyncResult, error) {
	retryCtx, cancel := context.WithTimeout(ctx, workflowSyncBusyRetryBudget)
	defer cancel()

	for {
		result, err := corepkg.SyncWithDB(ctx, db, workspace, cfg)
		if err == nil || !store.IsSQLiteBusy(err) {
			return result, err
		}
		select {
		case <-retryCtx.Done():
			return result, err
		case <-time.After(workflowSyncBusyRetryDelay):
		}
	}
}
