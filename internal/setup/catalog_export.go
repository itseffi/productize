package setup

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

// SkillsCatalogEntry is the machine-readable setup catalog written alongside
// installed skills so workflow/gate skills can discover the bundled catalog.
type SkillsCatalogEntry struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Directory   string      `json:"directory"`
	Tier        string      `json:"tier"`
	Origin      AssetOrigin `json:"origin"`
}

// WriteSkillsCatalog writes a local Productize skill catalog for the selected
// setup scope and returns the path that was written.
func WriteSkillsCatalog(options ResolverOptions, global bool, skills []Skill) (string, error) {
	env, err := resolveEnvironment(options)
	if err != nil {
		return "", err
	}

	root := filepath.Join(env.cwd, ".productize", "catalog")
	if global {
		root = filepath.Join(env.homeDir, ".productize", "catalog")
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return "", fmt.Errorf("create skills catalog directory: %w", err)
	}

	entries := make([]SkillsCatalogEntry, 0, len(skills))
	for i := range skills {
		entries = append(entries, SkillsCatalogEntry{
			Name:        skills[i].Name,
			Description: skills[i].Description,
			Directory:   skills[i].Directory,
			Tier:        skillCatalogTier(skills[i].Name),
			Origin:      skills[i].Origin,
		})
	}
	slices.SortFunc(entries, func(left, right SkillsCatalogEntry) int {
		return strings.Compare(left.Name, right.Name)
	})

	path := filepath.Join(root, "skills.json")
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return "", fmt.Errorf("encode skills catalog: %w", err)
	}
	data = append(data, '\n')
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return "", fmt.Errorf("write skills catalog: %w", err)
	}
	return path, nil
}

func skillCatalogTier(name string) string {
	switch name {
	case "productize",
		"productize-0-1",
		"productize-operate",
		"productize-grow",
		"productize-autoplan",
		"productize-thesis-review",
		"productize-product-review",
		"productize-design-review",
		"productize-eng-review",
		"productize-qa",
		"productize-release",
		"productize-docs",
		"productize-dx-review",
		"productize-comms-review",
		"create-prd",
		"create-techspec",
		"create-tasks",
		"execute-task",
		"review-round",
		"fix-reviews",
		"final-verify",
		"workflow-memory":
		return "core"
	default:
		return "tactical"
	}
}
