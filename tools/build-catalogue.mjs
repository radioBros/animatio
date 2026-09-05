#!/usr/bin/env node
// Animatio — dist/catalogue.json. PLAN.md §3.5, §14.2, §16.2
//
// ONE declaration, four consumers: the docs site, three CI gates, and the
// tree-shake resolver all read this file.
//
// It is built from the hand-authored manifests PLUS an index of the compiled
// CSS. The index is what makes tree-shaking "generate, don't prune": each class
// maps to the exact chunks it needs — its own rules, the @keyframes those rules
// reference, and its accessibility treatment. Nothing has to be inferred or
// deleted later, which is where naive purge setups break animation libraries.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PREFIX = "an";

const readJson = (p) =>
  existsSync(join(ROOT, p)) ? JSON.parse(readFileSync(join(ROOT, p), "utf8")) : {};

const parity = readJson("src/effects/manifest.json");
const atoms = readJson("src/atoms/manifest.json");

const css = readFileSync(join(ROOT, "dist/animatio.css"), "utf8");
const root = postcss.parse(css);

const classRe = new RegExp(`\\.(${PREFIX}(?:-[a-zA-Z0-9-]+)?)`, "g");

/** Deduped CSS chunks; classes reference them by index. */
const chunks = [];
const chunkIndex = new Map();
function addChunk(text) {
  if (chunkIndex.has(text)) return chunkIndex.get(text);
  const i = chunks.length;
  chunks.push(text);
  chunkIndex.set(text, i);
  return i;
}

const classes = new Map(); // name -> { chunks:Set, keyframes:Set, module, layer }
const keyframeChunks = new Map(); // keyframe name -> chunk index
const always = new Set(); // layer statement, :root, @property, .an base
const a11y = []; // { selectors:[...], chunk }

const layerOf = (node) => {
  let p = node.parent;
  while (p) {
    if (p.type === "atrule" && p.name === "layer" && p.params) {
      return p.params.replace(/^animatio\./, "");
    }
    p = p.parent;
  }
  return null;
};

const inReducedMotion = (node) => {
  let p = node.parent;
  while (p) {
    if (p.type === "atrule" && /prefers-reduced-motion/.test(p.params || "")) return true;
    p = p.parent;
  }
  return false;
};

/**
 * Re-serialise a node, wrapped back into its ancestor at-rules.
 * `from` supplies the ancestry when `node` is a detached clone — postcss's
 * clone() drops the parent link, and without this the @media wrapper would be
 * lost and a reduced-motion rule would ship as an UNCONDITIONAL one.
 */
function serialise(node, from = node) {
  const stack = [];
  let p = from.parent;
  while (p && p.type === "atrule") {
    stack.push(p);
    p = p.parent;
  }
  let out = node.toString();
  for (const at of stack) {
    // Cascade layers are re-emitted by the resolver, not carried per chunk.
    if (at.name === "layer") continue;
    out = `@${at.name} ${at.params} {\n${out}\n}`;
  }
  return out;
}

function classesInSelector(sel) {
  const found = new Set();
  let m;
  classRe.lastIndex = 0;
  while ((m = classRe.exec(sel))) found.add(m[1]);
  return [...found];
}

function touch(name) {
  if (!classes.has(name)) {
    classes.set(name, {
      chunks: new Set(),
      keyframes: new Set(),
      module: null,
      layer: null,
      loops: false,
      animatesChildren: false,
      animatesSelf: false,  // its own rule sets animation-name on the element
      soloVisual: 0,        // visible declarations with no other an- class in the compound
      restVisual: 0,        // visible declarations outside :hover/:active/:focus
      interactionVisual: 0, // visible declarations behind an interaction state
      restAnimates: 0,      // animation-name declared outside an interaction state
      interactionAnimates: 0, // animation-name declared behind one
      pressOnly: true,      // every interaction state is :active, never :hover
      selfTimed: false,     // declares its own animation-duration
      transitions: 0,       // declares a transition
    });
  }
  return classes.get(name);
}

