# Install & tree-shaking

```bash
npm i @radiobros/animatio
```

## The quickest thing that works

```html
<link rel="stylesheet" href="node_modules/animatio/dist/animatio.min.css">
```

20.6 KB gzipped for all 392 classes. Fine for a prototype or a CodePen. For
production, shake it.

## Tree-shaking

Animatio **generates** the classes your content uses rather than building
everything and deleting the rest. That matters for three specific reasons:

1. **Keyframes come along automatically.** A pruner has to know that
   `.an-fadeInUp` depends on `@keyframes an-fadeInUp`. Orphan-keyframe removal is
   where every naive purge setup silently breaks an animation library.
2. **`@property` registrations are dependency-tracked** the same way.
3. **Accessibility blocks travel with their effect.** A performance feature that
   silently drops `prefers-reduced-motion` would be the worst possible trade, so
   it is structurally impossible here rather than a code comment.

### With a bundler

```js
// vite.config.js
import animatio from "@radiobros/animatio/vite";

export default {
  plugins: [animatio({ content: ["src/**/*.{vue,jsx,tsx,html}"] })],
};
```

```js
import "@radiobros/animatio";  // resolves to the generated subset
```

`animatio/webpack`, `animatio/rollup`, `animatio/esbuild` and `animatio/postcss`
are the same engine behind a different wrapper — none is a reimplementation, so
they cannot drift.

### Without one

```bash
npx animatio init      # writes animatio.config.js
npx animatio build --watch
```

Covers Rails, Laravel, Django, WordPress and plain HTML.

### Config

```js
export default {
  content: ["./src/**/*.{html,vue,jsx,tsx}"],
  output: "./public/animatio.css",
  include: [],                    // whole modules, always emitted
  exclude: ["compat"],
  safelist: ["an-fadeInUp", /^an-glass-/],
  layer: true,
  report: true,
};
```

## The one thing to know

Static extraction cannot see a class name assembled at runtime. No scanner in
any library can:

```vue
<div :class="`an-${effect}`">   <!-- ✗ invisible to the extractor -->
```

Two answers, the same two Tailwind has:

```vue
<div :class="effect">           <!-- ✓ whole names in source -->

<script setup>
const map = { in: "an-fadeInUp", out: "an-fadeOutDown" };  // ✓ extractable
</script>
```

…or `safelist` for genuinely runtime-driven cases — a CMS field, a user setting.

**In dev, you get a warning rather than a mystery.** The plugin injects a
`MutationObserver` that logs the moment an `an-*` class is applied that is not in
your build:

```
[animatio] "an-zoomInDown" was applied at runtime but is not in your build.
```

It never ships to production. It turns the classic works-in-dev-breaks-in-prod
purge failure into a console line at the moment it happens.

## What you can expect

| Site | Full | Shaken |
|---|---|---|
| Marketing page — 17 classes, scroll reveals, glass nav | 20.6 KB | **3.3 KB** |
| Blog — fades and slides only | 20.6 KB | ~1.5 KB |
| App — 30 effects, atoms, loaders | 20.6 KB | ~7 KB |

Every one of these is a CI fixture, so the numbers cannot rot.

## Zero-tooling fallback

If you would rather not add a build step, the SCSS toggles are coarse but free:

```scss
@use "@radiobros/animatio" with ($emit-fx: false, $emit-compat: false);
```

Or take a single module: `dist/modules/parity.css` is 4.6 KB gzipped on its own.
