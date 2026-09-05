// Animatio — sweep any docs page for previews that spill or sit dead.
//
// The gallery audit knows about .tile; this one does not assume any structure.
// It walks every element carrying a library class and reports:
//
//   spill   the element paints outside its parent, and no ancestor clips it
//   flat    the element has no painted box at all
//
//   $B eval tools/audit-page.mjs
(() => {
  const clipped = (n) => {
    let p = n.parentElement;
    while (p && p !== document.documentElement) {
      if (getComputedStyle(p).overflow !== "visible") return true;
      p = p.parentElement;
    }
    return false;
  };
  const spill = [], flat = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("[class*='an-']")) {
    const cls = [...el.classList].filter((c) => /^an-/.test(c));
    if (!cls.length) continue;
    const key = cls.join(".");
    const parent = el.parentElement;
    if (!parent) continue;
    const r = el.getBoundingClientRect();
    // offset* is the LAYOUT box: a scroll progress bar sits at scaleX(0) until
    // you scroll, and its rect is legitimately zero wide while its box is not.
    if (el.offsetWidth < 1 || el.offsetHeight < 1) {
      if (!seen.has("f" + key)) { flat.push(key); seen.add("f" + key); }
      continue;
    }
    if (clipped(el)) continue;
    // Overhanging the parent box is not itself a fault: a rotation sweeps past
    // its own footprint by design, and a 3rem gap absorbs it. What matters is
    // whether the overhang actually collides with a sibling or leaves the
    // viewport, so that is what gets reported.
    const vw = document.documentElement.clientWidth;
    let bad = 0;
    if (r.left < -2) bad = Math.round(-r.left);
    if (r.right > vw + 2) bad = Math.max(bad, Math.round(r.right - vw));
    for (const sib of parent.children) {
      if (sib === el) continue;
      const sr = sib.getBoundingClientRect();
      if (sr.width < 1 || sr.height < 1) continue;
      const dx = Math.min(r.right, sr.right) - Math.max(r.left, sr.left);
      const dy = Math.min(r.bottom, sr.bottom) - Math.max(r.top, sr.top);
      if (dx > 2 && dy > 2) bad = Math.max(bad, Math.round(Math.min(dx, dy)));
    }
    if (bad > 2 && !seen.has("s" + key)) {
      spill.push(key + " +" + bad + "px");
      seen.add("s" + key);
    }
  }
  const doc = document.documentElement;
  return JSON.stringify({
    url: location.pathname,
    hScroll: doc.scrollWidth > doc.clientWidth ? doc.scrollWidth - doc.clientWidth : 0,
    spill: spill.slice(0, 25),
    flat: flat.slice(0, 25),
  });
})();
