<script setup>
// The composability demo, the single clearest reason to pick this library.
// PLAN.md §16.7
//
// Both stages stack atoms and run every one of them at once. The animation
// COUNT is read back off the live element rather than written into the copy,
// because a claim about composition that you cannot verify on the page is just
// marketing — and this exact demo shipped broken once, asserting two
// animations while running one.
import { ref, nextTick } from "vue";
import AnSubject from "./AnSubject.vue";

const key = ref(0);
const running = ref([0, 0]);
const stages = ref([]);

const play = async () => {
  key.value += 1;
  await nextTick();
  // One frame, so the restarted animations are registered before counting.
  requestAnimationFrame(() => {
    running.value = stages.value.map((el) => {
      const subject = el?.querySelector(".subject");
      if (!subject) return 0;
      // `none` entries in the animation-name list are real animations with no
      // keyframes; they are not what the claim is about.
      return subject.getAnimations().filter((a) => a.animationName !== "none").length;
    });
  });
};

const DEMOS = [
  {
    classes: "an an-fade an-up",
    atoms: ["an-fade", "an-up"],
    channels: "--an-o + --an-y",
    say: "Opacity and vertical travel, each on its own channel.",
  },
  {
    classes: "an an-fade an-up an-spin",
    atoms: ["an-fade", "an-up", "an-spin"],
    channels: "--an-o + --an-y + --an-rz",
    say: "A third atom joins without touching what the other two wrote.",
  },
];
</script>

<template>
  <div class="cmp">
    <div
      v-for="(demo, i) in DEMOS"
      :key="i"
      class="cmp__col"
    >
      <p class="cmp__code">
        <code v-for="(a, j) in demo.atoms" :key="j">{{ a }}</code>
      </p>

      <button
        :ref="(el) => (stages[i] = el)"
        class="cmp__stage"
        type="button"
        aria-label="Play"
        @click="play"
      >
        <AnSubject
          :key="`${i}-${key}`"
          name="an-fade"
          :effect="key ? demo.classes : ''"
        />
        <span v-if="!key" class="cmp__hint">Click</span>
        <span v-else class="cmp__count">
          {{ running[i] }} animations running
        </span>
      </button>

      <p class="cmp__say">
        <code>{{ demo.channels }}</code>
        {{ demo.say }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cmp {
  display: grid;
  gap: 1.6rem;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  margin: 1.5rem 0 0;

  &__col {
    padding-top: 0.9rem;
    border-top: 2px solid var(--an-accent);
  }

  &__code {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin: 0 0 0.7rem;

    code {
      font-size: 0.72rem;
      padding: 0.1rem 0.4rem;
      border-radius: 5px;
      background: color-mix(in oklab, var(--an-accent) 12%, transparent);
      color: var(--an-accent);
      border: 0;
    }
  }

  &__stage {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    min-height: 170px;
    padding: 0;
    border: 1px solid var(--an-line);
    border-radius: 14px;
    background: var(--an-stage);
    cursor: pointer;

    &:hover { border-color: color-mix(in oklab, var(--an-accent) 50%, var(--an-line)); }
    &:focus-visible { outline: 2px solid var(--an-accent); outline-offset: 1px; }
  }

  &__hint,
  &__count {
    position: absolute;
    inset: auto 0 0.6rem 0;
    font-family: var(--vp-font-family-mono);
    font-size: 0.68rem;
    color: var(--vp-c-text-3);
  }

  &__say {
    margin: 0.7rem 0 0;
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--vp-c-text-2);

    code { font-size: 0.72rem; }
  }
}
</style>
