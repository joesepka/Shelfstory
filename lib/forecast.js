// ShelfCast forecast engine — deterministic, no AI. Built to show its work.
//
// Per leaf (state×channel×item): forecast = a BLEND of three cheap methods —
// damped robust trend, recent run-rate, YoY-growth — each weighted by how well
// it did in a BACKTEST (hold out the last 6 months, score each method). The
// blend's backtest error is the cell's CONFIDENCE (±%). A RANGE (low/base/high)
// widens with that error and the cell's volatility. CHAOS wobble is scaled to the
// cell's real bumpiness. Trend fit is ROBUST (Theil-Sen + top-winsorize) so a
// single load-in month can't run away with it.
//
// Overrides (manual ▲▼) and the focus LENS apply top-down, so leaf numbers
// already include every ancestor adjustment and groups equal the sum of children.

export const HORIZON = 12, HISTORY = 6, BACKTEST = 6;
const COLLAPSE = 0.4;   // recent quarter below 40% of the book's own norm = a collapse to hedge + flag
export const DEFAULTS = { phi: 0.9, seasonal: false };
export const FOCUS_LIFT = 0.15, SOFT_LIFT = -0.12;

// full state names — one source of truth (the design rule is full names, never codes)
export const STATE_NAMES = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming" };
export const stateName = c => STATE_NAMES[c] || c;

// Assumptions layer — trajectory archetypes. Each shapes ONLY the later months;
// the near-term (first `start` months, default 2) rides the baseline trend, so the
// algorithm owns the next quarter and the human's assumption phases in after that.
export const ARCHETYPES = ["maintain", "flat", "plateau", "explosive", "gdecline", "sharp", "hump"];
export const ARCH_LABEL = { maintain: "Maintain baseline", flat: "Hold flat", plateau: "Grow, then plateau", explosive: "Explosive", gdecline: "Gradual decline", sharp: "Sharp decline / exit", hump: "Grow, then fade" };
export const ARCH_DIR = { maintain: 0, flat: 0, plateau: 1, explosive: 1, gdecline: -1, sharp: -1, hump: 1 };
export const MAG = { mild: 0.08, moderate: 0.18, aggressive: 0.35, exit: 0.9 };

const sum = a => a.reduce((s, x) => s + x, 0);
const mean = a => (a.length ? sum(a) / a.length : 0);
const std = a => (a.length < 2 ? 0 : Math.sqrt(mean(a.map(x => (x - mean(a)) ** 2))));
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const fsum = sum;

function rng(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// symmetric MAPE in [0,2] — robust to zeros
function smape(a, p) { let s = 0, n = 0; for (let i = 0; i < a.length; i++) { const d = (Math.abs(a[i]) + Math.abs(p[i])) / 2; if (d > 0) { s += Math.abs(a[i] - p[i]) / d; n++; } } return n ? s / n : 0; }
// cap only the high side (load-in spikes) at median + 3·MAD
function winsorTop(h) { const nz = h.filter(x => x > 0); if (nz.length < 4) return h.slice(); const med = median(nz); const mad = median(nz.map(x => Math.abs(x - med))) * 1.4826 || med * 0.5; const cap = med + 3 * mad; return h.map(x => (x > cap ? cap : x)); }
// Theil-Sen robust slope/intercept
function theilSen(y) { const n = y.length, sl = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) sl.push((y[j] - y[i]) / (j - i)); const b = median(sl); return { b, a: median(y.map((v, t) => v - b * t)) }; }
const dampedSum = (phi, k) => { let s = 0; for (let i = 1; i <= k; i++) s += Math.pow(phi, i); return s; };

