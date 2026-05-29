package test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

type goReleaserConfig struct {
	Before        goReleaserBefore            `yaml:"before"`
	Archives      []goReleaserArchive         `yaml:"archives"`
	HomebrewCasks []goReleaserHomebrewFormula `yaml:"homebrew_casks"`
}

type goReleaserBefore struct {
	Hooks []string `yaml:"hooks"`
}

type goReleaserArchive struct {
	ID              string `yaml:"id"`
	WrapInDirectory bool   `yaml:"wrap_in_directory"`
}

type goReleaserHomebrewFormula struct {
	Name       string               `yaml:"name"`
	IDs        []string             `yaml:"ids"`
	Binaries   []string             `yaml:"binaries"`
	Directory  string               `yaml:"directory"`
	Repository goReleaserRepository `yaml:"repository"`
}

type goReleaserRepository struct {
	Owner string `yaml:"owner"`
	Name  string `yaml:"name"`
}

func TestReleaseWorkflowsUseScopedReleaseNotesGenerator(t *testing.T) {
	t.Parallel()

	const fixedModule = "github.com/productize/releasepr@v0.0.21"
	brokenModules := []string{
		"github.com/productize/releasepr@v0.0.17",
		"github.com/productize/releasepr@v0.0.18",
		"github.com/productize/releasepr@v0.0.19",
		"github.com/productize/releasepr@v0.0.20",
	}
	workflowPaths := []string{
		filepath.Join(repoRoot(t), ".github", "workflows", "auto-docs.yml"),
		filepath.Join(repoRoot(t), ".github", "workflows", "release.yml"),
	}

	for _, workflowPath := range workflowPaths {
		workflowPath := workflowPath
		t.Run(filepath.Base(workflowPath), func(t *testing.T) {
			t.Parallel()
			content, err := os.ReadFile(workflowPath)
			if err != nil {
				t.Fatalf("read release workflow: %v", err)
			}
			text := string(content)
			if !strings.Contains(text, "PR_RELEASE_MODULE: "+fixedModule) {
				t.Fatalf("expected workflow to use fixed releasepr module %q", fixedModule)
			}
			for _, brokenModule := range brokenModules {
				if strings.Contains(text, brokenModule) {
					t.Fatalf("expected workflow to avoid broken releasepr module %q", brokenModule)
				}
			}
		})
	}
}

func TestReleasePublicationUsesGeneratedChangelog(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)
	releaseWorkflow := readRepoFile(t, root, ".github", "workflows", "release.yml")
	goReleaserConfig := readRepoFile(t, root, ".goreleaser.yml")
	gitignore := readRepoFile(t, root, ".gitignore")

	if strings.Contains(releaseWorkflow, "--release-notes=RELEASE_BODY.md") {
		t.Fatal("expected GoReleaser to use generated changelog notes instead of stale release body")
	}
	if strings.Contains(releaseWorkflow, "--release-notes=RELEASE_NOTES.md") {
		t.Fatal("expected GoReleaser to avoid publishing historical release notes")
	}
	if !strings.Contains(releaseWorkflow, "--release-header-tmpl=.goreleaser.release-header.md.tmpl") {
		t.Fatal("expected release workflow to pass the release header template to GoReleaser")
	}
	if !strings.Contains(releaseWorkflow, "--release-footer-tmpl=.goreleaser.release-footer.md.tmpl") {
		t.Fatal("expected release workflow to pass the release footer template to GoReleaser")
	}
	if !strings.Contains(goReleaserConfig, "changelog:") || !strings.Contains(goReleaserConfig, "use: git") {
		t.Fatal("expected GoReleaser to generate release notes from git changelog configuration")
	}
	if !strings.Contains(gitignore, "RELEASE_BODY.md") {
		t.Fatal("expected stale release body files to be ignored")
	}
}

