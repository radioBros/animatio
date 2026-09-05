# Accessibility

Not bolted on at the end. The `prefers-reduced-motion` block is **generated from
the compiled CSS**, so every animating selector has a treatment — and a new
effect cannot ship without one.

That mattered more than it sounds. Most of the fx catalogue — `an-marquee`,
`an-bg-aurora`, `an-spinner`, `an-neon-flicker` — animates without ever carrying
the `.an` engine class. A hand-written selector list would have silently missed
the majority of the library, which is the exact failure this section exists to
prevent. **272 selectors** are covered, and `check:reduced-motion` fails the
build if that ever stops matching what actually animates.

## The buckets

Different motion needs different handling, so "make it 1 ms" is not applied
uniformly:

| Kind | Treatment | Why |
|---|---|---|
| Decorative entrances | `1ms` | Content appears, no motion |
| Ambient loops — marquee, float, aurora, blobs | `paused` | Stopped, not fast-forwarded |
| Flashing — glitch, CRT, VHS, neon flicker | `animation-name: none` | WCAG 2.3.1 seizure risk. Removed outright, not shortened |
| Scroll-linked | timeline unbound, name `none` | Shows the end state |
| **Loaders — spinners, dots, bars, skeletons** | **kept, slowed 1.6×** | WCAG 2.3.3 exempts *essential* motion. A frozen spinner reads as a hung page |

`an-motion-ok` opts any effect into the essential-motion treatment.

## Other queries

- **`prefers-reduced-transparency: reduce`** → every glass surface goes opaque.
  Without this the module would not be defensible at all.
- **`prefers-contrast: more`** → glass borders go solid, gradient text goes flat
  to `CanvasText`.

## Flashing

Everything in the glitch and CRT families is capped **below 3 Hz** by design,
and removed entirely under reduced motion.

## Generated content

`an-count-up` uses `counter()` and `content`, which are **not exposed to
assistive technology**. Always pair it with the real value:

```html
<span class="an-count-up" style="--an-count-to: 1200" aria-label="1200"></span>
```

## Markup helpers

Effects marked ◑ need extra elements. Those elements are decorative — give them
`aria-hidden="true"` and keep the real content in the element itself.

## Hover-only content

Anything the library reveals on hover is also reachable on `:focus-within`, so
keyboard and touch users get to it. That was not true of three effects in an
early build; the fallback test caught it.
