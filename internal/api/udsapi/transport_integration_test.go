package udsapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/itseffi/productize/internal/api/contract"
	"github.com/itseffi/productize/internal/api/core"
	"github.com/itseffi/productize/internal/api/testutil"
	"github.com/itseffi/productize/internal/api/udsapi"
	"github.com/itseffi/productize/internal/store/globaldb"
	"github.com/itseffi/productize/pkg/productize/events"
)

func TestUDSRegistersExpectedRoutes(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)

	handlers := core.NewHandlers(&core.HandlerConfig{TransportName: "test"})
	engine := gin.New()
	udsapi.RegisterRoutes(engine, handlers)

	routes := routeKeys(engine.Routes())
	required := []string{
		"GET /api/tasks",
		"GET /api/tasks/:slug",
		"GET /api/tasks/:slug/spec",
		"GET /api/tasks/:slug/memory",
		"GET /api/tasks/:slug/memory/files/:file_id",
		"GET /api/tasks/:slug/board",
		"GET /api/tasks/:slug/items/:task_id",
		"GET /api/reviews/:slug/rounds/:round/issues/:issue_id",
		"POST /api/tasks/:slug/runs",
		"POST /api/tasks/:slug/archive",
		"POST /api/reviews/:slug/rounds/:round/runs",
		"POST /api/sync",
		"GET /api/workspaces",
	}

	routeSet := make(map[string]struct{}, len(routes))
	for _, route := range routes {
		routeSet[route] = struct{}{}
	}
	for _, route := range required {
		if _, ok := routeSet[route]; !ok {
			t.Fatalf("required route %q missing from registration", route)
		}
	}
	if _, ok := routeSet["GET /api/ui/dashboard"]; ok {
		t.Fatal("dashboard route must not be registered")
	}
}

func TestUDSServesAPIOnly(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)

	handlers := core.NewHandlers(&core.HandlerConfig{
		TransportName: "uds",
		Daemon: &fakeDaemonService{
			status: core.DaemonStatus{PID: 42},
			health: core.DaemonHealth{Ready: true},
		},
	})

	socketPath := newShortSocketPath(t)
	udsServer, udsClient := startUDSServer(t, handlers, socketPath)
	defer func() {
		_ = udsServer.Shutdown(context.Background())
	}()

	statusCode, _, _ := mustRequest(t, udsClient, "GET", "http://unix/", nil, nil)
	if statusCode != 404 {
		t.Fatalf("UDS GET / status = %d, want 404", statusCode)
	}

	statusCode, _, body := mustRequest(t, udsClient, "GET", "http://unix/api/daemon/status", nil, nil)
	if statusCode != 200 {
		t.Fatalf("UDS GET /api/daemon/status status = %d, want 200", statusCode)
	}
	if !bytes.Contains(body, []byte(`"pid":42`)) {
		t.Fatalf("UDS daemon status body = %s, want pid field", body)
	}
}

func TestUDSServerCreates0600Socket(t *testing.T) {
	gin.SetMode(gin.TestMode)

	socketPath := newShortSocketPath(t)
	server, err := udsapi.New(
		udsapi.WithHandlers(core.NewHandlers(&core.HandlerConfig{TransportName: "uds"})),
		udsapi.WithSocketPath(socketPath),
	)
	if err != nil {
		t.Fatalf("udsapi.New() error = %v", err)
	}
	if err := server.Start(context.Background()); err != nil {
		t.Fatalf("server.Start() error = %v", err)
	}
	defer func() {
		_ = server.Shutdown(context.Background())
	}()

	info, err := os.Stat(socketPath)
	if err != nil {
		t.Fatalf("Stat(%s) error = %v", socketPath, err)
	}
	if info.Mode().Perm() != 0o600 {
		t.Fatalf("socket perm = %o, want 600", info.Mode().Perm())
	}
}

