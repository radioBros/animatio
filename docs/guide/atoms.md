# Composable atoms

This is the layer a monolithic animation library structurally cannot have.

```html
<div class="an an-fade an-up an-scale-in"></div>
```

## Why presets cannot stack

`fadeIn` and `slideInUp` both write `transform` in their keyframes. Two
animations writing the same property means the last one declared wins and the
other silently does nothing — it looks like a library bug, and it is a model
limitation.

<AnCompare />

## How atoms fix it

Each atom animates exactly one `@property`-registered channel:

```css
@property --an-y {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}

@keyframes an-up {
  0%   { --an-y: var(--an-distance, 100%); }
  100% { --an-y: 0px; }
}
```

One grouped rule assembles every channel into a single transform:

```css
.an-fade, .an-up, .an-scale-in, … {
  transform: translate3d(var(--an-x, 0px), var(--an-y, 0px), var(--an-z, 0px))
             rotateX(var(--an-rx, 0deg)) rotateY(var(--an-ry, 0deg))
             rotateZ(var(--an-rz, 0deg)) skew(var(--an-kx, 0deg), var(--an-ky, 0deg))
             scale3d(var(--an-sx, 1), var(--an-sy, 1), 1);
  opacity: var(--an-o, 1);
  filter: blur(var(--an-bl, 0px));
}
```

So two atoms touching different channels compose. Two touching the *same*
channel still conflict — that is inherent, which is why the channel each atom
owns is listed here.

## The atoms

| Channel | Atoms |
|---|---|
| opacity — `--an-o` | `an-fade` `an-fade-out` |
| translate — `--an-x/y/z` | `an-up` `an-down` `an-left` `an-right` `an-in-z` `an-out-z` |
| scale — `--an-sx/sy` | `an-scale-in` `an-scale-out` `an-scale-x` `an-scale-y` `an-pop` |
| rotate — `--an-rx/ry/rz` | `an-spin` `an-spin-x` `an-spin-y` `an-tilt-in` `an-roll` |
| skew — `--an-kx/ky` | `an-skew-in` `an-skew-x` `an-skew-y` |
| blur — `--an-bl` | `an-blur-in` `an-blur-out` `an-focus` |

## The trade-off, stated plainly

Var-driven animation is **not compositor-accelerated** — each frame re-resolves
`transform` on the main thread. Monolithic preset keyframes *are*.

Neither wins outright, which is why both ship, authored from one source and
emitted in two forms. **Presets for entrances, atoms for choreography** — and
never both on one element, or the preset's `transform` wins and the atom does
nothing. `check:modes` and the dev-mode guard both catch that.
