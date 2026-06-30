"use client";
// ShelfStory — an account's health drawn as a small tree.
// Shape + color come from the health state; canopy *fullness* is graded by 90-day
// momentum (pct). The ART STYLE follows the active theme (Classic / Cupertino /
// Pen & Ink) — same inputs, three illustration languages. Kept deliberately subtle:
// this is a health indicator, not scenery.
import { useId } from "react";
import { useTheme } from "../lib/theme";

const C = {
  soil:   "#9a7b52",
  leaf:   "#4a9068",
  leafDk: "#3f7d57",
  leafLt: "#6aa06a",
  gold:   "#c2922e",
  goldDk: "#a87d24",
  rust:   "#b0573a",
  sap:    "#5bb47e",
  sapLt:  "#7bc49a",
};

export function plantState(headline) {
  const h = String(headline || "").toLowerCase().trim();
  if (h === "new") return "sapling";                                   // young & bright
  if (h === "accelerating") return "thriving";                         // full canopy
  if (h === "lapsed") return "bare";                                   // leafless
  if (h === "at-risk" || h === "atrisk" || h === "at risk" || h === "decelerating") return "wilting"; // thinning
  return "bearing";                                                    // steady canopy (stable)
}
export const stateLabel = { thriving: "Growing", bearing: "Steady", wilting: "At risk", bare: "Lapsed", sapling: "New" };
export const stateColor = { thriving: C.leaf, bearing: C.leafLt, wilting: C.gold, bare: C.rust, sapling: C.sap };

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// canopy fullness 0..1 from momentum. Tasteful range — a few visible degrees,
// not a continuous wildly-varying blob.
function fullness(st, pct) {
  if (pct == null) return st === "thriving" ? 0.78 : st === "wilting" ? 0.42 : 0.6;
  if (st === "thriving") return clamp(0.62 + pct / 90, 0.58, 1);      // +0%→.62  +35%→1
  if (st === "bearing")  return clamp(0.55 + pct / 140, 0.45, 0.72);
  if (st === "wilting")  return clamp(0.5 + pct / 55, 0.12, 0.6);     // -5%→.41  -25%→floor
  if (st === "sapling")  return clamp(0.4 + (pct > 0 ? pct / 70 : 0), 0.35, 0.72);
  return 0;
}
function prep(headline, pct, state) { const st = state || plantState(headline); return { st, f: fullness(st, pct) }; }

function darken(hex, f) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const d = x => Math.round(x * f).toString(16).padStart(2, "0");
  return `#${d(r)}${d(g)}${d(b)}`;
}

// canopy leaf positions, ordered center-out so a partial fill grows outward
const SPOTS = [
  [16, 15],
  [11, 16], [21, 16], [16, 10],
  [13, 20], [19, 20], [9, 13], [23, 13], [16, 6],
  [10, 19], [22, 19], [12, 9], [20, 9], [16, 22], [7, 17], [25, 17],
];
const FALLEN = [[9, 41], [15, 43], [21, 41], [25, 42], [12, 42]];
const BRANCHES = [[16, 6], [8, 11], [24, 11], [11, 15], [21, 15]];
const FRUIT = [[11, 16], [21, 12], [16, 21], [24, 17], [13, 11]];

// ============================ per-account dispatch ============================
export default function TreeGlyph(props) {
  const { theme } = useTheme();
  if (theme === "cupertino") return <CupTree {...props} />;
  if (theme === "ink") return <InkTree {...props} />;
  return <ClassicTree {...props} />;
}