func TestUDSServerNewPrefersExplicitSocketPath(t *testing.T) {
	gin.SetMode(gin.TestMode)

	socketPath := filepath.Join(t.TempDir(), "explicit.sock")
	server, err := udsapi.New(
		udsapi.WithHandlers(core.NewHandlers(&core.HandlerConfig{TransportName: "uds"})),
		udsapi.WithSocketPath(socketPath),
	)
	if err != nil {
		t.Fatalf("udsapi.New() error = %v", err)
	}
	if server.Path() != socketPath {
		t.Fatalf("server.Path() = %q, want %q", server.Path(), socketPath)
	}
}

func TestUDSServerStartRollsBackAfterParentSetupFailure(t *testing.T) {
	gin.SetMode(gin.TestMode)

	blockedParentFile, err := os.CreateTemp("/tmp", "productize-uds-blocked-*")
	if err != nil {
		t.Fatalf("CreateTemp(/tmp) error = %v", err)
	}
	blockedParent := blockedParentFile.Name()
	if err := blockedParentFile.Close(); err != nil {
		t.Fatalf("Close(%s) error = %v", blockedParent, err)
	}

	socketPath := filepath.Join(blockedParent, "daemon.sock")
	server, err := udsapi.New(
		udsapi.WithHandlers(core.NewHandlers(&core.HandlerConfig{TransportName: "uds"})),
		udsapi.WithSocketPath(socketPath),
	)
	if err != nil {
		t.Fatalf("udsapi.New() error = %v", err)
	}

	err = server.Start(context.Background())
	if err == nil || !strings.Contains(err.Error(), "create socket directory") {
		t.Fatalf("first Start() error = %v, want socket directory failure", err)
	}

	if err := os.Remove(blockedParent); err != nil {
		t.Fatalf("Remove(%s) error = %v", blockedParent, err)
	}
	if err := os.MkdirAll(blockedParent, 0o700); err != nil {
		t.Fatalf("MkdirAll(%s) error = %v", blockedParent, err)
	}

	if err := server.Start(context.Background()); err != nil {
		t.Fatalf("second Start() error = %v", err)
	}
	defer func() {
		_ = server.Shutdown(context.Background())
	}()
}

