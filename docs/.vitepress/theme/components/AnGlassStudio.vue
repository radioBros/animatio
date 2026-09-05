<script setup>
// Glass and surfaces, with the tokens on sliders. PLAN.md §16.5
//
// The sliders write real inline custom properties, so what you are tuning is
// the actual Tier-1 API, and the SCSS it emits is the SCSS you would paste.
//
// The backdrop switcher matters more than it looks: glass is only judgeable
// over something. A frosted panel on a flat page tells you nothing.
import { ref, computed } from "vue";

const blur = ref(16);
const alpha = ref(12);
const sat = ref(1.6);
const radius = ref(16);
const noise = ref(6);
const backdrop = ref("photo");
const dark = ref(false);

const BACKDROPS = {
  photo: "Photo",
  mesh: "Mesh",
  grid: "Grid",
  flat: "Flat",
};

const style = computed(() => ({
  "--an-glass-blur": `${blur.value}px`,
  "--an-glass-alpha": `${alpha.value}%`,
  "--an-glass-sat": String(sat.value),
  "--an-glass-radius": `${radius.value}px`,
  "--an-noise-opacity": String((noise.value / 100).toFixed(2)),
}));

const classes = computed(() =>
  [
    "an-glass",
    dark.value ? "an-glass-dark" : "",
    noise.value > 0 ? "an-noise" : "",
  ]
    .filter(Boolean)
    .join(" ")
);

const snippet = computed(() => {
  const props = Object.entries(style.value)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `<div class="${classes.value}" style="\n${props}\n">\n  …\n</div>`;
});

const copied = ref(false);
const copy = async () => {
  try {
    await navigator.clipboard.writeText(snippet.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1300);
  } catch {}
};
</script>

<template>
  <div class="studio">
    <div class="studio__stage" :class="`is-${backdrop}`">
      <div class="studio__panel" :class="classes" :style="style">
        <h3>Frosted</h3>
        <p>Blur {{ blur }}px, tint {{ alpha }}%, saturate {{ sat }}</p>
      </div>
    </div>

    <div class="studio__controls">
      <div class="studio__group">
        <span class="studio__legend">Backdrop</span>
        <div class="studio__seg">
          <button
            v-for="(label, k) in BACKDROPS"
            :key="k"
            type="button"
            :class="{ 'is-on': backdrop === k }"
            @click="backdrop = k"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <label>
        <span>blur</span>
        <input v-model.number="blur" type="range" min="0" max="48" step="1" />
        <output>{{ blur }}px</output>
      </label>
      <label>
        <span>tint</span>
        <input v-model.number="alpha" type="range" min="0" max="80" step="1" />
        <output>{{ alpha }}%</output>
      </label>
      <label>
        <span>saturate</span>
        <input v-model.number="sat" type="range" min="0.5" max="3" step="0.1" />
        <output>{{ sat }}</output>
      </label>
      <label>
        <span>radius</span>
        <input v-model.number="radius" type="range" min="0" max="40" step="1" />
        <output>{{ radius }}px</output>
      </label>
      <label>
        <span>grain</span>
        <input v-model.number="noise" type="range" min="0" max="24" step="1" />
        <output>{{ (noise / 100).toFixed(2) }}</output>
      </label>

      <label class="studio__check">
        <input v-model="dark" type="checkbox" />
        <span>dark glass</span>
      </label>
    </div>


    <div class="studio__code">
      <pre><code>{{ snippet }}</code></pre>
      <button type="button" @click="copy">{{ copied ? "copied" : "copy" }}</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.studio {
  margin: 1.6rem 0 2rem;

  &__stage {
    display: grid;
    place-items: center;
    min-height: 340px;
    padding: 2rem;
    border-radius: 18px;
    border: 1px solid var(--an-line);
    overflow: hidden;

    &.is-photo {
      background-image:
        radial-gradient(at 18% 22%, #ff7a45 0, transparent 45%),
        radial-gradient(at 80% 18%, #6d5cff 0, transparent 42%),
        radial-gradient(at 30% 82%, #00c2a8 0, transparent 44%),
        radial-gradient(at 78% 76%, #ffc300 0, transparent 40%);
      background-color: #241a2e;
    }
    &.is-mesh {
      background-image:
        radial-gradient(at 25% 30%, #e5484d 0, transparent 50%),
        radial-gradient(at 75% 65%, #3b5bdb 0, transparent 50%);
      background-color: #14161c;
    }
    &.is-grid {
      background-color: #101318;
      background-image:
        linear-gradient(to right, rgba(255, 255, 255, 0.09) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.09) 1px, transparent 1px);
      background-size: 26px 26px;
    }
    &.is-flat { background: var(--an-stage); }
  }

  &__panel {
    display: grid;
    gap: 0.3rem;
    min-width: min(340px, 100%);
    padding: 1.6rem 1.8rem;
    text-align: center;

    h3 { margin: 0; font-size: 1.15rem; font-weight: 620; }
    p { margin: 0; font-size: 0.8rem; opacity: 0.8; }
  }

  &__controls {
    display: grid;
    gap: 0.8rem 1.6rem;
    grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
    margin-top: 1.2rem;
    padding: 1rem 1.1rem;
    border: 1px solid var(--an-line);
    border-radius: 14px;
    font-size: 0.78rem;

    label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--vp-c-text-2);
    }
    input[type="range"] { flex: 1; min-width: 0; accent-color: var(--an-accent); }
    output {
      min-width: 4ch;
      font-variant-numeric: tabular-nums;
      color: var(--vp-c-text-3);
    }
  }

  &__group { grid-column: 1 / -1; display: flex; align-items: center; gap: 0.7rem; }
  &__legend { color: var(--vp-c-text-2); }

  &__seg {
    display: inline-flex;
    border: 1px solid var(--an-line);
    border-radius: 9px;
    overflow: hidden;

    button {
      padding: 0.34rem 0.7rem;
      border: 0;
      background: var(--vp-c-bg);
      color: var(--vp-c-text-3);
      font-size: 0.74rem;
      cursor: pointer;
      + button { border-left: 1px solid var(--an-line); }
      &:hover { color: var(--vp-c-text-1); }
      &.is-on { background: var(--an-accent-soft); color: var(--an-accent); }
    }
  }

  &__check {
    gap: 0.45rem;
    &.is-off { opacity: 0.45; }
    input { accent-color: var(--an-accent); }
  }

  &__warn {
    margin: 0.9rem 0 0;
    padding-left: 1rem;
    border-left: 1px solid var(--an-line);
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--vp-c-text-3);
  }

  &__code {
    position: relative;
    margin-top: 1.2rem;

    pre {
      margin: 0;
      padding: 0.9rem 1rem;
      border: 1px solid var(--an-line);
      border-radius: 12px;
      background: var(--an-stage);
      font-size: 0.76rem;
      overflow-x: auto;
    }
    button {
      position: absolute;
      top: 0.6rem;
      right: 0.7rem;
      padding: 0.16rem 0.5rem;
      border: 1px solid var(--an-line);
      border-radius: 7px;
      background: var(--vp-c-bg);
      font-size: 0.7rem;
      cursor: pointer;
      &:active { transform: scale(0.97); }
    }
  }
}
</style>
