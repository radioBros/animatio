# View transitions

`@view-transition { navigation: auto }` gives **cross-document page transitions
on a plain multi-page site with no JavaScript at all**. Most people assume this
needs a router library. It does not.

```html
<body class="an-vt-fade">
```

Chrome 126+, Safari 18.2+. Not in Firefox stable yet.

## Why this needs no `@supports`

The degradation is unusually clean. An unsupporting browser simply navigates
normally, and `view-transition-name` is an unknown property that gets dropped at
parse time. Nothing breaks and nothing hides — so unlike the scroll module this
ships ungated, with only the `@support-status` annotation.

## The transitions

`an-vt-fade`

## Shared elements

```html
<!-- list page -->
<img class="an-vt-morph" style="--an-vt-name: post-42">

<!-- detail page -->
<img class="an-vt-morph" style="--an-vt-name: post-42">
```

The image morphs between pages. `an-vt-morph` takes `--an-vt-name`.

## Gotchas — the same class as the glass ones

- **`view-transition-name` forms a stacking context**, exactly like `filter`
  does. Adding `an-vt-morph` to a card can change how `z-index` resolves inside
  it.
- **The transition layer paints above everything**, including the top layer. A
  `<dialog>`, a popover or a fixed header renders *under* a running transition
  regardless of `z-index`. This surprises everyone exactly once.
- **Names must be unique per document.** Two elements sharing a name skip the
  transition entirely — which is why `an-vt-morph` takes `--an-vt-name` and
  you derive it from a record id.

Source: [CSS View Transitions Module Level 1](https://www.w3.org/TR/css-view-transitions-1/)
