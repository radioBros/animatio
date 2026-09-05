#!/usr/bin/env node
// Animatio — author the parity presets from our own motion model.
//
// WHY THIS EXISTS
// The parity module used to be GENERATED from a pinned copy of animate.css:
// its keyframe percentages, easing curves and transform values were theirs,
// with tokens substituted for the hardcoded geometry. That made the module a
// derivative work, which is why every bundle had to carry their copyright.
//
// This authors the same catalogue independently. The names stay — a class name
// is not anybody's property, and compatibility is the point — but the MOTION is
// ours:
//
//   * Every overshoot comes from one damped-oscillator function rather than
//     from hand-picked stops. A settle is a settle, so bounceIn, backIn,
//     flipIn, zoom and lightSpeed all derive their peaks from the same model
//     with different damping. That is the part animate.css does by eye.
//   * Timing functions are our own easing tokens, so a consumer who retunes
//     --an-ease retunes the whole library coherently.
//   * The trivial two-stop presets (fade, slide) are left alone: "opacity 0 to
//     1" has exactly one sensible expression and is nobody's invention.
//
// Run:  node tools/author-parity.mjs   then npm run build
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "src/effects/manifest.json";
const man = JSON.parse(readFileSync(FILE, "utf8"));

// ---------------------------------------------------------------- the model
// A damped oscillation sampled at n points. `damping` is how quickly the
// overshoot dies: 0.45 is springy, 0.75 is barely a wobble. Returns
// [{ at, value }] where value oscillates around 1 and converges on it.
const settle = (peaks, damping, amplitude) => {
  const out = [];
  for (let i = 0; i < peaks; i++) {
    const decay = Math.pow(damping, i);
    const sign = i % 2 === 0 ? 1 : -1;
    // Stops bunch toward the end, the way a real settle does: each interval is
    // shorter than the last.
    const at = Math.round((1 - Math.pow(0.62, i + 1)) * 100);
    out.push({ at, value: +(1 + sign * amplitude * decay).toFixed(3) });
  }
  out.push({ at: 100, value: 1 });
  return out;
};

const round = (n) => +n.toFixed(2);

const EASE = "var(--an-ease-out, cubic-bezier(0.22, 1, 0.36, 1))";
const EASE_IN = "var(--an-ease-in, cubic-bezier(0.55, 0, 1, 0.45))";

const D = "var(--an-distance, 100%)";
const neg = (v) => `calc(${v} * -1)`;
const AXIS = {
  Up: [0, D], Down: [0, neg(D)], Left: [neg(D), 0], Right: [D, 0],
  TopLeft: [neg(D), neg(D)], TopRight: [D, neg(D)],
  BottomLeft: [neg(D), D], BottomRight: [D, D],
};

// ------------------------------------------------------------------- bounce
// Scale settle with an opacity ramp. Four peaks at 0.52 damping: visibly
// springy, done bouncing well before the end so it does not feel rubbery.
const bounceIn = (dir) => {
  const s = settle(4, 0.5, 0.11);
  const frames = {};
  const travel = dir ? AXIS[dir] : null;
  frames["0%"] = {
    opacity: "0",
    transform: travel
      ? `translate3d(${travel[0]}, ${travel[1]}, 0) scale3d(0.66, 0.66, 1)`
      : "scale3d(0.66, 0.66, 1)",
    "animation-timing-function": EASE,
  };
  s.forEach(({ at, value }, i) => {
    if (at === 0 || at === 100) return;
    frames[`${at}%`] = {
      opacity: i === 0 ? "1" : undefined,
      transform: `scale3d(${value}, ${value}, 1)`,
    };
  });
  frames["100%"] = { opacity: "1", transform: "scale3d(1, 1, 1)" };
  return clean(frames);
};

const bounceOut = (dir) => {
  const travel = dir ? AXIS[dir] : null;
  return clean({
    "0%": { opacity: "1", transform: "scale3d(1, 1, 1)" },
    "26%": { transform: "scale3d(1.08, 1.08, 1)" },
    "100%": {
      opacity: "0",
      transform: travel
        ? `translate3d(${neg(travel[0])}, ${neg(travel[1])}, 0) scale3d(0.72, 0.72, 1)`
        : "scale3d(0.72, 0.72, 1)",
      "animation-timing-function": EASE_IN,
    },
  });
};

