// What each effect animates. PLAN.md §16.4
//
// A grey square tells you nothing about an effect. The subject should say what
// the effect is FOR: a bell for shake, an eye for fade, a door for hinge — and
// real text wherever the effect is about text, because a typewriter animating a
// box is meaningless.
//
// Resolution order: exact class -> longest matching prefix -> fallback.
//
// DIRECTION: an arrow shows the direction of TRAVEL, not the origin. The classic
// names these by where the element comes FROM — `fadeInRight` starts at
// translate3d(100%, 0, 0) and moves LEFT — so the In* pairs read inverted if you
// map the word to the arrow. Up and down happen to agree; left and right do not.

const T = (text) => ({ kind: "text", text });
// A track the library duplicates for a seamless loop.
const M = (text) => ({ kind: "marquee", text });
// One span per character, each carrying its --an-i stagger index.
const S = (text) => ({ kind: "split", text });
const W = (text) => ({ kind: "word", text });
const I = (icon, label) => ({ kind: "icon", icon, label });
const P = (label) => ({ kind: "panel", label });

// ---------------------------------------------------------------- exact hits
export const EXACT = {
  // One icon per class, explicitly. A PREFIX entry serves a whole family from
  // a single line, which is how eleven fadeIn variants shared one wand.
  "an-backInDown": I("arrow-pointer", "backInDown"),
  "an-backInLeft": I("arrows-left-right", "backInLeft"),
  "an-backInRight": I("arrows-rotate", "backInRight"),
  "an-backInUp": I("arrows-up-down", "backInUp"),
  "an-bounceIn": I("avocado", "bounceIn"),
  "an-bounceInDown": I("bars-staggered", "bounceInDown"),
  "an-bounceInLeft": I("bat", "bounceInLeft"),
  "an-bounceInRight": I("bell", "bounceInRight"),
  "an-bounceInUp": I("bird", "bounceInUp"),
  "an-fadeIn": I("bolt", "fadeIn"),
  "an-fadeInBottomLeft": I("bolt-lightning", "fadeInBottomLeft"),
  "an-fadeInBottomRight": I("bomb", "fadeInBottomRight"),
  "an-fadeInDown": I("brain-circuit", "fadeInDown"),
  "an-fadeInDownBig": I("broccoli", "fadeInDownBig"),
  "an-fadeInLeft": I("burst", "fadeInLeft"),
  "an-fadeInLeftBig": I("cactus", "fadeInLeftBig"),
  "an-fadeInRight": I("camera-retro", "fadeInRight"),
  "an-fadeInRightBig": I("candy-cane", "fadeInRightBig"),
  "an-fadeInTopLeft": I("carrot", "fadeInTopLeft"),
  "an-fadeInTopRight": I("cat", "fadeInTopRight"),
  "an-fadeInUp": I("cauldron", "fadeInUp"),
  "an-fadeInUpBig": I("cheese", "fadeInUpBig"),
  "an-flip": I("chess-knight", "flip"),
  "an-flipInX": I("circle-dot", "flipInX"),
  "an-flipInY": I("circle-half-stroke", "flipInY"),
  "an-jackInTheBox": I("ufo", "jackInTheBox"),
  "an-lightSpeedInLeft": I("circle-nodes", "lightSpeedInLeft"),
  "an-lightSpeedInRight": I("clone", "lightSpeedInRight"),
  "an-rollIn": I("cloud", "rollIn"),
  "an-rotateIn": I("cloud-bolt", "rotateIn"),
  "an-rotateInDownLeft": I("cloud-moon", "rotateInDownLeft"),
  "an-rotateInDownRight": I("compass", "rotateInDownRight"),
  "an-rotateInUpLeft": I("compress", "rotateInUpLeft"),
  "an-rotateInUpRight": I("computer-mouse", "rotateInUpRight"),
  "an-slideInDown": I("cookie-bite", "slideInDown"),
  "an-slideInLeft": I("copy", "slideInLeft"),
  "an-slideInRight": I("crab", "slideInRight"),
  "an-slideInUp": I("crop-simple", "slideInUp"),
  "an-zoomIn": I("crystal-ball", "zoomIn"),
  "an-zoomInDown": I("cube", "zoomInDown"),
  "an-zoomInLeft": I("diamond", "zoomInLeft"),
  "an-zoomInRight": I("dice-d20", "zoomInRight"),
  "an-zoomInUp": I("dinosaur", "zoomInUp"),
  "an-backOutDown": I("dog", "backOutDown"),
  "an-backOutLeft": I("dolphin", "backOutLeft"),
  "an-backOutRight": I("download", "backOutRight"),
  "an-backOutUp": I("dragon", "backOutUp"),
  "an-bounceOut": I("droplet", "bounceOut"),
  "an-bounceOutDown": I("drum", "bounceOutDown"),
  "an-bounceOutLeft": I("drumstick", "bounceOutLeft"),
  "an-bounceOutRight": I("egg-fried", "bounceOutRight"),
  "an-bounceOutUp": I("expand", "bounceOutUp"),
  "an-fadeOut": I("explosion", "fadeOut"),
  "an-fadeOutBottomLeft": I("eye", "fadeOutBottomLeft"),
  "an-fadeOutBottomRight": I("eye-slash", "fadeOutBottomRight"),
  "an-fadeOutDown": I("face-grin-stars", "fadeOutDown"),
  "an-fadeOutDownBig": I("face-hand-peeking", "fadeOutDownBig"),
  "an-fadeOutLeft": I("face-melting", "fadeOutLeft"),
  "an-fadeOutLeftBig": I("fan", "fadeOutLeftBig"),
  "an-fadeOutRight": I("feather", "fadeOutRight"),
  "an-fadeOutRightBig": I("feather-pointed", "fadeOutRightBig"),
  "an-fadeOutTopLeft": I("fire", "fadeOutTopLeft"),
  "an-fadeOutTopRight": I("fire-flame-curved", "fadeOutTopRight"),
  "an-fadeOutUp": I("flask-gear", "fadeOutUp"),
  "an-fadeOutUpBig": I("gamepad-modern", "fadeOutUpBig"),
  "an-flipOutX": I("gauge-high", "flipOutX"),
  "an-flipOutY": I("gem", "flipOutY"),
  "an-hinge": I("door-open", "hinge"),
  "an-lightSpeedOutLeft": I("ghost", "lightSpeedOutLeft"),
  "an-lightSpeedOutRight": I("gift", "lightSpeedOutRight"),
  "an-rollOut": I("glasses", "rollOut"),
  "an-rotateOut": I("grid-2", "rotateOut"),
  "an-rotateOutDownLeft": I("guitar-electric", "rotateOutDownLeft"),
  "an-rotateOutDownRight": I("hand-horns", "rotateOutDownRight"),
  "an-rotateOutUpLeft": I("hand-pointer", "rotateOutUpLeft"),
  "an-rotateOutUpRight": I("hand-spock", "rotateOutUpRight"),
  "an-slideOutDown": I("hat-wizard", "slideOutDown"),
  "an-slideOutLeft": I("headphones", "slideOutLeft"),
  "an-slideOutRight": I("heart", "slideOutRight"),
  "an-slideOutUp": I("heart-pulse", "slideOutUp"),
  "an-zoomOut": I("hexagon", "zoomOut"),
  "an-zoomOutDown": I("hotdog", "zoomOutDown"),
  "an-zoomOutLeft": I("ice-cream", "zoomOutLeft"),
  "an-zoomOutRight": I("image", "zoomOutRight"),
  "an-zoomOutUp": I("joystick", "zoomOutUp"),
  "an-blur-in": I("layer-group", "blur-in"),
  "an-blur-out": I("leaf-maple", "blur-out"),
  "an-down": I("arrow-down", "down"),
  "an-fade": I("lemon", "fade"),
  "an-fade-out": I("lightbulb", "fade-out"),
  "an-focus": I("fingerprint", "focus"),
  "an-fold": I("lightbulb-on", "fold"),
  "an-in-z": I("lobster", "in-z"),
  "an-left": I("arrow-right", "left"),
  "an-out-z": I("magnet", "out-z"),
  "an-pop": I("popcorn", "pop"),
  "an-right": I("arrow-left", "right"),
  "an-roll": I("magnifying-glass-minus", "roll"),
  "an-scale-in": I("magnifying-glass-plus", "scale-in"),
  "an-scale-out": I("martini-glass-citrus", "scale-out"),
  "an-scale-x": I("microphone-stand", "scale-x"),
  "an-scale-y": I("monkey", "scale-y"),
  "an-skew-in": I("moon", "skew-in"),
  "an-skew-x": I("moon-over-sun", "skew-x"),
  "an-skew-y": I("moon-stars", "skew-y"),
  "an-spin": I("space-station-moon", "spin"),
  "an-spin-x": I("mug-hot", "spin-x"),
  "an-spin-y": I("mushroom", "spin-y"),
  "an-tilt-in": I("otter", "tilt-in"),
  "an-up": I("arrow-up", "up"),
  "an-bounce": I("alien-8bit", "bounce"),
  "an-flash": I("meteor", "flash"),
  "an-glow-pulse": I("comet", "glow-pulse"),
  "an-headShake": I("duck", "headShake"),
  "an-heartBeat": I("hippo", "heartBeat"),
  "an-jello": I("frog", "jello"),
  "an-pulse": I("atom-simple", "pulse"),
  "an-rubberBand": I("octopus", "rubberBand"),
  "an-shake-error": I("alien-monster", "shake-error"),
  "an-shakeX": I("paint-roller", "shakeX"),
  "an-shakeY": I("paintbrush-fine", "shakeY"),
  "an-shine-sweep": I("palette", "shine-sweep"),
  "an-swing": I("narwhal", "swing"),
  "an-tada": I("cat-space", "tada"),
  "an-wiggle": I("squid", "wiggle"),
  "an-wobble": I("spider", "wobble"),
  "an-bloom": I("flower-tulip", "bloom"),
  "an-bob": I("spinner", "bob"),
  "an-breathe": I("whale", "breathe"),
  "an-float": I("starship", "float"),
  "an-jiggle": I("strawberry", "jiggle"),
  "an-orbit": I("planet-ringed", "orbit"),
  "an-pendulum": I("pig", "pendulum"),
  "an-sway": I("jedi", "sway"),
  "an-holographic": I("pizza-slice", "holographic"),
  "an-tape": I("projector", "tape"),
  "an-circle-expand": I("puzzle-piece", "circle-expand"),
  "an-clip-reveal-bl": I("rabbit", "clip-reveal-bl"),
  "an-clip-reveal-br": I("radar", "clip-reveal-br"),
  "an-clip-reveal-down": I("rainbow", "clip-reveal-down"),
  "an-clip-reveal-left": I("raindrops", "clip-reveal-left"),
  "an-clip-reveal-right": I("ring-diamond", "clip-reveal-right"),
  "an-clip-reveal-tl": I("robot", "clip-reveal-tl"),
  "an-clip-reveal-tr": I("rocket", "clip-reveal-tr"),
  "an-clip-reveal-up": I("rocket-launch", "clip-reveal-up"),
  "an-curtain": I("rotate-right", "curtain"),
  "an-diagonal-wipe": I("satellite", "diagonal-wipe"),
  "an-letterbox": I("scissors", "letterbox"),
  "an-shutter": I("seedling", "shutter"),
  "an-pop-like": I("shapes", "pop-like"),
  "an-press": I("shrimp", "press"),
  "an-press-squish": I("signal-stream", "press-squish"),
  "an-hover-border-slide": I("skull-crossbones", "hover-border-slide"),
  "an-hover-fill": I("snake", "hover-fill"),
  "an-hover-lift": I("snowflake", "hover-lift"),
  "an-hover-shine": I("snowman-head", "hover-shine"),
  "an-hover-sink": I("space-shuttle", "hover-sink"),
  "an-hover-zoom": I("sparkle", "hover-zoom"),
  "an-ripple": I("sparkles", "ripple"),
  // Side by side with the untouched picture, or the change is invisible.
  "an-pixelate": { kind: "compare", lowres: true },
  "an-dither": { kind: "compare", lowres: true },
  "an-halftone": { kind: "compare", lowres: true },
  "an-scanlines": { kind: "compare" },
  "an-video-overlay": { kind: "compare" },
  "an-lens-flare": { kind: "compare" },
  "an-expand-label": { kind: "label", icon: "download" },

  "an-spotlight-static": { kind: "plate", dark: true, label: "Hover me" },
  "an-cursor-spotlight": { kind: "plate", dark: true, label: "Hover me" },
  "an-hover-spotlight": { kind: "plate", dark: true, label: "Hover me" },
  "an-hover-tilt": { kind: "plate", label: "Tilt" },

  // A flare belongs over a photograph, like the rest of its group.
  // Light effects on a dark scene, applied to the element itself rather than
  // floating over the tile.
  "an-god-rays": { kind: "plate", dark: true, label: "" },
  "an-bg-fog": { kind: "plate", dark: true, label: "" },
  "an-bg-spotlight-static": { kind: "plate", dark: true, label: "Spotlight" },

  // Click releases the blur, which is the whole effect.
  "an-img-blur-load": { kind: "image", loadedOnPlay: true },
  // A vignette darkens the EDGES of a picture; on a flat panel there is nothing
  // to darken.
  "an-bg-vignette": { kind: "image" },
  // A specular highlight is a sheen across a surface, so it needs a surface.
  "an-specular": { kind: "plate", label: "Specular" },
  // A stack needs cards to stack.
  "an-card-stack": { kind: "cards", n: 3 },
  // Outline and shimmer are dark-text treatments; they do not need a panel.
  "an-text-outline": { kind: "word", text: "Outline" },
  "an-shimmer-sweep": { kind: "word", text: "Shimmer" },

  // An overlay over video needs something under it to overlay.
  "an-video": { kind: "image" },
  // The refraction is the point of this one, so the preview turns it on.
  "an-glass-real": { kind: "glass", label: "Refracted", refract: true },

  // These name `> img`, so the class goes on the wrapper, not the image.
  "an-img-zoom": { kind: "image", onFrame: true },
  "an-img-parallax": { kind: "image", onFrame: true },
  "an-img-reveal": { kind: "image", onFrame: true },

  // A pale sweep needs something dark to sweep across.

  // A halo and a ring need something round to sit on, not a panel.
  "an-pulse-ring": { kind: "badge" },
  // Fills a box from the bottom, so it needs a box.
  "an-liquid-fill": { kind: "plate", label: "Fill" },
  // A hover that lifts and tilts needs a surface with depth cues.

  // ---- clip-path and mask: need a FILLED box, not a glyph ------------------
  "an-clip-blob": { kind: "plate", label: "Clipped" },
  "an-clip-arrow": { kind: "plate", label: "Clipped" },
  "an-clip-ticket": { kind: "plate", label: "Ticket" },
  "an-clip-slant": { kind: "plate", label: "Clipped" },
  "an-clip-chevron": { kind: "plate", label: "Clipped" },
  "an-corner-cut": { kind: "plate", label: "Corner cut" },
  "an-divider-zigzag": { kind: "rule" },
  "an-divider-wave": { kind: "rule" },

  // ---- stroke drawing: needs a real path with a real length ---------------
  "an-checkmark-draw": { kind: "draw", path: "M10 25 L20 35 L38 14" },

  // ---- noise and grain: need an area and something to sit over ------------
  "an-noise": { kind: "glass", label: "Noise" },
  "an-noise-static": { kind: "glass", label: "Static" },
  "an-grain": { kind: "glass", label: "Grain" },
  "an-img-grain": { kind: "image" },

  // ---- pixel-level effects want a genuinely low-res source ----------------

  "an-ticker-block": {
    kind: "lines",
    lines: ["$ animatio build", "+ 530 effects", "22.8 KB -> 3.5 KB"],
  },


  // Hover effects that define a CHILD contract. Without the markup they
  // document -- .an-zone, .an-arrow, .an-label, .an-peek, a child <svg>, or
  // simply siblings -- the :hover rule matches nothing and the tile is dead.
  "an-hover-tilt-grid": { kind: "zones" },
  "an-hover-arrow": { kind: "arrow" },
  "an-card-peek": { kind: "peek" },
  "an-hover-icon-morph": { kind: "morph" },
  "an-hover-group": { kind: "siblings" },
  "an-hover-blur-siblings": { kind: "siblings" },
  "an-hover-dim-siblings": { kind: "siblings" },

  // attention seekers get the object they imitate

  // specials

  // text effects animate TEXT. Anything else is meaningless.
  "an-text-gradient": W("Gradient"),
  "an-text-gradient-anim": W("Gradient"),
  "an-text-rainbow": W("Rainbow"),
  "an-text-shimmer": W("Shimmer"),
  "an-text-holographic": W("Holographic"),
  "an-text-knockout": W("Knockout"),
  "an-text-3d": W("Extruded"),
  "an-text-extrude": W("Extruded"),
  "an-text-long-shadow": W("Long shadow"),
  "an-text-fire": W("Fire"),
  "an-text-ice": W("Ice"),
  "an-text-metal": W("Chrome"),
  "an-text-marker": W("Highlighted"),
  "an-text-highlight-sweep": W("Sweep to highlight"),
  "an-text-underline-draw": W("Draw underline"),
  "an-text-wavy-underline": W("Wavy underline"),
  "an-text-blur-focus": W("Focus"),
  "an-text-liquid-fill": W("Liquid"),
  "an-text-weight-morph": W("Weight"),
  "an-text-mask-image": W("Masked"),
  "an-text-marquee": M("Ship the animation, not the runtime."),
  "an-marquee": M("Ship the animation, not the runtime."),
  "an-ticker": { kind: "ticker", text: "npm i @radiobros/animatio  ->  22.8 KB" },
  "an-glitch": W("Glitch"),
  "an-glitch-rgb": W("Glitch"),
  "an-glitch-slice": W("Glitch"),
  "an-glitch-hover": W("Glitch"),
  "an-terminal": { kind: "panel", label: "$ animatio build" },
  "an-count-up": { kind: "number", to: 1284 },
  "an-neon": W("Neon"),
  "an-neon-tube": W("Neon"),
  "an-neon-flicker": W("Neon"),
  "an-neon-pulse": W("Neon"),
  "an-neon-cycle": W("Neon"),
  "an-liquid-text": W("Liquid"),
  "an-hover-swap": { kind: "swap", a: "Hover me", b: "Released" },
  "an-hover-underline-wipe": W("Wipe away"),

  // surfaces read as a panel over something, not as a glyph
  "an-glass": { kind: "glass", label: "Glass" },
  "an-glass-dark": { kind: "glass", label: "Dark glass" },
  "an-glass-frost": { kind: "glass", label: "Frosted" },

  // loaders are already their own subject
  "an-spinner": { kind: "bare" },
  "an-spinner-dual": { kind: "bare" },
  "an-spinner-orbit": { kind: "bare" },
  "an-progress-indeterminate": { kind: "bare" },
  "an-morph-loader": { kind: "bare" },
  "an-skeleton": { kind: "skeleton" },
  "an-dots": { kind: "children", n: 3 },
  // Bars, unlike dots, are sized BY the effect: an-bars animates height from
  // 30% to 100%, so the docs must not pin the kid's shape.
  "an-bars": { kind: "bars", n: 5 },
};

