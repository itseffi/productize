package setup

import (
	"io/fs"
	"testing"
)

func TestListBundledSkillsExposesFullCatalog(t *testing.T) {
	t.Parallel()

	skills, err := ListBundledSkills()
	if err != nil {
		t.Fatalf("list bundled skills: %v", err)
	}

	names := make(map[string]bool, len(skills))
	for _, skill := range skills {
		names[skill.Name] = true
	}

	if len(skills) < 250 {
		t.Fatalf("expected full bundled catalog (>=250 skills), got %d", len(skills))
	}

	for _, required := range []string{
		"productize",
		"create-prd",
		"create-tasks",
		"create-techspec",
		"execute-task",
		"final-verify",
		"fix-reviews",
		"review-round",
		"workflow-memory",
	} {
		if !names[required] {
			t.Fatalf("expected workflow skill %q in bundled catalog", required)
		}
	}

	for _, tactical := range []string{
		"productize-pricing-strategy",
		"productize-market-sizing",
		"productize-north-star-metric",
	} {
		if !names[tactical] {
			t.Fatalf("expected tactical skill %q in bundled catalog", tactical)
		}
	}

	for _, forbidden := range []string{"brainstorming", "golang-pro", "testing-anti-patterns"} {
		if names[forbidden] {
			t.Fatalf("expected internal skill %q to be excluded from bundled catalog", forbidden)
		}
	}
}

func TestBundledWorkflowMemorySkillIncludesReferenceFile(t *testing.T) {
	t.Parallel()

	bundle, err := bundledSkillsRoot()
	if err != nil {
		t.Fatalf("bundled skills root: %v", err)
	}

	if _, err := fs.Stat(bundle, "workflow-memory/SKILL.md"); err != nil {
		t.Fatalf("expected bundled workflow-memory skill, got %v", err)
	}
	if _, err := fs.Stat(bundle, "workflow-memory/references/memory-guidelines.md"); err != nil {
		t.Fatalf("expected bundled workflow-memory reference file, got %v", err)
	}
}

func TestListBundledReusableAgentsAllowsEmptyRoster(t *testing.T) {
	t.Run("Should return empty bundled reusable-agent roster when none exist", func(t *testing.T) {
		t.Parallel()

		reusableAgents, err := ListBundledReusableAgents()
		if err != nil {
			t.Fatalf("list bundled reusable agents: %v", err)
		}
		if len(reusableAgents) != 0 {
			t.Fatalf("expected bundled reusable-agent roster to be empty, got %#v", reusableAgents)
		}
	})
}

func TestBundledReusableAgentsRootRemainsReadableWhenEmpty(t *testing.T) {
	t.Run("Should keep bundled reusable agents root readable when the roster is empty", func(t *testing.T) {
		t.Parallel()

		bundle, err := bundledReusableAgentsRoot()
		if err != nil {
			t.Fatalf("bundled reusable agents root: %v", err)
		}
		if _, err := fs.ReadDir(bundle, "."); err != nil {
			t.Fatalf("ReadDir(.) error = %v", err)
		}
	})
}