func TestUDSServeCanonicalParityAcrossRouteGroups(t *testing.T) {
	gin.SetMode(gin.TestMode)

	now := time.Date(2026, 4, 20, 19, 0, 0, 0, time.UTC)
	workspaceRoot := t.TempDir()
	workspace := core.Workspace{
		ID:        "ws-1",
		RootDir:   workspaceRoot,
		Name:      "workspace",
		CreatedAt: now,
		UpdatedAt: now,
	}
	taskRun := core.Run{
		RunID:            "task-run-1",
		WorkspaceID:      workspace.ID,
		WorkflowSlug:     "daemon",
		Mode:             "task",
		Status:           "running",
		PresentationMode: "stream",
		StartedAt:        now,
		RequestID:        "run-req-task",
	}
	reviewRun := core.Run{
		RunID:            "review-run-1",
		WorkspaceID:      workspace.ID,
		WorkflowSlug:     "daemon",
		Mode:             "review",
		Status:           "running",
		PresentationMode: "stream",
		StartedAt:        now,
		RequestID:        "run-req-review",
	}
	execRun := core.Run{
		RunID:            "exec-run-1",
		WorkspaceID:      workspace.ID,
		Mode:             "exec",
		Status:           "running",
		PresentationMode: "stream",
		StartedAt:        now,
		RequestID:        "run-req-exec",
	}
	nextCursor := core.StreamCursor{Timestamp: now.Add(time.Second), Sequence: 2}

	handlers := core.NewHandlers(&core.HandlerConfig{
		TransportName: "uds",
		Daemon: &fakeDaemonService{
			health: core.DaemonHealth{
				Ready: true,
				Details: []core.HealthDetail{{
					Code:    "healthy",
					Message: "daemon is ready",
				}},
			},
		},
		Workspaces: &fakeWorkspaceService{
			workspaces: []core.Workspace{workspace},
			workspace:  workspace,
		},
		Tasks: &fakeTaskService{
			run: taskRun,
		},
		Reviews: &fakeReviewService{
			run: reviewRun,
		},
		Runs: &fakeRunService{
			runs: map[string]core.Run{
				taskRun.RunID: taskRun,
			},
			snapshots: map[string]core.RunSnapshot{
				taskRun.RunID: {
					Run: taskRun,
					Jobs: []core.RunJobState{{
						JobID:     "job-1",
						Status:    "running",
						UpdatedAt: now.Add(time.Second),
					}},
					Transcript: []core.RunTranscriptMessage{{
						Sequence:  1,
						Stream:    "session",
						Role:      "assistant",
						Content:   "hello",
						Timestamp: now.Add(time.Second),
					}},
					Incomplete:        true,
					IncompleteReasons: []string{"transcript_gap"},
					NextCursor:        &nextCursor,
				},
			},
		},
		Sync: &fakeSyncService{
			result: core.SyncResult{
				WorkspaceID:  workspace.ID,
				WorkflowSlug: "daemon",
				SyncedAt:     ptrTime(now),
				SyncedPaths:  []string{workspace.RootDir},
			},
		},
		Exec: &fakeExecService{
			run: execRun,
		},
	})

	socketPath := newShortSocketPath(t)
	udsServer, udsClient := startUDSServer(t, handlers, socketPath)
	defer func() {
		_ = udsServer.Shutdown(context.Background())
	}()

	testCases := []struct {
		name       string
		method     string
		path       string
		body       []byte
		headers    map[string]string
		wantStatus int
		assertBody func(*testing.T, []byte)
	}{
		{
			name:       "daemon health",
			method:     "GET",
			path:       "/api/daemon/health",
			wantStatus: 200,
			assertBody: func(t *testing.T, body []byte) {
				t.Helper()
				var payload contract.DaemonHealthResponse
				decodeJSON(t, body, &payload)
				if !payload.Health.Ready {
					t.Fatalf("health payload = %#v, want ready", payload)
				}
			},
		},
		{
			name:       "workspace list",
			method:     "GET",
			path:       "/api/workspaces",
			wantStatus: 200,
			assertBody: func(t *testing.T, body []byte) {
				t.Helper()
				var payload contract.WorkspaceListResponse
				decodeJSON(t, body, &payload)
				if len(payload.Workspaces) != 1 || payload.Workspaces[0].ID != workspace.ID {
					t.Fatalf("workspace payload = %#v", payload)
				}
			},
		},
		{
			name:       "task run",
			method:     "POST",
			path:       "/api/tasks/daemon/runs",
			body:       []byte(`{"workspace":"ws-1","presentation_mode":"stream"}`),
			headers:    map[string]string{core.HeaderActiveWorkspaceID: workspace.ID},
			wantStatus: 201,
			assertBody: func(t *testing.T, body []byte) {
				t.Helper()
				var payload contract.RunResponse
				decodeJSON(t, body, &payload)
				if payload.Run.RunID != taskRun.RunID {
					t.Fatalf("task run payload = %#v", payload)
				}
			},
		},
		{
			name:       "review run",
			method:     "POST",
			path:       "/api/reviews/daemon/rounds/1/runs",
			body:       []byte(`{"workspace":"ws-1","presentation_mode":"stream"}`),
			headers:    map[string]string{core.HeaderActiveWorkspaceID: workspace.ID},
			wantStatus: 201,
			assertBody: func(t *testing.T, body []byte) {
				t.Helper()
				var payload contract.RunResponse
				decodeJSON(t, body, &payload)
				if payload.Run.RunID != reviewRun.RunID {
					t.Fatalf("review run payload = %#v", payload)
				}
			},
		},
		{
			name:       "run snapshot",
			method:     "GET",
			path:       "/api/runs/" + taskRun.RunID + "/snapshot",
			wantStatus: 200,
			assertBody: func(t *testing.T, body []byte) {
				t.Helper()
				var payload contract.RunSnapshotResponse
				decodeJSON(t, body, &payload)
				if got, want := payload.IncompleteReasons, []string{"transcript_gap"}; !reflect.DeepEqual(got, want) {
					t.Fatalf("snapshot incomplete reasons = %#v, want %#v", got, want)
				}
			},
		},
		{
			name:       "sync",
			method:     "POST",
			path:       "/api/sync",
			body:       []byte(`{"workspace":"ws-1","workflow_slug":"daemon"}`),
			headers:    map[string]string{core.HeaderActiveWorkspaceID: workspace.ID},
			wantStatus: 200,
			assertBody: func(t *testing.T, body []byte) {
				t.Helper()
				var payload contract.SyncResponse
				decodeJSON(t, body, &payload)
				if payload.WorkspaceID != workspace.ID {
					t.Fatalf("sync payload = %#v", payload)
				}
			},
		},
		{
			name:       "exec",
			method:     "POST",
			path:       "/api/exec",
			body:       []byte(`{"workspace_path":"/tmp/workspace","prompt":"run","presentation_mode":"stream"}`),
			wantStatus: 201,
			assertBody: func(t *testing.T, body []byte) {
				t.Helper()
				var payload contract.RunResponse
				decodeJSON(t, body, &payload)
				if payload.Run.RunID != execRun.RunID {
					t.Fatalf("exec payload = %#v", payload)
				}
			},
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			headers := map[string]string{core.HeaderRequestID: "req-" + tc.name}
			for key, value := range tc.headers {
				headers[key] = value
			}

			status, respHeaders, body := mustRequest(t, udsClient, tc.method, "http://unix"+tc.path, tc.body, headers)
			if status != tc.wantStatus {
				t.Fatalf("status = %d, want %d (body=%s)", status, tc.wantStatus, body)
			}
			if got := strings.TrimSpace(respHeaders.Get(core.HeaderRequestID)); got != "req-"+tc.name {
				t.Fatalf("X-Request-Id = %q, want %q", got, "req-"+tc.name)
			}
			tc.assertBody(t, body)
		})
	}
}

