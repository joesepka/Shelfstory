// ShelfStory tree ART — pure SVG string renderers for every skin.
// All art is drawn in a 0 0 60 62 viewBox (trunk base at y=58, canopy ~y30).
// Each account renderer takes (state, fullness 0..1, idSuffix); each tier
// renderer takes (vitality 0..1, tierColor, idSuffix). Returned strings are
// injected via dangerouslySetInnerHTML by TreeGlyph.
export const VB = "0 0 60 62";

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function darken(hex, f) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const d = x => Math.round(x * f).toString(16).padStart(2, "0");
  return `#${d(r)}${d(g)}${d(b)}`;
}
export function lighten(hex, f) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const m = x => Math.round(x + (255 - x) * f).toString(16).padStart(2, "0");
  return `#${m(r)}${m(g)}${m(b)}`;
}

// ---- shared primitives ----
const TR = `<rect x="28" y="38" width="4" height="20" rx="1.6" fill="#bfa988"/>`;
const shadow = rx => `<ellipse cx="30" cy="59" rx="${(rx * 0.85).toFixed(1)}" ry="2.1" fill="#000" opacity="0.05"/>`;
const sheen = (cx, cy, rx, ry) => `<ellipse cx="${(cx - rx * 0.3).toFixed(1)}" cy="${(cy - ry * 0.34).toFixed(1)}" rx="${(rx * 0.4).toFixed(1)}" ry="${(ry * 0.3).toFixed(1)}" fill="#fff" opacity="0.2"/>`;
function smoothDead() {
  return `<ellipse cx="30" cy="59" rx="9" ry="2.1" fill="#000" opacity="0.04"/><rect x="28" y="36" width="4" height="22" rx="2" fill="#b09a7c"/><line x1="30" y1="38" x2="20" y2="22" stroke="#a99e8e" stroke-width="2.6" stroke-linecap="round"/><line x1="30" y1="38" x2="40" y2="22" stroke="#a99e8e" stroke-width="2.6" stroke-linecap="round"/><line x1="30" y1="42" x2="23" y2="31" stroke="#a99e8e" stroke-width="2" stroke-linecap="round"/><line x1="30" y1="42" x2="37" y2="31" stroke="#a99e8e" stroke-width="2" stroke-linecap="round"/><line x1="30" y1="36" x2="30" y2="20" stroke="#a99e8e" stroke-width="2" stroke-linecap="round"/>`;
}
function classicBare() {
  return `<ellipse cx="30" cy="59" rx="9" ry="2.1" fill="#000" opacity="0.04"/><rect x="28" y="34" width="4" height="24" rx="1.4" fill="#9a6a52"/>`
    + [[30, 18, 2.2], [18, 24, 2.2], [42, 24, 2.2], [22, 30, 1.8], [38, 30, 1.8]].map(([x, y, w]) => `<line x1="30" y1="36" x2="${x}" y2="${y}" stroke="#b0573a" stroke-width="${w}" stroke-linecap="round"/>`).join("")
    + [[22, 55], [34, 55]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.3" ry="1.2" fill="#9e3f28" opacity="0.85"/>`).join("");
}
const flower = (x, y) => [0, 72, 144, 216, 288].map(d => { const a = d * Math.PI / 180; return `<circle cx="${(x + Math.cos(a) * 2.1).toFixed(1)}" cy="${(y + Math.sin(a) * 2.1).toFixed(1)}" r="1.7" fill="#f7c5d4"/>`; }).join("") + `<circle cx="${x}" cy="${y}" r="1.3" fill="#f2c84a"/>`;
const fruitDot = (x, y, fill, stroke) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${fill}" stroke="${stroke}" stroke-width="0.4"/><circle cx="${(x - 0.6).toFixed(1)}" cy="${(y - 0.7).toFixed(1)}" r="0.6" fill="#fff" opacity="0.5"/>`;
const fall = (x, y, c) => `<ellipse cx="${x}" cy="${y}" rx="2.1" ry="1.1" fill="${c}" opacity="0.8" transform="rotate(${(x % 2 ? 22 : -18)} ${x} ${y})"/>`;
const spark = (x, y, c) => `<path d="M${x} ${y - 3.2} L${(x + 0.9).toFixed(1)} ${(y - 0.9).toFixed(1)} L${x + 3.2} ${y} L${(x + 0.9).toFixed(1)} ${(y + 0.9).toFixed(1)} L${x} ${y + 3.2} L${(x - 0.9).toFixed(1)} ${(y + 0.9).toFixed(1)} L${x - 3.2} ${y} L${(x - 0.9).toFixed(1)} ${(y - 0.9).toFixed(1)} Z" fill="${c}"/>`;
const sphere = (x, y, r, g) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})"/><ellipse cx="${(x - r * 0.28).toFixed(1)}" cy="${(y - r * 0.34).toFixed(1)}" rx="${(r * 0.3).toFixed(1)}" ry="${(r * 0.2).toFixed(1)}" fill="#fff" opacity="0.55"/>`;
const leaf = (cx, cy, ang, len, w, col) => `<g transform="translate(${cx} ${cy}) rotate(${ang})"><path d="M0 0 Q ${w} ${(-len * 0.5).toFixed(1)} 0 ${-len} Q ${-w} ${(-len * 0.5).toFixed(1)} 0 0 Z" fill="${col}"/></g>`;

