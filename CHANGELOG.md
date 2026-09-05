# Changelog

## 0.1.0 — 2026-09-04

First build. Everything below is implemented, building and verified by CI gates;
see `PLAN.md` for the design document each item traces to.

### Library

- **97 animate.css parity effects** (§6), generated from the pinned
  `animate.css@4.1.1` fixture rather than transcribed, so timing is
  byte-identical. Distances, angles, origins and perspective are now tokens.
- **24 composable atoms** (§7) — single-channel effects that stack, built on
  `@property`-registered transform channels. The thing animate.css structurally
  cannot do.
- **4-tier prop API** (§5) — inline custom properties, `data-` attributes,
  utility classes, and typed `attr()` behind a load-bearing `@supports`.
- **Scroll module** (§8) — `an-reveal` with a three-tier ladder
  (`animation-trigger` → style-query latch → visible content) and `an-scrub-*`,
  parallax, progress, sticky stacks and named timelines.
- **Glass and surfaces** (§9) — blur, portable `feTurbulence` grain, a seven-step
  shadow scale, and opt-in SVG refraction.
- **~380 effects** (§10) across gooey, distortion, glitch/CRT, neon/holographic,
  ambient backgrounds, text, hover, cards, media, loaders, borders, reveals, 3D,
  ambient motion and view transitions.
- **534 classes, 247 keyframes, 22.8 KB gzipped** for the whole thing.

### Tooling

- **Tree-shaking engine** (§14.2) — scan-and-generate, not prune. Keyframes,
  `@property` registrations and accessibility blocks travel with their class.
  A real page shakes to **4.7 KB gzipped**.
- Bundler plugins for Vite, webpack, Rollup and esbuild, a PostCSS plugin, and a
  CLI for stacks with no bundler — all wrapping one engine.
- **Dev-mode guard** that warns the moment a class is applied at runtime that
  static extraction could not see, plus when a fast preset and a compose atom
  land on the same element.

### Correctness

- **14 CI gates** (§14.1), each guarding a promise that would otherwise decay
  silently: no `animation` shorthand, no hidden state outside `@supports`,
  mutually exclusive reveal tiers, annotated bleeding-edge features, every
  `var()` with a fallback, every animating class with an a11y treatment,
  exceptionless `an-svg-*` naming, no mixed modes, no near-duplicate names,
  manifest/output parity, and the animate.css attribution in every bundle.
- **33 tests**, including the deterministic fallback bundle that proves nothing
  is invisible when scroll timelines are unavailable.

### Accessibility

- `prefers-reduced-motion` **generated from the compiled CSS**, covering all 272
  animating selectors, bucketed by kind: decorative shortened, ambient paused,
  flashing removed (WCAG 2.3.1), scroll unbound, and loaders kept running
  (WCAG 2.3.3 essential-motion exemption).
- `prefers-reduced-transparency` and `prefers-contrast` for the glass module.
- Hover-revealed content is reachable on `:focus-within`.

### Corrections found while building

- animate.css has **97** effect classes and 97 keyframes, a 1:1 match — not the
  93 the plan first assumed, which came from a line-anchored grep that missed
  compound selectors. Deriving from the oracle rather than counting by hand is
  what caught it.
- The full-build size ceiling was an unmeasured 42 KB in the plan. Measured:
  22.8 KB.
- `an-glass-refract` was renamed `an-svg-glass-refract`; it needs the sprite, and
  the `an-svg-*` promise is only useful if it is exceptionless.

### Not yet done

Visual-regression screenshots, the real-device pass, OG image generation, and
the per-stack setup guides — P8 in the plan. Hence `0.1.0`.
