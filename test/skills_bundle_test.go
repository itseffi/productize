package test

import (
	"bytes"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/itseffi/productize/internal/core/frontmatter"
	"github.com/itseffi/productize/skills"
)

func TestBundledSkillsExistAndUsePortableReferences(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)
	requiredPaths := []string{
		"skills/fix-reviews/SKILL.md",
		"skills/final-verify/SKILL.md",
		"skills/execute-task/SKILL.md",
		"skills/execute-task/references/tracking-checklist.md",
		"skills/create-prd/SKILL.md",
		"skills/create-prd/references/prd-template.md",
		"skills/create-prd/references/question-protocol.md",
		"skills/create-prd/references/adr-template.md",
		"skills/create-techspec/SKILL.md",
		"skills/create-techspec/references/techspec-template.md",
		"skills/create-techspec/references/adr-template.md",
		"skills/create-tasks/SKILL.md",
		"skills/create-tasks/references/task-template.md",
		"skills/create-tasks/references/task-context-schema.md",
		"skills/review-round/SKILL.md",
		"skills/review-round/references/review-criteria.md",
		"skills/review-round/references/issue-template.md",
	}

	for _, relativePath := range requiredPaths {
		t.Run(relativePath, func(t *testing.T) {
			t.Parallel()

			absPath := filepath.Join(root, relativePath)
			if _, err := os.Stat(absPath); err != nil {
				t.Fatalf("expected %s to exist: %v", relativePath, err)
			}
		})
	}

	checkPortableContent(t, filepath.Join(root, "skills", "fix-reviews", "SKILL.md"))
	checkPortableContent(t, filepath.Join(root, "skills", "execute-task", "SKILL.md"))
	checkPortableContent(t, filepath.Join(root, "skills", "create-prd", "SKILL.md"))
	checkPortableContent(t, filepath.Join(root, "skills", "create-techspec", "SKILL.md"))
	checkPortableContent(t, filepath.Join(root, "skills", "create-tasks", "SKILL.md"))
	checkPortableContent(t, filepath.Join(root, "skills", "review-round", "SKILL.md"))
}

func TestBundledSkillFrontmatterParses(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)
	paths, err := filepath.Glob(filepath.Join(root, "skills", "*", "SKILL.md"))
	if err != nil {
		t.Fatalf("glob bundled skills: %v", err)
	}
	if len(paths) == 0 {
		t.Fatal("expected bundled skills to exist")
	}

	for _, skillPath := range paths {
		skillPath := skillPath
		t.Run(filepath.Base(filepath.Dir(skillPath)), func(t *testing.T) {
			t.Parallel()

			content, err := os.ReadFile(skillPath)
			if err != nil {
				t.Fatalf("read %s: %v", skillPath, err)
			}

			var metadata struct {
				Name         string `yaml:"name"`
				Description  string `yaml:"description"`
				ArgumentHint any    `yaml:"argument-hint,omitempty"`
			}
			if _, err := frontmatter.Parse(string(content), &metadata); err != nil {
				t.Fatalf("parse frontmatter %s: %v", skillPath, err)
			}
			if metadata.Name == "" {
				t.Fatalf("expected %s to define a non-empty name", skillPath)
			}
			if metadata.Description == "" {
				t.Fatalf("expected %s to define a non-empty description", skillPath)
			}
		})
	}
}

func TestIdeaFactoryExtensionExistsAndUsesPortableReferences(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)
	requiredPaths := []string{
		"extensions/idea-forge/extension.toml",
		"extensions/idea-forge/skills/idea-forge/SKILL.md",
		"extensions/idea-forge/skills/idea-forge/references/adr-template.md",
		"extensions/idea-forge/skills/idea-forge/references/council.md",
		"extensions/idea-forge/agents/architect-advisor/AGENT.md",
		"extensions/idea-forge/agents/devils-advocate/AGENT.md",
		"extensions/idea-forge/agents/pragmatic-engineer/AGENT.md",
		"extensions/idea-forge/agents/product-mind/AGENT.md",
		"extensions/idea-forge/agents/security-advocate/AGENT.md",
		"extensions/idea-forge/agents/the-thinker/AGENT.md",
	}

	for _, relativePath := range requiredPaths {
		relativePath := relativePath
		t.Run(fmt.Sprintf("Should contain %s", relativePath), func(t *testing.T) {
			t.Parallel()

			if _, err := os.Stat(filepath.Join(root, relativePath)); err != nil {
				t.Fatalf("expected %s to exist: %v", relativePath, err)
			}
		})
	}

	skillPath := filepath.Join(root, "extensions", "idea-forge", "skills", "idea-forge", "SKILL.md")
	content, err := os.ReadFile(skillPath)
	if err != nil {
		t.Fatalf("read %s: %v", skillPath, err)
	}

	var metadata struct {
		Name        string `yaml:"name"`
		Description string `yaml:"description"`
	}
	if _, err := frontmatter.Parse(string(content), &metadata); err != nil {
		t.Fatalf("parse frontmatter %s: %v", skillPath, err)
	}
	if metadata.Name != "idea-forge" {
		t.Fatalf("expected extension skill name idea-forge, got %q", metadata.Name)
	}
	if metadata.Description == "" {
		t.Fatalf("expected non-empty description in %s", skillPath)
	}

	checkPortableContent(t, skillPath)
}

