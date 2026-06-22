"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Splash from "../../components/Splash";


const STNAME = { IL: "Illinois", OH: "Ohio", MI: "Michigan", MO: "Missouri", IA: "Iowa", MN: "Minnesota", WI: "Wisconsin", IN: "Indiana" };
const DECLINING = new Set(["decelerating", "at-risk", "atrisk", "at risk", "lapsed"]);
const isDeclining = h => DECLINING.has(String(h || "").toLowerCase().trim());
const isNew = h => String(h || "").toLowerCase().trim() === "new";
const titleCase = s => String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const gpct = (c, p) => p > 0 ? Math.round(100 * (c - p) / p) : null;
const idsHref = (arr, cap = 40) => `/book?ids=${arr.slice(0, cap).join(",")}`;

const sel = { fontSize: 11.5, padding: "6px 9px", borderRadius: 8, border: "0.5px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-2)", fontFamily: "inherit", minWidth: 92, flexShrink: 0, appearance: "none", WebkitAppearance: "none" };

// corner-bracket accent in the card's tone color
function Brackets({ color }) {
  return (
    <>
      <span aria-hidden="true" style={{ position: "absolute", top: -1, left: -1, width: 15, height: 15, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, borderTopLeftRadius: 7 }} />
      <span aria-hidden="true" style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}`, borderBottomRightRadius: 7, opacity: 0.4 }} />
    </>
  );
}

function PlayCard({ play, open, onToggle, go }) {
  const tone = play.tone;
  const border = { red: "var(--pop-warm)", amber: "var(--watch-ink)", green: "var(--accent)", blue: "var(--pop-cool)", ink: "var(--text-3)" }[tone];
  const chip = { red: ["var(--atrisk-ink)", "var(--atrisk-bg)"], amber: ["var(--watch-ink)", "var(--watch-bg)"], green: ["var(--growing-ink)", "var(--growing-bg)"], blue: ["var(--new-ink)", "var(--new-bg)"], ink: ["var(--text-2)", "var(--surface-2)"] }[tone];
  return (
    <div onClick={onToggle} style={{ position: "relative", background: "var(--surface)", borderRadius: 14, margin: "0 16px 10px", padding: "14px 15px", boxShadow: "var(--shadow)", cursor: "pointer" }}>
      <Brackets color={border} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 7 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: .4, padding: "3px 8px", borderRadius: 9, color: chip[0], background: chip[1] }}>{play.tag}</span>
        {play.impact && <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", color: play.impactTone === "opp" ? "var(--up)" : "var(--down)" }}>{play.impact}</span>}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", lineHeight: 1.25 }}>{play.title}</div>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.45, marginTop: 5 }}>{play.detail}</div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▸</span> {play.expandLabel}
      </div>
      {open && (
        <div style={{ marginTop: 11, borderTop: "1px solid var(--border)", paddingTop: 10 }} onClick={e => e.stopPropagation()}>
          {play.targets.map((t, i) => (
            <div key={i} onClick={() => t.href && go(t.href)} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", fontSize: 12.5, borderBottom: i < play.targets.length - 1 ? "1px solid var(--border)" : "none", cursor: t.href ? "pointer" : "default" }}>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>{t.name}{t.sub && <span style={{ color: "var(--text-3)", fontWeight: 400 }}> · {t.sub}</span>}</span>
              <span style={{ color: "var(--text-2)", whiteSpace: "nowrap" }}>{t.metric} {t.href && <span style={{ color: "var(--accent-deep)", fontWeight: 600 }}>→</span>}</span>
            </div>
          ))}
          {play.foot && <div onClick={() => go(play.footHref)} style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "var(--accent-deep)", cursor: "pointer" }}>{play.foot} →</div>}
        </div>
      )}
    </div>
  );
}

// compact SKU-gap line — no box, tap jumps straight to Accounts
function SkuGapRow({ play, go }) {
  return (
    <div onClick={() => go(play.href)}
      style={{ display: "flex", alignItems: "baseline", gap: 9, padding: "9px 16px", cursor: "pointer" }}>
      <span style={{ fontSize: 17, fontWeight: 700, color: "var(--accent-deep)", lineHeight: 1, fontFeatureSettings: '"tnum" 1, "lnum" 1', minWidth: 32 }}>{play.n}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.3 }}>
        accounts don't carry <span style={{ fontWeight: 700, color: "var(--text)" }}>{play.skuName}</span>
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-deep)", flexShrink: 0 }}>→</span>
    </div>
  );
}

function ActionsInner() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [grid, setGrid] = useState(null);   // item_grid rows for SKU-whitespace play
  const [err, setErr] = useState(null);
  const [open, setOpen] = useState({});
  const [stF, setStF] = useState("All");
  const [distF, setDistF] = useState("All");
  const [chF, setChF] = useState("All");      // channel_type
  const [chainF, setChainF] = useState("All");
  const go = href => router.push(href);

  useEffect(() => {
    (async () => {
      try {
        let all = [], from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("account_list")
            .select("account_id,account_name,chain,city,state,distributor,channel_type,headline,account_weight,cur90,prev90,prior90_pct,cases_per_month,placements_delta,lost_sku,last_order_w")
            .order("account_weight", { ascending: false })
            .range(from, from + 4999);
          if (error) throw error;
          all = all.concat(data || []);
          if (!data || data.length < 5000) break;
          from += 5000;
        }
        setRows(all);

        // SKU-level rows for the "top SKU, missing here" play
        const ids = all.map(a => a.account_id);
        let g = [];
        for (let i = 0; i < ids.length; i += 200) {
          const { data: gd, error: ge } = await supabase
            .from("item_grid")
            .select("account_id,product_key,item_name,l90")
            .in("account_id", ids.slice(i, i + 200));
          if (ge) throw ge;
          g = g.concat(gd || []);
        }
        setGrid(g);
      } catch (e) { setErr(e.message || "load failed"); }
    })();
  }, []);

  // dropdown options (chain + distributor cascade off selected state)
  const states = useMemo(() => rows ? ["All", ...[...new Set(rows.map(r => r.state).filter(Boolean))].sort()] : ["All"], [rows]);
  const channels = useMemo(() => rows ? ["All", ...[...new Set(rows.map(r => r.channel_type).filter(Boolean))].sort()] : ["All"], [rows]);
  const dists = useMemo(() => {
    if (!rows) return ["All"];
    const pool = stF === "All" ? rows : rows.filter(r => r.state === stF);
    return ["All", ...[...new Set(pool.map(r => r.distributor).filter(Boolean))].sort()];
  }, [rows, stF]);
  const chains = useMemo(() => {
    if (!rows) return ["All"];
    const pool = stF === "All" ? rows : rows.filter(r => r.state === stF);
    return ["All", ...[...new Set(pool.map(r => r.chain).filter(Boolean))].sort()];
  }, [rows, stF]);

  // the scoped row set everything recomputes from
  const fr = useMemo(() => {
    if (!rows) return null;
    return rows.filter(r =>
      (stF === "All" || r.state === stF) &&
      (distF === "All" || r.distributor === distF) &&
      (chF === "All" || r.channel_type === chF) &&
      (chainF === "All" || r.chain === chainF));
  }, [rows, stF, distF, chF, chainF]);

  const anyFilter = stF !== "All" || distF !== "All" || chF !== "All" || chainF !== "All";
  const scopeLabel = useMemo(() => {
    const parts = [];
    if (stF !== "All") parts.push(STNAME[stF] || stF);
    if (chF !== "All") parts.push(chF);
    if (chainF !== "All") parts.push(titleCase(chainF));
    if (distF !== "All") parts.push(titleCase(distF));
    return parts.length ? parts.join(" · ") : "all territory";
  }, [stF, chF, chainF, distF]);

  // account-level plays (don't depend on grid; render immediately)
  const plays = useMemo(() => {
    if (!fr) return null;
    const rows = fr; // scope everything to the filtered set
    const out = [];

    // 1. WIN-BACK
    const wb = rows.filter(r => (r.cur90 || 0) > 0 && r.last_order_w != null && r.last_order_w >= 2 && (r.cases_per_month || 0) >= 4 && !isNew(r.headline))
      .sort((a, b) => (b.account_weight || 0) - (a.account_weight || 0)).slice(0, 12);
    if (wb.length >= 2) {
      const atRisk = wb.reduce((s, r) => s + (r.cases_per_month || 0), 0);
      out.push({
        id: "winback", tag: "WIN-BACK", tone: "red", section: "urgent",
        impact: `−${Math.round(atRisk)} cs/mo at risk`, impactTone: "risk",
        title: `${wb.length} steady buyers have gone quiet`,
        detail: `No order in 60+ days, but each ran a steady ${Math.min(...wb.map(r => Math.round(r.cases_per_month || 0)))}–${Math.max(...wb.map(r => Math.round(r.cases_per_month || 0)))} cs/mo. Catch them before they read as lapsed.`,
        expandLabel: `see the ${Math.min(wb.length, 8)} accounts`,
        targets: wb.slice(0, 6).map(r => ({ name: r.account_name, sub: r.city, metric: `${(r.last_order_w || 0) * 30}d · ${Math.round(r.cases_per_month || 0)} cs/mo`, href: `/book?ids=${r.account_id}` })),
        foot: "Open these in Accounts", footHref: idsHref(wb.map(r => r.account_id)),
      });
    }

    // 2. RISK CLUSTER (by chain)
    const byChain = {};
    rows.filter(r => isDeclining(r.headline) && r.chain).forEach(r => { (byChain[r.chain] ||= []).push(r); });
    let cluster = null;
    for (const ch in byChain) { const lst = byChain[ch]; if (lst.length >= 4 && (!cluster || lst.length > cluster.lst.length)) cluster = { chain: ch, lst }; }
    if (cluster) {
      const sorted = cluster.lst.sort((a, b) => ((b.prev90 || 0) - (b.cur90 || 0)) - ((a.prev90 || 0) - (a.cur90 || 0)));
      const lost = sorted.reduce((s, r) => s + Math.max(0, (r.prev90 || 0) - (r.cur90 || 0)), 0);
      out.push({
        id: "cluster", tag: "RISK CLUSTER", tone: "red", section: "urgent",
        impact: `−${Math.round(lost / 3)} cs/mo`, impactTone: "risk",
        title: `${sorted.length} ${titleCase(cluster.chain)} locations are softening at once`,
        detail: `Not random — ${sorted.length} ${titleCase(cluster.chain)} stores all turned down this quarter. A shared chain thread usually means one fixable cause, not ${sorted.length} separate problems.`,
        expandLabel: "see the cluster",
        targets: sorted.slice(0, 5).map(r => ({ name: r.account_name, sub: r.city, metric: `${r.prior90_pct != null ? r.prior90_pct + "%" : ""} · −${Math.round(Math.max(0, (r.prev90 || 0) - (r.cur90 || 0)))} cs`, href: `/book?ids=${r.account_id}` })),
        foot: `Open all ${titleCase(cluster.chain)} at-risk in Accounts`, footHref: idsHref(sorted.map(r => r.account_id)),
      });
    }

    // 3. NEW-ACCOUNT RESCUE
    const nr = rows.filter(r => isNew(r.headline) && r.last_order_w != null && r.last_order_w >= 1)
      .sort((a, b) => (b.last_order_w || 0) - (a.last_order_w || 0)).slice(0, 30);
    if (nr.length >= 2) {
      out.push({
        id: "newrescue", tag: "NEW ACCOUNT", tone: "blue", section: "urgent",
        impact: "churn risk", impactTone: "risk",
        title: `${nr.length} new accounts stalled after first order`,
        detail: `Opened recently, bought once, no reorder yet. New accounts that stall past their first cycle churn far more often than not — this is the window to lock them in.`,
        expandLabel: `see the ${Math.min(nr.length, 8)} accounts`,
        targets: nr.slice(0, 6).map(r => ({ name: r.account_name, sub: r.city, metric: `${(r.last_order_w || 0) * 30}d quiet`, href: `/book?ids=${r.account_id}` })),
        foot: "Open all new at-risk in Accounts", footHref: idsHref(nr.map(r => r.account_id)),
      });
    }

    // 4. DISTRIBUTION LEAK
    const lostBy = {};
    rows.forEach(r => { if (r.lost_sku) (lostBy[r.lost_sku] ||= []).push(r); });
    let topLost = null;
    for (const sku in lostBy) if (!topLost || lostBy[sku].length > topLost.lst.length) topLost = { sku, lst: lostBy[sku] };
    if (topLost && topLost.lst.length >= 3) {
      const chCount = {};
      topLost.lst.forEach(r => { if (r.channel_type) chCount[r.channel_type] = (chCount[r.channel_type] || 0) + 1; });
      const domCh = Object.entries(chCount).sort((a, b) => b[1] - a[1])[0]?.[0];
      let chCur = 0, chPrev = 0;
      if (domCh) rows.forEach(r => { if (r.channel_type === domCh) { chCur += r.cur90 || 0; chPrev += r.prev90 || 0; } });
      const chG = gpct(chCur, chPrev);
      out.push({
        id: "leak", tag: "DISTRIBUTION LEAK", tone: "amber", section: "fix",
        impact: `${topLost.lst.length} doors lost`, impactTone: "risk",
        title: `${titleCase(topLost.sku)} is slipping${domCh ? ` in ${domCh}` : ""}`,
        detail: `${titleCase(topLost.sku)} dropped out of ${topLost.lst.length} doors recently${domCh && chG != null ? ` — yet ${domCh} overall is ${chG >= 0 ? "up " + chG + "%" : "down " + Math.abs(chG) + "%"}. ${chG >= 0 ? "SKU down while its channel's up means execution, not demand." : ""}` : "."}`,
        expandLabel: "see where it dropped",
        targets: topLost.lst.sort((a, b) => (b.account_weight || 0) - (a.account_weight || 0)).slice(0, 5).map(r => ({ name: r.account_name, sub: `${r.city} · ${r.channel_type || ""}`, metric: "lost", href: `/book?ids=${r.account_id}` })),
        foot: "Open all that dropped it in Accounts", footHref: idsHref(topLost.lst.map(r => r.account_id)),
      });
    }

    // 9. PLACEMENT NOT PULLING
    const cityP = {};
    rows.forEach(r => { if (!r.city) return; const e = cityP[`${r.city}|${r.state}`] ||= { city: r.city, st: r.state, cur: 0, prev: 0, add: 0, addAccts: [] }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; if ((r.placements_delta || 0) > 0) { e.add += r.placements_delta; e.addAccts.push(r); } });
    const flat = Object.values(cityP).filter(c => c.add >= 4 && gpct(c.cur, c.prev) != null && gpct(c.cur, c.prev) <= 2).sort((a, b) => b.add - a.add)[0];
    if (flat) {
      out.push({
        id: "placement", tag: "PLACEMENT", tone: "amber", section: "fix",
        impact: "not pulling", impactTone: "risk",
        title: `${flat.add} new ${titleCase(flat.city)} doors — and volume's flat`,
        detail: `You added ${flat.add} placement${flat.add === 1 ? "" : "s"} in ${titleCase(flat.city)} but the market's volume hasn't moved. The doors are in — they're not turning yet. Sell-through and merchandising follow-up, not a win.`,
        expandLabel: "see the quiet doors",
        targets: flat.addAccts.sort((a, b) => (b.placements_delta || 0) - (a.placements_delta || 0)).slice(0, 5).map(r => ({ name: r.account_name, sub: r.city, metric: `+${r.placements_delta} plc`, href: `/book?ids=${r.account_id}` })),
        foot: "Open new doors in Accounts", footHref: idsHref(flat.addAccts.map(r => r.account_id)),
      });
    }

    // 10. DISTRIBUTOR WATCH
    const distAgg = {};
    let bookCur = 0;
    rows.forEach(r => { bookCur += r.cur90 || 0; if (!r.distributor) return; const e = distAgg[r.distributor] ||= { name: r.distributor, cur: 0, prev: 0, st: r.state }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; });
    const distListArr = Object.values(distAgg).map(d => ({ ...d, share: bookCur ? Math.round(100 * d.cur / bookCur) : 0, g: gpct(d.cur, d.prev) }));
    const distWatch = distListArr.filter(d => d.share >= 10 && d.g != null && d.g < 0).sort((a, b) => a.g - b.g)[0];
    if (distWatch) {
      out.push({
        id: "distributor", tag: "DISTRIBUTOR", tone: "ink", section: "fix",
        impact: "concentration", impactTone: "risk",
        title: `${titleCase(distWatch.name)} moves ${distWatch.share}% of this book — and it's down ${Math.abs(distWatch.g)}%`,
        detail: `One distributor carries ${distWatch.share}% of the volume in scope and it's declining. That's both your biggest lever and a concentration risk. Worth a direct conversation.`,
        expandLabel: "break it down",
        targets: [
          { name: "Share of scope", sub: null, metric: `${distWatch.share}%` },
          { name: "90-day trend", sub: null, metric: `${distWatch.g}%` },
        ],
        foot: `Open ${titleCase(distWatch.name)} accounts`, footHref: `/book?distributor=${encodeURIComponent(distWatch.name)}`,
      });
    }

    return out;
  }, [fr]);

  // SKU-gap rows computed separately — depend on grid; null until grid loads
  const skuGaps = useMemo(() => {
    if (!fr) return null;
    if (!grid) return null;           // still loading → caller shows placeholder
    const rows = fr;
    if (!grid.length) return [];

    const carriesByAcct = {};   // account_id -> Set(product_key) with l90 > 0
    const volBySku = {};        // product_key -> total l90 across scoped accounts
    const nameBySku = {};
    const scopedIds = new Set(rows.map(r => r.account_id));
    const acctById = {};
    for (const r of rows) acctById[r.account_id] = r;
    for (const it of grid) {
      if (!scopedIds.has(it.account_id)) continue;
      nameBySku[it.product_key] = it.item_name;
      const v = it.l90 || 0;
      if (v > 0) {
        (carriesByAcct[it.account_id] ||= new Set()).add(it.product_key);
        volBySku[it.product_key] = (volBySku[it.product_key] || 0) + v;
      }
    }
    const active = rows.filter(r => (r.cur90 || 0) > 0);
    const topSkus = Object.keys(volBySku).sort((a, b) => volBySku[b] - volBySku[a]);

    const out = [];
    let made = 0;
    for (const pk of topSkus) {
      if (made >= 3) break;
      const sellsIn = new Set();   // "channel|state" where this SKU has any placement
      for (const it of grid) {
        if ((it.l90 || 0) <= 0 || it.product_key !== pk) continue;
        const a = acctById[it.account_id]; if (!a) continue;
        if (a.channel_type && a.state) sellsIn.add(`${a.channel_type}|${a.state}`);
      }
      const gaps = active.filter(r => {
        if (!r.channel_type || !r.state) return false;
        if (!sellsIn.has(`${r.channel_type}|${r.state}`)) return false;
        const carried = carriesByAcct[r.account_id];
        return !(carried && carried.has(pk));
      }).sort((a, b) => (b.account_weight || 0) - (a.account_weight || 0))
        .slice(0, 100);   // cap at top 100 by volume

      if (gaps.length < 3) continue;
      const skuName = titleCase(nameBySku[pk] || "this SKU");
      out.push({
        id: `topsku_${pk}`,
        n: gaps.length, skuName,
        href: idsHref(gaps.map(r => r.account_id), 100),   // link carries up to 100
      });
      made++;
    }
    return out;
  }, [fr, grid]);

  if (err) return <div style={wrap}><p style={{ color: "var(--down)", padding: 20, fontSize: 13 }}>Couldn’t load. {err}</p></div>;

  const urgent = plays?.filter(p => p.section === "urgent") || [];
  const fix = plays?.filter(p => p.section === "fix") || [];
  const opp = plays?.filter(p => p.section === "opportunity") || [];
  const skuLoading = plays && skuGaps === null;   // account plays ready, grid still loading

  const toggle = id => setOpen(o => ({ ...o, [id]: !o[id] }));
  const Sec = ({ label }) => <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: .5, padding: "6px 16px 6px" }}>{label}</div>;
  const render = list => list.map(p => <PlayCard key={p.id} play={p} open={!!open[p.id]} onToggle={() => toggle(p.id)} go={go} />);
  const clearAll = () => { setStF("All"); setDistF("All"); setChF("All"); setChainF("All"); };

  return (
    <div style={wrap}>
      <div style={{ padding: "14px 16px 6px", flexShrink: 0 }}>

        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>Actions to Take</div>
        <div style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 2 }}>{plays ? `${plays.length} play${plays.length === 1 ? "" : "s"} · ${scopeLabel}` : "Reading your book…"}</div>
      </div>

      {/* live filters — everything below recomputes from these */}
      <div className="nobar" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 16px 8px", flexShrink: 0 }}>
        <style>{`.nobar::-webkit-scrollbar{display:none}.nobar{scrollbar-width:none;-ms-overflow-style:none}`}</style>
        <select style={sel} value={stF} onChange={e => { setStF(e.target.value); setDistF("All"); setChainF("All"); }}>
          {states.map(s => <option key={s} value={s}>{s === "All" ? "State" : (STNAME[s] || s)}</option>)}
        </select>
        <select style={sel} value={distF} onChange={e => setDistF(e.target.value)}>
          {dists.map(d => <option key={d} value={d}>{d === "All" ? "Distributor" : titleCase(d)}</option>)}
        </select>
        <select style={sel} value={chF} onChange={e => setChF(e.target.value)}>
          {channels.map(c => <option key={c} value={c}>{c === "All" ? "Channel" : c}</option>)}
        </select>
        <select style={sel} value={chainF} onChange={e => setChainF(e.target.value)}>
          {chains.map(c => <option key={c} value={c}>{c === "All" ? "Chain" : titleCase(c)}</option>)}
        </select>
        {anyFilter && (
          <button onClick={clearAll} style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, padding: "6px 12px", borderRadius: 8, border: "1.5px solid var(--accent)", background: "var(--surface)", color: "var(--accent-deep)", cursor: "pointer", fontFamily: "inherit" }}>↺ Clear</button>
        )}
      </div>

      <div className="nobar" style={{ flex: 1, overflowY: "auto", paddingBottom: 30 }}>
        {!plays && <Splash fixed={false} />}
        {plays && plays.length === 0 && skuGaps !== null && (skuGaps?.length || 0) === 0 && <div style={{ color: "var(--text-3)", fontSize: 13, padding: 16 }}>No plays meet the threshold in this scope — try widening the filters.</div>}

        {urgent.length > 0 && <Sec label="URGENT — DON'T LET THESE SLIP" />}
        {render(urgent)}

        {fix.length > 0 && <Sec label="FIX EXECUTION" />}
        {render(fix)}

        {/* SKU GAPS — holds behind a quiet line until grid is ready, then plain tap-rows */}
        {(skuLoading || (skuGaps && skuGaps.length > 0)) && <Sec label="SKU GAPS — TOP MOVERS NOT CARRIED" />}
        {skuLoading && <div style={{ fontSize: 12, color: "var(--text-3)", padding: "2px 16px 8px" }}>Reading SKUs…</div>}
        {skuGaps && skuGaps.map(p => <SkuGapRow key={p.id} play={p} go={go} />)}

        {opp.length > 0 && <Sec label="OPPORTUNITIES — WHITESPACE & MOMENTUM" />}
        {render(opp)}

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

export default function ActionsPage() {
  return (<Suspense fallback={<div style={wrap} />}><ActionsInner /></Suspense>);
}

const wrap = { background: "var(--bg)", height: "100vh", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: "var(--font-sans)" };
const statTile = { flex: 1, background: "var(--surface)", borderRadius: 12, padding: "11px 12px", boxShadow: "var(--shadow)" };
const statV = { fontSize: 19, fontWeight: 700, color: "var(--text)", lineHeight: 1 };
const statL = { fontSize: 10, color: "var(--text-3)", marginTop: 4 };