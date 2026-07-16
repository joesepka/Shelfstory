"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Splash from "../../../components/Splash";
import TreeGlyph from "../../../components/TreeGlyph";
import ItemEstimator from "../../../components/ItemEstimator";
import AccountTag from "../../../components/AccountTag";
import { greenBar } from "../../../lib/utils";
import { profitPerCase } from "../../../lib/pricing";
import { getBullets, FOCUS } from "../../../lib/news";

const SNAPSHOT = new Date("2026-06-15T00:00:00");

const HEAD = {
  "Accelerating": { bg: "var(--growing-bg)", fg: "var(--growing-ink)", bc: "var(--accent)" },
  "Stable":       { bg: "var(--stable-bg)",  fg: "var(--stable-ink)",  bc: "var(--text-3)" },
  "Decelerating": { bg: "var(--watch-bg)",   fg: "var(--watch-ink)",   bc: "var(--pop-warm)" },
  "At-Risk":      { bg: "var(--atrisk-bg)",  fg: "var(--atrisk-ink)",  bc: "var(--pop-warm)" },
  "New":          { bg: "var(--new-bg)",     fg: "var(--new-ink)",     bc: "var(--pop-cool)" },
  "Lapsed":       { bg: "#8B3A2B",            fg: "#fff",               bc: "var(--pop-warm)" },
};
const SK = {
  growth:      ["var(--growing-bg)", "var(--growing-ink)", "accelerating"],
  decline:     ["var(--watch-bg)",   "var(--watch-ink)",   "softening"],
  stable:      ["transparent",       "var(--text-2)",      "steady"],
  lost_recent: ["var(--atrisk-bg)",  "var(--atrisk-ink)",  "lost"],
};
function titleCase(s) {
  if (!s) return "";
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function sigColor(k) {
  return k === "warn" ? "var(--pop-warm)" : k === "up" ? "var(--accent)" : k === "opp" ? "var(--pop-cool)" : "var(--pop-cool-deep)";
}
const STNAME = { IL: "Illinois", OH: "Ohio", MI: "Michigan", MO: "Missouri", IA: "Iowa", MN: "Minnesota", WI: "Wisconsin", IN: "Indiana" };
function median(arr) { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
const round5 = n => Math.round(n / 5) * 5;   // approximate item $ to the nearest $5
function monthLabel(monthsAgo) {
  const d = new Date(SNAPSHOT);
  d.setDate(d.getDate() - 30 * monthsAgo);
  return d.toLocaleString("en-US", { month: "short" });
}

// Deterministic pre-call briefing — all computed from Supabase data, no AI.
// Returns { lead, signals[], moves[] }: a headline sentence, computed analyst
// signals (the differentiated reasoning), and prioritized actions.
function buildBriefing(acc, b, items, white) {
  const chan = titleCase(acc.channel);
  const pct = acc.prior90_pct || 0;
  const growing = items.filter((i) => i.cell_state === "growth").sort((a, b) => (b.l90 || 0) - (a.l90 || 0));
  const lost = items.filter((i) => i.cell_state === "lost_recent");
  const active = items.filter((i) => (i.l90 || 0) > 0);
  const totalL90 = active.reduce((s, i) => s + (i.l90 || 0), 0);

  // ---- lead: ranking + headline trend ----
  let lead = "";
  if (b && b.pct_overall != null && b.pct_overall <= 15) {
    lead += `Top ${b.pct_overall}% account overall`;
    if (b.pct_channel != null) lead += ` (top ${b.pct_channel}% in ${chan})`;
    lead += ". ";
  }
  const trendWord = acc.headline === "Accelerating" ? `heating up — L90 volume up ${Math.abs(pct)}% vs the prior quarter`
    : acc.headline === "At-Risk" ? `at risk — L90 down ${Math.abs(pct)}% and shedding placements`
    : acc.headline === "Decelerating" ? `cooling — L90 down ${Math.abs(pct)}% from the prior quarter`
    : acc.headline === "Stable" ? "holding steady quarter over quarter"
    : acc.headline === "New" ? "a new account still ramping"
    : acc.headline === "Lapsed" ? "gone quiet — no orders in the last 90 days"
    : `tracking ${pct >= 0 ? "up" : "down"} ${Math.abs(pct)}%`;
  lead += `It's ${trendWord}.`;

  const signals = [];

  // ---- velocity vs distribution: is the move rate-of-sale or placements? ----
  if (acc.prev90 > 0 && acc.live_prev > 0 && acc.live_placements > 0) {
    const rosNow = acc.cur90 / acc.live_placements;
    const rosPrev = acc.prev90 / acc.live_prev;
    const rosD = Math.round((100 * (rosNow - rosPrev)) / rosPrev);
    const plcD = Math.round((100 * (acc.live_placements - acc.live_prev)) / acc.live_prev);
    if (Math.abs(rosD) >= 4 || Math.abs(plcD) >= 4) {
      if (rosD >= 4 && plcD <= 2) signals.push({ k: "up", t: `Velocity-led: each placement is moving ${rosD}% more than last quarter — rate of sale, not new placements.` });
      else if (plcD >= 4 && rosD <= 2) signals.push({ k: "opp", t: `Distribution-led: ${plcD}% more placements but rate of sale is flat — velocity upside still banked.` });
      else if (plcD <= -4 && rosD >= -2) signals.push({ k: "warn", t: `Losing placements (${plcD}%) faster than volume — a distribution problem, not velocity. Win the placements back.` });
      else if (rosD <= -4) signals.push({ k: "warn", t: `Rate of sale is the drag — same placements moving ${Math.abs(rosD)}% less. A velocity fix, not distribution.` });
    }
  }

  // ---- recent inflection vs its own 3-month pace (early warning) ----
  if (Array.isArray(acc.spark) && acc.spark.length >= 4) {
    const sp = acc.spark.map(Number);
    const newest = sp[sp.length - 1];
    const trail = sp.slice(-4, -1);
    const trailAvg = trail.reduce((s, x) => s + x, 0) / trail.length;
    if (trailAvg > 0) {
      const mo = Math.round((100 * (newest - trailAvg)) / trailAvg);
      if (mo <= -8 && acc.headline !== "At-Risk" && acc.headline !== "Decelerating" && acc.headline !== "Lapsed")
        signals.push({ k: "warn", t: `Early warning: the last 30 days ran ${Math.abs(mo)}% below its 3-month pace — softening before the quarter trend shows it.` });
      else if (mo >= 12 && acc.headline !== "Accelerating")
        signals.push({ k: "up", t: `Quietly accelerating: the last 30 days ran ${mo}% above its 3-month pace.` });
    }
  }

  // ---- concentration risk ----
  if (totalL90 > 0 && active.length >= 2) {
    const top = active.slice().sort((a, b) => (b.l90 || 0) - (a.l90 || 0))[0];
    const share = Math.round((100 * (top.l90 || 0)) / totalL90);
    if (share >= 45) signals.push({ k: "warn", t: `Concentrated: ${share}% of volume rides on ${top.item_name} — protect that facing above all.` });
  }

  // ---- reorder timing ----
  if (acc.last_order_w != null && acc.last_order_w >= 8 && acc.headline !== "Lapsed")
    signals.push({ k: "warn", t: `Due for a reorder — ${acc.last_order_w} weeks since the last one.` });

  // ---- SKU headroom vs channel median ----
  if (b && b.chan_med_sk != null && acc.live_placements != null) {
    const gapSk = b.chan_med_sk - acc.live_placements;
    if (gapSk >= 2) signals.push({ k: "opp", t: `Room in the set: ${acc.live_placements} SKUs vs the ${chan} median of ${b.chan_med_sk} — ${gapSk} slots of headroom.` });
  }

  // ---- moves ----
  const moves = [];
  if (lost.length) {
    const avgMo = active.length ? Math.round(totalL90 / active.length / 3) : 0;
    moves.push(`Win back ${lost[0].item_name}${avgMo > 0 ? ` — ~${avgMo} cs/mo at this account's typical SKU rate` : ""}.`);
  }
  if (growing.length) moves.push(`Ride ${growing.slice(0, 2).map((i) => i.item_name).join(" and ")} — already accelerating; lock the reorder.`);
  if (white.length) moves.push(`Sell in ${white[0].item_name} — #${white[0].market_rank} in the market, not carried here.`);

  return { lead: lead.trim(), signals: signals.slice(0, 3), moves: moves.slice(0, 3) };
}

// trend bars tinted by the account's health — green growing · gold slowing · red lapsed
function graphColor(hd) {
  switch (String(hd || "").toLowerCase()) {
    case "accelerating": return "#4a9068";
    case "new": return "#5bb47e";
    case "decelerating": return "#c2922e";
    case "at-risk": case "atrisk": case "at risk": return "#cf7a3a";
    case "lapsed": return "#b0573a";
    default: return "#6aa06a";
  }
}

// trend bar coloring: light grey, with the last ~4 bars fading into the account's
// health color (dark green accelerating · light green new · yellow slowing ·
// orange at-risk · red lapsed · grey steady = maintain).
const TREND_GREY = "#d3d7db";
function hexMix(a, b, t) {
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, "0")).join("");
}
function healthColor(hd) {
  switch (String(hd || "").toLowerCase()) {
    case "accelerating": return "#2f8f5e";
    case "new": return "#7bc49a";
    case "decelerating": return "#e0b32e";
    case "at-risk": case "atrisk": case "at risk": return "#d9662a";
    case "lapsed": return "#c0392b";
    default: return "#b8bcc2"; // steady / stable → grey (maintain)
  }
}

function Trend({ spark, color, healthCol }) {
  if (!spark || spark.length < 2) return null;
  const hc = healthCol || "#b8bcc2";
  const n = spark.length;
  const fadeStart = Math.max(0, n - 4);
  const W = 620, H = 156, padL = 34, padR = 12, padT = 16, padB = 26;
  const top = Math.max(...spark) || 1;
  const loV = Math.min(...spark.filter(x => x > 0), top);
  const slot = (W - padL - padR) / n;
  const barW = slot * 0.64;
  const gap = (slot - barW) / 2;
  const X = (i) => padL + i * slot;
  const Y = (v) => padT + (1 - v / top) * (H - padT - padB);
  const base = H - padB;
  const last = spark[n - 1];

  const yTicks = [0, Math.round(top / 2), top];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="rolling-90 cases, last 12 periods">
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={Y(t)} x2={W - padR} y2={Y(t)} stroke="var(--border)" strokeWidth="0.5" />
          <text x={padL - 6} y={Y(t) + 3} textAnchor="end" fontSize="10" fill="var(--text-3)">{t}</text>
        </g>
      ))}
      {spark.map((v, i) => {
        const x = X(i) + gap;
        const y = Y(v);
        const h = Math.max(v > 0 ? 2 : 0, base - y);
        const t = i < fadeStart ? 0 : (n - 1 - fadeStart > 0 ? (i - fadeStart) / (n - 1 - fadeStart) : 1);
        const fill = i < fadeStart ? TREND_GREY : hexMix(TREND_GREY, hc, Math.max(0, Math.min(1, t)));
        return (
          <rect key={i} x={x.toFixed(1)} y={(base - h).toFixed(1)} width={barW.toFixed(1)} height={h.toFixed(1)}
            rx="2" fill={fill}
            style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: "barGrow .45s cubic-bezier(.34,1.56,.64,1) both", animationDelay: `${i * 25}ms` }} />
        );
      })}
      <text x={X(n - 1) + gap + barW / 2} y={Y(last) - 5} textAnchor="middle" fontSize="11" fontWeight="500" fill="var(--text)">{last}</text>
      {spark.map((v, i) => {
        // spark[0] is oldest (period 11), spark[n-1] is newest (period 0)
        const monthsAgo = (n - 1) - i;
        return (
          <text key={i} x={X(i) + slot / 2} y={H - 8} textAnchor="middle" fontSize="8.5" fill="var(--text-3)">
            {monthLabel(monthsAgo)}
          </text>
        );
      })}
    </svg>
  );
}

