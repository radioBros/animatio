// Animatio — one bundler integration, four wrappers. PLAN.md §14.2
//
// The CLI, the PostCSS plugin and every bundler plugin call the SAME engine.
// None is a reimplementation, so they cannot drift — which is the failure mode
// four separate integrations usually have.
//
//   // vite.config.js
//   import animatio from "@radiobros/animatio/vite";
//   export default { plugins: [animatio({ content: ["src/**/*.vue"] })] };
//
//   import "@radiobros/animatio";   // resolves to the tree-shaken subset

import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import {
  loadCatalogue, extract, resolve, emit, report, devGuard,
} from "../index.mjs";

const VIRTUAL = "virtual:animatio.css";
const RESOLVED = "\0" + VIRTUAL;

const DEFAULT_CONTENT = [
  "./src/**/*.{html,vue,svelte,astro,jsx,tsx,js,ts,md}",
  "./index.html",
];

export function createEngine(options = {}) {
  const catalogue = loadCatalogue(options.catalogue);
  const contentGlobs = options.content || DEFAULT_CONTENT;

  const scan = () => {
    let text = "";
    let files = 0;
    for (const pattern of contentGlobs) {
      let matched = [];
      try {
        matched = globSync(pattern);
      } catch {
        matched = [];
      }
      for (const f of matched) {
        if (f.includes("node_modules")) continue;
        try {
          text += readFileSync(f, "utf8") + "\n";
          files++;
        } catch {
          /* directory — skip */
        }
      }
    }
    return { text, files };
  };

  const generate = ({ dev = false } = {}) => {
    const { text, files } = scan();
    if (files === 0) {
      console.warn(
        `[animatio] no content files matched ${JSON.stringify(contentGlobs)} — ` +
          `every class would be dropped. Check \`content\`.`
      );
    }
    const candidates = extract(text, { prefix: catalogue.meta.prefix });
    const { wanted } = resolve(catalogue, candidates, options);
    let css = emit(catalogue, wanted, { layer: options.layer !== false });

    if (options.report) console.log(report(catalogue, wanted, css).text);

    return { css, wanted, dev };
  };

  return { catalogue, generate, VIRTUAL, RESOLVED };
}

/** The shared unplugin-shaped factory. */
export function animatioPlugin(options = {}) {
  const engine = createEngine(options);
  let isDev = false;

  return {
    name: "animatio",

    configResolved(config) {
      isDev = config?.command === "serve" || config?.mode === "development";
    },

    resolveId(id) {
      // Both the scoped package name and the historical bare name resolve
      // here, so an existing import keeps working after the rename.
      if (
        id === VIRTUAL ||
        id === "@radiobros/animatio" ||
        id === "@radiobros/animatio/css" ||
        id === "animatio" ||
        id === "animatio/css"
      ) {
        return RESOLVED;
      }
      return null;
    },

    load(id) {
      if (id !== RESOLVED) return null;
      const { css, wanted } = engine.generate({ dev: isDev });
      if (!isDev) return css;
      // The dev-mode guard Tailwind does not ship: it warns the instant a class
      // is applied at runtime that static extraction could not see, turning the
      // classic works-in-dev-breaks-in-prod purge failure into a console line.
      const guard = devGuard(wanted, engine.catalogue);
      return (
        `const css = ${JSON.stringify(css)};\n` +
        `const el = document.createElement("style");\n` +
        `el.textContent = css; document.head.appendChild(el);\n` +
        guard
      );
    },

    handleHotUpdate(ctx) {
      if (/\.(html|vue|svelte|astro|jsx|tsx|js|ts|md)$/.test(ctx?.file || "")) {
        const mod = ctx.server?.moduleGraph?.getModuleById(RESOLVED);
        if (mod) ctx.server.reloadModule(mod);
      }
    },
  };
}

export default animatioPlugin;
