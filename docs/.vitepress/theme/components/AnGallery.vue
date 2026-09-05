<script setup>
// The catalogue, grouped by what a thing IS. PLAN.md §16.2, §16.4
//
// Three groups rather than one flat list, because they answer different
// questions and behave differently:
//
//   Animations  entrances, exits, attention seekers. They PLAY — click to run.
//   Effects     glass, borders, text treatments, loaders, backgrounds. They
//               ARE — applied on render, because there is nothing to "play".
//   Scroll      driven by the scrollbar; the scroll lab demonstrates these.
//
// Nothing autoplays. A grid of 530 simultaneous animations is the exact thing
// that makes a library feel expensive.
import { ref, computed, onMounted, watch } from "vue";
import catalogue from "@catalogue";
import AnSubject from "./AnSubject.vue";

const props = defineProps({
  // A comma-separated list of catalogue categories, so a page can show one
  // slice of a group rather than the whole thing: the surfaces page was
  // rendering every effect class in the library, which is the gallery again
  // under a different heading.
  category: { type: String, default: "" },
  group: { type: String, default: "" },
  names: { type: Array, default: () => [] },
  size: { type: String, default: "" },
  compact: { type: Boolean, default: false },
});

const GROUPS = [
  ["animation", "Animations", "Entrances, exits and attention seekers. Click to play."],
  ["effect", "Effects", "Surfaces, text, borders, loaders. Always on."],
  ["scroll", "Scroll", "Driven by the scrollbar."],
  ["utility", "Utilities", "Timing, easing, helpers."],
];

const CATEGORY_ORDER = [
  "entrance", "exit", "atom", "attention", "ambient",
  "surface", "shape", "border", "reveal", "depth", "interaction", "loader",
  "media", "ambientfx", "text", "glitch", "other", null,
];

// Every row gets a heading. Without one it reads as a continuation of the row
// above it, which is how the ambient loops looked like exit animations.
const CATEGORY_LABEL = {
  entrance: "Entrances",
  exit: "Exits",
  attention: "Attention seekers",
  ambient: "Ambient loops",
  atom: "Composable atoms",
  surface: "Surfaces & materials",
  shape: "Shapes & clipping",
  border: "Borders & dividers",
  reveal: "Reveals & wipes",
  text: "Text & type",
  glitch: "Glitch & distortion",
  media: "Images & video",
  loader: "Loaders & status",
  depth: "Depth & 3D",
  interaction: "Pointer & interaction",
  ambientfx: "Atmosphere",
  other: "Everything else",
};

let entries = Object.entries(catalogue.classes).map(([name, e]) => ({
  name,
  module: (e.module || "fx").split("/")[0],
  family: e.family,
  group: e.group || "effect",
  category: e.category,
  bytes: e.bytes,
  loop: !!e.loops,
  kids: !!e.animatesChildren,
  self: !!e.animatesSelf,
  // How this class can be previewed at all: solo, modifier(+base), hover,
  // children, utility, hook, scroll or vt. Derived in build-catalogue.
  preview: e.preview || "solo",
  base: e.base || null,
  trigger: e.trigger || "hover",
  // No keyframes at all means a surface treatment, not an animation.
  isStatic: e.keyframes.length === 0,
}));

if (props.group) entries = entries.filter((e) => e.group === props.group);
if (props.names.length) {
  entries = entries.filter((e) => props.names.includes(e.name));
  entries.sort((a, b) => props.names.indexOf(a.name) - props.names.indexOf(b.name));
}

const query = ref("");
const plays = ref({});
const density = ref(props.size || "md");

// A quarter smaller than the previous pass. Stage heights track the subject sizes: an icon that outgrows its stage gets
// clipped, and a stage much taller than its subject reads as an empty box.
const SIZES = {
  sm: { min: 108, subject: "sm", stage: 69, label: "Small" },
  md: { min: 164, subject: "md", stage: 113, label: "Medium" },
  lg: { min: 236, subject: "lg", stage: 161, label: "Large" },
  xl: { min: 338, subject: "xl", stage: 219, label: "Huge" },
};

