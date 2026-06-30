// ShelfStory tree ART — pure SVG string renderers for every skin.
// Health reads on a 10-beat ramp; color steps hard across it so states are
// instantly distinct: vivid green → lime → yellow → amber → orange → red, then
// bare. All art is a 0 0 60 62 viewBox (trunk base y58, canopy ~y30). Account
// renderers take (state, fullness, idSuffix); tier renderers (vitality, color, id).
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

// ===== the health color ramp (single source of truth) =====
export const RAMP = {
  accelerating: "#0f9d54",   // deep emerald
  thriving:     "#34a94e",   // green
  growing:      "#74c23c",   // lime
  steady:       "#c6c233",   // yellow-lime (flat)
  softening:    "#e8b62b",   // amber-yellow
  slipping:     "#e2901f",   // amber-orange
  atrisk:       "#db5f24",   // orange
  declining:    "#c33a26",   // red
};
export const NEW_COLOR = "#4fbf86", LAPSED_COLOR = "#a06550";
function cf(st) { const m = RAMP[st] || "#34a94e"; return { m, d: darken(m, 0.76), h: lighten(m, 0.24) }; }
const DISTRESS = { softening: 1, slipping: 2, atrisk: 3, declining: 4 };

// ---- shared primitives ----
const TR = `<rect x="28" y="38" width="4" height="20" rx="1.6" fill="#bfa988"/>`;
const shadow = rx => `<ellipse cx="30" cy="59" rx="${(rx * 0.85).toFixed(1)}" ry="2.1" fill="#000" opacity="0.05"/>`;
const sheen = (cx, cy, rx, ry) => `<ellipse cx="${(cx - rx * 0.3).toFixed(1)}" cy="${(cy - ry * 0.34).toFixed(1)}" rx="${(rx * 0.4).toFixed(1)}" ry="${(ry * 0.3).toFixed(1)}" fill="#fff" opacity="0.2"/>`;
const radial = (id, c0, c1) => `<radialGradient id="${id}" cx="0.35" cy="0.3" r="0.78"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></radialGradient>`;
function smoothDead() {
  return `<ellipse cx="30" cy="59" rx="9" ry="2.1" fill="#000" opacity="0.04"/><rect x="28" y="36" width="4" height="22" rx="2" fill="#b09a7c"/><line x1="30" y1="38" x2="20" y2="22" stroke="#a99e8e" stroke-width="2.6" stroke-linecap="round"/><line x1="30" y1="38" x2="40" y2="22" stroke="#a99e8e" stroke-width="2.6" stroke-linecap="round"/><line x1="30" y1="42" x2="23" y2="31" stroke="#a99e8e" stroke-width="2" stroke-linecap="round"/><line x1="30" y1="42" x2="37" y2="31" stroke="#a99e8e" stroke-width="2" stroke-linecap="round"/><line x1="30" y1="36" x2="30" y2="20" stroke="#a99e8e" stroke-width="2" stroke-linecap="round"/>`;
}
function classicBare() {
  return `<ellipse cx="30" cy="59" rx="9" ry="2.1" fill="#000" opacity="0.04"/><rect x="28" y="34" width="4" height="24" rx="1.4" fill="#9a6a52"/>`
    + [[30, 18, 2.2], [18, 24, 2.2], [42, 24, 2.2], [22, 30, 1.8], [38, 30, 1.8]].map(([x, y, w]) => `<line x1="30" y1="36" x2="${x}" y2="${y}" stroke="#b0573a" stroke-width="${w}" stroke-linecap="round"/>`).join("")
    + [[22, 55], [34, 55]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.3" ry="1.2" fill="#9e3f28" opacity="0.85"/>`).join("");
}
const fruitDot = (x, y, fill, stroke) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${fill}" stroke="${stroke}" stroke-width="0.4"/><circle cx="${(x - 0.6).toFixed(1)}" cy="${(y - 0.7).toFixed(1)}" r="0.6" fill="#fff" opacity="0.5"/>`;
const fall = (x, y, c) => `<ellipse cx="${x}" cy="${y}" rx="2.1" ry="1.1" fill="${c}" opacity="0.85" transform="rotate(${(x % 2 ? 22 : -18)} ${x} ${y})"/>`;
const spark = (x, y, c) => `<path d="M${x} ${y - 3.2} L${(x + 0.9).toFixed(1)} ${(y - 0.9).toFixed(1)} L${x + 3.2} ${y} L${(x + 0.9).toFixed(1)} ${(y + 0.9).toFixed(1)} L${x} ${y + 3.2} L${(x - 0.9).toFixed(1)} ${(y + 0.9).toFixed(1)} L${x - 3.2} ${y} L${(x - 0.9).toFixed(1)} ${(y - 0.9).toFixed(1)} Z" fill="${c}"/>`;
const sphere = (x, y, r, g) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})"/><ellipse cx="${(x - r * 0.28).toFixed(1)}" cy="${(y - r * 0.34).toFixed(1)}" rx="${(r * 0.3).toFixed(1)}" ry="${(r * 0.2).toFixed(1)}" fill="#fff" opacity="0.55"/>`;
const leaf = (cx, cy, ang, len, w, col) => `<g transform="translate(${cx} ${cy}) rotate(${ang})"><path d="M0 0 Q ${w} ${(-len * 0.5).toFixed(1)} 0 ${-len} Q ${-w} ${(-len * 0.5).toFixed(1)} 0 0 Z" fill="${col}"/></g>`;

