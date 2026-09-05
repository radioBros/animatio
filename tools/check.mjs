#!/usr/bin/env node
// Animatio — the CI gates. PLAN.md §14.1
//
// Every gate exists because the project makes a promise that would otherwise
// decay silently. None of these is advisory: a failure breaks the build.

import { gzipSync } from "node:zlib";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PREFIX = "an";

const css = readFileSync(join(ROOT, "dist/animatio.css"), "utf8");
const root = postcss.parse(css);
const catalogue = JSON.parse(readFileSync(join(ROOT, "dist/catalogue.json"), "utf8"));
const parity = JSON.parse(readFileSync(join(ROOT, "src/effects/manifest.json"), "utf8"));
const oracle = readFileSync(join(ROOT, "test/fixtures/animate-4.1.1.css"), "utf8");

const results = [];
const pass = (name, msg) => results.push({ name, ok: true, msg });
const fail = (name, msg, detail = []) =>
  results.push({ name, ok: false, msg, detail });

const ancestorAtRules = (node) => {
  const out = [];
  let p = node.parent;
  while (p) {
    if (p.type === "atrule") out.push(p);
    p = p.parent;
  }
  return out;
};

// ============================================================ check:shorthand
// RULE §2.1. The `animation` shorthand resets animation-timeline,
// animation-range and animation-trigger to initial — a single one in the base
// class would silently kill the entire scroll module depending on cascade order.
{
  const bad = [];
  root.walkDecls("animation", (d) => bad.push(d.toString().slice(0, 70)));
  root.walkDecls("transition", (d) => {
    // `transition` shorthand is fine — it resets nothing we depend on.
  });
  bad.length
    ? fail("check:shorthand", `${bad.length} uses of the animation shorthand`, bad)
    : pass("check:shorthand", "no animation shorthand anywhere");
}

// =============================================================== check:layers
// RULE §3.3. Every selector must sit in a declared animatio.* layer, and the
// declared order must match the statement exactly.
{
  const EXPECTED = [
    "tokens", "base", "effects", "atoms", "scroll",
    "surfaces", "fx", "vt", "props", "util",
  ];
  let statement = null;
  root.walkAtRules("layer", (at) => {
    if (!at.nodes && !statement) statement = at.params;
  });
  const declared = (statement || "")
    .split(",")
    .map((s) => s.trim().replace(/^animatio\./, ""))
    .filter(Boolean);

  const orderOk = JSON.stringify(declared) === JSON.stringify(EXPECTED);

  const unlayered = [];
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && rule.parent.name === "keyframes") return;
    const inLayer = ancestorAtRules(rule).some(
      (a) => a.name === "layer" && (a.params || "").startsWith("animatio.")
    );
    if (!inLayer) unlayered.push(rule.selector.slice(0, 60));
  });

  if (!orderOk) {
    fail("check:layers", `layer order mismatch: got ${declared.join(", ")}`);
  } else if (unlayered.length) {
    fail("check:layers", `${unlayered.length} selectors outside a layer`, unlayered.slice(0, 5));
  } else {
    pass("check:layers", `all selectors layered, order matches (${declared.length} layers)`);
  }
}

