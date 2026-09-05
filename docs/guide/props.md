# The prop API

Four tiers, ordered by how universally they work. **Tiers 1–3 are the contract**
— every value is expressible in all three, in every browser. Tier 4 only
improves ergonomics where it lands.

## Tier 1 — inline custom properties

Arbitrary values, universal support. This is the primary contract.

```html
<div class="an an-fadeInUp"
     style="--an-duration: 1.2s; --an-delay: .35s; --an-distance: 4rem"></div>
```

## Tier 2 — data attributes

CSS-only presets, universal support.

```html
<div class="an an-fadeInUp"
     data-an-speed="slow" data-an-ease="spring" data-an-repeat="infinite"></div>
```

`data-an-speed` · `-delay` · `-repeat` · `-direction` · `-ease` · `-range`

## Tier 3 — utility classes

compatible with the classic names, so a migration keeps working.

```html
<div class="an an-fadeInUp an-slow an-delay-2s an-ease-spring"></div>
```

`an-slower` `an-slow` `an-fast` `an-faster` · `an-delay-1s`…`an-delay-5s` ·
`an-repeat-1|2|3` `an-infinite` · `an-reverse` `an-alternate` `an-paused` ·
`an-origin-*` · `an-ease-*`

## Tier 4 — typed `attr()`

The nicest form, Chrome 133+. Arbitrary values straight from plain attributes.

```html
<div class="an an-fadeInUp" data-an-duration="1.4s" data-an-angle="12deg"></div>
```

The `@supports` guard around this is **load-bearing**, and for a subtler reason
than "the feature is missing". A custom property accepts almost any token
sequence at parse time, so in a browser without typed `attr()` the declaration
does *not* fail — it succeeds, and only becomes invalid later at `var()`
substitution, where the fallback no longer applies and `animation-duration`
drops to its initial `0s`. Every animation would silently become instant.

Belt and braces: the timing and geometry tokens are also `@property`-registered,
so a leaked bad value degrades to a sane `initial-value`.

## Token reference

| Token | Type | Default |
|---|---|---|
| `--an-duration` | `<time>` | `1s` |
| `--an-delay` | `<time>` | `0s` |
| `--an-ease` | easing | `ease` |
| `--an-iterations` | number / `infinite` | `1` |
| `--an-direction` | keyword | `normal` |
| `--an-fill` | keyword | `both` |
| `--an-play` | `running` / `paused` | `running` |
| `--an-origin` | position | `50% 50%` |
| `--an-distance` | length-percentage | `100%` |
| `--an-distance-big` | length-percentage | `2000px` |
| `--an-angle` | `<angle>` | per effect |
| `--an-scale-from` | number | `.3` |
| `--an-blur-from` | length | `12px` |
| `--an-perspective` | length | `1200px` |
| `--an-stagger` | `<time>` | `80ms` |
| `--an-i` | number | `0` |

## Easing

`linear ease in out in-out sine quad cubic quart quint expo circ back back-in
back-out spring spring-soft spring-hard bounce snap overshoot`

The springs use `linear()` where supported, with a `cubic-bezier()`
approximation behind `@supports not (animation-timing-function: linear(0, 1))`.
