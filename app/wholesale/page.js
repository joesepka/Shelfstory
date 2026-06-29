"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import Splash from "../../components/Splash";
import { BarCard, AcctRosCard, ChannelRosCard, ItemRosLines } from "../../components/Charts";
import { isOn, titleCase } from "../../lib/utils";
import FilterSelect from "../../components/FilterSelect";

// Wholesale Trends — over-time view. Same top filters as the book (minus "near me"),
// plus Item. View toggle is 24 Month (24 x 30-day buckets) / Quarterly (8 x 90-day).
// First graph: ACTUAL 30-day cases per period (from ai_window_dense, window 0 = most
// recent 30 days) summed across whatever the filters select. NOT rolling-90.

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
  const [itemRos, setItemRos] = useState(null); // [{ key, ros:[8] }] top items, ROS over 8 periods
  const [itemChan, setItemChan] = useState(null); // [{ channel, channel_type, cur, prev }] for selected item (graph 1)
  const [loading, setLoading] = useState(true);
  const loadId = useRef(0);

  // account universe (for filter options + scope) + snapshot date + item names
  useEffect(() => {
    (async () => {
      try {
        let all = [], from = 0;
        while (true) {
          const { data, error } = await supabase.from("account_list")
            .select("account_id,account_name,chain,city,state,distributor,channel,channel_type,account_weight,cur90,prev90,area_type,income_bucket")
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

  const scopedRows = useMemo(() => {
    if (!rows) return [];
    let f = rows;
    if (stF !== "All") f = f.filter(r => r.state === stF);
    if (cityF !== "All") f = f.filter(r => r.city === cityF);
    if (chainF !== "All") f = f.filter(r => r.chain === chainF);
    if (distF !== "All") f = f.filter(r => r.distributor === distF);
    if (premF !== "All") f = f.filter(r => premF === "ON" ? isOn(r) : !isOn(r));
    return f;
  }, [rows, stF, cityF, chainF, distF, premF]);
  const scopedIds = useMemo(() => scopedRows.map(r => r.account_id), [scopedRows]);

  // Graph: ROS by channel. Standard ROS = 90D cases / active accounts / 3. Bars are
  // Total, Off, On, then the top-5 subchannels (channel_type) by 90D volume. prevRos
  // (prior-90) drives the momentum chip; benchmark = the overall Total ROS. Computed
  // client-side from cur90/prev90 — no per-item granularity needed here.
  const channelRos = useMemo(() => {
    // source rows in one shape: { channel, channel_type, cur, prev }. When an item
    // is picked we use its per-account rolling-90 (server) so the chart shows that
    // item across channels; otherwise account totals (client).
    let src;
    if (itemF !== "All") {
      if (!itemChan) return null;                       // waiting on the per-item fetch
      src = itemChan;
    } else {
      src = scopedRows.map(r => ({ channel: r.channel, channel_type: r.channel_type, area_type: r.area_type, income_bucket: r.income_bucket, cur: Number(r.cur90) || 0, prev: Number(r.prev90) || 0 }));
    }
    if (!src.length) return null;
    const grp = arr => {
      let cC = 0, cA = 0, pC = 0, pA = 0;
      for (const r of arr) {
        const c = Number(r.cur) || 0, p = Number(r.prev) || 0;
        cC += c; if (c > 0) cA++;
        pC += p; if (p > 0) pA++;
      }
      return { ros: cA > 0 ? cC / cA / 3 : 0, prevRos: pA > 0 ? pC / pA / 3 : 0, cases: cC };
    };
    const off = src.filter(r => !isOn(r)), on = src.filter(r => isOn(r));
    const byType = {};
    for (const r of src) { const k = r.channel_type || "Other"; (byType[k] = byType[k] || []).push(r); }
    const subs = Object.entries(byType).map(([k, arr]) => ({ key: k, ...grp(arr) }))
      .sort((a, b) => b.cases - a.cases).slice(0, 5);
    const total = grp(src);
    const bars = [
      { label: "Total", ros: total.ros, prevRos: total.prevRos },
      ...(off.length ? [{ label: "Off", ros: grp(off).ros, prevRos: grp(off).prevRos }] : []),
      ...(on.length ? [{ label: "On", ros: grp(on).ros, prevRos: grp(on).prevRos }] : []),
      ...subs.map(s => ({ label: titleCase(s.key), ros: s.ros, prevRos: s.prevRos })),
    ];
    return { bars, benchmark: total.ros };
  }, [scopedRows, itemF, itemChan]);

  // ROS by demographic (area type) and by household income — same standard ROS rule,
  // same item-aware source as channelRos. Each is a Total bar + the buckets in a fixed
  // order; benchmark = overall scope ROS. Skips empty buckets.
  const demoRos = useMemo(() => {
    let src;
    if (itemF !== "All") { if (!itemChan) return null; src = itemChan; }
    else src = scopedRows.map(r => ({ area_type: r.area_type, income_bucket: r.income_bucket, cur: Number(r.cur90) || 0, prev: Number(r.prev90) || 0 }));
    if (!src.length) return null;
    const grp = arr => {
      let cC = 0, cA = 0, pC = 0, pA = 0;
      for (const r of arr) {
        const c = Number(r.cur) || 0, p = Number(r.prev) || 0;
        cC += c; if (c > 0) cA++;
        pC += p; if (p > 0) pA++;
      }
      return { ros: cA > 0 ? cC / cA / 3 : 0, prevRos: pA > 0 ? pC / pA / 3 : 0 };
    };
    const total = grp(src);
    const series = (keyFn, order, labelMap) => {
      const by = {};
      for (const r of src) { const k = keyFn(r); if (!k) continue; (by[k] = by[k] || []).push(r); }
      const bars = [{ label: "Total", ros: total.ros, prevRos: total.prevRos }];
      for (const k of order) if (by[k] && by[k].length) { const g = grp(by[k]); bars.push({ label: labelMap[k] || k, ros: g.ros, prevRos: g.prevRos }); }
      return { bars, benchmark: total.ros };
    };
    const AREA = ["Urban", "Suburban", "Small Town", "Rural"];
    const INCOME = ["Low (<$58K)", "Moderate ($58-70K)", "High ($70-84K)", "Affluent ($84K+)"];
    const INCOME_SHORT = { "Low (<$58K)": "Low", "Moderate ($58-70K)": "Moderate", "High ($70-84K)": "High", "Affluent ($84K+)": "Affluent" };
    return { area: series(r => r.area_type, AREA, {}), income: series(r => r.income_bucket, INCOME, INCOME_SHORT) };
  }, [scopedRows, itemF, itemChan]);

  // load the 24-window series — one fast server-side RPC (sums inside Postgres).
  // Defaults to ALL wholesale (no params). Debounced so typing search doesn't
  // fire a request per keystroke.
  useEffect(() => {
    const myId = ++loadId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const sparams = {};                          // scope only (no product key)
        if (stF !== "All") sparams.p_state = stF;
        if (cityF !== "All") sparams.p_city = cityF;
        if (chainF !== "All") sparams.p_chain = chainF;
        if (distF !== "All") sparams.p_distributor = distF;
        if (premF !== "All") sparams.p_premise = premF;
        const params = { ...sparams, ...(itemF !== "All" ? { p_product_key: itemF } : {}) };
        const calls = [
          supabase.rpc("trends_30d", params),            // graph 1 (cases): actual 30-day cases
          supabase.rpc("trends_accounts_90d", params),   // graph 2: rolling-90 accounts + cases
          supabase.rpc("trends_item_ros", sparams),      // graph 4: per-item ROS over 8 periods
        ];
        // graph 3 (ROS by channel): only fetch per-item breakdown when an item is picked;
        // otherwise the channel chart is computed client-side from account totals.
        if (itemF !== "All") calls.push(supabase.rpc("trends_item_accounts", { p_product_key: itemF, ...sparams }));
        const [r30, rAcc, rItem, rChan] = await Promise.all(calls);
        if (r30.error) throw r30.error;
        if (rAcc.error) throw rAcc.error;
        if (rItem.error) throw rItem.error;
        if (rChan && rChan.error) throw rChan.error;
        if (loadId.current !== myId) return; // a newer load superseded this one
        const sums = new Array(24).fill(0);
        for (const r of (r30.data || [])) { const wi = r.window_index; if (wi >= 0 && wi < 24) sums[wi] = Number(r.cases) || 0; }
        const accts = new Array(12).fill(0), cases90 = new Array(12).fill(0);
        for (const r of (rAcc.data || [])) { const p = r.period; if (p >= 0 && p < 12) { accts[p] = Number(r.accts) || 0; cases90[p] = Number(r.cases) || 0; } }
        // top-5 items by total 90D volume; ROS = cases / accts / 3 per period, oldest -> newest
        const byKey = {};
        for (const r of (rItem.data || [])) {
          const p = r.period; if (p < 0 || p > 7) continue;
          const e = byKey[r.product_key] || (byKey[r.product_key] = { cases: new Array(8).fill(0), accts: new Array(8).fill(0), tot: 0 });
          const c = Number(r.cases) || 0;
          e.cases[p] = c; e.accts[p] = Number(r.accts) || 0; e.tot += c;
        }
        const top5 = Object.entries(byKey).sort((a, b) => b[1].tot - a[1].tot).slice(0, 5)
          .map(([key, e]) => ({ key, ros: e.cases.map((c, i) => (e.accts[i] > 0 ? c / e.accts[i] / 3 : 0)).reverse() }));
        setSeries(sums);
        setAcct({ accts, cases90 });
        setItemRos(top5);
        setItemChan(itemF !== "All" ? (rChan?.data || []) : null);
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

  // item ROS chart: 8 monthly labels (oldest -> newest) + named/colored series
  const itemLabels = useMemo(() => {
    const base = snap ? new Date(snap) : new Date();
    const out = [];
    for (let k = 7; k >= 0; k--) { const d = new Date(base); d.setDate(d.getDate() - k * 30); out.push(d.toLocaleString("en-US", { month: "short" })); }
    return out;
  }, [snap]);
  const itemLineSeries = useMemo(() => {
    if (!itemRos || !itemRos.length) return null;
    const colors = ["#3C6E47", "#2C5378", "#C0703A", "#6E4FA3", "#B23A48"];
    return itemRos.map((s, i) => ({ name: items.find(x => x.key === s.key)?.name || s.key, color: colors[i % colors.length], ros: s.ros }));
  }, [itemRos, items]);

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
    <div className="pagefade" style={wrap}>
      <style>{`.nobar{scrollbar-width:none;-ms-overflow-style:none;}.nobar::-webkit-scrollbar{display:none;width:0;height:0;}`}</style>

      <div style={{ padding: "12px 14px 2px", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.3px" }}>Wholesale Trends</div>
        <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 1 }}>Actual 30-day depletions over time — filter, then scroll.</div>
      </div>

      {/* filters (no "near me") */}
      <div className="nobar" style={{ display: "flex", gap: 6, padding: "10px 12px 8px", overflowX: "auto", flexShrink: 0 }}>
        <FilterSelect label="State" value={stF} options={states} onChange={v => { setStF(v); setCityF("All"); setChainF("All"); }} display={s => s === "All" ? "All states" : s} />
        <FilterSelect label="City" value={cityF} options={cities} onChange={v => { setCityF(v); setChainF("All"); }} display={c => c === "All" ? "All cities" : c} />
        <FilterSelect label="Chain" value={chainF} options={chains} onChange={setChainF} display={c => c === "All" ? "All chains" : c} />
        <FilterSelect label="Premise" value={premF} options={["All", "ON", "OFF"]} onChange={setPremF} display={p => p === "ON" ? "On-premise" : p === "OFF" ? "Off-premise" : "All premise"} />
        <FilterSelect label="Distributor" value={distF} options={dists} onChange={setDistF} display={d => d === "All" ? "All distributors" : d} />
        <FilterSelect label="Item" value={itemF} options={["All", ...items.map(i => i.key)]} onChange={setItemF} display={k => k === "All" ? "All items" : (items.find(i => i.key === k)?.name || k)} />
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, margin: "12px 2px 6px" }}>
              <div style={{ fontSize: 11.5, color: "var(--text-3)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scopeLabel}{rows ? ` · ${scopedIds.length.toLocaleString()} accounts` : ""}</div>
              <div style={{ display: "flex", gap: 3, flexShrink: 0, background: "var(--surface-2)", borderRadius: 9, padding: 2 }}>
                {[["month", "12 mo"], ["quarter", "Qtr"]].map(([k, t]) => (
                  <button key={k} onClick={() => setMode(k)} className="tapd"
                    style={{ fontSize: 11, fontWeight: 600, padding: "4px 11px", borderRadius: 7, cursor: "pointer", border: "none", fontFamily: "inherit",
                      background: mode === k ? "var(--surface)" : "transparent", color: mode === k ? "var(--text)" : "var(--text-3)", boxShadow: mode === k ? "var(--shadow-sm)" : "none" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
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
            {channelRos && (
              <ChannelRosCard
                title={itemF !== "All" ? `ROS by channel · ${items.find(x => x.key === itemF)?.name || itemF}` : "ROS by channel"}
                sub="Current 90-day rate of sale · momentum vs prior 90 · dashed = overall"
                bars={channelRos.bars} benchmark={channelRos.benchmark} />
            )}
            {demoRos && (
              <ChannelRosCard
                title={itemF !== "All" ? `ROS by area type · ${items.find(x => x.key === itemF)?.name || itemF}` : "ROS by area type"}
                sub="Current 90-day rate of sale · momentum vs prior 90 · dashed = overall"
                bars={demoRos.area.bars} benchmark={demoRos.area.benchmark} />
            )}
            {demoRos && (
              <ChannelRosCard
                title={itemF !== "All" ? `ROS by household income · ${items.find(x => x.key === itemF)?.name || itemF}` : "ROS by household income"}
                sub="Current 90-day rate of sale · momentum vs prior 90 · dashed = overall"
                bars={demoRos.income.bars} benchmark={demoRos.income.benchmark} />
            )}
            {itemLineSeries && (
              <ItemRosLines
                title="ROS over time · top items"
                sub="Standard ROS per item · last 8 months · top 5 by volume in scope"
                series={itemLineSeries} labels={itemLabels} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

