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
  slipping:     "#e0a524",   // yellow
  atrisk:       "#d9a520",   // yellow — risk reads yellow, not orange
  declining:    "#9e978d",   // GREY — almost dead
};
export const NEW_COLOR = "#4fbf86", LAPSED_COLOR = "#9a958c";
function cf(st) { const m = RAMP[st] || "#34a94e"; return { m, d: darken(m, 0.76), h: lighten(m, 0.24) }; }
const DISTRESS = { softening: 1, slipping: 2, atrisk: 3, declining: 4 };

// ===== FLUID health tree — one continuous build from bare (h=0) → lush (h=1) =====
// color, canopy fullness, branch-reveal, fruit & leaf-drop all slide off a single h,
// so a tree can grow smoothly instead of snapping between discrete states.
function mix(a, b, t) {
  const A = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const B = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
const FSTOPS = [[0, "#9e978d"], [0.13, "#b07d4a"], [0.27, "#d9a520"], [0.41, "#e8b62b"], [0.55, "#86c96f"], [0.70, "#5fb84e"], [0.85, "#34a94e"], [1, "#0f9d54"]];
export function fluidRamp(h) { h = clamp(h, 0, 1); for (let i = 0; i < FSTOPS.length - 1; i++) { if (h <= FSTOPS[i + 1][0]) { const lo = FSTOPS[i], hi = FSTOPS[i + 1], t = (h - lo[0]) / ((hi[0] - lo[0]) || 1); return mix(lo[1], hi[1], t); } } return FSTOPS[FSTOPS.length - 1][1]; }
const FCL = [[0, 2], [-8, 3], [8, 3], [0, -6], [-6, -3], [6, -3], [-11, 1], [11, 1], [0, 9], [-7, 7], [7, 7], [-4, -9], [4, -9], [0, -1], [-10, 6], [10, 6]];
export function fluidTree(h) {
  h = clamp(h, 0, 1);
  const f = h, col = fluidRamp(h), dk = darken(col, 0.76), wood = mix("#9a958c", "#87684a", h);
  const cy = 33 - h * 5, spread = 0.6 + 0.4 * h, blobR = f * 6.6;
  let o = `<ellipse cx="30" cy="59" rx="${(6 + f * 6).toFixed(1)}" ry="2.2" fill="#2f3d28" opacity="0.07"/>`;
  o += `<rect x="28.4" y="${(37 - h * 3).toFixed(1)}" width="3.2" height="${(21 + h * 3).toFixed(1)}" rx="1.6" fill="${wood}"/>`;
  const bo = (0.9 - 0.7 * h).toFixed(2);
  [[30, 18, 2], [19, 25, 2], [41, 24, 2.2], [23, 31, 1.6], [38, 30, 1.6]].forEach(b => { o += `<line x1="30" y1="41" x2="${b[0]}" y2="${b[1]}" stroke="${wood}" stroke-width="${b[2]}" stroke-linecap="round" opacity="${bo}"/>`; });
  FCL.forEach((p, i) => { const r = blobR * (0.78 + ((i * 53) % 9) / 22); if (r < 0.7) return; const x = 30 + p[0] * spread, y = cy + p[1] * spread; o += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${i % 3 === 0 ? dk : col}"/>`; });
  o += `<ellipse cx="${(30 - 4 * spread).toFixed(1)}" cy="${(cy - 5).toFixed(1)}" rx="${(4 * f).toFixed(1)}" ry="${(3 * f).toFixed(1)}" fill="#fff" opacity="${(0.2 * f).toFixed(2)}"/>`;
  const fr = clamp((h - 0.82) * 6, 0, 1);
  if (fr > 0.03) [[24, 25], [35, 23], [30, 18]].forEach(p => { o += `<circle cx="${p[0]}" cy="${p[1]}" r="2.1" fill="#f0d27a" stroke="#d9a93f" stroke-width="0.4" opacity="${fr.toFixed(2)}"/>`; });
  const dr = clamp((0.5 - h) * 2.2, 0, 1);
  if (dr > 0.03) { const dc = fluidRamp(clamp(h - 0.12, 0, 1)); [[22, 55, 20], [34, 56, -15], [27, 57, 8]].forEach(p => { o += `<ellipse cx="${p[0]}" cy="${p[1]}" rx="2.1" ry="1.1" fill="${dc}" opacity="${(0.85 * dr).toFixed(2)}" transform="rotate(${p[2]} ${p[0]} ${p[1]})"/>`; }); }
  return o;
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
    + [[30, 18, 2.2], [18, 24, 2.2], [42, 24, 2.2], [22, 30, 1.8], [38, 30, 1.8]].map(([x, y, w]) => `<line x1="30" y1="36" x2="${x}" y2="${y}" stroke="#9a958c" stroke-width="${w}" stroke-linecap="round"/>`).join("")
    + [[22, 55], [34, 55]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.3" ry="1.2" fill="#8d877d" opacity="0.85"/>`).join("");
}
// DECLINING ("super at risk") = a dying tree: dead grey-brown branches, only a few
// clinging yellow leaf-spots, and the whole right side left bare. One rung from lapsed.
function classicDying() {
  const wood = "#8a7862", woodDk = "#726250", y1 = "#e6b93c", y2 = "#cf9f3e";
  let o = `<ellipse cx="30" cy="59" rx="9" ry="2.1" fill="#000" opacity="0.04"/>`;
  o += `<rect x="28" y="34" width="4" height="24" rx="1.4" fill="${wood}"/>`;
  // bare dead branches — right side reaches out with nothing on it
  o += [[30, 17, 2.2], [18, 23, 2.2], [43, 21, 2.4], [22, 31, 1.8], [39, 29, 1.8]].map(([x, y, w]) => `<line x1="30" y1="37" x2="${x}" y2="${y}" stroke="${woodDk}" stroke-width="${w}" stroke-linecap="round"/>`).join("");
  o += `<line x1="25" y1="26" x2="20" y2="20" stroke="${woodDk}" stroke-width="1.3" stroke-linecap="round"/>`;
  // spots of yellow clinging to the left + center; right branch stays bare
  o += [[30, 16, 2.7], [18, 22, 2.3], [22, 30, 2.0], [25, 20, 1.6]].map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 2 ? y2 : y1}"/>`).join("");
  // a couple of dropped leaves at the base
  o += `<ellipse cx="23" cy="55" rx="2.1" ry="1.1" fill="${y2}" opacity="0.9" transform="rotate(20 23 55)"/>`;
  o += `<ellipse cx="35" cy="56" rx="2.1" ry="1.1" fill="${y1}" opacity="0.8" transform="rotate(-16 35 56)"/>`;
  return o;
}
// cupertino equivalent — smooth bare limbs, soft yellow leaf-blobs, right limb bare
function cupDying() {
  const w = "#a99e8e", trunk = "#b09a7c", y1 = "#e6b93c", y2 = "#cf9f3e";
  let o = `<ellipse cx="30" cy="59" rx="9" ry="2.1" fill="#000" opacity="0.04"/><rect x="28" y="36" width="4" height="22" rx="2" fill="${trunk}"/>`;
  o += `<line x1="30" y1="38" x2="20" y2="22" stroke="${w}" stroke-width="2.6" stroke-linecap="round"/>`;
  o += `<line x1="30" y1="38" x2="40" y2="23" stroke="${w}" stroke-width="2.6" stroke-linecap="round"/>`;
  o += `<line x1="30" y1="42" x2="23" y2="31" stroke="${w}" stroke-width="2" stroke-linecap="round"/>`;
  o += `<line x1="30" y1="42" x2="37" y2="31" stroke="${w}" stroke-width="2" stroke-linecap="round"/>`;
  o += `<line x1="30" y1="36" x2="30" y2="20" stroke="${w}" stroke-width="2" stroke-linecap="round"/>`;
  o += `<ellipse cx="20" cy="22" rx="3.4" ry="3.6" fill="${y1}"/>` + sheen(20, 22, 3.4, 3.6);
  o += `<ellipse cx="23" cy="31" rx="2.6" ry="2.8" fill="${y2}"/>`;
  o += `<ellipse cx="30" cy="20" rx="2.8" ry="3" fill="${y1}"/>` + sheen(30, 20, 2.8, 3);
  o += `<ellipse cx="36" cy="55" rx="2.1" ry="1.1" fill="${y2}" opacity="0.85" transform="rotate(-16 36 55)"/>`;
  return o;
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
  if (st === "declining") return classicDying();
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
  if (st === "declining") return cupDying();
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

// ===== FLUID variants of every skin — each grows continuously from bare (h=0) to lush (h=1) =====
// cupertino: a single canopy ellipse swells over smooth bare limbs
function fluidCupertino(h) {
  h = clamp(h, 0, 1); const f = h, col = fluidRamp(h), wood = mix("#a99e8e", "#b09a7c", h);
  const ry = f * 18, rx = ry * 0.92, cy = 30 - h * 2, bo = (0.85 - 0.7 * h).toFixed(2);
  let o = shadow(6 + f * 8) + `<rect x="28" y="${(36 - h * 2).toFixed(1)}" width="4" height="${(22 + h * 2).toFixed(1)}" rx="2" fill="${wood}"/>`;
  [[20, 22, 2.6], [40, 23, 2.6], [23, 31, 2], [37, 31, 2], [30, 20, 2]].forEach(b => { o += `<line x1="30" y1="38" x2="${b[0]}" y2="${b[1]}" stroke="${wood}" stroke-width="${b[2]}" stroke-linecap="round" opacity="${bo}"/>`; });
  if (ry > 0.6) o += `<ellipse cx="30" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${col}"/>` + sheen(30, cy, rx, ry);
  const fr = clamp((h - 0.82) * 6, 0, 1); if (fr > 0.03)[[24, 27], [35, 24], [30, 20]].forEach(p => o += `<circle cx="${p[0]}" cy="${p[1]}" r="2.1" fill="#f0d27a" stroke="#d9a93f" stroke-width="0.4" opacity="${fr.toFixed(2)}"/>`);
  const dr = clamp((0.5 - h) * 2.2, 0, 1); if (dr > 0.03) { const dc = fluidRamp(clamp(h - 0.12, 0, 1)); [[24, 55], [36, 56]].forEach(p => o += `<ellipse cx="${p[0]}" cy="${p[1]}" rx="2.1" ry="1.1" fill="${dc}" opacity="${(0.85 * dr).toFixed(2)}" transform="rotate(${p[0] % 2 ? 18 : -16} ${p[0]} ${p[1]})"/>`); }
  return o;
}
// pixel: canopy blocks fill outward from a grey stalk
function fluidPixel(h) {
  h = clamp(h, 0, 1); const cx = 30, cy = 26, col = fluidRamp(h), dk = darken(col, 0.78), trunkC = mix("#9c8a72", "#9c6a3a", h), rG = h * 3.4;
  let o = pxGround(cx);
  for (let gj = Math.max(1, Math.ceil(rG)); gj <= 5; gj++) o += pxRect(cx - PXC / 2, cy + gj * PXC - PXC / 2, trunkC);
  for (let gi = -4; gi <= 4; gi++) for (let gj = -4; gj <= 4; gj++) { if (gi * gi + gj * gj <= rG * rG) o += pxRect(cx + gi * PXC - PXC / 2, cy + gj * PXC - PXC / 2, ((gi + gj) & 1) ? dk : col); }
  const fr = clamp((h - 0.85) * 7, 0, 1); if (fr > 0.15)[[-1, -1], [1, 0], [0, -2]].forEach(p => { o += pxRect(cx + p[0] * PXC - PXC / 2, cy + p[1] * PXC - PXC / 2, "#e0492e"); });
  return o;
}
// watercolor: a blurred wash spreads over faint bare limbs
function fluidWatercolor(h, sfx) {
  h = clamp(h, 0, 1); const f = h, col = fluidRamp(h), wood = mix("#9a958c", "#b09a7c", h), R = f * 15, bo = (0.7 - 0.65 * h).toFixed(2);
  let o = shadow(6 + f * 8) + `<rect x="28" y="${(36 - h * 2).toFixed(1)}" width="4" height="${(22 + h * 2).toFixed(1)}" rx="2" fill="${wood}"/>`;
  [[20, 24, 2.2], [40, 24, 2.2], [30, 20, 2]].forEach(b => o += `<line x1="30" y1="38" x2="${b[0]}" y2="${b[1]}" stroke="${wood}" stroke-width="${b[2]}" stroke-linecap="round" opacity="${bo}"/>`);
  if (R > 1) o += washCanopy(col, R, 30 - h * 2, "fwc" + (sfx || ""));
  const fr = clamp((h - 0.82) * 6, 0, 1); if (fr > 0.03)[[24, 27], [35, 24], [30, 20]].forEach(p => o += `<circle cx="${p[0]}" cy="${p[1]}" r="2.1" fill="#f0d27a" stroke="#d9a93f" stroke-width="0.4" opacity="${fr.toFixed(2)}"/>`);
  const dr = clamp((0.5 - h) * 2.2, 0, 1); if (dr > 0.03) { const dc = fluidRamp(clamp(h - 0.12, 0, 1)); [[24, 55], [36, 56]].forEach(p => o += `<ellipse cx="${p[0]}" cy="${p[1]}" rx="2.1" ry="1.1" fill="${dc}" opacity="${(0.85 * dr).toFixed(2)}" transform="rotate(${p[0] % 2 ? 18 : -16} ${p[0]} ${p[1]})"/>`); }
  return o;
}
// low-poly: facets accrete and the whole cluster scales up from the trunk
function fluidLowpoly(h) {
  h = clamp(h, 0, 1); const col = fluidRamp(h), wood = mix("#9a958c", "#7a5a3e", h), K = Math.max(0, Math.round(h * 6)), sc = 0.35 + 0.65 * h;
  let o = shadow(6 + h * 8) + `<polygon points="27,58 33,58 31,40 29,40" fill="${wood}"/>`;
  if (h < 0.3) { const lo = Math.max(0, 0.7 - 2 * h).toFixed(2); [[22, 26, 2], [38, 26, 2], [30, 22, 2]].forEach(b => o += `<line x1="30" y1="40" x2="${b[0]}" y2="${b[1]}" stroke="${wood}" stroke-width="${b[2]}" stroke-linecap="round" opacity="${lo}"/>`); }
  const shades = [lighten(col, 0.22), col, darken(col, 0.8)];
  o += `<g transform="translate(30 40) scale(${sc.toFixed(2)}) translate(-30 -40)">` + LP_TRIS.slice(0, K).map((p, i) => `<polygon points="${p.map(q => q.join(",")).join(" ")}" fill="${shades[i % 3]}" stroke="#fff" stroke-width="0.5" stroke-opacity="0.35"/>`).join("") + `</g>`;
  const fr = clamp((h - 0.82) * 6, 0, 1); if (fr > 0.03)[[24, 26], [36, 24]].forEach(p => o += `<circle cx="${p[0]}" cy="${p[1]}" r="2.1" fill="#f0d27a" stroke="#d9a93f" stroke-width="0.4" opacity="${fr.toFixed(2)}"/>`);
  return o;
}
// bonsai: sculpted pads swell on the curved S-trunk
function fluidBonsai(h) {
  h = clamp(h, 0, 1); const col = fluidRamp(h), trunk = mix("#b09a7c", "#9a8366", h), sc = h * 1.05, d = darken(col, 0.82);
  let o = `<ellipse cx="30" cy="59" rx="9" ry="2" fill="#000" opacity="0.05"/><path d="M30 58 C26 50 33 46 30 38 C28 32 34 30 31 22" stroke="${trunk}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (h < 0.28) o += `<path d="M30 40 q-8 -2 -12 -7 M30 34 q9 0 13 -5 M31 26 q4 -4 9 -4" stroke="#a99e8e" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="${Math.max(0, 0.7 - 2.2 * h).toFixed(2)}"/>`;
  if (sc > 0.05) {
    o += `<path d="M30 40 L20 31 M30 36 L40 27 M30 30 L30 20" stroke="#9a8366" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="${Math.min(1, sc * 1.5).toFixed(2)}"/>`;
    [[20, 30, 7], [40, 26, 6.5], [30, 18, 6]].forEach((p, i) => { const rr = p[2] * sc; if (rr < 0.5) return; o += `<ellipse cx="${p[0]}" cy="${p[1]}" rx="${(rr * 1.15).toFixed(1)}" ry="${rr.toFixed(1)}" fill="${i === 1 ? d : col}"/><ellipse cx="${(p[0] - rr * 0.4).toFixed(1)}" cy="${(p[1] - rr * 0.4).toFixed(1)}" rx="${(rr * 0.45).toFixed(1)}" ry="${(rr * 0.3).toFixed(1)}" fill="#fff" opacity="0.16"/>`; });
  }
  const fr = clamp((h - 0.82) * 6, 0, 1); if (fr > 0.03)[[20, 30], [40, 26], [30, 18]].forEach(p => o += `<circle cx="${p[0]}" cy="${p[1]}" r="2.1" fill="#f0d27a" stroke="#d9a93f" stroke-width="0.4" opacity="${fr.toFixed(2)}"/>`);
  return o;
}
// dispatch: the active skin's fluid build for health h (0..1)
export function fluidArt(theme, h, sfx) {
  if (theme === "cupertino") return fluidCupertino(h);
  if (theme === "pixel") return fluidPixel(h);
  if (theme === "watercolor") return fluidWatercolor(h, sfx);
  if (theme === "lowpoly") return fluidLowpoly(h);
  if (theme === "bonsai") return fluidBonsai(h);
  return fluidTree(h);
}
