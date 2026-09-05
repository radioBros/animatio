#!/usr/bin/env node
// Animatio — delete @keyframes nobody references any more.
//
// Removing a class leaves its keyframes behind: they compile, ship in every
// bundle, and count against the size budget while being unreachable. They also
// keep the class NAME alive in the CSS, which is how removed effects kept
// showing up in check:removed.
//
// An atom does not reference its keyframes through `animation-name` — it writes
// the slot for its channel (`--an-anim-o: an-fade`) and one assembly rule reads
// every slot. Miss that and this tool deletes the entire atom layer.
//
//   node tools/prune-keyframes.mjs [--dry]
import postcss from "postcss";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DRY = process.argv.includes("--dry");
const root = postcss.parse(readFileSync("dist/animatio.css", "utf8"));

const defined = new Set();
const used = new Set();
root.walkAtRules("keyframes", (at) => defined.add(at.params.trim()));
root.walkDecls((d) => {
  if (d.prop === "animation-name" || d.prop === "animation") {
    d.value.split(/[\s,]+/).forEach((v) => used.add(v.trim()));
  }
  // The atoms' indirection: --an-anim-<channel>: <keyframe name>
  if (d.prop.startsWith("--")) {
    d.value.split(/[\s,()]+/).forEach((v) => used.add(v.trim()));
  }
});

const orphans = [...defined].filter((k) => !used.has(k));
console.log(`${orphans.length} orphaned keyframes`);
if (!orphans.length) process.exit(0);
console.log("  " + orphans.join(" "));

const files = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".scss")) files.push(p);
  }
};
walk("src");

// Keyframes are written `@keyframes #{kf("name")} {`, so the source token is
// findable even though the compiled name has the prefix baked in.
const keys = orphans.map((o) => o.replace(/^an-/, ""));
let removed = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  const drop = new Set();
  for (let i = 0; i < lines.length; i++) {
    const key = keys.find((k) => lines[i].includes(`@keyframes #{kf("${k}")}`));
    if (!key) continue;
    let depth = 0, end = i;
    for (let j = i; j < lines.length; j++) {
      depth += (lines[j].match(/\{/g) || []).length;
      depth -= (lines[j].match(/\}/g) || []).length;
      if (depth === 0) { end = j; break; }
    }
    for (let j = i; j <= end; j++) drop.add(j);
    removed++;
    i = end;
  }
  if (!drop.size) continue;
  if (!DRY) writeFileSync(file, lines.filter((_, i) => !drop.has(i)).join("\n"));
  console.log(`  ${file}: -${drop.size} lines`);
}
console.log(`${removed} keyframe blocks ${DRY ? "would be removed" : "removed"}`);
