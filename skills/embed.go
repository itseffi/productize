// Package skills embeds the bundled Productize skill catalog so the binary can
// install complete skills without requiring files beside the executable.
package skills

import "embed"

// FS holds every asset under each skill directory: SKILL.md plus references,
// agents, templates, scripts, assets, and nested kernels.
//
// The pattern all:*/* matches every entry one level below the skills root. When
// an entry is a directory, embed includes it recursively. The all: prefix keeps
// dotfiles and _-prefixed files from being silently skipped.
//
//go:embed all:*/*
var FS embed.FS