onMounted(() => {
  if (props.size) return;
  try {
    const saved = localStorage.getItem("animatio-density");
    if (saved && SIZES[saved]) density.value = saved;
  } catch {}
});
watch(density, (v) => {
  if (props.size) return;
  try {
    localStorage.setItem("animatio-density", v);
  } catch {}
});

const cfg = computed(() => SIZES[density.value] || SIZES.md);

const match = (e, q) =>
  !q || e.name.toLowerCase().includes(q) || (e.family || "").toLowerCase().includes(q);

// Utilities and child hooks are NOT tiles. A delay, an easing or a selector
// target like an-arrow has nothing to show, and rendering 80-odd empty boxes
// was the single biggest source of "this preview does nothing".
const TILEABLE = ["solo", "modifier", "hover", "children"];

const wanted = computed(() =>
  props.category ? props.category.split(",").map((c) => c.trim()) : null
);

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return entries.filter(
    (e) =>
      TILEABLE.includes(e.preview) &&
      match(e, q) &&
      (!wanted.value || wanted.value.includes(e.category))
  );
});

const listed = computed(() => {
  const q = query.value.trim().toLowerCase();
  return entries.filter((e) => !TILEABLE.includes(e.preview) && match(e, q));
});

const LIST_META = {
  utility: ["Utilities", "Timing, easing, origins and fill modes. Nothing to look at: they configure the effect they sit beside."],
  hook: ["Child hooks", "Selector targets the parent effect styles. Inert on their own."],
  scroll: ["Scroll", "Needs a scrollbar. Run these in the scroll lab."],
  vt: ["View transitions", "Only visible across a real navigation."],
};

const listedGroups = computed(() => {
  const by = {};
  for (const e of listed.value) (by[e.preview] ||= []).push(e);
  return Object.entries(by).map(([k, items]) => ({
    k,
    title: LIST_META[k][0],
    blurb: LIST_META[k][1],
    items,
  }));
});

/** Grouped for display: group -> category -> entries. */
const sections = computed(() => {
  if (props.names.length) {
    return [{ key: "flat", title: "", blurb: "", rows: [{ cat: null, items: filtered.value }] }];
  }
  return GROUPS.map(([key, title, blurb]) => {
    const mine = filtered.value.filter((e) => e.group === key);
    const cats = [...new Set(mine.map((e) => e.category))].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
    );
    return {
      key,
      title,
      blurb,
      rows: cats.map((cat) => ({ cat, items: mine.filter((e) => e.category === cat) })),
    };
  }).filter((s) => s.rows.some((r) => r.items.length));
});

const totalKb = computed(
  () => (filtered.value.reduce((n, e) => n + e.bytes, 0) / 1024).toFixed(1)
);

const play = (name) => (plays.value[name] = (plays.value[name] || 0) + 1);

// An exit animation runs with fill-mode: both, so when it finishes the element
// STAYS gone — the tile ends up empty and the effect can never be replayed from
// a visible state. Dropping the class on animationend returns the subject to
// rest, which is what a preview should do.
//
// Debounced per tile: an effect can run several animations at once (an-fade +
// an-up, or a class that also animates its children), and resetting on the
// first one to finish would cut the others off mid-flight.
const endTimers = {};
const onAnimationEnd = (e, name) => {
  if (!plays.value[name]) return;
  clearTimeout(endTimers[name]);
  endTimers[name] = setTimeout(() => {
    plays.value[name] = 0;
  }, 90);
};

const playAll = () => {
  // Stagger, so it reads as a cascade rather than a flashbulb.
  filtered.value
    .filter((e) => !e.isStatic && !e.loop)
    .slice(0, 40)
    .forEach((e, i) => setTimeout(() => play(e.name), i * 45));
};

const classesFor = (e) => {
  // A modifier means nothing without its base: an-glass only sets a token.
  // A base is applied whenever one exists, not only for modifiers: a
  // child-driving variant like an-marquee-vertical inherits its duration from
  // an-marquee and runs at 0s without it.
  const own = e.base ? `${e.base} ${e.name}` : e.name;
  if (e.isStatic || e.loop || e.preview === "hover" || e.preview === "modifier") {
    return own; // always on, because there is nothing to press play on
  }
  return plays.value[e.name] ? `an ${own}` : ""; // entrance: on click
};