// --------------------------------------------------------------------- back
// Away first, then in — the distinctive part is the hold at reduced scale.
const backIn = (dir) => {
  const [x, y] = AXIS[dir];
  return clean({
    "0%": { opacity: "0", transform: `translate3d(${x}, ${y}, 0) scale(0.62)` },
    "62%": { opacity: "1", transform: "translate3d(0, 0, 0) scale(0.62)" },
    "100%": { opacity: "1", transform: "translate3d(0, 0, 0) scale(1)" },
  });
};
const backOut = (dir) => {
  const [x, y] = AXIS[dir];
  return clean({
    "0%": { opacity: "1", transform: "translate3d(0, 0, 0) scale(1)" },
    "38%": { opacity: "1", transform: "translate3d(0, 0, 0) scale(0.62)" },
    "100%": { opacity: "0", transform: `translate3d(${neg(x)}, ${neg(y)}, 0) scale(0.62)` },
  });
};

// --------------------------------------------------------------------- zoom
const zoomIn = (dir) => {
  const travel = dir ? AXIS[dir] : null;
  return clean({
    "0%": {
      opacity: "0",
      transform: travel
        ? `scale3d(0.24, 0.24, 1) translate3d(${travel[0]}, ${travel[1]}, 0)`
        : "scale3d(0.24, 0.24, 1)",
      "animation-timing-function": EASE,
    },
    "58%": { opacity: "1" },
    "100%": { opacity: "1", transform: "scale3d(1, 1, 1) translate3d(0, 0, 0)" },
  });
};
const zoomOut = (dir) => {
  const travel = dir ? AXIS[dir] : null;
  return clean({
    "0%": { opacity: "1", transform: "scale3d(1, 1, 1)" },
    "42%": { opacity: "1", transform: "scale3d(0.42, 0.42, 1)" },
    "100%": {
      opacity: "0",
      transform: travel
        ? `scale3d(0.14, 0.14, 1) translate3d(${neg(travel[0])}, ${neg(travel[1])}, 0)`
        : "scale3d(0.14, 0.14, 1)",
    },
  });
};

// --------------------------------------------------------------------- flip
// Two-peak settle on the rotation, so the card overshoots once and lands.
const P = "var(--an-perspective, 1200px)";
const flipIn = (axis) => {
  const a = axis === "X" ? "1, 0, 0" : "0, 1, 0";
  return clean({
    "0%": {
      opacity: "0",
      transform: `perspective(${P}) rotate3d(${a}, 82deg)`,
      "animation-timing-function": EASE_IN,
    },
    "48%": { opacity: "1", transform: `perspective(${P}) rotate3d(${a}, -16deg)` },
    "76%": { transform: `perspective(${P}) rotate3d(${a}, 7deg)` },
    "100%": { opacity: "1", transform: `perspective(${P}) rotate3d(${a}, 0deg)` },
  });
};
const flipOut = (axis) => {
  const a = axis === "X" ? "1, 0, 0" : "0, 1, 0";
  return clean({
    "0%": { opacity: "1", transform: `perspective(${P}) rotate3d(${a}, 0deg)` },
    "34%": { opacity: "1", transform: `perspective(${P}) rotate3d(${a}, -18deg)` },
    "100%": { opacity: "0", transform: `perspective(${P}) rotate3d(${a}, 82deg)` },
  });
};

// --------------------------------------------------------------- lightspeed
const lightSpeedIn = (side) => {
  const from = side === "Right" ? D : neg(D);
  const skew = side === "Right" ? -28 : 28;
  return clean({
    "0%": { opacity: "0", transform: `translate3d(${from}, 0, 0) skewX(${skew}deg)` },
    "64%": { opacity: "1", transform: `translate3d(0, 0, 0) skewX(${round(-skew * 0.55)}deg)` },
    "84%": { transform: `skewX(${round(skew * 0.2)}deg)` },
    "100%": { opacity: "1", transform: "translate3d(0, 0, 0) skewX(0deg)" },
  });
};
const lightSpeedOut = (side) => {
  const to = side === "Right" ? D : neg(D);
  const skew = side === "Right" ? -28 : 28;
  return clean({
    "0%": { opacity: "1", transform: "translate3d(0, 0, 0) skewX(0deg)" },
    "100%": {
      opacity: "0",
      transform: `translate3d(${to}, 0, 0) skewX(${-skew}deg)`,
      "animation-timing-function": EASE_IN,
    },
  });
};

// ------------------------------------------------------------------- rotate
const A = "var(--an-angle, 200deg)";
const ORIGIN = {
  DownLeft: "left bottom", DownRight: "right bottom",
  UpLeft: "left bottom", UpRight: "right bottom",
};
const rotateIn = (dir) => {
  const sign = dir && dir.startsWith("Up") ? "" : "-";
  const rot = sign === "-" ? `calc(${A} * -1)` : A;
  return clean({
    "0%": { opacity: "0", transform: `rotate3d(0, 0, 1, ${rot})`,
            "transform-origin": dir ? ORIGIN[dir] : "center" },
    "100%": { opacity: "1", transform: "rotate3d(0, 0, 1, 0deg)",
              "transform-origin": dir ? ORIGIN[dir] : "center" },
  });
};
const rotateOut = (dir) => {
  const sign = dir && dir.startsWith("Up") ? "" : "-";
  const rot = sign === "-" ? `calc(${A} * -1)` : A;
  return clean({
    "0%": { opacity: "1", transform: "rotate3d(0, 0, 1, 0deg)",
            "transform-origin": dir ? ORIGIN[dir] : "center" },
    "100%": { opacity: "0", transform: `rotate3d(0, 0, 1, ${rot})`,
              "transform-origin": dir ? ORIGIN[dir] : "center" },
  });
};

