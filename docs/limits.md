# What this library cannot do

Publishing the limits is a differentiator, not a weakness. Every competitor
hides them and users find out in production.

| Want | Why CSS cannot | What Animatio ships |
|---|---|---|
| Cursor-following spotlight, magnetic pull | CSS has no access to pointer coordinates | `an-spotlight-static` and `an-hover-tilt-grid` (genuinely CSS-only, via hover zones), plus a 6-line feed that sets `--an-mx`/`--an-my` — the effect stays in our CSS |
| Text scramble | CSS cannot author text content | `an-text-flip-chars` — each glyph flips in place to reveal the final one |
| Per-character animation without spans | There is no `::nth-letter()` | Split snippets + `--an-i` for the stagger |
| Velocity-reactive physics, collisions | No runtime state in CSS | `linear()` spring curves, which cover most of the *feel* |
| Particles, canvas, WebGL | A different rendering model | Nothing. Use three.js, and we will say so. |
| Scroll "once" in Firefox today | CSS cannot latch a scrubbed timeline | The tier ladder, plus an optional 12-line enhancer |
| SVG refraction in Safari | [webkit #245510](https://bugs.webkit.org/show_bug.cgi?id=245510) | `an-glass` plus an opt-in refract path |

## The `once` problem, in detail

`animation-timeline: view()` binds progress to scroll *position*. So:

- **Back-and-forth is free.** It is the default, not a feature.
- **Play-once is the hard case.** A scrubbed timeline cannot be latched in pure
  CSS — [confirmed by the spec author](https://www.bram.us/2023/10/05/run-a-scroll-driven-animation-only-once/).

Animatio exposes this as two class families rather than pretending one API does
both: `an-scrub-*` follows the scrollbar, `an-reveal` fires on entry. `an-reveal`
then resolves through three tiers, and the docs tell you which one you are on.

If you need true `once` in Firefox today, `animatio/once.js` is twelve lines of
`IntersectionObserver`. It is never referenced by the CSS and nothing requires
it. Honest framing beats a "CSS ONLY" claim that quietly is not.

## Markup helpers, not CSS

Some effects need extra elements. They are marked ◑ throughout, and each ships a
copy-paste snippet:

- `an-glitch` needs `data-text` duplicated for its two pseudo-layers
- `an-text-split-*` needs one span per character
- `an-flip-card` needs a front/back pair
- `an-marquee` needs the track duplicated for a seamless loop
- `an-hover-tilt-grid` needs nine hover zones

That is a markup helper, not CSS-only, and calling it anything else would be a
lie you would discover at implementation time.
