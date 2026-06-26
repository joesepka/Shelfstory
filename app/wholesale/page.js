"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import Splash from "../../components/Splash";
import { BarCard, AcctRosCard } from "../../components/Charts";
import { isOn } from "../../lib/utils";

// Wholesale Trends — over-time view. Same top filters as the book (minus "near me"),
// plus Item. View toggle is 24 Month (24 x 30-day buckets) / Quarterly (8 x 90-day).
// First graph: ACTUAL 30-day cases per period (from ai_window_dense, window 0 = most
// recent 30 days) summed across whatever the filters select. NOT rolling-90.

const scrollSel = {
  fontSize: 11.5, padding: "6px 9px", borderRadius: 8, border: "0.5px solid var(--border-strong)",
  background: "var(--surface)", color: "var(--text-2)", fontFamily: "inherit", minWidth: 96, flexShrink: 0,
  appearance: "none", WebkitAppearance: "none",
};
const wrap = { background: "var(--bg)", height: "100vh", maxWidth: "var(--maxw)", margin: "0 auto", display: "flex", flexDirection: "column" };

// labels anchored to the data snapshot; window 0 = most recent 30 days (oldest -> newest)
function monthLabels(snap) {
  const base = snap ? new Date(snap) : new Date();
  const out = [];
  for (let k = 11; k >= 0; k--) { const d = new Date(base); d.setDate(d.getDate() - k * 30); out.push(d.toLocaleString("en-US", { month: "short" })); }
  return out; // 12, oldest -> newest
}
function quarterLabels(snap) {
  const base = snap ? new Date(snap) : new Date();
  const out = [];
  for (let qn = 3; qn >= 0; qn--) { const d = new Date(base); d.setDate(d.getDate() - qn * 90); out.push(d.toLocaleString("en-US", { month: "short", year: "2-digit" })); }
  return out; // 4, oldest -> newest
}

