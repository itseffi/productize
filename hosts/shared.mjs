export const productizeSidecars = [
  "bin/productize-config",
  "bin/productize-routing.mjs",
  "bin/productize-update-check",
  "bin/productize-skill-router",
  "bin/productize-session-log",
  "bin/productize-artifact-log",
  "bin/productize-context-save",
  "bin/productize-context-restore",
  "bin/productize-registry-search",
  "bin/productize-completion-status",
  "bin/productize-workflow",
];

const requiredFields = [
  "name",
  "displayName",
  "hostSubdir",
  "outputRoot",
  "prefixSkills",
  "generateOpenAI",
  "descriptionLimit",
  "frontmatter",
  "generatedSkillPath",
  "skippedSkills",
  "runtimeSidecars",
  "pathRewrites",
  "toolWordingRewrites",
];

export function withHostDefaults(host, adapterSource) {
  return validateHostConfig({
    frontmatter: "yaml",
    skippedSkills: [],
    runtimeSidecars: productizeSidecars,
    pathRewrites: [],
    toolWordingRewrites: [],
    generateOpenAI: false,
    descriptionLimit: null,
    prefixSkills: true,
    ...host,
    adapterSource,
    configSource: "esm",
  });
}

export function validateHostConfig(host) {
  const errors = [];
  for (const field of requiredFields) {
    if (host[field] === undefined) errors.push(`missing ${field}`);
  }
  if (!host.adapterSource) errors.push("missing adapterSource");
  if (host.configSource !== "esm") errors.push("configSource must be esm");
  if (host.frontmatter !== "yaml") errors.push(`unsupported frontmatter ${host.frontmatter}`);
  if (!host.generatedSkillPath?.includes("{skill}")) errors.push("generatedSkillPath must include {skill}");
  if (typeof host.prefixSkills !== "boolean") errors.push("prefixSkills must be boolean");
  if (typeof host.generateOpenAI !== "boolean") errors.push("generateOpenAI must be boolean");
  if (host.descriptionLimit !== null && (!Number.isInteger(host.descriptionLimit) || host.descriptionLimit <= 0)) {
    errors.push("descriptionLimit must be null or a positive integer");
  }
  for (const field of ["skippedSkills", "runtimeSidecars", "pathRewrites", "toolWordingRewrites"]) {
    if (!Array.isArray(host[field])) errors.push(`${field} must be an array`);
  }
  for (const field of ["pathRewrites", "toolWordingRewrites"]) {
    if (!Array.isArray(host[field])) continue;
    host[field].forEach((entry, index) => {
      if (!Array.isArray(entry) || entry.length !== 2 || entry.some((value) => typeof value !== "string")) {
        errors.push(`${field}[${index}] must be a two-string tuple`);
      }
    });
  }
  if (errors.length > 0) throw new Error(`Invalid host adapter ${host.name || "(unknown)"}: ${errors.join("; ")}`);
  return Object.freeze({
    ...host,
    skippedSkills: Object.freeze([...host.skippedSkills]),
    runtimeSidecars: Object.freeze([...host.runtimeSidecars]),
    pathRewrites: Object.freeze(host.pathRewrites.map((entry) => Object.freeze([...entry]))),
    toolWordingRewrites: Object.freeze(host.toolWordingRewrites.map((entry) => Object.freeze([...entry]))),
  });
}

export function validateHostCatalog(hosts) {
  const errors = [];
  const seen = {
    name: new Set(),
    outputRoot: new Set(),
    adapterSource: new Set(),
  };
  for (const host of hosts) {
    for (const field of Object.keys(seen)) {
      if (seen[field].has(host[field])) errors.push(`duplicate host ${field}: ${host[field]}`);
      seen[field].add(host[field]);
    }
  }
  if (errors.length > 0) throw new Error(`Invalid host catalog: ${errors.join("; ")}`);
  return Object.freeze([...hosts]);
}