func TestCreateTasksSkillDocumentsTaskTypeRegistryAndValidation(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)
	skillPath := filepath.Join(root, "skills", "create-tasks", "SKILL.md")
	content, err := os.ReadFile(skillPath)
	if err != nil {
		t.Fatalf("read %s: %v", skillPath, err)
	}

	text := string(content)
	required := []string{
		"Read `.productize/config.toml`.",
		"[tasks].types",
		"`frontend`, `backend`, `docs`, `test`, `infra`, `refactor`, `chore`, `bugfix`",
		"Run `productize tasks validate --name <feature>`.",
		"Do not mark the skill complete until it exits 0.",
	}
	for _, snippet := range required {
		if !strings.Contains(text, snippet) {
			t.Fatalf("expected %s to include %q", skillPath, snippet)
		}
	}
}

func TestTaskDocsOmitLegacyTaskFrontmatterKeys(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)
	legacyKeyPattern := regexp.MustCompile(`(?m)^[ \t]*(domain|scope):`)

	paths := []string{filepath.Join(root, "README.md")}
	err := filepath.WalkDir(filepath.Join(root, "skills"), func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		paths = append(paths, path)
		return nil
	})
	if err != nil {
		t.Fatalf("walk skills directory: %v", err)
	}

	for _, path := range paths {
		path := path
		t.Run(filepath.ToSlash(strings.TrimPrefix(path, root+string(filepath.Separator))), func(t *testing.T) {
			t.Parallel()

			content, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("read %s: %v", path, err)
			}
			if match := legacyKeyPattern.FindString(string(content)); match != "" {
				t.Fatalf("expected %s to omit legacy task frontmatter keys, found %q", path, match)
			}
		})
	}
}

func TestEmbeddedSkillsFSMatchesOnDisk(t *testing.T) {
	t.Parallel()

	t.Run("Should match embedded skills filesystem with the filtered on-disk skills tree", func(t *testing.T) {
		t.Parallel()

		root := repoRoot(t)
		source := filepath.Join(root, "skills")
		sourceTree := snapshotTree(t, source)

		// Filter out non-skill files (embed.go, autoresearch artifacts, etc.)
		wantTree := make(map[string]string, len(sourceTree))
		for p, content := range sourceTree {
			if strings.HasSuffix(p, ".go") {
				continue
			}
			if strings.Contains(p, "autoresearch-") {
				continue
			}
			wantTree[p] = content
		}

		embeddedTree := make(map[string]string)
		err := fs.WalkDir(skills.FS, ".", func(p string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.IsDir() {
				return nil
			}
			data, readErr := fs.ReadFile(skills.FS, p)
			if readErr != nil {
				return readErr
			}
			embeddedTree[p] = string(data)
			return nil
		})
		if err != nil {
			t.Fatalf("walk embedded FS: %v", err)
		}

		if len(embeddedTree) != len(wantTree) {
			t.Fatalf("expected embedded FS to contain %d files, got %d", len(wantTree), len(embeddedTree))
		}
		for p, wantContent := range wantTree {
			gotContent, ok := embeddedTree[p]
			if !ok {
				t.Fatalf("expected embedded FS to contain %s", p)
			}
			if gotContent != wantContent {
				t.Fatalf("expected embedded content for %s to match on-disk source", p)
			}
		}
	})
}

func checkPortableContent(t *testing.T, path string) {
	t.Helper()

	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}

	text := string(content)
	forbiddenSnippets := []string{
		".claude/skills",
		"pnpm run",
		"scripts/read_pr_issues.sh",
	}
	for _, snippet := range forbiddenSnippets {
		if strings.Contains(text, snippet) {
			t.Fatalf("expected %s to omit %q", path, snippet)
		}
	}
}

func TestSharedReferenceFilesAreIdentical(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)

	groups := [][]string{
		{
			"skills/create-prd/references/adr-template.md",
			"skills/create-techspec/references/adr-template.md",
			"extensions/idea-forge/skills/idea-forge/references/adr-template.md",
		},
	}

	for _, paths := range groups {
		reference, err := os.ReadFile(filepath.Join(root, paths[0]))
		if err != nil {
			t.Fatalf("read %s: %v", paths[0], err)
		}

		for _, p := range paths[1:] {
			t.Run("Should keep "+p+" identical to "+paths[0], func(t *testing.T) {
				t.Parallel()

				content, err := os.ReadFile(filepath.Join(root, p))
				if err != nil {
					t.Fatalf("read %s: %v", p, err)
				}
				if !bytes.Equal(content, reference) {
					t.Fatalf("expected %s to be identical to %s", p, paths[0])
				}
			})
		}
	}
}

func snapshotTree(t *testing.T, root string) map[string]string {
	t.Helper()

	snapshot := make(map[string]string)
	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}

		relativePath, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		snapshot[filepath.ToSlash(relativePath)] = string(content)
		return nil
	})
	if err != nil {
		t.Fatalf("snapshot %s: %v", root, err)
	}
	return snapshot
}
