<script setup>
// The thing an effect is applied to.
//
// A grey square tells you nothing. `an-shakeX` should shake a bell, `an-hinge`
// should swing a door, and `an-ticker` should type actual words.
//
// WHERE THE CLASS GOES is the whole problem, and it has three answers:
//
//   animatesChildren  the class goes on the ROOT and the subject must supply
//                     children — an-marquee moves its children, an-dots bounces
//                     them, an-text-wave lifts one span per letter. Putting the
//                     class on a leaf is why marquee and ticker did nothing.
//   text / word /     the class goes on the node that OWNS the text, or
//   panel             background-clip:text has nothing to clip.
//   everything else   the class goes on the root.
//
// `animatesChildren` is derived from the compiled CSS by build-catalogue, not
// listed here by hand.
import { computed, ref, onMounted } from "vue";
import { contentFor } from "../preview-content.mjs";

const props = defineProps({
  name: { type: String, required: true },
  size: { type: String, default: "md" },
  effect: { type: String, default: "" },
  animatesChildren: { type: Boolean, default: false },
  animatesSelf: { type: Boolean, default: false },
});

const RAW = import.meta.glob("../icons/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});

const icons = Object.fromEntries(
  Object.entries(RAW).map(([path, svg]) => [
    path.split("/").pop().replace(".svg", ""),
    svg,
  ])
);

const content = computed(() => contentFor(props.name));
const kind = computed(() => content.value.kind);

const svg = computed(() =>
  kind.value === "icon" ? icons[content.value.icon] || icons.star : null
);

// Kinds that exist purely to supply an effect's documented child contract.
// The wrapper they render IS the element the selectors name, so the class goes
// there even though the effect drives descendants -- animatesChildren would
// otherwise push it up to the root and `> .an-peek` would match nothing.
const CONTRACT = [
  "zones", "arrow", "label", "peek", "morph", "plate", "draw", "glass",
  "skeleton", "badge", "slab", "split", "cards", "compare",
];

// A class that drives descendants must sit above them.
const onRoot = computed(
  () =>
    !CONTRACT.includes(kind.value) &&
    // onFrame means the effect names `> img`, so it must sit on the wrapper.
    // animatesChildren would otherwise push it up to the subject root, where
    // its only child is the frame and the selector matches nothing.
    !content.value.onFrame &&
    (props.animatesChildren ||
      ![
        "text", "word", "panel", "ticker", "number", "rule", "image", "blob",
      ].includes(kind.value))
);
const rootEffect = computed(() => (onRoot.value ? props.effect : ""));
const leafEffect = computed(() => (onRoot.value ? "" : props.effect));

// an-img-blur-load clears its blur when the image reports itself loaded. The
// tile remounts this component on click, so starting unloaded and releasing a
// beat later replays the blur-up every time it is clicked -- which is the
// effect's actual behaviour, not a simulation of it.
const loaded = ref(false);
onMounted(() => setTimeout(() => (loaded.value = true), 450));

const chars = computed(() => [...(content.value.text || "")]);

// an-marquee moves its CHILDREN; an-text-marquee moves ITSELF. Same visual,
// opposite placement, so the track carries the class in the second case.
const trackEffect = computed(() =>
  kind.value === "marquee" && props.animatesSelf && !props.animatesChildren
    ? props.effect
    : ""
);

// A 12x9 raster, scaled up. Small on purpose: pixelation, dithering and
// halftone are only legible when the source really is low resolution.
const PHOTO_HD =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='240'%3E%3Cdefs%3E%3ClinearGradient id='s' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23123a6b'/%3E%3Cstop offset='.55' stop-color='%23e2743a'/%3E%3Cstop offset='1' stop-color='%23f6c163'/%3E%3C/linearGradient%3E%3ClinearGradient id='w' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23b4562c'/%3E%3Cstop offset='1' stop-color='%231d2a4d'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='320' height='240' fill='url(%23s)'/%3E%3Ccircle cx='232' cy='96' r='30' fill='%23fff3c4'/%3E%3Cpath d='M0 150 L70 96 L128 150Z' fill='%23244c4a'/%3E%3Cpath d='M96 150 L168 84 L246 150Z' fill='%232f6b5c'/%3E%3Cpath d='M198 150 L268 104 L320 150Z' fill='%231f4640'/%3E%3Crect y='150' width='320' height='90' fill='url(%23w)'/%3E%3Cellipse cx='232' cy='176' rx='26' ry='7' fill='%23ffd98a' opacity='.55'/%3E%3Crect y='186' width='320' height='3' fill='%23ffffff' opacity='.25'/%3E%3Crect y='208' width='320' height='2' fill='%23ffffff' opacity='.18'/%3E%3C/svg%3E";

const PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='9'%3E%3Crect width='12' height='9' fill='%23f2b134'/%3E%3Crect width='12' height='4' fill='%234a90d9'/%3E%3Ccircle cx='9' cy='2' r='1.4' fill='%23fff3c4'/%3E%3Cpath d='M0 9 L4 4 L7 9Z' fill='%232f6f4e'/%3E%3Cpath d='M5 9 L9 5 L12 9Z' fill='%233d8b63'/%3E%3C/svg%3E";

// A teletype needs to know how many characters it is typing: steps() and the
// `ch` width both come from the content, and a mismatch is what makes a CSS
// typewriter stutter or clip.
const tickerVars = computed(() => {
  const n = (content.value.text || "").length;
  return { "--an-chars": String(n), "--an-chars-width": `${n}ch` };
});
</script>

<template>
  <span
    class="subject"
    :class="[`subject--${size}`, `subject--${kind}`, trackEffect ? '' : rootEffect]"
  >
    <span v-if="kind === 'icon'" class="subject__icon" v-html="svg" />

    <!-- Three identical copies. Two is the minimum for a seamless wrap, but a
         short line in a wide tile still leaves visible void between passes;
         a third keeps the track full at every width. -->
    <template v-else-if="kind === 'marquee'">
      <span class="subject__track" :class="trackEffect">{{ content.text }}</span>
      <span class="subject__track" :class="trackEffect" aria-hidden="true">{{ content.text }}</span>
      <span class="subject__track" :class="trackEffect" aria-hidden="true">{{ content.text }}</span>
    </template>

    <!-- One span per character, each carrying its stagger index. This is the
         markup helper the docs ship for the split family. -->
    <span v-else-if="kind === 'split'" class="subject__split" :class="leafEffect">
      <span v-for="(c, i) in chars" :key="i" :style="{ '--an-i': i }">{{ c }}</span>
    </span>

    <span
      v-else-if="kind === 'text'"
      class="subject__text"
      :class="leafEffect"
      :data-text="content.text"
      >{{ content.text }}</span
    >

    <!-- data-text is what an-glitch clones into its two offset pseudo-layers -->
    <span
      v-else-if="kind === 'word'"
      class="subject__word"
      :class="leafEffect"
      :data-text="content.text"
      >{{ content.text }}</span
    >

    <span
      v-else-if="kind === 'panel'"
      class="subject__panel"
      :class="[leafEffect, { 'subject__panel--plain': !leafEffect }]"
      >{{ content.label }}</span
    >

    <span
      v-else-if="kind === 'ticker'"
      class="subject__ticker"
      :class="leafEffect"
      :style="tickerVars"
      >{{ content.text }}</span
    >

    <!-- A filled shape, because an-blob-morph animates border-radius and an
         icon glyph has no box to reshape. -->
    <span v-else-if="kind === 'blob'" class="subject__blob" :class="leafEffect" />

    <!-- The gooey filter FUSES overlapping shapes, so it needs several of them
         in motion. One static glyph shows nothing at all. -->
    <template v-else-if="kind === 'goo'">
      <i
        v-for="i in content.n"
        :key="i"
        class="an-float subject__goo"
        :style="{ '--an-duration': `${2.4 + i * 0.5}s`, '--an-float-distance': `${-8 - i * 4}px` }"
      />
    </template>

    <!-- an-count-up renders the value from its own ::after counter, so the
         literal number is shown only at REST. Printing both is what put a
         small "100" beside a static 1284: the counter had no --an-count-to and
         fell back to its default.
         counter() output is not exposed to assistive tech, so the real value
         goes on aria-label — which is what the library's docs require. -->
    <span
      v-else-if="kind === 'number'"
      class="subject__number"
      :class="leafEffect"
      :style="{ '--an-count-to': content.to, '--an-duration': '2.2s' }"
      :aria-label="String(content.to)"
      >{{ leafEffect ? "" : content.to }}</span
    >

    <span v-else-if="kind === 'rule'" class="subject__rule" :class="leafEffect" />

    <!-- A real raster. image-rendering, duotone, halftone, ken burns and
         blur-load all need pixels; an icon glyph shows none of them. -->
    <span
      v-else-if="kind === 'image'"
      class="subject__frame"
      :class="content.onFrame ? leafEffect : ''"
    >
      <img
        class="subject__img"
        :class="[
          content.onFrame ? '' : leafEffect,
          content.loadedOnPlay && loaded ? 'is-loaded' : '',
        ]"
        :src="content.lowres ? PHOTO : PHOTO_HD"
        alt=""
        decoding="async"
      />
    </span>

    <!-- Nine invisible zones: the effect reads WHICH one is hovered to
         decide the tilt direction. Without them the class does nothing. -->
    <span
      v-else-if="kind === 'zones'"
      class="subject__panel subject__panel--plain subject__tiltcard"
      :class="leafEffect"
    >
      <i v-for="n in 9" :key="n" class="an-zone" />
      <b>Tilt</b>
      <em>hover a corner</em>
    </span>

    <span v-else-if="kind === 'arrow'" class="subject__cta" :class="leafEffect">
      Continue
      <i class="an-arrow">&#8594;</i>
    </span>

    <span v-else-if="kind === 'label'" class="subject__cta" :class="leafEffect">
      <i class="subject__icon subject__icon--inline" v-html="svg" />
      <span class="an-label">Download</span>
    </span>

    <span
      v-else-if="kind === 'peek'"
      class="subject__panel subject__peek-host"
      :class="leafEffect"
    >
      Card
      <span class="an-peek">Read more</span>
    </span>

    <span v-else-if="kind === 'morph'" class="subject__cta" :class="leafEffect">
      <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
        <path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" fill="none" />
      </svg>
    </span>

    <!-- Sibling effects need siblings: they style *:not(:hover) inside a
         :has(> *:hover) parent, so a single child can never demonstrate them. -->
    <template v-else-if="kind === 'siblings'">
      <i v-for="n in 4" :key="n" class="subject__dot" />
    </template>

    <template v-else-if="kind === 'children'">
      <i v-for="i in content.n" :key="i" :style="{ '--an-i': i - 1 }" />
    </template>

    <!-- A clip-path or mask can only be seen against a FILLED box. Clipping a
         glyph, which is mostly transparent, shows nothing at all. -->
    <span
      v-else-if="kind === 'plate'"
      class="subject__plate"
      :class="[leafEffect, { 'subject__plate--dark': content.dark }]"
    >
      {{ content.label || "" }}
    </span>

    <!-- Stroke drawing needs a real path with a real length; an icon glyph has
         no stroke to dash. -->
    <span v-else-if="kind === 'draw'" class="subject__draw" :class="leafEffect">
      <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
        <path
          :d="content.path"
          fill="none"
          stroke="currentColor"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>

    <!-- Glass is a BACKDROP filter: over a flat page it is invisible, because
         there is nothing behind it to blur or refract. -->
    <span
      v-else-if="kind === 'glass'"
      class="subject__glass"
      :data-an-refract="content.refract ? 'on' : null"
    >
      <img class="subject__glass-photo" :src="PHOTO_HD" alt="" />
      <span class="subject__glass-pane" :class="leafEffect">
        {{ content.label || "Glass" }}
      </span>
    </span>

    <span v-else-if="kind === 'badge'" class="subject__badge" :class="leafEffect" />

    <!-- Before and after, in one frame. A pixel filter is only legible next to
         the picture it changed. -->
    <span v-else-if="kind === 'compare'" class="subject__cmp">
      <img class="subject__cmp-img" :src="content.lowres ? PHOTO : PHOTO_HD" alt="" />
      <span class="subject__cmp-fx" :class="leafEffect">
        <img class="subject__cmp-img" :src="content.lowres ? PHOTO : PHOTO_HD" alt="" />
      </span>
      <i class="subject__cmp-line" />
    </span>

    <!-- A stack needs cards to stack: the effect offsets `> *` by --an-i. -->
    <span v-else-if="kind === 'cards'" class="subject__cards" :class="leafEffect">
      <i v-for="n in content.n || 3" :key="n" :style="{ '--an-i': n - 1 }" />
    </span>

    <span v-else-if="kind === 'slab'" class="subject__slab">
      <span class="subject__slab-text" :class="leafEffect">{{ content.text }}</span>
    </span>

    <!-- The skeleton variants differ only in SHAPE -- a text line, an avatar
         circle, a card -- so the subject gives width and lets the class decide
         its own height. Forcing a uniform box made all five look identical,
         which is why they read as duplicates of each other. -->
    <span
      v-else-if="kind === 'skeleton'"
      class="subject__skeleton"
      :class="leafEffect"
    />

    <!-- Each line declares its own length: CSS cannot count characters, so
         --an-chars is part of the effect's contract, not a detail to hide. -->
    <template v-else-if="kind === 'lines'">
      <span
        v-for="(line, i) in content.lines"
        :key="i"
        :style="{ '--an-chars': line.length }"
      >{{ line }}</span>
    </template>

    <!-- Bars, unlike dots, are sized BY the effect: an-bars animates height
         from 30% to 100%, so the docs must not pin the kid's shape. -->
    <template v-else-if="kind === 'bars'">
      <i v-for="i in content.n" :key="i" :style="{ '--an-i': i - 1 }" />
    </template>

    <template v-else-if="kind === 'slats'">
      <b v-for="i in content.n" :key="i" :style="{ '--an-i': i - 1 }" />
    </template>

    <template v-else-if="kind === 'particles'">
      <em
        v-for="i in content.n"
        :key="i"
        :style="{
          '--an-i': i - 1,
          left: `${(i * 37) % 88}%`,
          width: `${7 + ((i * 5) % 11)}px`,
          height: `${7 + ((i * 5) % 11)}px`,
        }"
      />
    </template>

    <template v-else-if="kind === 'columns'">
      <span
        v-for="i in content.n"
        :key="i"
        :style="{ '--an-i': i - 1, left: `${(i - 1) * 12}%` }"
        >{{ content.glyphs || "101101" }}</span
      >
    </template>

    <template v-else-if="kind === 'swap'">
      <span>{{ content.a }}</span>
      <span>{{ content.b }}</span>
    </template>

    <!-- bare: the effect class paints .subject itself -->
  </span>