// A hover effect is invisible at rest by design. Putting the class on the
// SUBJECT meant the pointer was usually over the tile but not over the small
// element carrying the class, so it read as broken. The stage is what the
// pointer is actually on.
const stageClass = (e) => (e.preview === "hover" ? "tile__stage--hover" : "");
const subjectClass = (e) => classesFor(e);

const isEntrance = (e) =>
  !e.isStatic && !e.loop && e.preview !== "hover" && e.preview !== "modifier";
</script>

<template>
  <div class="gal">
    <div v-if="!compact" class="gal__bar">
      <input v-model="query" type="search" placeholder="Search effects" />
      <div v-if="!size" class="gal__density" role="group" aria-label="Preview size">
        <button
          v-for="(v, k) in SIZES"
          :key="k"
          type="button"
          :class="{ 'is-on': density === k }"
          :title="v.label"
          @click="density = k"
        >
          {{ k }}
        </button>
      </div>
      <button class="gal__all" type="button" @click="playAll">Play all</button>
      <span class="gal__count">
        {{ filtered.length }} shown, {{ totalKb }} KB if you used every one
      </span>
    </div>

    <section v-for="s in sections" :key="s.key" class="gal__section">
      <header v-if="s.title" class="gal__head">
        <h3>{{ s.title }}</h3>
        <p>{{ s.blurb }}</p>
      </header>

      <div v-for="row in s.rows" :key="row.cat || 'all'" class="gal__row">
        <h4 v-if="row.cat" class="gal__cat">{{ CATEGORY_LABEL[row.cat] || row.cat }}</h4>
        <div
          class="gal__grid"
          :style="{ '--min': `${cfg.min}px`, '--stage': `${cfg.stage}px` }"
        >
          <button
            v-for="e in row.items"
            :key="e.name"
            class="tile"
            type="button"
            :aria-label="`Play ${e.name}`"
            @click="play(e.name)"
            @animationend="onAnimationEnd($event, e.name)"
          >
            <span class="tile__stage" :class="stageClass(e)">
              <AnSubject
                :key="plays[e.name] || 0"
                :name="e.name"
                :size="cfg.subject"
                :effect="subjectClass(e)"
                :animates-children="e.kids"
                :animates-self="e.self"
              />
            </span>
            <code class="tile__name">{{ e.name }}</code>
            <span v-if="isEntrance(e) && !plays[e.name]" class="tile__cue">click</span>
            <span v-else-if="e.preview === 'hover'" class="tile__cue tile__cue--always">
              {{ e.trigger === "press" ? "press" : "hover" }}
            </span>
            <span v-else-if="e.preview === 'modifier'" class="tile__cue tile__cue--always">
              + {{ e.base.replace("an-", "") }}
            </span>
          </button>
        </div>
      </div>
    </section>

    <section v-for="g in listedGroups" :key="g.k" class="gal__section">
      <header class="gal__head">
        <h3>{{ g.title }}</h3>
        <p>{{ g.blurb }}</p>
      </header>
      <ul class="gal__list">
        <li v-for="e in g.items" :key="e.name"><code>{{ e.name }}</code></li>
      </ul>
    </section>

    <p v-if="!filtered.length && !listed.length" class="gal__empty">
      Nothing matches <b>{{ query }}</b>. Try a family: fade, bounce, glass,
      glitch, neon, marquee, scrub.
    </p>
  </div>
</template>

