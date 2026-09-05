<script setup>
// One effect, applied to something that explains it. PLAN.md §16.4
//
// Nothing plays until you click. That is deliberate on two counts: the user
// asked for it, and an autoplaying grid of animations is exactly the kind of
// page that makes an animation library feel heavy. Motion on demand also means
// the preview reads as a control rather than as decoration.
//
// The token sliders write REAL inline custom properties, so a visitor tuning a
// slider is using the actual Tier-1 API rather than a simulation of it.
import { ref, computed, onMounted } from "vue";
import AnSubject from "./AnSubject.vue";
import { contentFor } from "../preview-content.mjs";

const props = defineProps({
  name: { type: String, required: true },
  wrapper: { type: String, default: "" },
  support: { type: String, default: "core" },
  loop: { type: Boolean, default: false },
  tokens: { type: Array, default: () => ["duration", "delay", "ease"] },
  note: { type: String, default: "" },
});

const played = ref(0);
const running = ref(false);
const duration = ref(1);
const delay = ref(0);
const ease = ref("ease");
const showCode = ref(false);
const copied = ref(false);
const supported = ref(true);

const EASES = ["ease", "out", "spring", "back-out", "bounce", "expo"];

const content = computed(() => contentFor(props.name));

const style = computed(() => {
  const s = { "--an-duration": `${duration.value}s` };
  if (delay.value) s["--an-delay"] = `${delay.value}s`;
  if (ease.value !== "ease") s["--an-ease"] = `var(--an-ease-${ease.value})`;
  return s;
});

const classes = computed(() => {
  // Continuous effects carry no engine class; entrances need `.an` for tokens.
  const base = props.loop ? [props.name] : ["an", props.name];
  return base.join(" ");
});

const styleString = computed(() =>
  Object.entries(style.value).map(([k, v]) => `${k}: ${v}`).join("; ")
);

const snippet = computed(() => {
  const c = content.value;
  const inner =
    c.kind === "text" || c.kind === "word" ? c.text
    : c.kind === "panel" ? c.label
    : c.kind === "number" ? String(c.to)
    : c.kind === "icon" ? `<svg><!-- ${c.icon} --></svg>`
    : "";
  const attr = styleString.value ? `\n     style="${styleString.value}"` : "";
  const el = `<div class="${classes.value}"${attr}>${inner}</div>`;
  return props.wrapper ? `<div class="${props.wrapper}">\n  ${el}\n</div>` : el;
});

const play = () => {
  played.value += 1;
  running.value = true;
  const ms = (duration.value + delay.value) * 1000 + 120;
  if (!props.loop) setTimeout(() => (running.value = false), ms);
};

const copy = async () => {
  try {
    await navigator.clipboard.writeText(snippet.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1200);
  } catch {}
};

onMounted(() => {
  if (props.support === "limited") {
    supported.value =
      CSS.supports("animation-trigger", "--t play-once") ||
      CSS.supports("animation-timeline", "view()");
  }
});
</script>

<template>
  <figure class="pv">
    <button
      class="pv__stage"
      type="button"
      :aria-label="`Play ${name}`"
      @click="play"
    >
      <span v-if="wrapper" :class="wrapper">
        <AnSubject
          :key="played"
          :name="name"
          :effect="played ? classes : ''"
          :style="style"
        />
      </span>
      <AnSubject
        v-else
        :key="played"
        :name="name"
        :effect="played ? classes : ''"
        :style="style"
      />

      <span v-if="!played" class="pv__hint">Click to play</span>
    </button>

    <figcaption class="pv__meta">
      <code class="pv__name">{{ name }}</code>
      <span v-if="!supported" class="pv__badge pv__badge--warn">not supported here</span>
      <span v-else-if="support !== 'core'" class="pv__badge">{{ support }}</span>
      <span class="pv__spacer" />
      <button class="pv__btn" type="button" @click="showCode = !showCode">
        {{ showCode ? "hide" : "code" }}
      </button>
    </figcaption>

    <div v-if="tokens.length" class="pv__controls">
      <label v-if="tokens.includes('duration')">
        <span>duration</span>
        <input v-model.number="duration" type="range" min="0.2" max="4" step="0.1" @input="play" />
        <output>{{ duration.toFixed(1) }}s</output>
      </label>
      <label v-if="tokens.includes('delay')">
        <span>delay</span>
        <input v-model.number="delay" type="range" min="0" max="1.5" step="0.1" @input="play" />
        <output>{{ delay.toFixed(1) }}s</output>
      </label>
      <label v-if="tokens.includes('ease')">
        <span>ease</span>
        <select v-model="ease" @change="play">
          <option v-for="e in EASES" :key="e" :value="e">{{ e }}</option>
        </select>
      </label>
    </div>

    <p v-if="note" class="pv__note">{{ note }}</p>

    <div v-if="showCode" class="pv__code">
      <pre><code>{{ snippet }}</code></pre>
      <button class="pv__copy" type="button" @click="copy">
        {{ copied ? "copied" : "copy" }}
      </button>
    </div>
  </figure>
