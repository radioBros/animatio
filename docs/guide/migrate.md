# Migrating from animate.css

## Option 1 — change nothing

```html
<link rel="stylesheet" href="animatio.compat.css">
```

Every original class name is aliased, and `--animate-duration`,
`--animate-delay` and `--animate-repeat` map onto the Animatio tokens. Your
existing markup keeps working untouched.

The alias list is generated from the same manifest as the real classes, so it
cannot drift.

## Option 2 — one find-and-replace

`animate__` → `an-`

```diff
- <div class="animate__animated animate__fadeInUp animate__delay-2s">
+ <div class="an an-fadeInUp an-delay-2s">
```

`animate__animated` becomes `an`. Everything else keeps its name — the parity
classes are deliberately camelCase for exactly this reason.

## What you gain

**Tunable geometry.** Distances, angles and origins are tokens now:

```html
<div class="an an-fadeInLeftBig" style="--an-distance-big: 600px">
```

**Composition.** `fadeIn` + `slideInUp` silently conflicted; atoms do not:

```html
<div class="an an-fade an-up">
```

**Per-effect reduced motion**, rather than one blanket rule.

**Tree-shaking.** 18 KB becomes 3.3 KB.

## What is identical

The timing. The parity module is *generated* from the pinned animate.css 4.1.1
fixture rather than transcribed, so keyframe percentages and easing are
byte-identical. `check:catalogue` diffs against that fixture on every build.

One correction found along the way: animate.css has **97** effect classes and 97
keyframes, a clean 1:1 — not the 93 commonly quoted, which comes from a
line-anchored grep that misses compound selectors.

## The one gotcha

The 3D family wants an ancestor with `perspective`:

```html
<div class="an-3d">
  <div class="an an-flipInX">…</div>
</div>
```

The parity classes also carry their own `perspective`, so a drop-in migration
keeps working without markup changes — but the wrapper gives better control.

## And the scrollbar bug

animate.css's single most-reported issue is `slideInLeft` creating page
scrollbars. Wrap it:

```html
<div class="an-card-peek">
  <div class="an an-slideInLeft">…</div>
</div>
```
