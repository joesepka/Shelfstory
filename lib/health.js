// Per-account health, read the SAME way the desktop app reads it.
//
// The pipeline's `headline` column is a 90-vs-90 comparison, which mislabels lumpy
// accounts (a single large order in the prior window reads as a collapse). The desktop
// replaced it with a bump-aware, cadence-aware classifier that works off each account's
// own monthly order line — see lib/acctHealth.js, shared verbatim between the two apps.
//
// Rather than touch the ~70 places that read `headline`, we heal the column at load:
// every row gets the classifier's verdict in the pipeline's own vocabulary, so tags,
// trees and rollups across the whole mobile app match desktop by construction.
import { supabase } from "./supabase";
import { profile } from "./profile";
import { acctHealth } from "./acctHealth";

// classifier tier -> the vocabulary `headline` already uses (see TreeGlyph.tierBucket)
const WORD = { accelerating: "Accelerating", stable: "Stable", new: "New",
               decelerating: "Decelerating", "at-risk": "At-Risk", lapsed: "Lapsed" };

const cache = {};   // parent key -> Promise<{ [account_id]: number[24] }>

// months oldest-first per account. `parent` filters to one label (Blind Corner / Torch);
// pass null for the whole book.
export function loadMonthly(parent) {
  if (profile.name !== "brewery") return Promise.resolve(null);
  const key = parent || "ALL";
  if (cache[key]) return cache[key];
  cache[key] = (async () => {
    const out = {};
    let from = 0;
    while (true) {
      const { data, error } = await supabase.rpc("acct_monthly", { p_parent: parent || null }).range(from, from + 4999);
      if (error || !data) break;
      for (const r of data) {
        const a = out[r.account_id] || (out[r.account_id] = new Array(24).fill(0));
        const w = r.window_index;
        if (w >= 0 && w <= 23) a[23 - w] = Number(r.cases) || 0;
      }
      if (data.length < 5000) break;
      from += 5000;
    }
    return out;
  })();
  return cache[key];
}

// Replace `headline` on every row with the shared classifier's verdict, and recompute the
// 90-day figures from the depletion windows — the windows are the source of truth, and the
// pipeline's cur90/prev90 have been seen to drift on accounts with returns.
export function healRows(rows, monthly) {
  if (!rows || !monthly) return rows;
  const S = a => a.reduce((x, y) => x + y, 0);
  // An account with no rows in this slice has no history under the current label, so it is
  // not part of this book at all — dropping it is what keeps a filtered view honest. (Leaving
  // it in kept its unfiltered cur90 and inflated a Blind-Corner-only read by ~500 cases.)
  return rows.filter(r => monthly[r.account_id]).map(r => {
    const m = monthly[r.account_id];
    const cur = S(m.slice(-3)), prev = S(m.slice(-6, -3));
    // keep full precision — rounding per account then summing drifts the book total by
    // the number of accounts; desktop sums first and rounds once, so we match it here
    return { ...r,
      headline: WORD[acctHealth(m)] || r.headline,
      cur90: cur, prev90: prev,
      prior90_pct: prev > 0 ? Math.round((cur - prev) / prev * 100) : null,
      account_weight: S(m.slice(12)),   // trailing 52 weeks, same basis as desktop
      spark: m.slice(-12),
    };
  });
}

// convenience: fetch + heal in one call
export async function withHealth(rows, parent) {
  const monthly = await loadMonthly(parent);
  return { rows: healRows(rows, monthly), monthly };
}