// in-place order history: a row of green order boxes (replaces the trend chart)
function ItemBoxes({ name, months, total, lastOrdered, lost, onClose }) {
  const series = [...months].reverse();
  const vals = series.map((m) => m.cases).filter((x) => x > 0);
  const hi = Math.max(...vals, 1);
  const lo = vals.length ? Math.min(...vals) : hi;
  return (
    <div style={{ animation: "dotIn .28s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 2px 7px" }}>
        <div style={{ fontSize: 11, color: "var(--text-3)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><strong style={{ color: "var(--text-2)", fontWeight: 600 }}>{name}</strong> · cases · 30-day periods</div>
        <button onClick={onClose} aria-label="Back to account trend" style={{ flexShrink: 0, border: "none", background: "var(--surface-2)", color: "var(--text-2)", borderRadius: 20, fontSize: 11, fontWeight: 600, padding: "4px 11px", cursor: "pointer", fontFamily: "inherit" }}>✕ close</button>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {series.map((m, i) => {
          const t = hi > lo ? 0.18 + 0.82 * ((m.cases - lo) / (hi - lo)) : 1;
          const txt = t > 0.5 ? "#fff" : "var(--accent-deep)";
          return (
            <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0, animation: "dotIn .3s ease both", animationDelay: `${i * 26}ms` }}>
              <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600,
                background: m.cases > 0 ? greenBar(m.cases, lo, hi) : "var(--surface)",
                border: m.cases > 0 ? "none" : "1px dashed var(--border-strong)",
                color: m.cases > 0 ? txt : "var(--text-3)" }}>{m.cases > 0 ? m.cases : ""}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}>{monthLabel(m.i)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 8, padding: "0 2px" }}>
        {total} cs over 12 months · last ordered {lastOrdered}{lost ? " · lost" : ""}
      </div>
    </div>
  );
}

