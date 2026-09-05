# Glass & surfaces

```html
<nav class="an-glass an-noise">…</nav>
```

Blur, saturation, a specular top edge, a seated bottom edge, and a four-layer
shadow. Every `var()` carries its fallback inline, because a bare `var()` with
the token unset invalidates the *whole* `box-shadow` and you lose all four
layers, not one.

## Tokens

| Token | Default |
|---|---|
| `--an-glass-blur` | `16px` |
| `--an-glass-tint` | `#fff` |
| `--an-glass-alpha` | `12%` |
| `--an-glass-sat` | `1.6` |
| `--an-glass-radius` | `1rem` |

Variants: `an-glass-dark`, `an-glass-frost`, `an-glass-real`.
`-tooltip`, `-edge`, `-flat`.

## Grain

`an-noise` is a real `feTurbulence type="fractalNoise"` — rendered to a
data-URI **background-image**, not referenced as a filter. That distinction is
the whole reason it works everywhere.

`--an-noise-frequency` changes the grain.

## The SVG sprite

`an-svg-goo` needs `assets/animatio-filters.svg` pasted into your page once:

```html
<svg width="0" height="0" aria-hidden="true" style="position:absolute">
  <!-- contents of animatio-filters.svg -->
</svg>
```

The prefix **is** the install instruction, and `check:svg-naming` enforces that
in both directions: no `filter: url()` outside an `an-svg-*` class, and no
referenced filter id missing from the sprite.

## Real refraction — `an-glass-real`

`an-glass` blurs what is behind it. `an-glass-real` **refracts** it:
`feTurbulence type="fractalNoise"` generates a distortion field and
`feDisplacementMap in="SourceGraphic"` pushes the backdrop along it, so edges
bend the way they do through actual glass.

```html
<html data-an-refract="on">
<div class="an-glass-real">…</div>
```

It is opt-in behind that attribute for one reason: `backdrop-filter: url()`
renders nothing in WebKit ([bug 245510](https://bugs.webkit.org/show_bug.cgi?id=245510))
and only some cases in Chromium — and the obvious guard is worse than none.
`@supports (backdrop-filter: url("#x"))` tests whether the declaration *parses*,
not whether it *renders*, so it returns true in Safari and switches the broken
path on. Set the attribute after your own render probe. Without it the class is
plain `an-glass`: good-looking, just not refractive.

## Gotchas

- `filter` and `backdrop-filter` create a **containing block**. A
  `position: fixed` descendant becomes relative to the glass element, so
  dropdowns, popovers and modals inside glass break. This is the #1 support
  question for every glass library.
- They also create a **stacking context**, so `z-index` inside behaves
  differently.
- Nested glass double-blurs — set `--an-glass-blur: 0` on the inner one.
- `feDisplacementMap` over a live backdrop is the most expensive thing in the
  library. Cap it at ~2 per viewport.
