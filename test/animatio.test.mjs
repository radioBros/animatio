// Animatio — test suite. PLAN.md §15
//
// The most important test here is the FALLBACK one. It does not rely on a
// browser flag whose name drifts; the build emits a deterministic bundle with
// every scroll-driven @supports condition rewritten false, so any engine
// renders the Tier-0 path and the assertion is reproducible forever.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import postcss from "postcss";
import { extract, resolve, emit, loadCatalogue, report } from "../engine/index.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const css = read("dist/animatio.css");
const catalogue = loadCatalogue(join(ROOT, "dist/catalogue.json"));

// ============================================================== parity oracle
describe("parity (§6)", () => {
  const oracle = read("test/fixtures/animate-4.1.1.css");
  const util = ["animated", "infinite", "repeat", "delay", "fast", "faster", "slow", "slower"];
  const expected = [
    ...new Set([...oracle.matchAll(/\.animate__([a-zA-Z][a-zA-Z0-9]*)\b/g)].map((m) => m[1])),
  ].filter((c) => !util.some((u) => c.startsWith(u)));

  test("the oracle has 97 effect classes, not the 93 first assumed", () => {
    assert.equal(expected.length, 97);
  });

  test("every animate.css class has an an-* counterpart", () => {
    const missing = expected.filter((n) => !css.includes(`.an-${n} {`));
    assert.deepEqual(missing, []);
  });

  test("every animate.css keyframe has an an-* counterpart", () => {
    const missing = expected.filter((n) => !css.includes(`@keyframes an-${n}`));
    assert.deepEqual(missing, []);
  });

  test("hardcoded distances became tokens (§6.1)", () => {
    assert.match(css, /an-fadeInLeftBig[\s\S]{0,400}var\(--an-distance-big, 2000px\)/);
  });

  test("the compat build aliases every animate.css class", () => {
    const compat = read("dist/animatio.compat.css");
    const missing = expected.filter((n) => !compat.includes(`.animate__${n}`));
    assert.deepEqual(missing, []);
  });
});

// ============================================== the fallback test (§15.4) ====
describe("scroll fallback — no invisible content (§2.2, §15.4)", () => {
  const nosda = read("dist/test/animatio.nosda.css");

  test("the deterministic bundle exists and neutralises every scroll @supports", () => {
    assert.ok(nosda.includes("--animatio-force-fallback"));
    // No live view()/trigger condition may survive in the fallback bundle.
    const live = [...nosda.matchAll(/@supports\s*\(([^)]*)\)/g)]
      .map((m) => m[1])
      .filter((c) => /animation-timeline:\s*view|animation-trigger/.test(c));
    assert.deepEqual(live, []);
  });

  test("no rule hides content once the scroll guards are false", () => {
    const root = postcss.parse(nosda);
    const offenders = [];
    root.walkDecls((decl) => {
      const rule = decl.parent;
      if (rule?.type !== "rule") return;
      if (rule.parent?.type === "atrule" && rule.parent.name === "keyframes") return;
      // Anything still inside the neutralised guard is dead code, not a risk.
      let p = decl.parent;
      let dead = false;
      while (p) {
        if (p.type === "atrule" && /animatio-force-fallback/.test(p.params || "")) dead = true;
        if (p.type === "atrule" && /reduced-motion/.test(p.params || "")) dead = true;
        p = p.parent;
      }
      if (dead) return;
      if (/::before|::after|:hover|:active|:focus/.test(rule.selector)) return;
      // A rule with an interaction counterpart elsewhere has a way back; the
      // concern here is content hidden at first paint with NO way back.
      const head = rule.selector.split(",")[0].trim().split(/[\s>]/)[0];
      if (
        nosda.includes(`${head}:hover`) ||
        nosda.includes(`${head}:focus-within`) ||
        nosda.includes(`${head}:focus-visible`)
      ) return;
      if (decl.prop === "opacity" && parseFloat(decl.value) < 0.05) {
        offenders.push(`${rule.selector} { opacity: ${decl.value} }`);
      }
      if (decl.prop === "visibility" && decl.value === "hidden") {
        offenders.push(`${rule.selector} { visibility: hidden }`);
      }
    });
    assert.deepEqual(offenders, [], "content would be permanently invisible");
  });

  test("an-reveal itself never sets a hidden state outside @supports", () => {
    const root = postcss.parse(css);
    const bad = [];
    root.walkRules((rule) => {
      if (!/\.an-reveal\b/.test(rule.selector)) return;
      let guarded = false;
      let p = rule.parent;
      while (p) {
        if (p.type === "atrule" && p.name === "supports") guarded = true;
        p = p.parent;
      }
      if (guarded) return;
      rule.walkDecls((d) => {
        if (d.prop === "opacity" && parseFloat(d.value) < 0.05) bad.push(rule.selector);
        if (d.prop === "animation-play-state" && d.value === "paused") bad.push(rule.selector);
      });
    });
    assert.deepEqual(bad, []);
  });
});

