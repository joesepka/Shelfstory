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