// ---- the three methods (train series -> H-month forecast) ------------------
function mDamped(h, H, phi) { const w = winsorTop(h), { a, b } = theilSen(w), level = a + b * (h.length - 1); const out = []; for (let k = 1; k <= H; k++) out.push(Math.max(0, level + b * dampedSum(phi, k))); return out; }
function mRun(h, H) { const l3 = h.slice(-3).filter(x => x > 0), r = l3.length ? mean(l3) : (mean(h.filter(x => x > 0)) || 0); return new Array(H).fill(Math.max(0, r)); }
function mYoY(h, H) { const n = h.length; if (n < 24) return mRun(h, H); const last12 = sum(h.slice(n - 12)), prior12 = sum(h.slice(n - 24, n - 12)); if (prior12 <= 0) return mRun(h, H); const g = clamp(last12 / prior12 - 1, -0.5, 0.4), base = last12 / 12; const out = []; for (let k = 1; k <= H; k++) out.push(Math.max(0, base * Math.pow(1 + g, k / 12))); return out; }

function chaosify(base, key, cv) { const amp = Math.min(0.4, cv) * 0.7, r = rng(key); return base.map(v => Math.max(0, v * (1 + amp * (r() * 2 - 1)))); }
// the shared 12-month wiggle every leaf rides (mean 1) — the SAME wiggle for all leaves, so
// parent rows stay pleasantly bumpy after summing instead of the noise cancelling out
const TEXG = (() => { const r = rng("shelfstory-texture"), f = Array.from({ length: 12 }, () => 1 + 0.05 * (r() * 2 - 1)); const m = f.reduce((x, y) => x + y, 0) / 12; return f.map(x => x / m); })();