func TestUDSEmitsCanonicalSSEStream(t *testing.T) {
	gin.SetMode(gin.TestMode)

	now := time.Date(2026, 4, 20, 19, 30, 0, 0, time.UTC)
	runID := "run-1"
	handlers := core.NewHandlers(&core.HandlerConfig{
		TransportName:     "uds",
		HeartbeatInterval: 15 * time.Millisecond,
		Now: func() time.Time {
			return now.Add(2 * time.Second)
		},
		Runs: &fakeRunService{
			openStreamFn: func(ctx context.Context, gotRunID string, after core.StreamCursor) (core.RunStream, error) {
				if gotRunID != runID {
					return nil, globaldb.ErrRunNotFound
				}
				stream := newChannelRunStream()
				go func() {
					defer close(stream.events)
					defer close(stream.errors)

					event := newRunEvent(runID, 1, events.EventKindSessionUpdate, now, `{"delta":"hello"}`)
					if core.EventAfterCursor(event, after) {
						item := event
						stream.events <- core.RunStreamItem{Event: &item}
					}

					timer := time.NewTimer(35 * time.Millisecond)
					defer timer.Stop()
					select {
					case <-ctx.Done():
						return
					case <-timer.C:
					}

					stream.events <- core.RunStreamItem{
						Overflow: &core.RunStreamOverflow{Reason: "subscriber_dropped_messages"},
					}
				}()
				return stream, nil
			},
		},
	})

	socketPath := newShortSocketPath(t)
	udsServer, udsClient := startUDSServer(t, handlers, socketPath)
	defer func() {
		_ = udsServer.Shutdown(context.Background())
	}()

	response := mustStreamRequest(t, udsClient, "http://unix/api/runs/"+runID+"/stream", "req-uds-stream")
	defer response.Body.Close()

	frames, err := testutil.ReadSSEFramesUntil(
		response.Body,
		2*time.Second,
		func(frames []testutil.SSEFrame) bool {
			return hasCanonicalSSEFrame(frames, core.RunOverflowSSEEvent)
		},
	)
	if err != nil {
		t.Fatalf("ReadSSEFramesUntil(uds) error = %v", err)
	}
	frames = normalizeCanonicalSSEFrames(frames)

	if len(frames) != 3 {
		t.Fatalf("unexpected normalized frames: %#v", frames)
	}

	var eventPayload events.Event
	if err := json.Unmarshal(frames[0].Data, &eventPayload); err != nil {
		t.Fatalf("json.Unmarshal(event) error = %v", err)
	}
	if eventPayload.Kind != events.EventKindSessionUpdate || eventPayload.RunID != runID {
		t.Fatalf("event payload = %#v", eventPayload)
	}

	var heartbeatPayload contract.HeartbeatPayload
	if err := json.Unmarshal(frames[1].Data, &heartbeatPayload); err != nil {
		t.Fatalf("json.Unmarshal(heartbeat) error = %v", err)
	}
	if heartbeatPayload.RunID != runID || heartbeatPayload.Cursor != core.FormatCursor(now, 1) {
		t.Fatalf("heartbeat payload = %#v", heartbeatPayload)
	}

	var overflowPayload contract.OverflowPayload
	if err := json.Unmarshal(frames[2].Data, &overflowPayload); err != nil {
		t.Fatalf("json.Unmarshal(overflow) error = %v", err)
	}
	if overflowPayload.RunID != runID ||
		overflowPayload.Cursor != core.FormatCursor(now, 1) ||
		overflowPayload.Reason != "subscriber_dropped_messages" {
		t.Fatalf("overflow payload = %#v", overflowPayload)
	}
}

