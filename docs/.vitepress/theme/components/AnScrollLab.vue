<script setup>
// A working scroll demo, not a description of one. PLAN.md §16.5
//
// The scroll guide explains the tier ladder; this page IS the ladder running.
// It reports which tier the visitor's own browser resolved to, then scrolls
// through every mechanism: reveals, scrubs, parallax, a sticky stack and a
// progress rail.
//
// Everything here is Animatio classes. There is no scroll listener anywhere on
// this page, which is the point.
import { ref, onMounted } from "vue";
import AnSubject from "./AnSubject.vue";

const tier = ref(null);
const support = ref({});

const CARDS = [
  { n: "01", t: "Entry", d: "The reveal fires as the element crosses into view." },
  { n: "02", t: "Range", d: "entry 20% to cover 45% — tune where it starts and ends." },
  { n: "03", t: "Once", d: "On Chrome 145+ it latches. Elsewhere it replays on re-entry." },
  { n: "04", t: "Fallback", d: "Where timelines are missing, the content is simply here." },
];

onMounted(() => {
  const s = {
    trigger: CSS.supports("animation-trigger", "--t play-once"),
    view: CSS.supports("animation-timeline", "view()"),
    styleQuery: CSS.supports("container-type", "normal"),
  };
  support.value = s;
  tier.value = s.trigger ? 3 : s.view ? 2 : 0;
});

const VERDICT = {
  3: "Tier 3 — native animation-trigger. Reveals latch: they play once and stay.",
  2: "Tier 2 — style-query latch. Reveals fire on entry and replay if you scroll back.",
  0: "Tier 0 — no scroll timelines here. Nothing is hidden; content renders finished and readable. Scroll down and you will see every section already visible, which is the whole point of the fallback.",
};
</script>

