# Browser support

Animatio ships the bleeding edge and annotates it rather than withholding it.
Every rule built on a not-yet-widely-supported feature carries a machine-readable
`@support-status` comment that survives minification — so the answer is in the
CSS you actually downloaded.

## What *your* browser does

<AnProbe />

## The policy

Animatio targets the **current and previous two versions** of Chrome, Edge,
Safari and Firefox, plus iOS Safari and Chrome Android. Everything outside that
renders the baseline layer — ordinary CSS animation, always leaving content
visible and readable.

No IE. No polyfills. No `@supports` around widely-available features.

## The one thing that is gated

Rule §2.2 of the design: **any rule that hides content lives inside
`@supports` and nowhere else.** That is a correctness rule, not caution about
market share — `opacity: 0` in a base scroll class means a permanently invisible
page in Firefox stable.

The build proves it. `dist/test/animatio.nosda.css` rewrites every scroll-driven
`@supports` condition to something guaranteed false, so any engine renders the
fallback path, and the test suite asserts that nothing is hidden there. That is
reproducible forever, unlike a browser flag whose name drifts.

## The one thing that is broken, not unsupported

`backdrop-filter: url(#svgFilter)`. WebKit parses it and renders nothing
([bug 245510](https://bugs.webkit.org/show_bug.cgi?id=245510)); Chromium handles
only some cases.

`@supports` tests whether a declaration **parses**, not whether it **renders**,
so the obvious guard returns `true` in Safari and switches the broken path *on*.
It looks safe and is actively harmful. Refraction is therefore opt-in:

```html
<html data-an-refract="on">
```

Set it after your own render probe. If you would rather not run one, do not use
refraction — `an-glass` already looks good.
