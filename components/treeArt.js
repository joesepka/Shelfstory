// ShelfStory health ART — pure SVG string renderers per skin.
// Health reads on a 10-beat ramp; color steps hard so states are instantly
// distinct: green → lime → yellow → amber → orange → GREY (almost dead) → bare.
// Two skins are trees (classic, cupertino); three are wild alternate mechanisms
// (pixel plant, living flame, vital-sign pulse). 0 0 60 62 viewBox throughout.
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

// ===== the health color ramp — single source of truth (almost-dead = grey) =====
export const RAMP = {
  accelerating: "#0f9d54",   // deep emerald
  thriving:     "#34a94e",   // green
  growing:      "#5fb84e",   // green
  steady:       "#86c96f",   // light green (flat = healthy, never yellow)
  softening:    "#e8b62b",   // amber-yellow — yellow starts at actual decline
  slipping:     "#e2901f",   // amber-orange
  atrisk:       "#db7a26",   // orange
  declining:    "#9e978d",   // GREY — almost dead
};
export const NEW_COLOR = "#4fbf86", LAPSED_COLOR = "#9a958c";
function cf(st) { const m = RAMP[st] || "#34a94e"; return { m, d: darken(m, 0.76), h: lighten(m, 0.24) }; }
const DISTRESS = { softening: 1, slipping: 2, atrisk: 3, declining: 4 };