// Blend + backtest + range. The baseline depends only on a cell's history (not
// on overrides/focus), so cache it by key — dragging a slider then only re-applies
// the cheap override factor instead of re-backtesting every leaf each tick.
const _blendCache = new Map();
function blendLeaf(history, key, opts) {
  const hit = _blendCache.get(key); if (hit) return hit;
  const res = _blend(history, key, opts); _blendCache.set(key, res); return res;
}
// Returns { forecast(bumpy), half(band ±), conf(±frac), cv, weights }.
function _blend(history, key, { phi }) {
  // Both of Joe's guardrails live HERE — the shared choke point — so the managed
  // /forecast tree and the app's simulated slices can never disagree again.
  // 1) 90 quiet days -> zero forecast. A dead line projects nothing; win-backs
  //    only enter when shaped in deliberately. (Was autoForecast-only, which is
  //    how lapsed draft groups kept flat phantom forecasts on the forecast page.)
  if (history.slice(-3).reduce((s, v) => s + (v || 0), 0) <= 0) {
    const z = new Array(HORIZON).fill(0);
    return { forecast: z, base: z.slice(), half: z.slice(), conf: 0.9, cv: 0.1, weights: [0, 0, 0] };
  }
  // 2) One hot month is not a trend (the Hopleaf rule): a current-quarter spike
  //    carrying >2x the rest of the half-year holds the 6-month average flat.
  {
    const l6 = history.slice(-6).map(v => v || 0), spike = Math.max(...l6);
    if (spike > 0 && l6.lastIndexOf(spike) >= 3 && l6.reduce((a, b) => a + b, 0) - spike <= spike * 0.5) {
      const lvl = l6.reduce((a, b) => a + b, 0) / 6, f = new Array(HORIZON).fill(lvl);
      return { forecast: f, base: f.slice(), half: f.map(v => v * 0.35), conf: 0.5, cv: 0.25, weights: [0, 1, 0] };
    }
  }
  const nz = history.filter(x => x > 0).length;
  const series = history.filter(x => x > 0);
  const cv = series.length ? clamp(std(series) / (mean(series) || 1), 0.02, 0.5) : 0.3;
  if (nz < 6) {                                   // thin history: hold flat, wide band
    const base = mRun(history, HORIZON);
    return { forecast: base, base, half: base.map((v, k) => v * 0.4 * (0.6 + 0.5 * (k + 1) / HORIZON)), conf: 0.4, cv, weights: [0, 1, 0] };
  }
  const M = [(h, H) => mDamped(h, H, phi), (h, H) => mRun(h, H), (h, H) => mYoY(h, H)];
  const hw = winsorTop(history);                  // tame load-in spikes for the point methods
  const K = Math.min(BACKTEST, Math.max(2, history.length - 12));
  const train = hw.slice(0, history.length - K), test = history.slice(history.length - K); // score vs RAW actuals
  const errs = M.map(m => { try { return smape(test, m(train, K)); } catch { return 1; } });
  // mYoY falls back to run-rate when train < 24mo (always the case here), so its backtest score
  // just mirrors run-rate — zero its weight when unvalidated so run-rate isn't double-counted.
  const yoyValid = train.length >= 24;
  const w = errs.map((e, i) => (i === 2 && !yoyValid ? 0 : 1 / (e * e + 0.02))), ws = sum(w) || 1, wn = w.map(x => x / ws);
  const conf = Math.min(1, errs.reduce((s, e, i) => s + wn[i] * e, 0));   // user-facing ± never exceeds 100%
  // LEVEL: anchor at the recent run-rate (last 3 months, INCLUDING zeros) — the "now". A book
  // that fell off recently anchors low, not on an optimistic long-trend extrapolation.
  const anchor = Math.max(0, mean(hw.slice(-3)));
  // TRAJECTORY: evaluate the 90D / 6M / 52W trends, MOST RECENT FIRST. A recent pitch (up or
  // down) dominates the long trend, so a book falling off recently forecasts down even if the
  // full year looked good — keeping the forecast on the same "90-day-first" read as tree health.
  // Recency-weighted GROWTH RATE across the three horizons — period-over-period (so they're
  // comparable regardless of level), most-recent heaviest. This is the 12-month growth the
  // recent trend implies; the low recent anchor already pulls a fallen book below last year.
  const gr = (r, p) => p > 0 ? clamp((r - p) / p, -0.6, 0.4) : 0;   // cooled upside (was 0.8)
  const wG = clamp(0.5 * gr(sum(hw.slice(-3)), sum(hw.slice(-6, -3)))       // 90D vs prior 90D
                 + 0.3 * gr(sum(hw.slice(-6)), sum(hw.slice(-12, -6)))      // 6M vs prior 6M
                 + 0.2 * gr(sum(hw.slice(-12)), sum(hw.slice(-24, -12))),   // 52W vs prior 52W
                 -0.6, 0.7);
  const denom = dampedSum(phi, HORIZON) || 1;
  let base = Array.from({ length: HORIZON }, (_, k) => Math.max(0, anchor * (1 + wG * dampedSum(phi, k + 1) / denom)));
  // HEDGE TOTAL COLLAPSE: when the recent quarter has fallen far below the book's own norm, don't
  // confidently extrapolate — neither a death-spiral to zero nor a bounce back up. Hold a cautious
  // level so the view can ask "is this collapsing?" and let the human decide.
  const histLvl = mean(hw.slice(0, Math.max(1, hw.length - 3)).filter(x => x > 0)) || anchor;
  const collapsing = nz >= 6 && histLvl > 0 && anchor < histLvl * COLLAPSE;
  const dead = histLvl > 0 && anchor < histLvl * 0.06;   // recent quarter essentially zero = gone dark
  if (dead) base = base.map(() => 0);                     // gone dark → no forecast (don't hedge a corpse back up)
  else if (collapsing) { const hedge = Math.max(anchor, histLvl * 0.35); base = base.map(() => hedge); }
  // TEXTURE: a whisper of month-to-month bumpiness so lines feel real, not drafted. The shared
  // TEXG wiggle rides every leaf (parents inherit it) plus a tiny per-key wobble; seeded, so it
  // never dances between renders, and renormalized so each leaf's 12-month TOTAL — and therefore
  // every trend, delta, and target — is untouched. Hedged / gone-dark lines stay deliberately flat.
  if (!dead && !collapsing) {
    const r = rng(key + "|tex"), ampI = clamp(0.02 + 0.08 * cv, 0.025, 0.06);
    const tex = base.map((v, k) => Math.max(0, v * TEXG[k % TEXG.length] * (1 + ampI * (r() * 2 - 1))));
    const s0 = sum(base), s1 = sum(tex);
    if (s0 > 0 && s1 > 0) base = tex.map(v => v * s0 / s1);
  }
  // Half-band width: backtest-weighted sMAPE (conf) already embeds volatility; widen it on a collapse.
  const half = base.map((v, k) => Math.max(0, v * Math.min(0.95, (collapsing ? 1.6 : 1) * (conf + 0.25 * cv) * (0.55 + 0.55 * (k + 1) / HORIZON))));
  return { forecast: base, base, half, conf, cv, weights: wn, collapsing };
}

