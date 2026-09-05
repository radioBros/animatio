#!/usr/bin/env node
// Animatio — derive the parity module from the pinned animate.css oracle.
// PLAN.md §6, §15.1
//
// Hand-transcribing 97 keyframes is where subtle percentage and easing errors
// enter, and there is no way to detect them afterwards. So the parity module is
// *generated* from test/fixtures/animate-4.1.1.css, and the same fixture is the
// oracle that `check:catalogue` diffs against.
//
// What this does beyond copying:
//   - drops the -webkit- duplicates (autoprefixer re-adds them at build)
//   - substitutes hardcoded distances/angles/origins for Animatio tokens (§6.1)
//   - records which @property channels each effect touches, so the tree-shake
//     resolver can dependency-track them (§14.2) and check:manifest can verify
//
// Output: src/effects/manifest.json

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "test/fixtures/animate-4.1.1.css");
const OUT = join(ROOT, "src/effects/manifest.json");

// animate.css category -> our module partial. Order matters only for reading.
const FAMILIES = {
  attention: ["bounce", "flash", "pulse", "rubberBand", "shakeX", "shakeY",
    "headShake", "swing", "tada", "wobble", "jello", "heartBeat"],
  back: ["backInDown", "backInLeft", "backInRight", "backInUp",
    "backOutDown", "backOutLeft", "backOutRight", "backOutUp"],
  bounce: ["bounceIn", "bounceInDown", "bounceInLeft", "bounceInRight",
    "bounceInUp", "bounceOut", "bounceOutDown", "bounceOutLeft",
    "bounceOutRight", "bounceOutUp"],
  fade: ["fadeIn", "fadeInDown", "fadeInDownBig", "fadeInLeft", "fadeInLeftBig",
    "fadeInRight", "fadeInRightBig", "fadeInUp", "fadeInUpBig",
    "fadeInTopLeft", "fadeInTopRight", "fadeInBottomLeft", "fadeInBottomRight",
    "fadeOut", "fadeOutDown", "fadeOutDownBig", "fadeOutLeft", "fadeOutLeftBig",
    "fadeOutRight", "fadeOutRightBig", "fadeOutUp", "fadeOutUpBig",
    "fadeOutTopLeft", "fadeOutTopRight", "fadeOutBottomLeft",
    "fadeOutBottomRight"],
  flip: ["flip", "flipInX", "flipInY", "flipOutX", "flipOutY"],
  lightspeed: ["lightSpeedInRight", "lightSpeedInLeft", "lightSpeedOutRight",
    "lightSpeedOutLeft"],
  rotate: ["rotateIn", "rotateInDownLeft", "rotateInDownRight", "rotateInUpLeft",
    "rotateInUpRight", "rotateOut", "rotateOutDownLeft", "rotateOutDownRight",
    "rotateOutUpLeft", "rotateOutUpRight"],
  specials: ["hinge", "jackInTheBox", "rollIn", "rollOut"],
  zoom: ["zoomIn", "zoomInDown", "zoomInLeft", "zoomInRight", "zoomInUp",
    "zoomOut", "zoomOutDown", "zoomOutLeft", "zoomOutRight", "zoomOutUp"],
  slide: ["slideInDown", "slideInLeft", "slideInRight", "slideInUp",
    "slideOutDown", "slideOutLeft", "slideOutRight", "slideOutUp"],
};

const familyOf = (name) => {
  for (const [fam, list] of Object.entries(FAMILIES)) {
    if (list.includes(name)) return fam;
  }
  return null;
};

const categoryOf = (name, fam) => {
  if (fam === "attention") return "attention";
  if (fam === "specials") return name === "hinge" || name.endsWith("Out")
    ? "exit" : "entrance";
  return /Out/.test(name) ? "exit" : "entrance";
};

// ---------------------------------------------------------------- tokenising
// §6.1 — hardcoded geometry becomes a token, with the ORIGINAL value as the
// var() fallback. That keeps the visual result byte-identical to animate.css
// while making every one of them tunable per element.

/** `-2000px` -> calc(var(--an-distance-big, 2000px) * -1) */
function tokenLength(raw, token) {
  const neg = raw.startsWith("-");
  const abs = neg ? raw.slice(1) : raw;
  const v = `var(--an-${token}, ${abs})`;
  return neg ? `calc(${v} * -1)` : v;
}