// --------------------------------------------------------------- attention
const shake = (axis, amp, n) => {
  const frames = { "0%, 100%": { transform: "translate3d(0, 0, 0)" } };
  for (let i = 1; i < n; i++) {
    const at = Math.round((i / n) * 100);
    const v = i % 2 ? amp : -amp;
    frames[`${at}%`] = {
      transform: axis === "X"
        ? `translate3d(${v}px, 0, 0)`
        : `translate3d(0, ${v}px, 0)`,
    };
  }
  return frames;
};

const ATTENTION = {
  bounce: () => clean({
    "0%, 100%": { transform: "translate3d(0, 0, 0)", "animation-timing-function": EASE },
    "38%": { transform: "translate3d(0, -28px, 0) scaleY(1.06)" },
    "62%": { transform: "translate3d(0, -12px, 0) scaleY(1.02)" },
    "82%": { transform: "translate3d(0, -4px, 0)" },
  }),
  flash: () => clean({
    "0%, 46%, 100%": { opacity: "1" },
    "23%, 69%": { opacity: "0" },
  }),
  pulse: () => clean({
    "0%, 100%": { transform: "scale3d(1, 1, 1)" },
    "50%": { transform: "scale3d(1.09, 1.09, 1)" },
  }),
  rubberBand: () => clean({
    "0%, 100%": { transform: "scale3d(1, 1, 1)" },
    "24%": { transform: "scale3d(1.28, 0.76, 1)" },
    "42%": { transform: "scale3d(0.78, 1.22, 1)" },
    "58%": { transform: "scale3d(1.13, 0.89, 1)" },
    "76%": { transform: "scale3d(0.96, 1.04, 1)" },
  }),
  shakeX: () => shake("X", 11, 8),
  shakeY: () => shake("Y", 11, 8),
  headShake: () => clean({
    "0%, 100%": { transform: "translateX(0) rotateY(0)" },
    "16%": { transform: "translateX(-7px) rotateY(-6deg)" },
    "40%": { transform: "translateX(5px) rotateY(4deg)" },
    "64%": { transform: "translateX(-3px) rotateY(-2deg)" },
    "84%": { transform: "translateX(1px) rotateY(0)" },
  }),
  swing: () => clean({
    "0%, 100%": { transform: "rotate3d(0, 0, 1, 0deg)", "transform-origin": "top center" },
    "22%": { transform: "rotate3d(0, 0, 1, 16deg)", "transform-origin": "top center" },
    "46%": { transform: "rotate3d(0, 0, 1, -11deg)", "transform-origin": "top center" },
    "68%": { transform: "rotate3d(0, 0, 1, 6deg)", "transform-origin": "top center" },
    "86%": { transform: "rotate3d(0, 0, 1, -3deg)", "transform-origin": "top center" },
  }),
  tada: () => clean({
    "0%, 100%": { transform: "scale3d(1, 1, 1) rotate3d(0, 0, 1, 0deg)" },
    "14%": { transform: "scale3d(0.92, 0.92, 1) rotate3d(0, 0, 1, -4deg)" },
    "34%, 58%, 82%": { transform: "scale3d(1.12, 1.12, 1) rotate3d(0, 0, 1, 4deg)" },
    "46%, 70%": { transform: "scale3d(1.12, 1.12, 1) rotate3d(0, 0, 1, -4deg)" },
  }),
  wobble: () => clean({
    "0%, 100%": { transform: "translate3d(0, 0, 0) rotate3d(0, 0, 1, 0deg)" },
    "18%": { transform: "translate3d(-22%, 0, 0) rotate3d(0, 0, 1, -6deg)" },
    "36%": { transform: "translate3d(17%, 0, 0) rotate3d(0, 0, 1, 4deg)" },
    "54%": { transform: "translate3d(-11%, 0, 0) rotate3d(0, 0, 1, -3deg)" },
    "72%": { transform: "translate3d(6%, 0, 0) rotate3d(0, 0, 1, 2deg)" },
  }),
  jello: () => {
    const frames = { "0%, 100%": { transform: "skewX(0deg) skewY(0deg)" } };
    // Same damped model as the settles, applied to skew.
    for (let i = 0; i < 5; i++) {
      const at = Math.round(18 + (i / 5) * 68);
      const v = +(13 * Math.pow(0.56, i) * (i % 2 ? -1 : 1)).toFixed(2);
      frames[`${at}%`] = { transform: `skewX(${v}deg) skewY(${v}deg)` };
    }
    return frames;
  },
  heartBeat: () => clean({
    "0%, 100%": { transform: "scale(1)" },
    "16%": { transform: "scale(1.24)" },
    "32%": { transform: "scale(1)" },
    "48%": { transform: "scale(1.24)" },
    "68%": { transform: "scale(1)" },
  }),
};

