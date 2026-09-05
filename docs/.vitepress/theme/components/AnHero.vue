<script setup>
// The landing hero. PLAN.md §16.3, §16.8
//
// Every motion here is an Animatio class, so the page is the proof. It runs
// ONCE on mount, is compositor-only, and never delays the LCP text.
//
// The copy is rendered unconditionally and only the ANIMATION classes are gated
// on mount. Putting the text itself behind `v-if="mounted"` would leave the hero
// empty in the SSR output: bad for LCP, worse for anyone without JS, and it
// would make the page look broken for a frame.
//
// Deliberately NOT a centred hero with gradient text: that combination is the
// most recognisable AI-design signature in this category. Asymmetric split,
// solid ink, one accent.
import { ref, onMounted } from "vue";
import AnSubject from "./AnSubject.vue";

const copied = ref(false);
const mounted = ref(false);
const demo = ref(0);

const DEMOS = [
  { name: "an-fadeInUp", label: "an-fadeInUp" },
  { name: "an-bounceIn", label: "an-bounceIn" },
  { name: "an-rubberBand", label: "an-rubberBand" },
  { name: "an-flipInX", label: "an-flipInX" },
  { name: "an-zoomInDown", label: "an-zoomInDown" },
  { name: "an-lightSpeedInRight", label: "an-lightSpeedInRight" },
];

const pick = ref(0);
const play = (i) => {
  pick.value = i;
  demo.value += 1;
};

onMounted(() => {
  mounted.value = true;
  requestAnimationFrame(() => (demo.value = 1));
});

const copy = async () => {
  try {
    await navigator.clipboard.writeText("npm i @radiobros/animatio");
    copied.value = true;
    setTimeout(() => (copied.value = false), 1400);
  } catch {}
};
</script>

<template>
  <section class="hero">
    <div class="hero__inner">
      <div class="hero__copy">
        <!-- Intrinsic size is set so the lockup reserves its space before the
             image loads and the tagline below it does not jump. -->

        <p class="hero__eyebrow" :class="mounted && 'an an-fadeIn'">
          CSS only, zero runtime
        </p>

        <h1 class="hero__title" :class="mounted && 'an an-fadeInUp'" style="--an-duration: .8s">
          Animation you ship,<br />not animation you load.
        </h1>

        <p
          class="hero__lede"
          :class="mounted && 'an an-fadeInUp'"
          style="--an-duration: .8s; --an-delay: .09s"
        >
          97 classic presets, atoms that actually stack, scroll reveals that
          degrade honestly, glass, and 395 effects in total. Nothing to hydrate.
          20.6 KB for all of it, or about 4 after tree-shaking.
        </p>

        <div
          class="hero__cta"
          :class="mounted && 'an an-fadeInUp'"
          style="--an-duration: .8s; --an-delay: .18s"
        >
          <a class="hero__btn hero__btn--primary" href="/guide/">Get started</a>
          <a class="hero__btn" href="/gallery">Browse 392 effects</a>
          <button class="hero__npm" type="button" @click="copy">
            <code>npm i @radiobros/animatio</code>
            <span>{{ copied ? "copied" : "copy" }}</span>
          </button>
        </div>
      </div>

      <div class="hero__demo">
        <div class="hero__stage">
          <AnSubject
            :key="demo"
            :name="DEMOS[pick].name"
            size="lg"
            :effect="demo ? `an ${DEMOS[pick].name}` : ''"
            style="--an-duration: 1s"
          />
        </div>
        <div class="hero__picker">
          <button
            v-for="(d, i) in DEMOS"
            :key="d.name"
            type="button"
            :class="['hero__chip', { 'is-on': pick === i }]"
            @click="play(i)"
          >
            {{ d.label }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero {
  border-bottom: 1px solid var(--an-line);

  &__inner {
    max-width: var(--site-max);
    margin-inline: auto;
    padding: clamp(3rem, 9vw, 6rem) 1.5rem clamp(2.5rem, 6vw, 4.5rem);
    display: grid;
    gap: clamp(2.5rem, 6vw, 4rem);
    align-items: center;

    @media (min-width: 940px) {
      grid-template-columns: 1.1fr 0.9fr;
    }
  }

  // The icon is sized off the wordmark's cap height so the two read as one
  // lockup rather than two pasted images.
  &__brand {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin-bottom: 1.1rem;
  }

  &__icon {
    display: block;
    width: clamp(38px, 5vw, 58px);
    height: auto;
  }

  &__mark {
    display: block;
    width: clamp(190px, 26vw, 300px);
    height: auto;
  }

  &__eyebrow {
    margin: 0 0 1.1rem;
    font-family: var(--vp-font-family-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--an-accent);
  }

  &__title {
    margin: 0;
    font-size: clamp(2rem, 1.3rem + 2.6vw, 3.1rem);
    font-weight: 640;
    letter-spacing: -0.035em;
    line-height: 1.08;
    color: var(--vp-c-text-1);
    text-wrap: balance;
  }

  &__lede {
    max-width: 46ch;
    margin: 1.3rem 0 0;
    font-size: 1rem;
    line-height: 1.68;
    color: var(--vp-c-text-2);
  }

  &__cta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    margin-top: 2rem;
  }

  &__btn {
    padding: 0.6rem 1.05rem;
    border-radius: 10px;
    border: 1px solid var(--an-line);
    font-size: 0.88rem;
    font-weight: 520;
    text-decoration: none;
    color: var(--vp-c-text-1);
    transition: transform 150ms var(--ease-out), border-color 150ms ease;

    &:hover { border-color: var(--an-accent); }
    &:active { transform: scale(0.975); }

    &--primary {
      background: var(--an-accent);
      border-color: var(--an-accent);
      color: oklch(0.99 0.004 75);
      &:hover { border-color: var(--an-accent); }
    }
  }

  &__npm {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.55rem 0.85rem;
    border-radius: 10px;
    border: 1px solid var(--an-line);
    background: var(--an-stage);
    cursor: pointer;
    transition: transform 150ms var(--ease-out), border-color 150ms ease;

    &:hover { border-color: var(--an-accent); }
    &:active { transform: scale(0.975); }

    code {
      font-family: var(--vp-font-family-mono);
      font-size: 0.82rem;
      color: var(--vp-c-text-1);
      background: none;
      border: 0;
      padding: 0;
    }
    span {
      font-size: 0.68rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--vp-c-text-3);
    }
  }

  // ------------------------------------------------------------------- demo
  &__stage {
    display: grid;
    place-items: center;
    min-height: 240px;
    border: 1px solid var(--an-line);
    border-radius: 20px;
    background:
      radial-gradient(120% 120% at 50% 0%, var(--an-stage-lift), transparent 70%),
      var(--an-stage);
    contain: layout paint;
  }

  &__picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.7rem;
  }

  &__chip {
    padding: 0.28rem 0.55rem;
    border: 1px solid var(--an-line);
    border-radius: 7px;
    background: var(--vp-c-bg);
    font-family: var(--vp-font-family-mono);
    font-size: 0.68rem;
    color: var(--vp-c-text-3);
    cursor: pointer;
    transition: transform 140ms var(--ease-out), border-color 140ms ease, color 140ms ease;

    &:hover { border-color: var(--an-accent); color: var(--vp-c-text-1); }
    &:active { transform: scale(0.97); }
    &.is-on {
      border-color: var(--an-accent);
      color: var(--an-accent);
      background: var(--an-accent-soft);
    }
  }
}
</style>