func TestGoReleaserConfigSupportsFirstRelease(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile(filepath.Join(repoRoot(t), ".goreleaser.yml"))
	if err != nil {
		t.Fatalf("read goreleaser config: %v", err)
	}

	configText := string(content)

	if strings.Contains(configText, "use: github") {
		t.Fatal(
			"expected goreleaser changelog generation to avoid the GitHub compare API so the first release works without a previous remote tag",
		)
	}

	if !strings.Contains(configText, "use: git") {
		t.Fatal("expected goreleaser changelog generation to use git history for first-release compatibility")
	}

	footerContent, err := os.ReadFile(filepath.Join(repoRoot(t), ".goreleaser.release-footer.md.tmpl"))
	if err != nil {
		t.Fatalf("read goreleaser release footer template: %v", err)
	}

	footerText := string(footerContent)

	if !strings.Contains(footerText, "{{- if .PreviousTag }}") {
		t.Fatal("expected release notes to guard previous-tag links for the first release")
	}

	if !strings.Contains(footerText, "compare/{{ .PreviousTag }}...{{ .Tag }}") {
		t.Fatal("expected release notes to keep the compare link when a previous tag exists")
	}

	if !strings.Contains(footerText, "tree/{{ .Tag }}") {
		t.Fatal("expected release notes to include a first-release fallback link when no previous tag exists")
	}

	workflowContent, err := os.ReadFile(filepath.Join(repoRoot(t), ".github", "workflows", "release.yml"))
	if err != nil {
		t.Fatalf("read release workflow: %v", err)
	}

	if !strings.Contains(string(workflowContent), "--release-footer-tmpl=.goreleaser.release-footer.md.tmpl") {
		t.Fatal("expected the release workflow to pass the first-release footer template to goreleaser")
	}
}

func TestReleaseUsesFreeGoReleaserAndCustomNPMWrapper(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)
	goreleaserContent := readRepoFile(t, root, ".goreleaser.yml")
	var rawGoReleaser map[string]any
	if err := yaml.Unmarshal([]byte(goreleaserContent), &rawGoReleaser); err != nil {
		t.Fatalf("unmarshal goreleaser config: %v", err)
	}

	if strings.Contains(goreleaserContent, "schema-pro") {
		t.Fatal("expected GoReleaser config to use the free schema")
	}
	if _, ok := rawGoReleaser["pro"]; ok {
		t.Fatal("expected GoReleaser config to avoid the pro-only top-level pro flag")
	}
	if _, ok := rawGoReleaser["npms"]; ok {
		t.Fatal("expected npm publishing to use the custom wrapper instead of the pro-only npms block")
	}
	if metadata, ok := rawGoReleaser["metadata"].(map[string]any); ok {
		for _, proOnlyField := range []string{"license", "homepage", "description"} {
			if _, ok := metadata[proOnlyField]; ok {
				t.Fatalf("expected metadata to avoid pro-only field %q", proOnlyField)
			}
		}
	}

	workflow := readRepoFile(t, root, ".github", "workflows", "release.yml")
	for _, forbidden := range []string{"GORELEASER_KEY", "goreleaser-pro"} {
		if strings.Contains(workflow, forbidden) {
			t.Fatalf("expected release workflow to avoid %q", forbidden)
		}
	}
	for _, required := range []string{
		"distribution: goreleaser",
		"id: release-version",
		"node npm/cli/prepare-package.mjs",
		"--out dist/npm/@productize/cli",
		"npm publish dist/npm/@productize/cli --access public",
	} {
		if !strings.Contains(workflow, required) {
			t.Fatalf("expected release workflow to include %q", required)
		}
	}

	setupRelease := readRepoFile(t, root, ".github", "actions", "setup-release", "action.yml")
	if !strings.Contains(setupRelease, `default: "goreleaser"`) {
		t.Fatal("expected setup-release to default to free GoReleaser")
	}

	npmManifest := readRepoFile(t, root, "npm", "cli", "package.json")
	var npmPackage struct {
		Name    string            `json:"name"`
		Private bool              `json:"private"`
		Bin     map[string]string `json:"bin"`
		License string            `json:"license"`
	}
	if err := json.Unmarshal([]byte(npmManifest), &npmPackage); err != nil {
		t.Fatalf("decode npm cli package manifest: %v", err)
	}
	if npmPackage.Name != "@productize/cli" {
		t.Fatalf("expected npm wrapper package name @productize/cli, got %q", npmPackage.Name)
	}
	if !npmPackage.Private {
		t.Fatal("expected source npm wrapper package to be private so only generated packages are published")
	}
	if npmPackage.Bin["productize"] != "run-productize.js" {
		t.Fatalf("expected npm wrapper binary to point at run-productize.js, got %q", npmPackage.Bin["productize"])
	}
	if npmPackage.License != "MIT" {
		t.Fatalf("expected npm wrapper package license MIT, got %q", npmPackage.License)
	}

	prepareScript := readRepoFile(t, root, "npm", "cli", "prepare-package.mjs")
	for _, required := range []string{
		"delete manifest.private",
		"darwin",
		"linux",
		"windows",
		"copyTargetBinary",
	} {
		if !strings.Contains(prepareScript, required) {
			t.Fatalf("expected npm package preparation script to include %q", required)
		}
	}
}

