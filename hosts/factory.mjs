import { productizeSidecars, withHostDefaults } from "./shared.mjs";

export const factoryHost = withHostDefaults(
  {
    name: "factory",
    displayName: "Factory Droid",
    hostSubdir: ".factory",
    outputRoot: ".factory/skills",
    prefixSkills: true,
    generateOpenAI: false,
    descriptionLimit: null,
    frontmatter: "yaml",
    generatedSkillPath: ".factory/skills/{skill}",
    skippedSkills: [],
    runtimeSidecars: productizeSidecars,
    pathRewrites: [
      ["~/.claude/skills/productize", "$PRODUCTIZE_ROOT"],
      [".claude/skills/productize", ".factory/skills/productize"],
      [".claude/skills", ".factory/skills"],
    ],
    toolWordingRewrites: [
      ["Claude Code", "Factory Droid"],
      ["Claude", "Factory Droid"],
    ],
  },
  "hosts/factory.mjs",
);

export default factoryHost;