// ----------------------------- CLASSIC -----------------------------
function ClassicTree({ headline, pct, h = 40, state }) {
  const st = state || plantState(headline);
  const G = { width: Math.round((h * 32) / 44), height: h, display: "block", flexShrink: 0 };
  const f = fullness(st, pct);

  if (st === "bare") {
    return (
      <svg style={G} viewBox="0 0 32 44" aria-hidden="true">
        <rect x="14.5" y="18" width="3" height="26" rx="1.2" fill="#9a6a52" />
        {BRANCHES.map(([x, y], i) => (
          <line key={i} x1="16" y1="20" x2={x} y2={y} stroke="#b0573a" strokeWidth="1.8" strokeLinecap="round" />
        ))}
        {FALLEN.slice(0, 3).map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="2.1" ry="1.2" fill="#9e3f28" opacity="0.9" />
        ))}
      </svg>
    );
  }

  if (st === "sapling") {
    const K = Math.round(2 + f * 4);
    return (
      <svg style={G} viewBox="0 0 32 44" aria-hidden="true">
        <rect x="15" y="16" width="2.4" height="28" rx="1.2" fill={C.soil} />
        {SPOTS.slice(0, K).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y * 0.7 + 4} r="3.6" fill={i % 2 ? C.sapLt : C.sap} />
        ))}
      </svg>
    );
  }

  const K = Math.round(4 + f * (SPOTS.length - 4));            // 4..16 leaf clusters
  const base = st === "thriving" ? C.leaf : st === "bearing" ? C.leafLt : C.gold;
  const dark = st === "thriving" ? C.leafDk : st === "bearing" ? C.leaf : C.goldDk;
  const fallenN = st === "wilting" ? Math.round((1 - f) * 5) : 0;
  const trunkY = st === "wilting" ? 22 : 23;
  const fruitN = (st === "thriving" || st === "bearing") && pct != null && pct >= 30 ? (pct >= 50 ? 5 : 3) : 0;

  return (
    <svg style={G} viewBox="0 0 32 44" aria-hidden="true">
      <rect x="14.5" y={trunkY} width="3" height={44 - trunkY} rx="1.2" fill={C.soil} />
      {SPOTS.slice(0, K).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.1" fill={i % 3 === 0 ? dark : base} />
      ))}
      {FRUIT.slice(0, fruitN).map(([x, y], i) => (
        <circle key={"fr" + i} cx={x} cy={y} r="1.6" fill="#f0d27a" stroke="#d9a93f" strokeWidth="0.4" />
      ))}
      {FALLEN.slice(0, fallenN).map(([x, y], i) => (
        <ellipse key={"f" + i} cx={x} cy={y} rx="2" ry="1.1" fill={C.gold} opacity="0.8" />
      ))}
    </svg>
  );
}

// ----------------------------- CUPERTINO -----------------------------
// One smooth canopy, single weight, soft sheen. Health by hue, momentum by size.
function CupTree({ headline, pct, h = 40, state }) {
  const { st, f } = prep(headline, pct, state);
  const G = { width: Math.round((h * 32) / 44), height: h, display: "block", flexShrink: 0 };
  const col = stateColor[st];
  if (st === "bare") {
    return (
      <svg style={G} viewBox="0 0 32 44" aria-hidden="true">
        <rect x="14.6" y="20" width="2.8" height="24" rx="1.4" fill={C.soil} />
        <circle cx="16" cy="15" r="9" fill="none" stroke={C.rust} strokeWidth="1.6" opacity="0.7" strokeDasharray="2.6 3.2" />
      </svg>
    );
  }
  const ry = (st === "sapling" ? 6.5 : 8.5) + f * 6.5;
  const rx = ry * 0.92;
  const cy = 15;
  const fruit = (st === "thriving" || st === "bearing") && pct != null && pct >= 30;
  return (
    <svg style={G} viewBox="0 0 32 44" aria-hidden="true">
      <rect x="14.6" y={cy + ry - 1} width="2.8" height={44 - (cy + ry - 1)} rx="1.4" fill={C.soil} />
      <ellipse cx="16" cy={cy} rx={rx} ry={ry} fill={col} />
      <ellipse cx={16 - rx * 0.32} cy={cy - ry * 0.34} rx={rx * 0.46} ry={ry * 0.36} fill="#ffffff" opacity="0.22" />
      {fruit && <><circle cx="11.5" cy={cy + 1} r="1.7" fill="#f0d27a" /><circle cx="20.5" cy={cy - 3} r="1.7" fill="#f0d27a" /></>}
    </svg>
  );
}