func readRepoFile(t *testing.T, root string, path ...string) string {
	t.Helper()
	content, err := os.ReadFile(filepath.Join(append([]string{root}, path...)...))
	if err != nil {
		t.Fatalf("read repo file %s: %v", filepath.Join(path...), err)
	}
	return string(content)
}

func TestGoReleaserConfigUsesReadableChangelogTitlesAndFiltersReleaseCommits(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile(filepath.Join(repoRoot(t), ".goreleaser.yml"))
	if err != nil {
		t.Fatalf("read goreleaser config: %v", err)
	}

	text := string(content)

	expectedTitles := []string{
		`title: "🎉 Features"`,
		`title: "🐛 Bug Fixes"`,
		`title: "⚡ Performance Improvements"`,
		`title: "🔒 Security"`,
		`title: "📚 Documentation"`,
		`title: "♻️ Refactoring"`,
		`title: "📦 Dependencies"`,
		`title: "🧪 Testing"`,
		`title: "Other Changes"`,
	}

	for _, title := range expectedTitles {
		title := title
		t.Run("Should include readable title "+title, func(t *testing.T) {
			t.Parallel()
			if !strings.Contains(text, title) {
				t.Fatalf("expected goreleaser changelog config to include readable group title %q", title)
			}
		})
	}

	unexpectedTitles := []string{
		`title: "\U0001F389"`,
		`title: "\U0001F41B"`,
		`title: "⚡"`,
		`title: "\U0001F510"`,
		`title: "\U0001F4DA"`,
		`title: "\U0001F527"`,
		`title: "\U0001F4E6"`,
		`title: "\U0001F9EA"`,
		`title: "\U0001F504"`,
	}

	for _, title := range unexpectedTitles {
		title := title
		t.Run("Should avoid emoji-only title "+title, func(t *testing.T) {
			t.Parallel()
			if strings.Contains(text, title) {
				t.Fatalf("expected goreleaser changelog config to avoid emoji-only group title %q", title)
			}
		})
	}

	expectedFilters := []string{
		`- "^ci\\(release\\): "`,
		`- "^chore\\(release\\): "`,
	}

	for _, filter := range expectedFilters {
		filter := filter
		t.Run("Should exclude release automation filter "+filter, func(t *testing.T) {
			t.Parallel()
			if !strings.Contains(text, filter) {
				t.Fatalf(
					"expected goreleaser changelog config to exclude release automation commits with filter %q",
					filter,
				)
			}
		})
	}
}

func TestSetupReleaseActionUsesSupportedCosignVersionCommand(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile(filepath.Join(repoRoot(t), ".github", "actions", "setup-release", "action.yml"))
	if err != nil {
		t.Fatalf("read setup-release action: %v", err)
	}

	text := string(content)

	if strings.Contains(text, "cosign version --short") {
		t.Fatal("expected setup-release to avoid the unsupported `cosign version --short` command")
	}

	if !strings.Contains(text, "echo \"Cosign version:\"") {
		t.Fatal("expected setup-release to print a cosign version header before running the standalone version command")
	}

	if !strings.Contains(text, "\n          cosign version\n") {
		t.Fatal(
			"expected setup-release to run `cosign version` as a standalone command so failures are not hidden inside command substitution",
		)
	}
}

func TestGoReleaserBuildsGoBinaryWithoutFrontendBundle(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile(filepath.Join(repoRoot(t), ".goreleaser.yml"))
	if err != nil {
		t.Fatalf("read goreleaser config: %v", err)
	}

	var cfg goReleaserConfig
	if err := yaml.Unmarshal(content, &cfg); err != nil {
		t.Fatalf("unmarshal goreleaser config: %v", err)
	}

	// GoReleaser's own `builds:` block cross-compiles the binary (and surfaces any
	// compile error), so a `before` build hook is redundant and intentionally absent.
	// The invariant that matters: no frontend bundle build sneaks back in.
	for _, hook := range cfg.Before.Hooks {
		if hook == "make frontend-build" {
			t.Fatal("expected GoReleaser to avoid frontend bundle builds")
		}
	}

	workflowContent, err := os.ReadFile(filepath.Join(repoRoot(t), ".github", "workflows", "release.yml"))
	if err != nil {
		t.Fatalf("read release workflow: %v", err)
	}
	workflow := string(workflowContent)

	dryRunBlock := workflowJobBlock(t, workflow, "dry-run", "release")
	if strings.Contains(dryRunBlock, "setup-bun") {
		t.Fatal("expected release dry-run to avoid Bun setup")
	}

	releaseBlock := workflowJobBlock(t, workflow, "release", "")
	if strings.Contains(releaseBlock, "setup-bun") {
		t.Fatal("expected production release to avoid Bun setup")
	}
}