// NEW account = a young budding sapling — slim tender stem, two sprout leaves, a
// closed bud at the tip. Deliberately its own silhouette across every skin (not
// the mature canopy). Top growth nods to the active skin's idiom.
function saplingArt(theme, sfx) {
  const stem = "#7aa757";
  const lc = theme === "cupertino" ? "#5cc591" : theme === "rounded" ? "#5fb98a" : "#6abf86";
  let o = `<ellipse cx="30" cy="59" rx="7" ry="1.8" fill="#000" opacity="0.05"/>`;
  o += `<path d="M30 58 Q 27.5 47 30 39 Q 31.5 34 30 30" fill="none" stroke="${stem}" stroke-width="2" stroke-linecap="round"/>`;
  o += leaf(30, 47, -52, 10, 3.2, lc) + leaf(30, 50, 58, 9, 3, lighten(lc, 0.12));   // two sprout leaves
  if (theme === "bubble") {
    o = grads(sfx) + o;
    o += sphere(30, 29, 4.4, "gn" + sfx) + sphere(26, 32, 3.1, "gn" + sfx) + sphere(34, 32, 3.1, "gn" + sfx);
  } else if (theme === "cupertino") {
    o += `<ellipse cx="30" cy="29" rx="5" ry="5.4" fill="${lc}"/>` + sheen(30, 29, 5, 5.4);
  } else if (theme === "rounded") {
    const gid = "sp" + sfx;
    o += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighten(lc, 0.2)}"/><stop offset="1" stop-color="${darken(lc, 0.8)}"/></linearGradient></defs><ellipse cx="30" cy="29" rx="5" ry="5.4" fill="url(#${gid})"/>` + sheen(30, 29, 5, 5.4);
  } else if (theme === "clusters") {
    o += leaf(30, 33, 0, 9, 3.2, "#3f8a5e") + leaf(30, 33, -40, 8, 3, "#6abf86") + leaf(30, 33, 40, 8, 3, "#6abf86");
  } else {
    o += `<circle cx="30" cy="29" r="3.4" fill="#5bb47e"/><circle cx="27" cy="32" r="3" fill="#7bc49a"/><circle cx="33" cy="32" r="3" fill="#7bc49a"/>`;
  }
  o += `<path d="M30 25 q 2 -1.3 0 -4.6 q -2 1.3 0 4.6 Z" fill="#9ed08a"/>`;   // closed bud at the tip
  return o;
}

