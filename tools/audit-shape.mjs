// Animatio — a round effect in a stretched box is an ellipse.
//
// Flags any tile whose subject, or a painted child, is circular by
// border-radius or aspect-ratio but is no longer square. This is what catches
// a docs layout rule quietly distorting an effect: component CSS is un-layered
// and beats the library, so a stage-filling width turned an-spinner into an
// ellipse and an aspect-ratio on a kid cancelled an-bars' height keyframe.
//
//   $B eval tools/audit-shape.mjs
(() => {
  const bad = [];
  for (const tile of document.querySelectorAll(".tile")) {
    const name = tile.querySelector(".tile__name")?.textContent?.trim();
    if (!name) continue;
    tile.style.contentVisibility = "visible";
    const subject = tile.querySelector(".subject");
    if (!subject) continue;
    for (const el of [subject, ...subject.querySelectorAll("*")]) {
      const cs = getComputedStyle(el);
      if (!cs.borderRadius.includes("50%") && cs.aspectRatio !== "1 / 1") continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const ratio = r.width / r.height;
      if (ratio > 1.15 || ratio < 0.87) {
        bad.push(`${name} ${Math.round(r.width)}x${Math.round(r.height)}`);
        break;
      }
    }
    tile.style.contentVisibility = "";
  }
  return JSON.stringify({ distorted: bad.length, list: bad.slice(0, 20) });
})();
