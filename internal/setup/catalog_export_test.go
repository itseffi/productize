package setup

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestWriteSkillsCatalogWritesProjectCatalog(t *testing.T) {
	t.Parallel()

	projectDir := t.TempDir()
	homeDir := t.TempDir()
	path, err := WriteSkillsCatalog(
		ResolverOptions{CWD: projectDir, HomeDir: homeDir},
		false,
		[]Skill{
			{Name: "productize", Description: "Core", Directory: "productize", Origin: AssetOriginBundled},
			{
				Name:        "productize-pricing-strategy",
				Description: "Pricing",
				Directory:   "productize-pricing-strategy",
				Origin:      AssetOriginBundled,
			},
		},
	)
	if err != nil {
		t.Fatalf("WriteSkillsCatalog() error = %v", err)
	}
	if want := filepath.Join(projectDir, ".productize", "catalog", "skills.json"); path != want {
		t.Fatalf("catalog path\nwant: %s\ngot:  %s", want, path)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read catalog: %v", err)
	}
	var entries []SkillsCatalogEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		t.Fatalf("decode catalog: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].Name != "productize" || entries[0].Tier != "core" {
		t.Fatalf("unexpected core entry: %#v", entries[0])
	}
	if entries[1].Name != "productize-pricing-strategy" || entries[1].Tier != "tactical" {
		t.Fatalf("unexpected tactical entry: %#v", entries[1])
	}
}
