// Builds the deck's data object for whatever scope the drill is showing.
// Everything comes from data the app already has in memory, except one case: a
// non-default timeframe needs per-item monthly history (item_grid only carries
// l90/prev/l52), which the caller fetches via the deck_item_windows RPC and
// passes in as `itemWin` ({ product_key: number[24] oldest-first }).
import { acctHealth } from "./acctHealth.js";
import { autoForecast } from "./forecast.js";
import { SNAP_LABEL, T12_MONTHS, T12_YR } from "./snapshot.js";

const S = a => a.reduce((x, y) => x + y, 0);
const pct = (a, b) => b > 0 ? Math.round((a - b) / b * 100) : (a > 0 ? null : 0);
const clean = s => String(s || "").trim().split(/\s+/).map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(" ").replace(/(?<!['\w])\w/g, c => c.toUpperCase());
const isDraft = r => /BBL|KEG/i.test(String(r.item || "") + " " + String(r.package || ""));
const HL = { accelerating: "Surging", stable: "Stable", new: "New", "at-risk": "At risk", decelerating: "Softening", lapsed: "Lapsed" };
const COL = { Surging: "#2E7D52", Stable: "#8FC0A5", "At risk": "#D08C3C", Softening: "#E0BC5E", Lapsed: "#B5817A", New: "#8CC97F" };
const ORDER = ["Surging", "Stable", "At risk", "Softening", "Lapsed", "New"];

// ---- timeframe: window math + every label the slides need -------------------
// Joe's rules: the timeframe moves VOLUME numbers only. Distribution counts
// (placements, accounts active/carrying) always read the latest 90 days, and
// rate of sale is always computed on the current 90 days — never YTD or L6M.
// Windows index into the 24-month oldest-first arrays (23 = the newest month).
// "yoy" compares the same window one year (12 windows) earlier.
export function tfSpec(tf, thru) {
  const key = (tf && tf.key) || "90D";
  const cmp = key === "YTD" ? "yoy" : ((tf && tf.cmp) || "prev");   // YTD only ever compares to prior year
  // YTD length = calendar months elapsed at the snapshot (July 31 -> 7 windows)
  const snapMonth = (() => { const d = new Date(thru || SNAP_LABEL); const m = d.getMonth(); return Number.isNaN(m) ? 7 : m + 1; })();
  const n = key === "90D" ? 3 : key === "L6M" ? 6 : Math.max(1, Math.min(12, snapMonth));
  const cur = [24 - n, 24];
  const cmpWin = cmp === "prev" ? [24 - 2 * n, 24 - n] : [12 - n, 12];
  const L = {
    "90D": { stat: "90-day cases", col: "90D", winShort: "90 days", winNoun: "last 90 days", period: `90 days ended ${thru || SNAP_LABEL}`,
             prevShort: "prior 90", prevLong: "the prior 90 days", rank: "ranked on the quarter", grew: "grew this quarter", over: "over the quarter" },
    "L6M": { stat: "6-month cases", col: "L6M", winShort: "6 months", winNoun: "last 6 months", period: `6 months ended ${thru || SNAP_LABEL}`,
             prevShort: "prior 6 months", prevLong: "the prior 6 months", rank: "ranked on the 6-month change", grew: "grew over the last 6 months", over: "over the last 6 months" },
    "YTD": { stat: "YTD cases", col: "YTD", winShort: "year to date", winNoun: "year to date", period: `Year to date, through ${thru || SNAP_LABEL}`,
             prevShort: "prior year", prevLong: "the same period last year", rank: "ranked on the year-to-date change", grew: "grew year to date", over: "year to date" },
  }[key];
  const yoy = cmp === "yoy";
  return {
    key, cmp, cur, cmpWin,
    stat: L.stat, col: L.col, winShort: L.winShort, winNoun: L.winNoun, period: L.period,
    cmpShort: yoy ? "prior year" : L.prevShort,
    cmpLong: yoy ? "the same period last year" : L.prevLong,
    cmpNoun: yoy ? "same period last year" : (key === "90D" ? "prior 90 days" : "prior 6 months"),
    rank: L.rank, grew: L.grew, over: L.over,
    newPhrase: yoy ? "new since last year" : "new this quarter",
    zeroCmp: yoy ? "no volume at all in the same period last year" : key === "L6M" ? "no volume at all in the prior 6 months" : "no prior-quarter volume at all",
    hadNone: yoy ? "had no volume at all a year ago" : key === "L6M" ? "had no volume at all six months ago" : "had no volume at all a quarter ago",
    dflt: key === "90D" && cmp === "prev",
  };
}

// the accounts a scope covers — shared with the app so the deck_item_windows
// RPC call and the deck itself can never disagree about who's in the book
export function deckScopeIds(scope, accts) {
  // "custom" carries an explicit id list — the Shareable Report prompt uses it so a deck
  // can follow ANY on-screen combination (city + chain + territory + channel lock)
  if (scope.kind === "custom") {
    const want = new Set(scope.ids || []);
    const seen = new Set();
    for (const a of accts) if (want.has(a.id) && !seen.has(a.id)) seen.add(a.id);
    return [...seen];
  }
  const match = a => scope.kind === "state" ? true
    : scope.kind === "chain" ? String(a.chain || "").toUpperCase() === String(scope.value).toUpperCase()
    : String(a.city || "").toUpperCase() === String(scope.value).toUpperCase();
  const seen = new Set();
  for (const a of accts) if (!seen.has(a.id) && match(a)) seen.add(a.id);
  return [...seen];
}

// scope: { kind:"state"|"city"|"chain", value, name, sub }
export function buildDeck({ scope, accts, acctMo, pgrid, dataThru, tf, thru, itemWin, styleOf }) {
  if (!accts || !acctMo || !pgrid) return null;
  const T = tfSpec(tf, thru);
  const useWin = !T.dflt && itemWin;   // item tables read real windows on any non-default timeframe

  // one entry per account (accts carries a row per label)
  const A = {};
  for (const a of accts) if (!A[a.id]) A[a.id] = a;
  const ids = new Set(deckScopeIds(scope, accts));
  const has = id => ids.has(id);

  const hist = new Array(24).fill(0);
  for (const id of ids) { const m = acctMo[id]; if (!m) continue; for (let i = 0; i < 24; i++) hist[i] += m[i] || 0; }
  // headline volume follows the timeframe; the 52-week and 90-day reads below never move
  const curV = S(hist.slice(...T.cur)), cmpV = S(hist.slice(...T.cmpWin));
  const cur90 = S(hist.slice(-3)), prev90 = S(hist.slice(-6, -3)), l52 = S(hist.slice(12)), p52 = S(hist.slice(0, 12));
  // chains and cities have no managed forecast node, so project deterministically — the same call
  // the drill screen makes for those levels. The 52-week forecast is present at EVERY scope.
  const fc52 = S(autoForecast(hist));

  const accSeries = [], rosSeries = [];
  for (let p = 11; p >= 0; p--) {
    let n = 0, c = 0;
    for (const id of ids) { const m = acctMo[id]; if (!m) continue; const v = S(m.slice(21 - p, 24 - p)); if (v > 0) { n++; c += v; } }
    accSeries.push(n); rosSeries.push(n > 0 ? +(c / n / 3).toFixed(1) : 0);
  }

  const gs = pgrid.filter(r => has(r.account_id));
  const plN = gs.filter(r => (+r.l90 || 0) > 0).length, plP = gs.filter(r => (+r.prev || 0) > 0).length;
  const active = [...ids].filter(id => acctMo[id] && S(acctMo[id].slice(-3)) > 0);
  const activeP = [...ids].filter(id => acctMo[id] && S(acctMo[id].slice(-6, -3)) > 0);
  const withHist = [...ids].filter(id => acctMo[id] && S(acctMo[id]) > 0);

  // STYLES across the whole scope (draft + package together), with a real prior so the
  // brand-story slide can show movement, not just share. Same timeframe rules as brandCut.
  const styleCut = () => {
    const m = {};
    for (const r of gs) {
      // real beer style when the caller supplies the fc_base map, else the portfolio tier
      const k = clean((styleOf && styleOf[r.fg]) || r.sp || "—"); if (!k || k === "—") continue;
      const e = m[k] || (m[k] = { k, cur: 0, prev: 0, acc: new Set(), pks: new Set() });
      if ((+r.l90 || 0) > 0) e.acc.add(r.account_id);
      if (useWin) { if (r.pk) e.pks.add(r.pk); }
      else { e.cur += +r.l90 || 0; e.prev += +r.prev || 0; }
    }
    if (useWin) for (const e of Object.values(m)) for (const pk of e.pks) {
      const w = itemWin[pk]; if (!w) continue;
      e.cur += S(w.slice(...T.cur)); e.prev += S(w.slice(...T.cmpWin));
    }
    const ACR = /\b(ipa|dipa|tipa|xpa|ipl|neipa|ddh|thc)\b/gi;
    const fixAcr = s2 => String(s2).replace(ACR, w => w.toUpperCase());
    return Object.values(m).map(e => ({ k: fixAcr(e.k), cur: Math.round(e.cur), prev: Math.round(e.prev), acc: e.acc.size, pct: pct(e.cur, e.prev) }))
      .filter(e => e.cur > 0 || e.prev > 0).sort((a, b) => b.cur - a.cur);
  };

  const brandCut = draft => {
    // Cases columns follow the timeframe (from itemWin on non-default); the accounts-carrying
    // columns and the l90 field are distribution/ROS inputs and ALWAYS read the latest 90 days.
    const m = {};
    for (const r of gs) {
      if (isDraft(r) !== draft) continue;
      const k = clean(r.brand || r.item);
      const e = m[k] || (m[k] = { n: k, cur: 0, prev: 0, l90: 0, acc: new Set(), accP: new Set(), pks: new Set(), sp: {} });
      e.l90 += +r.l90 || 0;
      if ((+r.l90 || 0) > 0) e.acc.add(r.account_id);
      if ((+r.prev || 0) > 0) e.accP.add(r.account_id);
      if (useWin) { if (r.pk) { e.pks.add(r.pk); e.sp[r.pk] = clean(r.sp || "—"); } }
      else { e.cur += +r.l90 || 0; e.prev += +r.prev || 0; }
    }
    const mix = {}; let mt = 0;
    if (useWin) {
      const spByPk = {};
      for (const e of Object.values(m)) for (const pk of e.pks) {
        const w = itemWin[pk]; if (!w) continue;
        const c = S(w.slice(...T.cur)), p = S(w.slice(...T.cmpWin));
        e.cur += c; e.prev += p;
        if (!(pk in spByPk)) { spByPk[pk] = 1; const sp = e.sp[pk]; if (c > 0) { mix[sp] = (mix[sp] || 0) + c; mt += c; } }
      }
    } else {
      for (const r of gs) { if (isDraft(r) !== draft) continue; const v = +r.l90 || 0; if (v <= 0) continue; const k = clean(r.sp || "—"); mix[k] = (mix[k] || 0) + v; mt += v; }
    }
    const rows = Object.values(m).map(e => ({ n: e.n, cur: Math.round(e.cur), prev: Math.round(e.prev), l90: Math.round(e.l90), acc: e.acc.size, accP: e.accP.size }))
      .filter(e => e.cur > 0 || e.prev > 0).sort((a, b) => b.cur - a.cur);
    const tot = S(rows.map(r => r.cur)), totP = S(rows.map(r => r.prev));
    return { rows: rows.slice(0, 10), all: rows.length, tot, totP, pct: pct(tot, totP),
      mix: Object.entries(mix).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / (mt || 1) * 100).toFixed(1)]) };
  };

  const B = {}; let totL52 = 0;
  for (const id of withHist) {
    const h = HL[acctHealth(acctMo[id])], l = S(acctMo[id].slice(12));
    const e = B[h] || (B[h] = { k: h, n: 0, l52: 0, cur: 0 });
    e.n++; e.l52 += l; e.cur += S(acctMo[id].slice(-3)); totL52 += l;
  }
  const buckets = ORDER.filter(k => B[k]).map(k => ({ ...B[k], l52: Math.round(B[k].l52), cur: Math.round(B[k].cur),
    ros: B[k].n ? +(B[k].cur / B[k].n / 3).toFixed(1) : 0, c: COL[k],
    wt: k === "New" ? Math.round(B[k].cur * 3) : Math.round(B[k].l52), lift: k === "New" }));   // New = its 90-day volume ×3 (canonical), everyone else = trailing 52

  const cut = field => {
    const m = {};
    for (const id of withHist) {
      const a = A[id]; const k = a && a[field] ? clean(a[field]) : "Unclassified";
      const e = m[k] || (m[k] = { k, n: 0, act: 0, cases: 0, l52: 0 });
      e.n++; const c = S(acctMo[id].slice(-3)); e.cases += c; e.l52 += S(acctMo[id].slice(12)); if (c > 0) e.act++;
    }
    return Object.values(m).map(e => ({ ...e, cases: Math.round(e.cases), l52: Math.round(e.l52),
      ros: e.act ? +(e.cases / e.act / 3).toFixed(1) : 0 })).sort((a, b) => b.cases - a.cases);
  };
  const income = cut("income"), types = cut("ctype");

  const PLC = {};
  for (const r of gs) { const e = PLC[r.account_id] || (PLC[r.account_id] = { p: 0, pp: 0 }); if ((+r.l90 || 0) > 0) e.p++; if ((+r.prev || 0) > 0) e.pp++; }
  // movers rank on the TIMEFRAME's volume change; the SKU columns are distribution and stay 90-day
  const mrow = id => { const a = A[id] || {}, p = PLC[id] || { p: 0, pp: 0 }, m = acctMo[id];
    const c = S(m.slice(...T.cur)), v = S(m.slice(...T.cmpWin));
    return { n: clean(a.name || id), city: clean(a.city || ""), cur: Math.round(c), prev: Math.round(v),
      d: Math.round(c - v), plc: p.p, plcP: p.pp, h: HL[acctHealth(m)].toLowerCase() }; };
  const all = withHist.map(mrow);
  const growers = all.filter(r => r.d > 0), decliners = all.filter(r => r.d < 0);
  const upSorted = growers.slice().sort((a, b) => b.d - a.d);
  // an account far larger than the rest flattens the chart — pull it from the LIST, keep it in the totals
  const outlier = upSorted.length > 3 && upSorted[0].d > upSorted[1].d * 2.5 ? upSorted[0] : null;
  const upList = (outlier ? upSorted.slice(1) : upSorted).slice(0, 15);
  const dnList = decliners.slice().sort((a, b) => a.d - b.d).slice(0, 15);

  const lap = [];
  for (const id of withHist) {
    if (acctHealth(acctMo[id]) !== "lapsed") continue;
    const a = A[id] || {}, m = acctMo[id]; let q = 0;
    for (let i = 23; i >= 0; i--) { if (m[i] > 0) { q = 23 - i; break; } }
    lap.push({ n: clean(a.name || id), city: clean(a.city || ""), ct: clean(a.ctype || ""),
      life: Math.round(S(m)), l52: Math.round(S(m.slice(12))), q,
      sku: gs.filter(r => r.account_id === id && (+r.l52 || 0) > 0).length });
  }
  lap.sort((x, y) => y.life - x.life);
  const lapLife = S(lap.map(r => r.life));
  const qBands = [["3–6 months", 3, 6, "#8B3A2B"], ["6–9 months", 6, 9, "#B5817A"], ["9–12 months", 9, 12, "#CFA9A3"], ["12 months +", 12, 99, "#E3CBC6"]]
    .map(([k, lo, hi, c]) => { const gp = lap.filter(r => r.q >= lo && r.q < hi); return { k, n: gp.length, v: S(gp.map(r => r.life)), c }; });
  const lapChan = (() => { const m = {}; for (const r of lap) { const e = m[r.ct] || (m[r.ct] = { k: r.ct, n: 0, v: 0 }); e.n++; e.v += r.life; }
    return Object.values(m).sort((a, b) => b.v - a.v); })();

  return {
    scope, dataThru: dataThru || T.period, hist, tfMeta: T,
    months: T12_MONTHS, yr: T12_YR,   // trailing-12 axis derived from lib/snapshot.js
    // the deck's headline volume — reads whatever timeframe was chosen (fields keep their
    // original names because every slide consumes them; ros/l52/etc. below never move)
    cur90: Math.round(curV), prev90: Math.round(cmpV), casesPct: pct(curV, cmpV),
    l52: Math.round(l52), p52: Math.round(p52), l52Pct: pct(l52, p52),
    fc52: Math.round(fc52), fcPct: pct(fc52, l52),
    accts: active.length, acctsP: activeP.length, acctsPct: pct(active.length, activeP.length),
    withHist: withHist.length, plN, plP, plcPct: pct(plN, plP),
    ros: active.length ? +(cur90 / active.length / 3).toFixed(1) : 0,
    rosPrev: activeP.length ? +(prev90 / activeP.length / 3).toFixed(1) : 0,
    accSeries, rosSeries,
    draft: brandCut(true), pkg: brandCut(false), styles: styleCut(),
    buckets, totL52: Math.round(totL52), income, types,
    upList, dnList, outlier, growN: growers.length, growC: Math.round(S(growers.map(r => r.d))),
    declN: decliners.length, declC: Math.round(S(decliners.map(r => r.d))),
    lapsed: lap.slice(0, 12), lapN: lap.length, lapLife: Math.round(lapLife),
    lapL52: Math.round(S(lap.map(r => r.l52))), qBands, lapChan,
    // raw material a SCOPE FILTER re-measures from — see cutOf() below
    rows: gs, itemWin: itemWin || null, styleOf: styleOf || null,
  };
}

