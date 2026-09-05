#!/usr/bin/env node
// Animatio build — SCSS -> PostCSS -> dist. PLAN.md §14.1
//
// Emits:
//   dist/animatio.css            full, layered, `full` mode  (default)
//   dist/animatio.min.css
//   dist/animatio.fast.css       parity presets only, compositor path
//   dist/animatio.compose.css    composable channels only
//   dist/animatio.nolayer.css    for stacks that fight cascade layers
//   dist/animatio.compat.css     + .animate__* aliases
//   dist/modules/<name>.css      per-module, for coarse zero-tooling shaking
//   dist/test/animatio.nosda.css deterministic fallback bundle (§15.4)

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import * as sass from "sass";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import { buildReducedMotionBlock, stats } from "./reduced-motion.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const DIST = join(ROOT, "dist");

const BANNER = `@charset "UTF-8";
/*!
 * Animatio — CSS-only animation + effects library
 * https://github.com/radiobros/animatio
 *
 * Copyright (c) 2026 Animatio contributors
 * Licensed under the MIT license.
 *
 * Preset names are compatible with animate.css; the motion is Animatio's own,
 * authored by tools/author-parity.mjs. See NOTICES.
 */
`;

/**
 * Append the generated prefers-reduced-motion block (§12). Derived from the
 * compiled CSS, so it covers every class that actually animates — including the
 * ~380 fx classes that never carry the .an engine class.
 */
function withReducedMotion(css, prefix = "an") {
  return `${css}\n${buildReducedMotionBlock(css, { prefix })}`;
}

/** Compile one configured variant of the library. */
function compile(config = {}) {
  const entries = Object.entries(config)
    .map(([k, v]) => `  $${k}: ${typeof v === "string" ? `"${v}"` : v}`)
    .join(",\n");
  const source = entries
    ? `@use "index" with (\n${entries}\n);\n`
    : `@use "index";\n`;

  return sass.compileString(source, {
    loadPaths: [join(ROOT, "src")],
    style: "expanded",
  }).css;
}

async function post(css, { minify = false } = {}) {
  const plugins = [autoprefixer()];
  if (minify) {
    plugins.push(
      cssnano({
        preset: [
          "default",
          {
            // Annotations (§2.8) and the attribution banner (§22) must survive
            // minification — they are the only comments consumers ever read.
            discardComments: {
              remove: (comment) =>
                !comment.startsWith("!") && !comment.includes("@support-status"),
            },
            // Never reorder or merge keyframe-adjacent rules; the Tier-2 latch
            // (§8.2) depends on source order.
            cssDeclarationSorter: false,
            mergeRules: false,
          },
        ],
      })
    );
  }
  const result = await postcss(plugins).process(css, { from: undefined });
  return result.css;
}

function write(rel, css) {
  const file = join(DIST, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, css);
  const kb = (Buffer.byteLength(css) / 1024).toFixed(1);
  console.log(`  ${rel.padEnd(36)} ${kb.padStart(7)} KB`);
}

/**
 * The deterministic fallback bundle (§15.4). Rewrites every scroll-driven
 * @supports condition to something guaranteed false, so ANY browser renders the
 * Tier-0 path. This replaces relying on a Chromium flag whose name drifts.
 */
function forceFallback(css) {
  return css.replace(
    /@supports\s*\(?\s*(animation-timeline|animation-trigger|timeline-trigger)[^{]*\{/g,
    "@supports (animation-timeline: --animatio-force-fallback) {"
  );
}

const MODULES = [
  "parity",
  "atoms",
  "scroll",
  "surfaces",
  "fx",
  "util",
  "props",
];

async function main() {
  rmSync(DIST, { recursive: true, force: true });
  console.log("animatio: building\n");

  // ---- main bundles -------------------------------------------------------
  const compiled = withReducedMotion(compile());
  console.log(`  a11y: ${stats(compiled)} animated selectors covered
`);
  const full = BANNER + (await post(compiled));
  write("animatio.css", full);
  write("animatio.min.css", BANNER + (await post(compiled, { minify: true })));

  write("animatio.fast.css", BANNER + (await post(withReducedMotion(compile({ mode: "fast" })))));
  write(
    "animatio.compose.css",
    BANNER + (await post(withReducedMotion(compile({ mode: "compose" }))))
  );
  write(
    "animatio.nolayer.css",
    BANNER + (await post(withReducedMotion(compile({ "use-layers": false }))))
  );
  write(
    "animatio.compat.css",
    BANNER + (await post(withReducedMotion(compile({ "emit-compat": true }))))
  );

  // ---- per-module ---------------------------------------------------------
  for (const mod of MODULES) {
    const off = Object.fromEntries(
      MODULES.filter((m) => m !== mod).map((m) => [`emit-${m}`, false])
    );
    write(`modules/${mod}.css`, BANNER + (await post(withReducedMotion(compile(off)))));
  }

  // ---- test bundles -------------------------------------------------------
  write("test/animatio.nosda.css", forceFallback(full));

  console.log("\nanimatio: build ok");
}

main().catch((err) => {
  console.error("\nanimatio: BUILD FAILED\n");
  console.error(err.message || err);
  process.exit(1);
});
