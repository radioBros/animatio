# Contributing

Animatio is MIT licensed. Contributions are welcome, and adding an effect is
meant to be a small, well-lit job — the build tells you what you got wrong
rather than leaving it for someone to find in a preview later.

```bash
npm install
npm run verify      # build, 22 gates, 36 tests — run this before you push
npm run docs:dev    # the gallery, with the SCSS hot-reloading
```

## Adding an effect

**1. Write it in `src/`.** Pick the module it belongs to (`fx/_text.scss`,
`fx/_borders.scss`, `surfaces/_index.scss`, …). Use the helpers rather than raw
selectors, so the prefix stays configurable:

```scss
#{s("your-effect")} {
  animation-name: #{kf("your-effect")};
  animation-duration: #{v(duration, 1.2s)};
}

@keyframes #{kf("your-effect")} { … }
```

- `s("name")` → `.an-name`, honouring `$prefix`.
- `kf("name")` → the keyframe name, same prefix.
- `v(token, fallback)` → `var(--an-token, fallback)`. **Always give a fallback**
  — `check:var-fallbacks` fails without one, because a bare `var()` with the
  token unset invalidates the whole declaration.

**2. Give it a preview subject.** `docs/.vitepress/theme/preview-content.mjs`
maps a class to what the gallery renders it on. This matters more than it
sounds: a `clip-path` against a transparent glyph shows nothing, a backdrop
filter over a flat page shows nothing, and a pale sweep on a light panel shows
nothing. Pick a subject the effect can actually act on — `plate`, `image`,
`compare`, `glass`, `slab`, `word`, `draw`, `cards`, `skeleton`, `badge`, or an
icon.

**3. Run `npm run verify`.** Twenty-two gates. The ones you are most likely to
meet:

| Gate | What it catches |
|---|---|
| `check:var-fallbacks` | a `var()` with no fallback |
| `check:reduced-motion` | an animating selector with no `prefers-reduced-motion` treatment |
| `check:selectors` | a trailing comma — `.a, { }` compiles and then matches nothing |
| `check:layers` | a rule outside its cascade layer |
| `check:numbers` | a count or size quoted in the docs that no longer matches the build |
| `check:preview-map` | the same class mapped twice; the later entry silently wins |

**4. Check the preview in a browser.** The gates cannot see "this looks like
nothing". The audits can:

```bash
npm run docs:build && npm -w docs run preview
# then, against the running gallery:
$B eval tools/audit-play.mjs      # clicks every play-once tile, diffs mid-animation
$B eval tools/audit-hover.mjs     # every :hover rule matches a real node
$B eval tools/audit-gallery.mjs   # overflow, empty, inert at rest
$B eval tools/audit-shape.mjs     # nothing circular drawn as an ellipse
```

Every one of those exists because a preview shipped broken and no test noticed.

## House rules

- **CSS only.** No runtime JavaScript in the library. If an effect needs JS it
  belongs on the limits page with the nearest honest substitute, not in `dist/`.
- **Tokens, not magic numbers.** Every distance, angle, duration and colour a
  consumer might want to change is a `--an-*` token with a fallback.
- **Reduced motion is generated, not hand-written.** The build derives the
  `prefers-reduced-motion` block from the compiled CSS, so a new effect is
  covered automatically — but only if it animates through `animation-name`.
- **One channel per atom.** An atom in `src/atoms/` writes exactly one
  registered `@property` channel and its `--an-anim-<channel>` slot, never
  `animation-name` directly. Two atoms that both wrote `animation-name` would
  collide and one would silently win — which is the whole problem atoms exist to
  solve.
- **Name it for what it does**, and check `check:collisions` does not think it
  is a near-duplicate of something that already exists.

## Adding a parity preset

`src/effects/manifest.json` holds the 97 classic presets, and they are authored
by `tools/author-parity.mjs` from our own motion model — overshoots come from
one damped-oscillator function rather than from stops picked by eye. Edit the
authoring script and re-run it; do not hand-edit the generated `raw` blocks, and
do not copy keyframes from another library. A test fails if the signature values
of one particular other library reappear.

## Removing an effect

`tools/removals.json` records every removed class and which test it failed:
duplicate, trivial, or novelty. `check:removed` verifies against the **compiled
CSS**, not the source — a class generated in a loop can survive an edit that
looks complete. `tools/prune-keyframes.mjs` clears the keyframes left behind.

## Pull requests

Say what the effect does and why it earns its place in a library rather than in
the consuming app — an effect that is two lines of CSS is usually better inlined.
Include a screenshot or a short clip of the preview. `npm run verify` must pass.
