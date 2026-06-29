"use client";
// ShelfStory — an account's health drawn as a small tree.
// Shape + color come from the health state; canopy *fullness* is graded by 90-day
// momentum (pct) so a hot account reads fuller than a barely-positive one, and a
// deep decline reads more wilted than a mild one. Kept deliberately subtle — this
// is a health indicator, not scenery.

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

export default function TreeGlyph({ headline, pct, h = 40, state }) {
  const st = state || plantState(headline);
  const G = { width: Math.round((h * 32) / 44), height: h, display: "block", flexShrink: 0 };
  const f = fullness(st, pct);

  // ----- lapsed: bare branches + a couple fallen leaves -----
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

  // ----- sapling: small bright young tree -----
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

  // ----- thriving / bearing / wilting: graded canopy -----
  const K = Math.round(4 + f * (SPOTS.length - 4));            // 4..16 leaf clusters
  const base = st === "thriving" ? C.leaf : st === "bearing" ? C.leafLt : C.gold;
  const dark = st === "thriving" ? C.leafDk : st === "bearing" ? C.leaf : C.goldDk;
  const fallenN = st === "wilting" ? Math.round((1 - f) * 5) : 0;
  const trunkY = st === "wilting" ? 22 : 23;
  // really popping (strong growth) → bear fruit
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

// ---- TierTree: a single emblem tree for a whole tier ----
// Driven by `t` (vitality 0..1) and a strongly-carried tier `color`. Lush + fruiting
// when accelerating, sparse + shedding as it slips, bare red branches when critical.
function darken(hex, f) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const d = x => Math.round(x * f).toString(16).padStart(2, "0");
  return `#${d(r)}${d(g)}${d(b)}`;
}
const TT_SPOTS = [[22, 16], [16, 17], [28, 17], [22, 10], [18, 22], [26, 22], [13, 13], [31, 13], [22, 25], [16, 11], [28, 11], [13, 20], [31, 20]];
const TT_FALLEN = [[13, 43], [31, 43], [20, 45], [27, 44]];

export function TierTree({ t = 0.6, color = "#4a9068", h = 88 }) {
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
