# Upgrade Guide

Use `productize-upgrade --check` to verify local release metadata and generated distribution prerequisites.

Use `npm run install:smoke` before release when changing setup, host adapters, runtime sidecars, or marketplace generation. The smoke test installs into a temporary directory and verifies installed skills, runtime sidecars, registry lookup, and Codex marketplace metadata.

To refresh installed host skills after pulling a new Productize version:

```sh
productize-upgrade --host codex --force
productize-upgrade --host claude --force
productize-upgrade --host all --force
```

The upgrade command runs the same setup path as `./setup`, regenerating canonical skills, host outputs, registry files, plugin bundles, and runtime sidecars before installation.