/* ---- SCOPE FILTER: the same slide, measured on one slice of the book ----------
   "In a slide right now it's total brand. Can I make it just IPAs?" (Joe, 2026-08-18).
   A cut narrows WHAT IS MEASURED, never which accounts: same territory, same window,
   only the rows that match. It is per-slide, so it is applied at render time rather
   than baked into the deck — one deck, any number of differently-cut slides.

   WHAT A CUT CAN AND CANNOT DRIVE, and exactly why. Everything is rebuilt from two
   things the deck already carries:
     • rows    — one per account × item, with brand / style / package and l90, prev, l52.
                 Placements, accounts carrying, rate of sale and the 90-day read come
                 straight off these.
     • itemWin — 24 months of cases per PRODUCT across the scope. That is what lets the
                 cases graph, the 52-week pair and the forecast follow a cut.
   Neither carries months per ACCOUNT for a slice, so the accounts-over-time graph
   cannot be cut — itemWin has no account dimension. A cut therefore reports
   accSeries: null, and the Overview drops that graph rather than let it keep drawing
   the whole book under a headline that says IPA. Adding account_id to the
   deck_item_windows group-by is the one change that would lift this.                */
export const CUT_DIMS = [["style", "Style"], ["brand", "Brand"], ["package", "Draft / package"]];
const ACR2 = /\b(ipa|dipa|tipa|xpa|ipl|neipa|ddh|thc)\b/gi;
const fixAcr2 = s => String(s).replace(ACR2, w => w.toUpperCase());
const cutKey = (r, dim, styleOf) => fixAcr2(
  dim === "brand" ? clean(r.brand || r.item)
  : dim === "package" ? (isDraft(r) ? "Draft" : "Package")
  : clean((styleOf && styleOf[r.fg]) || r.sp || "—"));

