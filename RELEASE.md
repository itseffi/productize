# Release Process

1. Update `VERSION` and `package.json` to the same semver value.
2. Add a matching `## <version>` section to `CHANGELOG.md`.
3. Run `npm run release -- --version <version>` to update version files, regenerate distributions, run tests/evals, smoke-test installation, and write a release manifest.
4. Run `npm run release:check` and `npm run upgrade:check` immediately before tagging or distributing artifacts.
5. Run `npm run release:dry-run` to inspect the release command plan without executing commands or writing a release manifest.

Release artifacts are generated from canonical `SKILL.md.tmpl` and `productize.json` sources. Do not hand-edit generated host outputs.
