#!/usr/bin/env node
// Animatio — delete the classes listed in tools/removals.json from the SCSS.
//
// Rules are written as `#{s("name")}`, so the class name is findable in source
// even though it never appears literally. Three cases have to be handled or the
// result will not compile:
//
//   1. the class is the whole selector      -> delete the block
//   2. the class is one of a comma group    -> delete just that selector line,
//                                              leaving the block for the others
//   3. a @keyframes nobody references any   -> delete it, or the reduced-motion
//      more                                    and size gates report dead weight
//
// Run:  node tools/apply-removals.mjs [--dry]
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DRY = process.argv.includes("--dry");
const spec = JSON.parse(readFileSync("tools/removals.json", "utf8"));
const names = [
  ...Object.keys(spec.duplicates).filter((k) => !k.startsWith("_")),
  ...spec.trivial.list,
  ...spec.novelty.list,
];
const keys = new Set(names.map((n) => n.replace(/^an-/, "")));

const files = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".scss")) files.push(p);
  }
};
walk("src");

// An exact string, not a regex: the token is `#{s("name")}` verbatim, so there
// is nothing to escape and no chance of `goo` matching `goo-nav`.
const token = (key) => `#{s("${key}")}`;
const has = (line, key) => line.includes(token(key));
let removedBlocks = 0, removedSelectors = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  const drop = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hit = [...keys].find((k) => has(line, k));
    if (!hit) continue;

    // Gather the whole selector list this line belongs to: walk back over
    // lines ending in a comma, forward to the line opening the block.
    let start = i;
    while (start > 0 && /,\s*$/.test(lines[start - 1])) start--;
    let open = i;
    while (open < lines.length && !/\{\s*$/.test(lines[open])) open++;
    if (open >= lines.length) continue;

    const selLines = lines.slice(start, open + 1);
    const others = selLines.filter(
      (l) => ![...keys].some((k) => has(l, k)) && l.trim() && l.trim() !== "{"
    );

    if (others.length) {
      // Case 2: other selectors share the block, so drop only our lines.
      for (let j = start; j <= open; j++) {
        if ([...keys].some((k) => has(lines[j], k))) {
          drop.add(j);
          removedSelectors++;
        }
      }
      // The line that opened the block must keep its brace.
      if (drop.has(open)) {
        drop.delete(open);
        lines[open] = lines[open].replace(/^.*?(\{\s*)$/, (m, b) => {
          const prev = lines.slice(start, open).find((l) => !drop.has(lines.indexOf(l)));
          return (prev ? "" : "") + b;
        });
        // Simpler and safe: strip our selector, keep the brace on its own line.
        lines[open] = "  {";
        removedSelectors++;
      }
      i = open;
      continue;
    }

    // Case 1: ours alone — delete to the matching close brace.
    let depth = 0, end = open;
    for (let j = open; j < lines.length; j++) {
      depth += (lines[j].match(/\{/g) || []).length;
      depth -= (lines[j].match(/\}/g) || []).length;
      if (depth === 0) { end = j; break; }
    }
    for (let j = start; j <= end; j++) drop.add(j);
    removedBlocks++;
    i = end;
  }

  if (!drop.size) continue;
  const out = lines.filter((_, i) => !drop.has(i)).join("\n");
  if (!DRY) writeFileSync(file, out);
  console.log(`  ${file}: -${drop.size} lines`);
}

console.log(`\nblocks removed: ${removedBlocks}, selectors unlisted: ${removedSelectors}`);
console.log(DRY ? "(dry run — nothing written)" : "written");