// every value you could cut on in this deck, biggest first — what the editor offers
export function cutValues(D, dim) {
  if (!D || !D.rows) return [];
  const m = {};
  for (const r of D.rows) {
    const k = cutKey(r, dim, D.styleOf); if (!k || k === "—") continue;
    (m[k] || (m[k] = { k, v: 0 })).v += +r.l90 || 0;
  }
  return Object.values(m).filter(e => e.v > 0).sort((a, b) => b.v - a.v).map(e => e.k);
}

export function cutOf(D, cut) {
  if (!D || !cut || !cut.dim || !cut.value || !D.rows) return null;
  const rows = D.rows.filter(r => cutKey(r, cut.dim, D.styleOf) === cut.value);
  if (!rows.length) return null;
  const acc = new Set(), accP = new Set(), had = new Set(), pks = new Set();
  let cur = 0, prv = 0;
  for (const r of rows) {
    cur += +r.l90 || 0; prv += +r.prev || 0;
    if ((+r.l90 || 0) > 0) acc.add(r.account_id);
    if ((+r.prev || 0) > 0) accP.add(r.account_id);
    if ((+r.l52 || 0) > 0) had.add(r.account_id);
    if (r.pk) pks.add(r.pk);
  }
  // months exist per PRODUCT only, so the series is available exactly when itemWin is.
  // No window data means NO graph — never the uncut series wearing a cut headline.
  let hist = null, l52 = 0, p52 = 0, fc52 = 0;
  if (D.itemWin) {
    const h = new Array(24).fill(0);
    for (const pk of pks) { const w = D.itemWin[pk]; if (!w) continue; for (let i = 0; i < 24; i++) h[i] += w[i] || 0; }
    if (S(h) > 0) { hist = h; l52 = S(h.slice(12)); p52 = S(h.slice(0, 12)); fc52 = S(autoForecast(h)); }
  }
  const plN = rows.filter(r => (+r.l90 || 0) > 0).length, plP = rows.filter(r => (+r.prev || 0) > 0).length;
  return {
    ...D,
    cut: { dim: cut.dim, value: cut.value },
    hist, canGraph: !!hist,
    cur90: Math.round(cur), prev90: Math.round(prv), casesPct: pct(cur, prv),
    accts: acc.size, acctsP: accP.size, acctsPct: pct(acc.size, accP.size), withHist: had.size,
    plN, plP, plcPct: pct(plN, plP),
    ros: acc.size ? +(cur / acc.size / 3).toFixed(1) : 0,
    rosPrev: accP.size ? +(prv / accP.size / 3).toFixed(1) : 0,
    l52: Math.round(hist ? l52 : 0), p52: Math.round(p52), l52Pct: hist ? pct(l52, p52) : null,
    fc52: Math.round(fc52), fcPct: hist ? pct(fc52, l52) : null,
    accSeries: null, rosSeries: null,
  };
}