// The "auto algo" as a standalone: the same deterministic baseline blend used for managed
// forecast leaves, applied to ANY 24-mo history. For slices with no forecast node (distributors,
// chains, and rows below state>channel) — a READ-ONLY simulated forecast. Returns the 12-mo points.
export function autoForecast(history, key = "auto") {
  if (!history || history.length < 24) return new Array(HORIZON).fill(0);
  // Joe's rule: nothing sold in the last 90 days -> nothing forecast. A place that has gone
  // quiet still has months of history behind it, and the blend would happily project off that
  // — which is how a city with 0 cases and a 0 headline projection still drew forecast bars.
  // The floor lives here so the number, the graph and the deck can't disagree.
  if (history.slice(-3).reduce((s, v) => s + (v || 0), 0) <= 0) return new Array(HORIZON).fill(0);
  // One hot month is not a trend. When the biggest month of the last half-year carries more
  // than 2x everything else in that half-year combined, the blend's run-rate anchor would ride
  // the spike (The Hopleaf: [0,0,0,7,0,34] projected 248 against 44 trailing). Hold the recent
  // average flat instead — the forecast matches the last 6 months, and only repeat orders,
  // never a single spike, can raise it. Steady ramps (each month building on the last) don't
  // trip this, so genuine trends still project as trends.
  const l6 = history.slice(-6).map(v => v || 0), spike = Math.max(...l6);
  // ...and only when the spike sits in the CURRENT quarter. An old spike at the head of a
  // fading history is the opposite case — there the blend's own decline is the honest read,
  // and flattening to the average would quietly raise a falling forecast.
  if (spike > 0 && l6.lastIndexOf(spike) >= 3 && sum(l6) - spike <= spike * 0.5) return new Array(HORIZON).fill(sum(l6) / 6);
  return _blend(history, key, { phi: DEFAULTS.phi }).forecast;
}

// "Is this collapsing?" — the recent quarter has fallen far below the book's own norm.
// Same test the forecast uses to hedge; exported so the forecast view can flag it.
function collapseTest(history) {
  const hw = winsorTop(history), nz = hw.filter(x => x > 0).length;
  if (nz < 6) return false;
  const r3 = hw.slice(-3).filter(x => x > 0), anchor = r3.length ? mean(r3) : 0;
  const histLvl = mean(hw.slice(0, Math.max(1, hw.length - 3)).filter(x => x > 0)) || 0;
  return histLvl > 0 && anchor < histLvl * COLLAPSE;
}
export const isCollapsing = collapseTest;

// Winsorized 90D / 6M / 52W volume signals from a 24-month history — the SAME load-in-tamed
// view the forecast trajectory uses, so tree health and the forecast can't disagree just because
// one saw a load-in spike and the other didn't. Returns the window sums (so aggregates like a
// distributor can allocate them by share) plus the period-over-period growth rates.
export function volSignals(history) {
  if (!history || history.length < 24) return { r3: 0, p3: 0, r6: 0, p6: 0, r12: 0, p12: 0, g90: null, g6: null, yoy: null, nz: 0, launch: false, spiked: false };
  const hw = winsorTop(history);
  const r3 = sum(hw.slice(-3)), p3 = sum(hw.slice(-6, -3)), r6 = sum(hw.slice(-6)), p6 = sum(hw.slice(-12, -6)), r12 = sum(hw.slice(-12)), p12 = sum(hw.slice(0, 12));
  const gr = (r, p) => (p > 0 ? (r - p) / p : null);
  const nz = history.filter(x => x > 0).length;
  let first = history.findIndex(x => x > 0); if (first < 0) first = history.length;
  const launch = nz > 0 && first >= history.length - 5;          // first sale within ~5 months = launching
  let spiked = false;                                            // a load-in spike winsorized down in the last ~6 months
  for (let i = Math.max(0, history.length - 6); i < history.length; i++) if ((history[i] || 0) > (hw[i] || 0) * 1.1 + 1) spiked = true;
  return { r3, p3, r6, p6, r12, p12, g90: gr(r3, p3), g6: gr(r6, p6), yoy: gr(r12, p12), nz, launch, spiked };
}

