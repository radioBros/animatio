# Introduction

Animatio is a CSS-only animation and effects library. No runtime, no framework,
nothing to hydrate — a stylesheet and some class names.

```html
<link rel="stylesheet" href="animatio.min.css">
<div class="an an-fadeInUp">Hello</div>
```

`an` is the engine class: it reads the timing tokens. `an-fadeInUp` is the
effect. Everything else is a variation on that pair.

## The four modules

| Module | What it is |
|---|---|
| **Parity** | All 97 classic presets, generated from a pinned fixture so the timing is byte-identical — but with every distance, angle and origin turned into a tunable token. |
| **Atoms** | Single-channel effects that *stack*. `an-fade` owns opacity, `an-up` owns translate-Y, so both apply. A monolithic library structurally cannot do this. |
| **Scroll** | `an-reveal` (fires on entry) and `an-scrub-*` (follows the scrollbar), with a documented three-tier fallback. |
| **Surfaces & fx** | Glass, grain, and 169 effects: gooey, glitch, neon, holographic, gradients, loaders, borders, reveals, 3D, view transitions. |

## Presets or atoms?

**Presets for entrances, atoms for choreography.**

A preset is one monolithic keyframe that writes `transform` directly, which
keeps it on the compositor. An atom animates a registered `@property` channel,
which composes but runs on the main thread.

Do not put both on one element — the preset's `transform` wins and the atom
silently does nothing. The dev-mode guard warns you if you try, and
`check:modes` fails the build if a fixture or docs page ever does it.

```html
<div class="an an-fadeInUp">        <!-- ✓ preset alone -->
<div class="an an-fade an-up">      <!-- ✓ atoms together -->
<div class="an an-fadeInUp an-up">  <!-- ✗ mixed modes -->
```

## Cascade layers

Everything ships inside `@layer animatio.*`, in this order:

```
tokens, base, effects, atoms, scroll, surfaces, fx, vt, props, util
```

Two consequences, both deliberate: any **un-layered** CSS of yours beats the
whole library, so there are no `!important` wars; and `props` sits after
`effects`, so a `data-an-speed` attribute wins over an effect's own duration
with no specificity hacks.

If layers fight your stack, `dist/animatio.nolayer.css` is the same CSS without
them.

## Configuring the prefix

```scss
@use "@radiobros/animatio" with ($prefix: "fx", $emit-fx: false, $mode: "fast");
```

Class names and custom properties both follow the prefix — `.fx-fadeInUp`,
`--fx-duration`. Nothing in the source hardcodes `an-`.