</template>

<style scoped lang="scss">
.subject {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--an-accent);

  // A preview must never leave its TILE, and the stage clips for that. The
  // subject itself does not clip: an-text-3d and an-text-marker paint a few px
  // outside the text box deliberately, and cutting that off looks worse than
  // the spill did. Only the kinds with absolutely positioned children clip.
  max-width: 100%;
  max-height: 100%;

  // Text subjects read as ink, not accent. Set on the WRAPPER so an effect
  // class on the inner node still wins.
  &--text,
  &--word,
  &--panel,
  &--split,
  &--marquee { color: var(--vp-c-text-1); }

  &__icon :deep(svg) {
    width: 1em;
    height: 1em;
    display: block;
  }

  &__text[class*="underline"],
  &__word[class*="underline"],
  &__text[class*="marker"],
  &__word[class*="marker"],
  &__text[class*="highlight"],
  &__word[class*="highlight"] { line-height: 1.2; }

  // The previews are the product demo, not a footnote. Half again on the
  // original pass; the tile stages in AnGallery track these.
  &--sm &__icon { font-size: 36px; }
  &--md &__icon { font-size: 68px; }
  &--lg &__icon { font-size: 96px; }
  &--xl &__icon { font-size: 135px; }

  // line-height 1 keeps a text preview tight to its own box, so the tile does
  // not read as mostly empty space. The underline and marker families are the
  // exception: their rule is drawn below the baseline and needs somewhere to
  // land, so they keep 1.2.
  &__text {
    font-size: 1.05rem;
    line-height: 1;
    text-align: center;
    max-width: 26ch;
  }

  &__word {
    font-size: clamp(1.7rem, 1.3rem + 1.2vw, 2.4rem);
    font-weight: 650;
    line-height: 1;
    letter-spacing: -0.02em;
  }

  &__number {
    font-family: var(--vp-font-family-mono);
    font-size: 2.3rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--vp-c-text-1);
  }

  &__panel {
    box-sizing: border-box;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    min-width: 0;
    padding: 0.8rem 1.2rem;
    border-radius: 16px;
    font-size: 0.9rem;
    overflow: hidden;

    &:empty { width: 100%; height: 100%; }

    // Only when no effect is applied: a scoped background here would beat the
    // library's own (component CSS is un-layered) and an-bg-aurora would
    // render as a blank box.
    &--plain {
      background: var(--vp-c-bg);
      border: 1px solid var(--an-line);
    }
  }

  &__rule {
    display: block;
    width: 180px;
    height: 16px;
    color: var(--an-accent);
    background: currentColor;
  }

  &__img {
    display: block;
    max-width: 100%;
    width: 132px;
    height: 99px;
    object-fit: cover;
    border-radius: 8px;
  }

  &__ticker {
    font-family: var(--vp-font-family-mono);
    font-size: 0.95rem;
    color: var(--vp-c-text-1);
  }


  // Hover contracts: a call-to-action row, a peek host and a sibling row, so
  // the child selectors these effects document have something to match.
  &__cta {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    font-size: 1rem;
    font-weight: 600;
    padding: 0.5rem 0.9rem;
    border-radius: 10px;
    background: color-mix(in oklab, var(--an-accent) 14%, transparent);
    color: var(--an-accent);
  }

  &__icon--inline { font-size: 1.1em; line-height: 0; }

  &__peek-host {
    position: relative;
    .an-peek {
      position: absolute;
      inset: auto 0 0 0;
      padding: 0.3rem;
      font-size: 0.7rem;
      background: var(--an-accent);
      color: var(--vp-c-bg);
    }
  }

  // The tilt is 8 degrees. On a flat rectangle that is imperceptible, so the
  // preview carries the depth cues a real card would have: a raised shadow and
  // stacked content that visibly skews.

  // A solid fill, always: this is the subject for clip-path and mask effects,
  // which have nothing to show against a transparent box.
  // The skeleton fills whatever it is applied to, so the preview covers an
  // image-shaped block entirely -- which is how it is actually used.
  // On a dark surface: the sweep is a pale highlight, and against the page's
  // own light background there was nothing for it to be lighter than.
  // An image-shaped block, which is what a skeleton usually covers. The tint
  // underneath makes the pale sweep legible.
  &--skeleton {
    padding: 0;
    border-radius: 12px;
    overflow: hidden;
    // A width is required, or aspect-ratio has nothing to work from and the
    // whole block collapses to zero.
    width: 100%;
    aspect-ratio: 4 / 3;
    max-height: 100%;
    background: #2a2724;
    color: #e8e2dc;
  }

  &__skeleton {
    display: block;
    width: 100%;
    height: 100%;
  }


  &__slab {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    border-radius: 12px;
    background: #3a3532;
    color: #cfc7c0;
  }

  &__slab-text {
    font-size: clamp(1.2rem, 1rem + 1vw, 1.8rem);
    font-weight: 700;
    line-height: 1;
  }

  &__cards {
    position: relative;
    display: block;
    width: 108px;
    height: 74px;

    i {
      position: absolute;
      inset: 0;
      border-radius: 10px;
      background: var(--vp-c-bg);
      border: 1px solid var(--an-line);
      box-shadow: 0 6px 16px -10px rgb(0 0 0 / 0.5);
    }
  }

  &__cmp {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 10px;
    line-height: 0;
  }

  &__cmp-img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  // The treated copy sits on top, clipped to the right half.
  &__cmp-fx {
    position: absolute;
    inset: 0;
    clip-path: inset(0 0 0 50%);
  }

  &__cmp-line {
    position: absolute;
    inset: 0 auto 0 50%;
    width: 1px;
    background: rgb(255 255 255 / 0.75);
  }

  &__badge {
    display: block;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--an-accent);
    color: var(--an-accent);
  }

  // The frame is what clips a scaling image. Without it an-img-zoom grows
  // straight past the rounded corner it is meant to sit inside.
  &__frame {
    display: block;
    overflow: hidden;
    border-radius: 10px;
    line-height: 0;
  }

  &__plate {
    display: grid;
    place-items: center;
    // A hover stage makes the subject `display: grid; place-items: center`,
    // and centring implies `justify-self: center`, which shrink-wraps the grid
    // area — so `width: 100%` resolved against the text rather than the stage.
    // Stretching the area is what makes the plate fill it.
    flex-shrink: 0;
    justify-self: stretch;
    align-self: stretch;
    width: 100%;
    height: 100%;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--an-accent), oklch(0.62 0.26 330));
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
  }

  &__draw {
    display: block;
    width: min(96px, 100%);
    aspect-ratio: 1;
    color: var(--an-accent);
  }

  &__glass {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 12px;
  }

  &__glass-photo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__glass-pane {
    position: relative;
    display: grid;
    place-items: center;
    width: 72%;
    height: 58%;
    border-radius: 12px;
    color: #fff;
    font-size: 0.8rem;
    font-weight: 600;
    text-shadow: 0 1px 3px rgb(0 0 0 / 0.45);
  }

  &__tiltcard {
    flex-direction: column;
    gap: 0.15rem;
    box-shadow: 0 10px 22px -12px hsl(220 15% 10% / 0.55);

    b { font-size: 1.05em; font-weight: 700; }
    em { font-size: 0.7em; font-style: normal; opacity: 0.6; }
  }

  &__dot {
    display: block;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: var(--an-accent);
  }

  &__blob {
    display: block;
    width: 96px;
    max-width: 100%;
    aspect-ratio: 1;
    background: linear-gradient(140deg, var(--an-accent), oklch(0.62 0.26 330));
  }

  &--goo {
    gap: 0;
    color: var(--an-accent);
  }
  &__goo {
    width: 34px;
    aspect-ratio: 1;
    border-radius: 50%;
    background: currentColor;
    margin-inline: -6px;
  }

  &--bare { min-width: 44px; min-height: 44px; }

  // No width, height or aspect-ratio here: component CSS is un-layered, and an
  // aspect-ratio on the kid cancelled the library's own height keyframe, which
  // rendered the equalizer as a row of pulsing dots.
  &--lines {
    display: block;
    text-align: left;
    font-size: 0.72rem;
    line-height: 1.5;
  }

  &--bars i {
    background: currentColor;
    color: var(--an-accent);
  }

  &--children i {
    width: 9px;
    aspect-ratio: 1;
    border-radius: 50%;
    background: currentColor;
    color: var(--an-accent);
  }

  // ------------------------------------------------- descendant-driven shapes
  &--marquee {
    display: flex;
    width: 100%;
    overflow: hidden;
  }
  // Both copies must be byte-identical in width, or the wrap reads as a jump.
  // The library supplies the trailing gap via padding on its own children.
  &__track {
    flex: 0 0 auto;
    white-space: nowrap;
    font-size: 1rem;
  }

  &--split span { display: inline-block; }
  &__split { font-size: 1.05rem; line-height: 1; }

  &--slats {
    flex-direction: column;
    gap: 3px;
    width: 132px;
    b {
      display: block;
      height: 13px;
      background: color-mix(in oklab, var(--an-accent) 70%, transparent);
      border-radius: 2px;
    }
  }

  &--particles {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    min-height: 96px;
    em {
      position: absolute;
      border-radius: 50%;
      background: color-mix(in oklab, var(--an-accent) 55%, transparent);
    }
  }

  &--columns {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 96px;
    overflow: hidden;
    font-family: var(--vp-font-family-mono);
    font-size: 0.72rem;
    color: var(--an-accent);
    > span { position: absolute; top: 0; }
  }
}