// ---- shared primitives ----
const TR = `<rect x="28" y="38" width="4" height="20" rx="1.6" fill="#bfa988"/>`;
const shadow = rx => `<ellipse cx="30" cy="59" rx="${(rx * 0.85).toFixed(1)}" ry="2.1" fill="#000" opacity="0.05"/>`;
const sheen = (cx, cy, rx, ry) => `<ellipse cx="${(cx - rx * 0.3).toFixed(1)}" cy="${(cy - ry * 0.34).toFixed(1)}" rx="${(rx * 0.4).toFixed(1)}" ry="${(ry * 0.3).toFixed(1)}" fill="#fff" opacity="0.2"/>`;
function smoothDead() {
  return `<ellipse cx="30" cy="59" rx="9" ry="2.1" fill="#000" opacity="0.04"/><rect x="28" y="36" width="4" height="22" rx="2" fill="#b09a7c"/><line x1="30" y1="38" x2="20" y2="22" stroke="#a99e8e" stroke-width="2.6" stroke-linecap="round"/><line x1="30" y1="38" x2="40" y2="22" stroke="#a99e8e" stroke-width="2.6" stroke-linecap="round"/><line x1="30" y1="42" x2="23" y2="31" stroke="#a99e8e" stroke-width="2" stroke-linecap="round"/><line x1="30" y1="42" x2="37" y2="31" stroke="#a99e8e" stroke-width="2" stroke-linecap="round"/><line x1="30" y1="36" x2="30" y2="20" stroke="#a99e8e" stroke-width="2" stroke-linecap="round"/>`;
}
function classicBare() {
  return `<ellipse cx="30" cy="59" rx="9" ry="2.1" fill="#000" opacity="0.04"/><rect x="28" y="34" width="4" height="24" rx="1.4" fill="#9a6a52"/>`
    + [[30, 18, 2.2], [18, 24, 2.2], [42, 24, 2.2], [22, 30, 1.8], [38, 30, 1.8]].map(([x, y, w]) => `<line x1="30" y1="36" x2="${x}" y2="${y}" stroke="#9a958c" stroke-width="${w}" stroke-linecap="round"/>`).join("")
    + [[22, 55], [34, 55]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.3" ry="1.2" fill="#8d877d" opacity="0.85"/>`).join("");
}
const fruitDot = (x, y, fill, stroke) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${fill}" stroke="${stroke}" stroke-width="0.4"/><circle cx="${(x - 0.6).toFixed(1)}" cy="${(y - 0.7).toFixed(1)}" r="0.6" fill="#fff" opacity="0.5"/>`;
const fall = (x, y, c) => `<ellipse cx="${x}" cy="${y}" rx="2.1" ry="1.1" fill="${c}" opacity="0.85" transform="rotate(${(x % 2 ? 22 : -18)} ${x} ${y})"/>`;
const spark = (x, y, c) => `<path d="M${x} ${y - 3.2} L${(x + 0.9).toFixed(1)} ${(y - 0.9).toFixed(1)} L${x + 3.2} ${y} L${(x + 0.9).toFixed(1)} ${(y + 0.9).toFixed(1)} L${x} ${y + 3.2} L${(x - 0.9).toFixed(1)} ${(y + 0.9).toFixed(1)} L${x - 3.2} ${y} L${(x - 0.9).toFixed(1)} ${(y - 0.9).toFixed(1)} Z" fill="${c}"/>`;
const leaf = (cx, cy, ang, len, w, col) => `<g transform="translate(${cx} ${cy}) rotate(${ang})"><path d="M0 0 Q ${w} ${(-len * 0.5).toFixed(1)} 0 ${-len} Q ${-w} ${(-len * 0.5).toFixed(1)} 0 0 Z" fill="${col}"/></g>`;

const CL = [[0, 2], [-8, 3], [8, 3], [0, -6], [-6, -3], [6, -3], [-11, 1], [11, 1], [0, 9], [-7, 8], [7, 8], [-4, -9], [4, -9], [0, 15], [-10, 10]];
const POS = [[24, 26], [35, 24], [30, 18], [23, 33], [37, 31]];
const FBs = [[21, 55], [30, 56], [39, 55], [25, 54]];

// NEW (tree skins) = a young budding sapling.
function saplingArt(theme) {
  const stem = "#7aa757", lc = theme === "cupertino" ? "#5cc591" : "#6abf86";
  let o = `<ellipse cx="30" cy="59" rx="7" ry="1.8" fill="#000" opacity="0.05"/>`;
  o += `<path d="M30 58 Q 27.5 47 30 39 Q 31.5 34 30 30" fill="none" stroke="${stem}" stroke-width="2" stroke-linecap="round"/>`;
  o += leaf(30, 47, -52, 10, 3.2, lc) + leaf(30, 50, 58, 9, 3, lighten(lc, 0.12));
  if (theme === "cupertino") o += `<ellipse cx="30" cy="29" rx="5" ry="5.4" fill="${lc}"/>` + sheen(30, 29, 5, 5.4);
  else o += `<circle cx="30" cy="29" r="3.4" fill="#5bb47e"/><circle cx="27" cy="32" r="3" fill="#7bc49a"/><circle cx="33" cy="32" r="3" fill="#7bc49a"/>`;
  o += `<path d="M30 25 q 2 -1.3 0 -4.6 q -2 1.3 0 4.6 Z" fill="#9ed08a"/>`;
  return o;
}

// ===================== TREE skins: classic + cupertino =====================
function classicA(st, f) {
  if (st === "new") return saplingArt("classic");
  if (st === "lapsed") return classicBare();
  const { m, d } = cf(st), N = Math.round(2 + f * 13);
  let o = shadow(12) + TR;
  CL.slice(0, N).forEach(([dx, dy], i) => { o += `<circle cx="${30 + dx}" cy="${32 + dy}" r="6.1" fill="${i % 3 === 0 ? d : m}"/>`; });
  if (st === "accelerating") o += POS.map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  o += FBs.slice(0, DISTRESS[st] || 0).map(([x, y]) => fall(x, y, m)).join("");
  return o;
}
function cupA(st, f) {
  if (st === "new") return saplingArt("cupertino");
  if (st === "lapsed") return smoothDead();
  const { m } = cf(st), ry = 8 + f * 10, rx = ry * 0.92, cy = 30;
  let o = shadow(rx) + TR + `<ellipse cx="30" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${m}"/>` + sheen(30, cy, rx, ry);
  if (st === "accelerating") o += POS.slice(0, 4).map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  o += FBs.slice(0, DISTRESS[st] || 0).map(([x, y]) => fall(x, y, darken(m, 0.85))).join("");
  return o;
}

// ===================== WILD #1: pixel plant (8-bit) =====================
const PXC = 5.2;
const pxRect = (x, y, c) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(PXC - 0.5).toFixed(1)}" height="${(PXC - 0.5).toFixed(1)}" fill="${c}" stroke="rgba(0,0,0,0.10)" stroke-width="0.4"/>`;
const pxGround = cx => `<ellipse cx="30" cy="59" rx="11" ry="2" fill="#000" opacity="0.05"/>` + [-2, -1, 0, 1, 2].map(i => pxRect(cx + i * PXC - PXC / 2, 53.5, "#7a5a3e")).join("");
function pixelA(st, f) {
  const cx = 30, cy = 26, trunkC = "#9c6a3a", ground = pxGround(cx);
  if (st === "lapsed") {
    let o = ground;
    for (let gj = 1; gj <= 5; gj++) o += pxRect(cx - PXC / 2, cy + gj * PXC - PXC / 2, "#9c8a72");
    o += pxRect(cx - PXC / 2 - PXC, cy + PXC, "#a39a8c") + pxRect(cx - PXC / 2 + PXC, cy + 0.4 * PXC, "#a39a8c");
    return o;
  }
  if (st === "new") {
    let o = ground;
    for (let gj = 2; gj <= 5; gj++) o += pxRect(cx - PXC / 2, cy + gj * PXC - PXC / 2, "#7aa757");
    o += pxRect(cx - PXC / 2, cy + 1 * PXC - PXC / 2, "#6abf86") + pxRect(cx - PXC / 2 - PXC, cy + 1.4 * PXC, "#7bc49a") + pxRect(cx - PXC / 2 + PXC, cy + 1.4 * PXC, "#7bc49a");
    o += pxRect(cx - PXC / 2, cy + 0.1 * PXC, "#9ed08a");
    return o;
  }
  const col = cf(st).m, dk = darken(col, 0.78), rG = 1.2 + f * 2.3;
  let o = ground;
  for (let gj = Math.ceil(rG); gj <= 5; gj++) o += pxRect(cx - PXC / 2, cy + gj * PXC - PXC / 2, trunkC);
  for (let gi = -4; gi <= 4; gi++) for (let gj = -4; gj <= 4; gj++) {
    if (gi * gi + gj * gj <= rG * rG) o += pxRect(cx + gi * PXC - PXC / 2, cy + gj * PXC - PXC / 2, ((gi + gj) & 1) ? dk : col);
  }
  if (st === "accelerating") [[-1, -1], [1, 0], [0, -2]].forEach(([gi, gj]) => { o += pxRect(cx + gi * PXC - PXC / 2, cy + gj * PXC - PXC / 2, "#e0492e"); });
  return o;
}