/* MONTH x GROUP, STACKED (Joe, 2026-08-19 — recreated from a stacked-column screenshot).
   Months exist per PRODUCT only (see itemWin above), so a stacked monthly series is available
   exactly when itemWin is, and never otherwise — the same discipline as the accounts-over-time
   graph. Every product sells under one key, so summing each product's own 24-month line into
   its group is exact, not apportioned. Anything past the band cut rolls into one honest
   "Other" rather than quietly vanishing out of the total.                                   */
export function stackSeries(D, dim, maxBands = 4, span = 12) {
  if (!D || !D.rows || !D.itemWin) return null;
  const N = Math.max(3, Math.min(12, +span || 12));
  const pkOf = {};
  for (const r of D.rows) if (r.pk) pkOf[r.pk] = cutKey(r, dim, D.styleOf);
  const m = {};
  for (const pk of Object.keys(pkOf)) {
    const w = D.itemWin[pk], k = pkOf[pk];
    if (!w || !k || k === "—") continue;
    const a = m[k] || (m[k] = new Array(12).fill(0));
    for (let i = 0; i < 12; i++) a[i] += +w[12 + i] || 0;      // trailing 12 of the 24
  }
  let bands = Object.keys(m).map(k => ({ k, v: m[k], tot: m[k].reduce((x, y) => x + y, 0) }))
    .filter(b => b.tot > 0).sort((a, b) => b.tot - a.tot);
  if (!bands.length) return null;
  const cap = Math.max(2, Math.min(6, +maxBands || 4));
  if (bands.length > cap) {
    const rest = bands.slice(cap), o = new Array(12).fill(0);
    for (const b of rest) for (let i = 0; i < 12; i++) o[i] += b.v[i];
    bands = bands.slice(0, cap).concat([{ k: `Other · ${rest.length}`, v: o, tot: o.reduce((x, y) => x + y, 0), other: true }]);
  }
  const off = 12 - N;
  bands = bands.map(b => ({ ...b, v: b.v.slice(off), tot: b.v.slice(off).reduce((x, y) => x + y, 0) }));
  const months = (D.months || []).slice(off);
  const totals = months.map((_, i) => bands.reduce((t, b) => t + b.v[i], 0));
  return { months, bands, totals, max: Math.max(...totals, 1), span: N, dim };
}