// Small tiles need everything a notch down.
// Only a full-bleed kind fills the stage, so that a child's `max-width: 100%`
// has a definite basis to resolve against -- left shrink-to-fit, a 176px panel
// in a 146px stage hung over the edges and got clipped. Every other kind keeps
// its intrinsic size: stretching a spinner turned its circle into an ellipse.
//
// min-*: 0 is load-bearing. As a flex item the subject's automatic minimum size
// is its min-content -- the panel's full width -- which floors it above the
// stage and cancels the width.
.subject--panel,
.subject--zones,
.subject--peek,
.subject--particles,
.subject--columns,
.subject--plate,
.subject--compare,
.subject--glass,
.subject--marquee {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.subject--sm {
  .subject__word { font-size: 1.15rem; }
  .subject__ticker { font-size: 0.72rem; }
  .subject__blob { width: 46px; }
  .subject__goo { width: 20px; margin-inline: -4px; }
  .subject__text { font-size: 0.8rem; max-width: 20ch; }
  .subject__split { font-size: 0.82rem; }
  .subject__track { font-size: 0.78rem; }
  .subject__number { font-size: 1.3rem; }
  .subject__panel {
    padding: 0.45rem 0.6rem;
    font-size: 0.68rem;
  }
  .subject__rule { width: 96px; }
  .subject__img { width: 84px; height: 63px; }
  &.subject--bare { min-width: 30px; min-height: 30px; }
  &.subject--slats { width: 82px; b { height: 8px; } }
  &.subject--particles,
  &.subject--columns { min-height: 58px; }
}

.subject--lg {
  .subject__word { font-size: clamp(2rem, 1.5rem + 1.6vw, 3rem); }
  .subject__ticker { font-size: 1.15rem; }
  .subject__blob { width: 132px; }
  .subject__goo { width: 46px; margin-inline: -9px; }
  .subject__number { font-size: 3rem; }
  .subject__img { width: 190px; height: 143px; }
  .subject__text { font-size: 1.2rem; }
}


// Pale light needs a dark scene: fog, spotlights and god rays have nothing to
// lift on the page's own light panel. Doubled class so this cannot be undone by
// declaration order inside the block above.
.subject__plate--dark.subject__plate--dark {
  background: #1d1a18;
  color: #d8d1ca;
}
</style>
