// @animatio/engine — extract, resolve, emit. PLAN.md §14.2
//
// GENERATE, DON'T PRUNE. Tailwind's model, not PurgeCSS's, and for three
// specific reasons:
//
//   1. Keyframes come along automatically. A pruner has to *know* that
//      .an-fadeInUp depends on @keyframes an-fadeInUp; orphan-keyframe removal
//      is where every naive purge setup silently breaks an animation library.
//      Here the dependency is recorded in the catalogue, so it cannot be missed.
//   2. @property registrations are dependency-tracked the same way.
//   3. Accessibility blocks travel WITH their effect. A performance feature
//      that silently drops prefers-reduced-motion would be the worst trade in
//      the project, so it is structurally impossible rather than a code comment.
//
// The one thing static extraction cannot see — and no scanner in any library
// can — is a class name assembled at runtime:
//
//     <div :class="`an-${effect}`">     ✗ invisible
//     <div :class="effect">             ✓ whole names in source
//
// Same constraint Tailwind has, same two answers: whole class names, or
// `safelist`. The dev-mode observer (devGuard) turns the classic
// works-in-dev-breaks-in-prod failure into a console warning at the moment it
// happens.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- catalogue
export function loadCatalogue(path) {
  const file = path || join(HERE, "..", "dist", "catalogue.json");
  if (!existsSync(file)) {
    throw new Error(
      `animatio: catalogue not found at ${file}. Run \`npm run build && npm run build:catalogue\`.`
    );
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

// ---------------------------------------------------------------- extractor
// Deliberately permissive: it is far better to keep a class nobody uses than to
// drop one that is used. False negatives ship broken CSS; false positives cost
// bytes. The fuzz suite in test/ guards the former.
const CANDIDATE = /[A-Za-z0-9_-]+/g;

export function extract(source, { prefix = "an" } = {}) {
  const found = new Set();
  const attrs = new Set();
  const tokens = new Set();

  for (const m of source.match(CANDIDATE) || []) {
    if (m === prefix || m.startsWith(`${prefix}-`)) found.add(m);
    if (m.startsWith(`animate__`)) found.add(m);
  }

  // Attribute-tier props (§5 Tier 2/4) are matched on the ATTRIBUTE, not a class.
  const attrRe = new RegExp(`data-${prefix}-[a-z-]+`, "g");
  for (const m of source.match(attrRe) || []) attrs.add(m);

  // Inline custom properties keep their token alive even with no utility class.
  const tokenRe = new RegExp(`--${prefix}-[a-z0-9-]+`, "g");
  for (const m of source.match(tokenRe) || []) tokens.add(m);

  return { classes: found, attrs, tokens };
}

// ----------------------------------------------------------------- resolver
function matchesSafelist(name, safelist = []) {
  return safelist.some((s) => {
    if (typeof s === "string") return s === name;
    if (s instanceof RegExp) return s.test(name);
    if (s && s.pattern) return new RegExp(s.pattern).test(name);
    return false;
  });
}

export function resolve(catalogue, candidates, opts = {}) {
  const {
    safelist = [],
    blocklist = [],
    include = [],
    exclude = [],
  } = opts;

  const wanted = new Set();
  const reasons = new Map();

  const want = (name, why) => {
    if (blocklist.includes(name)) return;
    if (!catalogue.classes[name]) return;
    wanted.add(name);
    if (!reasons.has(name)) reasons.set(name, why);
  };

  for (const name of candidates.classes || []) want(name, "content");

  for (const name of Object.keys(catalogue.classes)) {
    const entry = catalogue.classes[name];
    const mod = (entry.module || "").split("/")[0];
    if (include.includes(mod) || include.includes(entry.module)) {
      want(name, "include");
    }
    if (matchesSafelist(name, safelist)) want(name, "safelist");
  }

  for (const name of [...wanted]) {
    const entry = catalogue.classes[name];
    const mod = (entry.module || "").split("/")[0];
    if (exclude.includes(mod) || exclude.includes(entry.module)) {
      wanted.delete(name);
    }
  }

  return { wanted, reasons };
}

// -------------------------------------------------------------------- emitter
const LAYER_STATEMENT =
  "@layer animatio.tokens, animatio.base, animatio.effects, animatio.atoms, " +
  "animatio.scroll, animatio.surfaces, animatio.fx, animatio.vt, " +
  "animatio.props, animatio.util;";

export function emit(catalogue, wanted, opts = {}) {
  const { layer = true, banner = true } = opts;
  const parts = [];
  const used = new Set(catalogue.always);

  for (const name of wanted) {
    const entry = catalogue.classes[name];
    if (!entry) continue;
    for (const i of entry.chunks) used.add(i);
    // Keyframes come along with their class — by construction, not by guess.
    for (const kf of entry.keyframes) {
      const i = catalogue.keyframes[kf];
      if (i !== undefined) used.add(i);
    }
  }

  // Accessibility blocks travel with their effect. A reduced-motion rule whose
  // selectors are all dropped is dropped; one that still matches is kept.
  const selectorAlive = (sel) => {
    const m = sel.match(new RegExp(`\\.(${catalogue.meta.prefix}[a-zA-Z0-9_-]*)`, "g"));
    if (!m) return true;
    return m.some((raw) => {
      const n = raw.slice(1);
      return n === catalogue.meta.prefix || wanted.has(n);
    });
  };

  const a11yKept = [];
  for (const block of catalogue.a11y) {
    if (block.selectors.some(selectorAlive)) a11yKept.push(block.chunk);
  }

  if (banner) {
    parts.push(
      `/*! Animatio ${catalogue.meta.version} — tree-shaken build ` +
        `(${wanted.size} classes). MIT. Parity module derived from ` +
        `animate.css 4.1.1, Copyright (c) 2020 Animate.css. */`
    );
  }
  if (layer) parts.push(LAYER_STATEMENT);

  for (const i of [...used].sort((a, b) => a - b)) parts.push(catalogue.chunks[i]);
  for (const i of a11yKept) parts.push(catalogue.chunks[i]);

  return parts.join("\n");
}

// ------------------------------------------------------------------- reporting
export function report(catalogue, wanted, css) {
  const total = Object.keys(catalogue.classes).length;
  const fullBytes = catalogue.chunks.reduce(
    (n, c) => n + Buffer.byteLength(c),
    0
  );
  const outBytes = Buffer.byteLength(css);
  const kb = (n) => (n / 1024).toFixed(1);
  return {
    kept: wanted.size,
    dropped: total - wanted.size,
    total,
    bytes: outBytes,
    fullBytes,
    saved: fullBytes - outBytes,
    text:
      `animatio: kept ${wanted.size}/${total} classes  ` +
      `${kb(outBytes)} KB  (full build ${kb(fullBytes)} KB, ` +
      `saved ${kb(fullBytes - outBytes)} KB)`,
  };
}

// ------------------------------------------------------------------ dev guard
/**
 * The piece Tailwind does not ship. Injected in dev only; warns the moment an
 * `an-*` class is applied at runtime that is not in the generated build, and
 * when a `fast` preset and a `compose` atom land on the same element (§4.3).
 */
export function devGuard(wanted, catalogue) {
  const known = JSON.stringify([...wanted]);
  const modes = JSON.stringify(
    Object.fromEntries(
      Object.entries(catalogue.classes)
        .filter(([, e]) => e.mode)
        .map(([n, e]) => [n, e.mode])
    )
  );
  const prefix = catalogue.meta.prefix;

  return `(() => {
  if (typeof document === "undefined") return;
  const known = new Set(${known});
  const modes = ${modes};
  const seen = new Set();
  const check = (el) => {
    if (!el.classList) return;
    const mine = [...el.classList].filter((c) => c.startsWith("${prefix}-"));
    for (const c of mine) {
      if (!known.has(c) && !seen.has(c)) {
        seen.add(c);
        console.warn(
          "[animatio] \\"" + c + "\\" was applied at runtime but is not in your " +
          "build. Static extraction cannot see class names assembled from " +
          "variables. Add it to \`safelist\` in animatio.config.js, or use whole " +
          "class names in your source."
        );
      }
    }
    const used = mine.map((c) => modes[c]).filter(Boolean);
    if (used.includes("fast") && used.includes("compose")) {
      const key = mine.join(" ");
      if (!seen.has(key)) {
        seen.add(key);
        console.warn(
          "[animatio] a fast preset and a compose atom are on the same element (" +
          key + "). The preset writes transform directly, so the atom will have " +
          "no visible effect. One element, one mode."
        );
      }
    }
  };
  const walk = (n) => { check(n); n.querySelectorAll?.("*").forEach(check); };
  walk(document.documentElement);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "attributes") check(m.target);
      m.addedNodes?.forEach((n) => n.nodeType === 1 && walk(n));
    }
  }).observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, attributeFilter: ["class"],
  });
})();`;
}