// ===================== Watercolor: soft washed canopy =====================
const LP_TRIS = [[[30, 12], [18, 32], [42, 32]], [[18, 32], [42, 32], [30, 30]], [[18, 32], [30, 30], [22, 46]], [[42, 32], [30, 30], [38, 46]], [[30, 30], [22, 46], [38, 46]], [[30, 12], [34, 24], [42, 32]]];
function washCanopy(color, R, cy, fid) {
  let blobs = "";
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283, rr = R * 0.45, x = 30 + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.85, r2 = R * (0.62 + 0.16 * (i % 3)); blobs += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r2.toFixed(1)}" ry="${(r2 * 0.9).toFixed(1)}" fill="${i % 2 ? lighten(color, 0.3) : color}" opacity="0.5"/>`; }
  return `<defs><filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.25"/></filter></defs><g filter="url(#${fid})">${blobs}</g>`;
}
function watercolorA(st, f, sfx) {
  if (st === "new") return saplingArt("watercolor");
  if (st === "lapsed") return smoothDead();
  const col = cf(st).m, R = 9 + f * 7;
  let o = shadow(R) + TR + washCanopy(col, R, 30, "wc" + sfx);
  if (st === "accelerating") o += [[24, 27], [35, 24], [30, 20]].map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  o += FBs.slice(0, DISTRESS[st] || 0).map(([x, y]) => fall(x, y, darken(col, 0.85))).join("");
  return o;
}

// ===================== Low-poly: faceted geometric tree =====================
function facets(color, K) {
  const shades = [lighten(color, 0.22), color, darken(color, 0.8)];
  return `<polygon points="27,58 33,58 31,40 29,40" fill="#7a5a3e"/>` + LP_TRIS.slice(0, K).map((p, i) => `<polygon points="${p.map(q => q.join(",")).join(" ")}" fill="${shades[i % 3]}" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.35"/>`).join("");
}
function lowpolyA(st, f) {
  if (st === "new") return saplingArt("lowpoly");
  if (st === "lapsed") return smoothDead();
  const col = cf(st).m;
  let o = shadow(12) + facets(col, f > 0.6 ? 6 : 4);
  if (st === "accelerating") o += [[24, 26], [36, 24]].map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  o += FBs.slice(0, DISTRESS[st] || 0).map(([x, y]) => fall(x, y, darken(col, 0.85))).join("");
  return o;
}