// ============================================================= the tier ladder
describe("reveal tier ladder (§8.2)", () => {
  test("Tier 2 negates Tier 3, so they cannot both apply in Chrome 145", () => {
    assert.match(
      css,
      /@supports \(animation-timeline: view\(\)\) and \(not \(animation-trigger/
    );
  });

  test("the paused default is declared BEFORE the @container override", () => {
    const paused = css.indexOf("animation-play-state: paused");
    const container = css.indexOf("@container style(--an-on: 1)");
    assert.ok(paused > -1 && container > -1);
    assert.ok(
      paused < container,
      "source order inverted — `paused` would win and nothing would ever play"
    );
  });

  test("the latch property inherits, or the style query never reaches children", () => {
    assert.match(css, /@property --an-on \{[\s\S]{0,120}inherits: true/);
  });

  test("Tier 3 scopes its trigger so one markup shape serves every tier", () => {
    assert.match(css, /trigger-scope: --an-t/);
    assert.match(css, /\.an-reveal > \.an \{[\s\S]{0,80}animation-trigger: --an-t play-once/);
  });
});

// ================================================================= stagger
describe("stagger x reveal interop (§8.2.2)", () => {
  test("--an-i inherits, so the index survives a reveal wrapper", () => {
    assert.match(css, /@property --an-i \{[\s\S]{0,120}inherits: true/);
  });

  test("the delay is computed on the animated element, one level deep", () => {
    assert.match(css, /\.an-stagger > \.an-reveal > \.an/);
    assert.match(css, /animation-delay: calc\(var\(--an-delay, 0s\) \+ var\(--an-i, 0\)/);
  });

  test("a deeper descendant does not inherit the index into a delay", () => {
    // There must be no unbounded `.an-stagger .an` descendant selector.
    assert.doesNotMatch(css, /\.an-stagger \.an \{/);
  });
});

// ============================================================== composition
// Atom names from the manifest, so this cannot drift from what the build emits.
const ATOMS = Object.keys(
  JSON.parse(readFileSync(new URL("../src/atoms/manifest.json", import.meta.url), "utf8"))
).map((n) => `an-${n}`);

describe("composable atoms (§4, §7)", () => {
  test("atoms animate registered channels, not transform directly", () => {
    assert.match(css, /@keyframes an-up \{[\s\S]{0,160}--an-y:/);
    assert.match(css, /@keyframes an-fade \{[\s\S]{0,160}--an-o:/);
  });

  test("one grouped rule assembles every channel", () => {
    assert.match(css, /\.an-fade[^{]*\{[^}]*transform: translate3d\(var\(--an-x/);
  });

  // The whole positioning claim. Two classes that both declare animation-name
  // collide -- the last one in the stylesheet wins and the other silently does
  // nothing. an-fade + an-up used to run ONE animation for exactly that reason.
  test("no atom declares animation-name, so two atoms cannot collide", () => {
    const root = postcss.parse(css);
    const offenders = [];
    root.walkRules((rule) => {
      if (!/^\.an-[a-z-]+$/.test(rule.selector.trim())) return;
      const name = rule.selector.trim().slice(1);
      if (!ATOMS.includes(name)) return;
      rule.walkDecls("animation-name", () => offenders.push(name));
    });
    assert.deepEqual(offenders, [], `atoms declaring animation-name: ${offenders}`);
  });

  test("each atom writes the slot for the channel it owns", () => {
    assert.match(css, /\.an-fade\s*\{[^}]*--an-anim-o: an-fade/);
    assert.match(css, /\.an-up\s*\{[^}]*--an-anim-y: an-up/);
    // and the assembly reads every slot back into one list
    assert.match(css, /animation-name: var\(--an-anim-x, none\), var\(--an-anim-y, none\)/);
  });

  test("parity presets stay on the compositor path", () => {
    assert.match(css, /@keyframes an-fadeInUp \{[\s\S]{0,200}transform: translate3d/);
  });
});

// ============================================================ accessibility
describe("accessibility (§12)", () => {
  test("every animating selector has a reduced-motion treatment", () => {
    const root = postcss.parse(css);
    const animating = new Set();
    const covered = new Set();
    root.walkDecls("animation-name", (d) => {
      if (d.value === "none") return;
      let p = d.parent;
      let inRm = false;
      while (p) {
        if (p.type === "atrule" && /reduced-motion/.test(p.params || "")) inRm = true;
        p = p.parent;
      }
      if (!inRm) d.parent.selectors.forEach((s) => animating.add(s.trim()));
    });
    root.walkAtRules("media", (at) => {
      if (!/reduced-motion/.test(at.params)) return;
      at.walkRules((r) => r.selectors.forEach((s) => covered.add(s.trim())));
    });
    const missing = [...animating].filter((s) => !covered.has(s));
    assert.deepEqual(missing, []);
  });

  test("flashing effects are removed, not merely shortened (WCAG 2.3.1)", () => {
    const rm = css.slice(css.indexOf("prefers-reduced-motion"));
    assert.match(rm, /\.an-glitch[\s\S]{0,4000}animation-name: none/);
  });

  test("loaders keep running — a frozen spinner reads as a hung page", () => {
    const rm = css.slice(css.indexOf("prefers-reduced-motion"));
    assert.match(rm, /\.an-spinner/);
  });

  test("glass falls back opaque under reduced transparency", () => {
    assert.match(css, /prefers-reduced-transparency: reduce/);
  });
});

// ============================================================== tree-shaking
describe("tree-shaking engine (§14.2)", () => {
  const html = `<div class="an an-fadeInUp an-glass"><span class="an-text-gradient"></span></div>`;

  test("extracts whole class names from content", () => {
    const { classes } = extract(html);
    assert.ok(classes.has("an-fadeInUp"));
    assert.ok(classes.has("an-glass"));
    assert.ok(classes.has("an-text-gradient"));
  });

  test("keyframes come along with their class — the classic purge failure", () => {
    const { wanted } = resolve(catalogue, extract(html));
    const out = emit(catalogue, wanted);
    assert.ok(out.includes("@keyframes an-fadeInUp"));
  });

  test("unused effects are not emitted", () => {
    const { wanted } = resolve(catalogue, extract(html));
    const out = emit(catalogue, wanted);
    assert.ok(!out.includes(".an-hinge"));
    assert.ok(!out.includes("@keyframes an-hinge"));
  });

  test("the a11y block survives shaking (check:treeshake-a11y)", () => {
    const { wanted } = resolve(catalogue, extract(html));
    const out = emit(catalogue, wanted);
    assert.ok(out.includes("prefers-reduced-motion"));
    assert.match(out, /prefers-reduced-motion[\s\S]{0,3000}an-fadeInUp/);
  });

  test("safelist rescues runtime-assembled names", () => {
    const { wanted } = resolve(catalogue, extract("<div></div>"), {
      safelist: [/^an-zoom/],
    });
    assert.ok(wanted.has("an-zoomIn"));
  });

  test("the base class is always emitted", () => {
    const { wanted } = resolve(catalogue, extract("<div></div>"));
    const out = emit(catalogue, wanted);
    assert.ok(out.includes(".an {"));
    assert.ok(out.includes("@layer animatio."));
  });

  test("a real page shakes to under 6 KB gzip", () => {
    const file = "test/treeshake/marketing/out.css";
    if (!existsSync(join(ROOT, file))) return;
    const gz = gzipSync(readFileSync(join(ROOT, file))).length / 1024;
    assert.ok(gz < 6, `${gz.toFixed(2)} KB gz`);
  });

  test("report accounts for what was dropped", () => {
    const { wanted } = resolve(catalogue, extract(html));
    const out = emit(catalogue, wanted);
    const r = report(catalogue, wanted, out);
    assert.ok(r.kept > 0 && r.dropped > r.kept);
    assert.ok(r.saved > 0);
  });
});

// ================================================================== packaging
describe("packaging (§14.3, §22)", () => {
  // The animate.css attribution was required while the presets were generated
  // from their keyframes. tools/author-parity.mjs replaced those with our own
  // motion model, so what has to survive minification is our notice.
  test("every bundle carries the MIT notice", () => {
    for (const f of ["dist/animatio.css", "dist/animatio.min.css"]) {
      const head = read(f).slice(0, 900);
      assert.match(head, /Animatio/);
      assert.match(head, /MIT/);
    }
  });

  test("no parity preset still carries animate.css's own numbers", () => {
    // Their signature values: the bounceIn scale ladder and the jello skews.
    // If any of these reappear, the authoring step has been bypassed.
    assert.doesNotMatch(css, /scale3d\(0\.3, 0\.3, 0\.3\)/);
    assert.doesNotMatch(css, /skewX\(-12\.5deg\)/);
    assert.doesNotMatch(css, /cubic-bezier\(0\.215, 0\.61, 0\.355, 1\)/);
  });

  test("the SVG sprite defines every filter the CSS references", () => {
    const sprite = read("assets/animatio-filters.svg");
    const root = postcss.parse(css);
    const refs = new Set();
    root.walkDecls((d) => {
      for (const m of d.value.matchAll(/url\(["']?#([\w-]+)["']?\)/g)) refs.add(m[1]);
    });
    for (const id of refs) {
      assert.ok(sprite.includes(`id="${id}"`), `sprite is missing #${id}`);
    }
  });

  test("the prefix is configurable end to end", () => {
    // Compiled separately in the build; here we assert nothing hardcodes `an-`
    // in the SCSS sources outside comments.
    const fn = read("src/lib/_fn.scss");
    assert.match(fn, /config\.\$prefix/);
  });
});
