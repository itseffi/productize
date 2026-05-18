import { productizeSidecars, withHostDefaults } from "./shared.mjs";

export const opencodeHost = withHostDefaults(
  {
    name: "opencode",
    displayName: "OpenCode",
    hostSubdir: ".opencode",
    outputRoot: ".opencode/skills",
    prefixSkills: true,
    generateOpenAI: false,
    descriptionLimit: null,
    frontmatter: "yaml",
    generatedSkillPath: ".opencode/skills/{skill}",
    skippedSkills: [],
    runtimeSidecars: productizeSidecars,
    pathRewrites: [
      ["~/.claude/skills/productize", "~/.config/opencode/skills/productize"],
      [".claude/skills/productize", ".opencode/skills/productize"],
      [".claude/skills", ".opencode/skills"],
    ],
    toolWordingRewrites: [
      ["Claude Code", "OpenCode"],
      ["Claude", "OpenCode"],
    ],
  },
  "hosts/opencode.mjs",
);

export default opencodeHost;