const CL = [[0, 2], [-8, 3], [8, 3], [0, -6], [-6, -3], [6, -3], [-11, 1], [11, 1], [0, 9], [-7, 8], [7, 8], [-4, -9], [4, -9], [0, 15], [-10, 10]];
const POS = [[24, 26], [35, 24], [30, 18], [23, 33], [37, 31]];
const FBs = [[21, 55], [30, 56], [39, 55], [25, 54]];
const BUB = [[0, -1, 6], [-7, 2, 5.5], [7, 2, 5.5], [0, -7, 5.4], [-6, -4, 5], [6, -4, 5], [-10, 3, 4.5], [10, 3, 4.5], [0, 8, 5], [-4, -10, 4.3], [4, -10, 4.3]];

// NEW account = a young budding sapling — its own silhouette in every skin.
function saplingArt(theme, sfx) {
  const stem = "#7aa757";
  const lc = theme === "cupertino" ? "#5cc591" : theme === "rounded" ? "#5fb98a" : "#6abf86";
  let o = `<ellipse cx="30" cy="59" rx="7" ry="1.8" fill="#000" opacity="0.05"/>`;
  o += `<path d="M30 58 Q 27.5 47 30 39 Q 31.5 34 30 30" fill="none" stroke="${stem}" stroke-width="2" stroke-linecap="round"/>`;
  o += leaf(30, 47, -52, 10, 3.2, lc) + leaf(30, 50, 58, 9, 3, lighten(lc, 0.12));
  if (theme === "bubble") {
    o = `<defs>${radial("sn" + sfx, "#9fe3b0", "#2f8f5e")}</defs>` + o;
    o += sphere(30, 29, 4.4, "sn" + sfx) + sphere(26, 32, 3.1, "sn" + sfx) + sphere(34, 32, 3.1, "sn" + sfx);
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
  o += `<path d="M30 25 q 2 -1.3 0 -4.6 q -2 1.3 0 4.6 Z" fill="#9ed08a"/>`;
  return o;
}

// ======================= per-account renderers =======================
function classicA(st, f) {
  if (st === "lapsed") return classicBare();
  const { m, d } = cf(st), N = Math.round(2 + f * 13);
  let o = shadow(12) + TR;
  CL.slice(0, N).forEach(([dx, dy], i) => { o += `<circle cx="${30 + dx}" cy="${32 + dy}" r="6.1" fill="${i % 3 === 0 ? d : m}"/>`; });
  if (st === "accelerating") o += POS.map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  o += FBs.slice(0, DISTRESS[st] || 0).map(([x, y]) => fall(x, y, m)).join("");
  return o;
}
function clustersA(st, f) {
  if (st === "lapsed") return smoothDead() + [[22, 55], [34, 55]].map(([x, y]) => fall(x, y, "#c2922e")).join("");
  const { m, d, h } = cf(st), N = Math.round(2 + f * 13);
  let o = shadow(12) + TR;
  CL.slice(0, N).forEach(([dx, dy], i) => { o += `<circle cx="${30 + dx}" cy="${32 + dy}" r="6.1" fill="${i % 3 === 0 ? d : i % 3 === 1 ? m : h}"/>`; });
  if (st === "accelerating") o += POS.map(([x, y]) => fruitDot(x, y, "#d44a3a", "#b03828")).join("");
  o += FBs.slice(0, DISTRESS[st] || 0).map(([x, y]) => fall(x, y, m)).join("");
  return o;
}
function cupA(st, f) {
  if (st === "lapsed") return smoothDead();
  const { m } = cf(st), ry = 8 + f * 10, rx = ry * 0.92, cy = 30;
  let o = shadow(rx) + TR + `<ellipse cx="30" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${m}"/>` + sheen(30, cy, rx, ry);
  if (st === "accelerating") o += POS.slice(0, 4).map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  o += FBs.slice(0, DISTRESS[st] || 0).map(([x, y]) => fall(x, y, darken(m, 0.85))).join("");
  return o;
}
function roundedA(st, f, s) {
  if (st === "lapsed") return smoothDead();
  const { m } = cf(st), rx = (8 + f * 10) * 0.96, ry = 8 + f * 10, cy = 30, gid = "ra" + s;
  let o = shadow(rx) + TR + `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighten(m, 0.26)}"/><stop offset="1" stop-color="${darken(m, 0.78)}"/></linearGradient></defs><ellipse cx="30" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="url(#${gid})"/>` + sheen(30, cy, rx, ry);
  if (st === "accelerating") o += POS.map(([x, y]) => fruitDot(x, y, "#f0b429", "#d9952a")).join("");
  o += FBs.slice(0, DISTRESS[st] || 0).map(([x, y]) => fall(x, y, darken(m, 0.85))).join("");
  return o;
}
function bubbleA(st, f, s) {
  if (st === "lapsed") return smoothDead();
  const { m } = cf(st), gid = "bb" + s, N = Math.round(3 + f * 8);
  let o = `<defs>${radial(gid, lighten(m, 0.5), m)}${radial("bg" + s, "#ffe39a", "#d99a2a")}</defs>` + shadow(13) + TR;
  BUB.slice(0, N).forEach(([dx, dy, r]) => { o += sphere(30 + dx, 30 + dy, r, gid); });
  if (st === "accelerating") { [[24, 26, 3.6], [36, 24, 3.4], [30, 17, 3.2], [22, 33, 3.2]].forEach(([x, y, r]) => { o += sphere(x, y, r, "bg" + s); }); o += spark(41, 15, "#ffd76a") + spark(19, 20, "#fff"); }
  const dn = DISTRESS[st] || 0;
  o += FBs.slice(0, dn).map(([x, y]) => fall(x, y, darken(m, 0.85))).join("");
  if (st === "atrisk" || st === "declining") o += `<circle cx="38" cy="24" r="2.4" fill="none" stroke="${darken(m, 0.8)}" stroke-width="0.9" opacity="0.6"/>`;
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
  let o = `<defs>${radial(gid, lighten(color, 0.5), color)}</defs>` + shadow(13) + TR;
  BUB.slice(0, N).forEach(([dx, dy, r]) => { o += sphere(30 + dx, 30 + dy, r, gid); });
  if (t > 0.82) o += spark(40, 16, "#ffd76a") + spark(20, 18, "#fff");
  return o;
}

// ======================= dispatch =======================
export function accountArt(theme, st, f, sfx) {
  if (st === "new") return saplingArt(theme, sfx);
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
