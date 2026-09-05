<script setup>
// The composability demo, the single clearest reason to switch. PLAN.md §16.7
//
// Left stacks two MONOLITHIC parity classes, which is the animate.css model:
// both declare animation-name, so the later one in the stylesheet wins and the
// other silently does nothing. Right stacks two atoms, each owning one
// @property channel. Both run on click, so the difference is demonstrated with
// real classes rather than a scoped imitation of one.
import { ref } from "vue";
import AnSubject from "./AnSubject.vue";

const key = ref(0);
const play = () => (key.value += 1);
</script>

<template>
  <div class="cmp">
    <div class="cmp__col">
      <h4>animate.css</h4>
      <p class="cmp__code"><code>fadeIn</code> + <code>slideInUp</code></p>
      <button class="cmp__stage" type="button" aria-label="Play" @click="play">
        <AnSubject
          :key="`a${key}`"
          name="an-fadeIn"
          :effect="key ? 'an an-fadeIn an-slideInUp' : ''"
        />
        <span v-if="!key" class="cmp__hint">Click</span>
      </button>
      <p class="cmp__say">
        Both write <code>transform</code>. The last one declared wins, so the
        other silently does nothing. It reads as a library bug; it is a model
        limitation.
      </p>
    </div>

    <div class="cmp__col cmp__col--ours">
      <h4>Animatio</h4>
      <p class="cmp__code"><code>an-fade</code> + <code>an-up</code></p>
      <button class="cmp__stage" type="button" aria-label="Play" @click="play">
        <AnSubject
          :key="`b${key}`"
          name="an-fade"
          :effect="key ? 'an an-fade an-up' : ''"
        />
        <span v-if="!key" class="cmp__hint">Click</span>
      </button>
      <p class="cmp__say">
        Each atom animates its own registered channel,
        <code>--an-o</code> and <code>--an-y</code>. Both apply, and a third
        would too.
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cmp {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
  margin: 1.6rem 0;

  &__col {
    display: grid;
    gap: 0.55rem;
    align-content: start;
    padding-top: 1rem;
    border-top: 2px solid var(--an-line);

    &--ours { border-top-color: var(--an-accent); }

    h4 {
      margin: 0;
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
  }

  &__code {
    margin: 0;
    font-size: 0.76rem;
    color: var(--vp-c-text-3);
    code { font-size: 0.9em; }
  }

  &__stage {
    position: relative;
    display: grid;
    place-items: center;
    height: 132px;
    border: 1px solid var(--an-line);
    border-radius: 14px;
    background: var(--an-stage);
    cursor: pointer;
    contain: layout paint;
    transition: border-color 150ms ease;

    &:hover { border-color: color-mix(in oklab, var(--an-accent) 50%, var(--an-line)); }
    &:focus-visible { outline: 2px solid var(--an-accent); outline-offset: 1px; }
  }

  &__hint {
    position: absolute;
    bottom: 0.55rem;
    font-size: 0.64rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--vp-c-text-3);
  }

  &__say {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--vp-c-text-2);
  }

}
</style>