// ---- pass 1: keyframes ------------------------------------------------------
root.walkAtRules("keyframes", (at) => {
  keyframeChunks.set(at.params, addChunk(at.toString()));
});

// ---- pass 2: @property + :root are always emitted ---------------------------
root.walkAtRules("property", (at) => always.add(addChunk(at.toString())));
root.walkRules((rule) => {
  if (rule.selector === ":root") always.add(addChunk(serialise(rule)));
});

// ---- pass 3: every other rule ----------------------------------------------
root.walkRules((rule) => {
  if (rule.selector === ":root") return;
  if (rule.parent?.type === "atrule" && rule.parent.name === "keyframes") return;

  const text = serialise(rule);
  const idx = addChunk(text);
  const layer = layerOf(rule);
  const names = classesInSelector(rule.selector);

  if (inReducedMotion(rule)) {
    // Split grouped a11y rules per selector. The generated reduced-motion block
    // lists ~270 selectors in a handful of rules; keeping one whole rule would
    // drag every effect's selector into a shaken build and defeat the point.
    for (const sel of rule.selectors) {
      const single = rule.clone();
      single.selector = sel.trim();
      a11y.push({ selectors: [sel.trim()], chunk: addChunk(serialise(single, rule)) });
    }
    return;
  }

  // The bare engine class and anything with no class at all (pseudo-elements
  // like ::view-transition) is always emitted.
  if (names.length === 0 || (names.length === 1 && names[0] === PREFIX)) {
    always.add(idx);
    return;
  }

  for (const name of names) {
    if (name === PREFIX) continue;
    const entry = touch(name);
    entry.chunks.add(idx);
    entry.layer = entry.layer || layer;
    // A class that iterates forever is continuous, not an entrance. The docs
    // need that distinction to decide what waits for a click, and deriving it
    // from the CSS beats a hand-maintained list that silently goes stale.
    // Split on comma: animation-iteration-count is a LIST when an element runs
    // several animations, and `infinite, infinite` is not the string
    // "infinite". an-ticker and an-text-typewriter both declare lists, and
    // comparing the whole value silently classified them as one-shot
    // entrances, so the docs never applied them at all.
    rule.walkDecls("animation-iteration-count", (d) => {
      // EVERY animation must loop, not merely one of them. an-ticker and
      // an-text-typewriter declare `1, infinite` — a one-shot type-in beside a
      // caret that blinks forever. Treating those as continuous made them
      // always-on, so they never replayed on click.
      const parts = d.value.split(",").map((v) => v.trim());
      if (parts.length && parts.every((v) => v === "infinite")) entry.loops = true;
    });

    // Some effects animate their DESCENDANTS, not themselves: an-marquee moves
    // its children, an-dots bounces them, an-text-wave lifts one span per
    // letter. A preview that puts the class on a leaf node shows nothing at
    // all, which is exactly how marquee and ticker ended up inert. Derive it
    // from the selector shape rather than keeping a list by hand.
    for (const sel of rule.selectors) {
      // Built from a plain string, not a template literal: inside a template
      // literal `\.` and `\s` are consumed as JS escapes and the pattern
      // silently stops matching anything.
      const m = sel.match(
        new RegExp(
          "^\\." + PREFIX + "-([a-zA-Z0-9-]+)[^\\s>]*\\s*(?:>|\\s)\\s*[*.a-z]"
        )
      );
      if (m && `${PREFIX}-${m[1]}` === name) {
        let animates = false;
        rule.walkDecls("animation-name", (d) => {
          if (d.value !== "none") animates = true;
        });
        rule.walkDecls("transition", () => (animates = true));
        if (animates) entry.animatesChildren = true;
      }
    }
    // Counted OUTSIDE the visible check: a rule whose only declaration is a
    // transition paints nothing, and it is precisely the rule that marks the
    // class as interaction-driven.
    rule.walkDecls(/^transition/, () => entry.transitions++);

    // Does this rule paint anything, and under what conditions? previewOf()
    // needs all three to tell a modifier from a hover state from a utility.
    {
      let visible = false;
      rule.walkDecls((d) => {
        if (d.prop.startsWith("--")) return;
        // `transform` must not match transform-origin or transform-style:
        // those position an effect, they do not paint one, and treating them
        // as visible made hover-only classes look standalone.
        const VISIBLE =
          /^(animation-name|transform$|translate$|rotate$|scale$|opacity$|filter$|backdrop-filter$|background|box-shadow|border(?!-collapse|-spacing)|color$|clip-path$|mask|text-shadow|-webkit-text-stroke|mix-blend-mode|content$|font-variation-settings|text-decoration|image-rendering)/;
        if (VISIBLE.test(d.prop)) {
          if (!(d.prop === "animation-name" && d.value === "none")) visible = true;
        }
      });
      if (visible) {
        const interactive = /:hover|:active|:focus|:target|:checked/.test(rule.selector);
        // Whether the class ANIMATES at rest is a different question from
        // whether it paints at rest: an-card-shine parks an idle gradient and
        // only runs it on hover, which made it look like a play-on-click
        // effect and left its tile carrying no class at all.
        let animates = false;
        rule.walkDecls("animation-name", (d) => {
          if (d.value !== "none") animates = true;
        });
        if (interactive) {
          entry.interactionVisual++;
          if (animates) entry.interactionAnimates++;
          if (/:hover|:focus/.test(rule.selector)) entry.pressOnly = false;
        } else {
          entry.restVisual++;
          if (animates) entry.restAnimates++;
        }
        // Whether the class brings its own TIMING is what separates a variant
        // from a whole effect. an-marquee-vertical only swaps the keyframe and
        // inherits an-marquee's duration, so it needs its base applied;
        // an-ticker-block declares its own and does not.
        rule.walkDecls("animation-duration", () => {
          if (!interactive) entry.selfTimed = true;
        });
        // "solo" means this class alone selected the element.
        for (const sel of rule.selectors) {
          const last = sel.trim().split(/\s*[>+~]\s*|\s+/).pop();
          const inCompound = [...last.matchAll(classRe)].map((m) => m[1]);
          if (inCompound.includes(name) && inCompound.filter((c) => c !== PREFIX).length === 1) {
            if (!interactive) entry.soloVisual++;
          }
        }
      }
    }

    // Does the class animate ITSELF? an-marquee moves its children while
    // an-text-marquee moves itself: same visual, opposite placement, and the
    // preview has to know which. Selector shape alone cannot tell them apart.
    for (const sel of rule.selectors) {
      const last = sel.trim().split(/\s*[>+~]\s*|\s+/).pop();
      if ([...last.matchAll(classRe)].some((m) => m[1] === name)) {
        rule.walkDecls("animation-name", (d) => {
          if (d.value !== "none") entry.animatesSelf = true;
        });
      }
    }

    // Keyframe dependency — this is what a pruner has to guess and gets wrong.
    const decls = [];
    rule.walkDecls("animation-name", (d) => decls.push(d.value));
    for (const list of decls) {
      for (const kfName of list.split(",").map((v) => v.trim())) {
        if (kfName && kfName !== "none") entry.keyframes.add(kfName);
      }
    }
  }
});

