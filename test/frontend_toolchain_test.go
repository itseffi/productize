package test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRootWebToolchainIsRemoved(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)
	for _, rel := range []string{
		".bun-version",
		"bun.lock",
		"turbo.json",
		"vitest.config.ts",
		"tsconfig.json",
		".oxlintrc.json",
		".oxfmtrc.json",
		"web",
		"packages",
		"docs/design/daemon-mockup",
	} {
		if _, err := os.Stat(filepath.Join(root, rel)); err == nil {
			t.Fatalf("expected removed web toolchain artifact %q to be absent", rel)
		} else if !os.IsNotExist(err) {
			t.Fatalf("stat %q: %v", rel, err)
		}
	}
}

func TestRootPackageJSONDoesNotExposeFrontendTooling(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile(filepath.Join(repoRoot(t), "package.json"))
	if err != nil {
		t.Fatalf("read package.json: %v", err)
	}

	var pkg struct {
		DevDependencies map[string]string `json:"devDependencies"`
		Scripts         map[string]string `json:"scripts"`
	}
	if err := json.Unmarshal(content, &pkg); err != nil {
		t.Fatalf("unmarshal package.json: %v", err)
	}

	for _, dep := range []string{"@vitejs/plugin-react", "vite", "vitest", "turbo", "oxlint"} {
		if _, ok := pkg.DevDependencies[dep]; ok {
			t.Fatalf("expected package.json not to depend on removed frontend tool %q", dep)
		}
	}

	for name, script := range pkg.Scripts {
		for _, forbidden := range []string{"bun", "bunx", "turbo", "vite", "vitest", "oxlint"} {
			if strings.Contains(name, forbidden) || strings.Contains(script, forbidden) {
				t.Fatalf("expected script %q=%q not to reference %q", name, script, forbidden)
			}
		}
	}
}

func TestReleaseToolingDoesNotInstallBun(t *testing.T) {
	t.Parallel()

	for _, rel := range []string{
		".github/actions/setup-git-cliff/action.yml",
		".github/actions/setup-release/action.yml",
		".github/workflows/ci.yml",
		".github/workflows/release.yml",
	} {
		content, err := os.ReadFile(filepath.Join(repoRoot(t), rel))
		if err != nil {
			t.Fatalf("read %s: %v", rel, err)
		}
		text := string(content)
		for _, forbidden := range []string{"setup-bun", "bun install", "bunx", ".bun", "bun-version"} {
			if strings.Contains(text, forbidden) {
				t.Fatalf("expected %s not to contain removed Bun tooling %q", rel, forbidden)
			}
		}
	}
}
