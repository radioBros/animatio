// Animatio — PLAY every preview and check something happens.
//
// This is the audit that was missing. audit-gallery compares each tile against
// a bare control AT REST, so a click-to-play effect — every entrance, every
// spin, ken burns — was never exercised at all: at rest it carries no class, so
// it matched the control and passed. That is why previews kept coming back
// broken after being "checked".
//
// It only judges the tiles that ACTUALLY play on click. A static effect is
// applied at rest, so clicking it changes nothing and comparing before/after
// says "dead" about something that renders perfectly — that is audit-gallery's
// job (bare-control comparison), not this one's.
//
// Here every click-to-play tile is clicked (Vue's handler is a JS listener, so a dispatched
// click is a real one), then each animation on the subject is driven to 40% of
// its duration and compared with the same element before the click. A tile that
// looks identical mid-animation is not previewing anything.
//
//   $B eval tools/audit-play.mjs
(() => {
  const PROPS = [
    "transform", "opacity", "filter", "backdropFilter", "backgroundImage",
    "backgroundColor", "backgroundPosition", "backgroundSize", "boxShadow",
    "borderRadius", "color", "clipPath", "maskImage", "textShadow", "width",
    "height", "letterSpacing", "borderTopWidth", "strokeDasharray",
    "strokeDashoffset", "webkitTextStroke", "mixBlendMode", "imageRendering",
    "translate", "rotate", "scale", "visibility",
  ];

  const shot = (root) => {
    const out = [];
    for (const el of [root, ...root.querySelectorAll("*")]) {
      const s = getComputedStyle(el);
      const b = getComputedStyle(el, "::before");
      const a = getComputedStyle(el, "::after");
      out.push(
        PROPS.map((p) => s[p]).join("|") +
          "~" + [b.content, b.transform, b.opacity, b.backgroundImage, b.clipPath].join("|") +
          "~" + [a.content, a.transform, a.opacity, a.backgroundImage, a.clipPath].join("|")
      );
    }
    return out.join("\n");
  };

  // The cue tells us which kind of tile this is: a plain "click" cue means the
  // effect plays on demand; "hover"/"press"/"+ base" cues mark always-on tiles.
  const tiles = [...document.querySelectorAll(".tile")].filter((t) => {
    const cue = t.querySelector(".tile__cue");
    return cue && !cue.classList.contains("tile__cue--always");
  });
  const before = new Map();

  // Pass 1: rest state, and force layout so an off-screen tile is measurable.
  for (const t of tiles) {
    t.style.contentVisibility = "visible";
    const s = t.querySelector(".subject");
    if (s) before.set(t, shot(s));
  }

  // Pass 2: play everything.
  for (const t of tiles) {
    const btn = t.querySelector(".tile__stage") || t;
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  // Pass 3: sample mid-flight, in a frame callback rather than a later call.
  // The gallery drops the class when the animation ends, so anything sampled
  // after that point is back at rest and would read as dead.
  const sample = () => {
    const dead = [];
    const noAnim = [];
    for (const t of tiles) {
      const name = t.querySelector(".tile__name")?.textContent?.trim();
      const s = t.querySelector(".subject");
      if (!name || !s) continue;

      const anims = [s, ...s.querySelectorAll("*")].flatMap((el) => el.getAnimations());
      for (const a of anims) {
        try {
          const d = a.effect.getTiming().duration;
          a.currentTime = (typeof d === "number" ? d : 1000) * 0.4;
        } catch {}
      }
      const after = shot(s);
      const changed = after !== before.get(t);
      const running = anims.filter((a) => a.animationName !== "none").length;

      if (!changed && !running) dead.push(name);
      else if (!changed) noAnim.push(name);
      t.style.contentVisibility = "";
    }
    return {
      total: tiles.length,
      dead: dead.length,
      unchanged: noAnim.length,
      deadList: dead.slice(0, 40),
      unchangedList: noAnim.slice(0, 40),
    };
  };

  // One frame is enough for Vue to apply the classes the click triggered.
  return new Promise((resolve) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => resolve(JSON.stringify(sample())))
    )
  );
})();
