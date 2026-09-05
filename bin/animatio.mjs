#!/usr/bin/env node
// Animatio CLI — tree-shaken builds without a bundler. PLAN.md §14.2
//
// This is the route for Rails, Laravel, Django, WordPress and plain HTML. A
// library that REQUIRES a build step is not a CSS library, so the CLI, the
// bundler plugin and the PostCSS plugin all wrap the same engine — none is a
// reimplementation.
//
//   npx animatio build -c animatio.config.js -o public/animatio.css
//   npx animatio build --content "src/**/*.{vue,html}" -o out.css --watch
//   npx animatio report
//   npx animatio init

import { readFileSync, writeFileSync, mkdirSync, existsSync, watch } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { globSync } from "node:fs";
import {
  loadCatalogue, extract, resolve, emit, report, devGuard,
} from "../engine/index.mjs";

const argv = process.argv.slice(2);
const cmd = argv[0] || "build";

const flag = (name, fallback) => {
  const i = argv.findIndex((a) => a === `--${name}` || a === `-${name[0]}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const DEFAULT_CONTENT = [
  "./**/*.{html,htm,vue,svelte,astro,jsx,tsx,js,ts,md,php,erb,twig,blade.php,liquid,hbs,ejs,pug}",
];

const IGNORE = ["**/node_modules/**", "**/dist/**", "**/.git/**", "**/vendor/**"];

async function loadConfig() {
  const explicit = flag("config") || flag("c");
  const candidates = explicit
    ? [explicit]
    : ["animatio.config.js", "animatio.config.mjs"];
  for (const c of candidates) {
    const p = resolvePath(process.cwd(), c);
    if (existsSync(p)) {
      const mod = await import(pathToFileURL(p).href);
      return mod.default || mod;
    }
  }
  if (explicit) {
    console.error(`animatio: config not found: ${explicit}`);
    process.exit(1);
  }
  return {};
}

function readContent(patterns) {
  const files = new Set();
  for (const pattern of patterns) {
    let matched = [];
    try {
      matched = globSync(pattern, { exclude: (p) => IGNORE.some((i) => p.includes("node_modules")) });
    } catch {
      matched = [];
    }
    for (const f of matched) files.add(f);
  }
  let text = "";
  let count = 0;
  for (const f of files) {
    try {
      text += readFileSync(f, "utf8") + "\n";
      count++;
    } catch {
      /* directory or unreadable — skip */
    }
  }
  return { text, count };
}

async function build() {
  const config = await loadConfig();
  const contentGlobs = flag("content")
    ? [flag("content")]
    : config.content || DEFAULT_CONTENT;
  const outFile = flag("out") || flag("o") || config.output || "animatio.css";

  const catalogue = loadCatalogue(config.catalogue);
  const { text, count } = readContent(contentGlobs);

  if (count === 0) {
    console.warn(
      `animatio: no content files matched ${JSON.stringify(contentGlobs)}.\n` +
        `          Every class would be dropped, so nothing was written.\n` +
        `          Check \`content\` in animatio.config.js.`
    );
    process.exit(1);
  }

  const candidates = extract(text, { prefix: catalogue.meta.prefix });
  const { wanted } = resolve(catalogue, candidates, config);
  let css = emit(catalogue, wanted, {
    layer: config.layer !== false,
  });

  if (config.dev || has("dev")) {
    css += `\n/* dev guard — not emitted in production builds */\n`;
    writeFileSync(
      outFile.replace(/\.css$/, ".dev.js"),
      devGuard(wanted, catalogue)
    );
  }

  mkdirSync(dirname(resolvePath(outFile)), { recursive: true });
  writeFileSync(outFile, css);

  const r = report(catalogue, wanted, css);
  console.log(r.text + `  -> ${outFile}`);

  if (config.report || has("report")) {
    const byModule = {};
    for (const name of wanted) {
      const m = catalogue.classes[name].module.split("/")[0];
      byModule[m] = (byModule[m] || 0) + 1;
    }
    console.log("\n  kept by module:");
    for (const [m, n] of Object.entries(byModule).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${m.padEnd(12)} ${String(n).padStart(4)}`);
    }
    const selfUse = [...wanted].filter((n) => n.endsWith("-reveal-self"));
    if (selfUse.length) {
      console.log(
        "\n  note: an-reveal-self resolves to Tier 3 or Tier 0 only — on " +
          "Chrome 115-144 and Safari 26 it falls back to no animation. " +
          "Prefer the .an-reveal wrapper form."
      );
    }
  }
  return { outFile, contentGlobs };
}

async function main() {
  if (cmd === "init") {
    const target = resolvePath(process.cwd(), "animatio.config.js");
    if (existsSync(target)) {
      console.error("animatio: animatio.config.js already exists");
      process.exit(1);
    }
    writeFileSync(
      target,
      `export default {
  // Files to scan for class names. Static extraction cannot see class names
  // assembled from variables — use whole class names, or safelist them.
  content: ["./src/**/*.{html,vue,jsx,tsx}"],

  output: "./public/animatio.css",

  // Whole modules, always emitted regardless of scanning.
  include: [],          // e.g. ["scroll", "atoms"]
  exclude: [],          // e.g. ["compat"]

  // For genuinely runtime-driven classes (a CMS field, a user setting).
  safelist: [
    // "an-fadeInUp",
    // /^an-glass-/,
  ],

  layer: true,
  report: true,
};
`
    );
    console.log("animatio: wrote animatio.config.js");
    return;
  }

  if (cmd === "report") {
    const catalogue = loadCatalogue();
    const byModule = {};
    let bytes = 0;
    for (const [, e] of Object.entries(catalogue.classes)) {
      const m = e.module.split("/")[0];
      byModule[m] = (byModule[m] || 0) + 1;
      bytes += e.bytes;
    }
    console.log(`animatio ${catalogue.meta.version} — catalogue`);
    for (const [m, n] of Object.entries(byModule).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${m.padEnd(16)} ${String(n).padStart(4)} classes`);
    }
    console.log(`  ${"total".padEnd(16)} ${Object.keys(catalogue.classes).length}`);
    return;
  }

  if (cmd === "build") {
    const { contentGlobs } = await build();
    if (has("watch") || has("w")) {
      console.log("animatio: watching for changes… (ctrl-c to stop)");
      let timer;
      watch(process.cwd(), { recursive: true }, (_e, file) => {
        if (!file || file.includes("node_modules") || file.endsWith(".css")) return;
        clearTimeout(timer);
        timer = setTimeout(() => build().catch(console.error), 120);
      });
    }
    return;
  }

  console.log(`animatio — CSS-only animation + effects library

  animatio build     scan content and write a tree-shaken stylesheet
  animatio report    show what the catalogue contains
  animatio init      write a starter animatio.config.js

Options
  -c, --config <f>   config file (default: animatio.config.js)
  -o, --out <f>      output file
      --content <g>  glob to scan, overriding the config
      --watch        rebuild on change
      --dev          also emit the dev-mode runtime guard
      --report       print the per-module breakdown
`);
}

main().catch((err) => {
  console.error("animatio:", err.message);
  process.exit(1);
});