export default function WholesalePage() {
  const [rows, setRows] = useState(null);   // account_list (attrs only)
  const [items, setItems] = useState([]);   // [{ key, name }]
  const [snap, setSnap] = useState(null);
  const [err, setErr] = useState(null);

  const [stF, setStF] = useState("All");
  const [cityF, setCityF] = useState("All");
  const [chainF, setChainF] = useState("All");
  const [premF, setPremF] = useState("All");
  const [distF, setDistF] = useState("All");
  const [itemF, setItemF] = useState("All");
  const [mode, setMode] = useState("month"); // "month" | "quarter"

  const [series, setSeries] = useState(null); // 30-day window sums, index 0 = most recent
  const [acct, setAcct] = useState(null);     // { accts:[12], cases90:[12] } by rolling-90 period
  const [loading, setLoading] = useState(true);
  const loadId = useRef(0);

  // account universe (for filter options + scope) + snapshot date + item names
  useEffect(() => {
    (async () => {
      try {
        let all = [], from = 0;
        while (true) {
          const { data, error } = await supabase.from("account_list")
            .select("account_id,account_name,chain,city,state,distributor,channel,channel_type,account_weight")
            .order("account_weight", { ascending: false }).range(from, from + 4999);
          if (error) throw error;
          all = all.concat(data || []);
          if (!data || data.length < 5000) break;
          from += 5000;
        }
        setRows(all);
      } catch (e) { setErr(e.message || "load failed"); }
    })();
    (async () => {
      const { data } = await supabase.from("ai_window_dense").select("snapshot_date").limit(1);
      if (data && data[0]) setSnap(data[0].snapshot_date);
    })();
    (async () => {
      try {
        // only ~14 distinct SKUs — one page is plenty to collect them all
        const { data } = await supabase.from("item_grid").select("product_key,item_name").limit(5000);
        const map = {};
        for (const r of (data || [])) if (r.product_key && !(r.product_key in map)) map[r.product_key] = r.item_name;
        setItems(Object.entries(map).map(([key, name]) => ({ key, name })).sort((a, b) => String(a.name).localeCompare(String(b.name))));
      } catch { /* item dropdown is best-effort */ }
    })();
  }, []);

  const states = useMemo(() => rows ? ["All", ...[...new Set(rows.map(r => r.state).filter(Boolean))].sort()] : ["All"], [rows]);
  const cities = useMemo(() => { if (!rows) return ["All"]; let p = rows; if (stF !== "All") p = p.filter(r => r.state === stF); return ["All", ...[...new Set(p.map(r => r.city).filter(Boolean))].sort()]; }, [rows, stF]);
  const chains = useMemo(() => { if (!rows) return ["All"]; let p = rows; if (stF !== "All") p = p.filter(r => r.state === stF); if (cityF !== "All") p = p.filter(r => r.city === cityF); return ["All", ...[...new Set(p.map(r => r.chain).filter(Boolean))].sort()]; }, [rows, stF, cityF]);
  const dists = useMemo(() => rows ? ["All", ...[...new Set(rows.map(r => r.distributor).filter(Boolean))].sort()] : ["All"], [rows]);

  const scopedIds = useMemo(() => {
    if (!rows) return [];
    let f = rows;
    if (stF !== "All") f = f.filter(r => r.state === stF);
    if (cityF !== "All") f = f.filter(r => r.city === cityF);
    if (chainF !== "All") f = f.filter(r => r.chain === chainF);
    if (distF !== "All") f = f.filter(r => r.distributor === distF);
    if (premF !== "All") f = f.filter(r => premF === "ON" ? isOn(r) : !isOn(r));
    return f.map(r => r.account_id);
  }, [rows, stF, cityF, chainF, distF, premF]);

  // load the 24-window series — one fast server-side RPC (sums inside Postgres).
  // Defaults to ALL wholesale (no params). Debounced so typing search doesn't
  // fire a request per keystroke.
  useEffect(() => {
    const myId = ++loadId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = {};
        if (stF !== "All") params.p_state = stF;
        if (cityF !== "All") params.p_city = cityF;
        if (chainF !== "All") params.p_chain = chainF;
        if (distF !== "All") params.p_distributor = distF;
        if (premF !== "All") params.p_premise = premF;
        if (itemF !== "All") params.p_product_key = itemF;
        const [r30, rAcc] = await Promise.all([
          supabase.rpc("trends_30d", params),            // graph 1: actual 30-day cases
          supabase.rpc("trends_accounts_90d", params),   // graph 2: rolling-90 accounts + cases
        ]);
        if (r30.error) throw r30.error;
        if (rAcc.error) throw rAcc.error;
        if (loadId.current !== myId) return; // a newer load superseded this one
        const sums = new Array(24).fill(0);
        for (const r of (r30.data || [])) { const wi = r.window_index; if (wi >= 0 && wi < 24) sums[wi] = Number(r.cases) || 0; }
        const accts = new Array(12).fill(0), cases90 = new Array(12).fill(0);
        for (const r of (rAcc.data || [])) { const p = r.period; if (p >= 0 && p < 12) { accts[p] = Number(r.accts) || 0; cases90[p] = Number(r.cases) || 0; } }
        setSeries(sums);
        setAcct({ accts, cases90 });
        setLoading(false);
      } catch (e) { if (loadId.current === myId) { setErr(e.message || "trend load failed"); setLoading(false); } }
    }, 300);
    return () => clearTimeout(t);
  }, [stF, cityF, chainF, distF, premF, itemF]);

  const noMatch = !!rows && scopedIds.length === 0;

  // graph 1: actual 30-day cases. 12 Month = windows 0-11; Quarterly = 4 summed quarters.
  const display = useMemo(() => {
    if (!series) return null;
    if (mode === "quarter") {
      const qs = [];
      for (let qi = 0; qi < 4; qi++) qs.push((series[qi * 3] || 0) + (series[qi * 3 + 1] || 0) + (series[qi * 3 + 2] || 0));
      return qs.reverse(); // oldest -> newest
    }
    return series.slice(0, 12).reverse(); // oldest -> newest
  }, [series, mode]);

  // graph 2: rolling-90 accounts (bars) + ROS/mo (line). Rolling-90 is already a
  // 90-day window, so Quarterly samples the quarter-boundary periods (0,3,6,9) —
  // account counts can't be summed across periods. ROS = cases90 / accts / 3.
  const acctDisplay = useMemo(() => {
    if (!acct) return null;
    const idx = mode === "quarter" ? [0, 3, 6, 9] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const accts = idx.map(p => acct.accts[p] || 0).reverse();
    const ros = idx.map(p => { const a = acct.accts[p] || 0, c = acct.cases90[p] || 0; return a > 0 ? c / a / 3 : 0; }).reverse();
    return { accts, ros };
  }, [acct, mode]);

  const labels = useMemo(() => mode === "quarter" ? quarterLabels(snap) : monthLabels(snap), [mode, snap]);

  const scopeLabel = useMemo(() => {
    const parts = [];
    if (distF !== "All") parts.push(distF);
    if (chainF !== "All") parts.push(chainF);
    if (cityF !== "All") parts.push(cityF); else if (stF !== "All") parts.push(stF);
    if (premF !== "All") parts.push(premF === "ON" ? "On-premise" : "Off-premise");
    if (itemF !== "All") { const it = items.find(x => x.key === itemF); parts.push(it ? it.name : itemF); }
    return parts.length ? parts.join(" · ") : "All wholesale";
  }, [distF, chainF, cityF, stF, premF, itemF, items]);

  return (
    <div style={wrap}>
      <style>{`.nobar{scrollbar-width:none;-ms-overflow-style:none;}.nobar::-webkit-scrollbar{display:none;width:0;height:0;}`}</style>

      <div style={{ padding: "12px 14px 2px", flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>Wholesale Trends</div>
        <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 1 }}>Actual 30-day depletions over time — filter, then scroll.</div>
      </div>

      {/* filters (no "near me") */}
      <div className="nobar" style={{ display: "flex", gap: 6, padding: "10px 12px 8px", overflowX: "auto", flexShrink: 0 }}>
        <select style={scrollSel} value={stF} onChange={e => { setStF(e.target.value); setCityF("All"); setChainF("All"); }}>
          {states.map(s => <option key={s} value={s}>{s === "All" ? "State" : s}</option>)}
        </select>
        <select style={scrollSel} value={cityF} onChange={e => { setCityF(e.target.value); setChainF("All"); }}>
          {cities.map(c => <option key={c} value={c}>{c === "All" ? "City" : c}</option>)}
        </select>
        <select style={scrollSel} value={chainF} onChange={e => setChainF(e.target.value)}>
          {chains.map(c => <option key={c} value={c}>{c === "All" ? "Chain" : c}</option>)}
        </select>
        <select style={scrollSel} value={premF} onChange={e => setPremF(e.target.value)}>
          <option value="All">Premise</option>
          <option value="ON">On-premise</option>
          <option value="OFF">Off-premise</option>
        </select>
        <select style={scrollSel} value={distF} onChange={e => setDistF(e.target.value)}>
          {dists.map(d => <option key={d} value={d}>{d === "All" ? "Distributor" : d}</option>)}
        </select>
        <select style={scrollSel} value={itemF} onChange={e => setItemF(e.target.value)}>
          <option value="All">Item</option>
          {items.map(it => <option key={it.key} value={it.key}>{it.name}</option>)}
        </select>
      </div>

      {/* view toggle: 24 Month / Quarterly */}
      <div style={{ display: "flex", gap: 4, padding: "0 12px 10px", flexShrink: 0 }}>
        {[["month", "12 Month"], ["quarter", "Quarterly"]].map(([k, t]) => (
          <button key={k} onClick={() => setMode(k)}
            style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: "7px 0", borderRadius: 8, cursor: "pointer", border: "none", fontFamily: "inherit",
              background: mode === k ? "var(--text-2)" : "var(--surface-2)", color: mode === k ? "#fff" : "var(--text-2)" }}>
            {t}
          </button>
        ))}
      </div>

      {/* scroll area: charts */}
      <div className="nobar" style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "0 12px 60px", WebkitOverflowScrolling: "touch" }}>
        {err && <div style={{ fontSize: 13, color: "var(--down)", padding: "10px 2px" }}>Couldn’t load. {err}</div>}

        {!err && noMatch && (
          <div style={{ marginTop: 16, padding: "16px", textAlign: "center", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, color: "var(--text-2)", fontSize: 12.5 }}>No accounts match these filters.</div>
        )}

        {!err && !noMatch && loading && (
          <div style={{ position: "relative", height: 300, marginTop: 8 }}><Splash fixed={false} /></div>
        )}

        {!err && !noMatch && !loading && display && (
          <>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", margin: "12px 2px 0" }}>{scopeLabel}{rows ? ` · ${scopedIds.length.toLocaleString()} accounts` : ""}</div>
            <BarCard
              title="30-day cases"
              sub={mode === "quarter" ? "Actual cases · last 4 quarters (90-day buckets)" : "Actual cases · last 12 months (30-day buckets)"}
              data={display} labels={labels} hi={mode === "quarter" ? 1 : 3} unit="cs" />
            {acctDisplay && (
              <AcctRosCard
                title="Accounts & rate of sale"
                sub={mode === "quarter" ? "Rolling-90 accounts (bars) · ROS/mo (line) · by quarter" : "Rolling-90 accounts (bars) · ROS/mo (line)"}
                accts={acctDisplay.accts} ros={acctDisplay.ros} labels={labels} hi={mode === "quarter" ? 1 : 3} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

