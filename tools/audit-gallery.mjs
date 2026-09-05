// Animatio — audit the REAL gallery, tile by tile.
//
// The earlier probe (probe-page.mjs) applied each class to a synthetic box.
// That answered "does this class do anything", but not "does this TILE look
// right", and the two are different questions: a class can work perfectly and
// still overflow its stage, or be applied to the wrong node inside the subject.
//
// This runs against the built gallery page and reports, per tile:
//
//   overflow  the subject paints outside its stage
//   inert     the subject is computationally identical to a bare control
//   empty     the subject has no painted box at all (zero area)
//
// Paste into the browse harness:  $B eval tools/audit-gallery.mjs
// It returns JSON; it does not mutate the page beyond a click.

(() => {
  const tiles = [...document.querySelectorAll(".tile")];
  const out = { total: tiles.length, overflow: [], inert: [], empty: [] };

  // A control: a subject with no effect class at all.
  const PROPS = [
    "animationName", "transform", "opacity", "filter", "backdropFilter",
    "backgroundImage", "backgroundColor", "boxShadow", "borderRadius",
    "borderTopWidth", "color", "clipPath", "maskImage", "textShadow",
    "mixBlendMode", "webkitTextStroke", "textDecorationLine", "imageRendering",
    "letterSpacing", "fontVariationSettings", "perspective", "transformStyle",
  ];
  const sig = (el) => {
    const s = getComputedStyle(el);
    const own = PROPS.map((p) => s[p]).join("|");
    const be = getComputedStyle(el, "::before");
    const af = getComputedStyle(el, "::after");
    const kid = el.firstElementChild ? getComputedStyle(el.firstElementChild) : null;
    return [
      own,
      be.content, be.backgroundImage, be.animationName, be.borderTopWidth,
      af.content, af.backgroundImage, af.animationName,
      kid ? kid.animationName + kid.transform + kid.opacity : "",
    ].join("~");
  };

  for (const tile of tiles) {
    const name = tile.querySelector(".tile__name")?.textContent?.trim();
    const stage = tile.querySelector(".tile__stage");
    const subject = tile.querySelector(".subject");
    if (!name || !stage || !subject) continue;

    // Force layout: tiles are content-visibility:auto, so an off-screen tile
    // reports zero-sized boxes and every measurement on it is meaningless.
    tile.style.contentVisibility = "visible";

    const sr = stage.getBoundingClientRect();
    // Ignore anything a clipping ancestor already hides: a marquee track is
    // wider than its stage by definition, and that is the effect working.
    const clipped = (n) => {
      let p = n.parentElement;
      while (p && p !== stage.parentElement) {
        const o = getComputedStyle(p).overflow;
        if (o !== "visible") return true;
        p = p.parentElement;
      }
      return false;
    };
    // Measure the subject AND anything it paints, including absolutely
    // positioned pseudo-children that a plain rect on the subject misses.
    const rects = [subject, ...subject.querySelectorAll("*")]
      .filter((n) => !clipped(n))
      .map((n) => n.getBoundingClientRect());
    if (!rects.length) { tile.style.contentVisibility = ""; continue; }
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));

    const SLOP = 1.5;
    const spill = Math.max(
      sr.left - left, right - sr.right, sr.top - top, bottom - sr.bottom
    );
    if (spill > SLOP) out.overflow.push({ name, px: Math.round(spill) });

    const box = subject.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) out.empty.push(name);

    tile.style.contentVisibility = "";
  }

  // Inertness: compare each subject against a bare one of the same kind.
  const controls = {};
  for (const tile of tiles) {
    const name = tile.querySelector(".tile__name")?.textContent?.trim();
    const subject = tile.querySelector(".subject");
    if (!name || !subject) continue;
    const kindCls = [...subject.classList].find((c) => c.startsWith("subject--") && c !== "subject--sm" && c !== "subject--md" && c !== "subject--lg" && c !== "subject--xl");
    const hasEffect = [...subject.classList].some((c) => c.startsWith("an-")) ||
      [...(tile.querySelector(".tile__stage")?.classList || [])].some((c) => c.startsWith("an-")) ||
      [...(subject.firstElementChild?.classList || [])].some((c) => c.startsWith("an-"));
    if (!hasEffect) continue;

    tile.style.contentVisibility = "visible";
    const target =
      [...subject.querySelectorAll("*")].find((n) =>
        [...n.classList].some((c) => c.startsWith("an-"))
      ) || subject;
    const s = sig(target);
    if (!controls[kindCls]) {
      // Build a bare control of this kind once.
      const clone = subject.cloneNode(true);
      [...clone.classList].filter((c) => c.startsWith("an-")).forEach((c) => clone.classList.remove(c));
      clone.querySelectorAll("*").forEach((n) =>
        [...n.classList].filter((c) => c.startsWith("an-")).forEach((c) => n.classList.remove(c))
      );
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      document.body.appendChild(clone);
      const ct =
        [...clone.querySelectorAll("*")].find((n) => n.className === target.className) || clone;
      controls[kindCls] = { sig: sig(ct), node: clone };
    }
    if (s === controls[kindCls].sig) out.inert.push(name);
    tile.style.contentVisibility = "";
  }
  Object.values(controls).forEach((c) => c.node.remove());

  return JSON.stringify({
    total: out.total,
    overflow: out.overflow.length,
    empty: out.empty.length,
    inert: out.inert.length,
    overflowList: out.overflow.slice(0, 30),
    emptyList: out.empty.slice(0, 30),
    inertList: out.inert.slice(0, 30),
  });
})();
