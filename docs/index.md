---
layout: page
title: Animatio — CSS-only animation
sidebar: false
aside: false
outline: false
pageClass: home
---

<AnHero />

<section class="site-section site-section--tight">

<div class="site-head">

## Effects that stack instead of fight

Two effects that both write `transform` will always fight: the last one declared
wins and the other silently does nothing. Animatio's atoms each own a single
registered channel, so stacking them composes. Click either box — the count is
read off the live element, not written into the caption.

</div>

<AnCompose />

</section>

<section class="site-section">

<div class="site-head">

## Animations

Entrances, exits and attention seekers, all 135 of them. Click any tile to run
it: nothing on this site autoplays.

</div>

<AnGallery size="lg" compact :names="[
  'an-fadeInUp','an-bounceIn','an-rubberBand','an-swing','an-heartBeat','an-tada',
  'an-flipInX','an-zoomInDown','an-lightSpeedInRight','an-rollIn','an-jackInTheBox','an-hinge',
]" />

<p class="site-note">
**MIT licensed — free and open source**, for commercial work too, with no
obligation to open your own source.
[Contributions welcome](https://github.com/radioBros/animatio/blob/master/CONTRIBUTING.md).

<a href="/gallery">Browse all 392</a>, or read about
<a href="/guide/atoms">the atoms that stack</a>.
</p>

</section>

<section class="site-section">

<div class="site-head">

## Effects

Glass, text treatments, borders, loaders, backgrounds. These are surfaces
rather than animations, so they simply are: nothing to press play on.

</div>

<AnGallery size="lg" compact :names="[
  'an-glass','an-glass-real','an-border-beam','an-svg-goo','an-blob-morph',
  'an-text-gradient-anim','an-text-metal','an-glitch','an-neon','an-bg-mesh',
  'an-marquee','an-ticker','an-ticker-block','an-spinner','an-dots','an-bars','an-count-up',
]" />

<p class="site-note">
Tune them live in the <a href="/surfaces">surfaces studio</a>.
</p>

</section>

<section class="site-section">

<div class="site-head">

## Scroll, with a real demo

Three tiers, from native <code>animation-trigger</code> down to plain visible
content. No scroll listener, no observer, no library.

</div>

<p class="site-note">
The <a href="/scroll-lab">scroll lab</a> runs the whole ladder and tells you
which tier your browser resolved to.
</p>

</section>

<section class="site-section">

<div class="site-head">

## What you get

</div>

<dl class="site-facts">
  <div><dt>97</dt><dd>classic entrance, exit and attention presets, generated from a pinned fixture so the timing is byte-identical</dd></div>
  <div><dt>24</dt><dd>composable atoms, each owning one <code>@property</code> channel</dd></div>
  <div><dt>3</dt><dd>scroll-reveal tiers, from native <code>animation-trigger</code> down to plain visible content</dd></div>
  <div><dt>272</dt><dd>animating selectors, every one with a reduced-motion treatment generated from the compiled CSS</dd></div>
  <div><dt>20.6 KB</dt><dd>gzipped, for all of it</dd></div>
  <div><dt>3.5 KB</dt><dd>gzipped, for a real page after tree-shaking</dd></div>
  <div><dt>0</dt><dd>runtime dependencies, and nothing to hydrate</dd></div>
</dl>

<p class="site-note">
Every number above is asserted by a CI gate or a test, so none of them can rot.
</p>

</section>

<section class="site-section">

<div class="site-head">

## Where it degrades, and where it stops

Published up front rather than discovered in production.

</div>

<div class="site-split">
<div>

**Scroll reveals** resolve through three tiers and never hide what they cannot
show again. In Firefox stable, which still has scroll-driven animations behind a
flag, content simply renders finished and readable.
[Check what your browser does](/support).

**`backdrop-filter: url()` is broken**, not merely unsupported: WebKit parses it
and renders nothing, so `@supports` returns true and would switch the broken
path on. Refraction is opt-in behind an attribute you set after your own probe.

</div>
<div>

**Cursor tracking, text scramble and particles are not possible in CSS.** They
are on the [limits page](/limits) with the nearest honest substitute for each,
rather than shipped as options that quietly do nothing.

**Loaders keep running under reduced motion.** WCAG 2.3.3 exempts essential
motion, and a frozen spinner reads as a hung page. Ambient loops pause, flashing
effects are removed outright.

</div>
</div>

</section>