// ---- previewability ---------------------------------------------------------
// Not every class is a self-contained effect, and the gallery was rendering all
// 534 as if they were. They fail in distinct ways, so they need distinct
// treatment rather than a tile that silently shows nothing:
//
//   solo      stands alone. A normal tile.
//   modifier  only means something with a base class (an-glass-sm needs
//             an-glass). The tile applies BOTH.
//   hover     every visual declaration is behind :hover/:active/:focus, so at
//             rest it is deliberately invisible. The tile puts the class on the
//             stage, which is what the pointer is actually over.
//   children  drives its descendants; the subject must supply them.
//   utility   timing, easing, origins, fill modes. Nothing to look at — these
//             belong in a reference table, not a grid of empty boxes.
//   hook      a child selector target (an-arrow, an-face, an-zone). Inert alone.
//   scroll    needs a scrollbar; the scroll lab demonstrates these.
//   vt        only visible across a real navigation.
const UTILITY_RE = new RegExp(
  "^" + PREFIX + "-(delay-|ease-|repeat-|origin-|fill-|slow|slower|fast|faster|" +
  "infinite|reverse|alternate|paused|running|motion-ok|gpu|contain|armed|seen|" +
  "smooth|snap-|sr-only|overflow-clip|stagger-stop)"
);
const HOOK = new Set(
  ["arrow", "face", "label", "peek", "zone", "track", "compare-top"].map(
    (n) => `${PREFIX}-${n}`
  )
);

