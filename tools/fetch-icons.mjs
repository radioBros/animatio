#!/usr/bin/env node
// Animatio docs — vendor the duotone icons used by the previews.
//
// Vendored at build time rather than fetched at runtime for three reasons: the previews
// need `currentColor` and per-layer opacity, which an <img> cannot give you;
// the site works offline; and 60 network requests on first paint would make a
// gallery of 530 effects feel exactly as slow as the library claims not to be.
//
//   node tools/fetch-icons.mjs
//
// Source: the project's own CDN mirror of Font Awesome Pro duotone.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const OUT = join(ROOT, "docs/.vitepress/theme/icons");
const BASE = "https://cdn.woptima.com/icons/awesome/duotone";

// Curated: each one is chosen for a specific effect family in
// docs/.vitepress/theme/preview-content.mjs. Nothing here is decorative.
const ICONS = [
  "apple-whole",
  "banana",
  "bowl-rice",
  "burrito",
  "cake-candles",
  "egg",
  "fish-cooked",
  "meat",
  "pepper-hot",
  "pretzel",
  "salad",
  "sushi",
  "wheat-slash",
  "bowling-ball",
  "baseball-bat-ball",
  "basketball",
  "football-helmet",
  "hockey-puck",
  "skiing",
  "tennis-ball",
  "trophy-star",
  "medal",
  "clapperboard-play",
  "film-canister",
  "masks-theater",
  "ferris-wheel",
  "roller-coaster",

  "bee",
  "butterfly",
  "worm",
  "snowflakes",
  "umbrella-beach",
  "anchor",
  "sailboat",
  "tractor",
  "helicopter",
  "train-subway",
  "truck-monster",
  "bug-slash",

  "dinosaur",
  "unicorn",
  "bird",
  "pig",
  "turtle",
  "dog",
  "cat",
  "rabbit",
  "monkey",
  "whale",
  "dolphin",
  "shrimp",
  "lobster",
  "snake",
  "spider",
  "bat",
  "mushroom",
  "cactus",
  "tree-palm",
  "volcano",
  "tornado",
  "rainbow",
  "cloud-bolt",
  "snowman-head",
  "ice-cream",
  "pizza-slice",
  "taco",
  "cookie-bite",
  "candy-cane",
  "popcorn",
  "drumstick",
  "lightbulb-on",
  "hand-spock",
  "face-grin-stars",
  "face-melting",
  "hand-horns",
  "skull-crossbones",
  "joystick",
  "gamepad-modern",
  "dice-d20",
  "chess-knight",
  "puzzle-piece",
  "paint-roller",
  "guitar-electric",
  "drum",
  "microphone-stand",
  "headphones",
  "camera-retro",
  "projector",
  "bomb",
  "rocket",
  "fire-flame-curved",
  "wand-sparkles",
  "martini-glass-citrus",
  "mug-hot",
  "cauldron",
  "crystal-ball",
  "ring-diamond",
  "bolt-lightning",
  "sun-bright",
  "moon-stars",
  "cloud-moon",
  "stars",
  "sparkle",
  "burst",
  "explosion",
  "radar",
  "tower-broadcast",
  "signal-stream",
  "fingerprint",
  "face-hand-peeking",
  "flower-tulip",
  "seedling",
  "leaf-maple",
  "feather-pointed",
  "egg-fried",
  "cheese",
  "hotdog",
  "watermelon-slice",
  "strawberry",
  "lemon",
  "avocado",
  "carrot",
  "broccoli",
  "wine-glass",

  // The previews are the product demo, so the subjects may as well be worth
  // looking at. A gem bouncing is a stock photo; an alien bouncing is a demo.
  "alien-8bit",
  "cat-space",
  "rocket-launch",
  "meteor",
  "space-station-moon",
  "jedi",
  "starship",
  "atom-simple",
  "user-robot",
  "ufo",
  "planet-ringed",
  "dragon",
  "alien-monster",
  "hat-wizard",
  "robot",
  "telescope",
  "satellite",
  "comet",
  "moon-over-sun",
  "space-shuttle",
  "flask-gear",
  "brain-circuit",
  "otter",
  "narwhal",
  "duck",
  "frog",
  "crab",
  "squid",
  "octopus",
  "hippo",

  // Pointer-interaction previews: the hand reads as "click", which is wrong for
  // a hover effect.
  "arrow-pointer",
  "download",
  "computer-mouse",
  "magnet",
  "circle-dot",
  // motion / direction
  "arrow-up", "arrow-down", "arrow-left", "arrow-right",
  "arrows-left-right", "arrows-up-down", "arrows-rotate", "rotate-right",
  "expand", "compress", "hand-pointer",
  // visibility
  "eye", "eye-slash",
  // scale
  "magnifying-glass-plus", "magnifying-glass-minus",
  // energy / attention
  "bolt", "bell", "heart", "heart-pulse", "star", "fire", "sparkles",
  "wand-magic-sparkles",
  // physical
  "door-open", "gift", "circle-half-stroke", "cube", "diamond", "hexagon",
  "shapes", "gem", "feather", "fan", "clone",
  // material / surface
  "droplet", "raindrops", "layer-group", "glasses", "palette",
  "paintbrush-fine", "image", "crop-simple", "scissors",
  // light
  "lightbulb", "sun", "moon", "cloud", "snowflake", "ghost",
  // signal / system
  "tv-retro", "spinner", "gauge-high", "waveform", "wave-square",
  "grid-2", "circle-nodes", "bars-staggered", "compass", "copy",
  "square-full", "sun",
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  let fetched = 0;
  let cached = 0;
  const failed = [];

  for (const name of [...new Set(ICONS)]) {
    const file = join(OUT, `${name}.svg`);
    if (existsSync(file) && readFileSync(file, "utf8").includes("<svg")) {
      cached++;
      continue;
    }
    try {
      const res = await fetch(`${BASE}/${name}.svg`);
      if (!res.ok) {
        failed.push(`${name} (${res.status})`);
        continue;
      }
      let svg = await res.text();
      // Strip the licence comment; it is reproduced once in NOTICES instead of
      // 60 times in the page source.
      svg = svg.replace(/<!--[\s\S]*?-->/g, "").trim();
      writeFileSync(file, svg + "\n");
      fetched++;
    } catch (err) {
      failed.push(`${name} (${err.message})`);
    }
  }

  console.log(
    `animatio: icons -> ${fetched} fetched, ${cached} cached, ${failed.length} failed`
  );
  if (failed.length) {
    console.error("  missing:", failed.join(", "));
    process.exit(1);
  }
}

main();