<style scoped lang="scss">
.gal {
  &__bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    align-items: center;
    margin: 1.4rem 0 1.6rem;
    position: sticky;
    top: var(--vp-nav-height);
    z-index: 2;
    padding: 0.6rem 0;
    background: var(--vp-c-bg);

    input {
      flex: 1 1 200px;
      min-width: 0;
      padding: 0.45rem 0.7rem;
      border: 1px solid var(--an-line);
      border-radius: 9px;
      background: var(--vp-c-bg);
      color: var(--vp-c-text-1);
      font-size: 0.85rem;
      &:focus-visible { outline: 2px solid var(--an-accent); outline-offset: 1px; }
    }
  }

  &__density {
    display: inline-flex;
    border: 1px solid var(--an-line);
    border-radius: 9px;
    overflow: hidden;

    button {
      padding: 0.42rem 0.6rem;
      border: 0;
      background: var(--vp-c-bg);
      color: var(--vp-c-text-3);
      font-family: var(--vp-font-family-mono);
      font-size: 0.72rem;
      cursor: pointer;
      transition: background 140ms ease, color 140ms ease;

      + button { border-left: 1px solid var(--an-line); }
      &:hover { color: var(--vp-c-text-1); }
      &.is-on { background: var(--an-accent-soft); color: var(--an-accent); }
    }
  }

  &__all {
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--an-line);
    border-radius: 9px;
    background: var(--vp-c-bg);
    color: var(--vp-c-text-1);
    font-size: 0.82rem;
    cursor: pointer;
    transition: transform 140ms var(--ease-out), border-color 140ms ease;
    &:hover { border-color: var(--an-accent); }
    &:active { transform: scale(0.97); }
  }

  &__count {
    flex-basis: 100%;
    font-size: 0.74rem;
    color: var(--vp-c-text-3);
    font-variant-numeric: tabular-nums;
  }

  &__section + &__section { margin-top: 3.5rem; }

  &__head {
    margin-bottom: 1.2rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid var(--an-line);

    h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 640;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0.25rem 0 0;
      font-size: 0.84rem;
      color: var(--vp-c-text-3);
    }
  }

  &__row + &__row { margin-top: 1.8rem; }

  &__cat {
    margin: 0 0 0.6rem;
    font-family: var(--vp-font-family-mono);
    font-size: 0.7rem;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--vp-c-text-3);
    font-weight: 500;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(var(--min), 100%), 1fr));
    gap: 0.7rem;
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(190px, 100%), 1fr));
    gap: 0.3rem 0.9rem;
    list-style: none;
    margin: 0;
    padding: 0;

    code {
      font-size: 0.72rem;
      color: var(--vp-c-text-2);
      background: none;
      border: 0;
      padding: 0;
    }
  }

  &__empty {
    padding: 2.5rem 0;
    color: var(--vp-c-text-3);
  }
}

.tile {
  position: relative;
  display: grid;
  gap: 0.5rem;
  padding: 0.6rem 0.6rem 0.7rem;
  border: 1px solid var(--an-line);
  border-radius: 14px;
  background: var(--vp-c-bg);
  text-align: left;
  cursor: pointer;
  content-visibility: auto;
  contain-intrinsic-size: auto calc(var(--stage) + 46px);
  transition: border-color 150ms ease, transform 150ms var(--ease-out);

  &:hover { border-color: color-mix(in oklab, var(--an-accent) 55%, var(--an-line)); }
  &:active { transform: scale(0.988); }
  &:focus-visible { outline: 2px solid var(--an-accent); outline-offset: 1px; }

  // A hover preview must be hoverable anywhere in the tile, but its class sits
  // on the subject (the selectors name the subject's children), so the subject
  // is stretched to cover the stage rather than the class being moved up.
  // Only the SUBJECT stretches, and it keeps its own layout. Forcing
  // `display: grid; place-items: center` on it made every child a centred grid
  // item, and a centred item's track is content-sized — so a plate's
  // `width: 100%` resolved against its own text instead of the stage. The
  // subject already centres its content; it just needs the pointer area.
  &__stage--hover > .subject {
    width: 100%;
    height: 100%;
  }

  &__stage {
    display: grid;
    place-items: center;
    height: var(--stage);
    padding: 0.5rem;
    border-radius: 10px;
    background: var(--an-stage);
    overflow: hidden;
  }

  &__name {
    font-size: 0.68rem;
    font-family: var(--vp-font-family-mono);
    color: var(--vp-c-text-3);
    background: none;
    border: 0;
    padding: 0;
    overflow-wrap: anywhere;
    line-height: 1.35;
  }

  &__cue {
    position: absolute;
    top: 0.55rem;
    right: 0.6rem;
    font-size: 0.56rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--vp-c-text-3);
    opacity: 0;
    transition: opacity 150ms ease;
  }
  &:hover &__cue { opacity: 1; }
  &__cue--always { opacity: 0.75; }
}
</style>
