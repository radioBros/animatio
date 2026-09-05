<p align="center">
  <img src="assets/icon.png" alt="Animatio" width="72">
</p>

# Animatio

[![MIT](https://img.shields.io/badge/license-MIT-0092f9)](LICENSE)

**A CSS-only animation and effects library. Free and open source under MIT.** 97 classic presets, a
composable transform engine, scroll-driven reveals with an honest support
ladder, glass surfaces, 392 classes — and a tree-shaking engine so you ship
only what you use.

```bash
npm i @radiobros/animatio
```

| | animate.css | AOS | Tailwind anim. | **Animatio** |
|---|---|---|---|---|
| animate.style catalogue | ✅ 97 | ❌ | ❌ | ✅ 97 |
| CSS-only (zero JS runtime) | ✅ | ❌ | ✅ | ✅ |
| Stackable effects (`fade` + `up`) | ❌ | ❌ | ❌ | ✅ |
| Per-element config from HTML | partial | data-attrs (JS) | ❌ | ✅ 4 tiers |
| Scroll-driven (`view()` / `scroll()`) | ❌ | JS | ❌ | ✅ + native triggers |
| Glass / backdrop / SVG effects | ❌ | ❌ | ❌ | ✅ |
| `prefers-reduced-motion` | partial | ❌ | ❌ | ✅ every effect |
| Ships only what you use | ❌ | ❌ | ✅ | ✅ |

**20.6 KB gzip** for everything. **3.3 KB** for a real site, tree-shaken.

---

## Quick start

```html
<link rel="stylesheet" href="node_modules/animatio/dist/animatio.min.css">

<div class="an an-fadeInUp">Hello</div>
```

Tree-shaken, with a bundler:

```js
// vite.config.js
import animatio from "@radiobros/animatio/vite";
export default { plugins: [animatio({ content: ["src/**/*.{vue,html}"] })] };
```

```js
import "@radiobros/animatio";   // resolves to just the classes your content uses
```

No bundler? The CLI covers Rails, Laravel, WordPress and plain HTML:

```bash
npx animatio init
npx animatio build --watch
```

---

## The four ways to configure an effect

Every value is expressible in all of tiers 1–3, in every browser.

```html
<!-- 1. inline custom properties — arbitrary values, universal -->
<div class="an an-fadeInUp" style="--an-duration: 1.2s; --an-distance: 4rem"></div>

<!-- 2. data attributes — presets, universal -->
<div class="an an-fadeInUp" data-an-speed="slow" data-an-ease="spring"></div>

<!-- 3. utility classes — the familiar names -->
<div class="an an-fadeInUp an-slow an-delay-2s"></div>

<!-- 4. typed attr() — nicest ergonomics, Chrome 133+ -->
<div class="an an-fadeInUp" data-an-duration="1.4s" data-an-angle="12deg"></div>
```

## Composable atoms

A monolithic effect cannot stack with another: two that both write `transform`, so one
silently wins. Animatio's atoms each animate a single `@property`-registered
channel, so they compose.

```html
<div class="an an-fade an-up an-scale-in"></div>
```

*Presets for entrances, atoms for choreography.* Do not mix the two on one
element — the dev-mode guard warns if you do.

## Scroll

```html
<div class="an-reveal">
  <div class="an an-fadeInUp">Fires once when it enters</div>
</div>

<div class="an-scrub-up">Progress follows the scrollbar</div>
```

`an-reveal` resolves through three tiers — native `animation-trigger`
(Chrome 145+), a style-query latch (Chrome 115+/Safari 26+), or plain visible
content. **It never hides anything it cannot show again**, which is why Firefox
stable renders a finished, readable page rather than a blank one.

## Glass

```html
<nav class="an-glass an-noise">…</nav>
```

Grain is a real `feTurbulence`, delivered as a data-URI image so it works
everywhere.

---

## What this library does not do

Published up front, because every competitor hides it and users find out in
production.

| Want | Why CSS cannot | What ships instead |
|---|---|---|
| Cursor-following spotlight, magnetic pull | No pointer coordinates in CSS | `-static` and `-zones` variants, plus a 6-line coordinate feed |
| Text scramble | CSS cannot author text content | `an-text-flip-chars` |
| Per-character animation without spans | No `::nth-letter()` | Split snippets + `--an-i` |
| Velocity-reactive physics | No runtime state | `linear()` spring curves |
| Particles, canvas, WebGL | Different rendering model | Nothing. Use three.js. |
| Scroll `once` in Firefox today | CSS cannot latch a scrubbed timeline | The tier ladder, plus an optional 12-line enhancer |
| SVG refraction in Safari | [webkit #245510](https://bugs.webkit.org/show_bug.cgi?id=245510) | `an-glass` + an opt-in refract path |

**`backdrop-filter: url(#svg)` is broken**, not merely unsupported — WebKit
parses it and renders nothing. `@supports` therefore returns *true* in Safari
and would switch the broken path on, so refraction is gated on an explicit
`<html data-an-refract="on">` after your own render probe.

`an-svg-goo` needs `assets/animatio-filters.svg` pasted into your
page once. The prefix is the install instruction, and `check:svg-naming`
enforces it exceptionlessly.

---

## Accessibility

Not bolted on. The `prefers-reduced-motion` block is **generated from the
compiled CSS**, so every one of the 272 animating selectors has a treatment and
a new effect cannot ship without one:

- decorative motion → 1 ms
- ambient loops → paused
- flashing (glitch, CRT, VHS) → removed outright, WCAG 2.3.1
- scroll-linked → unbound from the timeline
- **loaders keep running** — WCAG 2.3.3 exempts essential motion, and a frozen
  spinner reads as a hung page

Plus `prefers-reduced-transparency` and `prefers-contrast` for the glass module.

---

## Development

```bash
npm run verify      # manifest -> build -> catalogue -> gates -> size -> tests
npm run build
npm run check       # 16 CI gates
npm test            # 33 tests
```

Every gate exists because the project makes a promise that would otherwise decay
silently: no `animation` shorthand (it resets `animation-timeline`), no hidden
state outside `@supports`, no two reveal tiers true at once, no unannotated
bleeding-edge feature, no animating class without an a11y treatment, no
near-duplicate class names, and the animate.css attribution present in every
bundle.

**`PLAN.md` is the full design document** — 24 sections covering every decision,
its trade-off, and the failure it prevents.

## Status

Built through P7 of the plan: foundation, parity, props, atoms, scroll,
surfaces, the fx catalogue, tree-shaking, accessibility and packaging are done
and verified. The marketing site is in `docs/`. Visual-regression and
real-device passes (P8) are not yet run, so this is `0.1.0`, not `1.0.0`.

## License

**MIT — free and open source.** Use it in anything, including closed and
commercial products, with no obligation to open your own source. The only
condition is that the copyright notice travels with copies of the library,
which the banner in every `dist/` file already does for you.

The preset names are compatible with animate.css because that is the point of a
parity layer, but the motion is Animatio's own, authored by
[`tools/author-parity.mjs`](tools/author-parity.mjs) from a damped-oscillator
model rather than copied. See [NOTICES](NOTICES).

Contributions welcome — [CONTRIBUTING.md](CONTRIBUTING.md) covers adding an
effect, the gates it has to pass, and the audits that check a preview actually
shows something.

## Working on the docs site

```bash
npm run docs:build
npm run docs:verify     # preview on a fresh port, prints cache-busted URLs
```

**Use `vitepress preview`, never `serve -s`.** SPA mode rewrites every URL to
`index.html`, so each docs page boots with the landing page's HTML, hydrates
into a mismatch, and loses its sidebar. That looks exactly like a theme bug and
is not one. `docs:verify` picks a fresh port and prints cache-busted URLs,
because a stale stylesheet after a rebuild makes an already-fixed problem read
as unfixed.