// ===================== Bonsai: sculpted pads on a curved trunk =====================
const BONSAI_DEAD = `<ellipse cx="30" cy="59" rx="9" ry="2" fill="#000" opacity="0.04"/><path d="M30 58 C26 50 33 46 30 38 C28 32 34 30 31 22" stroke="#b09a7c" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M30 40 q-8 -2 -12 -7 M30 34 q9 0 13 -5 M31 26 q4 -4 9 -4" stroke="#a99e8e" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
function bonsaiPads(color, sc) {
  const d = darken(color, 0.82);
  return `<path d="M30 40 L20 31 M30 36 L40 27 M30 30 L30 20" stroke="#9a8366" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
    [[20, 30, 7], [40, 26, 6.5], [30, 18, 6]].map(([x, y, r], i) => { const rr = r * sc; return `<ellipse cx="${x}" cy="${y}" rx="${(rr * 1.15).toFixed(1)}" ry="${rr.toFixed(1)}" fill="${i === 1 ? d : color}"/><ellipse cx="${(x - rr * 0.4).toFixed(1)}" cy="${(y - rr * 0.4).toFixed(1)}" rx="${(rr * 0.45).toFixed(1)}" ry="${(rr * 0.3).toFixed(1)}" fill="#fff" opacity="0.16"/>`; }).join("");
}
function bonsaiA(st, f) {
  if (st === "new") return saplingArt("bonsai");
  if (st === "lapsed") return BONSAI_DEAD;
  const col = cf(st).m;
  let o = `<ellipse cx="30" cy="59" rx="9" ry="2" fill="#000" opacity="0.05"/><path d="M30 58 C26 50 33 46 30 38 C28 32 34 30 31 22" stroke="#9a8366" stroke-width="3" fill="none" stroke-linecap="round"/>` + bonsaiPads(col, 0.62 + f * 0.5);
  if (st === "accelerating") o += [[20, 30], [40, 26], [30, 18]].map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  o += FBs.slice(0, DISTRESS[st] || 0).map(([x, y]) => fall(x, y, darken(col, 0.85))).join("");
  return o;
}

// ============================ tier emblems ============================
function classicT(t, color) {
  if (t <= 0.12) return classicBare();
  const d = darken(color, 0.8), N = Math.round(5 + t * 10);
  let o = shadow(12) + TR;
  CL.slice(0, N).forEach(([dx, dy], i) => { o += `<circle cx="${30 + dx}" cy="${32 + dy}" r="6.2" fill="${i % 3 === 0 ? d : color}"/>`; });
  if (t > 0.82) o += [[24, 26], [35, 24], [30, 18]].map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
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
function pixelT(t, color) {
  if (t <= 0.12) return pixelA("lapsed", 0);
  const cx = 30, cy = 26, trunkC = "#9c6a3a", dk = darken(color, 0.78), rG = 1.2 + t * 2.5;
  let o = pxGround(cx);
  for (let gj = Math.ceil(rG); gj <= 5; gj++) o += pxRect(cx - PXC / 2, cy + gj * PXC - PXC / 2, trunkC);
  for (let gi = -4; gi <= 4; gi++) for (let gj = -4; gj <= 4; gj++) {
    if (gi * gi + gj * gj <= rG * rG) o += pxRect(cx + gi * PXC - PXC / 2, cy + gj * PXC - PXC / 2, ((gi + gj) & 1) ? dk : color);
  }
  if (t > 0.82) [[-1, -1], [1, 0]].forEach(([gi, gj]) => { o += pxRect(cx + gi * PXC - PXC / 2, cy + gj * PXC - PXC / 2, "#e0492e"); });
  return o;
}
function watercolorT(t, color, sfx) {
  if (t <= 0.12) return smoothDead();
  const R = 10 + t * 7;
  let o = shadow(R) + TR + washCanopy(color, R, 30, "wct" + sfx);
  if (t > 0.82) o += [[24, 27], [35, 24]].map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  return o;
}
function lowpolyT(t, color) {
  if (t <= 0.12) return smoothDead();
  let o = shadow(12) + facets(color, t > 0.6 ? 6 : 4);
  if (t > 0.82) o += [[24, 26], [36, 24]].map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  return o;
}
function bonsaiT(t, color) {
  if (t <= 0.12) return BONSAI_DEAD;
  let o = `<ellipse cx="30" cy="59" rx="9" ry="2" fill="#000" opacity="0.05"/><path d="M30 58 C26 50 33 46 30 38 C28 32 34 30 31 22" stroke="#9a8366" stroke-width="3" fill="none" stroke-linecap="round"/>` + bonsaiPads(color, 0.62 + t * 0.5);
  if (t > 0.82) o += [[20, 30], [40, 26]].map(([x, y]) => fruitDot(x, y, "#f0d27a", "#d9a93f")).join("");
  return o;
}

// ============================ dispatch ============================
export function accountArt(theme, st, f, sfx) {
  if (theme === "cupertino") return cupA(st, f);
  if (theme === "pixel") return pixelA(st, f);
  if (theme === "watercolor") return watercolorA(st, f, sfx);
  if (theme === "lowpoly") return lowpolyA(st, f);
  if (theme === "bonsai") return bonsaiA(st, f);
  return classicA(st, f);
}
export function tierArt(theme, t, color, sfx) {
  if (theme === "cupertino") return cupT(t, color);
  if (theme === "pixel") return pixelT(t, color);
  if (theme === "watercolor") return watercolorT(t, color, sfx);
  if (theme === "lowpoly") return lowpolyT(t, color);
  if (theme === "bonsai") return bonsaiT(t, color);
  return classicT(t, color);
}
