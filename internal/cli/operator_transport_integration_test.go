package cli

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	apiclient "github.com/itseffi/productize/internal/api/client"
	apicore "github.com/itseffi/productize/internal/api/core"
	"github.com/itseffi/productize/internal/daemon"
)

func TestDaemonPublicSnapshotAndStreamOverUDSForTempWorkspaceRun(t *testing.T) {
	homeDir := newShortCLITestHomeDir(t)
	t.Setenv("HOME", homeDir)

	paths := mustCLITestHomePaths(t)
	workspaceRoot := t.TempDir()
	writeCLINodeWorkflowFixture(t, workspaceRoot, "node-health")
	writeCLIWorkspaceConfig(t, workspaceRoot, "")

	t.Cleanup(func() {
		_, _, _ = runCLICommand(t, workspaceRoot, "daemon", "stop", "--force", "--format", "json")
		waitForCLITestDaemonState(t, paths, daemon.ReadyStateStopped)
	})

	startStdout, startStderr, exitCode := runCLICommand(t, workspaceRoot, "daemon", "start", "--format", "json")
	if exitCode != 0 {
		t.Fatalf("execute daemon start: exit=%d\nstdout:\n%s\nstderr:\n%s", exitCode, startStdout, startStderr)
	}
	var startPayload struct {
		State  string `json:"state"`
		Health struct {
			Ready bool `json:"ready"`
		} `json:"health"`
	}
	if err := json.Unmarshal([]byte(startStdout), &startPayload); err != nil {
		t.Fatalf("decode daemon start payload: %v\nstdout:\n%s", err, startStdout)
	}
	if startPayload.State != string(daemon.ReadyStateReady) || !startPayload.Health.Ready {
		t.Fatalf("unexpected daemon start payload: %#v", startPayload)
	}

	status, err := daemon.QueryStatus(context.Background(), paths, daemon.ProbeOptions{})
	if err != nil {
		t.Fatalf("QueryStatus() error = %v", err)
	}
	if status.Info == nil {
		t.Fatal("status.Info = nil, want running daemon info")
	}

	udsClient, err := apiclient.New(apiclient.Target{SocketPath: status.Info.SocketPath})
	if err != nil {
		t.Fatalf("apiclient.New(uds) error = %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	udsHealth, err := udsClient.Health(ctx)
	if err != nil {
		t.Fatalf("uds Health() error = %v", err)
	}
	if !udsHealth.Ready {
		t.Fatalf("expected ready health payload, got %#v", udsHealth)
	}

	syncStdout, syncStderr, exitCode := runCLICommand(
		t,
		workspaceRoot,
		"sync",
		"--name",
		"node-health",
		"--format",
		"json",
	)
	if exitCode != 0 {
		t.Fatalf("execute sync: exit=%d\nstdout:\n%s\nstderr:\n%s", exitCode, syncStdout, syncStderr)
	}
	var syncPayload struct {
		WorkflowSlug      string `json:"workflow_slug"`
		WorkflowsScanned  int    `json:"workflows_scanned"`
		TaskItemsUpserted int    `json:"task_items_upserted"`
	}
	if err := json.Unmarshal([]byte(syncStdout), &syncPayload); err != nil {
		t.Fatalf("decode sync payload: %v\nstdout:\n%s", err, syncStdout)
	}
	if syncPayload.WorkflowSlug != "node-health" || syncPayload.WorkflowsScanned != 1 ||
		syncPayload.TaskItemsUpserted != 1 {
		t.Fatalf("unexpected sync payload: %#v\nstderr:\n%s", syncPayload, syncStderr)
	}

	taskStdout, taskStderr, exitCode := runCLICommand(
		t,
		workspaceRoot,
		"tasks",
		"run",
		"node-health",
		"--dry-run",
		"--stream",
	)
	if exitCode != 0 {
		t.Fatalf("execute tasks run dry-run: exit=%d\nstdout:\n%s\nstderr:\n%s", exitCode, taskStdout, taskStderr)
	}
	if !strings.Contains(taskStderr, "preflight=ok") {
		t.Fatalf("expected task preflight success on stderr, got %q", taskStderr)
	}
	runID := parseStartedTaskRunID(t, taskStdout)

	udsSnapshot, err := udsClient.GetRunSnapshot(ctx, runID)
	if err != nil {
		t.Fatalf("uds GetRunSnapshot() error = %v", err)
	}
	if udsSnapshot.Run.RunID != runID || udsSnapshot.Run.Status != "completed" {
		t.Fatalf("unexpected terminal snapshot: %#v", udsSnapshot.Run)
	}

	udsStream, err := udsClient.OpenRunStream(ctx, runID, apicore.StreamCursor{})
	if err != nil {
		t.Fatalf("uds OpenRunStream() error = %v", err)
	}
	udsItems := collectRunStreamSummaries(t, udsStream)

	if len(udsItems) == 0 || udsItems[len(udsItems)-1].Kind != "run.completed" {
		t.Fatalf("expected terminal stream summary, got %#v", udsItems)
	}
}

type runStreamSummary struct {
	Kind      string
	Seq       uint64
	Heartbeat string
	Overflow  string
	Reason    string
}

func parseStartedTaskRunID(t *testing.T, output string) string {
	t.Helper()

	for _, line := range strings.Split(output, "\n") {
		if !strings.HasPrefix(line, "task run started: ") {
			continue
		}
		rest := strings.TrimPrefix(line, "task run started: ")
		idx := strings.Index(rest, " (mode=")
		if idx > 0 {
			return rest[:idx]
		}
	}

	t.Fatalf("could not parse task run id from output:\n%s", output)
	return ""
}

func collectRunStreamSummaries(t *testing.T, stream apiclient.RunStream) []runStreamSummary {
	t.Helper()

	t.Cleanup(func() {
		_ = stream.Close()
	})

	items := stream.Items()
	errs := stream.Errors()
	timer := time.NewTimer(2 * time.Second)
	defer timer.Stop()

	var summaries []runStreamSummary
	for items != nil || errs != nil {
		select {
		case item, ok := <-items:
			if !ok {
				items = nil
				continue
			}
			switch {
			case item.Event != nil:
				summary := runStreamSummary{
					Kind: string(item.Event.Kind),
					Seq:  item.Event.Seq,
				}
				summaries = append(summaries, summary)
				if summary.Kind == "run.completed" || summary.Kind == "run.failed" || summary.Kind == "run.cancelled" ||
					summary.Kind == "run.crashed" {
					return summaries
				}
			case item.Heartbeat != nil:
				summaries = append(summaries, runStreamSummary{
					Kind:      "heartbeat",
					Heartbeat: apicore.FormatCursor(item.Heartbeat.Timestamp, item.Heartbeat.Cursor.Sequence),
				})
			case item.Overflow != nil:
				summaries = append(summaries, runStreamSummary{
					Kind:     "overflow",
					Overflow: apicore.FormatCursor(item.Overflow.Timestamp, item.Overflow.Cursor.Sequence),
					Reason:   item.Overflow.Reason,
				})
			default:
				t.Fatalf("unexpected empty stream item: %#v", item)
			}
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			timer.Reset(2 * time.Second)
		case err, ok := <-errs:
			if !ok {
				errs = nil
				continue
			}
			if err != nil {
				t.Fatalf("run stream error: %v", err)
			}
		case <-timer.C:
			t.Fatal("timed out waiting for daemon run stream to finish")
		}
	}

	return summaries
}