const CL = [[0, 2], [-8, 3], [8, 3], [0, -6], [-6, -3], [6, -3], [-11, 1], [11, 1], [0, 9], [-7, 8], [7, 8], [-4, -9], [4, -9], [0, 15], [-10, 10]];
const POS = [[24, 26], [35, 24], [30, 18], [23, 33], [37, 31]];
const FBs = [[21, 55], [30, 56], [39, 55], [25, 54]];
const BUB = [[0, -1, 6], [-7, 2, 5.5], [7, 2, 5.5], [0, -7, 5.4], [-6, -4, 5], [6, -4, 5], [-10, 3, 4.5], [10, 3, 4.5], [0, 8, 5], [-4, -10, 4.3], [4, -10, 4.3]];

// ======================= per-account renderers =======================
function classicA(st, f) {
  if (st === "bare") return classicBare();
  const p = st === "wilting" ? { m: "#c2922e", d: "#a8801f" }
    : st === "slipping" ? { m: "#9aa05a", d: "#7c824a" }
    : st === "flowering" ? { m: "#5bb47e", d: "#3f8a5e" }
    : st === "steady" ? { m: "#6aa06a", d: "#4a9068" }
    : { m: "#4a9068", d: "#3f7d57" };
  const N = Math.round(5 + f * 10);
  let o = shadow(12) + TR;
  CL.slice(0, N).forEach(([dx, dy], i) => { o += `<circle cx="${30 + dx}" cy="${32 + dy}" r="6.1" fill="${i % 3 === 0 ? p.d : p.m}"/>`; });
  if (st === "fruiting") o += POS.map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  if (st === "slipping") o += fall(21, 55, p.m);
  if (st === "wilting") o += FBs.map(([x, y]) => fall(x, y, p.m)).join("");
  return o;
}
function clustersA(st, f) {
  if (st === "bare") return smoothDead() + [[22, 55], [34, 55]].map(([x, y]) => fall(x, y, "#c2922e")).join("");
  const p = st === "wilting" ? { m: "#c2922e", d: "#a8801f", h: "#d9b24a" }
    : st === "slipping" ? { m: "#9aa05a", d: "#7c824a", h: "#b6bd6a" }
    : st === "steady" ? { m: "#4a9068", d: "#3f7d57", h: "#6aa06a" }
    : { m: "#3f8a5e", d: "#2f6e49", h: "#7bbf6a" };
  const N = Math.round(5 + f * 10);
  let o = shadow(12) + TR;
  CL.slice(0, N).forEach(([dx, dy], i) => { o += `<circle cx="${30 + dx}" cy="${32 + dy}" r="6.1" fill="${i % 3 === 0 ? p.d : i % 3 === 1 ? p.m : p.h}"/>`; });
  if (st === "flowering") o += POS.map(([x, y]) => flower(x, y)).join("");
  if (st === "fruiting") o += POS.map(([x, y]) => fruitDot(x, y, "#d44a3a", "#b03828")).join("");
  if (st === "slipping") o += fall(21, 55, p.m);
  if (st === "wilting") o += FBs.map(([x, y]) => fall(x, y, p.m)).join("");
  return o;
}
const CUPCOL = { flowering: "#5cc591", fruiting: "#1f9d6b", thriving: "#30b36b", steady: "#5fc59a", slipping: "#a7b06a", wilting: "#d9a23a" };
function cupA(st, f) {
  if (st === "bare") return smoothDead();
  const col = CUPCOL[st] || "#30b36b", ry = 10 + f * 9, rx = ry * 0.92, cy = 30;
  let o = shadow(rx) + TR + `<ellipse cx="30" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${col}"/>` + sheen(30, cy, rx, ry);
  if (st === "flowering") o += [[25, 27], [35, 26], [30, 21]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9" fill="#fdeef2"/><circle cx="${x}" cy="${y}" r="0.8" fill="#f2c84a"/>`).join("");
  if (st === "fruiting") o += POS.slice(0, 4).map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  if (st === "slipping") o += fall(22, 55, "#bb8a2a");
  if (st === "wilting") o += [[22, 55], [32, 56], [40, 55]].map(([x, y]) => fall(x, y, "#bb8a2a")).join("");
  return o;
}
function roundedA(st, f, s) {
  if (st === "bare") return smoothDead();
  const rx = (10 + f * 9) * 0.96, ry = 10 + f * 9, cy = 30, gid = "ra" + s;
  const stops = st === "wilting" ? ["#e0cf8a", "#bb8a2a"] : st === "slipping" ? ["#bcc77f", "#8a9a4a"] : st === "steady" ? ["#86d6ac", "#358a5e"] : ["#7fd4a0", "#2f7d54"];
  let o = shadow(rx) + TR + `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset="1" stop-color="${stops[1]}"/></linearGradient></defs><ellipse cx="30" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="url(#${gid})"/>` + sheen(30, cy, rx, ry);
  if (st === "flowering") o += [[25, 27], [35, 26], [30, 20], [23, 33]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9" fill="#fdeef2"/><circle cx="${x}" cy="${y}" r="0.8" fill="#f2c84a"/>`).join("");
  if (st === "fruiting") o += POS.map(([x, y]) => fruitDot(x, y, "#f0b429", "#d9952a")).join("");
  if (st === "slipping") o += fall(22, 55, "#bb8a2a");
  if (st === "wilting") o += [[22, 55], [32, 56], [40, 55]].map(([x, y]) => fall(x, y, "#bb8a2a")).join("");
  return o;
}
function grads(s) {
  return `<defs>`
    + `<radialGradient id="gn${s}" cx="0.35" cy="0.3" r="0.78"><stop offset="0" stop-color="#9fe3b0"/><stop offset="1" stop-color="#2f8f5e"/></radialGradient>`
    + `<radialGradient id="gd${s}" cx="0.35" cy="0.3" r="0.78"><stop offset="0" stop-color="#ffe39a"/><stop offset="1" stop-color="#d99a2a"/></radialGradient>`
    + `<radialGradient id="gp${s}" cx="0.35" cy="0.3" r="0.78"><stop offset="0" stop-color="#ffe1ec"/><stop offset="1" stop-color="#f2a6c2"/></radialGradient>`
    + `<radialGradient id="gs${s}" cx="0.35" cy="0.3" r="0.78"><stop offset="0" stop-color="#cfe0a0"/><stop offset="1" stop-color="#8a9a4a"/></radialGradient>`
    + `<radialGradient id="ga${s}" cx="0.35" cy="0.3" r="0.78"><stop offset="0" stop-color="#f0d28a"/><stop offset="1" stop-color="#bb8a2a"/></radialGradient>`
    + `</defs>`;
}
function bubbleA(st, f, s) {
  if (st === "bare") return smoothDead();
  const g = st === "wilting" ? `ga${s}` : st === "slipping" ? `gs${s}` : `gn${s}`;
  const N = Math.round(4 + f * 7);
  let o = grads(s) + shadow(13) + TR;
  BUB.slice(0, N).forEach(([dx, dy, r]) => { o += sphere(30 + dx, 30 + dy, r, g); });
  if (st === "flowering") { [[24, 23, 4.2], [36, 22, 3.8], [30, 15, 3.6]].forEach(([x, y, r]) => { o += sphere(x, y, r, `gp${s}`); }); o += spark(40, 16, "#fff") + spark(20, 18, "#ffd76a"); }
  if (st === "fruiting") { [[24, 26, 3.6], [36, 24, 3.4], [30, 17, 3.2], [22, 33, 3.2]].forEach(([x, y, r]) => { o += sphere(x, y, r, `gd${s}`); }); o += spark(41, 15, "#ffd76a") + spark(19, 20, "#fff"); }
  if (st === "slipping") o += fall(22, 55, "#8a9a4a");
  if (st === "wilting") o += fall(22, 55, "#bb8a2a") + fall(34, 55, "#bb8a2a") + `<circle cx="38" cy="24" r="2.4" fill="none" stroke="#bb8a2a" stroke-width="0.9" opacity="0.6"/>`;
  return o;
}

// ======================= tier emblem renderers =======================
function classicT(t, color) {
  if (t <= 0.12) return classicBare();
  const d = darken(color, 0.8), N = Math.round(5 + t * 10);
  let o = shadow(12) + TR;
  CL.slice(0, N).forEach(([dx, dy], i) => { o += `<circle cx="${30 + dx}" cy="${32 + dy}" r="6.2" fill="${i % 3 === 0 ? d : color}"/>`; });
  if (t > 0.82) o += [[24, 26], [35, 24], [30, 18]].map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  if (t < 0.4) o += FBs.slice(0, Math.round((0.4 - t) * 8)).map(([x, y]) => fall(x, y, color)).join("");
  return o;
}
function clustersT(t, color) {
  if (t <= 0.12) return smoothDead();
  const d = darken(color, 0.78), h = lighten(color, 0.28), N = Math.round(5 + t * 10);
  let o = shadow(12) + TR;
  CL.slice(0, N).forEach(([dx, dy], i) => { o += `<circle cx="${30 + dx}" cy="${32 + dy}" r="6.2" fill="${i % 3 === 0 ? d : i % 3 === 1 ? color : h}"/>`; });
  if (t > 0.82) o += [[24, 26], [35, 24], [30, 18]].map(([x, y]) => fruitDot(x, y, "#d44a3a", "#b03828")).join("");
  if (t < 0.4) o += FBs.slice(0, Math.round((0.4 - t) * 8)).map(([x, y]) => fall(x, y, color)).join("");
  return o;
}
function cupT(t, color) {
  if (t <= 0.12) return smoothDead();
  const ry = 10 + t * 9, rx = ry * 0.94, cy = 30;
  let o = shadow(rx) + TR + `<ellipse cx="30" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${color}"/>` + sheen(30, cy, rx, ry);
  if (t > 0.82) o += [[24, 28], [35, 25]].map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  return o;
}
function roundedT(t, color, s) {
  if (t <= 0.12) return smoothDead();
  const ry = 10 + t * 9, rx = ry * 0.96, cy = 30, gid = "rt" + s;
  let o = shadow(rx) + TR + `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighten(color, 0.4)}"/><stop offset="1" stop-color="${darken(color, 0.85)}"/></linearGradient></defs><ellipse cx="30" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="url(#${gid})"/>` + sheen(30, cy, rx, ry);
  if (t > 0.82) o += [[24, 28], [35, 25]].map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  return o;
}
function bubbleT(t, color, s) {
  if (t <= 0.12) return smoothDead();
  const gid = "bt" + s, N = Math.round(4 + t * 7);
  let o = `<defs><radialGradient id="${gid}" cx="0.35" cy="0.3" r="0.78"><stop offset="0" stop-color="${lighten(color, 0.5)}"/><stop offset="1" stop-color="${color}"/></radialGradient></defs>` + shadow(13) + TR;
  BUB.slice(0, N).forEach(([dx, dy, r]) => { o += sphere(30 + dx, 30 + dy, r, gid); });
  if (t > 0.82) o += spark(40, 16, "#ffd76a") + spark(20, 18, "#fff");
  return o;
}

// ======================= dispatch =======================
export function accountArt(theme, st, f, sfx) {
  if (st === "flowering") return saplingArt(theme, sfx);   // NEW = budding sapling in every skin
  if (theme === "cupertino") return cupA(st, f, sfx);
  if (theme === "rounded") return roundedA(st, f, sfx);
  if (theme === "clusters") return clustersA(st, f, sfx);
  if (theme === "bubble") return bubbleA(st, f, sfx);
  return classicA(st, f, sfx);
}
export function tierArt(theme, t, color, sfx) {
  if (theme === "cupertino") return cupT(t, color, sfx);
  if (theme === "rounded") return roundedT(t, color, sfx);
  if (theme === "clusters") return clustersT(t, color, sfx);
  if (theme === "bubble") return bubbleT(t, color, sfx);
  return classicT(t, color, sfx);
}