// --- test doubles ---

type fakeDaemonService struct {
	status core.DaemonStatus
	health core.DaemonHealth
}

func (f *fakeDaemonService) Status(context.Context) (core.DaemonStatus, error) {
	return f.status, nil
}

func (f *fakeDaemonService) Health(context.Context) (core.DaemonHealth, error) {
	return f.health, nil
}

func (f *fakeDaemonService) Metrics(context.Context) (core.MetricsPayload, error) {
	return core.MetricsPayload{}, nil
}

func (f *fakeDaemonService) Stop(context.Context, bool) error {
	return nil
}

type fakeWorkspaceService struct {
	workspaces []core.Workspace
	workspace  core.Workspace
}

func (f *fakeWorkspaceService) Register(context.Context, string, string) (core.WorkspaceRegisterResult, error) {
	return core.WorkspaceRegisterResult{Workspace: f.workspace, Created: true}, nil
}

func (f *fakeWorkspaceService) List(context.Context) ([]core.Workspace, error) {
	return append([]core.Workspace(nil), f.workspaces...), nil
}

func (f *fakeWorkspaceService) Get(_ context.Context, workspaceID string) (core.Workspace, error) {
	if f.workspace.ID == workspaceID {
		return f.workspace, nil
	}
	return core.Workspace{}, globaldb.ErrWorkspaceNotFound
}

func (f *fakeWorkspaceService) Update(context.Context, string, core.WorkspaceUpdateInput) (core.Workspace, error) {
	return f.workspace, nil
}

func (f *fakeWorkspaceService) Delete(context.Context, string) error {
	return nil
}

func (f *fakeWorkspaceService) Resolve(context.Context, string) (core.Workspace, error) {
	return f.workspace, nil
}

func (f *fakeWorkspaceService) Sync(context.Context) (core.WorkspaceSyncResult, error) {
	return core.WorkspaceSyncResult{Checked: len(f.workspaces), Synced: len(f.workspaces)}, nil
}