// ---- tree ------------------------------------------------------------------
function nNode(kind, key, label, extra) { return { kind, key, label, history: new Array(24).fill(0), children: new Map(), forecast: null, half: null, conf: 0, ...extra }; }
// generic N-level tree from a hierarchy spec (each level: {kind, frag(r), label(r), extra(r)}); keys are cumulative "frag|frag|…"
function buildTreeH(rows, H) {
  const root = nNode("root", "ROOT", "All");
  for (const r of rows) {
    const cases = Number(r.cases) || 0, pos = 23 - Number(r.window_index);
    if (!(pos >= 0 && pos < 24)) continue;
    root.history[pos] += cases;
    let node = root, key = "";
    for (const lvl of H) {
      const frag = lvl.frag(r); key = key ? key + "|" + frag : frag;
      let ch = node.children.get(key);
      if (!ch) { ch = nNode(lvl.kind, key, lvl.label(r) || "—", lvl.extra ? lvl.extra(r) : {}); node.children.set(key, ch); }
      ch.history[pos] += cases; node = ch;
    }
  }
  return root;
}
function buildTree(rows, hierarchy) {
  if (hierarchy) return buildTreeH(rows, hierarchy);
  const root = nNode("root", "ROOT", "All");
  for (const r of rows) {
    const cases = Number(r.cases) || 0, pos = 23 - Number(r.window_index), st = r.state || "—", ch = r.channel_type || "—";
    if (!(pos >= 0 && pos < 24)) continue;   // guard: an out-of-range window_index would NaN the whole branch
    const sk = `S:${st}`, ik = `${sk}|I:${r.product_key}`, ck = `${ik}|C:${ch}`;     // State > Item > Channel(leaf)
    let s = root.children.get(sk); if (!s) { s = nNode("state", sk, st, { state: st }); root.children.set(sk, s); }
    let it = s.children.get(ik); if (!it) { it = nNode("item", ik, r.item_name, { state: st, product_key: r.product_key, item_name: r.item_name }); s.children.set(ik, it); }
    let c = it.children.get(ck); if (!c) { c = nNode("leaf", ck, ch, { state: st, product_key: r.product_key, item_name: r.item_name, channel: ch }); it.children.set(ck, c); }
    root.history[pos] += cases; s.history[pos] += cases; it.history[pos] += cases; c.history[pos] += cases;
  }
  return root;
}
function channelShares(root) {
  const out = {};
  for (const s of root.children.values()) {
    const byCh = {};
    for (const it of s.children.values()) for (const lf of it.children.values()) byCh[lf.channel] = (byCh[lf.channel] || 0) + sum(lf.history.slice(12));
    const tot = sum(Object.values(byCh)) || 1;
    out[s.state] = {}; for (const ch in byCh) out[s.state][ch] = byCh[ch] / tot;
  }
  return out;
}
const rampFc = (runRate, share, launch, ramp) => { const fc = []; for (let h = 1; h <= HORIZON; h++) { const into = h - 1 - (launch || 0); fc.push(runRate * share * (into < 0 ? 0 : Math.min(1, (into + 1) / Math.max(1, ramp)))); } return fc; };
function getItem(root, st, ik, pk, name) {
  const sk = `S:${st}`; let s = root.children.get(sk); if (!s) { s = nNode("state", sk, st, { state: st }); root.children.set(sk, s); }
  let it = s.children.get(ik); if (!it) { it = nNode("item", ik, name, { state: st, product_key: pk, item_name: name }); s.children.set(ik, it); }
  return it;
}
// Two kinds of injected forecast (both = planned volume, no history, a ramp):
//   'new'       = a brand-new item, spread across each state's channel mix.
//   'placement' = an EXISTING item entering specific state×channels it's not in
//                 yet (whitespace). Skips combos that already have actuals.
function injectInnovations(root, innovations) {
  if (!innovations || !innovations.length) return;
  const shares = channelShares(root);
  const allStates = [...root.children.keys()].map(k => k.slice(2));
  const allChannels = [...new Set([...root.children.values()].flatMap(s => [...s.children.values()].flatMap(it => [...it.children.values()].map(c => c.channel))))];
  for (const inv of innovations) {
    const states = inv.states === "all" || !inv.states ? allStates : inv.states, ramp = Math.max(1, inv.ramp || 3);
    if (inv.kind === "placement") {
      const channels = inv.channels && inv.channels.length ? inv.channels : allChannels;
      for (const st of states) {
        const it = getItem(root, st, `S:${st}|I:${inv.productKey}`, inv.productKey, inv.itemName);
        const gaps = channels.filter(ch => !it.children.has(`${it.key}|C:${ch}`));   // only combos with no actuals
        for (const ch of gaps) {
          const ck = `${it.key}|C:${ch}`;
          it.children.set(ck, nNode("leaf", ck, ch, { state: st, product_key: inv.productKey, item_name: inv.itemName, channel: ch, isNew: true, isGap: true, fc: rampFc(inv.runRate, 1 / gaps.length, inv.launch, ramp) }));
        }
      }
    } else {
      for (const st of states) {
        const mix = shares[st] && Object.keys(shares[st]).length ? shares[st] : Object.fromEntries(allChannels.map(c => [c, 1 / allChannels.length]));
        const it = getItem(root, st, `S:${st}|I:NEW:${inv.id}`, `NEW:${inv.id}`, inv.name);
        for (const ch in mix) { const shareV = mix[ch]; if (shareV <= 0) continue; const ck = `${it.key}|C:${ch}`; it.children.set(ck, nNode("leaf", ck, ch, { state: st, product_key: `NEW:${inv.id}`, item_name: inv.name, channel: ch, isNew: true, fc: rampFc(inv.runRate, shareV, inv.launch, ramp) })); }
      }
    }
  }
}

