// Health from a MONTHLY order line — one classifier for accounts, items and cities (Joe's rules, 2026-08-11).
// Feed it 24 months oldest-first; the last 3 are the trailing 90 days.
//
//   new           first depletion in the trailing 90 days with NOTHING in the 52 weeks before it
//                 (so a store that bought two years ago and just came back is new again).
//                 NEW WINS OVER EVERYTHING — no silence flag, no at-risk, for its whole first 90 days.
//   lapsed        zero in the rolling 90 (canonical, never overridden except by new)
//   accelerating  SUSTAINED above its own baseline — recent 3-month average ≥35% over baseline AND at
//                 least 2 of those 3 months individually above it. Step-up-and-hold counts; one spike doesn't.
//   decelerating  a confirmed slide: real depth vs baseline AND consecutive down months
//   at-risk       a sharper/longer slide, or quieter than its own ordering rhythm has ever been
//   stable        everything else — including young accounts and one-off wobbles
//
// Two guards keep it honest: baseline EXCLUDES the single biggest month (one bump can't fake a decline),
// and "silence" is measured against the account's own historical gap (a quarterly buyer's empty month is cadence).
const median = a => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
const sum = a => a.reduce((x, y) => x + y, 0);

export function acctHealth(monthsOldestFirst) {
  const m = (monthsOldestFirst || []).map(v => Math.max(0, Number(v) || 0));
  const n = m.length;
  if (!n) return "lapsed";
  const recent = m.slice(-3);                                   // the trailing 90 days
  if (sum(recent) <= 0) return "lapsed";                        // canonical: no orders in the rolling 90

  // NEW — bought in the last 90 days for the first time in 52 weeks. Beats every other signal.
  const prior52 = m.slice(Math.max(0, n - 15), n - 3);
  if (sum(prior52) <= 0) return "new";

  const first = m.findIndex(v => v > 0);
  const h = m.slice(first);                                     // life starts at the first order
  const len = h.length;

  // "silent" = quieter than this account has ever been between orders (a bi-monthly buyer's gap month is cadence)
  let tz = 0; for (let i = len - 1; i >= 0 && h[i] <= 0; i--) tz++;
  let maxGap = 0, run = 0;
  for (let i = 0; i < len - tz; i++) { if (h[i] <= 0) { run++; if (run > maxGap) maxGap = run; } else run = 0; }
  const silent = tz > 0 && tz > maxGap;
  if (silent && tz >= 2) return "at-risk";

  if (len <= 4) return silent ? "at-risk" : "stable";           // young: lean stable unless it just went quiet

  // Compare ROLLING-90 windows — the same series the account card graphs, so the classification always
  // matches what you see. Each window is a 3-month sum, which absorbs lumpy cadence (an every-other-month
  // buyer's empty month isn't a decline), and taking the MEDIAN of the past year's windows means one big
  // order can lift at most a few overlapping windows, never the middle of the distribution.
  const roll = []; for (let i = 2; i < len; i++) roll.push(h[i] + h[i - 1] + h[i - 2]);
  const cur90 = roll[roll.length - 1];
  const priorRoll = roll.slice(Math.max(0, roll.length - 13), roll.length - 1);   // up to 12 windows before this one
  const baseline = median(priorRoll);

  let dsteps = 0; for (let i = len - 1; i > 0 && h[i] < h[i - 1] * 0.92; i--) dsteps++;   // consecutive down months (8% noise tolerance)

  // dark for the whole prior year and now buying again — but one lone reorder is sporadic, not a comeback
  if (baseline <= 0) return recent.filter(v => v > 0).length >= 2 ? "accelerating" : "stable";

  const ratio = cur90 / baseline;
  const monthsOver = recent.filter(v => v > baseline / 3).length;   // vs the baseline's monthly pace

  // the round-trip catch: a ramp that slides back can land near its early median (ratio ≈ 1) while genuinely
  // falling — so also judge the slide against the recent peak (2nd-highest of the last 6, so a lone bump isn't it)
  const top = h.slice(-6).slice().sort((a, b) => b - a);
  const peak2 = top.length >= 2 ? top[1] : top[0];
  const last = h[len - 1];

  // A ratio-based DOWNGRADE needs a few baseline windows to compare against; on thin history Joe's rule is
  // "lean stable", not "lean negative". The 3-consecutive-down-months catch stands on its own evidence.
  const canDrop = priorRoll.length >= 3;
  if ((canDrop && (ratio <= 0.5 || (silent && ratio < 0.8))) || (dsteps >= 3 && peak2 > 0 && last <= peak2 * 0.35)) return "at-risk";
  if ((canDrop && ratio <= 0.75) || (dsteps >= 3 && peak2 > 0 && last <= peak2 * 0.55)) return "decelerating";
  if (ratio >= 1.35 && monthsOver >= 2) return "accelerating";  // sustained above baseline, wobble-tolerant
  return "stable";
}

// Is this line's first depletion inside the trailing 90 days (nothing in the 52 weeks before)? Used for the
// NEW sprout on cities and the "new" chip on items, so every level answers the question the same way.
export function isNewLine(monthsOldestFirst) {
  const m = (monthsOldestFirst || []).map(v => Math.max(0, Number(v) || 0));
  const n = m.length; if (!n) return false;
  return sum(m.slice(-3)) > 0 && sum(m.slice(Math.max(0, n - 15), n - 3)) <= 0;
}
