import { productizeSidecars, withHostDefaults } from "./shared.mjs";

export const claudeHost = withHostDefaults(
  {
    name: "claude",
    displayName: "Claude Code",
    hostSubdir: ".claude",
    outputRoot: ".claude/skills",
    prefixSkills: false,
    generateOpenAI: false,
    descriptionLimit: null,
    frontmatter: "yaml",
    generatedSkillPath: ".claude/skills/{skill}",
    skippedSkills: [],
    runtimeSidecars: productizeSidecars,
    pathRewrites: [],
    toolWordingRewrites: [],
  },
  "hosts/claude.mjs",
);

export default claudeHost;