// Bases the name-prefix rule cannot find, because the base is not a prefix of
// the name. an-border-double-beam only restyles the ::before that
// an-border-beam creates -- on its own it paints nothing at all.
const BASE_OVERRIDES = {
  "an-border-double-beam": "an-border-beam",
  "an-hover-underline-wipe": "an-text-underline-draw",
};

const previewOf = (name, entry, group) => {
  if (BASE_OVERRIDES[name]) {
    return { preview: "modifier", base: BASE_OVERRIDES[name] };
  }
  if (HOOK.has(name)) return { preview: "hook" };
  if (UTILITY_RE.test(name)) return { preview: "utility" };
  // Anything the scroll module owns needs a scrollbar, whatever else it sets.
  if (/^an-(reveal|scrub|parallax|sticky-stack|hero-shrink|progress-(bar|ring)|timeline-)/.test(name)) {
    return { preview: "scroll" };
  }
  if (group === "scroll") {
    return { preview: name.startsWith(`${PREFIX}-vt-`) || name.includes("morph-shared") ? "vt" : "scroll" };
  }
  // Work out the base FIRST. A child-driving class can also be a modifier —
  // an-marquee-vertical only overrides the keyframe and inherits its duration
  // from an-marquee — and checking `children` first meant those variants were
  // applied without their base and ran with no duration at all.
  let extBase = null;
  for (const other of classes.keys()) {
    if (other !== name && name.startsWith(other + "-") && classes.get(other).restVisual > 0) {
      if (!extBase || other.length > extBase.length) extBase = other;
    }
  }

  // A class can drive its children and still be a hover effect: an-img-zoom
  // scales `> img` on :hover and does nothing at rest. Classified as "children"
  // it became a click-to-play tile, so at rest it carried no class at all and
  // hovering it did nothing.
  if (
    entry.animatesChildren &&
    entry.restAnimates === 0 &&
    entry.interactionVisual > 0 &&
    (entry.transitions > 0 || entry.interactionAnimates > 0)
  ) {
    return { preview: "hover" };
  }

  if (entry.animatesChildren) {
    return extBase && !entry.selfTimed
      ? { preview: "children", base: extBase }
      : { preview: "children" };
  }

  // Name-extension wins over "it paints something". an-glass-dark sets a tint
  // and an-glass-flat clears a backdrop-filter, so both register as visible,
  // but neither means anything without an-glass.
  if (extBase && !entry.animatesSelf && entry.keyframes.size === 0) {
    return { preview: "modifier", base: extBase };
  }
  if (extBase && entry.soloVisual <= classes.get(extBase).soloVisual) {
    return { preview: "modifier", base: extBase };
  }

  // A modifier is a class whose name extends an existing class and which never
  // appears alone as the subject of a visible rule.
  if (entry.soloVisual === 0) {
    if (entry.interactionVisual > 0) return { preview: "hover" };
    return { preview: "utility" };
  }
  if (entry.soloVisual === 0 && entry.interactionVisual > 0) return { preview: "hover" };
  // Visible only on interaction, even though it also has resting rules.
  if (entry.restVisual === 0 && entry.interactionVisual > 0) return { preview: "hover" };
  // Paints at rest but only MOVES on interaction: still a hover preview, so
  // the tile keeps the class on and prompts for the pointer instead of a click
  // that does nothing.
  if (entry.interactionAnimates > 0 && entry.restAnimates === 0) {
    return { preview: "hover" };
  }
  // Same conclusion by the other route. A sheen that sweeps on :hover is a
  // TRANSITION, not an animation, so the check above cannot see it -- which
  // left an-border-shine and sixteen others offering a click that does nothing
  // while the effect itself was one pointer-move away.
  if (
    entry.restAnimates === 0 &&
    entry.interactionVisual > 0 &&
    entry.transitions > 0
  ) {
    return { preview: "hover" };
  }
  return { preview: "solo" };
};