</template>

<style scoped lang="scss">
.pv {
  margin: 0 0 1.5rem;
  border: 1px solid var(--an-line);
  border-radius: 18px;
  overflow: hidden;
  background: var(--vp-c-bg);

  &__stage {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    min-height: 176px;
    padding: 2rem 1.5rem;
    border: 0;
    background:
      radial-gradient(120% 120% at 50% 0%, var(--an-stage-lift), transparent 70%),
      var(--an-stage);
    cursor: pointer;
    // Reserve the box so nothing reflows while an effect runs.
    contain: layout paint;
    transition: background-color 180ms ease;

    &:hover { background-color: var(--an-stage-hover); }
    &:active { transform: scale(0.995); }
    &:focus-visible { outline: 2px solid var(--an-accent); outline-offset: -2px; }
  }

  &__hint {
    position: absolute;
    bottom: 0.7rem;
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--vp-c-text-3);
    pointer-events: none;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.85rem;
    border-top: 1px solid var(--an-line);
    font-size: 0.78rem;
  }
  &__name {
    font-family: var(--vp-font-family-mono);
    font-size: 0.76rem;
    color: var(--vp-c-text-2);
    background: none;
  }
  &__spacer { flex: 1; }

  &__badge {
    font-size: 0.64rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0.12rem 0.42rem;
    border-radius: 5px;
    border: 1px solid var(--an-line);
    color: var(--vp-c-text-3);

    &--warn {
      border-color: color-mix(in oklab, var(--an-accent) 45%, transparent);
      color: var(--an-accent);
    }
  }

  &__btn,
  &__copy {
    border: 1px solid var(--an-line);
    border-radius: 7px;
    padding: 0.16rem 0.5rem;
    font-size: 0.72rem;
    background: var(--vp-c-bg);
    color: var(--vp-c-text-2);
    cursor: pointer;
    transition: transform 140ms var(--ease-out), border-color 140ms ease;

    &:hover { border-color: var(--an-accent); color: var(--vp-c-text-1); }
    &:active { transform: scale(0.97); }
  }

  &__controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.55rem 0.85rem;
    border-top: 1px solid var(--an-line);
    font-size: 0.72rem;
    color: var(--vp-c-text-3);

    label { display: flex; align-items: center; gap: 0.4rem; }
    input[type="range"] { width: 88px; accent-color: var(--an-accent); }
    select {
      border: 1px solid var(--an-line);
      border-radius: 6px;
      padding: 0.1rem 0.3rem;
      background: var(--vp-c-bg);
      font-size: 0.72rem;
    }
    output { min-width: 3.2ch; font-variant-numeric: tabular-nums; }
  }

  &__note {
    margin: 0;
    padding: 0.6rem 0.85rem;
    border-top: 1px solid var(--an-line);
    font-size: 0.76rem;
    line-height: 1.55;
    color: var(--vp-c-text-2);
  }

  &__code {
    position: relative;
    border-top: 1px solid var(--an-line);

    pre {
      margin: 0;
      padding: 0.8rem 0.85rem;
      background: var(--an-stage);
      font-size: 0.74rem;
      overflow-x: auto;
    }
  }
  &__copy { position: absolute; top: 0.5rem; right: 0.6rem; }
}
</style>