// ------------------------------------------------------------ prefix matches
// Longest prefix wins, so `an-fadeInTopLeft` beats `an-fade`.
export const PREFIX = [
  // Glass is a backdrop filter: over a flat page there is nothing behind it to
  // blur, so every variant gets a photo to sit on.
  ["an-glass", { kind: "glass", label: "Glass" }],
  // Image effects need an image. Most of these were pointed at an icon.
  ["an-img-", { kind: "image" }],


  ["an-backOut", I("sun", "back out")],
  ["an-backIn", I("sun-bright", "back in")],



  ["an-slideOut", I("taco", "slide out")],

  ["an-rotate", I("telescope", "rotate")],
  ["an-flipIn", I("tornado", "flip in")],
  ["an-flipOut", I("tower-broadcast", "flip out")],
  ["an-lightSpeed", I("tree-palm", "light speed")],

  // atoms
  ["an-scale", I("square-full", "scale")],
  ["an-skew", I("unicorn", "skew")],
  ["an-blur", I("user-robot", "blur")],

  // text catch-alls sit before the generic families
  ["an-text-split", S("One character at a time")],
  ["an-text-wave", S("Wave through the words")],
  ["an-text-scatter", S("Scatter into place")],
  ["an-text-shuffle", S("Shuffle in")],
  ["an-text-flip-chars", S("Flip each glyph")],
  ["an-text-jump", S("Jumping letters")],
  ["an-text-sparkle", S("Sparkling text")],
  ["an-text", W("Typography")],

  // fx families
  ["an-svg-goo", { kind: "goo", n: 3 }],
  ["an-svg-heat", I("volcano", "heat haze")],
  ["an-svg-flag", I("wand-magic-sparkles", "flag wave")],
  ["an-svg", I("wand-sparkles", "SVG filter")],

  ["an-blob", { kind: "blob" }],
  ["an-liquid", I("watermelon-slice", "liquid")],

  // Screen treatments need a screen. An icon with scanlines over it reads as
  // a smudge; a panel reads as a display.
  ["an-vhs", { kind: "image" }],
  ["an-scanlines", { kind: "image" }],
  ["an-noise-static", P("Static")],
  ["an-dither", { kind: "image" }],
  ["an-halftone", { kind: "image" }],
  ["an-pixelate", { kind: "image" }],

  ["an-shine", I("wine-glass", "shine")],
  ["an-specular", I("anchor", "specular")],
  ["an-lens-flare", I("bee", "lens flare")],
  ["an-god-rays", I("bug-slash", "god rays")],

  // Family catch-alls, so a variant never falls through to the generic icon.
  ["an-skeleton", { kind: "skeleton" }],
  ["an-spotlight", P("Spotlight")],

  ["an-bg-bokeh", { kind: "particles", n: 9 }],
  ["an-bg", P("")],
  ["an-noise", P("Grain")],
  ["an-shadow", P("Elevation")],

  ["an-card", P("Card")],
  ["an-img", { kind: "image" }],
  ["an-video", { kind: "image" }],

  ["an-border", P("Border")],
  ["an-divider", { kind: "rule" }],
  ["an-clip", I("butterfly", "clip")],
  ["an-corner-cut", I("helicopter", "corner cut")],
  // A torn edge is a mask on a filled shape; scissors on a transparent glyph
  // showed the icon, not the effect.
  ["an-torn", { kind: "plate", label: "Torn" }],

  // A pointing hand reads as "click". These are pointer-state effects, so the
  // icon should say which pointer state.
  ["an-hover", I("sailboat", "hover")],
  ["an-magnetic", I("snowflakes", "magnetic")],
  ["an-cursor", I("tractor", "cursor")],
  ["an-expand-label", I("train-subway", "expand")],

  ["an-flip-card", P("Flip card")],
  ["an-cube", I("truck-monster", "cube")],
  ["an-carousel", { kind: "particles", n: 6 }],
  ["an-depth-stack", I("star", "depth")],
  ["an-layered", I("turtle", "layers")],
  ["an-book", I("waveform", "book")],
  ["an-3d", I("umbrella-beach", "3D")],
  ["an-perspective", I("worm", "perspective")],

  ["an-scrub", I("apple-whole", "scroll scrub")],
  ["an-parallax", I("banana", "parallax")],
  ["an-progress", { kind: "bare" }],
  ["an-sticky", I("baseball-bat-ball", "sticky stack")],
  ["an-hero-shrink", I("basketball", "shrink")],
  ["an-reveal", I("bowl-rice", "reveal")],
  ["an-snap", I("bowling-ball", "snap")],
  ["an-timeline", I("burrito", "timeline")],

  ["an-vt", I("cake-candles", "view transition")],
  ["an-morph", I("clapperboard-play", "morph")],

  ["an-marquee", M("Ship the animation, not the runtime.")],

  ["an-blinds", { kind: "slats", n: 6 }],
  ["an-iris", I("egg", "iris")],
  ["an-mask", I("ferris-wheel", "mask")],

  ["an-shimmer", { kind: "bare" }],
  ["an-toast", P("Saved")],
  ["an-confetti", I("film-canister", "confetti")],
  ["an-checkmark", I("stars", "done")],
  ["an-count", { kind: "number", to: 1284 }],

  ["an-ease", I("tv-retro", "easing")],
  ["an-stagger", { kind: "children", n: 4 }],
  ["an-gpu", I("wave-square", "gpu")],
  ["an-contain", I("fish-cooked", "contain")],
];

const FALLBACK = I("football-helmet", "effect");

export function contentFor(name) {
  if (EXACT[name]) return EXACT[name];
  const matches = PREFIX.filter(([p]) => name.startsWith(p));
  if (!matches.length) return FALLBACK;
  matches.sort((a, b) => b[0].length - a[0].length);
  return matches[0][1];
}