// ---- grouping ---------------------------------------------------------------
// Three top-level groups, because they answer different questions:
//   animation  something that PLAYS — entrances, exits, attention seekers
//   scroll     something driven by the scrollbar
//   effect     something that IS — glass, borders, text treatments, loaders
// Ambient motion belongs with the attention seekers, not with the surface
// treatments. These live in fx/ for implementation reasons -- they are not
// animate.css parity presets -- but to a reader an-float is the same KIND of
// thing as an-pulse: a looping animation you attach to an element, not a
// material like glass or a border.
const AMBIENT_ANIMATIONS = new Set([
  "jiggle", "float", "bob", "bloom", "sway", "pendulum", "breathe", "wobble-slow",
  "heartbeat-soft", "orbit", "spin-slow", "levitate",
]);

// Attention seekers rather than ambient loops: these ask to be noticed once,
// they are not background motion.
// Requested placement. an-fold is not a single-channel atom by construction,
// but it reads as one of the composable plays rather than as a material.
const FORCED_ATOMS = new Set(["fold"]);

const ATTENTION_ANIMATIONS = new Set([
  "shake-error", "wiggle", "shine-sweep", "god-rays", "glow-pulse",
]);


// Effects were rowed by FAMILY, which is just the first segment of the class
// name: 70 rows in near-alphabetical order, so clip-path shapes sat nowhere
// near the other shape tools and the reveals were scattered. These are the
// buckets a reader actually browses by.
const EFFECT_SECTIONS = [
  ["surface", "Surfaces & materials",
    ["glass", "noise", "specular", "holographic", "shimmer", "shine", "tape", "face"]],
  ["shape", "Shapes & clipping",
    ["clip", "corner", "torn", "fold", "blob", "morph", "squircle", "mask"]],
  ["border", "Borders & dividers", ["border", "divider", "outline"]],
  ["reveal", "Reveals & wipes",
    ["reveal", "curtain", "blinds", "shutter", "letterbox", "diagonal", "circle",
     "checkmark", "iris"]],
  ["media", "Images & video",
    ["img", "video", "vhs", "scanlines", "pixelate", "dither", "halftone", "lens",
     "compare", "tape"]],
  ["loader", "Loaders & status",
    ["spinner", "dots", "bars", "skeleton", "progress", "pulse", "toast"]],
  ["depth", "Depth & 3D",
    ["3d", "depth", "flip", "layered", "press", "pop", "card", "zone", "compose"]],
  ["interaction", "Pointer & interaction",
    ["hover", "cursor", "spotlight", "peek", "expand", "label", "arrow", "ripple",
     "liquid"]],
  ["ambientfx", "Atmosphere",
    ["bg", "god", "glow", "aurora", "light", "svg"]],
  ["text", "Text & type", ["text", "ticker", "marquee", "count", "terminal", "neon"]],
  ["glitch", "Glitch & distortion", ["glitch", "datamosh", "chromatic"]],
];

const SECTION_BY_NAME = [
  [/^clip-reveal/, "reveal"],
  [/loader$|^spinner|^skeleton/, "loader"],
  [/^reveal|^iris/, "reveal"],
];

const sectionOf = (family, bare) => {
  for (const [re, key] of SECTION_BY_NAME) if (re.test(bare)) return key;
  for (const [key, , families] of EFFECT_SECTIONS) {
    if (families.includes(family)) return key;
  }
  return "other";
};

