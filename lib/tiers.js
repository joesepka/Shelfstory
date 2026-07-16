"use client";
// Split a set of accounts into four volume tiers by cumulative L52W volume
// (account_weight): top / mid / small / tail, each ~25% of total volume.
// Used by the home tier trees and by the book to filter to a clicked tier.
export const TIER_LABEL = { top: "Top tier", mid: "Mid tier", small: "Small tier", tail: "Long tail" };

export function tierIdSet(accounts, key) {
  const set = new Set();
  if (!accounts || !accounts.length || !TIER_LABEL[key]) return set;
  const sorted = [...accounts].sort((a, b) => (b.account_weight || 0) - (a.account_weight || 0));
  const totW = sorted.reduce((s, r) => s + (r.account_weight || 0), 0) || 1;
  let cum = 0;
  for (const r of sorted) {
    const f = cum / totW; cum += r.account_weight || 0;
    const k = f < 0.25 ? "top" : f < 0.5 ? "mid" : f < 0.75 ? "small" : "tail";
    if (k === key) set.add(r.account_id);
  }
  return set;
}

// The home "book by size" trees: rank accounts by size (account_weight, fallback cur90)
// descending, then band by COUNT — large = top 20%, mid = 20–60%, small = 60–80%.
// Kept in sync with the tier split in app/page.js mk() so a clicked tree filters to the
// exact same accounts. (Bottom 20% by size is intentionally left out.)
export const SIZE_LABEL = { large: "Large accounts", mid: "Mid accounts", small: "Small accounts" };

export function sizeIdSet(accounts, key) {
  const set = new Set();
  if (!accounts || !accounts.length || !SIZE_LABEL[key]) return set;
  const sized = [...accounts].filter(r => (r.account_weight || r.cur90 || 0) > 0)
    .sort((a, b) => (b.account_weight || b.cur90 || 0) - (a.account_weight || a.cur90 || 0));
  const N = sized.length, c1 = Math.round(N * 0.2), c2 = Math.round(N * 0.6), c3 = Math.round(N * 0.8);
  const lo = key === "large" ? 0 : key === "mid" ? c1 : c2;
  const hi = key === "large" ? c1 : key === "mid" ? c2 : c3;
  for (let i = lo; i < hi; i++) set.add(sized[i].account_id);
  return set;
}
