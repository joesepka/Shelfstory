"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import LoadingScreen from "../../../components/LoadingScreen";
import TreeGlyph from "../../../components/TreeGlyph";
import { greenBar } from "../../../lib/utils";

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

function Trend({ spark, color }) {
  if (!spark || spark.length < 2) return null;
  const n = spark.length;
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
        const f = greenBar(v, loV, top);
        return (
          <rect key={i} x={x.toFixed(1)} y={(base - h).toFixed(1)} width={barW.toFixed(1)} height={h.toFixed(1)}
            rx="2" fill={f}
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
        const white = (mktRes.data || []).filter((m) => !carried.has(m.product_key)).slice(0, 3);
        // peer cohort for the active-SKU comparison: same on/off premise (strict)
        const onP = String(acc.channel || "").toUpperCase().startsWith("ON");
        let cohort = [], cf = 0;
        while (true) {
          const { data: cd, error: ce } = await supabase.from("account_list")
            .select("account_id, live_placements, channel_type, state")
            .ilike("channel", onP ? "ON%" : "OFF%")
            .range(cf, cf + 4999);
          if (ce) throw ce;
          cohort = cohort.concat(cd || []);
          if (!cd || cd.length < 5000) break;
          cf += 5000;
        }
        setD({ acc, bench: benRes.data, items, white, cohort, onP });
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
  if (!d) return <LoadingScreen />;

  const { acc, bench, items, white, cohort = [], onP } = d;
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
        if (med > 0) return { pct: Math.round(((mine - med) / med) * 100), n: vals.length, label: t.label };
      }
    }
    return null;
  })();

  const skus = [...items].sort((a, b) => {
    const al = a.cell_state === "lost_recent", bl = b.cell_state === "lost_recent";
    if (al !== bl) return al ? 1 : -1;
    return b.l90 - a.l90;
  });
  const brief = buildBriefing(acc, bench, items, white);

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "14px 0 10px" }}>
        <div style={{ flexShrink: 0, marginTop: 1 }}><TreeGlyph headline={acc.headline} pct={pct} h={50} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.15, color: "var(--text)" }}>{acc.account_name}</div>
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

      {bench && (
        <div style={{ display: "flex", gap: 6, paddingBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: "var(--new-bg)", color: "var(--new-ink)" }}>Top {bench.pct_overall}% overall</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: "var(--surface-2)", color: "var(--text-2)" }}>Top {bench.pct_channel}% in {titleCase(acc.channel)}</span>
        </div>
      )}

      <div style={{ position: "relative", background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: "13px 14px", marginBottom: 14 }}>
        <span aria-hidden="true" style={{ position: "absolute", top: -1, left: -1, width: 15, height: 15, borderTop: `2px solid ${head.bc}`, borderLeft: `2px solid ${head.bc}`, borderTopLeftRadius: 7 }} />
        <span aria-hidden="true" style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderBottom: `1.5px solid ${head.bc}`, borderRight: `1.5px solid ${head.bc}`, borderBottomRightRadius: 7, opacity: 0.4 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", marginBottom: 6, letterSpacing: "0.3px", textTransform: "uppercase" }}>Pre-call briefing</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text)" }}>{brief.lead}</div>
        {brief.signals.length > 0 && (
          <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 6 }}>
            {brief.signals.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span aria-hidden="true" style={{ flexShrink: 0, width: 6, height: 6, borderRadius: 3, marginTop: 5, background: sigColor(s.k) }} />
                <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--text-2)" }}>{s.t}</span>
              </div>
            ))}
          </div>
        )}
        {brief.moves.length > 0 && (
          <div style={{ marginTop: 11, paddingTop: 10, borderTop: "0.5px solid var(--border)" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--accent-deep)", letterSpacing: "0.3px", textTransform: "uppercase" }}>Move</span>
            <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 5 }}>
              {brief.moves.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.45, color: "var(--text)" }}>
                  <span aria-hidden="true" style={{ color: "var(--accent-deep)", flexShrink: 0 }}>→</span><span>{m}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", border: "0.5px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        {[
          ["annualized", <>{acc.account_weight} <span style={{ fontSize: 11, color: "var(--text-2)" }}>cs</span></>, null],
          ["L90 cases", <>{acc.cur90} {pct != null && <span style={{ fontSize: 11, color: pct < 0 ? "var(--down)" : pct > 0 ? "var(--up)" : "var(--text-3)" }}>{pct > 0 ? "▲" : pct < 0 ? "▼" : ""}{Math.abs(pct)}%</span>}</>, "vs prior 90D"],
          ["active SKUs", <>{acc.live_placements} {dl !== 0 && <span style={{ fontSize: 11, color: dl < 0 ? "var(--down)" : "var(--up)" }}>{dl > 0 ? "+" : ""}{dl}</span>}</>, skuComp ? <span style={{ color: skuComp.pct > 0 ? "var(--up)" : skuComp.pct < 0 ? "var(--down)" : "var(--text-3)" }}>{skuComp.pct > 0 ? "+" : ""}{skuComp.pct}% vs peers</span> : null],
        ].map(([label, val, note], i) => (
          <div key={i} style={{ flex: 1, padding: "10px 12px", borderRight: i < 2 ? "0.5px solid var(--border)" : "none" }}>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{val}</div>
            {note && <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 2 }}>{note}</div>}
          </div>
        ))}
      </div>

      {bench && bench.wt_vs_chan_pct != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 2px", marginTop: 2 }}>
          <span style={{ fontSize: 15, color: "var(--text-2)" }}>▦</span>
          <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.4 }}>
            Does <strong style={{ fontWeight: 600, color: "var(--text)" }}>{bench.wt_vs_chan_pct > 0 ? "+" : ""}{bench.wt_vs_chan_pct}%</strong>
            {" the volume of the median "}{titleCase(acc.channel)}{"-channel account "}
            ({acc.account_weight} vs {bench.chan_med_wt} cs).
          </div>
        </div>
      )}

      {skuComp && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 2px 2px" }}>
          <span style={{ fontSize: 15, color: skuComp.pct > 0 ? "var(--up)" : skuComp.pct < 0 ? "var(--down)" : "var(--text-2)" }}>▥</span>
          <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.4 }}>
            Carries <strong style={{ fontWeight: 600, color: "var(--text)" }}>{acc.live_placements} active SKUs</strong> — {skuComp.pct >= 5
              ? <><strong style={{ fontWeight: 600, color: "var(--up)" }}>{skuComp.pct}% more</strong> than </>
              : skuComp.pct <= -5
                ? <><strong style={{ fontWeight: 600, color: "var(--down)" }}>{Math.abs(skuComp.pct)}% fewer</strong> than </>
                : "about the same as "}{skuComp.label} <span style={{ color: "var(--text-3)" }}>({skuComp.n} compared)</span>.
          </div>
        </div>
      )}

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
            <Trend spark={acc.spark} color={head.fg} />
          </>
        )}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 6, letterSpacing: "0.3px" }}>WHAT&apos;S ON THE SHELF</div>
      {skus.map((k, i) => {
        const [bg, fg, lbl] = SK[k.cell_state] || SK.stable;
        return (
          <div key={i} onClick={() => openItem(k)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 6px", borderRadius: 7, borderBottom: "0.5px solid var(--border)", cursor: "pointer", background: sel && sel.product_key === k.product_key ? "var(--surface-2)" : "transparent" }}>
            <span style={{ fontSize: 13, color: "var(--text)" }}>{k.item_name}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 7, background: bg, color: fg }}>{lbl}</span>
              <span style={{ fontSize: 13, fontWeight: 600, minWidth: 34, textAlign: "right", color: "var(--text)" }}>
                {k.cell_state === "lost_recent" ? <span style={{ color: "var(--atrisk-ink)", fontWeight: 700 }}>✕</span> : `${k.l90} cs`}
              </span>
              <span aria-hidden="true" style={{ color: "var(--accent-deep)", fontWeight: 700, fontSize: 12, width: 8 }}>{sel && sel.product_key === k.product_key ? "▾" : "›"}</span>
            </span>
          </div>
        );
      })}

      {white.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", margin: "16px 0 6px", letterSpacing: "0.3px" }}>WHITESPACE · sells nearby, not carried here</div>
          {white.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 2px", borderBottom: "0.5px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text)" }}>{w.item_name}</span>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>#{w.market_rank} in market</span>
            </div>
          ))}
        </>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}