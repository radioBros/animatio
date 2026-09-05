---
# The capability matrix is six columns wide and does not fit beside the
# outline at any normal desktop width. Reclaiming that column is what lets
# the table sit in full instead of scrolling.
aside: false
pageClass: page--compare
---

# Compare

Every claim on this page is reproducible on this page. Where a competitor is
genuinely better, we say which and why — that is what makes the rest credible.

## Features at a glance

Read this as capability, not score. A ❌ against GSAP for "CSS-only" is not a
criticism of GSAP — it is a runtime library, and that is the point of it.

| | **Animatio** | animate.css | AOS | Tailwind anim. | GSAP / Motion One |
|---|---|---|---|---|---|
| Classic entrance/exit catalogue | ✅ 97 | ✅ 97 | ❌ | ❌ | build your own |
| CSS-only, zero JS runtime | ✅ | ✅ | ❌ | ✅ | ❌ |
| Runtime weight | **0 KB** | 0 KB | ~14 KB JS | 0 KB | 23–70 KB JS |
| Stackable effects (`fade` + `up`) | ✅ single-channel atoms | ❌ | ❌ | ❌ | ✅ |
| Per-element config from HTML | ✅ 4 tiers | partial | data attrs (JS) | ❌ | ❌ (JS API) |
| Scroll-driven reveals | ✅ native `view()` | ❌ | ✅ JS observer | ❌ | ✅ ScrollTrigger |
| Scroll *scrubbing* (progress-linked) | ✅ `scroll()` | ❌ | ❌ | ❌ | ✅ |
| Glass / backdrop / SVG filter effects | ✅ | ❌ | ❌ | ❌ | ❌ |
| Hover, border, text and card effects | ✅ 169 | ❌ | ❌ | ❌ | ❌ |
| View Transitions | ✅ | ❌ | ❌ | ❌ | partial |
| `prefers-reduced-motion` | ✅ every effect | partial | ❌ | ❌ | manual |
| Ships only what you use | ✅ | ❌ | ❌ | ✅ | ✅ |
| Timeline sequencing, physics, morphing | ❌ | ❌ | ❌ | ❌ | ✅ **they win** |
| Interruptible, state-aware animation | ❌ | ❌ | ❌ | ❌ | ✅ **they win** |

**20.6 KB gzip** for all 392 classes. **3.3 KB** for a real site, tree-shaken.

## vs. animate.css

The catalogue is identical, because ours is *generated* from theirs. What
changes:

<AnCompare />

Beyond composability: every hardcoded distance, angle and origin became a
tunable token, the reduced-motion treatment is per-effect rather than a blanket,
and you can ship 4 KB instead of 18 KB.

Migration is one find-and-replace — `animate__` → `an-` — or zero changes if you
load `animatio.compat.css`, which aliases every original class name and maps
`--animate-duration` onto ours. The [full migration guide](/guide/migrate) has
the class map and the two behavioural differences worth knowing about.

## vs. AOS

AOS ships ~14 KB of JavaScript and attaches an observer per element. Animatio
ships **zero** runtime. Turn JavaScript off on this page: the scroll reveals
below still work, because they are `animation-timeline: view()`.

The honest caveat: in Firefox stable today, scroll-driven animations are still
behind a flag, so Animatio's reveals fall back to *content simply being visible*
while AOS would still animate. We think a readable page beats a broken one, and
we ship a 12-line enhancer if you disagree.

## vs. GSAP and Motion One

**They win** at timeline sequencing, velocity-aware physics, morphing arbitrary
SVG paths, and anything needing runtime state. If your brief is a scroll-jacked
product tour with chained, interruptible timelines, use GSAP. Pretending
otherwise would discredit everything else on this page.

**Animatio wins** on cost — 0 KB of runtime, nothing to hydrate, works in a
`<style>` tag — on `prefers-reduced-motion` being automatic rather than
something you remember to wire up, and on not needing a framework at all.

## vs. Framer Motion

React-only versus framework-free. If you are already all-in on React and want
layout animations and shared-element transitions in JSX, Framer Motion is the
better fit. If you want the same entrance in a Rails template, a Vue SFC and a
static HTML file, that is this.

## vs. Tailwind's `animate-*`

Tailwind ships four built-ins: `spin`, `ping`, `pulse`, `bounce`. This is 530.
It is not either/or — `animatio/tailwind` exposes the classes as `@utility`, so
Tailwind's own JIT tree-shakes them natively.

## vs. writing the keyframes yourself

Often the right answer for one effect. It stops being the right answer around
the fifth, and it never includes the reduced-motion treatment, the compositor
discipline, the `@supports` fallback, or the fact that the `animation`
shorthand silently resets `animation-timeline`.