// ----------------------------- PEN & INK -----------------------------
// Engraved canopy: outline + hatching. Denser hatch (and cross-hatch) = healthier.
// Hue is tinted into the ink so health still reads without breaking the woodcut feel.
function InkTree({ headline, pct, h = 40, state }) {
  const { st, f } = prep(headline, pct, state);
  const G = { width: Math.round((h * 32) / 44), height: h, display: "block", flexShrink: 0 };
  const id = useId().replace(/[:]/g, "");
  const ink = darken(stateColor[st], 0.55);
  if (st === "bare") {
    return (
      <svg style={G} viewBox="0 0 32 44" aria-hidden="true">
        <rect x="14.8" y="18" width="2.4" height="26" fill="none" stroke={C.rust} strokeWidth="1.1" />
        {BRANCHES.map(([x, y], i) => (
          <line key={i} x1="16" y1="20" x2={x} y2={y} stroke={C.rust} strokeWidth="1.1" strokeLinecap="round" />
        ))}
      </svg>
    );
  }
  const R = (st === "sapling" ? 7 : 8.5) + f * 6.5;
  const cy = 14;
  const gap = Math.max(2, 5.5 - f * 3.5);
  const cross = f > 0.5;
  const cid = "ic" + id;
  const lines = [];
  for (let x = 16 - 2 * R; x < 16 + R; x += gap) lines.push([x, cy - R, x + 2 * R, cy + R]);
  if (cross) for (let x = 16 - R; x < 16 + 2 * R; x += gap) lines.push([x, cy + R, x - 2 * R, cy - R]);
  const fruitN = (st === "thriving" || st === "bearing") && pct != null && pct >= 30 ? (pct >= 50 ? 3 : 2) : 0;
  return (
    <svg style={G} viewBox="0 0 32 44" aria-hidden="true">
      <defs><clipPath id={cid}><circle cx="16" cy={cy} r={R} /></clipPath></defs>
      <rect x="14.9" y={cy + R - 2} width="2.2" height={44 - (cy + R - 2)} fill="none" stroke={ink} strokeWidth="1" />
      <circle cx="16" cy={cy} r={R} fill="none" stroke={ink} strokeWidth="1.1" />
      <g clipPath={`url(#${cid})`}>
        {lines.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke={ink} strokeWidth="0.55" />
        ))}
      </g>
      {FRUIT.slice(0, fruitN).map(([x, y], i) => (
        <circle key={"fr" + i} cx={x} cy={Math.min(y, cy + R - 2)} r="1.5" fill="none" stroke={ink} strokeWidth="0.8" />
      ))}
    </svg>
  );
}

// ============================ tier emblem dispatch ============================
// A single emblem tree for a whole tier — driven by `t` (vitality 0..1) and a
// strongly-carried tier `color`.
export function TierTree(props) {
  const { theme } = useTheme();
  if (theme === "cupertino") return <CupTier {...props} />;
  if (theme === "ink") return <InkTier {...props} />;
  return <ClassicTier {...props} />;
}

const TT_SPOTS = [[22, 16], [16, 17], [28, 17], [22, 10], [18, 22], [26, 22], [13, 13], [31, 13], [22, 25], [16, 11], [28, 11], [13, 20], [31, 20]];
const TT_FALLEN = [[13, 43], [31, 43], [20, 45], [27, 44]];

function ClassicTier({ t = 0.6, color = "#4a9068", h = 88 }) {
  const W = Math.round((h * 44) / 48);
  const G = { width: W, height: h, display: "block" };
  if (t <= 0.12) {
    return (
      <svg style={G} viewBox="0 0 44 48" aria-hidden="true">
        <rect x="20.5" y="24" width="3" height="20" rx="1.2" fill="#9a6a52" />
        <line x1="22" y1="26" x2="12" y2="14" stroke="#b0573a" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="22" y1="26" x2="32" y2="14" stroke="#b0573a" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="22" y1="30" x2="15" y2="21" stroke="#b0573a" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="22" y1="30" x2="29" y2="21" stroke="#b0573a" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="13" cy="44" rx="2.6" ry="1.4" fill="#9e3f28" opacity="0.9" />
        <ellipse cx="31" cy="44" rx="2.4" ry="1.3" fill="#9e3f28" opacity="0.85" />
      </svg>
    );
  }
  const dark = darken(color, 0.82);
  const K = Math.round(5 + t * (TT_SPOTS.length - 5));
  const fallenN = t < 0.42 ? Math.round((0.42 - t) * 9) : 0;
  return (
    <svg style={G} viewBox="0 0 44 48" aria-hidden="true">
      <rect x="20.5" y="24" width="3" height="20" rx="1.2" fill="#9a6a52" />
      {TT_SPOTS.slice(0, K).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill={i % 3 === 0 ? dark : color} />
      ))}
      {t > 0.82 && <><circle cx="17" cy="14" r="1.9" fill="#f0d27a" /><circle cx="29" cy="18" r="1.9" fill="#f0d27a" /><circle cx="22" cy="10" r="1.9" fill="#f0d27a" /></>}
      {TT_FALLEN.slice(0, fallenN).map(([x, y], i) => (
        <ellipse key={"f" + i} cx={x} cy={y} rx="2.2" ry="1.2" fill={color} opacity="0.65" />
      ))}
    </svg>
  );
}

