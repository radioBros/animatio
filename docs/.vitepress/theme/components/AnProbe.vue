<script setup>
// The live support probe. PLAN.md §16.5
//
// A table tells a visitor what browsers do. This tells them what THEIR browser
// does — which is the only thing they actually want to know, and the reason the
// support page is useful rather than decorative.
import { ref, onMounted } from "vue";

const rows = ref([]);

const FEATURES = [
  ["@property", () => CSS.supports("(--x: 0)") && typeof CSS.registerProperty === "function",
    "The composable transform engine.", "core"],
  ["animation-timeline: view()", () => CSS.supports("animation-timeline", "view()"),
    "Scroll-driven reveals and scrubs.", "limited"],
  ["animation-trigger", () => CSS.supports("animation-trigger", "--t play-once"),
    "Native play-once reveals (Tier 3).", "limited"],
  ["@container style()", () => CSS.supports("container-type", "normal"),
    "The Tier-2 reveal latch.", "core"],
  ["attr() with type()", () => CSS.supports("x", "attr(x type(*))"),
    "Tier-4 typed HTML attributes.", "limited"],
  ["backdrop-filter", () => CSS.supports("backdrop-filter", "blur(1px)") ||
    CSS.supports("-webkit-backdrop-filter", "blur(1px)"), "Glass surfaces.", "core"],
  ["@view-transition", () => CSS.supports("view-transition-name", "x"),
    "Cross-document page transitions.", "newly"],
  ["linear() easing", () => CSS.supports("animation-timing-function", "linear(0, 1)"),
    "Spring and bounce curves.", "core"],
  [":has()", () => CSS.supports("selector(:has(*))"), "Group-hover utilities.", "core"],
];

onMounted(() => {
  rows.value = FEATURES.map(([name, test, why, level]) => {
    let ok = false;
    try { ok = !!test(); } catch { ok = false; }
    return { name, ok, why, level };
  });
});

const tier = () => {
  const r = Object.fromEntries(rows.value.map((x) => [x.name, x.ok]));
  if (r["animation-trigger"]) return "Tier 3 — native animation-trigger, real play-once semantics.";
  if (r["animation-timeline: view()"]) return "Tier 2 — style-query latch. Reveals fire on entry and replay on re-entry.";
  return "Tier 0 — no scroll timelines. Content renders finished and readable; nothing is hidden.";
};
</script>

<template>
  <div class="probe">
    <table>
      <thead><tr><th>Feature</th><th>Here</th><th>Used for</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.name">
          <td><code>{{ r.name }}</code></td>
          <td>
            <span :class="['probe__dot', r.ok ? 'is-yes' : 'is-no']" />
            {{ r.ok ? "yes" : "no" }}
          </td>
          <td>{{ r.why }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="rows.length" class="probe__verdict">
      <strong>Your browser resolves to:</strong> {{ tier() }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.probe {
  table { width: 100%; font-size: 0.85rem; }
  code { font-size: 0.8rem; }

  &__dot {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    margin-right: 0.35rem;
    &.is-yes { background: #2fbf71; }
    &.is-no  { background: #d97757; }
  }

  &__verdict {
    margin-top: 1rem;
    padding: 0.85rem 1rem;
    border-radius: 12px;
    background: var(--vp-c-bg-soft);
    border: 1px solid var(--vp-c-divider);
    font-size: 0.88rem;
    line-height: 1.6;
  }
}
</style>