// color a suggestion by its verb — win back (rust) · ride (green) · sell in (blue)
function moveColor(m) {
  const s = String(m || "").toLowerCase();
  if (s.startsWith("win back")) return "#b0573a";
  if (s.startsWith("ride")) return "#4a9068";
  if (s.startsWith("sell in")) return "#3d6e93";
  return "#4a9068";
}

export default function AccountOverview() {
  const { id } = useParams();
  const router = useRouter();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [sel, setSel] = useState(null);        // open SKU { product_key, item_name } or null
  const [itemData, setItemData] = useState(null);
  const [itemErr, setItemErr] = useState(false);
  const selRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [accRes, benRes, itemRes, mktRes] = await Promise.all([
          supabase.from("account_list").select("*").eq("account_id", id).maybeSingle(),
          supabase.from("account_benchmark").select("*").eq("account_id", id).maybeSingle(),
          supabase.from("item_grid").select("product_key, item_name, l90, cell_state, last_sale_w").eq("account_id", id),
          supabase.from("item_market").select("product_key, item_name, market_rank").order("market_rank"),
        ]);
        if (accRes.error) throw accRes.error;
        const acc = accRes.data;
        if (!acc) { setErr("Account not found."); return; }
        const items = (itemRes.data || []);
        const carried = new Set(items.map((i) => i.product_key));
        const white = (mktRes.data || []).filter((m) => !carried.has(m.product_key)).slice(0, 10);
        // peer cohort for the active-SKU comparison: same on/off premise (strict)
        const onP = String(acc.channel || "").toUpperCase().startsWith("ON");
        let cohort = [], cf = 0;
        while (true) {
          const { data: cd, error: ce } = await supabase.from("account_list")
            .select("account_id, live_placements, channel_type, state, account_weight, city, prior90_pct")
            .ilike("channel", onP ? "ON%" : "OFF%")
            .range(cf, cf + 4999);
          if (ce) throw ce;
          cohort = cohort.concat(cd || []);
          if (!cd || cd.length < 5000) break;
          cf += 5000;
        }
        // ---- real sell-story peer aggregates (city + channel, fallback to state) ----
        // resilient: a peer-query hiccup falls back to empty aggregates, never blanks the page
        let areaAvgMoReal = null, wsReal = [], penetration = null, peerTopGrowth = 0, peerAvgGrowth = null;
        try {
          const chT = acc.channel_type;
          let peers = cohort.filter((a) => a.account_id !== acc.account_id && (!chT || a.channel_type === chT) && a.city === acc.city);
          if (peers.length < 8) peers = cohort.filter((a) => a.account_id !== acc.account_id && (!chT || a.channel_type === chT) && a.state === acc.state);
          const peerIds = peers.slice(0, 360).map((a) => a.account_id);
          let pItems = [];
          for (let i = 0; i < peerIds.length; i += 150) {
            const { data: pd } = await supabase.from("item_grid").select("account_id, product_key, item_name, l90").in("account_id", peerIds.slice(i, i + 150));
            pItems = pItems.concat(pd || []);
          }
          const byProd = {}, byAcct = {}, carrying = new Set();
          for (const r of pItems) {
            if ((r.l90 || 0) > 0) {
              (byProd[r.product_key] || (byProd[r.product_key] = { name: r.item_name, vals: [] })).vals.push((r.l90 || 0) / 3);
              byAcct[r.account_id] = (byAcct[r.account_id] || 0) + ((r.l90 || 0) / 3) * profitPerCase(r.item_name, 0.30);
              carrying.add(r.account_id);
            }
          }
          const acctProfits = Object.values(byAcct);
          areaAvgMoReal = acctProfits.length ? median(acctProfits) : null;
          const carriedSet = new Set(items.map((i) => i.product_key));
          wsReal = Object.entries(byProd).filter(([pk]) => !carriedSet.has(pk)).map(([pk, o]) => {
            const vel = median(o.vals);
            return { name: o.name, vel: Math.round(vel * 10) / 10, carriers: o.vals.length, dollars: vel * profitPerCase(o.name, 0.30) };
          }).sort((a, b) => b.dollars - a.dollars).slice(0, 5);
          penetration = { carry: carrying.size, total: peers.length };
          peerTopGrowth = peers.reduce((m, a) => Math.max(m, a.prior90_pct || 0), 0);
          peerAvgGrowth = peers.length ? peers.reduce((s, a) => s + (a.prior90_pct || 0), 0) / peers.length : null;
        } catch { /* leave empty aggregates */ }
        setD({ acc, bench: benRes.data, items, white, cohort, onP, areaAvgMoReal, wsReal, penetration, peerTopGrowth, peerAvgGrowth });
      } catch (e) {
        setErr(e.message || "load failed");
      }
    })();
  }, [id]);

  // open a SKU's order history in place of the trend chart (no navigation)
  async function openItem(it) {
    if (sel && sel.product_key === it.product_key) { closeItem(); return; }
    selRef.current = it.product_key;
    setSel({ product_key: it.product_key, item_name: it.item_name });
    setItemData(null); setItemErr(false);
    if (chartRef.current) chartRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const { data, error } = await supabase.from("depletions_window")
      .select("window_index, cases").eq("account_id", id).eq("product_key", it.product_key).lte("window_index", 11);
    if (selRef.current !== it.product_key) return; // superseded by another click
    if (error) { setItemErr(true); return; }
    const byIdx = {};
    for (const r of (data || [])) byIdx[r.window_index] = Number(r.cases);
    const months = [];
    for (let i = 0; i < 12; i++) months.push({ i, cases: byIdx[i] || 0 });
    const total = months.reduce((s, m) => s + m.cases, 0);
    const firstIdx = months.find((m) => m.cases > 0)?.i;
    setItemData({ months, total, lastOrdered: firstIdx == null ? "—" : monthLabel(firstIdx), lost: (byIdx[0] || 0) === 0 });
  }
  function closeItem() { selRef.current = null; setSel(null); setItemData(null); setItemErr(false); }

  if (err) return <div className="wrap"><p className="state-msg">Couldn’t load account. {err}</p></div>;
  if (!d) return <Splash />;

  const { acc, bench, items, white, cohort = [], onP, areaAvgMoReal = null, wsReal = [], penetration = null, peerTopGrowth = 0, peerAvgGrowth = null } = d;
  const head = HEAD[acc.headline] || HEAD["Stable"];
  const pct = acc.prior90_pct;
  const dl = acc.placements_delta;

  // active-SKU comparison: same-premise peers, prefer same channel_type in-state,
  // broaden to channel-wide, then all same-premise; null (just the number) if < 5 peers.
  const onWord = onP ? "on-premise" : "off-premise";
  const skuComp = (() => {
    const mine = acc.live_placements || 0;
    const base = cohort.filter((a) => a.account_id !== acc.account_id);
    const ch = acc.channel_type;
    const tiers = [
      { peers: base.filter((a) => ch && a.channel_type === ch && a.state === acc.state), label: `similar ${ch ? titleCase(ch) + " " : ""}${onWord} accounts in ${STNAME[acc.state] || acc.state}` },
      { peers: ch ? base.filter((a) => a.channel_type === ch) : [], label: `${ch ? titleCase(ch) + " " : ""}${onWord} accounts` },
      { peers: base, label: `${onWord} accounts across the book` },
    ];
    for (const t of tiers) {
      const vals = t.peers.map((a) => a.live_placements || 0);
      if (vals.length >= 5) {
        const med = median(vals);
        if (med > 0) return { pct: Math.round(((mine - med) / med) * 100), delta: mine - med, n: vals.length, label: t.label };
      }
    }
    return null;
  })();
  // SKUs vs peers as a plain, understandable count: <0.5 rounds to flat (≈), else ±N
  const skuDelta = skuComp ? Math.round(skuComp.delta) : null;

  // butter-up: only clearly-positive, real signals about this account
  const praise = [];
  if ((pct || 0) > 5) praise.push(`Velocity's climbing — L90 up ${Math.abs(pct)}% vs the prior quarter.`);
  if (skuDelta > 0) praise.push(`Carries ${skuDelta} more SKU${skuDelta === 1 ? "" : "s"} than similar accounts — a fuller set.`);
  if (bench && bench.pct_overall != null && bench.pct_overall <= 15) praise.push(`Top ${bench.pct_overall}% account in the book — a flagship.`);
  if (acc.last_order_w != null && acc.last_order_w <= 3 && acc.headline !== "Lapsed") praise.push("Ordered recently — actively engaged.");

  const skus = [...items].sort((a, b) => {
    const al = a.cell_state === "lost_recent", bl = b.cell_state === "lost_recent";
    if (al !== bl) return al ? 1 : -1;
    return b.l90 - a.l90;
  });
  const brief = buildBriefing(acc, bench, items, white);
  const headline = acc.headline === "Accelerating" ? `Heating up — L90 up ${Math.abs(pct || 0)}% vs the prior quarter`
    : acc.headline === "At-Risk" ? `At risk — L90 down ${Math.abs(pct || 0)}% and shedding placements`
    : acc.headline === "Decelerating" ? `Cooling — L90 down ${Math.abs(pct || 0)}% from the prior quarter`
    : acc.headline === "Stable" ? "Holding steady quarter over quarter"
    : acc.headline === "New" ? "A new account, still ramping"
    : acc.headline === "Lapsed" ? "Gone quiet — no orders in the last 90 days"
    : `Tracking ${(pct || 0) >= 0 ? "up" : "down"} ${Math.abs(pct || 0)}%`;
  const skuBullet = skuComp
    ? (skuComp.pct >= 5 ? `Carries ${acc.live_placements} SKUs — ${skuComp.pct}% more than ${skuComp.label}`
      : skuComp.pct <= -5 ? `Carries ${acc.live_placements} SKUs — ${Math.abs(skuComp.pct)}% fewer than ${skuComp.label}`
        : `Carries ${acc.live_placements} SKUs — about the same as ${skuComp.label}`)
    : `Carries ${acc.live_placements || 0} active SKUs`;
  // lapsed account: the SKUs it used to carry + its former standing (percentile by
  // annualized volume among same-premise peers, since account_weight still carries
  // the trailing year of pre-lapse depletions).
  const lapsed = acc.headline === "Lapsed";
  const lostSkus = [...items].filter((i) => i.cell_state === "lost_recent").sort((a, b) => (a.last_sale_w ?? 99) - (b.last_sale_w ?? 99));

  // area standing — rank this account by annualized volume among same-premise peers
  // in its area (city first, then state). Rule: only ever call it out when it lands in
  // the TOP 10% of its area; if the account has since gone dark it reads "used to be a
  // top N%". Anything below top-10% is left unsaid (no more "top 15%/50%" labels).
  const areaStanding = (() => {
    const wgt = acc.account_weight || 0;
    if (wgt <= 0) return null;
    const ch = acc.channel_type;
    const inArea = (match) => cohort.filter((a) => a.account_id !== acc.account_id && a.account_weight > 0 && (!ch || a.channel_type === ch) && match(a));
    let peers = inArea((a) => acc.city && a.city === acc.city), where = acc.city ? titleCase(acc.city) : null;
    if (peers.length < 12) { peers = inArea((a) => a.state === acc.state); where = STNAME[acc.state] || acc.state; }
    if (peers.length < 12 || !where) return null;
    const rank = Math.max(1, Math.round((100 * (peers.filter((a) => a.account_weight > wgt).length + 1)) / (peers.length + 1)));
    if (rank > 10) return null;   // only ever surface genuine top-10%-in-area accounts
    return lapsed
      ? `Used to be a top ${rank}% account in ${where} — worth winning back.`
      : `Top ${rank}% account in ${where}.`;
  })();

  const bullets = lapsed
    ? [
        areaStanding || `Gone dark${acc.last_order_w != null ? ` ${acc.last_order_w} weeks ago` : ""} — no orders in the last 90 days.`,
        `${acc.account_weight ? acc.account_weight.toLocaleString() + " cs/yr" : "Real volume"} across ${lostSkus.length} SKU${lostSkus.length === 1 ? "" : "s"} before it went quiet.`,
      ]
    : [brief.signals[0] ? brief.signals[0].t : "Holding its pace quarter over quarter.", areaStanding].filter(Boolean);

  // profit/mo (real, item-level) + rounded display + ± vs nearby peers
  const accountMo = items.reduce((s, i) => s + ((i.l90 || 0) / 3) * profitPerCase(i.item_name, 0.30), 0);
  const profitPct = areaAvgMoReal ? Math.round((accountMo / areaAvgMoReal - 1) * 100) : null;
  const profitApprox = "$" + round5(accountMo).toLocaleString();
  // one plain line about the overall market: channel + area + trend from nearby peers
  const mkTrend = peerAvgGrowth == null ? null : peerAvgGrowth > 3 ? "growing" : peerAvgGrowth < -3 ? "softening" : "holding steady";
  const mkChan = titleCase(acc.channel_type || acc.channel || "these") ;
  const mkWhere = acc.city ? `around ${titleCase(acc.city)}` : "in the area";
  const marketLine = mkTrend ? `${mkChan} accounts ${mkWhere} are ${mkTrend}.` : null;
  // whitespace: prefer the real nearby-velocity list; if peers were thin, fall back to
  // the market-wide top sellers this account doesn't carry — so the section never blanks
  const wsList = wsReal.length
    ? wsReal.slice(0, 5).map((w) => ({ name: w.name, vel: w.vel, dollars: w.dollars }))
    : white.slice(0, 5).map((w) => ({ name: w.item_name, rank: w.market_rank }));

  // news talking points — state-tuned (down to state level for now), IPA-focused;
  // falls back to national when the state has no fresh signal. Each opens its source.
  const news = getBullets(acc.state, 3);
  const newsScope = news.some((s) => s.scope === acc.state) ? (STNAME[acc.state] || acc.state) : "National";

  return (
    <div className="wrap pagefade">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "14px 0 10px" }}>
        <div style={{ flexShrink: 0, marginTop: 1 }}><TreeGlyph headline={acc.headline} pct={pct} h={50} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 600, lineHeight: 1.15, color: "var(--text)" }}>{acc.account_name}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            {acc.city}{acc.state ? `, ${acc.state}` : ""} · {titleCase(acc.channel)} · {acc.chain || "Independent"}
          </div>
          {(acc.area_type || acc.median_hh_income != null) && (
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 4 }}>
              {acc.area_type && <span style={{ fontWeight: 700, color: "var(--accent-deep)" }}>{acc.area_type}</span>}
              {acc.median_hh_income != null && <> · ~${Math.round(acc.median_hh_income / 1000)}K median HH income</>}
              {acc.total_population != null && <> · pop. {acc.total_population >= 1000 ? Math.round(acc.total_population / 1000) + "K" : acc.total_population.toLocaleString()}</>}
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: "var(--r-sm)", whiteSpace: "nowrap", background: head.bg, color: head.fg }}>{acc.headline}</span>
      </div>

      {/* headline stats — annualized, L90, active SKUs */}
      <div style={{ display: "flex", border: "0.5px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", marginBottom: 11 }}>
        {[
          ["annualized", <>{acc.account_weight} <span style={{ fontSize: 11, color: "var(--text-2)" }}>cs</span></>, null],
          ["L90 cases", <>{acc.cur90} {pct != null && <span style={{ fontSize: 11, color: pct < 0 ? "var(--down)" : pct > 0 ? "var(--up)" : "var(--text-3)" }}>{pct > 0 ? "▲" : pct < 0 ? "▼" : ""}{Math.abs(pct)}%</span>}</>, "vs prior 90D"],
          ["active SKUs", <>{acc.live_placements} {dl !== 0 && <span style={{ fontSize: 11, color: dl < 0 ? "var(--down)" : "var(--up)" }}>{dl > 0 ? "+" : ""}{dl}</span>}</>, skuComp ? <span style={{ color: skuDelta > 0 ? "var(--up)" : skuDelta < 0 ? "var(--down)" : "var(--text-3)" }}>{skuDelta === 0 ? "≈ peers" : `${skuDelta > 0 ? "+" : ""}${skuDelta} SKU${Math.abs(skuDelta) === 1 ? "" : "s"} vs peers`}</span> : null],
          ["profit / mo", <span style={{ color: "var(--accent-deep)" }}>{profitApprox}</span>, profitPct != null ? <span style={{ color: profitPct > 0 ? "var(--up)" : profitPct < 0 ? "var(--down)" : "var(--text-3)" }}>{profitPct > 0 ? "+" : ""}{profitPct}% vs nearby</span> : "at 30% margin"],
        ].map(([label, val, note], i) => (
          <div key={i} style={{ flex: 1, padding: "9px 10px", borderRight: i < 3 ? "0.5px solid var(--border)" : "none" }}>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{val}</div>
            {note && <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 2 }}>{note}</div>}
          </div>
        ))}
      </div>

      {/* story brief — headline · two facts · market chips · plays */}
      <div style={{ position: "relative", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--r-md)", padding: "14px 15px", marginBottom: 12, boxShadow: "var(--shadow-sm)" }}>
        <span aria-hidden="true" style={{ position: "absolute", top: -1, left: -1, width: 15, height: 15, borderTop: `2px solid ${head.bc}`, borderLeft: `2px solid ${head.bc}`, borderTopLeftRadius: 7 }} />
        <span aria-hidden="true" style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderBottom: `1.5px solid ${head.bc}`, borderRight: `1.5px solid ${head.bc}`, borderBottomRightRadius: 7, opacity: 0.4 }} />

        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: "var(--text)", letterSpacing: "-0.2px" }}>{headline}</div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
          {bullets.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span aria-hidden="true" style={{ flexShrink: 0, width: 5, height: 5, borderRadius: 3, marginTop: 6, background: head.bc, opacity: 0.7 }} />
              <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--text-2)" }}>{t}</span>
            </div>
          ))}
        </div>

        {marketLine && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 7 }}>
            <span aria-hidden="true" style={{ flexShrink: 0, width: 5, height: 5, borderRadius: 3, marginTop: 6, background: "var(--text-3)" }} />
            <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--text-2)" }}>{marketLine}</span>
          </div>
        )}

        {brief.moves.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 11, borderTop: "0.5px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>Plays to consider <span style={{ fontWeight: 500, opacity: 0.75 }}>· you know the account best</span></div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 9 }}>
              {brief.moves.map((m, i) => { const col = moveColor(m); const [lead, ...rest] = m.split(" — "); const tail = rest.join(" — "); return (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <span aria-hidden="true" style={{ flexShrink: 0, width: 3, height: 15, borderRadius: 2, marginTop: 1, background: col }} />
                  <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--text-2)" }}><span style={{ fontWeight: 700, color: "var(--text)" }}>{lead}</span>{tail ? ` — ${tail}` : ""}</span>
                </div>
              ); })}
            </div>
          </div>
        )}
      </div>

      <div ref={chartRef} style={{ scrollMarginTop: 12, minHeight: 96 }}>
        {sel ? (
          itemErr ? (
            <div style={{ fontSize: 12, color: "var(--down)", padding: "12px 2px" }}>Couldn’t load orders. <button onClick={closeItem} style={{ border: "none", background: "none", color: "var(--accent-deep)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>back</button></div>
          ) : !itemData ? (
            <div style={{ height: 96, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 12 }}>Loading orders…</div>
          ) : (
            <ItemBoxes name={sel.item_name} months={itemData.months} total={itemData.total} lastOrdered={itemData.lastOrdered} lost={itemData.lost} onClose={closeItem} />
          )
        ) : (
          <>
            <div style={{ fontSize: 11, color: "var(--text-3)", padding: "8px 2px 2px" }}>rolling-90 cases · last 12 months</div>
            <Trend spark={acc.spark} color={head.fg} healthCol={healthColor(acc.headline)} />
          </>
        )}
      </div>

      {(() => { const chW = 50, pW = 60, tW = 12; const colHead = (a, b) => (
        <div style={{ display: "flex", alignItems: "center", padding: "0 6px 3px" }}>
          <span style={{ flex: 1 }} />
          <span style={{ width: chW, textAlign: "right", fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.3 }}>{a}</span>
          <span style={{ width: pW, textAlign: "right", fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.3 }}>{b}</span>
          <span style={{ width: tW }} />
        </div>
      ); return (
      <>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 3, letterSpacing: "0.3px" }}>WHAT&apos;S ON THE SHELF</div>
      {colHead("cases/mo", "profit/mo")}
      {skus.map((k, i) => {
        const [bg, fg, lbl] = SK[k.cell_state] || SK.stable;
        const lost = k.cell_state === "lost_recent";
        return (
          <div key={i} onClick={() => openItem(k)} style={{ display: "flex", alignItems: "center", padding: "8px 6px", borderRadius: 7, borderBottom: "0.5px solid var(--border)", cursor: "pointer", background: sel && sel.product_key === k.product_key ? "var(--surface-2)" : "transparent" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.item_name}</span>
              <span style={{ flexShrink: 0, fontSize: 10.5, padding: "1px 7px", borderRadius: 6, background: bg, color: fg }}>{lbl}</span>
            </span>
            <span style={{ width: chW, textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{lost ? <span style={{ color: "var(--atrisk-ink)", fontWeight: 700 }}>✕</span> : ((k.l90 || 0) / 3).toFixed(1)}</span>
            <span style={{ width: pW, textAlign: "right", fontSize: 12.5, fontWeight: 700, color: "var(--accent-deep)" }}>{lost || !(k.l90 > 0) ? "" : `$${round5((k.l90 / 3) * profitPerCase(k.item_name, 0.30)).toLocaleString()}`}</span>
            <span aria-hidden="true" style={{ width: tW, textAlign: "right", color: "var(--accent-deep)", fontWeight: 700, fontSize: 12 }}>{sel && sel.product_key === k.product_key ? "▾" : "›"}</span>
          </div>
        );
      })}

      {lapsed && lostSkus.length > 0 ? (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", margin: "16px 0 3px", letterSpacing: "0.3px" }}>LOST SKUS · win these back</div>
          {colHead("", "last sold")}
          {lostSkus.slice(0, 6).map((k, i) => (
            <div key={i} onClick={() => openItem(k)} style={{ display: "flex", alignItems: "center", padding: "8px 6px", borderBottom: "0.5px solid var(--border)", cursor: "pointer", background: sel && sel.product_key === k.product_key ? "var(--surface-2)" : "transparent" }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--pop-warm-deep)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.item_name}</span>
              <span style={{ width: chW }} />
              <span style={{ width: pW, textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--text-3)" }}>{k.last_sale_w != null ? `${k.last_sale_w}w ago` : "—"}</span>
              <span aria-hidden="true" style={{ width: tW, textAlign: "right", color: "var(--accent-deep)", fontWeight: 700, fontSize: 12 }}>{sel && sel.product_key === k.product_key ? "▾" : "›"}</span>
            </div>
          ))}
        </>
      ) : wsList.length > 0 ? (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", margin: "16px 0 3px", letterSpacing: "0.3px" }}>{wsReal.length ? "WHITESPACE · top sellers nearby, not carried here" : "WHITESPACE · top market sellers, not carried here"}</div>
          {colHead(wsReal.length ? "cases/mo" : "", wsReal.length ? "est. $/mo" : "market rank")}
          {wsList.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "8px 6px", borderBottom: "0.5px solid var(--border)" }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span>
              {w.vel != null ? (
                <>
                  <span style={{ width: chW, textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text-3)" }}>{w.vel.toFixed(1)}</span>
                  <span style={{ width: pW, textAlign: "right", fontSize: 12.5, fontWeight: 700, color: "var(--text-3)" }}>${round5(w.dollars).toLocaleString()}</span>
                </>
              ) : (
                <>
                  <span style={{ width: chW }} />
                  <span style={{ width: pW, textAlign: "right", fontSize: 12.5, fontWeight: 700, color: "var(--text-3)" }}>#{w.rank}</span>
                </>
              )}
              <span style={{ width: tW }} />
            </div>
          ))}
        </>
      ) : null}
      </>
      ); })()}

      <div style={{ height: 16 }} />
      {/* IPA news — up to 3 state-tuned talking points, each opens its source headline */}
      {news.length > 0 && (
        <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--r-md)", padding: "12px 14px", marginBottom: 12, boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-deep)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h13v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M17 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2" /><path d="M7 8h7M7 11h7M7 14h4" /></svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.3px", textTransform: "uppercase" }}>{FOCUS.label} news · {newsScope}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {news.map((s, i) => (
              <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", gap: 9, alignItems: "flex-start", textDecoration: "none", padding: "8px 2px", borderBottom: i < news.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                <span aria-hidden="true" style={{ flexShrink: 0, width: 5, height: 5, borderRadius: 3, marginTop: 6, background: "var(--pop-cool)" }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, lineHeight: 1.45, color: "var(--text-2)" }}>{s.angle}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--accent-deep)" }}>
                    {s.source}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
      <ItemEstimator items={items} wsReal={wsReal} />
      <div style={{ height: 12 }} />
      <AccountTag acc={acc} items={items} white={white} />

      <div style={{ height: 76 }} />
    </div>
  );
}