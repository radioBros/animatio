#!/usr/bin/env node
// Animatio — rebuild dist/ whenever the SCSS changes.
//
// The docs site imports the COMPILED dist/animatio.css, not the source, so an
// edit to src/**.scss is invisible in `docs:dev` until the library is rebuilt.
// Run this alongside it:
//
//   npm run build:watch     # terminal 1
//   npm run docs:dev        # terminal 2
//
// Vite picks up the new dist/animatio.css on its own and hot-reloads it.

import { watch } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "src");

let running = false;
let queued = false;

const build = () => {
  if (running) { queued = true; return; }
  running = true;
  const started = Date.now();
  // The catalogue carries the preview classification the docs read, so a new
  // or renamed class needs it regenerated too, not just the CSS.
  const p = spawn(
    process.execPath,
    ["-e", "await import('./tools/build.mjs'); await import('./tools/build-catalogue.mjs')"],
    { cwd: ROOT, stdio: "inherit" }
  );
  p.on("exit", (code) => {
    running = false;
    const ms = Date.now() - started;
    console.log(
      code === 0
        ? `animatio: rebuilt in ${ms}ms — reload the dev site if it does not refresh`
        : `animatio: build failed (exit ${code}); watching for the fix`
    );
    if (queued) { queued = false; build(); }
  });
};

// Debounced: an editor save often fires several events for one write.
let timer = null;
watch(SRC, { recursive: true }, (_e, file) => {
  if (!file || !/\.scss$/i.test(file)) return;
  clearTimeout(timer);
  timer = setTimeout(build, 120);
});

console.log(`animatio: watching ${SRC} for .scss changes\n`);
build();
