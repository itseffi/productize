package test

import (
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func TestMarkdownLocalLinksResolve(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)
	linkPattern := regexp.MustCompile(`!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)`)
	var broken []string

	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if shouldSkipDocLinkDirectory(root, path) {
				return filepath.SkipDir
			}
			return nil
		}
		if !isMarkdownDoc(path) {
			return nil
		}

		body, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for _, match := range linkPattern.FindAllStringSubmatch(string(body), -1) {
			if len(match) < 2 {
				continue
			}
			target := strings.TrimSpace(match[1])
			if shouldSkipDocLinkTarget(target) {
				continue
			}
			target = strings.TrimPrefix(strings.TrimSuffix(target, ">"), "<")
			linkPath := strings.SplitN(target, "#", 2)[0]
			linkPath = strings.SplitN(linkPath, "?", 2)[0]
			if linkPath == "" {
				continue
			}

			resolved := filepath.Clean(filepath.Join(filepath.Dir(path), filepath.FromSlash(linkPath)))
			if !strings.HasPrefix(resolved, root+string(filepath.Separator)) && resolved != root {
				continue
			}
			if _, err := os.Stat(resolved); err != nil {
				rel, relErr := filepath.Rel(root, path)
				if relErr != nil {
					rel = path
				}
				broken = append(broken, rel+": "+target)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("scan markdown links: %v", err)
	}
	if len(broken) > 0 {
		t.Fatalf("broken local markdown links:\n%s", strings.Join(broken, "\n"))
	}
}

func shouldSkipDocLinkDirectory(root string, path string) bool {
	if path == root {
		return false
	}
	name := filepath.Base(path)
	switch name {
	case ".git", ".agents", ".codex", ".productize", "bin", "dist", "node_modules":
		return true
	default:
		return false
	}
}

func isMarkdownDoc(path string) bool {
	name := filepath.Base(path)
	return strings.EqualFold(filepath.Ext(path), ".md") ||
		name == "README" ||
		name == "AGENT.md" ||
		name == "AGENTS.md"
}

func shouldSkipDocLinkTarget(target string) bool {
	if target == "" ||
		strings.HasPrefix(target, "#") ||
		strings.HasPrefix(target, "http://") ||
		strings.HasPrefix(target, "https://") ||
		strings.HasPrefix(target, "mailto:") ||
		strings.HasPrefix(target, "file:") ||
		strings.Contains(target, "://") ||
		strings.HasPrefix(target, "{") {
		return true
	}
	return false
}
