package agents

import "embed"

// FS holds the bundled reusable-agent fixtures installed by `productize setup`.
//
//go:embed README.md
var FS embed.FS
