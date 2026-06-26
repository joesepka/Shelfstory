// Shared helpers — single source of truth. These were copy-pasted across
// dist / perf/overview / wholesale / account / book / actions; now imported.

// growth % (90d vs prior); null when no prior base
export const gpct = (c, p) => (p > 0 ? Math.round((100 * (c - p)) / p) : null);

// abbreviate counts: 52k / 810
export const kfmt = v => (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : Math.round(v).toLocaleString());

export const titleCase = s => String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

// health classifiers (consistency-critical — keep one definition)
export const isNew = h => String(h || "").toLowerCase().trim() === "new";
export const isLapsed = h => String(h || "").toLowerCase().trim() === "lapsed";
export const isAtRisk = h => {
  const x = String(h || "").toLowerCase().trim();
  return x === "decelerating" || x === "at-risk" || x === "atrisk" || x === "at risk";
};
export const isDeclining = h => isAtRisk(h) || isLapsed(h);
// 4-bucket health: new | healthy | atrisk | lapsed
export const healthBucket = h => (isNew(h) ? "new" : isLapsed(h) ? "lapsed" : isAtRisk(h) ? "atrisk" : "healthy");

// account volume basis: new accounts project cur90*3, else annualized weight
export const vol = a => (isNew(a.headline) ? (a.cur90 || 0) * 3 : (a.account_weight || 0));

// on-premise test (channel startsWith "ON")
export const isOn = r => String(r.channel || "").toUpperCase().startsWith("ON");

// rolling-month short labels, n back from now (e.g. monthLabels(11) -> 12 labels)
export function monthLabels(n) {
  const now = new Date();
  const out = [];
  for (let k = n; k >= 1; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    out.push(d.toLocaleString("en-US", { month: "short" }));
  }
  return out;
}

// value-shaded chart bars: softer (lower) = lighter, better (higher) = darker.
const _lerp = (a, b, t) => { const u = Math.max(0, Math.min(1, t)); return `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * u)).join(",")})`; };
export const greenBar = (v, lo, hi) => (v <= 0 ? "var(--bar-neutral)" : _lerp([193, 222, 202], [47, 94, 58], 0.18 + 0.82 * (hi > lo ? (v - lo) / (hi - lo) : 1)));
export const blueBar  = (v, lo, hi) => (v <= 0 ? "var(--bar-neutral)" : _lerp([200, 221, 239], [44, 83, 120], 0.18 + 0.82 * (hi > lo ? (v - lo) / (hi - lo) : 1)));
export const purpleBar = (v, lo, hi) => (v <= 0 ? "var(--bar-neutral)" : _lerp([207, 203, 238], [70, 58, 118], 0.18 + 0.82 * (hi > lo ? (v - lo) / (hi - lo) : 1)));
