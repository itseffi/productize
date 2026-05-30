#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  join,
  relative,
  resolve,
  sep
} from "node:path";
import { fileURLToPath } from "node:url";

const targets = [
  {
    goos: "darwin",
    goarch: "amd64",
    platform: "darwin",
    arch: "x64",
    binary: "productize"
  },
  {
    goos: "darwin",
    goarch: "arm64",
    platform: "darwin",
    arch: "arm64",
    binary: "productize"
  },
  {
    goos: "linux",
    goarch: "amd64",
    platform: "linux",
    arch: "x64",
    binary: "productize"
  },
  {
    goos: "linux",
    goarch: "arm64",
    platform: "linux",
    arch: "arm64",
    binary: "productize"
  },
  {
    goos: "windows",
    goarch: "amd64",
    platform: "win32",
    arch: "x64",
    binary: "productize.exe"
  }
];

const sourceDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(sourceDir, "..", "..");
const options = parseArgs(process.argv.slice(2));
const version = normalizeVersion(
  options.version ?? process.env.GITHUB_REF_NAME ?? ""
);
const distDir = resolve(repoRoot, options.dist ?? "dist");
const outDir = resolve(repoRoot, options.out ?? "dist/npm/@productize/cli");
const binDir = join(outDir, "bin");

if (!existsSync(distDir)) {
  throw new Error(`GoReleaser dist directory does not exist: ${distDir}`);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(binDir, { recursive: true });

copyFileSync(join(sourceDir, "run-productize.js"), join(outDir, "run-productize.js"));
copyIfExists(join(repoRoot, "README.md"), join(outDir, "README.md"));
copyIfExists(join(repoRoot, "LICENSE"), join(outDir, "LICENSE"));

for (const target of targets) {
  copyTargetBinary(target);
}

writePackageManifest();
console.log(`Prepared @productize/cli ${version} at ${relative(repoRoot, outDir)}`);

function copyTargetBinary(target) {
  const source = findBinary(target) ?? extractArchive(target);
  const packageName =
    target.platform === "win32"
      ? `productize-${target.platform}-${target.arch}.exe`
      : `productize-${target.platform}-${target.arch}`;
  const destination = join(binDir, packageName);

  copyFileSync(source, destination);
  chmodSync(destination, 0o755);
  console.log(
    `Bundled ${target.goos}/${target.goarch} from ${relative(repoRoot, source)}`
  );
}

function findBinary(target) {
  const candidates = [];
  walk(distDir, (filePath) => {
    if (isInside(filePath, outDir)) {
      return;
    }
    if (basename(filePath) !== target.binary) {
      return;
    }
    if (pathMatchesTarget(filePath, target)) {
      candidates.push(filePath);
    }
  });

  candidates.sort();
  return candidates[0];
}

function extractArchive(target) {
  const archive = findArchive(target);
  if (!archive) {
    throw new Error(`No GoReleaser binary or archive found for ${target.goos}/${target.goarch}`);
  }

  const tempDir = mkdtempSync(join(tmpdir(), "productize-npm-"));
  if (archive.endsWith(".zip")) {
    run("unzip", ["-qq", archive, "-d", tempDir]);
  } else {
    run("tar", ["-xzf", archive, "-C", tempDir]);
  }

  const extracted = [];
  walk(tempDir, (filePath) => {
    if (basename(filePath) === target.binary) {
      extracted.push(filePath);
    }
  });
  extracted.sort();

  if (!extracted[0]) {
    throw new Error(`Archive ${archive} did not contain ${target.binary}`);
  }

  return extracted[0];
}

function findArchive(target) {
  const archives = [];
  walk(distDir, (filePath) => {
    if (isInside(filePath, outDir)) {
      return;
    }
    if (!filePath.endsWith(".tar.gz") && !filePath.endsWith(".zip")) {
      return;
    }
    if (pathMatchesTarget(filePath, target)) {
      archives.push(filePath);
    }
  });

  archives.sort();
  return archives[0];
}

function writePackageManifest() {
  const manifest = JSON.parse(
    readFileSync(join(sourceDir, "package.json"), "utf8")
  );
  delete manifest.private;
  manifest.version = version;

  writeFileSync(
    join(outDir, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

function copyIfExists(source, destination) {
  if (existsSync(source)) {
    copyFileSync(source, destination);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    throw new Error(`Failed to run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function walk(root, visit) {
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, visit);
      continue;
    }
    if (stat.isFile()) {
      visit(fullPath);
    }
  }
}

function pathMatchesTarget(filePath, target) {
  const normalized = filePath.replaceAll("\\", "/").toLowerCase();
  return (
    targetTokens(target.goos).some((token) => containsToken(normalized, token)) &&
    targetTokens(target.goarch).some((token) => containsToken(normalized, token))
  );
}

function targetTokens(value) {
  switch (value) {
    case "amd64":
      return ["amd64", "x86_64", "x64"];
    case "windows":
      return ["windows", "win32"];
    default:
      return [value];
  }
}

function containsToken(text, token) {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(token)}([^a-z0-9]|$)`).test(text);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isInside(pathToCheck, maybeParent) {
  const relativePath = relative(maybeParent, pathToCheck);
  return relativePath !== "" && !relativePath.startsWith("..") && !relativePath.startsWith(sep);
}

function normalizeVersion(rawVersion) {
  const versionValue = rawVersion.trim().replace(/^refs\/tags\//, "").replace(/^v(?=\d)/, "");
  if (!versionValue) {
    throw new Error("Missing npm package version. Pass --version or run from a tag.");
  }
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(versionValue)) {
    throw new Error(`Invalid npm package version: ${rawVersion}`);
  }
  return versionValue;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}