const groupOf = (name, man, entry) => {
  const mod = (man?.module || entry.layer || "fx").split("/")[0];
  const bare = name.replace(new RegExp(`^${PREFIX}-`), "");
  if (
    AMBIENT_ANIMATIONS.has(bare) ||
    ATTENTION_ANIMATIONS.has(bare) ||
    FORCED_ATOMS.has(bare)
  ) {
    return "animation";
  }
  if (mod === "effects" || mod === "atoms") return "animation";
  if (mod === "scroll") return "scroll";
  if (mod === "props" || mod === "util") return "utility";
  if (mod === "vt") return "scroll";
  return "effect";
};

// ---- merge in the declared manifests ---------------------------------------
const manifestFor = (name) => {
  const bare = name.replace(new RegExp(`^${PREFIX}-`), "");
  return parity[bare] || atoms[bare] || null;
};

const out = {
  meta: {
    name: "animatio",
    version: JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version,
    prefix: PREFIX,
    generated: new Date().toISOString().slice(0, 10),
    parityCount: Object.keys(parity).length,
    atomCount: Object.keys(atoms).length,
  },
  always: [...always].sort((a, b) => a - b),
  keyframes: Object.fromEntries(keyframeChunks),
  a11y,
  chunks,
  classes: {},
};

for (const [name, entry] of [...classes].sort()) {
  const man = manifestFor(name);
  const kfIdx = [...entry.keyframes]
    .filter((k) => keyframeChunks.has(k))
    .map((k) => keyframeChunks.get(k));
  const bytes =
    [...entry.chunks, ...kfIdx].reduce(
      (n, i) => n + Buffer.byteLength(chunks[i]),
      0
    );

  out.classes[name] = {
    module: man?.module || entry.layer || "fx",
    family: man?.family || name.replace(new RegExp(`^${PREFIX}-`), "").split("-")[0],
    mode: man?.mode || null,
    support: man?.support || "core",
    parity: man?.parity || null,
    tokens: man?.tokens || null,
    channels: man?.channels || null,
    keyframes: [...entry.keyframes],
    loops: entry.loops,
    animatesChildren: entry.animatesChildren,
    animatesSelf: entry.animatesSelf,
    group: groupOf(name, man, entry),
    // Never null for an animation: an unlabelled row renders directly under the
    // previous heading, which is how the ambient loops and the atoms ended up
    // looking like exits.
    category:
      man?.category ||
      (groupOf(name, man, entry) === "effect"
        ? sectionOf(
            man?.family ||
              name.replace(new RegExp(`^${PREFIX}-`), "").split("-")[0],
            name.replace(new RegExp(`^${PREFIX}-`), "")
          )
        : null) ||
      (FORCED_ATOMS.has(name.replace(new RegExp(`^${PREFIX}-`), ""))
        ? "atom"
        : ATTENTION_ANIMATIONS.has(name.replace(new RegExp(`^${PREFIX}-`), ""))
        ? "attention"
        : AMBIENT_ANIMATIONS.has(name.replace(new RegExp(`^${PREFIX}-`), ""))
        ? "ambient"
        : atoms[name.replace(new RegExp(`^${PREFIX}-`), "")]
          ? "atom"
          : null),
    ...previewOf(name, entry, groupOf(name, man, entry)),
    // What the viewer has to do: an-ripple and an-splash only fire on :active,
    // so prompting "hover" on their tile is a lie.
    trigger: entry.interactionVisual > 0 && entry.pressOnly ? "press" : "hover",
    chunks: [...entry.chunks].sort((a, b) => a - b),
    bytes,
  };
}

// A variant that overrides only the keyframe still runs on its base's
// iteration count, so `loops` has to follow the base.
for (const entry of Object.values(out.classes)) {
  if (entry.base && out.classes[entry.base]?.loops) entry.loops = true;
}

writeFileSync(
  join(ROOT, "dist/catalogue.json"),
  JSON.stringify(out, null, 1) + "\n"
);

const kb = (n) => (n / 1024).toFixed(1);
console.log(
  `animatio: catalogue -> ${Object.keys(out.classes).length} classes, ` +
    `${Object.keys(out.keyframes).length} keyframes, ${chunks.length} chunks ` +
    `(${kb(Buffer.byteLength(JSON.stringify(out)))} KB)`
);
