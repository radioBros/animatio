// Animatio — PostCSS plugin. PLAN.md §14.2
//
// For pipelines that already run PostCSS. Mark where the output goes with the
// `@animatio;` at-rule and it is replaced by the tree-shaken subset:
//
//   /* app.css */
//   @animatio;
//   .my-thing { … }

import { createEngine } from "./index.mjs";

const plugin = (options = {}) => {
  const engine = createEngine(options);
  return {
    postcssPlugin: "animatio",
    AtRule: {
      animatio(atRule, { postcss }) {
        const { css } = engine.generate();
        atRule.replaceWith(postcss.parse(css));
      },
    },
  };
};
plugin.postcss = true;
export default plugin;
