import { productizeSidecars, withHostDefaults } from "./shared.mjs";

export const codexHost = withHostDefaults(
  {
    name: "codex",
    displayName: "OpenAI Codex",
    hostSubdir: ".agents",
    outputRoot: ".agents/skills",
    prefixSkills: true,
    generateOpenAI: true,
    descriptionLimit: 1024,
    frontmatter: "yaml",
    generatedSkillPath: ".agents/skills/{skill}",
    skippedSkills: [],
    runtimeSidecars: productizeSidecars,
    pathRewrites: [
      ["~/.claude/skills/productize", "$PRODUCTIZE_ROOT"],
      [".claude/skills/productize", ".agents/skills/productize"],
      [".claude/skills", ".agents/skills"],
    ],
    toolWordingRewrites: [
      ["Claude Code", "Codex"],
      ["Claude", "Codex"],
    ],
  },
  "hosts/codex.mjs",
);

export default codexHost;
