#!/usr/bin/env node
// Animatio — serve the built docs site the way it will actually be served, and
// tell you the URL to look at.
//
// This exists because two separate false alarms in one session came from the
// SERVING layer rather than the code:
//
//   1. `npx serve -s dist` is SPA mode: it rewrites every unknown URL to
//      index.html. Every docs page therefore booted with the LANDING page's
//      HTML, which hydrated into a mismatch and dropped `has-sidebar` from
//      .VPContent. It looked exactly like a layout bug in the theme.
//   2. After a rebuild, the browser kept the previous CSS. A fix that was
//      already correct read as still broken.
//
// So: always `vitepress preview` (which serves the real per-page HTML), always
// a fresh port, and always a cache-busting query on the URL you open.
//
//   npm run docs:verify

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

if (!existsSync(join(ROOT, "docs/.vitepress/dist/index.html"))) {
  console.error("animatio: no docs build found. Run `npm run docs:build` first.");
  process.exit(1);
}

// A fresh port every run, so nothing can be answered by a stale daemon.
const port = 4200 + Math.floor(Math.random() * 400);
const bust = Date.now();

const child = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["-w", "docs", "run", "preview", "--", "--port", String(port)],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] }
);

let announced = false;
const announce = () => {
  if (announced) return;
  announced = true;
  console.log(`
animatio: docs preview

  home        http://localhost:${port}/?v=${bust}
  catalogue   http://localhost:${port}/gallery?v=${bust}
  scroll lab  http://localhost:${port}/scroll-lab?v=${bust}
  surfaces    http://localhost:${port}/surfaces?v=${bust}

Open the URLs WITH the ?v= query. Without it a stale stylesheet will make an
already-fixed problem look unfixed, which has cost real time before.

ctrl-c to stop.
`);
};

child.stdout.on("data", (b) => {
  const s = b.toString();
  process.stdout.write(s);
  if (/localhost|Local:|preview/i.test(s)) setTimeout(announce, 300);
});
child.stderr.on("data", (b) => process.stderr.write(b));
setTimeout(announce, 6000);

const stop = () => {
  child.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
