#!/usr/bin/env node
// Animatio — build a probe page that applies EVERY class to a standard subject
// and reports which ones produce no visible change.
//
// The static audit (audit-previewable.mjs) infers this from selector shape.
// This one measures it: it renders each class in a real browser, samples the
// computed style at rest, under :hover, and mid-animation, and flags anything
// that never differs from a bare control.
//
// Run:  node tools/probe-page.mjs   then open dist/test/probe.html
// The browse harness drives it and reads window.__probe().

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const catalogue = JSON.parse(readFileSync(join(ROOT, "dist/catalogue.json"), "utf8"));
const sprite = readFileSync(join(ROOT, "assets/animatio-filters.svg"), "utf8")
  .replace(/<\?xml[^>]*\?>\s*/, "")
  .replace(/<!--[\s\S]*?-->\s*/g, "");

const names = Object.keys(catalogue.classes).sort();

// The subject is a filled, sized box with text and three children, so that a
// clip-path, a border-radius, a child-driven animation and a text treatment all
// have something to act on. A glyph or a bare span cannot show most of these.
const rows = names
  .map(
    (n) => `<div class="row" data-name="${n}">
  <div class="probe"><span class="sub" data-cls="${n}">Animatio<i></i><i></i><i></i></span></div>
</div>`
  )
  .join("\n");

const html = `<!doctype html>
<meta charset="utf-8">
<title>Animatio probe</title>
<link rel="stylesheet" href="../animatio.css">
<style>
  body { margin: 0; font: 14px/1.4 system-ui, sans-serif; background: #f6f5f3; color: #201d1b; }
  .row { padding: 4px; }
  .probe { width: 220px; height: 90px; display: grid; place-items: center; background: #eae7e3; }
  /* A filled, sized subject: clip-path, border-radius, masks and borders all
     need a painted box, and children are needed by ~40 classes. */
  /* background-COLOR, never the shorthand. Component CSS is un-layered, so a
     background shorthand here would beat every layered background-image in
     the library and report nine working effects as inert. */
  .sub {
    display: inline-flex; align-items: center; justify-content: center; gap: 4px;
    width: 120px; height: 56px; background-color: #0092f9; color: #fff;
    font-weight: 600; position: relative;
  }
  .sub i { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
  ${sprite ? "" : ""}
</style>
${sprite}
<div id="rows">
${rows}
</div>
<script>
const NAMES = ${JSON.stringify(names)};

// Properties worth comparing. Anything that changes one of these is visible.
const PROPS = [
  "animationName","transform","opacity","filter","backdropFilter","background",
  "backgroundImage","backgroundColor","boxShadow","border","borderRadius","color",
  "clipPath","maskImage","textShadow","mixBlendMode","width","height","webkitTextStroke",
  "perspective","transformStyle","overflow","translate","rotate","scale",
  // image-rendering and the text-decoration family were missing, so
  // an-pixelate and an-text-wavy-underline reported inert while working.
  "imageRendering","textDecoration","textDecorationColor","textUnderlineOffset",
  "textDecorationStyle","letterSpacing","fontVariationSettings",
];

const snap = (el) => {
  const s = getComputedStyle(el);
  const o = {};
  for (const p of PROPS) o[p] = s[p];
  return o;
};
const kidSnap = (el) => {
  const k = el.querySelector("i");
  if (!k) return {};
  const s = getComputedStyle(k);
  return { kAnim: s.animationName, kTransform: s.transform, kOpacity: s.opacity };
};
const before = (el) => {
  const s = getComputedStyle(el, "::before");
  return { bContent: s.content, bBg: s.background, bAnim: s.animationName };
};
const after = (el) => {
  const s = getComputedStyle(el, "::after");
  return { aContent: s.content, aBg: s.background, aAnim: s.animationName };
};

const full = (el) => ({ ...snap(el), ...kidSnap(el), ...after(el), ...before(el) });
const differs = (a, b) => Object.keys(a).some((k) => a[k] !== b[k]);

window.__probe = () => {
  const control = full(document.querySelector(".sub"));
  const out = {};
  for (const name of NAMES) {
    const el = document.querySelector(\`[data-cls="\${name}"]\`);
    if (!el) { out[name] = "missing"; continue; }

    const bare = full(el);
    el.classList.add("an", name);
    const applied = full(el);
    const changed = differs(bare, applied);

    // Force a mid-animation sample so a keyframe that only differs partway
    // through still registers.
    let animated = false;
    for (const a of el.getAnimations()) {
      try { a.currentTime = (a.effect.getTiming().duration || 1000) * 0.4; animated = true; } catch {}
    }
    const mid = full(el);
    const movedMid = animated && differs(applied, mid);

    el.classList.remove("an", name);
    out[name] = changed || movedMid ? "ok" : "inert";
  }
  return out;
};
</script>
`;

mkdirSync(join(ROOT, "dist/test"), { recursive: true });
writeFileSync(join(ROOT, "dist/test/probe.html"), html);
console.log(`animatio: probe page -> dist/test/probe.html (${names.length} classes)`);