function tokeniseTransform(value, family) {
  let out = value;

  // Big distances: 2000px / 3000px and their negatives.
  out = out.replace(/(-?)(2000px|3000px)/g, (_, sign, n) =>
    tokenLength(sign + n, "distance-big"));

  // Percentage travel — the normal slide/fade distance.
  out = out.replace(
    /(translate3d\(|translateX\(|translateY\(|,\s*)(-?100%)/g,
    (m, lead, n) => lead + tokenLength(n, "distance")
  );

  // The rotate family's defining angle.
  if (family === "rotate" || family === "specials") {
    out = out.replace(/rotate3d\(([^)]*?),\s*(-?[\d.]+deg)\)/g, (m, axes, ang) => {
      const neg = ang.startsWith("-");
      const abs = neg ? ang.slice(1) : ang;
      const v = `var(--an-angle, ${abs})`;
      return `rotate3d(${axes}, ${neg ? `calc(${v} * -1)` : v})`;
    });
  }

  // Flip's perspective becomes tunable.
  out = out.replace(/perspective\((\d+px)\)/g, "perspective(var(--an-perspective, $1))");

  return out;
}

// ----------------------------------------------------------------- channels
function channelsOf(frames) {
  const found = new Set();
  for (const decls of Object.values(frames)) {
    for (const [prop, value] of Object.entries(decls)) {
      if (prop === "opacity") found.add("o");
      if (prop !== "transform") continue;
      if (/translate3d\(|translateX\(/.test(value)) { found.add("x"); found.add("y"); }
      if (/translateY\(/.test(value)) found.add("y");
      if (/rotate3d\([^)]*1\s*,\s*0\s*,\s*0/.test(value)) found.add("rx");
      if (/rotate3d\([^)]*0\s*,\s*1\s*,\s*0/.test(value)) found.add("ry");
      if (/rotate3d\([^)]*0\s*,\s*0\s*,\s*1/.test(value) || /\brotate\(/.test(value))
        found.add("rz");
      if (/scale3d\(|\bscale\(|scaleX\(|scaleY\(/.test(value)) { found.add("sx"); found.add("sy"); }
      if (/skewX\(/.test(value)) found.add("kx");
      if (/skewY\(/.test(value)) found.add("ky");
      if (/perspective\(/.test(value)) found.add("persp");
    }
  }
  return [...found].sort();
}

function tokensOf(frames, family) {
  const t = new Set(["duration", "delay", "ease", "iterations", "direction",
    "fill", "play", "origin"]);
  const all = JSON.stringify(frames);
  if (all.includes("--an-distance-big")) t.add("distance-big");
  if (all.includes("--an-distance,")) t.add("distance");
  if (all.includes("--an-angle")) t.add("angle");
  if (all.includes("--an-perspective")) t.add("perspective");
  return [...t];
}

// --------------------------------------------------------------------- main
const css = readFileSync(SRC, "utf8");
const root = postcss.parse(css);

/** name -> { "0%": { prop: value } } */
const keyframes = {};
/** name -> { prop: value }  (declarations that sit on the class, not the frames) */
const classRules = {};

root.walkAtRules("keyframes", (at) => {
  if (at.name !== "keyframes") return;
  const frames = {};
  at.each((rule) => {
    if (rule.type !== "rule") return;
    const decls = {};
    rule.walkDecls((d) => {
      if (d.prop.startsWith("-webkit-")) return; // autoprefixer re-adds these
      decls[d.prop] = d.value;
    });
    // Normalise "from"/"to" to percentages so frame order is sortable.
    const stop = rule.selector
      .split(",")
      .map((s) => s.trim().replace(/^from$/, "0%").replace(/^to$/, "100%"))
      .join(", ");
    frames[stop] = { ...(frames[stop] || {}), ...decls };
  });
  keyframes[at.params] = frames;
});

root.walkRules((rule) => {
  const m = rule.selector.match(/^\.animate__animated\.animate__(\w+)$|^\.animate__(\w+)$/);
  if (!m) return;
  const name = m[1] || m[2];
  const decls = {};
  rule.walkDecls((d) => {
    if (d.prop.startsWith("-webkit-")) return;
    if (d.prop === "animation-name") return; // we regenerate this
    decls[d.prop] = d.value;
  });
  if (Object.keys(decls).length) {
    classRules[name] = { ...(classRules[name] || {}), ...decls };
  }
});

const manifest = {};
let count = 0;

for (const [family, names] of Object.entries(FAMILIES)) {
  for (const name of names) {
    const src = keyframes[name];
    if (!src) {
      console.error(`  MISSING keyframes for ${name}`);
      continue;
    }

    const raw = {};
    for (const [stop, decls] of Object.entries(src)) {
      const out = {};
      for (const [prop, raw0] of Object.entries(decls)) {
        const value = raw0.replace(/\s+/g, " ").trim();
        out[prop] = prop === "transform" || prop === "transform-origin"
          ? tokeniseTransform(value, family)
          : value;
      }
      raw[stop] = out;
    }

    const rule = { ...(classRules[name] || {}) };
    if (rule["transform-origin"]) {
      rule["transform-origin"] = `var(--an-origin, ${rule["transform-origin"]})`;
    }
    // animate.css drives a few rules off its own tokens (hinge doubles the
    // duration). Remap them onto ours or they would reference nothing.
    // Remap animate.css's own tokens onto ours, WITH a fallback. Ours are not
    // @property-registered (see _tokens.scss), so a bare var() would invalidate
    // the whole declaration if the token were never set — and these six
    // effects, hinge and heartBeat among them, would lose their duration.
    const FALLBACK = { duration: "1s", delay: "0s", repeat: "1" };
    for (const k of Object.keys(rule)) {
      rule[k] = rule[k].replace(
        /var\(\s*--animate-(duration|delay|repeat)\s*\)/g,
        (_, t) => `var(--an-${t}, ${FALLBACK[t]})`
      );
      rule[k] = rule[k].replace(/--animate-(duration|delay|repeat)/g, "--an-$1");
    }

    manifest[name] = {
      family,
      category: categoryOf(name, family),
      module: `effects/${family}`,
      mode: "fast",
      support: "core",
      parity: `animate.css:${name}`,
      channels: channelsOf(raw),
      tokens: tokensOf(raw, family),
      keyframes: [`an-${name}`],
      animates: true,
      raw,
      ...(Object.keys(rule).length ? { rule } : {}),
    };
    count++;
  }
}

writeFileSync(OUT, JSON.stringify(manifest, null, 2) + "\n");
console.log(`animatio: imported ${count} parity effects -> src/effects/manifest.json`);

const expected = Object.values(FAMILIES).flat().length;
if (count !== expected) {
  console.error(`animatio: EXPECTED ${expected}, GOT ${count}`);
  process.exit(1);
}
