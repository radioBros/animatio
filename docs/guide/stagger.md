# Stagger

```html
<ul class="an-stagger" style="--an-stagger: 60ms">
  <li class="an an-fadeInUp">One</li>
  <li class="an an-fadeInUp">Two</li>
  <li class="an an-fadeInUp">Three</li>
</ul>
```

`:nth-child` rules set `--an-i` up to `$stagger-max` (24 by default). Past that,
set `--an-i` inline — the formula is identical either way.

## Why the index inherits

Both `--an-i` and `--an-stagger` are registered with `inherits: true`, and the
delay is computed on the **animated** element rather than the indexed one:

```css
.an-stagger > .an,
.an-stagger > .an-reveal > .an {
  animation-delay: calc(var(--an-delay, 0s) + var(--an-i) * var(--an-stagger));
}
```

That is what makes stagger survive a scroll-reveal wrapper, where the indexed
element and the animated element are different nodes:

```html
<ul class="an-stagger">
  <li class="an-reveal">                 <!-- index lands here -->
    <div class="an an-fadeInUp">…</div>  <!-- animation is here -->
  </li>
</ul>
```

Without the inheritance the `:nth-child` delay would land on the wrapper, which
runs only the latch animation — so the element that actually animates would get
no delay at all and the whole list would fire at once. A staggered, scroll-
revealed list is the single most common real use of this library, so it is worth
knowing why it works.

The index carries **exactly one level** — through a wrapper and no further. An
icon nested deeper inside an animated card keeps its own delay rather than
silently inheriting the card's index, which would be the same class of bug in
the opposite direction.

## Variants

- `an-stagger-reverse` — last child first
- `an-stagger-stop` — resets `--an-i` for a subtree that should opt out