<template>
  <div class="lab">
    <!-- The progress rail is animation-timeline: scroll(root). No JS. -->
    <div class="lab__rail"><i class="an-progress-bar" /></div>

    <div class="lab__verdict" :class="{ 'is-fallback': tier === 0 }">
      <strong>Your browser:</strong>
      <span v-if="tier === null">checking…</span>
      <span v-else>{{ VERDICT[tier] }}</span>
      <ul class="lab__probe">
        <li>
          <code>animation-timeline: view()</code>
          <b :class="support.view ? 'yes' : 'no'">{{ support.view ? "yes" : "no" }}</b>
        </li>
        <li>
          <code>animation-trigger</code>
          <b :class="support.trigger ? 'yes' : 'no'">{{ support.trigger ? "yes" : "no" }}</b>
        </li>
      </ul>
    </div>

    <!-- ---------------------------------------------------------- reveals -->
    <section class="lab__act">
      <h2>Reveals</h2>
      <p class="lab__say">
        The wrapper is <code>an-reveal</code>; the child carries the animation.
        One markup shape at every tier.
      </p>

      <div class="lab__cards">
        <div v-for="c in CARDS" :key="c.n" class="an-reveal">
          <article class="an an-fadeInUp card" style="--an-duration: .8s">
            <span class="card__n">{{ c.n }}</span>
            <h3>{{ c.t }}</h3>
            <p>{{ c.d }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- --------------------------------------------------------- staggered -->
    <section class="lab__act">
      <h2>Stagger inside a reveal</h2>
      <p class="lab__say">
        The <code>:nth-child</code> index lands on the wrapper, but the delay is
        computed on the animated child, so the cascade survives the extra
        element. This is the interop that took a registered inheriting property
        to get right.
      </p>

      <ul class="lab__stagger an-stagger" style="--an-stagger: 90ms">
        <li v-for="i in 6" :key="i" class="an-reveal">
          <span class="an an-fadeInUp chip" style="--an-duration: .7s">{{ i }}</span>
        </li>
      </ul>
    </section>

    <!-- ----------------------------------------------------------- scrubs -->
    <section class="lab__act">
      <h2>Scrubs</h2>
      <p class="lab__say">
        Progress is bound to the scrollbar, so these run backwards when you
        scroll up. Back and forth is the free default here, not a feature.
      </p>

      <div class="lab__scrubs">
        <div class="an-scrub-up scrub"><AnSubject name="an-up" size="md" /><code>an-scrub-up</code></div>
        <div class="an-scrub-scale scrub"><AnSubject name="an-scale-in" size="md" /><code>an-scrub-scale</code></div>
        <div class="an-scrub-rotate scrub"><AnSubject name="an-spin" size="md" /><code>an-scrub-rotate</code></div>
        <div class="an-scrub-blur scrub"><AnSubject name="an-blur-in" size="md" /><code>an-scrub-blur</code></div>
      </div>
    </section>

    <!-- --------------------------------------------------------- parallax -->
    <section class="lab__act lab__act--parallax">
      <h2>Parallax</h2>
      <p class="lab__say">
        Three depths, one token. <code>--an-parallax-depth</code> from -1 to 1.
      </p>
      <div class="lab__parallax">
        <span class="an-parallax" style="--an-parallax-depth: 1">back</span>
        <span class="an-parallax" style="--an-parallax-depth: .35">middle</span>
        <span class="an-parallax" style="--an-parallax-depth: -.5">front</span>
      </div>
    </section>

    <!-- ----------------------------------------------------- sticky stack -->
    <section class="lab__act">
      <h2>Sticky stack</h2>
      <p class="lab__say">
        Cards stick, then shrink and dim as they exit. <code>position: sticky</code>
        plus a view timeline on the exit range.
      </p>
      <div class="an-sticky-stack lab__stack">
        <article v-for="i in 4" :key="i" class="stack">
          <span class="card__n">{{ String(i).padStart(2, "0") }}</span>
          <h3>Card {{ i }}</h3>
          <p>Keep scrolling. Each card holds its place, then recedes.</p>
        </article>
      </div>
    </section>

    <section class="lab__act lab__act--end">
      <h2>That was all CSS</h2>
      <p class="lab__say">
        No scroll listener, no observer, no library. Everything above is
        <code>animation-timeline</code> plus the reveal ladder.
        <a href="/guide/scroll">Read how it degrades →</a>
      </p>
    </section>
  </div>
</template>

<style scoped lang="scss">
.lab {
  --card-bg: var(--vp-c-bg);

  &__rail {
    position: sticky;
    top: var(--vp-nav-height);
    z-index: 3;
    height: 3px;
    background: var(--an-line);
    margin-bottom: 2rem;

    i {
      display: block;
      height: 100%;
      background: var(--an-accent);
      transform-origin: 0 50%;
    }
  }

  &__verdict {
    padding: 1.1rem 1.25rem;
    border: 1px solid var(--an-line);
    border-radius: 14px;
    background: var(--an-stage);
    font-size: 0.9rem;
    line-height: 1.6;

    &.is-fallback { border-color: var(--an-accent); }
    strong { margin-right: 0.4rem; }
  }

  &__probe {
    list-style: none;
    margin: 0.8rem 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.4rem;
    font-size: 0.78rem;

    li { display: flex; align-items: center; gap: 0.45rem; }
    b { font-weight: 600; }
    .yes { color: #2f8f5b; }
    .no { color: var(--an-accent); }
  }

  &__act {
    padding: clamp(4rem, 12vh, 8rem) 0;
    border-bottom: 1px solid var(--an-line);

    h2 {
      margin: 0 0 0.5rem;
      font-size: clamp(1.4rem, 1.15rem + 1vw, 1.9rem);
      font-weight: 640;
      letter-spacing: -0.025em;
      border: 0;
      padding: 0;
    }
    &--end { border-bottom: 0; }
  }

  &__say {
    max-width: 58ch;
    margin: 0 0 2rem;
    color: var(--vp-c-text-2);
    line-height: 1.65;
  }

  &__cards {
    display: grid;
    gap: 0.9rem;
    grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
  }

  &__stagger {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  &__scrubs {
    display: grid;
    gap: 3rem;
    grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  }

  &__parallax {
    display: grid;
    place-items: center;
    gap: 1rem;
    min-height: 40vh;

    span {
      font-family: var(--vp-font-family-mono);
      font-size: clamp(1.4rem, 1rem + 2vw, 2.6rem);
      color: var(--an-accent);
      opacity: 0.9;
    }
  }

  &__stack { display: grid; gap: 1rem; }
}

.card,
.stack {
  padding: 1.2rem 1.3rem;
  border: 1px solid var(--an-line);
  border-radius: 16px;
  background: var(--card-bg);

  h3 { margin: 0.4rem 0 0.35rem; font-size: 1rem; }
  p { margin: 0; font-size: 0.86rem; color: var(--vp-c-text-2); line-height: 1.6; }
}

.stack { min-height: 42vh; display: grid; align-content: center; }

.card__n {
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  color: var(--an-accent);
}

.chip {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 12px;
  border: 1px solid var(--an-line);
  background: var(--an-stage);
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
}

.scrub {
  display: grid;
  place-items: center;
  gap: 0.6rem;
  padding: 2rem 1rem;
  border: 1px solid var(--an-line);
  border-radius: 16px;
  background: var(--an-stage);

  code { font-size: 0.7rem; color: var(--vp-c-text-3); background: none; border: 0; }
}
</style>
