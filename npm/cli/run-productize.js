#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const supportedTargets = new Set([
  "darwin-arm64",
  "darwin-x64",
  "linux-arm64",
  "linux-x64",
  "win32-x64"
]);

const target = `${process.platform}-${process.arch}`;

if (!supportedTargets.has(target)) {
  console.error(`@productize/cli does not ship a binary for ${target}.`);
  process.exit(1);
}

const packageDir = dirname(fileURLToPath(import.meta.url));
const binaryName =
  process.platform === "win32"
    ? `productize-${target}.exe`
    : `productize-${target}`;
const binaryPath = join(packageDir, "bin", binaryName);

if (!existsSync(binaryPath)) {
  console.error(`Missing Productize binary at ${binaryPath}.`);
  process.exit(1);
}

const result = spawnSync(binaryPath, process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit"
});

if (result.error) {
  console.error(`Failed to start Productize: ${result.error.message}`);
  process.exit(1);
}

if (result.signal) {
  console.error(`Productize exited after signal ${result.signal}.`);
  process.exit(1);
}

process.exit(result.status ?? 1);