type fakeTaskService struct {
	run core.Run
}

func (*fakeTaskService) ListWorkflows(context.Context, string) ([]core.WorkflowSummary, error) {
	return nil, nil
}

func (*fakeTaskService) GetWorkflow(context.Context, string, string) (core.WorkflowSummary, error) {
	return core.WorkflowSummary{}, nil
}

func (*fakeTaskService) WorkflowOverview(context.Context, string, string) (core.WorkflowOverviewPayload, error) {
	return core.WorkflowOverviewPayload{}, nil
}

func (*fakeTaskService) ListItems(context.Context, string, string) ([]core.TaskItem, error) {
	return nil, nil
}

func (*fakeTaskService) TaskBoard(context.Context, string, string) (core.TaskBoardPayload, error) {
	return core.TaskBoardPayload{}, nil
}

func (*fakeTaskService) WorkflowSpec(context.Context, string, string) (core.WorkflowSpecDocument, error) {
	return core.WorkflowSpecDocument{}, nil
}

func (*fakeTaskService) WorkflowMemoryIndex(context.Context, string, string) (core.WorkflowMemoryIndex, error) {
	return core.WorkflowMemoryIndex{}, nil
}

func (*fakeTaskService) WorkflowMemoryFile(context.Context, string, string, string) (core.MarkdownDocument, error) {
	return core.MarkdownDocument{}, nil
}

func (*fakeTaskService) TaskDetail(context.Context, string, string, string) (core.TaskDetailPayload, error) {
	return core.TaskDetailPayload{}, nil
}

func (*fakeTaskService) Validate(context.Context, string, string) (core.ValidationSuccess, error) {
	return core.ValidationSuccess{Valid: true}, nil
}

func (f *fakeTaskService) StartRun(context.Context, string, string, core.TaskRunRequest) (core.Run, error) {
	return f.run, nil
}

func (*fakeTaskService) Archive(context.Context, string, string, core.ArchiveRequest) (core.ArchiveResult, error) {
	return core.ArchiveResult{Archived: true}, nil
}

type fakeReviewService struct {
	run core.Run
}

func (*fakeReviewService) Fetch(
	context.Context,
	string,
	string,
	core.ReviewFetchRequest,
) (core.ReviewFetchResult, error) {
	return core.ReviewFetchResult{}, nil
}

func (*fakeReviewService) GetLatest(context.Context, string, string) (core.ReviewSummary, error) {
	return core.ReviewSummary{}, nil
}

func (*fakeReviewService) GetRound(context.Context, string, string, int) (core.ReviewRound, error) {
	return core.ReviewRound{}, nil
}

func (*fakeReviewService) ListIssues(context.Context, string, string, int) ([]core.ReviewIssue, error) {
	return nil, nil
}

func (*fakeReviewService) ReviewDetail(context.Context, string, string, int, string) (core.ReviewDetailPayload, error) {
	return core.ReviewDetailPayload{}, nil
}

func (f *fakeReviewService) StartRun(context.Context, string, string, int, core.ReviewRunRequest) (core.Run, error) {
	return f.run, nil
}

func (f *fakeReviewService) StartWatch(context.Context, string, string, core.ReviewWatchRequest) (core.Run, error) {
	return f.run, nil
}

type fakeSyncService struct {
	result core.SyncResult
}

func (f *fakeSyncService) Sync(_ context.Context, req core.SyncRequest) (core.SyncResult, error) {
	if f.result.WorkspaceID == "" && f.result.WorkflowSlug == "" && len(f.result.SyncedPaths) == 0 &&
		f.result.SyncedAt == nil {
		return core.SyncResult{WorkspaceID: req.Workspace, WorkflowSlug: req.WorkflowSlug}, nil
	}
	return f.result, nil
}

type fakeExecService struct {
	run core.Run
}