// ---- compute (top-down factors) --------------------------------------------
// glide from 1 toward (1+target) linearly across the [start, end] month window,
// then hold. target = -1 zeroes the line out by `end`. Outside the window it holds.
function ovFactor(ov, h) {
  if (!ov || !ov.target) return 1;
  const start = ov.start || 0, end = ov.end != null ? ov.end : HORIZON, m = h + 1;
  const frac = m <= start ? 0 : m >= end ? 1 : (m - start) / Math.max(1, end - start);
  return Math.max(0, 1 + ov.target * frac);
}
// Assumptions → a 12-month multiplier on the baseline. Flat before `start` (the
// baseline owns the near term), then the archetype phases in. `magnitude` is the
// fractional pull by the end/peak. "flat" divides out the baseline's own drift, so
// it needs the node's baseline trajectory.
function assumptionVector(a, baseline) {
  const H = HORIZON, f = new Array(H).fill(1);
  if (!a || !a.archetype || a.archetype === "maintain") return f;
  const start = clamp(a.start != null ? a.start : 2, 0, H - 1);
  const peak = clamp(a.peak != null ? a.peak : Math.round((start + H) / 2), start + 1, H - 1);
  const M = a.magnitude != null ? a.magnitude : 0.18;
  const easeOut = t => 1 - (1 - t) * (1 - t);
  for (let h = 0; h < H; h++) {
    if (h < start) continue;                          // near-term: ride the baseline
    const t = clamp((h - start) / Math.max(1, (H - 1) - start), 0, 1);
    const tp = clamp((h - start) / Math.max(1, peak - start), 0, 1);
    let v = 1;
    switch (a.archetype) {
      case "flat": { const bs = baseline && baseline[start] > 0 ? baseline[start] : 1; v = baseline && baseline[h] > 0 ? bs / baseline[h] : 1; break; }
      case "plateau": v = 1 + M * easeOut(tp); break;                         // ease up, hold after peak
      case "explosive": v = 1 + M * Math.pow(t, 1.8); break;                  // accelerating (hockey stick)
      case "climb": v = 1 + M * t; break;                                     // straight, steady linear growth
      case "creep": v = 1 + M * 0.45 * t; break;                              // slow, gentle lift
      case "gdecline": v = 1 - M * Math.pow(t, 1.05); break;                  // gentle down
      case "sharp": v = 1 - M * easeOut(clamp(t * 1.8, 0, 1)); break;         // fast down / exit
      case "dstab": v = 1 - M * 0.75 * easeOut(clamp(t * 1.5, 0, 1)); break;  // drop, then hold steady
      case "hump": v = h <= peak ? 1 + M * easeOut(tp) : 1 + M * (0.2 + 0.8 * (1 - clamp((h - peak) / Math.max(1, (H - 1) - peak), 0, 1))); break;
      default: v = 1;
    }
    f[h] = Math.max(0, v);
  }
  return f;
}
// Pure-baseline trajectory per node (no overrides/assumptions), bottom-up. Cheap:
// leaf baselines are cached. Used so group-level "flat" can flatten its own trend.
function baselinePass(n, opts) {
  if (n.children.size === 0) { n.baseline = (n.isNew ? n.fc : blendLeaf(n.history, n.key, opts).base).slice(); }
  else { const b = new Array(HORIZON).fill(0); for (const c of n.children.values()) { baselinePass(c, opts); for (let h = 0; h < HORIZON; h++) b[h] += c.baseline[h]; } n.baseline = b; }
  return n.baseline;
}
function scaleSubtree(n, k) {   // multiply a node and all its descendants' forecast/band by k (keeps groups = sum of children)
  if (n.forecast) n.forecast = n.forecast.map(v => v * k);
  if (n.half) n.half = n.half.map(v => v * k);
  for (const c of n.children.values()) scaleSubtree(c, k);
}
function compute(n, overrides, lens, assumptions, opts, pf) {
  const av = assumptionVector(assumptions[n.key], n.baseline);
  const eff = Array.from({ length: HORIZON }, (_, h) => (pf ? pf[h] : 1) * ovFactor(overrides[n.key], h) * ovFactor(lens[n.key], h) * av[h]);
  if (n.children.size === 0) {
    const r = n.isNew ? { forecast: n.fc, half: n.fc.map(v => v * 0.45), conf: 0.45, cv: 0.2 } : blendLeaf(n.history, n.key, opts);
    // live-placement gate (opts.leafAdjust): 0 = no live placements anywhere, kill the line;
    // <1 = distribution shrank, damp the projection to match what's actually on shelves
    const la = typeof opts.leafAdjust === "function" ? (opts.leafAdjust(n) ?? 1) : 1;
    n.forecast = r.forecast.map((v, h) => Math.max(0, v * eff[h] * la));
    n.half = r.half.map((v, h) => v * eff[h] * la); n.conf = r.conf; n.cv = r.cv; n.collapsing = !!r.collapsing;
  } else {
    const f = new Array(HORIZON).fill(0), hh = new Array(HORIZON).fill(0); let cw = 0, cs = 0;
    for (const ch of n.children.values()) { compute(ch, overrides, lens, assumptions, opts, eff); for (let h = 0; h < HORIZON; h++) { f[h] += ch.forecast[h]; hh[h] += ch.half[h] ** 2; } const w = sum(ch.forecast); cw += ch.conf * w; cs += w; }
    n.forecast = f; n.half = hh.map(Math.sqrt); n.conf = cs > 0 ? cw / cs : 0; n.collapsing = collapseTest(n.history);
    // ENTITY-LEVEL RECONCILIATION — tie the summed forecast back to where the entity as a WHOLE is heading
    // (survivors over-extrapolate while churned leaves drop to zero, so the leaf-sum can drift optimistic).
    // Joe's rules: a gone-dark book forecasts ~0; a genuinely declining book forecasts BELOW its last L52.
    if (n.kind !== "root" && !overrides[n.key] && !lens[n.key]) {
      const h = n.history, L52 = sum(h.slice(12));
      const rq = sum(h.slice(-3)), avgQ = (sum(h.slice(-12)) || sum(h)) / 4, live = avgQ > 0 ? rq / avgQ : (rq > 0 ? 1 : 0);
      const hw = winsorTop(h), q1 = sum(hw.slice(-6, -3)), y0 = sum(hw.slice(0, 12));
      const g90 = q1 > 0 ? (sum(hw.slice(-3)) - q1) / q1 : 0, yoy = y0 > 0 ? (sum(hw.slice(12)) - y0) / y0 : 0;
      let cap = null;
      if (live < 0.12) cap = 0;                                                  // gone dark → no forecast
      else if (g90 < -0.05 && yoy < 0.05) cap = L52 * (1 + Math.max(-0.6, g90 * 0.6));  // declining → below L52, floored (hedge, not death-spiral)
      const fc = sum(n.forecast);
      if (cap != null && fc > cap) scaleSubtree(n, fc > 0 ? cap / fc : 0);
    }
  }
}

