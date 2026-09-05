// Animatio — generate the prefers-reduced-motion block from the COMPILED CSS.
// PLAN.md §12
//
// Why generated rather than hand-written: most of the §10 catalogue —
// an-marquee, an-bg-aurora, an-spinner, an-neon-flicker — animates without ever
// carrying the .an engine class. A hand-maintained selector list would have
// silently missed the majority of the library, which is the exact failure this
// section exists to prevent. Deriving it from `animation-name` in the built CSS
// means a new effect CANNOT ship without an a11y treatment.

import postcss from "postcss";

// Effects whose motion is a seizure risk rather than decoration: killed, not
// shortened. WCAG 2.3.1.
const FLASHING = [
  "glitch", "crt", "vhs", "neon-flicker", "flash", "noise-static",
  "datamosh", "warp", "text-glitch",
];

// Continuous ambient motion in the periphery: paused, not fast-forwarded.
const AMBIENT = [
  "marquee", "ticker", "orbit", "float", "breathe", "wiggle", "jiggle", "sway",
  "pendulum", "bob", "drift", "rotate-slow", "pulse-soft", "blob-morph",
  "blob-drift", "bg-", "aurora", "lava", "metaball", "bubble", "starfield",
  "god-rays", "holo-shift", "conic-spin", "beam-spin", "shine-sweep",
  "ken-burns", "twinkle", "matrix-rain", "goo-loader", "text-wave", "sparkle",
];

// Informational motion: WCAG 2.3.3 only requires removing NON-essential
// animation, so these keep running. A frozen spinner is a worse experience
// than a moving one.
const INFORMATIONAL = [
  "spinner", "dots", "bars", "skeleton", "progress", "pulse-ring",
  "pulse-badge", "shimmer", "morph-loader", "typing-dots",
];

// Scroll-linked: unbind from the timeline entirely and show the end state.
const SCROLL = ["scrub", "parallax", "sticky-stack", "hero-shrink", "reveal"];

const has = (sel, list) => list.some((k) => sel.includes(k));

export function collectAnimatedSelectors(css) {
  const root = postcss.parse(css);
  const found = new Set();

  root.walkDecls("animation-name", (decl) => {
    if (decl.value === "none") return;
    // Skip anything already inside a reduced-motion query.
    let p = decl.parent;
    while (p) {
      if (p.type === "atrule" && /prefers-reduced-motion/.test(p.params || "")) {
        return;
      }
      p = p.parent;
    }
    const rule = decl.parent;
    if (!rule || rule.type !== "rule") return;
    for (const sel of rule.selectors) {
      // Keep pseudo-elements: an-glitch::before is what actually animates.
      if (sel.trim()) found.add(sel.trim());
    }
  });

  return [...found].sort();
}

export function buildReducedMotionBlock(css, { prefix = "an" } = {}) {
  const selectors = collectAnimatedSelectors(css);

  const buckets = { flashing: [], ambient: [], informational: [], scroll: [], generic: [] };
  for (const sel of selectors) {
    if (has(sel, SCROLL)) buckets.scroll.push(sel);
    else if (has(sel, FLASHING)) buckets.flashing.push(sel);
    else if (has(sel, INFORMATIONAL)) buckets.informational.push(sel);
    else if (has(sel, AMBIENT)) buckets.ambient.push(sel);
    else buckets.generic.push(sel);
  }

  const join = (list) => list.join(",\n");
  const parts = [];

  if (buckets.generic.length) {
    parts.push(`${join(buckets.generic)} {
  animation-duration: 1ms !important;
  animation-delay: 0ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 1ms !important;
}`);
  }

  if (buckets.ambient.length) {
    parts.push(`/* Ambient, looping motion: stopped, not fast-forwarded. */
${join(buckets.ambient)} {
  animation-play-state: paused !important;
}`);
  }

  if (buckets.flashing.length) {
    parts.push(`/* WCAG 2.3.1 — flashing content is a seizure risk. Removed outright. */
${join(buckets.flashing)} {
  animation-name: none !important;
}`);
  }

  if (buckets.scroll.length) {
    parts.push(`/* Scroll-linked: unbind from the timeline and show the end state. */
${join(buckets.scroll)} {
  animation-timeline: auto !important;
  animation-name: none !important;
}`);
  }

  if (buckets.informational.length) {
    parts.push(`/* WCAG 2.3.3 exempts ESSENTIAL motion. A frozen spinner reads as a
   hung page, so loaders keep running — slowed, not stopped. */
${join(buckets.informational)} {
  animation-duration: calc(var(--${prefix}-duration, 1s) * 1.6) !important;
}`);
  }

  // The always-on floor, in case a selector slipped every bucket.
  parts.push(`.${prefix},
[class*="${prefix}-"] {
  scroll-behavior: auto !important;
}`);

  return `@layer animatio.util {
@media (prefers-reduced-motion: reduce) {
${parts.join("\n\n")}
}
}
`;
}

export const stats = (css) => collectAnimatedSelectors(css).length;