// ============================================================= check:supports
// RULE §2.2. The ONE place the library gates on support, and it is a
// correctness rule: opacity:0 in a base scroll class means permanently
// invisible content in Firefox stable.
{
  const HIDING = (decl) => {
    const p = decl.prop;
    const v = decl.value.trim();
    if (p === "opacity") return parseFloat(v) < 0.05;
    if (p === "visibility") return v === "hidden" || v === "collapse";
    if (p === "content-visibility") return v === "hidden";
    if (p === "clip-path") return /inset\(\s*100%|circle\(\s*0/.test(v);
    if (p === "max-height" || p === "max-width") return v === "0" || v === "0px";
    if (p === "scale") return /(^|\s)0(\s|$)/.test(v);
    // §8.2 Tier 2 hides content with paused + fill-mode both. The gate must
    // recognise the very mechanism it exists to police.
    if (p === "animation-play-state" && v === "paused") {
      const rule = decl.parent;
      let fill = null;
      rule.walkDecls("animation-fill-mode", (d) => (fill = d.value));
      return fill === "both" || fill === "backwards" || fill === null;
    }
    return false;
  };

  // A ::before/::after is a decorative layer, never content — hiding one at
  // rest is the whole point of a hover overlay. And a rule whose selector has
  // an interaction counterpart elsewhere in the sheet has a way back.
  const EXEMPT = /:hover|:active|:focus|:target|\[data-an-|prefers-reduced-motion|::view-transition|::before|::after/;
  const hasCounterpart = (sel) => {
    const base = sel.split(",")[0].trim();
    const head = base.split(/[\s>]/)[0];
    return (
      css.includes(`${head}:hover`) ||
      css.includes(`${head}:active`) ||
      css.includes(`${head}:focus-within`) ||
      css.includes(`${head}:focus-visible`)
    );
  };
  const bad = [];

  root.walkDecls((decl) => {
    if (!HIDING(decl)) return;
    const rule = decl.parent;
    if (rule.type !== "rule") return;
    if (rule.parent?.type === "atrule" && rule.parent.name === "keyframes") return;
    if (EXEMPT.test(rule.selector)) return;
    if (hasCounterpart(rule.selector)) return;
    const ats = ancestorAtRules(decl);
    if (ats.some((a) => a.name === "media" && /reduced-motion/.test(a.params))) return;
    const guarded = ats.some(
      (a) =>
        a.name === "supports" &&
        /animation-timeline|animation-trigger/.test(a.params || "")
    );
    if (!guarded) bad.push(`${rule.selector.slice(0, 50)} { ${decl.prop}: ${decl.value} }`);
  });

  bad.length
    ? fail("check:supports", `${bad.length} hiding declarations outside @supports`, bad.slice(0, 6))
    : pass("check:supports", "no hiding state outside @supports");
}

// ================================================================ check:tiers
// §8.2. @supports (animation-timeline: view()) is TRUE in Chrome 145, which
// also satisfies the trigger query — without a `not`, both tiers apply and fight.
{
  const conds = [];
  root.walkAtRules("supports", (at) => conds.push(at.params));
  const tier3 = conds.filter((c) => /animation-trigger/.test(c) && !/\bnot\b/.test(c));
  const tier2 = conds.filter(
    (c) => /animation-timeline:\s*view\(\)/.test(c) && /not\s*\(animation-trigger/.test(c)
  );
  const unguarded = conds.filter(
    (c) =>
      /animation-timeline:\s*view\(\)/.test(c) &&
      !/not\s*\(animation-trigger/.test(c) &&
      !/scroll\(/.test(c)
  );

  if (!tier3.length) fail("check:tiers", "no Tier 3 (animation-trigger) block found");
  else if (!tier2.length) fail("check:tiers", "no negated Tier 2 block found");
  else if (unguarded.length > 1)
    fail(
      "check:tiers",
      `${unguarded.length} view() blocks without a Tier-3 negation — two tiers can be true at once`,
      unguarded
    );
  else pass("check:tiers", "reveal tiers are mutually exclusive");
}

// ========================================================== check:annotations
// RULE §2.8. Ship the bleeding edge, but say so — in a machine-readable comment
// that survives minification and feeds the docs' support badges.
{
  const BLEEDING = [
    "animation-trigger", "timeline-trigger", "trigger-scope",
    "attr(", "view-transition-name", "@view-transition",
  ];
  const annotated = (css.match(/@support-status/g) || []).length;
  const missing = [];

  root.walkAtRules("supports", (at) => {
    if (!/animation-trigger|attr\(x type/.test(at.params)) return;
    const prev = at.prev();
    const hasNote =
      prev?.type === "comment" && /@support-status/.test(prev.text || "");
    if (!hasNote) missing.push(at.params.slice(0, 60));
  });

  if (annotated === 0) fail("check:annotations", "no @support-status annotations survived the build");
  else if (missing.length)
    fail("check:annotations", `${missing.length} bleeding-edge blocks unannotated`, missing);
  else pass("check:annotations", `${annotated} @support-status annotations present`);
}

// ======================================================= check:var-fallbacks
// §9.2. A bare var() with the token unset invalidates the WHOLE declaration —
// a box-shadow loses all four layers, not one.
{
  const registered = new Set();
  root.walkAtRules("property", (at) => registered.add(at.params));

  const bad = [];
  root.walkDecls((decl) => {
    if (decl.prop.startsWith("--")) return;
    const re = /var\(\s*(--[a-zA-Z0-9-]+)\s*\)/g;
    let m;
    while ((m = re.exec(decl.value))) {
      if (!registered.has(m[1])) {
        bad.push(`${decl.parent.selector?.slice(0, 40)} { ${decl.prop}: … var(${m[1]}) }`);
      }
    }
  });

  bad.length
    ? fail("check:var-fallbacks", `${bad.length} unregistered var() without a fallback`, bad.slice(0, 6))
    : pass("check:var-fallbacks", "every unregistered var() has a fallback");
}

// ======================================================= check:reduced-motion
// §12. A new effect cannot ship without an a11y treatment.
{
  const animating = new Set();
  root.walkDecls("animation-name", (decl) => {
    if (decl.value === "none") return;
    const ats = ancestorAtRules(decl);
    if (ats.some((a) => /reduced-motion/.test(a.params || ""))) return;
    for (const sel of decl.parent.selectors || []) animating.add(sel.trim());
  });

  const covered = new Set();
  root.walkAtRules("media", (at) => {
    if (!/reduced-motion/.test(at.params)) return;
    at.walkRules((r) => r.selectors.forEach((s) => covered.add(s.trim())));
  });

  const missing = [...animating].filter((s) => !covered.has(s));

  missing.length
    ? fail(
        "check:reduced-motion",
        `${missing.length} animating selectors with no reduced-motion treatment`,
        missing.slice(0, 6)
      )
    : pass("check:reduced-motion", `${animating.size} animating selectors all covered`);
}

// =========================================================== check:svg-naming
// §9.5. The an-svg-* promise is only useful if it is exceptionless.
{
  const bad = [];
  root.walkDecls("filter", (decl) => {
    if (!/url\(["']?#/.test(decl.value)) return;
    const sel = decl.parent.selector || "";
    if (!new RegExp(`\\.${PREFIX}-svg-`).test(sel)) {
      bad.push(`${sel.slice(0, 50)} { filter: ${decl.value} }`);
    }
  });

  // Every filter id referenced must exist in the sprite.
  const sprite = existsSync(join(ROOT, "assets/animatio-filters.svg"))
    ? readFileSync(join(ROOT, "assets/animatio-filters.svg"), "utf8")
    : "";
  // Walk declarations rather than raw text: the @support-status annotations
  // legitimately MENTION `backdrop-filter: url(#svg)` in prose, and a text scan
  // would flag the documentation as a broken reference.
  const referenced = new Set();
  root.walkDecls((decl) => {
    for (const m of decl.value.matchAll(/url\(["']?#([a-zA-Z0-9_-]+)["']?\)/g)) {
      referenced.add(m[1]);
    }
  });
  const spriteIds = new Set(
    [...sprite.matchAll(/<filter[^>]*id="([^"]+)"/g)].map((m) => m[1])
  );
  const orphans = [...referenced].filter((id) => !spriteIds.has(id));

  if (bad.length)
    fail("check:svg-naming", `${bad.length} filter: url() outside an-svg-*`, bad.slice(0, 5));
  else if (orphans.length)
    fail("check:svg-naming", `filter ids referenced but not in the sprite`, orphans);
  else
    pass("check:svg-naming", `${referenced.size} filter refs, all an-svg-* and all in the sprite`);
}

// ================================================================ check:modes
// §4.3. The `full` build makes mixing a fast preset with a compose atom
// reachable by default, and it silently breaks composition.
{
  const modes = {};
  for (const [name, e] of Object.entries(catalogue.classes)) {
    if (e.mode) modes[name] = e.mode;
  }
  const fast = Object.values(modes).filter((m) => m === "fast").length;
  const compose = Object.values(modes).filter((m) => m === "compose").length;

  // No shipped rule may target a fast preset AND a compose atom together.
  const bad = [];
  root.walkRules((rule) => {
    for (const sel of rule.selectors || []) {
      const names = [...sel.matchAll(new RegExp(`\\.(${PREFIX}-[a-zA-Z0-9-]+)`, "g"))]
        .map((m) => m[1])
        .filter((n) => modes[n]);
      const kinds = new Set(names.map((n) => modes[n]));
      if (kinds.size > 1) bad.push(sel);
    }
  });

  bad.length
    ? fail("check:modes", "a fast preset and a compose atom share a selector", bad.slice(0, 4))
    : pass("check:modes", `${fast} fast presets / ${compose} compose atoms, never mixed`);
}

// ============================================================ check:catalogue
// §15.1. The oracle is the pinned animate.css fixture, not a number typed by
// hand — that is how we found the real count is 97, not the 93 first assumed.
{
  const oracleClasses = new Set(
    [...oracle.matchAll(/\.animate__([a-zA-Z][a-zA-Z0-9]*)\b/g)].map((m) => m[1])
  );
  const util = ["animated", "infinite", "repeat", "delay", "fast", "faster", "slow", "slower"];
  const expected = [...oracleClasses].filter((c) => !util.some((u) => c.startsWith(u)));
  const missing = expected.filter((name) => !css.includes(`.${PREFIX}-${name}`));
  const kfMissing = expected.filter((name) => !css.includes(`@keyframes ${PREFIX}-${name}`));

  if (missing.length)
    fail("check:catalogue", `${missing.length} parity classes missing`, missing.slice(0, 8));
  else if (kfMissing.length)
    fail("check:catalogue", `${kfMissing.length} parity keyframes missing`, kfMissing.slice(0, 8));
  else if (Object.keys(parity).length !== expected.length)
    fail(
      "check:catalogue",
      `manifest has ${Object.keys(parity).length}, oracle has ${expected.length}`
    );
  else pass("check:catalogue", `all ${expected.length} animate.css classes + keyframes present`);
}

// ============================================================= check:manifest
// §3.5. The manifest is the declaration; this diffs it against what the SCSS
// actually emitted, so a mixin that quietly changes behaviour is caught.
{
  const bad = [];
  for (const [name, entry] of Object.entries(parity)) {
    if (!css.includes(`@keyframes ${PREFIX}-${name}`)) {
      bad.push(`${name}: declared keyframes not emitted`);
      continue;
    }
    const declaredStops = Object.keys(entry.raw || {}).length;
    const block = css.slice(css.indexOf(`@keyframes ${PREFIX}-${name}`));
    const end = block.indexOf("\n  }\n");
    const emitted = (block.slice(0, end).match(/^\s+[\d.]+%/gm) || []).length;
    if (declaredStops && emitted && emitted !== declaredStops) {
      bad.push(`${name}: manifest declares ${declaredStops} stops, emitted ${emitted}`);
    }
  }
  bad.length
    ? fail("check:manifest", `${bad.length} manifest/output mismatches`, bad.slice(0, 6))
    : pass("check:manifest", `${Object.keys(parity).length} entries match their output`);
}

// ========================================================== check:collisions
// §11.1. A 600-class catalogue cannot be kept coherent by review alone.
{
  const names = Object.keys(catalogue.classes);
  const seen = new Map();
  const dupes = [];
  for (const n of names) {
    if (seen.has(n)) dupes.push(n);
    seen.set(n, true);
  }
  // Near-duplicates: same word set, different order (an-glow-border vs
  // an-border-glow). That is the class of collision review actually misses.
  const byWordSet = new Map();
  const warns = [];
  for (const n of names) {
    const key = n.split("-").slice(1).sort().join("|");
    if (byWordSet.has(key) && byWordSet.get(key) !== n) {
      warns.push(`${byWordSet.get(key)}  ~  ${n}`);
    } else {
      byWordSet.set(key, n);
    }
  }

  if (dupes.length) fail("check:collisions", `${dupes.length} duplicate class names`, dupes);
  else if (warns.length)
    fail("check:collisions", `${warns.length} near-duplicate names (same words, different order)`, warns);
  else pass("check:collisions", `${names.length} class names, no collisions or near-duplicates`);
}

// ========================================================== check:attribution
// §22. Every distributed file carries Animatio's own MIT notice. The
// animate.css attribution was required while the presets were generated from
// their keyframes; tools/author-parity.mjs replaced those with our own motion
// model, so what has to survive minification now is our notice.
{
  const banners = ["dist/animatio.css", "dist/animatio.min.css", "dist/animatio.compat.css"];
  const bad = banners.filter((f) => {
    const t = readFileSync(join(ROOT, f), "utf8").slice(0, 900);
    return !/Animatio/.test(t) || !/MIT/.test(t);
  });
  bad.length
    ? fail("check:attribution", "dist files missing the MIT notice", bad)
    : pass("check:attribution", "MIT notice present in every bundle");
}

// ==================================================== check:dead-fallbacks
// A registered custom property ALWAYS has a value, so `var(--x, fallback)`
// can never reach that fallback. Registering the author-config tokens made
// every per-effect default in the library dead: the marquee lost its 28s, the
// ticker its 9s, and the whole rotate family its rotation, because
// --an-angle's initial-value of 0deg won every time.
{
  const registered = {};
  root.walkAtRules("property", (at) => {
    let iv = null;
    at.walkDecls("initial-value", (d) => (iv = d.value));
    registered[at.params] = iv;
  });

  const bad = new Map();
  root.walkDecls((decl) => {
    for (const m of decl.value.matchAll(/var\(\s*(--[a-z0-9-]+)\s*,\s*([^)]+)\)/g)) {
      const iv = registered[m[1]];
      if (iv === undefined || iv === null) continue;
      const fb = m[2].trim();
      if (fb !== iv) {
        if (!bad.has(m[1])) bad.set(m[1], new Set());
        bad.get(m[1]).add(fb);
      }
    }
  });

  const lines = [...bad].map(
    ([k, v]) => `${k} (initial ${registered[k]}) — unreachable: ${[...v].slice(0, 4).join(", ")}`
  );
  lines.length
    ? fail("check:dead-fallbacks", `${lines.length} registered token(s) with dead fallbacks`, lines)
    : pass("check:dead-fallbacks", "no var() fallback shadowed by a registered initial-value");
}

// ========================================================= check:text-ink
// An element with background-clip:text also sets `color: transparent`, so any
// `currentColor` inside its background resolves to TRANSPARENT and the ink half
// of the gradient silently disappears. Five effects shipped with this before it
// was caught by eye. --an-ink exists precisely so it cannot come back.
{
  const bad = [];
  root.walkRules((rule) => {
    let clip = false, transparent = false, cc = false;
    rule.walkDecls((d) => {
      if (d.prop === "background-clip" && d.value === "text") clip = true;
      if (d.prop === "color" && d.value === "transparent") transparent = true;
      if (/^background/.test(d.prop) && /currentColor/.test(d.value)) cc = true;
    });
    if (clip && transparent && cc) bad.push(rule.selector.slice(0, 50));
  });
  bad.length
    ? fail("check:text-ink", `${bad.length} clip-text effects use currentColor`, bad)
    : pass("check:text-ink", "no currentColor inside a transparent-text background");
}

// ==================================================== check:trigger-range
// §8.2. The trigger ACTIVATION range is not the scrub range. `entry 0% entry
// 100%` covers only the entry phase, so a play-once reveal set to it never
// fires for an element that arrives in view without scrolling through that
// band. Locking the distinction in, because it is runtime behaviour that no
// other gate can see.
{
  const bad = [];
  root.walkDecls("timeline-trigger", (d) => {
    if (/--[a-z]+-range-(start|end)/.test(d.value)) {
      bad.push(`${d.parent.selector.slice(0, 40)}: uses the scrub range`);
    }
    if (/entry\s+0%\s+entry\s+100%/.test(d.value) || /view\(\)\s*entry\s*[;)]/.test(d.value)) {
      bad.push(`${d.parent.selector.slice(0, 40)}: activation range covers only the entry phase`);
    }
  });
  bad.length
    ? fail("check:trigger-range", `${bad.length} trigger(s) with an entry-only range`, bad)
    : pass("check:trigger-range", "trigger activation ranges are in-view, not entry-only");
}

// ============================================================== check:dogfood
// §16.8. The site contains zero third-party animation. If it needs motion the
// library cannot express, that is a LIBRARY gap and the fix goes in src/.
//
// Scoped deliberately, or it would be decorative: it flags @keyframes DEFINED
// in the docs (a new animation that should have been an effect) and any
// animation-name that is not one of ours. It does NOT flag `transition` — the
// VitePress default theme and our own UI states legitimately use it, and banning
// it would fail on day one and get weakened into meaninglessness. The rule is
// about ANIMATION, which is what the library provides.
{
  const files = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (["node_modules", "dist", ".vitepress/cache"].some((s) => full.includes(s))) continue;
        walk(full);
      } else if (/\.(scss|css|vue|md)$/.test(e.name)) {
        files.push(full);
      }
    }
  };
  walk(join(ROOT, "docs"));

  // Strip comments and fenced code blocks first: a doc page that SHOWS
  // `@keyframes an-up` is documentation, not a foreign animation, and the
  // dogfood note in site.scss says the words it is looking for.
  const strip = (text, file) => {
    let out = text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/<!--[\s\S]*?-->/g, "");
    if (file.endsWith(".md")) out = out.replace(/```[\s\S]*?```/g, "");
    return out;
  };

  const bad = [];
  for (const f of files) {
    const text = strip(readFileSync(f, "utf8"), f);
    const rel = f.replace(ROOT, "").split("\\").join("/");
    for (const m of text.matchAll(/@keyframes\s+([\w-]+)/g)) {
      // Referencing one of ours is dogfooding; defining a NEW one is the gap.
      if (m[1].startsWith(`${PREFIX}-`)) continue;
      bad.push(`${rel}: defines @keyframes ${m[1]} — that belongs in src/`);
    }
    for (const m of text.matchAll(/animation-name:\s*([\w-]+)/g)) {
      if (m[1] === "none" || m[1].startsWith(`${PREFIX}-`)) continue;
      bad.push(`${rel}: animation-name: ${m[1]} is not an Animatio animation`);
    }
  }

  bad.length
    ? fail("check:dogfood", `${bad.length} foreign animations in the site`, bad.slice(0, 6))
    : pass("check:dogfood", `${files.length} site files, zero foreign animation`);
}

// ============================================================ check:preview-map
// A duplicate key in the preview registry silently wins over the earlier one,
// with no error anywhere. That is how an-bars kept rendering as dots after
// being remapped to a bar subject, and how two earlier remaps were lost.
{
  const file = "docs/.vitepress/theme/preview-content.mjs";
  if (!existsSync(file)) {
    pass("check:preview-map", "no preview registry to check");
  } else {
    const src = readFileSync(file, "utf8");
    // Two registries: EXACT is consulted before PREFIX, so the same name in
    // both is deliberate. Only a repeat WITHIN one registry is a bug, and that
    // is what silently put an icon back on an-pixelate, an-dither and
    // an-halftone after they were remapped to a real image.
    const split = src.indexOf("export const PREFIX");
    const halves = split < 0 ? [src] : [src.slice(0, split), src.slice(split)];
    const dupes = [];
    let total = 0;
    for (const half of halves) {
      const seen = new Set();
      for (const m of half.matchAll(/^\s*(?:"([\w-]+)":\s|\["([\w-]+)",)/gm)) {
        const k = m[1] || m[2];
        total++;
        if (seen.has(k)) dupes.push(k);
        else seen.add(k);
      }
    }
    const seen = { size: total };
    dupes.length
      ? fail("check:preview-map", `${dupes.length} duplicate preview keys`, dupes.slice(0, 8))
      : pass("check:preview-map", `${seen.size} preview subjects, no duplicates`);
  }
}

// ============================================================== check:exports
// Every path in `exports` and `files` must exist in a built tree. A broken
// export is invisible until someone installs the package and their bundler
// fails to resolve it -- `./dist/animatio.full.css` was pointing at a file the
// build never wrote.
{
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const targets = [];
  const walk = (v) => {
    if (typeof v === "string") targets.push(v);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(pkg.exports || {});
  if (pkg.bin) walk(pkg.bin);
  if (pkg.main) targets.push(pkg.main);

  const missing = targets
    .filter((t) => !t.includes("*"))
    .filter((t) => !existsSync(t.replace(/^\.\//, "")));
  // A `files` entry may be a directory, a negation (`!dist/test`) or a glob;
  // only a plain path can be checked for existence.
  const filesMissing = (pkg.files || [])
    .filter((f) => !f.startsWith("!") && !f.includes("*"))
    .filter((f) => !existsSync(f));

  const bad = [
    ...missing.map((m) => `exports -> ${m}`),
    ...filesMissing.map((f) => `files -> ${f}`),
  ];
  bad.length
    ? fail("check:exports", `${bad.length} package paths do not exist`, bad.slice(0, 8))
    : pass("check:exports", `${targets.length} exports + ${(pkg.files || []).length} files entries all present`);
}

// =========================================================== check:selectors
// A trailing comma in a selector list — `.a, { … }` — is not a sass error. It
// compiles, and then the whole rule silently matches nothing. Removing a class
// from a comma group is exactly how one gets introduced.
{
  const bad = [];
  for (const file of ["dist/animatio.css", "dist/animatio.nolayer.css"]) {
    if (!existsSync(file)) continue;
    const root = postcss.parse(readFileSync(file, "utf8"));
    root.walkRules((rule) => {
      if (rule.selectors.some((s) => !s.trim())) bad.push(`${file}: ${rule.selector.slice(0, 60)}`);
    });
  }
  bad.length
    ? fail("check:selectors", `${bad.length} rules with an empty selector`, bad.slice(0, 6))
    : pass("check:selectors", "no empty or trailing-comma selectors");
}

// ============================================================= check:removed
// A class listed in removals.json must not survive in the build. The removal
// tool matches the literal token `#{s("name")}`, so anything GENERATED — the
// elevation scale was `#{s("shadow-" + $level)}` in a loop — is invisible to
// it and silently stays. Editing the source is not evidence that the class is
// gone; the compiled CSS is.
{
  const spec = existsSync("tools/removals.json")
    ? JSON.parse(readFileSync("tools/removals.json", "utf8"))
    : null;
  if (!spec) {
    pass("check:removed", "no removal list to enforce");
  } else {
    const gone = [
      ...Object.keys(spec.duplicates || {}).filter((k) => !k.startsWith("_")),
      ...(spec.trivial?.list || []),
      ...(spec.novelty?.list || []),
    ];
    const css = readFileSync("dist/animatio.css", "utf8");
    // A CLASS selector specifically. The keyframe of a removed class can
    // legitimately survive when a class that is still shipping animates with
    // it, so matching the bare name would report a false positive.
    const survivors = gone.filter((n) =>
      new RegExp("\." + n + "(?![\w-])").test(css)
    );
    survivors.length
      ? fail("check:removed", `${survivors.length} removed classes still ship`, survivors.slice(0, 8))
      : pass("check:removed", `${gone.length} removed classes, none in the build`);
  }
}

// ============================================================= check:numbers
// Every figure the docs quote, checked against the actual build. These went
// stale across a slimming pass -- the compare page was still advertising ~400
// effects and 21.2 KB after both had changed -- and a number nobody verifies is
// just a claim.
{
  const cat = JSON.parse(readFileSync("dist/catalogue.json", "utf8")).classes;
  const groups = {};
  for (const v of Object.values(cat)) groups[v.group] = (groups[v.group] || 0) + 1;
  const kb = (f) =>
    existsSync(f) ? (gzipSync(readFileSync(f)).length / 1024).toFixed(1) : null;

  const FACTS = {
    total: String(Object.keys(cat).length),
    animation: String(groups.animation || 0),
    effect: String(groups.effect || 0),
    parity: String(Object.values(cat).filter((v) => v.parity).length),
    gzip: kb("dist/animatio.css"),
    shaken: kb("test/treeshake/marketing/out.css"),
  };

  // Where each figure is quoted. Kept explicit: a regex over all prose would
  // match CSS values and version numbers and report noise forever.
  const CLAIMS = [
    ["README.md", [FACTS.total, FACTS.gzip, FACTS.shaken, FACTS.parity]],
    ["docs/compare.md", [FACTS.total, FACTS.gzip, FACTS.shaken, FACTS.effect]],
    ["docs/index.md", [FACTS.total, FACTS.gzip, FACTS.animation, FACTS.parity]],
    ["docs/guide/install.md", [FACTS.total, FACTS.gzip, FACTS.shaken]],
    ["docs/guide/index.md", [FACTS.effect, FACTS.parity]],
    ["docs/.vitepress/config.mjs", [FACTS.total, FACTS.gzip, FACTS.shaken]],
    ["docs/.vitepress/theme/components/AnHero.vue", [FACTS.total, FACTS.gzip]],
  ];

  const missing = [];
  for (const [file, wanted] of CLAIMS) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const w of wanted) {
      if (w && !text.includes(w)) missing.push(`${file} should quote ${w}`);
    }
  }
  missing.length
    ? fail("check:numbers", `${missing.length} stale figures`, missing.slice(0, 8))
    : pass(
        "check:numbers",
        `${FACTS.total} classes, ${FACTS.gzip} KB, ${FACTS.shaken} KB shaken — quoted correctly`
      );
}

// ==================================================================== report
const width = 22;
let failed = 0;
console.log("\nanimatio: CI gates\n");
for (const r of results) {
  const mark = r.ok ? "  ok  " : " FAIL ";
  console.log(`${mark} ${r.name.padEnd(width)} ${r.msg}`);
  if (!r.ok) {
    failed++;
    for (const d of r.detail || []) console.log(`         · ${d}`);
  }
}
console.log(
  `\n${results.length - failed}/${results.length} gates passing` +
    (failed ? " — BUILD BLOCKED\n" : "\n")
);
process.exit(failed ? 1 : 0);
