// Animatio — does hovering each tile actually change anything?
//
// Driving a real pointer over 65 tiles costs three round-trips each, so this
// does it statically instead: for every :hover rule that names a class, resolve
// the rule's target inside that tile and compare each declared value against
// what the element computes at rest. A rule whose target does not exist, or
// whose declarations already match the resting style, is a dead preview.
//
//   $B eval tools/audit-hover.mjs
(() => {
  const rules = [];
  // selectorText FIRST: a CSSStyleRule also exposes a cssRules list for nesting
  // in modern Chrome, so testing that first swallows every rule on the page.
  const walk = (l) => { for (const r of l) {
    if (r.selectorText && r.style) rules.push(r);
    if (r.cssRules && r.cssRules.length) walk(r.cssRules);
  } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }

  // Drop interaction state and functional pseudos, matching parens by depth: a
  // regex cannot, because :has(> .an-zone:nth-child(1):hover) nests.
  const bareify = (sel) => {
    let out = "", i = 0;
    while (i < sel.length) {
      const rest = sel.slice(i);
      const fn = rest.match(/^::?(has|not|is|where)\(/);
      if (fn) {
        let depth = 0, j = i + fn[0].length - 1;
        for (; j < sel.length; j++) {
          if (sel[j] === "(") depth++;
          else if (sel[j] === ")" && --depth === 0) break;
        }
        i = j + 1;
        continue;
      }
      const st = rest.match(/^::?(hover|active|focus-visible|focus|[a-z-]+)(?![\w(-])/);
      if (st && /^::/.test(st[0])) { i += st[0].length; continue; }
      if (st && ["hover", "active", "focus", "focus-visible"].includes(st[1])) {
        i += st[0].length; continue;
      }
      out += sel[i]; i++;
    }
    // Stripping :not(:hover) can leave a dangling combinator; `X > *:not(:hover)`
    // just means "X has children".
    return out.trim().replace(/[>+~]\s*$/, " *");
  };

  const dead = [], noTarget = [], ok = [];
  const tiles = [...document.querySelectorAll(".tile")];
  for (const tile of tiles) {
    const name = tile.querySelector(".tile__name")?.textContent?.trim();
    if (!name) continue;
    const re = new RegExp("\." + name + "(?![\w-])");
    const mine = rules.filter((r) =>
      r.selectorText.split(",").some((p) => /:hover|:active|:focus/.test(p) && re.test(p)));
    if (!mine.length) continue;

    tile.style.contentVisibility = "visible";
    let matched = false, changes = 0;
    for (const r of mine) {
      for (const sel of r.selectorText.split(",")) {
        // The state must be in THIS comma part. The reduced-motion block lists
        // all 272 selectors in one rule, so a rule-level test flagged every
        // entrance animation as a broken hover effect.
        if (!/:hover|:active|:focus/.test(sel)) continue;
        if (!new RegExp("\." + name + "(?![\w-])").test(sel)) continue;
        const bare = bareify(sel);
        if (!bare) continue;
        const pseudo = (sel.match(/::[a-z-]+/) || [null])[0];
        let targets = [];
        try {
          targets = [...tile.querySelectorAll(bare)];
          if (tile.matches(bare)) targets.push(tile);
        } catch { continue; }
        if (!targets.length) continue;
        matched = true;
        for (const el of targets) {
          const cs = getComputedStyle(el, pseudo);
          for (const prop of r.style) {
            const want = r.style.getPropertyValue(prop).trim();
            const have = cs.getPropertyValue(prop).trim();
            // Custom properties and transitions describe HOW, not WHAT.
            if (prop.startsWith("--") || prop.startsWith("transition")) continue;
            if (want && have && want !== have) changes++;
          }
        }
      }
    }
    tile.style.contentVisibility = "";
    if (!matched) noTarget.push(name);
    else if (!changes) dead.push(name);
    else ok.push(name);
  }
  return JSON.stringify({
    checked: ok.length + dead.length + noTarget.length,
    ok: ok.length,
    noTarget, dead,
  });
})();
