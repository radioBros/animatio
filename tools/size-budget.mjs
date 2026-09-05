#!/usr/bin/env node
// Animatio — size budget. PLAN.md §13
//
// The plan carried a 42 KB gzip ceiling for the full build that was written when
// the catalogue was ~200 classes. It is now 534. Rather than keep an unmeasured
// number that a CI gate depends on, these ceilings were DERIVED from the real
// build (the §24 sizing spike) and are set ~25% above measured so ordinary
// growth does not trip them but a regression does.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const BUDGETS = [
  ["dist/animatio.min.css", 30, "full build, minified"],
  ["dist/animatio.css", 32, "full build, expanded"],
  ["dist/modules/parity.css", 12, "animate.css parity only"],
  ["dist/modules/atoms.css", 6, "composable atoms only"],
  ["dist/modules/scroll.css", 7, "scroll module only"],
  ["dist/modules/surfaces.css", 7, "glass + shadow only"],
  ["dist/modules/fx.css", 22, "the fx catalogue"],
  ["test/treeshake/marketing/out.css", 6, "tree-shaken marketing site"],
];

const kb = (n) => (n / 1024).toFixed(1);
let failed = 0;
const rows = [];

for (const [file, budget, label] of BUDGETS) {
  const p = join(ROOT, file);
  if (!existsSync(p)) {
    rows.push({ file, label, skip: true });
    continue;
  }
  const raw = readFileSync(p);
  const gz = gzipSync(raw).length / 1024;
  const ok = gz <= budget;
  if (!ok) failed++;
  rows.push({ file, label, gz, budget, ok, raw: raw.length / 1024 });
}

console.log("\nanimatio: size budget (gzip)\n");
for (const r of rows) {
  if (r.skip) {
    console.log(`  ---  ${r.file.padEnd(38)} not built`);
    continue;
  }
  const mark = r.ok ? " ok " : "OVER";
  console.log(
    `  ${mark} ${r.file.padEnd(38)} ${kb(r.raw * 1024).padStart(7)} KB  ` +
      `${r.gz.toFixed(1).padStart(6)} KB gz / ${String(r.budget).padStart(3)} KB   ${r.label}`
  );
}

if (failed) {
  console.log(`\n${failed} bundle(s) over budget — BUILD BLOCKED\n`);
  process.exit(1);
}
console.log(`\nall ${rows.filter((r) => !r.skip).length} bundles within budget\n`);