func (f *fakeExecService) Start(context.Context, core.ExecRequest) (core.Run, error) {
	return f.run, nil
}

type fakeRunService struct {
	runs         map[string]core.Run
	snapshots    map[string]core.RunSnapshot
	openStreamFn func(context.Context, string, core.StreamCursor) (core.RunStream, error)
}

func (f *fakeRunService) List(context.Context, core.RunListQuery) ([]core.Run, error) {
	if len(f.runs) == 0 {
		return nil, nil
	}
	items := make([]core.Run, 0, len(f.runs))
	runIDs := make([]string, 0, len(f.runs))
	for runID := range f.runs {
		runIDs = append(runIDs, runID)
	}
	sort.Strings(runIDs)
	for _, runID := range runIDs {
		items = append(items, f.runs[runID])
	}
	return items, nil
}

func (f *fakeRunService) Get(_ context.Context, runID string) (core.Run, error) {
	item, ok := f.runs[runID]
	if !ok {
		return core.Run{}, globaldb.ErrRunNotFound
	}
	return item, nil
}

func (f *fakeRunService) Snapshot(_ context.Context, runID string) (core.RunSnapshot, error) {
	item, ok := f.snapshots[runID]
	if !ok {
		return core.RunSnapshot{}, globaldb.ErrRunNotFound
	}
	return item, nil
}

func (f *fakeRunService) Transcript(_ context.Context, runID string) (core.RunTranscript, error) {
	item, ok := f.snapshots[runID]
	if !ok {
		return core.RunTranscript{}, globaldb.ErrRunNotFound
	}
	return core.RunTranscript{
		RunID:      item.Run.RunID,
		Messages:   []core.RunUIMessage{},
		NextCursor: item.NextCursor,
	}, nil
}

func (f *fakeRunService) RunDetail(_ context.Context, runID string) (core.RunDetailPayload, error) {
	item, ok := f.snapshots[runID]
	if !ok {
		return core.RunDetailPayload{}, globaldb.ErrRunNotFound
	}
	run, ok := f.runs[runID]
	if !ok {
		return core.RunDetailPayload{}, globaldb.ErrRunNotFound
	}
	return core.RunDetailPayload{Run: run, Snapshot: item}, nil
}

func (f *fakeRunService) Events(context.Context, string, core.RunEventPageQuery) (core.RunEventPage, error) {
	return core.RunEventPage{}, nil
}

func (f *fakeRunService) OpenStream(
	ctx context.Context,
	runID string,
	after core.StreamCursor,
) (core.RunStream, error) {
	if f.openStreamFn == nil {
		return nil, globaldb.ErrRunNotFound
	}
	return f.openStreamFn(ctx, runID, after)
}

func (f *fakeRunService) Cancel(context.Context, string) error {
	return nil
}

type channelRunStream struct {
	events chan core.RunStreamItem
	errors chan error
}

func newChannelRunStream() *channelRunStream {
	return &channelRunStream{
		events: make(chan core.RunStreamItem, 8),
		errors: make(chan error, 1),
	}
}

func (c *channelRunStream) Events() <-chan core.RunStreamItem {
	return c.events
}

func (c *channelRunStream) Errors() <-chan error {
	return c.errors
}

func (c *channelRunStream) Close() error {
	return nil
}

// --- helpers ---

func startUDSServer(t *testing.T, handlers *core.Handlers, socketPath string) (*udsapi.Server, *http.Client) {
	t.Helper()

	server, err := udsapi.New(
		udsapi.WithHandlers(handlers),
		udsapi.WithSocketPath(socketPath),
	)
	if err != nil {
		t.Fatalf("udsapi.New() error = %v", err)
	}
	if err := server.Start(context.Background()); err != nil {
		t.Fatalf("server.Start() error = %v", err)
	}

	client := &http.Client{
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				var dialer net.Dialer
				return dialer.DialContext(ctx, "unix", socketPath)
			},
		},
	}
	return server, client
}

