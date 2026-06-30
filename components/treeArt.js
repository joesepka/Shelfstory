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

// ===================== WILD #2: living flame (ember) =====================
// True fire palette — bright yellow-orange when hot, deeper orange as it cools,
// GREY ember + smoke when almost dead, grey ash when lapsed. Size = health.
const FIRE = { accelerating: "#ff8a1f", thriving: "#ff9e26", growing: "#f59a2a", steady: "#ef8f2a", softening: "#e8842a", slipping: "#dd7726", atrisk: "#cf6322", declining: "#9e978d" };
const ash = () => `<ellipse cx="30" cy="58" rx="11" ry="3.2" fill="#8f877b"/><ellipse cx="26" cy="56" rx="3" ry="2" fill="#a39a8c"/><ellipse cx="34" cy="56.5" rx="2.6" ry="1.8" fill="#a39a8c"/><path d="M30 53 q4 -6 0 -11 q-4 -5 0 -10" fill="none" stroke="#b3ada3" stroke-width="1.4" opacity="0.45" stroke-linecap="round"/>`;
const flame = (cx, by, w, h, fill) => `<path d="M${cx} ${(by - h).toFixed(1)} C ${(cx - w).toFixed(1)} ${(by - h * 0.55).toFixed(1)} ${(cx - w * 0.7).toFixed(1)} ${by} ${cx} ${by} C ${(cx + w * 0.7).toFixed(1)} ${by} ${(cx + w).toFixed(1)} ${(by - h * 0.55).toFixed(1)} ${cx} ${(by - h).toFixed(1)} Z" fill="${fill}"/>`;
function emberA(st, f) {
  const by = 56;
  if (st === "lapsed") return ash();
  const body = st === "new" ? "#ffb02e" : (FIRE[st] || "#ef8f2a");
  const inner = lighten(body, 0.32), core = lighten(body, 0.62);
  const H = st === "new" ? 14 : 14 + f * 26, W = st === "new" ? 6 : 7 + f * 5;
  let o = `<ellipse cx="30" cy="59" rx="${(W * 0.9).toFixed(1)}" ry="2" fill="#000" opacity="0.06"/>`;
  if (st === "accelerating" || st === "thriving") o += `<ellipse cx="30" cy="${(by - H * 0.55).toFixed(1)}" rx="${(W * 1.35).toFixed(1)}" ry="${(H * 0.6).toFixed(1)}" fill="${body}" opacity="0.12"/>`;
  o += flame(30, by, W, H, body) + flame(30, by, W * 0.62, H * 0.72, inner) + flame(30, by, W * 0.32, H * 0.42, core);
  if (st === "new") o += `<rect x="29" y="${by - 1}" width="2" height="6" rx="1" fill="#9c6a3a"/>`;
  if (st === "accelerating") o += spark(42, 28, "#ffe08a") + spark(18, 30, "#fff3c0") + spark(38, 15, inner);
  if (st === "declining") o += `<path d="M30 ${(by - H).toFixed(1)} q5 -6 1 -12" fill="none" stroke="#b3ada3" stroke-width="1.3" opacity="0.5" stroke-linecap="round"/>`;
  return o;
}

// ===================== WILD #3: vital-sign pulse (EKG) =====================
const pulseGrid = () => `<g stroke="#cfd8cf" stroke-width="0.5" opacity="0.55">` + [13, 22, 31, 40, 49].map(y => `<line x1="4" y1="${y}" x2="56" y2="${y}"/>`).join("") + [12, 22, 32, 42, 52].map(x => `<line x1="${x}" y1="11" x2="${x}" y2="51"/>`).join("") + `</g>`;
function pulseA(st, f) {
  const midY = 31, grid = pulseGrid();
  if (st === "lapsed") return grid + `<path d="M4 ${midY} H56" stroke="#9a958c" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="56" cy="${midY}" r="2" fill="#9a958c"/>`;
  const col = cf(st).m, amp = st === "new" ? 5 : 4 + f * 20;
  const path = st === "new"
    ? `M4 ${midY} H22 q3 -${amp} 6 0 H56`
    : `M4 ${midY} H19 L23 ${(midY - amp).toFixed(1)} L26 ${(midY + amp * 0.55).toFixed(1)} L29 ${(midY - amp * 0.28).toFixed(1)} L32 ${midY} H56`;
  let o = grid + `<path d="${path}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="56" cy="${midY}" r="2.4" fill="${col}"/>`;
  if (st === "accelerating") o += spark(23, midY - amp - 3, "#ffd76a");
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
function emberT(t, color) {
  if (t <= 0.12) return ash();
  const by = 56, body = t < 0.3 ? "#cf6322" : "#ef8f2a", inner = lighten(body, 0.32), core = lighten(body, 0.62), H = 14 + t * 26, W = 7 + t * 5;
  let o = `<ellipse cx="30" cy="59" rx="${(W * 0.9).toFixed(1)}" ry="2" fill="#000" opacity="0.06"/>`;
  o += flame(30, by, W, H, body) + flame(30, by, W * 0.62, H * 0.72, inner) + flame(30, by, W * 0.32, H * 0.42, core);
  if (t > 0.82) o += spark(42, 26, "#ffe08a") + spark(18, 30, "#fff3c0");
  return o;
}
function pulseT(t, color) {
  const midY = 31, grid = pulseGrid();
  if (t <= 0.12) return grid + `<path d="M4 ${midY} H56" stroke="#9a958c" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="56" cy="${midY}" r="2" fill="#9a958c"/>`;
  const amp = 4 + t * 20;
  let o = grid + `<path d="M4 ${midY} H19 L23 ${(midY - amp).toFixed(1)} L26 ${(midY + amp * 0.55).toFixed(1)} L29 ${(midY - amp * 0.28).toFixed(1)} L32 ${midY} H56" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="56" cy="${midY}" r="2.4" fill="${color}"/>`;
  if (t > 0.82) o += spark(23, midY - amp - 3, "#ffd76a");
  return o;
}

// ============================ dispatch ============================
export function accountArt(theme, st, f, sfx) {
  if (theme === "cupertino") return cupA(st, f);
  if (theme === "pixel") return pixelA(st, f);
  if (theme === "ember") return emberA(st, f);
  if (theme === "pulse") return pulseA(st, f);
  return classicA(st, f);
}
export function tierArt(theme, t, color, sfx) {
  if (theme === "cupertino") return cupT(t, color);
  if (theme === "pixel") return pixelT(t, color);
  if (theme === "ember") return emberT(t, color);
  if (theme === "pulse") return pulseT(t, color);
  return classicT(t, color);
}
