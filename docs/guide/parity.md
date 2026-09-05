# Parity presets

All 97 classic effects, with every hardcoded value turned into a token.

They are **generated**, not transcribed. `tools/import-animate-css.mjs` parses
the pinned `test/fixtures/animate-4.1.1.css` and emits the manifest the SCSS
mixin builds from. Hand-copying 97 keyframes is where subtle percentage and
easing errors enter, and there is no way to detect them afterwards.

<AnPreview name="an-fadeInUp" markup="fadeInUp" :tokens="['duration','delay','ease']" />

<AnPreview name="an-bounceIn" markup="bounceIn" :tokens="['duration','delay','ease']" />

<AnPreview name="an-zoomInDown" markup="zoomInDown" :tokens="['duration','delay','ease']" />

<AnPreview name="an-rubberBand" markup="rubberBand" :tokens="['duration','delay','ease']" />

<AnPreview name="an-lightSpeedInRight" markup="lightSpeedInRight" :tokens="['duration','delay','ease']" />

[Browse all 97 in the gallery →](/gallery)

## The families

**Attention (12)** — bounce · flash · pulse · rubberBand · shakeX · shakeY ·
headShake · swing · tada · wobble · jello · heartBeat

**Back (8)** · **Bouncing (10)** · **Fading (26)** · **Flippers (5)** ·
**Lightspeed (4)** · **Rotating (10)** · **Specials (4)** · **Zooming (10)** ·
**Sliding (8)**

## What changed

| Classic name | Animatio |
|---|---|
| `3000px` / `2000px` | `var(--an-distance-big, …)` |
| `100%` travel | `var(--an-distance, 100%)` |
| rotate angles | `var(--an-angle, …)` |
| `transform-origin` | `var(--an-origin, …)` |
| `perspective(400px)` | `var(--an-perspective, 400px)` |
| `-webkit-` duplicates | removed from source, re-added by autoprefixer |

The original value is always the `var()` fallback, so the visual result is
unchanged until you override it:

```html
<div class="an an-fadeInLeftBig" style="--an-distance-big: 600px">
```