function CupTier({ t = 0.6, color = "#4a9068", h = 88 }) {
  const W = Math.round((h * 44) / 48);
  const G = { width: W, height: h, display: "block" };
  if (t <= 0.12) {
    return (
      <svg style={G} viewBox="0 0 44 48" aria-hidden="true">
        <rect x="20.6" y="26" width="3" height="18" rx="1.5" fill={C.soil} />
        <circle cx="22" cy="19" r="12" fill="none" stroke={C.rust} strokeWidth="1.8" opacity="0.7" strokeDasharray="3 3.6" />
      </svg>
    );
  }
  const ry = 11 + t * 9;
  const rx = ry * 0.95;
  const cy = 19;
  return (
    <svg style={G} viewBox="0 0 44 48" aria-hidden="true">
      <rect x="20.6" y={cy + ry - 2} width="3" height={48 - (cy + ry - 2)} rx="1.5" fill={C.soil} />
      <ellipse cx="22" cy={cy} rx={rx} ry={ry} fill={color} />
      <ellipse cx={22 - rx * 0.32} cy={cy - ry * 0.34} rx={rx * 0.46} ry={ry * 0.36} fill="#ffffff" opacity="0.2" />
      {t > 0.82 && <><circle cx="17" cy={cy} r="2" fill="#f0d27a" /><circle cx="28" cy={cy - 4} r="2" fill="#f0d27a" /></>}
    </svg>
  );
}

function InkTier({ t = 0.6, color = "#4a9068", h = 88 }) {
  const W = Math.round((h * 44) / 48);
  const G = { width: W, height: h, display: "block" };
  const id = useId().replace(/[:]/g, "");
  const ink = darken(color, 0.5);
  if (t <= 0.12) {
    return (
      <svg style={G} viewBox="0 0 44 48" aria-hidden="true">
        <rect x="20.9" y="24" width="2.2" height="20" fill="none" stroke={C.rust} strokeWidth="1.2" />
        <line x1="22" y1="26" x2="12" y2="14" stroke={C.rust} strokeWidth="1.3" strokeLinecap="round" />
        <line x1="22" y1="26" x2="32" y2="14" stroke={C.rust} strokeWidth="1.3" strokeLinecap="round" />
        <line x1="22" y1="30" x2="15" y2="21" stroke={C.rust} strokeWidth="1.1" strokeLinecap="round" />
        <line x1="22" y1="30" x2="29" y2="21" stroke={C.rust} strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }
  const R = 11 + t * 9;
  const cy = 18;
  const gap = Math.max(2.2, 5.5 - t * 3.3);
  const cross = t > 0.5;
  const cid = "itc" + id;
  const lines = [];
  for (let x = 22 - 2 * R; x < 22 + R; x += gap) lines.push([x, cy - R, x + 2 * R, cy + R]);
  if (cross) for (let x = 22 - R; x < 22 + 2 * R; x += gap) lines.push([x, cy + R, x - 2 * R, cy - R]);
  return (
    <svg style={G} viewBox="0 0 44 48" aria-hidden="true">
      <defs><clipPath id={cid}><circle cx="22" cy={cy} r={R} /></clipPath></defs>
      <rect x="20.9" y={cy + R - 2} width="2.2" height={48 - (cy + R - 2)} fill="none" stroke={ink} strokeWidth="1.1" />
      <circle cx="22" cy={cy} r={R} fill="none" stroke={ink} strokeWidth="1.2" />
      <g clipPath={`url(#${cid})`}>
        {lines.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke={ink} strokeWidth="0.6" />
        ))}
      </g>
      {t > 0.82 && [[17, 13], [28, 17], [22, 9]].map(([x, y], i) => (
        <circle key={"fr" + i} cx={x} cy={y} r="1.8" fill="none" stroke={ink} strokeWidth="0.9" />
      ))}
    </svg>
  );
}
