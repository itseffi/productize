import { productizeSidecars, withHostDefaults } from "./shared.mjs";

export const cursorHost = withHostDefaults(
  {
    name: "cursor",
    displayName: "Cursor",
    hostSubdir: ".cursor",
    outputRoot: ".cursor/skills",
    prefixSkills: true,
    generateOpenAI: false,
    descriptionLimit: null,
    frontmatter: "yaml",
    generatedSkillPath: ".cursor/skills/{skill}",
    skippedSkills: [],
    runtimeSidecars: productizeSidecars,
    pathRewrites: [
      ["~/.claude/skills/productize", "~/.cursor/skills/productize"],
      [".claude/skills/productize", ".cursor/skills/productize"],
      [".claude/skills", ".cursor/skills"],
    ],
    toolWordingRewrites: [
      ["Claude Code", "Cursor"],
      ["Claude", "Cursor"],
    ],
  },
  "hosts/cursor.mjs",
);

export default cursorHost;
