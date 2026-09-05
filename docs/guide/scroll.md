# Scroll

`animation-timeline: view()` binds progress to scroll **position**. That single
fact shapes this entire module:

- **Back-and-forth is free.** It is the default behaviour, not a feature.
- **Play-once is the hard case.** Pure CSS cannot latch a scrubbed timeline.

So there are two class families rather than one API pretending to do both.

| Family | Semantics |
|---|---|
| `an-scrub-*` | Progress follows the scrollbar. Reverses on scroll-up. |
| `an-reveal` | Fires when the element enters, plays at its own speed. |

## Reveals

```html
<div class="an-reveal">
  <div class="an an-fadeInUp">Fires once when it enters</div>
</div>
```

The wrapper is the contract at **every** tier. Tier 2 is structurally a
two-element technique — the latch must live on an ancestor of the element the
style query restyles — and shipping a different markup shape per tier would
break the whole premise of the ladder.

### Modifiers

| Class | Behaviour |
|---|---|
| `an-reveal` | plays once, stays |
| `an-reveal-replay` | restarts on every entry |
| `an-reveal-both` | plays in, **rewinds out** |
| `an-reveal-reset` | plays in, snaps back on exit |
| `an-reveal-hold` | plays in, freezes on exit |

### The three tiers

| Tier | Mechanism | Where |
|---|---|---|
| **3** | `animation-trigger: --t play-once` | Chrome 145+ |
| **2** | style-query latch | Chrome 115+, Safari 26+ |
| **0** | plain CSS, content visible | Firefox stable, older everything |

Tier 2 gives real *trigger* semantics — the animation plays at its own speed
rather than scrubbing — but **replays on every re-entry**. That is documented
rather than hidden.

Tier 0 applies no hidden state at all, so content renders finished and readable.
[Check what your browser resolves to →](/support)

There is deliberately no fourth tier. An earlier design had a "scrub with a
sticky end" rung for engines with view timelines but no style queries: no such
browser exists, and more importantly `@supports` cannot test at-rule support, so
any guard for it would be testing an unrelated property. A safety net that is
not one is worse than none.

### Ranges

```html
<div class="an-reveal"
     style="--an-range-start: entry 20%; --an-range-end: cover 45%">
```

## Scrubs

```html
<div class="an-scrub-up">Progress follows the scrollbar</div>
```

`an-scrub-fade` · `-up` · `-down` · `-left` · `-right` · `-scale` · `-rotate` ·
`-blur` · `-clip`

## Choreography

- `an-parallax` with `--an-parallax-depth`
- `an-progress-bar` / `an-progress-ring` — driven by `scroll(root)`
- `an-sticky-stack` — stacking cards
- `an-hero-shrink` — collapsing header
- `an-timeline-source` / `an-timeline-target` — a parent drives a child

## Stagger inside a reveal

This is the most common real use of the library, and the naive combination does
**not** work: the `:nth-child` index lands on the wrapper, which runs only the
latch, while the animated child gets nothing.

Animatio fixes it by registering `--an-i` as an **inheriting** property and
computing the delay on the animated element:

```html
<ul class="an-stagger" style="--an-stagger: 60ms">
  <li class="an-reveal">
    <div class="an an-fadeInUp">…</div>
  </li>
</ul>
```

The index reaches the child untouched, and the same formula works with or
without a wrapper. It carries exactly one level — an icon nested inside an
animated card keeps its own delay rather than silently inheriting the card's.