func TestGoReleaserConfigPublishesHomebrewCaskFromKnownArchives(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile(filepath.Join(repoRoot(t), ".goreleaser.yml"))
	if err != nil {
		t.Fatalf("read goreleaser config: %v", err)
	}

	var cfg goReleaserConfig
	if err := yaml.Unmarshal(content, &cfg); err != nil {
		t.Fatalf("unmarshal goreleaser config: %v", err)
	}

	if strings.Contains(string(content), "\nbrews:") {
		t.Fatal("expected goreleaser config to avoid deprecated Homebrew formulas")
	}
	if len(cfg.HomebrewCasks) == 0 {
		t.Fatal("expected goreleaser config to define at least one Homebrew cask")
	}

	archiveByID := make(map[string]goReleaserArchive, len(cfg.Archives))
	archiveIDs := make([]string, 0, len(cfg.Archives))
	for _, archive := range cfg.Archives {
		if strings.TrimSpace(archive.ID) == "" {
			continue
		}
		archiveByID[archive.ID] = archive
		archiveIDs = append(archiveIDs, archive.ID)
	}

	if len(archiveByID) == 0 {
		t.Fatal("expected goreleaser config to define archive IDs")
	}

	for _, cask := range cfg.HomebrewCasks {
		cask := cask
		t.Run(cask.Name, func(t *testing.T) {
			t.Parallel()

			if cask.Directory != "Casks" {
				t.Fatalf(
					"expected Homebrew cask %q to be written under Casks, got %q",
					cask.Name,
					cask.Directory,
				)
			}
			if cask.Repository.Owner != "itseffi" || cask.Repository.Name != "homebrew-productize" {
				t.Fatalf(
					"expected Homebrew cask %q to publish to itseffi/homebrew-productize, got %s/%s",
					cask.Name,
					cask.Repository.Owner,
					cask.Repository.Name,
				)
			}
			if !slices.Contains(cask.Binaries, "productize") {
				t.Fatalf("expected Homebrew cask %q to install productize", cask.Name)
			}

			targetIDs := cask.IDs
			if len(targetIDs) == 0 {
				targetIDs = archiveIDs
			}

			for _, id := range targetIDs {
				archive, ok := archiveByID[id]
				if !ok {
					t.Fatalf("expected Homebrew cask %q to reference a known archive id %q", cask.Name, id)
				}
				if archive.WrapInDirectory {
					t.Fatalf(
						"expected Homebrew cask archive %q to keep the binary at the archive root so brew can install it directly",
						id,
					)
				}
			}
		})
	}
}

func TestHomebrewInstallDocsUseCaskTap(t *testing.T) {
	t.Parallel()

	const installCommand = "brew install --cask itseffi/productize/productize"
	forbiddenCommands := []string{
		"brew install itseffi/productize/productize",
		"productize/tap/productize",
		"homebrew-tap",
		"brew install --cask productize",
	}
	paths := []string{
		"README.md",
		".goreleaser.release-header.md.tmpl",
	}

	for _, path := range paths {
		path := path
		t.Run(path, func(t *testing.T) {
			t.Parallel()

			content := readRepoFile(t, repoRoot(t), path)
			if !strings.Contains(content, installCommand) {
				t.Fatalf("expected %s to document %q", path, installCommand)
			}
			for _, forbiddenCommand := range forbiddenCommands {
				if strings.Contains(content, forbiddenCommand) {
					t.Fatalf("expected %s to avoid retired Homebrew command %q", path, forbiddenCommand)
				}
			}
		})
	}
}

func workflowJobBlock(t *testing.T, workflow string, jobName string, nextJobName string) string {
	t.Helper()

	startNeedle := "\n  " + jobName + ":\n"
	start := strings.Index(workflow, startNeedle)
	if start == -1 {
		t.Fatalf("expected workflow to contain job %q", jobName)
	}
	start += len("\n")
	if nextJobName == "" {
		return workflow[start:]
	}
	endNeedle := "\n  " + nextJobName + ":\n"
	end := strings.Index(workflow[start:], endNeedle)
	if end == -1 {
		t.Fatalf("expected workflow job %q to be followed by %q", jobName, nextJobName)
	}
	return workflow[start : start+end]
}
