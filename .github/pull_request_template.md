## What this adds

<!-- The effect or fix, in a sentence. -->

## Why it belongs in the library

<!-- An effect that is two lines of CSS is usually better inlined in the app
     that needs it. What makes this worth shipping to everyone? -->

## Preview

<!-- A screenshot or a short clip of the gallery tile. The gates cannot see
     "this looks like nothing", so this is the part a human has to check. -->

## Checklist

- [ ] `npm run verify` passes (build, 22 gates, tests)
- [ ] The effect has a preview subject it can actually act on
      (`docs/.vitepress/theme/preview-content.mjs`)
- [ ] Every tunable value is an `--an-*` token **with a fallback**
- [ ] No runtime JavaScript in the library
- [ ] Checked in a browser, not only in CI
