// Animatio docs — reveal every block of prose on scroll, at build time.
// PLAN.md §16.8
//
// The site ships an animation library, so every block on it should be animated
// BY that library. Doing that by hand across thirteen markdown pages would rot
// on the first edit, so it happens here instead: a markdown-it rule that wraps
// each top-level block in the reveal contract the docs tell consumers to use.
//
//     <div class="an-reveal">
//       <p class="an an-fadeInUp">…</p>
//     </div>
//
// That is the real wrapper form from §8.2.1, so the docs demonstrate the exact
// markup they document, and it resolves through all three tiers: native
// animation-trigger, the style-query latch, or plain visible content.
//
// This is BUILD TIME. No runtime JavaScript is added to the site.
//
// SAFETY: reveals hide their target until the trigger fires, so anything that
// must never be hidden is excluded below. Headings are excluded on purpose —
// a heading that has not revealed yet reads as a missing section, and the
// in-page outline links to them.

const SKIP_TAGS = new Set([
  "h1", // the page title must be there on first paint, for LCP and for search
  "script",
  "style",
]);

// Blocks that carry their own animation already, or that break when wrapped.
const SKIP_IF_CONTAINS = [
  "an-reveal", // never nest the contract inside itself
  "vp-doc-", // VitePress internals
  "custom-block", // tip/warning containers manage their own layout
];

const STAGGER_MS = 55;

export function revealPlugin(md) {
  const KIND = {
    paragraph_open: "an-fadeInUp",
    bullet_list_open: "an-fadeInUp",
    ordered_list_open: "an-fadeInUp",
    blockquote_open: "an-fadeInLeft",
    table_open: "an-fadeIn",
    fence: "an-fadeInUp",
    heading_open: "an-fadeInUp",
  };

  md.core.ruler.push("animatio_reveal", (state) => {
    const tokens = state.tokens;
    const out = [];
    let index = 0;

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];

      // Only top-level blocks. Nested list items and table cells inherit the
      // parent's reveal rather than each getting their own, which would look
      // like popcorn.
      if (t.level !== 0 || !(t.type in KIND)) {
        out.push(t);
        continue;
      }

      const tag = t.tag || t.type;
      if (SKIP_TAGS.has(tag)) {
        out.push(t);
        continue;
      }

      const existing = t.attrGet?.("class") || "";
      if (SKIP_IF_CONTAINS.some((s) => existing.includes(s))) {
        out.push(t);
        continue;
      }

      // A fence is a single self-closing token; everything else is an
      // open/close pair we have to find the end of.
      const isSelfContained = t.type === "fence";
      let close = i;
      if (!isSelfContained) {
        const closeType = t.type.replace(/_open$/, "_close");
        let depth = 0;
        for (let j = i + 1; j < tokens.length; j++) {
          if (tokens[j].type === t.type) depth++;
          else if (tokens[j].type === closeType) {
            if (depth === 0) {
              close = j;
              break;
            }
            depth--;
          }
        }
        if (close === i) {
          out.push(t);
          continue;
        }
      }

      const delay = (index % 4) * STAGGER_MS;
      index++;

      const open = new state.Token("html_block", "", 0);
      open.content = `<div class="an-reveal">\n`;
      const shut = new state.Token("html_block", "", 0);
      shut.content = `</div>\n`;

      // The animation class goes on the CONTENT, the reveal on the wrapper.
      const add = (tok) => {
        const prev = tok.attrGet("class");
        tok.attrSet("class", [prev, "an", KIND[t.type]].filter(Boolean).join(" "));
        const style = tok.attrGet("style");
        // animation-duration / animation-delay, NOT the custom properties:
        // --an-* inherits, so a wrapped block would hand its 0.7s to every
        // preview nested inside it.
        const mine = `animation-duration:.7s;animation-delay:${delay}ms`;
        tok.attrSet("style", style ? `${style};${mine}` : mine);
      };

      out.push(open);
      if (isSelfContained) {
        // A fence renders its own <pre>; wrap it in a span we can class.
        const wrap = new state.Token("html_block", "", 0);
        wrap.content = `<div class="an ${KIND[t.type]}" style="animation-duration:.7s;animation-delay:${delay}ms">\n`;
        const wrapEnd = new state.Token("html_block", "", 0);
        wrapEnd.content = `</div>\n`;
        out.push(wrap, t, wrapEnd);
      } else {
        add(t);
        for (let j = i; j <= close; j++) out.push(tokens[j]);
        i = close;
      }
      out.push(shut);
    }

    state.tokens = out;
  });
}
