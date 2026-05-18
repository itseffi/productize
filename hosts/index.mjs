import claudeHost from "./claude.mjs";
import codexHost from "./codex.mjs";
import cursorHost from "./cursor.mjs";
import factoryHost from "./factory.mjs";
import opencodeHost from "./opencode.mjs";
import { validateHostCatalog } from "./shared.mjs";

export const hosts = validateHostCatalog([claudeHost, codexHost, cursorHost, opencodeHost, factoryHost]);

export function getHost(name) {
  const host = hosts.find((item) => item.name === name);
  if (!host) throw new Error(`Unknown host: ${name}. Valid hosts: ${hosts.map((item) => item.name).join(", ")}, all.`);
  return host;
}

export function externalSkillName(skillName, host) {
  if (skillName === "productize") return "productize";
  if (!host.prefixSkills) return skillName;
  return skillName.startsWith("productize-") ? skillName : `productize-${skillName}`;
}