func mustRequest(
	t *testing.T,
	client *http.Client,
	method string,
	rawURL string,
	body []byte,
	headers map[string]string,
) (int, http.Header, []byte) {
	t.Helper()

	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	request, err := http.NewRequestWithContext(context.Background(), method, rawURL, reader)
	if err != nil {
		t.Fatalf("NewRequest(%s %s) error = %v", method, rawURL, err)
	}
	for key, value := range headers {
		request.Header.Set(key, value)
	}
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}

	response, err := client.Do(request)
	if err != nil {
		t.Fatalf("Do(%s %s) error = %v", method, rawURL, err)
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("ReadAll(%s %s) error = %v", method, rawURL, err)
	}
	return response.StatusCode, response.Header.Clone(), responseBody
}

func mustStreamRequest(t *testing.T, client *http.Client, rawURL string, requestID string) *http.Response {
	t.Helper()

	request, err := http.NewRequestWithContext(context.Background(), http.MethodGet, rawURL, http.NoBody)
	if err != nil {
		t.Fatalf("NewRequest(%s) error = %v", rawURL, err)
	}
	request.Header.Set(core.HeaderRequestID, requestID)

	response, err := client.Do(request)
	if err != nil {
		t.Fatalf("Do(%s) error = %v", rawURL, err)
	}
	if response.StatusCode != http.StatusOK {
		defer response.Body.Close()
		body, readErr := io.ReadAll(response.Body)
		if readErr != nil {
			t.Fatalf("ReadAll(%s) error = %v", rawURL, readErr)
		}
		t.Fatalf("status = %d, want 200; body=%s", response.StatusCode, body)
	}
	if got := strings.TrimSpace(response.Header.Get(core.HeaderRequestID)); got != requestID {
		defer response.Body.Close()
		t.Fatalf("X-Request-Id = %q, want %q", got, requestID)
	}
	return response
}

func newShortSocketPath(t *testing.T) string {
	t.Helper()

	file, err := os.CreateTemp("", "productize-uds-*.sock")
	if err != nil {
		t.Fatalf("CreateTemp() error = %v", err)
	}
	path := file.Name()
	if err := file.Close(); err != nil {
		t.Fatalf("Close(temp socket file) error = %v", err)
	}
	if err := os.Remove(path); err != nil {
		t.Fatalf("Remove(temp socket file) error = %v", err)
	}
	return path
}

func routeKeys(routes gin.RoutesInfo) []string {
	items := make([]string, 0, len(routes))
	for _, route := range routes {
		items = append(items, route.Method+" "+route.Path)
	}
	sort.Strings(items)
	return items
}

func ptrTime(value time.Time) *time.Time {
	return &value
}

func newRunEvent(runID string, seq uint64, kind events.EventKind, ts time.Time, payload string) events.Event {
	return events.Event{
		SchemaVersion: events.SchemaVersion,
		RunID:         runID,
		Seq:           seq,
		Timestamp:     ts.UTC(),
		Kind:          kind,
		Payload:       json.RawMessage(payload),
	}
}

func decodeJSON(t *testing.T, data []byte, dst any) {
	t.Helper()
	if err := json.Unmarshal(data, dst); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
}

func hasCanonicalSSEFrame(frames []testutil.SSEFrame, event string) bool {
	for _, frame := range frames {
		if frame.Event == event {
			return true
		}
	}
	return false
}

func normalizeCanonicalSSEFrames(frames []testutil.SSEFrame) []testutil.SSEFrame {
	eventsOfInterest := []string{core.RunEventSSEEvent, core.RunHeartbeatSSEEvent, core.RunOverflowSSEEvent}
	normalized := make([]testutil.SSEFrame, 0, len(eventsOfInterest))
	for _, eventName := range eventsOfInterest {
		for _, frame := range frames {
			if frame.Event == eventName {
				normalized = append(normalized, frame)
				break
			}
		}
	}
	return normalized
}
