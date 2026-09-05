// Animatio — the optional `once` enhancer. PLAN.md §8.3
//
// The library is CSS-only. This file is NEVER referenced by the CSS and is not
// required by anything — it exists because pure CSS genuinely cannot latch a
// scroll-driven animation (§8.1), and Firefox stable still has scroll-driven
// animations behind a flag. Twelve lines is cheaper than pretending otherwise.
//
//   import "animatio/once.js";
//
// Adds .an-seen to each .an-reveal the first time it enters, and never removes
// it — which is exactly the `once` semantics Chrome 145 gets natively from
// animation-trigger: play-once.

(() => {
  if (typeof document === "undefined" || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("an-seen");
      io.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -12% 0px" });
  const watch = () =>
    document.querySelectorAll(".an-reveal:not(.an-seen)").forEach((el) => io.observe(el));
  watch();
  new MutationObserver(watch).observe(document.documentElement, {
    subtree: true, childList: true,
  });
})();
