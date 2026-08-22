"use client";
// THE account card — the desktop's AccountDetail, now shared by the mobile app verbatim:
// header, headline stats, the bucket-aware pre-call brief, the rolling-90 bars, on-the-shelf,
// dropped, whitespace. One component, one methodology, both apps. ($ + news retired.)
import { useEffect, useState } from "react";
import { rules, HOUSE_PARENT, ALT_PARENT } from "../lib/profile";
import { supabase } from "../lib/supabase";
import TreeGlyph from "./TreeGlyph";
import SellStory from "./SellStory";
import { greenBar } from "../lib/utils";
import { acctHealth } from "../lib/acctHealth";
import { SNAPSHOT as SNAP, windowEndLabel } from "../lib/snapshot";
const profitPerCase = () => 1;   // $ retired on mobile — the dollar fields degrade to pure velocity ranking

const SNAPSHOT = SNAP;
const HEAD = {
  "Accelerating": { bg: "var(--growing-bg)", fg: "var(--growing-ink)", bc: "var(--accent)" },
  "Stable": { bg: "var(--stable-bg)", fg: "var(--stable-ink)", bc: "var(--text-3)" },
  "Decelerating": { bg: "var(--watch-bg)", fg: "var(--watch-ink)", bc: "var(--pop-warm)" },
  "At-Risk": { bg: "var(--atrisk-bg)", fg: "var(--atrisk-ink)", bc: "var(--pop-warm)" },
  "New": { bg: "var(--new-bg)", fg: "var(--new-ink)", bc: "var(--pop-cool)" },
  "Lapsed": { bg: "#8B3A2B", fg: "#fff", bc: "var(--pop-warm)" },
};
const SK = {
  growth: ["var(--growing-bg)", "var(--growing-ink)", "accelerating"],
  decline: ["var(--watch-bg)", "var(--watch-ink)", "softening"],
  stable: ["transparent", "var(--text-2)", "steady"],
  lost_recent: ["var(--atrisk-bg)", "var(--atrisk-ink)", "lost"],
};
const titleCase = s => !s ? "" : s.toLowerCase().replace(/(?<!['\w])\w/g, c => c.toUpperCase());
const agoDays = w => { if (w == null) return null; const win = Math.max(0, Math.round((w - 2) / 4.345)); return win <= 0 ? "<30d" : `${win * 30}d+`; };   // last_sale_w is synthetic (windowIdx*4.345+2) — translate to window-true days

// same per-word Title-Case cleaner the breakdown uses — apply to every item name shown
const cleanName = s => String(s || "").trim().split(/\s+/).map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(" ") || "—";
const isDraft = name => /\bbbl\b|keg|\/\s*\d\s*bbl/i.test(String(name || ""));   // draft/keg SKU → never pitch at off-premise
// strip the trailing format so different keg sizes / pack formats of the SAME beer collapse to one (Booter 1/2bbl == Booter 1/6bbl)
const baseName = s => String(s || "").replace(/\s*\d+\s*\/\s*\d+\s*(bbl|pk\s*\/\s*\d+\s*oz).*$/i, "").trim().toUpperCase();
const STNAME = { IL: "Illinois", OH: "Ohio", MI: "Michigan", MO: "Missouri", IA: "Iowa", MN: "Minnesota", WI: "Wisconsin", IN: "Indiana" };
function median(arr) { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
const round5 = n => Math.round(n / 5) * 5;
function monthLabel(monthsAgo) { const d = new Date(SNAPSHOT.getFullYear(), SNAPSHOT.getMonth() - monthsAgo, 1); return d.toLocaleString("en-US", { month: "short" }); }
// Joe's rule (2026-08-17): speak in ACTUAL ORDERS. Depletion numbers arrive as case-
// equivalents, so keg SKUs must convert to real keg counts before display — one half is
// 6.889 CE, a sixtel 2.296, a quarter 3.444. Nobody ordered "6.9 halfs"; they ordered 1.
// Month cells round to whole kegs (whole=true); rates keep one decimal under 10.
// Package SKUs' depletions are already cases and stay untouched.
const KEG_CE = (p) => p.includes("SIXTEL") ? 2.296 : (p.includes("QUARTER") || p.includes("QTR")) ? 3.444 : (p.includes("HALF") || p.includes("KEG") || p.includes("BBL")) ? 6.889 : 0;
function packMo(l90, pkg, whole) {
  const p = String(pkg || "").toUpperCase();
  const ce = KEG_CE(p);
  const mo = ((Number(l90) || 0) / 3) / (ce || 1);
  const n = whole ? Math.max(1, Math.round(mo)) : mo >= 10 ? Math.round(mo) : Math.round(mo * 10) / 10;
  const unit =
    p.includes("SIXTEL") ? (n === 1 ? "sixtel" : "sixtels") :
    p.includes("HALF") ? (n === 1 ? "half" : "halfs") :
    (p.includes("QUARTER") || p.includes("QTR")) ? (n === 1 ? "quarter" : "quarters") :
    ce ? (n === 1 ? "keg" : "kegs") : "cs";
  return { n, unit };
}
// Collapse the style_parent field into display buckets — all IPA variants (HAZY IPA, IPA, DIPA…) become one "IPA" (Joe's rule).
function styleGroup(sp) {
  const s = String(sp || "").toUpperCase();
  if (s.includes("IPA")) return "IPA";
  if (s.includes("LAGER") || s.includes("ALE") || s.includes("PILS")) return "Lager / Ale";
  if (s.includes("THC")) return "THC";   // profile-literal-ok — style taxonomy / display grouping only — never decides a row's label
  if (s.includes("SELTZER") || s.includes("SPARKLING")) return "Seltzer";
  return titleCase(sp || "Other");
}
const STYLE_COL = { "IPA": "#2f9d63", "Lager / Ale": "#c79a2e", "Seltzer": "#5f97c4", "THC": "#7d6bc0" };   // profile-literal-ok — style taxonomy / display grouping only — never decides a row's label

function buildBriefing(acc, b, items, white, liveSet, mktAll) {
  const chan = titleCase(acc.channel), pct = acc.prior90_pct || 0;
  const growing = items.filter(i => i.cell_state === "growth").sort((a, b) => (b.l90 || 0) - (a.l90 || 0));
  const lost = items.filter(i => i.cell_state === "lost_recent");
  const active = items.filter(i => (i.l90 || 0) > 0);
  const totalL90 = active.reduce((s, i) => s + (i.l90 || 0), 0);
  let lead = "";
  if (b && b.pct_overall != null && b.pct_overall <= 15) { lead += `Top ${b.pct_overall}% account overall`; if (b.pct_channel != null) lead += ` (top ${b.pct_channel}% in ${chan})`; lead += ". "; }
  const trendWord = acc.headline === "Accelerating" ? `heating up — L90 volume up ${Math.abs(pct)}% vs the prior quarter`
    : acc.headline === "At-Risk" ? `at risk — L90 down ${Math.abs(pct)}% and shedding placements`
    : acc.headline === "Decelerating" ? `cooling — L90 down ${Math.abs(pct)}% from the prior quarter`
    : acc.headline === "Stable" ? "holding steady quarter over quarter"
    : acc.headline === "New" ? "a new account still ramping"
    : acc.headline === "Lapsed" ? "gone quiet — no orders in the last 90 days"
    : `tracking ${pct >= 0 ? "up" : "down"} ${Math.abs(pct)}%`;
  lead += `It's ${trendWord}.`;
  const signals = [];
  if (acc.prev90 > 0 && acc.live_prev > 0 && acc.live_placements > 0) {
    const rosNow = acc.cur90 / acc.live_placements, rosPrev = acc.prev90 / acc.live_prev;
    const rosD = Math.round((100 * (rosNow - rosPrev)) / rosPrev), plcD = Math.round((100 * (acc.live_placements - acc.live_prev)) / acc.live_prev);
    if (Math.abs(rosD) >= 4 || Math.abs(plcD) >= 4) {
      if (rosD >= 4 && plcD <= 2) signals.push({ k: "up", t: `Velocity-led: each placement is moving ${rosD}% more than last quarter — rate of sale, not new placements.` });
      else if (plcD >= 4 && rosD <= 2) signals.push({ k: "opp", t: `Distribution-led: ${plcD}% more placements but rate of sale is flat — velocity upside still banked.` });
      else if (plcD <= -4 && rosD >= -2) signals.push({ k: "warn", t: `Losing placements (${plcD}%) faster than volume — a distribution problem, not velocity. Win the placements back.` });
      else if (rosD <= -4) signals.push({ k: "warn", t: `Rate of sale is the drag — same placements moving ${Math.abs(rosD)}% less. A velocity fix, not distribution.` });
    }
  }
  if (Array.isArray(acc.spark) && acc.spark.length >= 4) {
    const sp = acc.spark.map(Number), newest = sp[sp.length - 1], trail = sp.slice(-4, -1), trailAvg = trail.reduce((s, x) => s + x, 0) / trail.length;
    if (trailAvg > 0) {
      const mo = Math.round((100 * (newest - trailAvg)) / trailAvg);
      if (mo <= -8 && acc.headline !== "At-Risk" && acc.headline !== "Decelerating" && acc.headline !== "Lapsed") signals.push({ k: "warn", t: `Early warning: the last 30 days ran ${Math.abs(mo)}% below its 3-month pace — softening before the quarter trend shows it.` });
      else if (mo >= 12 && acc.headline !== "Accelerating") signals.push({ k: "up", t: `Quietly accelerating: the last 30 days ran ${mo}% above its 3-month pace.` });
    }
  }
  if (totalL90 > 0 && active.length >= 2) {
    const top = active.slice().sort((a, b) => (b.l90 || 0) - (a.l90 || 0))[0], share = Math.round((100 * (top.l90 || 0)) / totalL90);
    if (share >= 45) signals.push({ k: "warn", t: `Concentrated: ${share}% of volume rides on ${top.item_name} — protect that facing above all.` });
  }
  if (acc.gapWindows != null && acc.gapWindows >= 2 && acc.headline !== "Lapsed") signals.push({ k: "warn", t: `Due for a reorder — ~${acc.gapWindows * 30} days since the last one.` });
  if (b && b.chan_med_sk != null && acc.live_placements != null) { const gapSk = b.chan_med_sk - acc.live_placements; if (gapSk >= 2) signals.push({ k: "opp", t: `Room in the set: ${acc.live_placements} SKUs vs the ${chan} median of ${b.chan_med_sk} — ${gapSk} slots of headroom.` }); }
  const moves = [];
  // Slot rule (Joe, 2026-08-13): placements count item-by-item, but ADVICE reasons in forecast-
  // group slots. A live item in the same slot (exact group for packaged; any keg size on draft)
  // means the facing is filled — don't ask to win back or sell in against it.
  const filledSlots = new Set(active.map(i => i.slot_key).filter(Boolean));
  // only recommend winning back a SKU that's still being sold somewhere in the last 90 days (skip discontinued one-offs)
  const lostLive = lost.filter(l => (!liveSet || liveSet.has(l.product_key)) && !(l.slot_key && filledSlots.has(l.slot_key)));
  if (lostLive.length) {
    const it0 = lostLive[0], draft0 = isDraft(it0.package);
    const peers0 = active.filter(i => isDraft(i.package) === draft0);
    const avgMo = peers0.length ? Math.round((peers0.reduce((s2, i) => s2 + (i.l90 || 0), 0) / peers0.length / 3) * 10) / 10 : 0;
    moves.push(`Win back ${it0.item_name}${avgMo > 0 ? ` — ~${avgMo.toLocaleString()} ${draft0 ? "kegs" : "cs"}/mo at this account's typical ${draft0 ? "draft" : "package"} rate` : ""}.`);
  }
  if (growing.length) moves.push(`Ride ${growing.slice(0, 2).map(i => i.item_name).join(" and ")} — already accelerating; lock the reorder.`);
  const whiteOpen = white.filter(w => !(w.slot_key && filledSlots.has(w.slot_key)));
  if (whiteOpen.length) {
    const w0 = whiteOpen[0];
    // Rotating tiers (limited/seasonal/collab/...) pitch the GROUP — the specific liquid may be
    // discontinued, the slot is what's real. Core brands are evergreen: name them outright.
    const TIERS = ["LIMITED", "SEASONAL", "COLLAB", "HOUSE", "SELTZER", "THC"];   // profile-literal-ok — style taxonomy / display grouping only — never decides a row's label
    const slot = String(w0.slot_key || "");
    const isDraftSlot = slot.startsWith("DRAFT ");
    const parts = (isDraftSlot ? slot.slice(6) : slot).split(" ").filter(Boolean);
    const tIdx = parts.findIndex(p => TIERS.includes(p));
    if (tIdx >= 0) {
      const group = titleCase(parts.slice(tIdx).join(" "));
      const pack = isDraftSlot ? "on draft" : parts.slice(0, tIdx).join(" ").toLowerCase();
      const gVol = Math.round((mktAll || []).filter(m => m.slot_key === slot).reduce((t, m) => t + (+m.market_l90 || 0), 0));
      moves.push(`Sell in a ${group}${pack ? " " + pack : ""} — the group does ${gVol.toLocaleString()} cs/90d across the market; no facing here.`);
    } else {
      moves.push(`Sell in ${w0.item_name} — #${w0.market_rank} in the market, not carried here.`);
    }
  }
  return { lead: lead.trim(), signals: signals.slice(0, 3), moves: moves.slice(0, 3) };
}

const TREND_GREY = "#d3d7db";
function hexMix(a, b, t) { const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; const A = p(a), B = p(b); return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, "0")).join(""); }
function hexA(hex, a) { const h = String(hex || "#2f8f5e").replace("#", ""); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16); return `rgba(${r},${g},${b},${a})`; }
function healthColor(hd) {
  switch (String(hd || "").toLowerCase()) {
    case "accelerating": return "#2f8f5e";
    case "new": return "#7bc49a";
    case "decelerating": case "at-risk": case "atrisk": case "at risk": return "#e0b32e";
    case "lapsed": return "#8B3A2B";
    default: return "#b8bcc2";
  }
}
function skuColor(state) {
  switch (String(state || "").toLowerCase()) {
    case "growth": return "#2f8f5e";
    case "decline": return "#c99a3f";
    case "lost_recent": return "#c0564e";
    default: return "#8a8f88";
  }
}
// rolling-90 LINE (trailing 3-month sum, 12 months) with reorder points (each real delivery / depletion) dotted on the line.
// `series` = { line:[12 chrono], dots:[12 chrono raw monthly deliveries] }. Account total by default; a hovered SKU swaps in.
function LineTrend({ series, label, color }) {
  const line = series.line, dots = series.dots, n = line.length;
  const hc = color || "#8a8f88";
  const W = 620, H = 158, padL = 34, padR = 14, padT = 18, padB = 26;
  const top = Math.max(...line, 1);
  const X = i => padL + (i / (n - 1)) * (W - padL - padR), Y = v => padT + (1 - v / top) * (H - padT - padB), base = H - padB;
  const pts = line.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const area = `${X(0).toFixed(1)},${base} ${pts} ${X(n - 1).toFixed(1)},${base}`;
  const yTicks = [0, Math.round(top / 2), top], last = line[n - 1];
  const maxDel = Math.max(...dots, 1);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 2px 4px", gap: 8 }}>
        <div style={{ fontSize: 11, color: "var(--text-3)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>rolling-90 cases · <strong style={{ color: "var(--text-2)", fontWeight: 600 }}>{label}</strong> · last 12 months</div>
        <div style={{ fontSize: 10, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}><span style={{ width: 7, height: 7, borderRadius: 9, background: hc, display: "inline-block" }} /> reorder</div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="rolling-90 cases with reorder points">
        {yTicks.map((t, i) => (<g key={i}><line x1={padL} y1={Y(t)} x2={W - padR} y2={Y(t)} stroke="var(--border)" strokeWidth="0.5" /><text x={padL - 6} y={Y(t) + 3} textAnchor="end" fontSize="10" fill="var(--text-3)">{t}</text></g>))}
        <polygon points={area} fill={hc} opacity="0.08" style={{ transition: "all .25s ease" }} />
        <polyline points={pts} fill="none" stroke={hc} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" style={{ transition: "all .25s ease" }} />
        {line.map((v, i) => dots[i] > 0 ? <circle key={i} cx={X(i)} cy={Y(v)} r={(2.6 + 2 * (dots[i] / maxDel)).toFixed(1)} fill={hc} stroke="#fff" strokeWidth="1.4"><title>{`${monthLabel(11 - i)}: reorder of ${Math.round(dots[i])} cs`}</title></circle> : null)}
        <text x={X(n - 1)} y={Y(last) - 9} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">{last}</text>
        {line.map((v, i) => <text key={i} x={X(i)} y={H - 8} textAnchor="middle" fontSize="8.5" fill="var(--text-3)">{monthLabel(11 - i)}</text>)}
      </svg>
    </div>
  );
}
function moveColor(m) { const s = String(m || "").toLowerCase(); if (s.startsWith("win back")) return "#b0573a"; if (s.startsWith("ride")) return "#4a9068"; if (s.startsWith("sell in")) return "#3d6e93"; return "#4a9068"; }

const shell = { position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "6px 30px 0", fontFamily: "var(--font-sans)", overflow: "hidden" };
const backBtn = { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px 6px 9px", borderRadius: 999, border: "1px solid rgba(90,100,80,.16)", background: "rgba(255,255,255,.4)", color: "var(--text)", cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit" };

export default function AccountDetail({ accountId, skin = "classic", onBack, embedded = false, parents = null, hlOverride = null }) {
  const id = accountId;
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [hoverSku, setHoverSku] = useState(null);   // hovered on-shelf/dropped row → subtle highlight
  const [shelfOpen, setShelfOpen] = useState(false); // on-the-shelf shows top 5 until expanded
  const [cardSku, setCardSku] = useState(null);     // clicked item → quick detail card overlay

  useEffect(() => {
    (async () => {
      try {
        const [accRes, benRes, itemRes, mktRes, depRes] = await Promise.all([
          supabase.from("account_list").select("*").eq("account_id", id).maybeSingle(),
          supabase.from("account_benchmark").select("*").eq("account_id", id).maybeSingle(),
          supabase.from("item_grid").select("product_key, item_name, brand, l90, l90_prev, cell_state, last_sale_w, package, parent, style_parent, slot_key, is_new_item").eq("account_id", id),
          supabase.from("item_market").select("product_key, item_name, market_rank, market_l90, slot_key").order("market_rank"),
          supabase.from("depletions_window").select("product_key, window_index, cases").eq("account_id", id).lte("window_index", 20),
        ]);
        if (accRes.error) throw accRes.error;
        const acc = accRes.data;
        if (!acc) { setErr("Account not found."); return; }
        // LABEL FILTER (Joe 2026-08-11): when one label is selected the WHOLE card is that label — items, stats,
        // graph and status. One view, one truth; no more BC-slice health printed beside whole-account numbers.
        const single = parents && parents.length === 1 ? parents[0] : null;
        const ALT_STYLES = (rules.altParentStyles || []).map(x => String(x).toUpperCase());
        /* TRUST THE ROW (Joe, 2026-08-20). This returned one of two hardcoded labels and was
           then compared against the SELECTED label, so for any client whose labels are not
           "BLIND CORNER"/"TORCH" it matched zero rows -- unconditionally, whatever the database
           held. The card then filtered itself to nothing: empty item list, every depletion row
           discarded, an 18-zero trend line, and acctHealth re-stamping the account "Lapsed"
           with 0 cases. It never threw, so it read as missing data rather than a bug. */
        const labOf = i => (ALT_STYLES.length && ALT_STYLES.some(t => String(i.style_parent || "").toUpperCase().includes(t)))
          ? ALT_PARENT
          : (String(i.parent || "").toUpperCase() || HOUSE_PARENT);
        const allItems = (itemRes.data || []).map(r => ({ ...r, item_name: cleanName(r.item_name) }));   // clean every name, always
        const items = single ? allItems.filter(i => labOf(i) === single) : allItems;
        const okPk = single ? new Set(items.map(i => i.product_key)) : null;
        const liveSet = new Set((mktRes.data || []).filter(m => (Number(m.market_l90) || 0) > 0).map(m => m.product_key));   // still selling in the last 90 days
        // rolling-90 series (per SKU + account total) from the monthly depletion windows, for the trend line + reorder dots
        const byPkM = {}, totM = {};
        for (const r of (depRes.data || [])) { const pk = r.product_key; if (okPk && !okPk.has(pk)) continue; const wi = r.window_index, c = Number(r.cases) || 0; (byPkM[pk] || (byPkM[pk] = {}))[wi] = c; totM[wi] = (totM[wi] || 0) + c; }
        const roll90 = m => { const line = [], dots = []; for (let k = 17; k >= 0; k--) { line.push((m[k] || 0) + (m[k + 1] || 0) + (m[k + 2] || 0)); dots.push(m[k] || 0); } return { line, dots }; };   // 18 months
        const dep = { tot: roll90(totM), byPk: {} };
        for (const pk in byPkM) dep.byPk[pk] = roll90(byPkM[pk]);
        // JOE'S RULE #2 (2026-08-10): the status must be BUMP-AWARE and trend-confirmed — one big month is not a
        // decline (or a surge). Re-derive the headline from the monthly line via the shared classifier; the
        // pipeline's 90-vs-90 headline stays in headline_raw. A single-label view judges that label's volume only.
        {
          const acctMonths = [];
          for (let w = 23; w >= 0; w--) { let s = 0; for (const pk in byPkM) s += byPkM[pk][w] || 0; acctMonths.push(s); }
          const hl2 = acctHealth(acctMonths);
          const H2 = { new: "New", accelerating: "Accelerating", stable: "Stable", decelerating: "Decelerating", "at-risk": "At-Risk", lapsed: "Lapsed" }[hl2];
          acc.headline_raw = acc.headline;
          if (H2) acc.headline = H2;
          // windows are the source of truth for the 90-day numbers too (account_list aggregates have drifted —
          // seen at Binny's Irving Park: cur90=7 while the windows total ~13); label-filtered when one label is selected
          const curW = Math.max(0, acctMonths.slice(-3).reduce((s, v) => s + v, 0));
          const prevW = Math.max(0, acctMonths.slice(-6, -3).reduce((s, v) => s + v, 0));
          acc.cur90_raw = acc.cur90; acc.prev90_raw = acc.prev90;
          acc.cur90 = Math.round(curW); acc.prev90 = Math.round(prevW);
          acc.prior90_pct = prevW > 0 ? Math.round(((curW - prevW) / prevW) * 100) : null;
          // RECENCY from the windows themselves — last_order_w is synthetic (windowIdx*4+2, min 2),
          // never real weeks. gapWindows = 30-day windows since the last non-zero month (0 = ordered
          // within the current window); null when the 24-month history has no order at all.
          let gapW = null;
          for (let i = acctMonths.length - 1, g = 0; i >= 0; i--, g++) { if (acctMonths[i] > 0) { gapW = g; break; } }
          acc.gapWindows = gapW;
        }
        // JOE'S RULE: distribution is lost ONLY when the rolling 90 days hit zero. Derive each item's l90 (and
        // therefore live/dropped) from the actual depletion windows — item_grid's precomputed l90/cell_state can
        // drift (seen: a row marked lost_recent with an order 6 weeks ago). The windows are the source of truth.
        const healed = items.map(i => {
          const d = dep.byPk[i.product_key];
          const dl = d ? d.line[d.line.length - 1] : null;          // trailing-90 cases from the windows
          const dp = d ? d.line[d.line.length - 4] : null;          // prior-90 cases from the windows
          const l90 = dl != null ? dl : (i.l90 || 0);
          const l90_prev = dp != null ? dp : (i.l90_prev || 0);
          const cell_state = l90 > 0 ? (i.cell_state === "lost_recent" ? "stable" : i.cell_state) : "lost_recent";
          return { ...i, l90, l90_prev, cell_state };
        });
        // ON-SHELF / placements counts from the HEALED items, not the pipeline's live_placements/live_prev —
        // the item list shown below is healed from the windows, so the headline counts must count that same list.
        acc.live_placements_raw = acc.live_placements; acc.live_prev_raw = acc.live_prev;
        acc.live_placements = healed.filter(i => (i.l90 || 0) > 0).length;
        acc.live_prev = healed.filter(i => (Number(i.l90_prev) || 0) > 0).length;
        const carried = new Set(healed.map(i => i.product_key));
        const mktAll = mktRes.data || [];
        const white = mktAll.filter(m => !carried.has(m.product_key)).slice(0, 10).map(m => ({ ...m, item_name: cleanName(m.item_name) }));
        const onP = String(acc.channel || "").toUpperCase().startsWith("ON");
        let cohort = [], cf = 0;
        while (true) {
          const { data: cd, error: ce } = await supabase.from("account_list").select("account_id, live_placements, channel_type, state, account_weight, city, prior90_pct, cur90").ilike("channel", onP ? "ON%" : "OFF%").range(cf, cf + 4999);
          if (ce) throw ce;
          cohort = cohort.concat(cd || []);
          if (!cd || cd.length < 5000) break;
          cf += 5000;
        }
        let areaAvgMoReal = null, wsReal = [], penetration = null, peerAvgGrowth = null, peerAvgSku = null;
        try {
          const chT = acc.channel_type;
          let peers = cohort.filter(a => a.account_id !== acc.account_id && (!chT || a.channel_type === chT) && a.city === acc.city);
          if (peers.length < 8) peers = cohort.filter(a => a.account_id !== acc.account_id && (!chT || a.channel_type === chT) && a.state === acc.state);
          const peerIds = peers.slice(0, 360).map(a => a.account_id);
          let pItems = [];
          for (let i = 0; i < peerIds.length; i += 150) { const { data: pd } = await supabase.from("item_grid").select("account_id, product_key, item_name, l90, package, parent, style_parent, slot_key").in("account_id", peerIds.slice(i, i + 150)); pItems = pItems.concat(pd || []); }
          // Slot grammar (Joe, 2026-08-13): a rotating-tier liquid may be discontinued, so whitespace
          // never pitches one by name — it pitches the GROUP ("Hazy IPA Limited 4pk/16oz"), pooled
          // across every liquid in the slot. Core brands are evergreen and stay named. And a slot
          // this account already has live is never pitched at all, core or not.
          const TIERW = ["LIMITED", "SEASONAL", "COLLAB", "HOUSE", "SELTZER", "THC"];   // profile-literal-ok — style taxonomy / display grouping only — never decides a row's label
          const slotParts = (slot) => { const d = String(slot || "").startsWith("DRAFT "); const parts = String(slot || "").slice(d ? 6 : 0).split(" ").filter(Boolean); const ti = parts.findIndex(p => TIERW.includes(p)); return { d, parts, ti }; };
          const fixCaps = t => titleCase(t).replace(/\bIpa\b/g, "IPA").replace(/\bDipa\b/g, "DIPA").replace(/\bTipa\b/g, "TIPA").replace(/\bThc\b/g, "THC");   // profile-literal-ok — style taxonomy / display grouping only — never decides a row's label
          const slotLabel = (slot) => { const { d, parts, ti } = slotParts(slot); if (ti < 0) return null; const style = parts.slice(ti + 1).join(" "); const pack = d ? "draft" : parts.slice(0, ti).join(" ").toLowerCase().replace(/ /g, "/"); return `${fixCaps(style)} ${fixCaps(parts[ti])} ${pack}`; };
          const liveSlots = new Set(healed.filter(x => (x.l90 || 0) > 0).map(x => x.slot_key).filter(Boolean));
          const byProd = {}, bySlot = {}, byAcct = {}, carrying = new Set();
          for (const r of pItems) { if ((r.l90 || 0) > 0) {
            byAcct[r.account_id] = (byAcct[r.account_id] || 0) + ((r.l90 || 0) / 3) * profitPerCase(r.item_name, 0.30); carrying.add(r.account_id);
            const rotating = slotParts(r.slot_key).ti >= 0;
            if (rotating) { const g = bySlot[r.slot_key] || (bySlot[r.slot_key] = { rep: r.item_name, pkg: r.package, par: String(r.parent || "").toUpperCase(), sp: String(r.style_parent || "").toUpperCase(), sums: {} }); g.sums[r.account_id] = (g.sums[r.account_id] || 0) + (r.l90 || 0) / 3; }
            else { (byProd[r.product_key] || (byProd[r.product_key] = { name: r.item_name, pkg: r.package, par: String(r.parent || "").toUpperCase(), sp: String(r.style_parent || "").toUpperCase(), slot: r.slot_key, vals: [] })).vals.push((r.l90 || 0) / 3); }
          } }
          const acctProfits = Object.values(byAcct);
          areaAvgMoReal = acctProfits.length ? median(acctProfits) : null;
          const carriedSet = new Set(healed.map(i => i.product_key));
          const coreCand = Object.entries(byProd).filter(([pk, o]) => !carriedSet.has(pk) && !(o.slot && liveSlots.has(o.slot))).map(([pk, o]) => { const vel = median(o.vals); const lab = (ALT_STYLES.length && ALT_STYLES.some(t => String(o.sp || "").toUpperCase().includes(t)))
              ? ALT_PARENT : (String(o.par || "").toUpperCase() || HOUSE_PARENT); return { pk, name: cleanName(o.name), rep: o.name, pkg: o.pkg, par: lab, vel: Math.round(vel * 10) / 10, carriers: o.vals.length, dollars: vel * profitPerCase(o.name, 0.30), draft: isDraft(o.name), base: baseName(o.name) }; });
          const grpCand = Object.entries(bySlot).filter(([slot]) => !liveSlots.has(slot)).map(([slot, g]) => { const perAcct = Object.values(g.sums); const vel = median(perAcct); const lab = (ALT_STYLES.length && ALT_STYLES.some(t => String(g.sp || "").toUpperCase().includes(t)))
              ? ALT_PARENT : (String(g.par || "").toUpperCase() || HOUSE_PARENT); return { pk: slot, name: slotLabel(slot) || cleanName(g.rep), rep: g.rep, pkg: g.pkg, par: lab, vel: Math.round(vel * 10) / 10, carriers: perAcct.length, dollars: vel * profitPerCase(g.rep, 0.30), draft: String(slot).startsWith("DRAFT "), base: slot, group: true }; });
          const wsCand = [...coreCand, ...grpCand]
            .filter(w => onP || !w.draft)                                                            // off-premise drops kegs first
            .filter(w => !parents || !parents.length || parents.includes(w.par));                    // only recommend labels the user selected — THC-style items count as TORCH even where the item master says otherwise
          const wsBest = new Map();   // one pick per beer/slot — collapse keg sizes / pack formats, keep the strongest
          for (const w of wsCand) { const cur = wsBest.get(w.base); if (!cur || w.dollars > cur.dollars) wsBest.set(w.base, w); }
          wsReal = [...wsBest.values()].sort((a, b) => b.dollars - a.dollars).slice(0, 8);
          penetration = { carry: carrying.size, total: peers.length };
          peerAvgGrowth = peers.length ? peers.reduce((s, a) => s + (a.prior90_pct || 0), 0) / peers.length : null;
          peerAvgSku = peers.length ? Math.round(peers.reduce((s, a) => s + (a.live_placements || 0), 0) / peers.length) : null;   // avg assortment size in the area
        } catch { }
        // ---- per-product 90-day trend in this ZIP (all channels), to annotate the whitespace picks ----
        let zipTrend = {}, zipScope = null;
        try {
          let ids = [], byZip = !!acc.zip;
          if (acc.zip) { let zf = 0; while (true) { const { data: zd } = await supabase.from("account_list").select("account_id").eq("zip", acc.zip).range(zf, zf + 999); ids = ids.concat((zd || []).map(a => a.account_id)); if (!zd || zd.length < 1000) break; zf += 1000; } }
          if (ids.length < 5 && acc.city) { byZip = false; ids = []; let cf = 0; while (true) { const { data: cd } = await supabase.from("account_list").select("account_id").eq("city", acc.city).range(cf, cf + 4999); ids = ids.concat((cd || []).map(a => a.account_id)); if (!cd || cd.length < 5000) break; cf += 5000; } }
          if (ids.length) {
            let zItems = [];
            for (let i = 0; i < ids.length; i += 150) { const { data: zi } = await supabase.from("item_grid").select("product_key, l90, l90_prev").in("account_id", ids.slice(i, i + 150)); zItems = zItems.concat(zi || []); }
            const pAgg = {};
            for (const r of zItems) { const cur = Number(r.l90) || 0, prev = Number(r.l90_prev) || 0; if (cur <= 0 && prev <= 0) continue; const pa = pAgg[r.product_key] || (pAgg[r.product_key] = { cur: 0, prev: 0 }); pa.cur += cur; pa.prev += prev; }
            for (const pk in pAgg) { const p = pAgg[pk]; if (p.prev >= 2) zipTrend[pk] = Math.round((p.cur / p.prev - 1) * 100); }
            zipScope = byZip ? acc.zip : titleCase(acc.city || "");
          }
        } catch { }
        const accountMoEff = healed.reduce((s, i) => s + ((i.l90 || 0) / 3) * profitPerCase(i.item_name, 0.30), 0);
        const sizeRatio = (areaAvgMoReal > 0 && accountMoEff > 0) ? Math.max(0.1, Math.min(3, accountMoEff / areaAvgMoReal)) : 1;
        const wsScaled = wsReal.map(w => { const vel = Math.max(1, Math.round(w.vel * sizeRatio * 10) / 10); return { ...w, velRaw: w.vel, vel, dollars: vel * profitPerCase(w.rep || w.name, 0.30) }; });
        setD({ acc, bench: benRes.data, items: healed, white, mktAll, cohort, onP, areaAvgMoReal, wsReal: wsScaled, penetration, peerAvgGrowth, peerAvgSku, dep, liveSet, zipTrend, zipScope });
      } catch (e) { setErr(e.message || "load failed"); }
    })();
  }, [id, parents]);


  const TopBar = ({ children }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexShrink: 0 }}><button onClick={onBack} title="Back" style={backBtn}><span style={{ fontSize: 16, lineHeight: 1, marginRight: 2 }}>‹</span>Back</button>{children}</div>
  );

  const wrapEmb = inner => <div className="adFade adScroll" style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "18px 28px 30px", fontFamily: "var(--font-sans)" }}>{inner}</div>;
  if (err) return embedded ? wrapEmb(<p style={{ color: "var(--down)", padding: 16, fontSize: 13 }}>Couldn’t load account. {err}</p>) : <div className="adFade" style={shell}><TopBar /><p style={{ color: "var(--down)", padding: 16, fontSize: 13 }}>Couldn’t load account. {err}</p></div>;
  if (!d) return embedded ? wrapEmb(<p style={{ color: "var(--text-3)", padding: 20, fontSize: 13, textAlign: "center" }}>Loading account…</p>) : <div className="adFade" style={shell}><TopBar /><p style={{ color: "var(--text-3)", padding: 20, fontSize: 13, textAlign: "center" }}>Loading account…</p></div>;

  const { acc, bench, items, white, mktAll = [], cohort = [], onP, areaAvgMoReal = null, wsReal = [], penetration = null, peerAvgGrowth = null, peerAvgSku = null, dep = { tot: { line: [], dots: [] }, byPk: {} }, liveSet = null, zipTrend = {}, zipScope = null } = d;
  const head = HEAD[acc.headline] || HEAD["Stable"];
  const pct = acc.prior90_pct, dl = acc.placements_delta;
  const onWord = onP ? "on-premise" : "off-premise";
  const skuComp = (() => {
    const mine = acc.live_placements || 0, base = cohort.filter(a => a.account_id !== acc.account_id), ch = acc.channel_type;
    const tiers = [
      { peers: base.filter(a => ch && a.channel_type === ch && a.state === acc.state), label: `similar ${ch ? titleCase(ch) + " " : ""}${onWord} accounts in ${STNAME[acc.state] || acc.state}` },
      { peers: ch ? base.filter(a => a.channel_type === ch) : [], label: `${ch ? titleCase(ch) + " " : ""}${onWord} accounts` },
      { peers: base, label: `${onWord} accounts across the book` },
    ];
    for (const t of tiers) { const vals = t.peers.map(a => a.live_placements || 0); if (vals.length >= 5) { const med = median(vals); if (med > 0) return { pct: Math.round(((mine - med) / med) * 100), delta: mine - med, n: vals.length, label: t.label }; } }
    return null;
  })();
  const skuDelta = skuComp ? Math.round(skuComp.delta) : null;
  const skus = [...items].sort((a, b) => { const al = a.cell_state === "lost_recent", bl = b.cell_state === "lost_recent"; if (al !== bl) return al ? 1 : -1; return b.l90 - a.l90; });
  const brief = buildBriefing(acc, bench, items, white, liveSet, mktAll);
  const headline = acc.headline === "Accelerating" ? `Heating up — L90 up ${Math.abs(pct || 0)}% vs the prior quarter`
    : acc.headline === "At-Risk" ? `At risk — L90 down ${Math.abs(pct || 0)}% and shedding placements`
    : acc.headline === "Decelerating" ? `Cooling — L90 down ${Math.abs(pct || 0)}% from the prior quarter`
    : acc.headline === "Stable" ? "Holding steady quarter over quarter"
    : acc.headline === "New" ? "A new account, still ramping"
    : acc.headline === "Lapsed" ? "Gone quiet — no orders in the last 90 days"
    : `Tracking ${(pct || 0) >= 0 ? "up" : "down"} ${Math.abs(pct || 0)}%`;
  const lapsed = acc.headline === "Lapsed";
  const lostSkus = [...items].filter(i => i.cell_state === "lost_recent").sort((a, b) => (a.last_sale_w ?? 99) - (b.last_sale_w ?? 99));
  const areaStanding = (() => {
    const wgt = acc.account_weight || 0; if (wgt <= 0) return null; const ch = acc.channel_type;
    const inArea = match => cohort.filter(a => a.account_id !== acc.account_id && a.account_weight > 0 && (!ch || a.channel_type === ch) && match(a));
    let peers = inArea(a => acc.city && a.city === acc.city), where = acc.city ? titleCase(acc.city) : null;
    if (peers.length < 12) { peers = inArea(a => a.state === acc.state); where = STNAME[acc.state] || acc.state; }
    if (peers.length < 12 || !where) return null;
    const rank = Math.max(1, Math.round((100 * (peers.filter(a => a.account_weight > wgt).length + 1)) / (peers.length + 1)));
    if (rank > 10) return null;
    return lapsed ? `Used to be a top ${rank}% account in ${where} — worth winning back.` : `Top ${rank}% account in ${where}.`;
  })();
  const bullets = lapsed
    ? [areaStanding || `Gone dark${acc.gapWindows != null && acc.gapWindows > 0 ? ` ~${acc.gapWindows * 30} days ago` : ""} — no orders in the last 90 days.`, `${acc.account_weight ? acc.account_weight.toLocaleString() + " cs/yr" : "Real volume"} across ${lostSkus.length} SKU${lostSkus.length === 1 ? "" : "s"} before it went quiet.`]
    : [brief.signals[0] ? brief.signals[0].t : "Holding its pace quarter over quarter.", areaStanding].filter(Boolean);
  const accountMo = items.reduce((s, i) => s + ((i.l90 || 0) / 3) * profitPerCase(i.item_name, 0.30), 0);
  const profitPct = areaAvgMoReal ? Math.round((accountMo / areaAvgMoReal - 1) * 100) : null;
  const mkTrend = peerAvgGrowth == null ? null : peerAvgGrowth > 3 ? "growing" : peerAvgGrowth < -3 ? "softening" : "holding steady";
  const mkChan = titleCase(acc.channel_type || acc.channel || "these"), mkWhere = acc.city ? `around ${titleCase(acc.city)}` : "in the area";
  const marketLine = mkTrend ? `${mkChan} accounts ${mkWhere} are ${mkTrend}.` : null;
  // vs-peers: channel-matched, statewide (on-prem only vs on-prem, etc.)
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const rosOf = a => (a.live_placements > 0) ? (Number(a.cur90) || 0) / a.live_placements / 3 : null;
  const peerPool = (() => { const ch = acc.channel_type; let p = cohort.filter(a => a.account_id !== acc.account_id && (!ch || a.channel_type === ch) && a.state === acc.state); if (p.length < 8) p = cohort.filter(a => a.account_id !== acc.account_id); return p; })();
  // MEDIAN peer (the typical account) — robust to the few giant accounts that would blow up a mean.
  // (median, not mean, so a top account doesn't drag the "typical peer" reference.)
  const peerMed90 = Math.round(median(peerPool.map(a => Number(a.cur90) || 0)));
  const peerMedPlc = Math.round(median(peerPool.map(a => a.live_placements || 0)) * 10) / 10;
  const peerRosV = peerPool.map(rosOf).filter(x => x != null); const peerMedRos = peerRosV.length ? median(peerRosV) : 0;
  const myRos = acc.live_placements > 0 ? acc.cur90 / acc.live_placements / 3 : 0;
  const relOf = (v, base) => base > 0 ? v / base : null;   // ratio vs the typical (median) peer
  const r90 = relOf(acc.cur90, peerMed90), rPlc = relOf(acc.live_placements, peerMedPlc), rRos = relOf(myRos, peerMedRos);
  // recency in 30-day windows from the depletion history (acc.gapWindows) — never last_order_w (synthetic)
  const gapWin = acc.gapWindows, overdue = lapsed || (gapWin != null && gapWin >= 2);
  const sinceTxt = gapWin != null ? (gapWin > 0 ? `${gapWin * 30}d` : "<30d") : null;
  const peerLabel = `${peerPool.length} ${titleCase(acc.channel_type || acc.channel || "")} accts statewide`;
  // Win / Watch / Ask — deterministic
  const growing = items.filter(i => i.cell_state === "growth").sort((a, b) => (b.l90 || 0) - (a.l90 || 0));
  const declining = items.filter(i => i.cell_state === "decline").sort((a, b) => (b.l90 || 0) - (a.l90 || 0));
  const activeItems = [...items].filter(i => (i.l90 || 0) > 0).sort((a, b) => (b.l90 || 0) - (a.l90 || 0));
  const win = lapsed ? { h: "Was a real account", s: areaStanding || `${(acc.account_weight || 0).toLocaleString()} cs/yr before it went quiet` }
    : growing[0] ? { h: `${growing[0].item_name} is climbing`, s: `top mover — ${((growing[0].l90 || 0) / 3).toFixed(0)} cs/mo` }
    : (pct != null && pct >= 8) ? { h: `Up ${pct}% in 90 days`, s: `${activeItems.length} SKUs live, ${growing.length} growing` }
    : (r90 != null && r90 >= 1.5) ? { h: `${r90 >= 10 ? Math.round(r90) : r90.toFixed(1)}× a typical ${titleCase(acc.channel_type || acc.channel)}`, s: `${acc.cur90} cs vs ${peerMed90} at the median peer` }
    : { h: "Holding steady", s: `${acc.live_placements} SKUs · ${Math.round((acc.cur90 || 0) / 3)} cs/mo` };
  const watch = overdue ? { h: lapsed ? "No orders in 90 days" : `${sinceTxt} since last order`, s: lapsed ? "gone quiet — win it back" : "overdue for a reorder — check inventory" }
    : lostSkus[0] ? { h: `Dropped ${lostSkus[0].item_name}`, s: "gone in the last 90 days" }
    : declining[0] ? { h: `${declining[0].item_name} is slipping`, s: `${((declining[0].l90 || 0) / 3).toFixed(0)} cs/mo, below its pace` }
    : { h: "Nothing urgent", s: `ordered ${gapWin != null && gapWin > 0 ? `~${gapWin * 30} days` : "recently"} ago` };
  const ask = wsReal[0] ? { h: `Pitch ${wsReal[0].name}`, s: `peers here move ~${wsReal[0].vel} cs/mo — you don't carry it` }
    : white[0] ? { h: `Pitch ${white[0].item_name}`, s: `#${white[0].market_rank} in the market, not carried here` }
    : { h: "Steady as she goes", s: "no obvious gap this visit" };
  const three = [["▲", "WIN", "var(--up)", win], ["▼", "WATCH", "var(--down)", watch], ["＋", "ASK", "var(--forecast)", ask]];
  const demoC = { "Affluent": "#8a6d3f", "Upper-mid": "#5c7a64", "Middle": "var(--text-2)", "Working": "#7a8590" }[acc.income_bucket] || "var(--text-2)";
  const relSpan = r => { if (r == null) return null; if (r >= 1.6) { const m = r >= 10 ? Math.round(r) : r.toFixed(1); return <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--up)" }}>×{m}</span>; } const pct = Math.round((r - 1) * 100); return <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: pct > 2 ? "var(--up)" : pct < -2 ? "var(--down)" : "var(--text-3)" }}>{pct > 0 ? "+" : ""}{pct}%</span>; };
  const chW = 50, pW = 60, tW = 12;
  const colHead = (a, b) => (
    <div style={{ display: "flex", alignItems: "center", padding: "0 6px 3px" }}><span style={{ flex: 1 }} /><span style={{ width: chW, textAlign: "right", fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.3 }}>{a}</span><span style={{ width: pW, textAlign: "right", fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.3 }}>{b}</span><span style={{ width: tW }} /></div>
  );

  // ---- Split layout (Joe's approved card): stats + peers · talking points · BAR depletions · hover order-history | on-shelf · dropped · whitespace ----
  const colheadS = { fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-3)" };
  const secS = { fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5c6353", margin: "0 0 8px" };
  // (bucket-aware briefBullets are assembled below, after styleMix/areaStanding exist)
  const monthsAxis = Array.from({ length: 18 }, (_, i) => monthLabel(17 - i));
  const gline = dep.tot.line || [], gmax = Math.max(1, ...gline);
  // bar hue follows the (healed) status — soft green when fine, soft amber when slowing/at-risk, soft red when lapsed — same light-to-deep fade in each hue
  // the caller's bucket wins (keeps the card's colors consistent with the tile it was opened from);
  // standalone falls back to the account's own headline. New/Stable/Accelerating all read green.
  const hlBand = hlOverride
    ? (hlOverride === "lapsed" ? "r" : (hlOverride === "at-risk" || hlOverride === "decelerating") ? "y" : "g")
    : (acc.headline === "Lapsed" ? "r" : (acc.headline === "At-Risk" || acc.headline === "Decelerating") ? "y" : "g");
  const BAR_RAMP = { g: [[200, 224, 205], [31, 120, 70]], y: [[240, 229, 196], [196, 150, 60]], r: [[243, 220, 214], [188, 100, 88]] };
  const greenShade = i => { const [lo, hi] = BAR_RAMP[hlBand]; const t = Math.pow(i / (gline.length - 1 || 1), 1.4), mix = (a, b) => Math.round(a + (b - a) * t); return `rgb(${mix(lo[0], hi[0])},${mix(lo[1], hi[1])},${mix(lo[2], hi[2])})`; };
  // # of SKUs over time = 90-day rolling placement (SKUs active in the trailing 90d) at each month → a blue line over the bars
  const skuLine = gline.map((_, i) => { let n = 0; for (const pk in dep.byPk) if ((((dep.byPk[pk] || {}).line || [])[i] || 0) > 0) n++; return n; });
  const skuMax = Math.max(1, ...skuLine);
  const skuY = v => 100 - (v / (skuMax * 1.05)) * 92;   // % from top
  const skuPts = skuLine.map((v, i) => `${((i + 0.5) / (skuLine.length || 1) * 100).toFixed(2)},${skuY(v).toFixed(2)}`).join(" ");
  const secDiv = { borderTop: "0.5px solid var(--border)", margin: "20px 0 0", paddingTop: 16 };
  /* THE LAST ORDER, NOT THE AVERAGE PACE (Joe, 2026-08-21). Same read as the desktop card: the
     invoice line is not in the data, so this walks the item's own 30-day windows back from now,
     stops at the first one with anything in it, and reports that window's cases in pack units
     plus the date it ended -- "what did they last take, and when". */
  const lastOrderOf = (k) => {
    const dots = (dep.byPk[k.product_key] && dep.byPk[k.product_key].dots) || [];
    for (let i = dots.length - 1; i >= 0; i--) {
      const c = Number(dots[i]) || 0;
      if (c > 0) {
        const back = dots.length - 1 - i;
        const p = packMo(c * 3, k.package, true);
        return { n: p.n, unit: p.unit, when: windowEndLabel(back), back };
      }
    }
    return null;
  };

  const packSpan = (k) => { const pk = packMo(k.l90, k.package); return <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700 }}>{pk.n.toLocaleString()}<span style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 500 }}> {pk.unit}/mo</span></span>; };
  // Rotating-tier liquids (Limited/Collab/Seasonal/House/Seltzer/THC) come and go by
  // design — two thirds of this brewery's volume rotates. Only CORE items are judged
  // as trends, and only core brands get named.
  const TIER_RE = /LIMITED|SEASONAL|COLLAB|HOUSE|SELTZER|THC/i;   // profile-literal-ok — style taxonomy / display grouping only — never decides a row's label
  const isCoreItem = (k) => !(TIER_RE.test(String(k.slot_key || "")) || TIER_RE.test(String(k.style_parent || "")));
  // #1 account mix — Joe (2026-08-17): speak in real CORE brand names (Booter, Drop Ride…)
  // and collapse every rotating beer tier into one broad "limited" bucket — never
  // Collab/Seasonal/style subdivisions. THC keeps its own word (different parent).
  const styleMix = (() => {
    const agg = {}; for (const it of items) {
      const v = it.l90 || 0; if (v <= 0) continue;
      const sp = String(it.style_parent || "").toUpperCase();
      const g = sp === "THC" ? "THC" : isCoreItem(it) ? titleCase(it.brand || "Core") : "limited";   // profile-literal-ok — style taxonomy / display grouping only — never decides a row's label
      agg[g] = (agg[g] || 0) + v;
    }
    const tot = Object.values(agg).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(agg).map(([g, v]) => ({ g, pct: Math.round(v / tot * 100) })).sort((a, b) => b.pct - a.pct);
  })();
  // #3 reorder cadence → a "due"/"overdue" chip per on-shelf SKU (order-months in the last 12 vs
  // 30-day windows since the item's last order — both from its OWN window line; last_sale_w is synthetic)
  const dueOf = (k) => {
    const dots = ((dep.byPk[k.product_key] && dep.byPk[k.product_key].dots) || []).slice(-12);
    const orders = dots.filter(x => x > 0).length;
    if (orders < 2) return null;
    let since = null;
    for (let i = dots.length - 1, g = 0; i >= 0; i--, g++) { if (dots[i] > 0) { since = g; break; } }
    if (since == null) return null; const gapW = 12 / orders;   // typical windows between orders
    if (since > gapW * 1.4) return { t: "overdue", c: "var(--down)", bg: "#f6e4e1" };
    if (since >= gapW * 0.9) return { t: "due", c: "#9c7420", bg: "#f8f1e0" };
    return null;
  };
  // dropped SKUs still worth winning back = only ones still selling somewhere in the last 90 days (skip discontinued one-offs)
  const lostSkusLive = lostSkus.filter(k => !liveSet || liveSet.has(k.product_key));
  // per-ITEM status, same classifier as the account/city (Joe 2026-08-11) — surfaced as a small chip on the shelf row
  const ITAG = { new: ["new", "#6b7267", "#eef0ea"], accelerating: ["surging", "#22633f", "#dcefe1"], decelerating: ["softening", "#9c7420", "#f3ead0"], "at-risk": ["at risk", "#9c7420", "#f3ead0"] };
  // only SKUs the account actually REPEATS carry a status — a rotating one-case-and-done listing has no trend
  // to report, and tagging every one of them "new" buries the handful that matter.
  // A fading Limited is retirement, not risk (isCoreItem above). Only CORE items earn
  // softening / at-risk talk, and a core that ordered within the last two windows is
  // never "at risk" (Joe, 2026-08-17: it just ordered a month ago — don't cry wolf).
  const itemTag = (k) => {
    const d = dep.byPk[k.product_key]; if (!d) return null;
    if (d.dots.filter(v => v > 0).length < 2) return null;
    const h = acctHealth(d.dots);
    if (h === "new") return ITAG.new;
    if (h === "accelerating") return ITAG.accelerating;
    if (h !== "decelerating" && h !== "at-risk") return null;
    if (!isCoreItem(k)) return null;
    const orderedRecently = (d.dots[d.dots.length - 1] || 0) > 0 || (d.dots[d.dots.length - 2] || 0) > 0;
    if (h === "at-risk" && orderedRecently) return ITAG.decelerating;
    return ITAG[h] || null;
  };
  // "What's working nearby" whitespace picks — peers' gaps you don't carry, off-prem never gets draft, each with a why (top 3)
  const peerTotal = penetration ? penetration.total : 0;
  const nearbyPicks = wsReal
    .filter(w => onP || !w.draft)                                       // off-premise never gets a draft pitch
    .map(w => ({ ...w, trend: (w.pk != null && zipTrend[w.pk] != null) ? zipTrend[w.pk] : null }))
    .sort((a, b) => (((b.trend >= 15 ? 100 : 0) + b.carriers) - ((a.trend >= 15 ? 100 : 0) + a.carriers)) || (b.dollars - a.dollars))  // broadly-carried / rising first
    .slice(0, 3)
    .map(w => {
      const vel = w.velRaw != null ? w.velRaw : w.vel;
      const pk = packMo(vel * 3, w.pkg);   // vel units/mo → ×3 = the 90-day raw number packMo expects
      const why = (w.trend != null && w.trend >= 15) ? `surging ▲${w.trend}% nearby`
        : (w.carriers >= 2 && peerTotal) ? `${w.carriers} of ${peerTotal} like accounts stock it`
        : `peers move ~${pk.n} ${pk.unit}/mo`;
      return { name: w.name, packN: pk.n, packUnit: pk.unit, why, hot: w.trend != null && w.trend >= 15, draft: !!w.draft };
    });
  // account-mix bullet (replaces the style gauge) — balanced? which style is doing better here?
  const mixBullet = (() => {
    if (!styleMix.length) return null;
    const top = styleMix[0], second = styleMix[1];
    const s = top.pct >= 55 ? `${top.g} is dominant here (${top.pct}%).`
      : second && top.pct - second.pct <= 12 ? `${top.g} and ${second.g} split the shelf (${top.pct}/${second.pct}%).`
      : `${top.g} sells most here (${top.pct}%)${second ? `, ${second.g} ${second.pct}%` : ""}.`;
    return s[0].toUpperCase() + s.slice(1);   // "limited" bucket starting a sentence
  })();
  // Bucket-aware brief (Joe's rules): healthy reads positive; a watch account says INSTANTLY
  // why it's on watch; a dominant family opens the first sentence ("This Limited-dominated
  // account…"). Informative — "your shelfstory" will carry the full talking points later.
  const briefBucket = hlOverride || String(acc.headline || "").toLowerCase();
  const briefWatch = briefBucket === "at-risk" || briefBucket === "decelerating";
  const briefDom = styleMix.length && styleMix[0].pct >= 55 ? styleMix[0] : null;
  const briefOpen = briefDom ? `This ${briefDom.g}-dominated (${briefDom.pct}%) account` : "This account";
  const briefPlD = (acc.live_placements || 0) - (acc.live_prev || 0);
  const briefStand = areaStanding ? areaStanding.replace(/\.\s*$/, "") : null;
  const briefBullets = (() => {
    if (lapsed) return [
      `${briefOpen} has gone quiet — no orders in the last 90 days.`,
      `${acc.account_weight ? acc.account_weight.toLocaleString() + " cs/yr" : "Real volume"} across ${lostSkus.length} SKU${lostSkus.length === 1 ? "" : "s"} before it went dark.`,
      briefStand ? `${briefStand}.` : null,
    ].filter(Boolean);
    if (briefWatch) {
      const why = [];
      if (pct < 0) why.push(`overall sales are down — 90-day cases off ${Math.abs(pct)}% vs the prior 90 (${(acc.prev90 || 0).toLocaleString()} → ${(acc.cur90 || 0).toLocaleString()})`);
      // on-premise handles rotate by design — placement loss only rates a mention there when
      // it's substantial (3+ lines or a quarter of the wall); off-premise shelf slots are sticky
      const plMeaning = briefPlD < 0 && (!onP || Math.abs(briefPlD) >= 3 || ((acc.live_prev || 0) > 0 && Math.abs(briefPlD) / acc.live_prev >= 0.25));
      if (plMeaning) why.push(onP
        ? `it's pouring on ${Math.abs(briefPlD)} fewer line${Math.abs(briefPlD) === 1 ? "" : "s"} than last quarter (${(acc.live_prev || 0)} → ${(acc.live_placements || 0)})`
        : `${Math.abs(briefPlD)} placement${Math.abs(briefPlD) === 1 ? "" : "s"} came off the shelf (${(acc.live_prev || 0)} → ${(acc.live_placements || 0)})`);
      if (!why.length) why.push("the order pace has gone quiet — recent weeks no longer support its usual run rate");
      const second = why[1] ? why[1][0].toUpperCase() + why[1].slice(1) + "."
        : (pct < 0 && briefPlD >= 0) ? `Placements held (${acc.live_placements || 0}) — each one is just moving less. The slide is velocity, not distribution.` : null;
      return [
        `${briefOpen} is on watch: ${why[0]}.`,
        second,
        // win-back suggestions parked: can't tell core from Limited/rotation items yet, so no bad asks
        briefStand ? `Still a ${briefStand[0].toLowerCase() + briefStand.slice(1)} — reachable with a visit.` : null,
      ].filter(Boolean).slice(0, 4);
    }
    return [
      `${briefOpen} is ${briefBucket === "new" ? "new and still ramping" : briefStand ? "a " + briefStand[0].toLowerCase() + briefStand.slice(1) : "in good shape"}${pct > 0 ? ` — up ${pct}% vs the prior 90` : pct === 0 ? " — holding steady" : ""}.`,
      (brief.signals.find(s => s.k === "up" || s.k === "opp") || {}).t || null,   // healthy briefs carry the positive signal; warns belong to watch
      // win-back suggestions parked (see note above)
      !briefDom && mixBullet ? mixBullet : null,
    ].filter(Boolean).slice(0, 4);
  })();
  // per-stat QoQ deltas for the small arrows (cases / rate of sale / on-shelf)
  const casesPct = acc.prior90_pct;
  const rosPct = (acc.prev90 > 0 && acc.live_prev > 0 && acc.live_placements > 0) ? Math.round(((acc.cur90 / acc.live_placements) / (acc.prev90 / acc.live_prev) - 1) * 100) : null;
  const plcPct = (acc.live_prev > 0) ? Math.round(((acc.live_placements - acc.live_prev) / acc.live_prev) * 100) : null;
  const STATS = [["90-day cases", (acc.cur90 || 0).toLocaleString(), `peers ~${(peerMed90 || 0).toLocaleString()}`, casesPct], ["Rate of sale", myRos.toFixed(1), `peers ${peerMedRos.toFixed(1)}`, rosPct], ["On shelf", (acc.live_placements || 0).toLocaleString(), `peers ${Math.round(peerMedPlc)}`, plcPct], ["Last order", sinceTxt != null ? sinceTxt : "—", overdue ? "overdue" : "ago", null]];
  // ---- Vertical layout (phone-translatable single column): stats → brief → depletions → order tiles → shelf → dropped → whitespace ----
  const content = (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      {/* stats — centered, spanning the full width, each with a small ▲/▼% (cases / rate of sale / on-shelf) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={colheadS}>{s[0]}</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginTop: 3 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 19, fontWeight: 700, lineHeight: 1.05, color: (s[0] === "Last order" && overdue) ? "var(--down)" : "var(--text)" }}>{s[1]}</span>
              {s[3] != null && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", color: s[3] > 0 ? "var(--up)" : s[3] < 0 ? "var(--down)" : "var(--text-3)" }}>{s[3] > 0 ? "▲" : s[3] < 0 ? "▼" : ""}{Math.abs(s[3])}%</span>}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-3)", marginTop: 2 }}>{s[2]}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-3)", marginTop: 6 }}>peers = similar {titleCase(acc.channel_type || "")} {onP ? "on-premise" : "off-premise"} accounts in {STNAME[acc.state] || acc.state}</div>
      {/* Account Brief — bullets; the last one describes the account's style mix in words (replaces the gauge) */}
      <div style={{ marginTop: 10, background: "#f5f6f1", border: "0.5px solid var(--border)", borderLeft: "3px solid var(--accent-deep)", borderRadius: 10, padding: "10px 14px" }}>
        <div style={{ ...secS, margin: "0 0 7px", color: "var(--accent-deep)" }}>Account Brief</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {briefBullets.map((t, i) => { const isMix = mixBullet && t === mixBullet; return (<div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}><span style={{ width: 6, height: 6, borderRadius: 9, background: isMix ? "var(--gold)" : i === 0 ? "var(--accent-deep)" : "var(--text-2)", marginTop: 5, flexShrink: 0 }} /><span style={{ fontSize: 12, lineHeight: 1.35, color: "#3a4034" }}>{t}</span></div>); })}
        </div>
      </div>
      {/* Sell Story — 4-5 sayable, data-backed sell-in angles (approved buckets, 2026-08-16) */}
      <SellStory d={d} parents={parents} />
      {/* depletions bars + a blue "# of SKUs" line (90-day rolling placement) — squished so name/stats/brief/graph share one pane */}
      <div style={{ ...secDiv, margin: "10px 0 0", paddingTop: 10 }}>
        <div style={{ ...secS, margin: "0 0 6px", display: "flex", alignItems: "baseline", gap: 8 }}>90-day rolling depletions <span style={{ fontSize: 8.5, fontWeight: 600, color: "#4a5ac4", textTransform: "none", letterSpacing: 0 }}>— # SKUs on shelf</span></div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ position: "relative", height: 72 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: "100%" }}>
                {gline.map((v, i) => (<div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}><div style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, fontWeight: 600, color: "#8a9487", textAlign: "center", marginBottom: 3 }}>{Math.round(v)}</div><div style={{ height: `${Math.max(3, v / gmax * 84)}%`, background: greenShade(i), borderRadius: "3px 3px 0 0", transition: "height .4s cubic-bezier(.2,.8,.3,1)", transformOrigin: "bottom", animation: "barPop .5s cubic-bezier(.2,.8,.3,1) both", animationDelay: `${i * 18}ms` }} /></div>))}
              </div>
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }} viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline points={skuPts} fill="none" stroke="#fff" strokeWidth="5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={skuPts} fill="none" stroke="#4a5ac4" strokeWidth="2.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <span style={{ position: "absolute", left: `${(skuLine.length - 0.5) / (skuLine.length || 1) * 100}%`, top: `${skuY(skuLine[skuLine.length - 1] || 0)}%`, width: 7, height: 7, borderRadius: 9, background: "#4a5ac4", border: "1.5px solid #fff", transform: "translate(-50%,-50%)" }} />
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 3 }}>{monthsAxis.map((m, i) => (<div key={i} style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 7.5, color: "var(--text-3)" }}>{m}</div>))}</div>
          </div>
          <div style={{ width: 22, position: "relative", height: 72, flexShrink: 0 }}>
            {[...new Set([skuMax, Math.round(skuMax / 2), 0])].map((tv, i) => (<span key={i} style={{ position: "absolute", right: 0, top: `${skuY(tv)}%`, transform: "translateY(-50%)", fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 600, color: "#8a90c4" }}>{tv}</span>))}
            <span style={{ position: "absolute", right: 0, bottom: -13, fontFamily: "var(--font-mono)", fontSize: 7, color: "#8a90c4" }}>SKUs</span>
          </div>
        </div>
      </div>
      {/* On the shelf — active + dropped merged into one list; click a row for its quick card */}
      <div style={secDiv}>
        <div style={{ ...secS, margin: "0 0 6px" }}>On the shelf <span style={{ color: "var(--text-3)", fontWeight: 600 }}>· {activeItems.length} live{lostSkusLive.length ? ` · ${lostSkusLive.length} dropped` : ""}</span></div>
        {(shelfOpen ? activeItems : activeItems.slice(0, 5)).map((k, i) => { const on = hoverSku === k.product_key; const due = dueOf(k); const tg = itemTag(k); return (
          <div key={"a" + i} onClick={() => setCardSku(k.product_key)} onMouseEnter={() => setHoverSku(k.product_key)} onMouseLeave={() => setHoverSku(null)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 7px", borderRadius: 8, borderBottom: "0.5px solid #f4f3ee", cursor: "pointer", background: on ? "#eef4ee" : "transparent" }}>
            <span style={{ width: 6, height: 6, borderRadius: 9, background: skuColor(k.cell_state), flexShrink: 0 }} />
            <span style={{ minWidth: 0, fontSize: 12.5, fontWeight: 500, color: "var(--text)", lineHeight: 1.25, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{k.item_name}</span>
            {tg && <span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: tg[1], background: tg[2], borderRadius: 5, padding: "1.5px 6px", flexShrink: 0 }}>{tg[0]}</span>}
            {k.is_new_item ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "#5b6bd0", background: "rgba(91,107,208,.12)", borderRadius: 5, padding: "1.5px 6px", flexShrink: 0 }}>New item</span> : null}
            <span style={{ flex: 1 }} />
            <span style={{ width: 78, textAlign: "right", flexShrink: 0 }}>{(() => { const lo = lastOrderOf(k);
              return lo ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
                {lo.n}<span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text-3)" }}> {lo.unit}</span></span> : packSpan(k); })()}</span>
            <span style={{ width: 54, textAlign: "right", flexShrink: 0 }}>{(() => { const lo = lastOrderOf(k);
              return <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, whiteSpace: "nowrap",
                color: lo && lo.back >= 3 ? "#8a6a12" : "var(--text-3)" }}>{lo ? lo.when : "—"}</span>; })()}</span>
          </div>
        ); })}
        {activeItems.length > 5 && (
          <button onClick={() => setShelfOpen(o => !o)} style={{ width: "100%", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "var(--text-3)", padding: "7px 0 5px", cursor: "pointer" }}>
            {shelfOpen ? "Show top 5 ↑" : `Show all ${activeItems.length.toLocaleString()} items ↓`}
          </button>
        )}
        {lostSkusLive.slice(0, 6).map((k, i) => { const on = hoverSku === k.product_key; return (
          <div key={"d" + i} onClick={() => setCardSku(k.product_key)} onMouseEnter={() => setHoverSku(k.product_key)} onMouseLeave={() => setHoverSku(null)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 7px", borderRadius: 8, borderBottom: "0.5px solid #f4f3ee", cursor: "pointer", background: on ? "#fbeee9" : "transparent", opacity: 0.72 }}>
            <span style={{ color: "var(--pop-warm)", fontWeight: 700, fontSize: 11, width: 6, flexShrink: 0, textAlign: "center" }}>✕</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500, color: "#6b5b56", lineHeight: 1.25, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", textDecoration: "line-through", textDecorationColor: "#cbb8b2" }}>{k.item_name}</span>
            <span style={{ width: 78, textAlign: "right", flexShrink: 0 }}>{(() => { const lo = lastOrderOf(k);
              return lo ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
                {lo.n}<span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text-3)" }}> {lo.unit}</span></span> : packSpan(k); })()}</span>
            <span style={{ width: 54, textAlign: "right", flexShrink: 0 }}>{(() => { const lo = lastOrderOf(k);
              return <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, whiteSpace: "nowrap",
                color: lo && lo.back >= 3 ? "#8a6a12" : "var(--text-3)" }}>{lo ? lo.when : "—"}</span>; })()}</span>
          </div>
        ); })}
      </div>
      {/* Whitespace — grey theme; value column lines up with the packs/mo column above; every pick tagged draft/package */}
      {(nearbyPicks.length > 0 || peerAvgSku != null) && (<div style={secDiv}>
        <div style={{ ...secS, margin: "0 0 3px" }}>Whitespace <span style={{ color: "var(--text-3)", fontWeight: 600 }}>· to add</span></div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-3)", marginBottom: peerAvgSku != null ? 2 : 8 }}>top gaps peers near you stock that you don't</div>
        {peerAvgSku != null && <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-3)", marginBottom: 8 }}>avg similar store nearby stocks ~{peerAvgSku.toLocaleString()} SKUs · you're at {(acc.live_placements || 0).toLocaleString()}</div>}
        {nearbyPicks.map((w, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 7px", borderBottom: i < nearbyPicks.length - 1 ? "0.5px solid #f4f3ee" : "none" }}>
          <span style={{ width: 6, height: 6, borderRadius: 9, background: w.hot ? "#5b6bd0" : "#b7bcae", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.name}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: w.hot ? "#5b6bd0" : "var(--text-3)", marginTop: 1 }}>{w.hot ? "🔥 " : "· "}{w.why}</div>
          </div>
          <span style={{ width: 78, textAlign: "right", flexShrink: 0 }}><span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "#3a4034" }}>~{w.packN.toLocaleString()}<span style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 500 }}> {w.packUnit}/mo</span></span></span>
          <span style={{ width: 54, flexShrink: 0 }} />
        </div>))}
      </div>)}
    </div>
  );
  // quick item card — opens when an on-shelf or dropped item is clicked
  const itemCard = cardSku ? (() => {
    const it = items.find(x => x.product_key === cardSku) || lostSkus.find(x => x.product_key === cardSku);
    if (!it) return null;
    const odots = ((dep.byPk[cardSku] && dep.byPk[cardSku].dots) || []).slice(-12);   // last 12 months of actual monthly orders
    const opacks = odots.map(c => c > 0 ? packMo(c * 3, it.package, true).n : 0), pMax = Math.max(1, ...opacks);
    const ounit = packMo(60, it.package).unit, omlab = Array.from({ length: 12 }, (_, x) => monthLabel(11 - x));   // 60 = dummy for a plural unit label
    const lost = it.cell_state === "lost_recent" || (it.l90 || 0) <= 0;
    const pk = packMo(lost ? (it.l90_prev || 0) : (it.l90 || 0), it.package);
    // trend words are for CORE items only — "declining" on a rotating tier that's simply
    // sunsetting reads as a false alarm. Non-core gets plain facts.
    const coreIt = isCoreItem(it);
    const chip = lost ? { t: "Dropped", c: "var(--pop-warm-deep)", bg: "#f6e4e1" }
      : it.cell_state === "growth" ? { t: "Growing", c: "#2f6b46", bg: "#e6f2e9" }
      : !coreIt ? { t: "Ordering", c: "#5c6353", bg: "#eef0ea" }
      : it.cell_state === "decline" ? { t: "Declining", c: "#a3423a", bg: "#f6e4e1" }
      : { t: "Steady", c: "#5c6353", bg: "#eef0ea" };
    const due = !lost ? dueOf(it) : null;
    return (
      <div onClick={() => setCardSku(null)} style={{ position: "absolute", inset: 0, background: "rgba(30,35,28,.34)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20, animation: "ovIn .16s ease both" }}>
        <div onClick={e => e.stopPropagation()} style={{ width: 340, maxWidth: "92%", background: "#fff", borderRadius: 14, border: "0.5px solid var(--border)", boxShadow: "0 14px 44px rgba(30,35,28,.24)", padding: "16px 18px", fontFamily: "var(--font-sans)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 650, color: "var(--text)", lineHeight: 1.25 }}>{it.item_name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{styleGroup(it.style_parent)}{it.package ? ` · ${it.package}` : ""}</div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: chip.c, background: chip.bg, borderRadius: 6, padding: "3px 8px", flexShrink: 0 }}>{chip.t}</span>
            <button onClick={() => setCardSku(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 15, lineHeight: 1, padding: 0, flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-3)", marginTop: 14 }}>Actual orders · last 12 months</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 3, marginTop: 6 }}>
            {opacks.map((p, i) => (<div key={i} title={`${omlab[i]}: ${p ? p + " " + ounit : "no order"}`} style={{ aspectRatio: "1", borderRadius: 3, border: "0.5px solid var(--border)", background: p > 0 ? hexA(lost ? "#b0573a" : "#2f9d63", 0.12 + 0.5 * p / pMax) : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700, color: p > 0 ? (lost ? "#8B3A2B" : "#15703b") : "var(--text-3)" }}>{p > 0 ? (p >= 1000 ? (p / 1000).toFixed(1) + "k" : p) : "·"}</span></div>))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 3, marginTop: 3 }}>{omlab.map((m, i) => (<span key={i} style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--text-3)" }}>{m}</span>))}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-3)", marginTop: 5 }}>actual {ounit} ordered each month · blank = no order</div>
          <div style={{ display: "flex", gap: 18, marginTop: 14, borderTop: "0.5px solid var(--border)", paddingTop: 12 }}>
            <div><div style={colheadS}>{lost ? "Was moving" : "Moving"}</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, marginTop: 3 }}>{pk.n.toLocaleString()}<span style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 500 }}> {pk.unit}/mo</span></div></div>
            <div><div style={colheadS}>Last order</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, marginTop: 3, color: lost ? "var(--pop-warm-deep)" : "var(--text)" }}>{it.last_sale_w != null ? agoDays(it.last_sale_w) : "—"}<span style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 500 }}> ago</span></div></div>
            {due && <div><div style={colheadS}>Reorder</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, marginTop: 6, textTransform: "uppercase", color: due.c }}>{due.t}</div></div>}
          </div>
          {lost && <div style={{ fontSize: 11.5, color: "#6b5b56", marginTop: 12, lineHeight: 1.45 }}>Dropped {it.last_sale_w != null ? `${agoDays(it.last_sale_w)} ago` : "recently"}{(liveSet && liveSet.has(cardSku)) ? " — still sold nearby, worth winning back." : "."}</div>}
        </div>
      </div>
    );
  })() : null;
  const styleTag = <style>{`.adFade{animation:ovIn .4s ease both}@keyframes ovIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @keyframes barPop{from{transform:scaleY(0)}to{transform:scaleY(1)}}
    .adScroll{overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none}.adScroll::-webkit-scrollbar{width:0;height:0;display:none}`}</style>;
  if (embedded) return <div style={{ position: "absolute", inset: 0 }}><div className="adFade adScroll" style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "10px 30px 30px", fontFamily: "var(--font-sans)" }}>{styleTag}{content}</div>{itemCard}</div>;
  return (
    <div className="adFade" style={shell}>
      {styleTag}
      <TopBar><div style={{ display: "flex", alignItems: "center", gap: 9 }}><TreeGlyph headline={acc.headline} pct={pct} h={26} skin={skin} /><span style={{ fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 600, color: "var(--text)" }}>{acc.account_name}</span><span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{acc.city} · {titleCase(acc.channel)}</span></div></TopBar>
      <div className="adScroll" style={{ flex: 1, minHeight: 0 }}><div style={{ maxWidth: 940, margin: "0 auto", paddingBottom: 40 }}>{content}</div></div>
      {itemCard}
    </div>
  );
}
