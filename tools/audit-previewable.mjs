#!/usr/bin/env node
// Animatio — which classes can stand on their own in a preview?
//
// The gallery had been treating all 534 classes as if each were a
// self-contained effect. Many are not, and they fail in distinct ways:
//
//   child      only ever appears as a DESCENDANT of another class
//              (.an-hover-arrow > .an-arrow). Alone it is inert.
//   modifier   only appears COMPOUNDED with another class, or only sets
//              custom properties (an-glass-sm, an-border-double-beam,
//              an-marquee-reverse, an-delay-2s). Alone it changes nothing.
//   parent     styles only its children (an-3d sets perspective for
//              descendants; an-stagger sets --an-i on them).
//   hover      every visual declaration sits behind :hover / :active / :focus.
//              At rest it is deliberately invisible.
//   paint      needs a filled or sized box to be visible: it only sets
//              clip-path, border-radius, mask or a border, so applying it to a
//              glyph or a text node shows nothing.
//   solo       a real standalone effect.
//
// Run: node tools/audit-previewable.mjs [--json]

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PREFIX = "an";
const css = readFileSync(join(ROOT, "dist/animatio.css"), "utf8");
const root = postcss.parse(css);
const catalogue = JSON.parse(readFileSync(join(ROOT, "dist/catalogue.json"), "utf8"));

const CLASS_RE = new RegExp(`\\.(${PREFIX}(?:-[a-zA-Z0-9-]+)?|${PREFIX}--[a-zA-Z0-9-]+)`, "g");

// Properties that produce a visible change on their own.
const VISUAL = /^(animation-name|transform|translate|rotate|scale|opacity|filter|backdrop-filter|background|background-image|background-color|box-shadow|border|border-|color|clip-path|mask|mask-image|text-shadow|-webkit-text-stroke|mix-blend-mode|content|width|height|inset|font-variation-settings|text-decoration)/;

// Properties that only matter once something else paints.
const PAINT_ONLY = /^(clip-path|mask|mask-image|mask-composite|border-radius|border$|border-[a-z]+$|overflow|contain|isolation|perspective|transform-style|will-change|scroll-)/;

const info = new Map();
const touch = (n) =>
  info.get(n) ||
  info.set(n, {
    asSubject: 0, // appears as the element the rule targets
    asDescendant: 0, // appears only under another class
    solo: 0, // appears alone in a compound selector
    compound: 0, // always compounded with another an- class
    visual: 0, // sets a genuinely visible property
    paintOnly: 0, // sets only structural/paint-dependent properties
    customOnly: 0, // sets only custom properties
    interaction: 0, // visual decls behind :hover/:active/:focus
    stylesChildren: 0, // its rules target its descendants
  }).get(n);

const inInteraction = (sel) => /:hover|:active|:focus|:target|:checked/.test(sel);

root.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && rule.parent.name === "keyframes") return;
  let p = rule.parent;
  while (p) {
    if (p.type === "atrule" && /reduced-motion|reduced-transparency|contrast/.test(p.params || "")) return;
    p = p.parent;
  }

  // What does this rule actually set?
  let visual = false;
  let paint = false;
  let custom = 0;
  let total = 0;
  rule.walkDecls((d) => {
    total++;
    if (d.prop.startsWith("--")) { custom++; return; }
    if (VISUAL.test(d.prop) && !PAINT_ONLY.test(d.prop)) visual = true;
    if (PAINT_ONLY.test(d.prop)) paint = true;
  });

  for (const sel of rule.selectors) {
    const trimmed = sel.trim();
    const names = [...trimmed.matchAll(CLASS_RE)].map((m) => m[1]);
    if (!names.length) continue;

    // Split into "the subject" (the rightmost compound) and its ancestors.
    const parts = trimmed.split(/\s*[>+~]\s*|\s+/).filter(Boolean);
    const subjectPart = parts[parts.length - 1];
    const subjectNames = [...subjectPart.matchAll(CLASS_RE)].map((m) => m[1]);
    const ancestorNames = names.filter((n) => !subjectNames.includes(n));

    for (const n of new Set(names)) {
      if (n === PREFIX) continue;
      const e = touch(n);
      if (subjectNames.includes(n)) {
        e.asSubject++;
        if (subjectNames.filter((x) => x !== PREFIX).length > 1) e.compound++;
        else e.solo++;
        if (visual && !inInteraction(trimmed)) e.visual++;
        if (visual && inInteraction(trimmed)) e.interaction++;
        if (!visual && paint) e.paintOnly++;
        if (total && custom === total) e.customOnly++;
      } else if (ancestorNames.includes(n)) {
        e.asDescendant++;
        e.stylesChildren++;
      }
    }
  }
});

const classify = (name) => {
  const e = info.get(name);
  if (!e) return "unknown";
  // Never the subject of a rule -> it only exists as somebody's child.
  if (e.asSubject === 0 && e.stylesChildren === 0) return "child";
  if (e.asSubject === 0) return "parent";
  // Only ever compounded with another class -> a modifier.
  if (e.solo === 0 && e.compound > 0) return "modifier";
  if (e.visual === 0 && e.interaction > 0) return "hover";
  if (e.visual === 0 && e.customOnly > 0) return "modifier";
  if (e.visual === 0 && e.paintOnly > 0) return "paint";
  if (e.visual === 0) return "modifier";
  if (e.stylesChildren > 0 && e.visual === 0) return "parent";
  return "solo";
};

const out = {};
for (const name of Object.keys(catalogue.classes)) out[name] = classify(name);

const byKind = {};
for (const [n, k] of Object.entries(out)) (byKind[k] ||= []).push(n);

if (process.argv.includes("--json")) {
  writeFileSync(join(ROOT, "dist/previewable.json"), JSON.stringify(out, null, 1));
  console.log(`animatio: wrote dist/previewable.json (${Object.keys(out).length} classes)`);
} else {
  console.log("\nanimatio: preview classification\n");
  for (const k of ["solo", "paint", "hover", "modifier", "parent", "child", "unknown"]) {
    const list = byKind[k] || [];
    console.log(`  ${k.padEnd(9)} ${String(list.length).padStart(4)}`);
    if (k !== "solo" && list.length) {
      console.log(`             ${list.slice(0, 14).join(", ")}${list.length > 14 ? " …" : ""}`);
    }
  }
  console.log();
}