// ---- public ----------------------------------------------------------------
export function run(rows, overrides = {}, innovations = [], lens = {}, anchorMult = 1, opts = {}, assumptions = {}) {
  _blendCache.clear();   // fresh per run(): the cache is keyed by node key only and ignores the history arg, so refreshed actuals or a switched scenario must not hand back a stale forecast. Intra-run reuse (baselinePass → compute) still holds — that's the case the cache was built for.
  const o = { ...DEFAULTS, ...opts };
  const root = buildTree(rows, opts.hierarchy);
  injectInnovations(root, innovations);
  baselinePass(root, o);
  compute(root, overrides, lens, assumptions, o, new Array(HORIZON).fill(anchorMult));
  return { root };
}
export function flatLeaves(root) { const out = []; (function walk(n) { n.children.size === 0 && n.kind !== "root" ? out.push(n) : [...n.children.values()].forEach(walk); })(root); return out; }
export function findNode(root, key) { let hit = null; (function walk(n) { if (hit) return; if (n.key === key) { hit = n; return; } [...n.children.values()].forEach(walk); })(root); return hit; }

export function forecastLabels(rows) {
  let newest = null; for (const r of rows) if (r.window_index === 0 && r.period_end) { newest = r.period_end; break; }
  const base = newest ? new Date(newest) : new Date(), out = [];
  for (let h = 1; h <= HORIZON; h++) { const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + h, 1)); out.push(d.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })); }
  return out;
}
export function historyLabels(rows, n = HISTORY) {
  let newest = null; for (const r of rows) if (r.window_index === 0 && r.period_end) { newest = r.period_end; break; }
  const base = newest ? new Date(newest) : new Date(), out = [];
  for (let k = n - 1; k >= 0; k--) { const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - k, 1)); out.push(d.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })); }
  return out;
}
export function itemList(rows) { const m = new Map(); for (const r of rows) if (!m.has(r.product_key)) m.set(r.product_key, r.item_name); return [...m.entries()].map(([key, name]) => ({ key, name })).sort((a, b) => String(a.name).localeCompare(String(b.name))); }
export function stateList(rows) { return [...new Set(rows.map(r => r.state).filter(Boolean))].sort(); }

// recent-change signal for ranking the review queue: last-3 vs prior-3
export function recentChange(history) { const l3 = mean(history.slice(21)), p3 = mean(history.slice(18, 21)); return p3 > 0 ? (l3 - p3) / p3 : 0; }