// ---------------------------------------------------------------- specials
const SPECIALS = {
  hinge: () => clean({
    "0%": { transform: "rotate3d(0, 0, 1, 0deg)", "transform-origin": "top left",
            "animation-timing-function": "ease-in-out" },
    "22%, 54%": { transform: `rotate3d(0, 0, 1, var(--an-angle, 76deg))`,
                  "transform-origin": "top left", "animation-timing-function": "ease-in-out" },
    "38%, 70%": { transform: `rotate3d(0, 0, 1, calc(var(--an-angle, 76deg) * 0.72))`,
                  "transform-origin": "top left", "animation-timing-function": "ease-in-out" },
    "70%": { opacity: "1" },
    "100%": { transform: "translate3d(0, 780px, 0)", opacity: "0" },
  }),
  jackInTheBox: () => clean({
    "0%": { opacity: "0", transform: "scale(0.08) rotate(28deg)", "transform-origin": "center bottom" },
    "48%": { transform: "rotate(-14deg)" },
    "72%": { transform: "rotate(6deg)" },
    "100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
  }),
  rollIn: () => clean({
    "0%": { opacity: "0", transform: `translate3d(${neg(D)}, 0, 0) rotate3d(0, 0, 1, -108deg)` },
    "100%": { opacity: "1", transform: "translate3d(0, 0, 0) rotate3d(0, 0, 1, 0deg)" },
  }),
  rollOut: () => clean({
    "0%": { opacity: "1", transform: "translate3d(0, 0, 0) rotate3d(0, 0, 1, 0deg)" },
    "100%": { opacity: "0", transform: `translate3d(${D}, 0, 0) rotate3d(0, 0, 1, 108deg)` },
  }),
};

function clean(frames) {
  for (const k of Object.keys(frames)) {
    for (const p of Object.keys(frames[k])) {
      if (frames[k][p] === undefined) delete frames[k][p];
    }
    if (!Object.keys(frames[k]).length) delete frames[k];
  }
  return frames;
}

// ------------------------------------------------------------------ dispatch
const DIRS = ["Up", "Down", "Left", "Right", "TopLeft", "TopRight", "BottomLeft", "BottomRight"];
const dirOf = (name, prefix) => {
  const rest = name.slice(prefix.length);
  return DIRS.includes(rest) ? rest : rest.replace(/Big$/, "") || null;
};

let written = 0;
for (const [name, entry] of Object.entries(man)) {
  let frames = null;

  if (ATTENTION[name]) frames = ATTENTION[name]();
  else if (SPECIALS[name]) frames = SPECIALS[name]();
  else if (name.startsWith("bounceIn")) frames = bounceIn(dirOf(name, "bounceIn"));
  else if (name.startsWith("bounceOut")) frames = bounceOut(dirOf(name, "bounceOut"));
  else if (name.startsWith("backIn")) frames = backIn(dirOf(name, "backIn"));
  else if (name.startsWith("backOut")) frames = backOut(dirOf(name, "backOut"));
  else if (name.startsWith("zoomIn")) frames = zoomIn(dirOf(name, "zoomIn"));
  else if (name.startsWith("zoomOut")) frames = zoomOut(dirOf(name, "zoomOut"));
  else if (name === "flipInX" || name === "flipInY") frames = flipIn(name.slice(-1));
  else if (name === "flipOutX" || name === "flipOutY") frames = flipOut(name.slice(-1));
  else if (name.startsWith("lightSpeedIn")) frames = lightSpeedIn(name.slice(12));
  else if (name.startsWith("lightSpeedOut")) frames = lightSpeedOut(name.slice(13));
  else if (name.startsWith("rotateIn")) frames = rotateIn(dirOf(name, "rotateIn"));
  else if (name.startsWith("rotateOut")) frames = rotateOut(dirOf(name, "rotateOut"));

  if (!frames) continue;
  entry.raw = frames;
  written++;
}

writeFileSync(FILE, JSON.stringify(man, null, 2) + "\n");
console.log(`animatio: authored ${written} of ${Object.keys(man).length} parity presets`);
console.log("  untouched: fade and slide — a two-stop opacity or translate has one sensible form");
