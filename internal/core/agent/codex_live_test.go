package agent

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/itseffi/productize/internal/core/model"
)

func TestLiveCodexModelAvailability(t *testing.T) {
	t.Run("Should create a real Codex ACP session with the requested model", func(t *testing.T) {
		modelName := strings.TrimSpace(os.Getenv("PRODUCTIZE_LIVE_CODEX_MODEL"))
		if modelName == "" {
			t.Skip("set PRODUCTIZE_LIVE_CODEX_MODEL to run the live Codex ACP model availability check")
		}

		reasoningEffort := strings.TrimSpace(os.Getenv("PRODUCTIZE_LIVE_CODEX_REASONING_EFFORT"))
		if reasoningEffort == "" {
			reasoningEffort = "low"
		}

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()

		client, err := NewClient(ctx, ClientConfig{
			IDE:             model.IDECodex,
			Model:           modelName,
			ReasoningEffort: reasoningEffort,
			ShutdownTimeout: 5 * time.Second,
		})
		if err != nil {
			t.Fatalf("new codex client: %v", err)
		}
		t.Cleanup(func() {
			if err := client.Close(); err != nil {
				t.Fatalf("close codex client: %v", err)
			}
		})

		session, err := client.CreateSession(ctx, SessionRequest{
			Prompt:     []byte("Reply with exactly: productize-model-ok"),
			WorkingDir: t.TempDir(),
			Model:      modelName,
		})
		if err != nil {
			t.Fatalf("create codex session with model %q: %v", modelName, err)
		}

		updates := collectSessionUpdates(t, session)
		if err := session.Err(); err != nil {
			t.Fatalf("codex session with model %q failed: %v", modelName, err)
		}
		var output strings.Builder
		for _, block := range flattenBlocks(updates) {
			if block.Type != model.BlockText {
				continue
			}
			text, err := block.AsText()
			if err != nil {
				t.Fatalf("decode codex text response: %v", err)
			}
			output.WriteString(text.Text)
		}
		if !strings.Contains(output.String(), "productize-model-ok") {
			t.Fatalf(
				"codex session with model %q response = %q, want %q",
				modelName,
				output.String(),
				"productize-model-ok",
			)
		}
	})
}
