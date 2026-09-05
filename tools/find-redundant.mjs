#!/usr/bin/env node
// Animatio — find classes that are redundant, and say WHY.
//
// Two categories, both decided from the compiled CSS rather than from names:
//
//   duplicate  every rule that mentions the class, with the class name itself
//              normalised out, is identical to another class's -- including
//              descendant and pseudo-element rules and the full text of every
//              keyframe it references. Two classes that pass this test cannot
//              be told apart by any page.
//
//   trivial    the class's whole implementation is at most TWO declarations
//              and it references no keyframes: an author can inline it faster
//              than they can look it up.
//
//   npm run find:redundant
import postcss from "postcss";
import { readFileSync } from "node:fs";

const css = readFileSync("dist/animatio.css", "utf8");
const root = postcss.parse(css);
const catalogue = JSON.parse(readFileSync("dist/catalogue.json", "utf8")).classes;

const CLASS = /\.(an-[A-Za-z0-9-]+)(?![\w-])/g;
const rulesFor = new Map();
const keyframes = new Map();

root.walkAtRules("keyframes", (at) => {
  const decls = [];
  at.walkDecls((d) => decls.push(`${d.prop}:${d.value}`));
  at.walkRules((r) => decls.push(`@${r.selector}`));
  keyframes.set(at.params.trim(), decls.join(";"));
});

root.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && rule.parent.name === "keyframes") return;
  const decls = [];
  rule.walkDecls((d) => decls.push(`${d.prop}:${d.value}`));
  if (!decls.length) return;
  for (const sel of rule.selectors) {
    const names = [...sel.matchAll(CLASS)].map((m) => m[1]);
    if (names.length !== 1) continue; // a shared group rule tells us nothing
    const name = names[0];
    // Normalise the class out, so `.an-a:hover > x` and `.an-b:hover > x` match.
    const shape = sel.replace(new RegExp(`\.${name}(?![\w-])`, "g"), "&");
    const kf = decls
      .filter((d) => d.startsWith("animation-name:"))
      .flatMap((d) => d.split(":")[1].split(",").map((k) => k.trim()))
      .map((k) => `${k}=>${keyframes.get(k) || ""}`);
    if (!rulesFor.has(name)) rulesFor.set(name, []);
    rulesFor.get(name).push(`${shape}{${decls.join(";")}}${kf.join("")}`);
  }
});

const sig = new Map();
for (const [name, arr] of rulesFor) sig.set(name, arr.sort().join("\n"));

const groups = new Map();
for (const [name, s] of sig) {
  if (!groups.has(s)) groups.set(s, []);
  groups.get(s).push(name);
}

const dupes = [...groups.values()].filter((g) => g.length > 1).sort((a, b) => b.length - a.length);
const trivial = [];
for (const [name, arr] of rulesFor) {
  const declCount = arr.join("").split(";").length - arr.length;
  const usesKeyframes = /animation-name:(?!\s*none)/.test(arr.join(""));
  const c = catalogue[name];
  if (!c || c.preview === "utility" || c.preview === "hook") continue;
  if (!usesKeyframes && declCount <= 2 && arr.length === 1) trivial.push(name);
}

console.log(`DUPLICATE GROUPS (${dupes.length}), ${dupes.reduce((n, g) => n + g.length - 1, 0)} removable:\n`);
for (const g of dupes) console.log("  " + g.join("  ==  "));
console.log(`\nTRIVIAL (${trivial.length}) — two declarations or fewer, no keyframes:\n`);
console.log("  " + trivial.join("  "));
