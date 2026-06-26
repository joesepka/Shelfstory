"use client";
import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Splash from "../../components/Splash";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { BarCard, AcctRosCard } from "../../components/Charts";
import { gpct, kfmt, titleCase, healthBucket, vol, isOn, monthLabels } from "../../lib/utils";

const PREPARED_BY = "Joe Sepka";
const DATA_THRU = "6/15/2026";

function DistInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const distParam = sp.get("d") || "";
  const [rows, setRows] = useState(null);
  const [grid, setGrid] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      let all = [], from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("account_list")
          .select("account_id,account_name,distributor,chain,city,state,channel,channel_type,headline,account_weight,cur90,prev90,live_placements,live_prev,spark,area_type,income_bucket")
          .order("account_weight", { ascending: false })
          .range(from, from + 4999);
        if (error) { setErr(error.message); return; }
        all = all.concat(data || []);
        if (!data || data.length < 5000) break;
        from += 5000;
      }
      setRows(all);
    })();
  }, []);

  const distributors = useMemo(() => rows ? [...new Set(rows.map(r => r.distributor).filter(Boolean))].sort() : [], [rows]);
  const dist = distParam || distributors[0] || "";
  function pickDist(d) { router.replace(`/dist?d=${encodeURIComponent(d)}`, { scroll: false }); }

  const scoped = useMemo(() => rows && dist ? rows.filter(r => r.distributor === dist) : [], [rows, dist]);

  const scopedIdKey = useMemo(() => scoped.map(a => a.account_id).join(","), [scoped]);
  useEffect(() => {
    if (!scoped.length) { setGrid([]); return; }
    let dead = false;
    (async () => {
      setGrid(null);
      const ids = scoped.map(a => a.account_id);
      let all = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase.from("item_grid").select("account_id,product_key,item_name,l90,l90_prev").in("account_id", ids.slice(i, i + 200));
        if (error) { if (!dead) setErr(error.message); return; }
        all = all.concat(data || []);
      }
      if (!dead) setGrid(all);
    })();
    return () => { dead = true; };
  }, [scopedIdKey]);

  const plcByAcct = useMemo(() => {
    if (!grid) return null;
    const m = {};
    for (const it of grid) if ((it.l90 || 0) > 0) m[it.account_id] = (m[it.account_id] || 0) + 1;
    return m;
  }, [grid]);

  const m = useMemo(() => {
    if (!scoped.length) return null;
    let cur = 0, prev = 0, l52 = 0, pNow = 0, pPrev = 0, aNow = 0, aPrev = 0;
    for (const a of scoped) {
      cur += a.cur90 || 0; prev += a.prev90 || 0; l52 += a.account_weight || 0;
      pNow += a.live_placements || 0; pPrev += a.live_prev || 0;
      if ((a.cur90 || 0) > 0) aNow++; if ((a.prev90 || 0) > 0) aPrev++;
    }
    const NP = 12;
    let cases = new Array(NP).fill(0), accts = new Array(NP).fill(0);
    for (const a of scoped) {
      const s = Array.isArray(a.spark) ? a.spark : [];
      const off = Math.max(0, NP - s.length);
      for (let i = 0; i < s.length && off + i < NP; i++) { const v = +s[i] || 0; const idx = off + i; cases[idx] += v; if (v > 0) accts[idx] += 1; }
    }
    cases = cases.slice(0, NP - 1);
    accts = accts.slice(0, NP - 1);
    const ros = cases.map((c, i) => accts[i] > 0 ? c / accts[i] : 0);
    const rosNow = aNow ? cur / aNow / 3 : 0;
    const rosPrev = aPrev ? prev / aPrev / 3 : 0;
    return {
      cur, prev, l52, pNow, n: scoped.length, aNow,
      pct: gpct(cur, prev), acctPct: gpct(aNow, aPrev), distPct: gpct(pNow, pPrev),
      rosNow, rosPrev, rosPct: rosPrev > 0 ? Math.round(100 * (rosNow - rosPrev) / rosPrev) : null,
      cases, accts, ros,
    };
  }, [scoped]);

  const health = useMemo(() => {
    if (!scoped.length) return null;
    const g = { new: { n: 0, vol: 0 }, healthy: { n: 0, vol: 0 }, atrisk: { n: 0, vol: 0 }, lapsed: { n: 0, vol: 0 } };
    for (const a of scoped) { const k = healthBucket(a.headline); g[k].n++; g[k].vol += vol(a); }
    const tot = Object.values(g).reduce((s, e) => s + e.vol, 0) || 1;
    const pc = v => Math.round(100 * v / tot);
    Object.keys(g).forEach(k => g[k].pct = pc(g[k].vol));
    return { ...g, tot, goodPct: pc(g.new.vol + g.healthy.vol), badPct: pc(g.atrisk.vol + g.lapsed.vol) };
  }, [scoped]);

  const items = useMemo(() => {
    if (!grid) return null;
    const byItem = {};
    for (const it of grid) {
      const e = byItem[it.product_key] || (byItem[it.product_key] = { name: it.item_name, l90: 0, prev: 0, doorsNow: 0, doorsPrev: 0 });
      e.l90 += it.l90 || 0; e.prev += it.l90_prev || 0;
      if ((it.l90 || 0) > 0) e.doorsNow++; if ((it.l90_prev || 0) > 0) e.doorsPrev++;
    }
    let arr = Object.values(byItem).map(e => ({
      name: e.name, l90: Math.round(e.l90), prev: Math.round(e.prev),
      dCases: Math.round(e.l90 - e.prev), gPct: gpct(e.l90, e.prev),
      dDoors: e.doorsNow - e.doorsPrev, doorsNow: e.doorsNow,
    })).filter(e => e.l90 > 0 || e.prev > 0).sort((a, b) => b.l90 - a.l90);
    return { all: arr, count: arr.length };
  }, [grid]);

  const movers = useMemo(() => {
    if (!items) return null;
    const named = (items.all || []).filter(it => it.prev > 0 || it.l90 > 0);
    const up = [...named].filter(it => it.dCases > 0).sort((a, b) => b.dCases - a.dCases).slice(0, 3);
    const down = [...named].filter(it => it.dCases < 0).sort((a, b) => a.dCases - b.dCases).slice(0, 3);
    const why = it => {
      const cUp = it.dCases > 0;
      if (it.dDoors !== 0 && Math.sign(it.dDoors) === Math.sign(it.dCases) && Math.abs(it.dDoors) >= 2)
        return `${it.dDoors > 0 ? "+" : ""}${it.dDoors} placements — ${cUp ? "distribution-led" : "lost distribution"}`;
      return `same placements selling ${cUp ? "harder" : "softer"} — velocity`;
    };
    return { up: up.map(it => ({ ...it, why: why(it) })), down: down.map(it => ({ ...it, why: why(it) })) };
  }, [items]);

  function aggBy(keyFn) {
    const g = {};
    for (const a of scoped) {
      const k = keyFn(a); if (k == null) continue;
      const e = g[k] || (g[k] = { key: k, cases: 0, prev: 0, accts: 0, plc: 0, l52: 0, on: isOn(a) });
      e.cases += a.cur90 || 0; e.prev += a.prev90 || 0; e.l52 += a.account_weight || 0;
      if ((a.cur90 || 0) > 0) { e.accts++; e.plc += (plcByAcct?.[a.account_id] || 0); }
    }
    return Object.values(g).map(e => ({
      ...e, cases: Math.round(e.cases),
      ros: e.accts ? e.cases / e.accts / 3 : 0, avgPlc: e.accts ? e.plc / e.accts : 0, gPct: gpct(e.cases, e.prev),
    }));
  }

  const channelRows = useMemo(() => {
    if (!scoped.length || !plcByAcct) return null;
    const totL52 = scoped.reduce((s, a) => s + (a.account_weight || 0), 0) || 1;
    const all = aggBy(a => a.channel_type || null).sort((a, b) => b.cases - a.cases);
    const big = [], smallOn = { key: "All other on", cases: 0, prev: 0, accts: 0, plc: 0, l52: 0, on: true },
      smallOff = { key: "All other off", cases: 0, prev: 0, accts: 0, plc: 0, l52: 0, on: false };
    for (const r of all) {
      if (r.l52 / totL52 >= 0.05) big.push(r);
      else { const t = r.on ? smallOn : smallOff; t.cases += r.cases; t.prev += r.prev; t.accts += r.accts; t.plc += r.plc; t.l52 += r.l52; }
    }
    const finalize = e => ({ ...e, ros: e.accts ? e.cases / e.accts / 3 : 0, avgPlc: e.accts ? e.plc / e.accts : 0, gPct: gpct(e.cases, e.prev) });
    const out = [...big];
    if (smallOff.accts) out.push(finalize(smallOff));
    if (smallOn.accts) out.push(finalize(smallOn));
    return out;
  }, [scoped, plcByAcct]);

  const chainRows = useMemo(() => {
    if (!scoped.length || !plcByAcct) return null;
    const rows = aggBy(a => a.chain ? a.chain : "__indie__").sort((a, b) => b.cases - a.cases);
    const indie = rows.find(r => r.key === "__indie__");
    const chains = rows.filter(r => r.key !== "__indie__").slice(0, 6);
    const out = chains.map(r => ({ ...r, label: titleCase(r.key) }));
    if (indie) out.push({ ...indie, label: "Independents", isIndie: true });
    return out;
  }, [scoped, plcByAcct]);

  // ROS by area type + household income (standard ROS = 90D cases / active accts / 3),
  // scoped to this distributor. Total bar + buckets in fixed order; benchmark = total.
  const demoRows = useMemo(() => {
    if (!scoped.length || !plcByAcct) return null;
    let cur = 0, prev = 0, accts = 0, paccts = 0;
    for (const a of scoped) { const c = a.cur90 || 0, p = a.prev90 || 0; cur += c; if (c > 0) accts++; prev += p; if (p > 0) paccts++; }
    const totRos = accts ? cur / accts / 3 : 0;
    const pick = (agg, keys, labels) => {
      const by = {}; agg.forEach(r => { by[r.key] = r; });
      const bars = [{ label: "Total", ros: totRos, gPct: gpct(cur, prev) }];
      keys.forEach((k, i) => { const e = by[k]; if (e && e.accts) bars.push({ label: labels[i], ros: e.ros, gPct: e.gPct }); });
      return bars;
    };
    return {
      area: pick(aggBy(a => a.area_type || null), ["Urban", "Suburban", "Small Town", "Rural"], ["Urban", "Suburban", "Small Town", "Rural"]),
      income: pick(aggBy(a => a.income_bucket || null), ["Low (<$58K)", "Moderate ($58-70K)", "High ($70-84K)", "Affluent ($84K+)"], ["Low", "Moderate", "High", "Affluent"]),
      benchmark: totRos,
    };
  }, [scoped, plcByAcct]);

  // Deck "Your book" lists: top growers + biggest decliners by 90D case delta
  // (cur90 − prev90). If there are no real growth drivers, fall back to the top
  // accounts that aren't declining (by current volume).
  const bookLists = useMemo(() => {
    if (!scoped.length) return null;
    const tagFor = h => { const x = String(h || "").toLowerCase(); return x === "lapsed" ? "lapsed" : x === "at-risk" ? "at-risk" : x === "decelerating" ? "softening" : x === "new" ? "new" : x === "accelerating" ? "accelerating" : ""; };
    const wd = scoped.map(a => ({ account_id: a.account_id, account_name: a.account_name, city: a.city, chain: a.chain, channel_type: a.channel_type, cur90: a.cur90 || 0, prev90: a.prev90 || 0, delta: Math.round((a.cur90 || 0) - (a.prev90 || 0)), weight: Math.round(a.account_weight || 0), plcDelta: (a.live_placements || 0) - (a.live_prev || 0), tag: tagFor(a.headline), lapsed: String(a.headline || "").toLowerCase() === "lapsed" }));
    let growers = wd.filter(a => a.delta > 0).sort((x, y) => y.delta - x.delta).slice(0, 10);
    let growMode = "growing";
    if (growers.length === 0) { growers = wd.filter(a => a.delta >= 0 && a.cur90 > 0).sort((x, y) => y.cur90 - x.cur90).slice(0, 10); growMode = "top"; }
    growers = growers.map(a => growMode === "growing"
      ? { ...a, mainVal: `+${a.delta.toLocaleString()} cs`, mainColor: PT.up }
      : { ...a, tag: "", mainVal: `${a.cur90.toLocaleString()} cs`, mainColor: PT.ink });
    const decliners = wd.filter(a => a.delta < 0 && a.prev90 > 0).sort((x, y) => x.delta - y.delta).slice(0, 10)
      .map(a => ({ ...a, mainVal: `${a.delta.toLocaleString()} cs`, mainColor: PT.down }));
    return { growers, decliners, growMode };
  }, [scoped]);

  const verdict = useMemo(() => m ? buildVerdict(m, dist) : "", [m, dist]);

  const summary = useMemo(() => {
    if (!m || !health || !items || !channelRows || !chainRows) return null;
    const head = [], opp = [];
    if (m.pct != null && m.pct <= -3) head.push({ mag: Math.abs(m.pct), t: `Volume down ${Math.abs(m.pct)}%`, d: `${Math.round(m.cur).toLocaleString()} cs — ${m.acctPct != null && m.pct - m.acctPct <= -4 ? "accounts falling faster than volume" : "rate-of-sale is the drag"}.` });
    if (health.lapsed.n > 0) head.push({ mag: health.lapsed.pct + 8, t: `${health.lapsed.n} accounts lapsed`, d: `${health.lapsed.pct}% of volume; at-risk holds another ${health.atrisk.pct}%.` });
    const decCh = [...channelRows].filter(r => r.gPct != null && r.gPct <= -3 && !String(r.key).startsWith("All other")).sort((a, b) => a.gPct - b.gPct)[0];
    if (decCh) head.push({ mag: Math.abs(decCh.gPct), t: `${titleCase(decCh.key)} down ${Math.abs(decCh.gPct)}%`, d: `${decCh.cases.toLocaleString()} cs across ${decCh.accts} accts — softest channel.` });
    const decItem = (items.all || []).filter(it => it.gPct != null && it.gPct <= -5 && it.prev > 0).sort((a, b) => a.dCases - b.dCases)[0];
    if (decItem) head.push({ mag: Math.abs(decItem.gPct), t: `${titleCase(decItem.name)} slipping`, d: `${decItem.dCases.toLocaleString()} cs (${decItem.gPct}%)${decItem.dDoors < 0 ? `, −${Math.abs(decItem.dDoors)} placements` : ""}.` });
    const decChain = [...chainRows].filter(r => !r.isIndie && r.gPct != null && r.gPct <= -3).sort((a, b) => a.gPct - b.gPct)[0];
    if (decChain) head.push({ mag: Math.abs(decChain.gPct), t: `${decChain.label} down ${Math.abs(decChain.gPct)}%`, d: `${decChain.cases.toLocaleString()} cs — chain-level conversation.` });

    if (m.pct != null && m.acctPct != null && m.pct >= 3 && (m.pct - m.acctPct) <= -4) opp.push({ mag: Math.abs(m.pct - m.acctPct) + 5, t: "New accounts haven't ramped", d: `${health.new.n} new accts at ${health.new.pct}% of volume — velocity banked.` });
    const grItem = (items.all || []).filter(it => it.gPct != null && it.gPct >= 5).sort((a, b) => b.dCases - a.dCases)[0];
    if (grItem) opp.push({ mag: grItem.gPct, t: `${titleCase(grItem.name)} momentum`, d: `+${grItem.dCases.toLocaleString()} cs (${grItem.gPct > 0 ? "+" : ""}${grItem.gPct}%)${grItem.dDoors > 0 ? `, +${grItem.dDoors} placements` : ""}.` });
    const grCh = [...channelRows].filter(r => r.gPct != null && r.gPct >= 4 && !String(r.key).startsWith("All other")).sort((a, b) => b.gPct - a.gPct)[0];
    if (grCh) opp.push({ mag: grCh.gPct, t: `${titleCase(grCh.key)} up ${grCh.gPct}%`, d: `${grCh.cases.toLocaleString()} cs at ${grCh.ros.toFixed(1)} ROS — lean in.` });
    const indie = chainRows.find(r => r.isIndie);
    if (indie && indie.gPct != null && indie.gPct >= 3) opp.push({ mag: indie.gPct + 2, t: `Independents up ${indie.gPct}%`, d: `${indie.cases.toLocaleString()} cs, ${indie.accts} accts — you control these.` });

    head.sort((a, b) => b.mag - a.mag);
    opp.sort((a, b) => b.mag - a.mag);
    return { head: head.slice(0, 4), opp: opp.slice(0, 4) };
  }, [m, health, items, channelRows, chainRows]);

  if (err) return <div style={wrap}><Top dist={dist} distributors={distributors} pickDist={pickDist} /><p style={{ color: "var(--down)", padding: 20, fontSize: 13 }}>Couldn’t load. {err}</p></div>;

  const ready = m && health && items && channelRows && chainRows && movers && summary && demoRows && bookLists;
  const deckRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    if (!deckRef.current || exporting) return;
    setExporting(true);
    try {
      const slides = Array.from(deckRef.current.querySelectorAll(".pslide"));
      const pdf = new jsPDF({ orientation: "landscape", unit: "in", format: [11, 8.5] });
      for (let i = 0; i < slides.length; i++) {
        const canvas = await html2canvas(slides[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false, windowWidth: slides[i].scrollWidth, windowHeight: slides[i].scrollHeight });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage([11, 8.5], "landscape");
        pdf.addImage(img, "JPEG", 0, 0, 11, 8.5);
      }
      const safe = titleCase(dist).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
      pdf.save(`${safe || "Distributor"}-Review.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
      alert("PDF export hit a snag — try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={wrap}>
      <style>{PRINT_CSS}</style>
      <style>{`.nobar{scrollbar-width:none;-ms-overflow-style:none;}.nobar::-webkit-scrollbar{display:none;width:0;height:0;}`}</style>

      <div className="screen-only" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Top dist={dist} distributors={distributors} pickDist={pickDist} canPrint={!!ready} onExport={exportPdf} exporting={exporting} />

        {!rows && <Splash fixed={false} />}
        {rows && !dist && <div style={{ padding: 20, fontSize: 13, color: "var(--text-3)" }}>No distributors found.</div>}
        {rows && dist && !m && <div style={{ padding: 20, fontSize: 13, color: "var(--text-3)" }}>No accounts for {titleCase(dist)} in this book.</div>}

        {m && (
          <div className="nobar" style={{ flex: 1, overflowY: "auto", padding: "0 16px 40px", WebkitOverflowScrolling: "touch" }}>
            <section>
              <SecTag n="01" label="Pulse" />
              <H1>The last 90 days</H1>
              <div style={{ position: "relative", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14, boxShadow: "var(--shadow)", padding: "13px 6px", marginTop: 10 }}>
                <Bracket />
                <div style={{ display: "flex" }}>
                  <Kpi label="90D Cases" value={Math.round(m.cur).toLocaleString()} pct={m.pct} />
                  <Kpi label="Active Accts" value={m.aNow.toLocaleString()} pct={m.acctPct} divider />
                  <Kpi label="ROS / mo" value={m.rosNow.toFixed(1)} pct={m.rosPct} divider />
                </div>
              </div>
              <div style={{ position: "relative", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14, boxShadow: "var(--shadow)", padding: "13px 15px", marginTop: 9 }}>
                <Bracket cool />
                <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>{verdict}</div>
              </div>
              <BarCard title="12-month volume" sub="rolling-90 cases · quarter in focus highlighted" data={m.cases} labels={monthLabels(11)} hi={3} unit="cs" />
              <AcctRosCard title="Accounts & rate of sale" sub="rolling-90 accounts (bars) · monthly ROS (line)" accts={m.accts} ros={m.ros} labels={monthLabels(11)} hi={3} />

              {movers && (movers.up.length > 0 || movers.down.length > 0) && (
                <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)", padding: "13px 14px", marginTop: 12 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>Movers & shakers</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1, marginBottom: 8 }}>biggest case swings vs prior 90 — and what's driving them</div>
                  {movers.up.map(it => <MoverRow key={"u" + it.name} it={it} up />)}
                  {movers.down.map(it => <MoverRow key={"d" + it.name} it={it} />)}
                </div>
              )}
            </section>

            <section>
              <SecTag n="02" label="Items" />
              <H1>Top sellers</H1>
              {!items && <div style={{ fontSize: 12, color: "var(--text-3)", padding: "4px 2px" }}>Reading items…</div>}
              {items && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>90-day cases vs prior 90 days · top 8</div>}
              {items && <ItemsSection items={items} />}
            </section>

            <section>
              <SecTag n="03" label="Account Health" />
              <H1>Where the book stands</H1>
              {health && (
                <>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{scoped.length.toLocaleString()} accounts · circle size = share of 90-day volume</div>
                  <HealthCircles health={health} dist={dist} router={router} />
                </>
              )}
            </section>

            <section>
              <SecTag n="04" label="Channel & Chain" />
              <H1>Where it sells</H1>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", marginTop: 12, marginBottom: 6 }}>BY CHANNEL</div>
              {!channelRows && <div style={{ fontSize: 12, color: "var(--text-3)", padding: "4px 2px" }}>Reading channels…</div>}
              {channelRows && <BreakdownTable rows={channelRows} dist={dist} router={router} kind="channel" />}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", marginTop: 16, marginBottom: 6 }}>BY CHAIN</div>
              {!chainRows && <div style={{ fontSize: 12, color: "var(--text-3)", padding: "4px 2px" }}>Reading chains…</div>}
              {chainRows && <BreakdownTable rows={chainRows} dist={dist} router={router} kind="chain" />}
            </section>

            <section>
              <SecTag n="05" label="Executive Summary" />
              <H1>Headwinds & opportunities</H1>
              {!summary && <div style={{ fontSize: 12, color: "var(--text-3)", padding: "8px 2px" }}>Reading the report…</div>}
              {summary && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--pop-warm-deep)", marginBottom: 7, letterSpacing: .3 }}>HEADWINDS</div>
                    {summary.head.length === 0 && <div style={{ fontSize: 11, color: "var(--text-3)" }}>Book is clean.</div>}
                    {summary.head.map((x, i) => <ExecCard key={i} x={x} warm />)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--accent-deep)", marginBottom: 7, letterSpacing: .3 }}>OPPORTUNITIES</div>
                    {summary.opp.length === 0 && <div style={{ fontSize: 11, color: "var(--text-3)" }}>Hold and defend.</div>}
                    {summary.opp.map((x, i) => <ExecCard key={i} x={x} />)}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 9.5, color: "var(--text-3)", marginTop: 18, textAlign: "center" }}>Prepared by {PREPARED_BY}</div>
            </section>

            <div style={{ height: 30 }} />
          </div>
        )}
      </div>

      {ready && <PrintDeck deckRef={deckRef} dist={dist} m={m} health={health} items={items} movers={movers} verdict={verdict} channelRows={channelRows} chainRows={chainRows} summary={summary} demoRows={demoRows} bookLists={bookLists} />}
    </div>
  );
}

/* ================= PRINT DECK ================= */
const PRINT_CSS = `
.print-deck { position: absolute; left: -20000px; top: 0; width: 11in; }
.pslide { width: 11in; height: 8.5in; min-height: 8.5in; max-height: 8.5in; overflow: hidden; position: relative; box-sizing: border-box; display: flex; flex-direction: column; background: #FFFFFF; font-family: var(--font-sans), system-ui, sans-serif; }
`;

// Deck palette — white pages (clean to print), light cards, the app's value-shaded
// green/blue/purple bars + corner brackets. Hardcoded (not CSS vars) because
// html2canvas captures these slides off-screen.
const PT = {
  paper: "#FFFFFF", card: "#F7F8F5", lapsed: "#FBECEA",
  ink: "#2B2B2B", ink2: "#54604F", mut: "#9AA593", line: "#E7EBDF", lineStrong: "#DCE2D2",
  green: "#3F6E4A", greenMid: "#5E9277", greenSoft: "#E1EFE2",
  blue: "#3D6E93", blueMid: "#5E8FC0", blueSoft: "#E2EBF4",
  amber: "#8A6310", amberSoft: "#F5EBD3",
  warm: "#B0573A", warmSoft: "#F6E2D8", up: "#3E8A5E", down: "#C0533A",
  purple: "#534AB7", purpleDeep: "#463A76", purpleSoft: "#EEEDFE",
  tile: "#F7F8F5", panel: "#F7F8F5",
};

// top-left corner bracket — the app's signature card accent
function PBracket({ c }) {
  return <span aria-hidden="true" style={{ position: "absolute", top: -1, left: -1, width: 13, height: 13, borderTop: `2px solid ${c || PT.greenMid}`, borderLeft: `2px solid ${c || PT.greenMid}`, borderTopLeftRadius: 7 }} />;
}

// value-shaded ROS bars by category (purple) with a dashed benchmark line — mirrors
// the app's ChannelRosCard. bars: [{label, ros, gPct}]. benchmark: number.
function PDemoBars({ title, bars, benchmark }) {
  const mx = Math.max(...bars.map(b => b.ros), benchmark || 0, 0.1);
  const lo = Math.min(...bars.map(b => b.ros).filter(x => x > 0), mx);
  const scale = mx * 1.18;
  const shade = v => { const t = mx > lo ? (v - lo) / (mx - lo) : 1; const u = 0.2 + 0.8 * Math.max(0, Math.min(1, t)); const a = [171, 165, 222], b = [70, 58, 118]; return `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * u)).join(",")})`; };
  const benchTop = benchmark > 0 ? (1 - benchmark / scale) * 100 : -1;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, color: PT.mut, marginBottom: 6 }}>{title}</div>
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 7, height: "0.95in" }}>
        {benchmark > 0 && <div style={{ position: "absolute", left: 0, right: 0, top: `${benchTop}%`, borderTop: `1.2px dashed ${PT.purpleDeep}`, opacity: 0.5 }} />}
        {bars.map((b, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: PT.ink2 }}>{b.ros.toFixed(1)}</span>
            <div style={{ width: "100%", height: `${b.ros > 0 ? Math.max(3, (b.ros / scale) * 100) : 0}%`, background: shade(b.ros), borderRadius: "2px 2px 0 0" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 3 }}>
        {bars.map((b, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 7.5, color: PT.mut, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}</div>)}
      </div>
    </div>
  );
}

// Ranked account list for the deck (growers / decliners). rows carry precomputed
// mainVal + mainColor + tag so this stays a dumb renderer.
function PAcctList({ title, sub, accent, rows, empty }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: accent }}>{title}</div>
      <div style={{ fontSize: 8.5, color: PT.mut, marginBottom: 6 }}>{sub}</div>
      {(!rows || rows.length === 0) && <div style={{ fontSize: 10, color: PT.mut, fontStyle: "italic" }}>{empty}</div>}
      {rows && rows.map((a, i) => (
        <div key={a.account_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "5px 7px", borderRadius: 4, background: a.lapsed ? PT.lapsed : "transparent", borderBottom: i < rows.length - 1 ? `1px solid ${PT.line}` : "none" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: PT.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titleCase(a.account_name)}</div>
            <div style={{ fontSize: 8.5, color: PT.mut, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {a.city}{a.chain ? ` · ${titleCase(a.chain)}` : a.channel_type ? ` · ${titleCase(a.channel_type)}` : ""} · {a.weight.toLocaleString()} cs/yr
              {a.plcDelta < 0 && <span style={{ color: PT.down, fontWeight: 700 }}> · ▼{Math.abs(a.plcDelta)} SKU</span>}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: a.mainColor }}>{a.mainVal}</div>
            {a.tag && <div style={{ fontSize: 8, color: PT.mut }}>{a.tag}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PHead({ kick, title }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.18in 0.34in", borderBottom: `2.5px solid ${PT.green}`, flexShrink: 0 }}>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: PT.mut, textTransform: "uppercase" }}>{kick}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: PT.ink, marginTop: 2 }}>{title}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg viewBox="0 0 64 48" style={{ width: 26 }}><path d="M32 40 q-9 -4 -22 -2 v-22 q13 -2 22 2 z" fill="none" stroke={PT.green} strokeWidth="2.6" strokeLinejoin="round" /><path d="M32 40 q9 -4 22 -2 v-22 q-13 -2 -22 2 z" fill="none" stroke={PT.green} strokeWidth="2.6" strokeLinejoin="round" /><polyline points="15,30 23,27 31,22 41,14" fill="none" stroke={PT.greenMid} strokeWidth="2.8" strokeLinecap="round" /></svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: PT.green }}>ShelfStory</span>
      </div>
    </div>
  );
}
function PFoot({ page }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.1in 0.34in", borderTop: `1px solid ${PT.line}`, flexShrink: 0, fontSize: 8, color: "#B9C2AE" }}>
      <span>ShelfStory · Confidential</span>
      <span>Source: data thru {DATA_THRU}</span>
      <span>{page}</span>
    </div>
  );
}
function PTile({ label, value, delta, dColor, accent }) {
  return (
    <div style={{ flex: 1, background: PT.tile, border: `1px solid ${PT.line}`, borderRadius: 6, padding: "0.1in 0.13in", borderLeft: accent ? `3px solid ${accent}` : `1px solid ${PT.line}` }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: .3, color: PT.mut, textTransform: "uppercase", lineHeight: 1.2, minHeight: 20 }}>{label}</div>
      <div style={{ fontSize: 25, fontWeight: 700, color: PT.ink, letterSpacing: "-1px", marginTop: 3, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9.5, fontWeight: 700, marginTop: 4, color: dColor || PT.mut }}>{delta}</div>
    </div>
  );
}
function PChartBars({ data, labels, hi, color, colorHi, inkHi }) {
  const mx = Math.max(...data, 1), n = data.length;
  const AREA = 1.25;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: `${AREA}in` }}>
        {data.map((v, i) => {
          const on = i >= n - hi;
          const h = v > 0 ? Math.max(0.04, (v / mx) * (AREA - 0.16)) : 0;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
              <div style={{ fontSize: 7, textAlign: "center", marginBottom: 1, color: on ? inkHi : PT.mut, fontWeight: on ? 700 : 400 }}>{v > 0 ? kfmt(v) : ""}</div>
              <div style={{ height: `${h}in`, background: on ? colorHi : color, borderRadius: "1px 1px 0 0" }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 2 }}>{labels.map((l, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 6.5, color: PT.mut }}>{l}</div>)}</div>
    </div>
  );
}
function PAcctRos({ accts, ros, labels, hi }) {
  const n = accts.length, mxA = Math.max(...accts, 1);
  const mxR = Math.max(...ros, 0.1), mnR = Math.min(...ros.filter(x => x > 0), mxR);
  const span = (mxR - mnR) || 1, pad = span * 0.6, lo = Math.max(0, mnR - pad), hi2 = mxR + pad;
  const AREA = 1.25;
  const yOf = r => 88 - ((r - lo) / ((hi2 - lo) || 1)) * 72;
  const xOf = i => n > 1 ? (i / (n - 1)) * 100 : 50;
  const pts = accts.map((_, i) => `${xOf(i).toFixed(1)},${yOf(ros[i]).toFixed(1)}`).join(" ");
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", height: `${AREA}in` }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 3 }}>
          {accts.map((v, i) => {
            const on = i >= n - hi;
            const h = v > 0 ? Math.max(0.04, (v / mxA) * (AREA - 0.16)) : 0;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <div style={{ fontSize: 7, textAlign: "center", marginBottom: 1, color: on ? PT.blue : PT.mut, fontWeight: on ? 700 : 400 }}>{v > 0 ? kfmt(v) : ""}</div>
                <div style={{ height: `${h}in`, background: on ? PT.blueMid : "#CBD9E6", borderRadius: "1px 1px 0 0" }} />
              </div>
            );
          })}
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          <polyline points={pts} fill="none" stroke="#C56A4A" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 2 }}>{labels.map((l, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 6.5, color: PT.mut }}>{l}</div>)}</div>
    </div>
  );
}
function PPanelHead({ children }) { return <div style={{ fontSize: 9.5, fontWeight: 700, color: PT.mut, textTransform: "uppercase", letterSpacing: .3, marginBottom: 7 }}>{children}</div>; }

function PrintDeck({ deckRef, dist, m, health, items, movers, verdict, channelRows, chainRows, summary, demoRows, bookLists }) {
  const labels = monthLabels(11);
  const topItems = (items?.all || []).slice(0, 8);
  const itemMx = Math.max(...topItems.map(it => Math.max(it.l90, it.prev)), 1);
  const shortVerdict = (() => {
    const v = m.pct, a = m.acctPct;
    const t = v == null ? "running as new" : v >= 5 ? `up ${v}%` : v <= -5 ? `down ${Math.abs(v)}%` : "roughly flat";
    let s = `Volume is ${t} over 90 days on an account base ${a > 1 ? "up " + a + "%" : a < -1 ? "down " + Math.abs(a) + "%" : "essentially flat"}.`;
    if (v != null && a != null) {
      const gap = v - a;
      if (v >= 3 && gap <= -4) s += " Growth is distribution-led — newer placements haven't ramped, so velocity upside is banked.";
      else if (v >= 3 && gap >= 4) s += " Growth is velocity-led — the same accounts are selling harder.";
      else if (v <= -3) s += " The decline needs both a win-back push and a sell-through fix.";
      else s += " Accounts and rate-of-sale are roughly balanced.";
    }
    return s;
  })();
  // channel/chain callout helpers
  const topCh = [...channelRows].filter(r => !String(r.key).startsWith("All other") && r.gPct != null).sort((a, b) => b.gPct - a.gPct)[0];
  const topChain = [...chainRows].filter(r => !r.isIndie && r.gPct != null).sort((a, b) => b.gPct - a.gPct)[0];
  const softCh = [...channelRows].filter(r => !String(r.key).startsWith("All other") && r.gPct != null).sort((a, b) => a.gPct - b.gPct)[0];

  return (
    <div className="print-deck" ref={deckRef}>
      {/* COVER */}
      <div className="pslide">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0.7in", position: "relative" }}>
          <div style={{ position: "absolute", top: "0.4in", left: "0.7in", display: "flex", alignItems: "center", gap: 7 }}>
            <svg viewBox="0 0 64 48" style={{ width: 32 }}><path d="M32 40 q-9 -4 -22 -2 v-22 q13 -2 22 2 z" fill="none" stroke={PT.green} strokeWidth="2.4" strokeLinejoin="round" /><path d="M32 40 q9 -4 22 -2 v-22 q-13 -2 -22 2 z" fill="none" stroke={PT.green} strokeWidth="2.4" strokeLinejoin="round" /><polyline points="15,30 23,27 31,22 41,14" fill="none" stroke={PT.greenMid} strokeWidth="2.6" strokeLinecap="round" /></svg>
            <span style={{ fontSize: 15, fontWeight: 700, color: PT.ink }}>ShelfStory</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: PT.greenMid, textTransform: "uppercase" }}>Distributor Business Review</div>
          <div style={{ fontSize: 46, fontWeight: 700, color: PT.ink, letterSpacing: "-2px", marginTop: 10, lineHeight: 1 }}>{titleCase(dist)}</div>
          <div style={{ fontSize: 15, color: PT.ink2, marginTop: 12 }}>90-day performance review</div>
          <div style={{ width: 54, height: 3, background: PT.green, marginTop: 22 }} />
          <div style={{ fontSize: 12, color: PT.mut, marginTop: 16 }}>Prepared by {PREPARED_BY} · Source: data thru {DATA_THRU}</div>
        </div>
        <PFoot page="1" />
      </div>

      {/* TOC */}
      <div className="pslide">
        <PHead kick={`Distributor Review · ${titleCase(dist)}`} title="Contents" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0.6in" }}>
          {[["01", "Pulse", "90-day performance, trend, and what's moving"], ["02", "Items", "top sellers, current 90 days vs prior"], ["03", "Account Health", "where the book stands by status"], ["04", "Channel, Chain & Market", "where it sells, by channel, chain, area & income"], ["05", "Executive Summary", "headwinds, opportunities, and the ask"]].map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "0.11in 0", borderBottom: i < 4 ? `1px solid ${PT.line}` : "none" }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: PT.greenMid, width: 34 }}>{r[0]}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: PT.ink }}>{r[1]}</span>
              <span style={{ fontSize: 12, color: PT.mut }}>— {r[2]}</span>
            </div>
          ))}
        </div>
        <PFoot page="2" />
      </div>

      {/* PULSE */}
      <div className="pslide">
        <PHead kick="01 · Pulse" title="The last 90 days" />
        <div style={{ flex: 1, padding: "0.18in 0.34in", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <PTile label="52-wk volume" value={kfmt(m.l52)} delta="est. cases" accent={PT.mut} />
            <PTile label="90-day cases" value={Math.round(m.cur).toLocaleString()} delta={m.pct == null ? "—" : `${m.pct > 0 ? "▲" : "▼"} ${Math.abs(m.pct)}%`} dColor={m.pct > 0 ? PT.up : PT.down} />
            <PTile label="Active accounts" value={m.aNow.toLocaleString()} delta={m.acctPct == null ? "—" : `${m.acctPct > 0 ? "▲" : "▼"} ${Math.abs(m.acctPct)}%`} dColor={m.acctPct > 0 ? PT.up : PT.down} />
            <PTile label="Placements" value={m.pNow.toLocaleString()} delta={m.distPct == null ? "—" : `${m.distPct > 0 ? "▲" : "▼"} ${Math.abs(m.distPct)}%`} dColor={m.distPct > 0 ? PT.up : PT.down} />
            <PTile label="Cases/mo · avg acct" value={m.rosNow.toFixed(1)} delta={m.rosPct == null ? "rate of sale" : `${m.rosPct > 0 ? "▲" : m.rosPct < 0 ? "▼" : "▬"} ${Math.abs(m.rosPct)}%`} dColor={m.rosPct == null ? PT.mut : m.rosPct > 0 ? PT.up : m.rosPct < 0 ? PT.down : PT.mut} />
          </div>
          <div style={{ display: "flex", gap: 10, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1.55, display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
              <div style={{ position: "relative", background: PT.card, border: `1px solid ${PT.line}`, borderRadius: 8, padding: "0.12in 0.15in", flexShrink: 0, display: "flex", flexDirection: "column" }}>
                <PBracket c={PT.greenMid} />
                <PPanelHead>12-month volume — rolling 90, quarter in focus</PPanelHead>
                <PChartBars data={m.cases} labels={labels} hi={3} color="#C9DCD0" colorHi={PT.greenMid} inkHi={PT.green} />
              </div>
              <div style={{ position: "relative", background: PT.card, border: `1px solid ${PT.line}`, borderRadius: 8, padding: "0.12in 0.15in", flexShrink: 0, display: "flex", flexDirection: "column" }}>
                <PBracket c={PT.blueMid} />
                <PPanelHead>Accounts (bars) &amp; rate of sale (line)</PPanelHead>
                <PAcctRos accts={m.accts} ros={m.ros} labels={labels} hi={3} />
              </div>
            </div>
            <div style={{ position: "relative", flex: 1, background: PT.card, border: `1px solid ${PT.line}`, borderRadius: 8, padding: "0.16in 0.18in", display: "flex", flexDirection: "column" }}>
              <PBracket c={PT.greenMid} />
              <PPanelHead>What's driving it</PPanelHead>
              <div style={{ fontSize: 11.5, color: PT.ink2, lineHeight: 1.5 }}>{shortVerdict}</div>
              <div style={{ marginTop: 13, borderTop: `1px solid ${PT.lineStrong}`, paddingTop: 11 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: PT.mut, textTransform: "uppercase", marginBottom: 9 }}>Biggest movers</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {[...movers.up, ...movers.down].slice(0, 4).map((it, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: PT.ink, fontWeight: 600 }}>{it.dCases > 0 ? "▲" : "▼"} {titleCase(it.name)}</span>
                        <span style={{ color: it.dCases > 0 ? PT.up : PT.down, fontWeight: 700 }}>{it.dCases > 0 ? "+" : ""}{it.dCases.toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 9, color: PT.mut, marginTop: 1 }}>{it.why}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <PFoot page="3" />
      </div>

      {/* ITEMS */}
      <div className="pslide">
        <PHead kick="02 · Items" title="Top items — 90 days vs prior" />
        <div style={{ flex: 1, padding: "0.18in 0.34in", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, color: PT.mut }}>Current 90D vs prior 90D · top 8 by volume</div>
            <div style={{ display: "flex", gap: 16, fontSize: 10, color: PT.ink2 }}>
              <span><span style={{ display: "inline-block", width: 11, height: 11, background: PT.greenMid, borderRadius: 2, verticalAlign: "middle", marginRight: 4 }} />current 90D</span>
              <span><span style={{ display: "inline-block", width: 11, height: 11, background: "#C3CBBA", borderRadius: 2, verticalAlign: "middle", marginRight: 4 }} />prior 90D</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: "2.7in", padding: "0 0.05in" }}>
            {topItems.map(it => {
              const cur = it.l90 > 0 ? Math.max(0.04, (it.l90 / itemMx) * 2.45) : 0;
              const pri = it.prev > 0 ? Math.max(0.04, (it.prev / itemMx) * 2.45) : 0;
              const figC = it.gPct == null ? PT.mut : it.gPct > 1 ? PT.green : it.gPct < -1 ? PT.down : PT.mut;
              return (
                <div key={it.name} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                  <div style={{ display: "flex", gap: 3, alignItems: "flex-end", justifyContent: "center", height: "100%" }}>
                    <div style={{ width: "42%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                      <div style={{ fontSize: 8.5, color: figC, fontWeight: 700, textAlign: "center", marginBottom: 2 }}>{kfmt(it.l90)}</div>
                      <div style={{ height: `${cur}in`, background: PT.greenMid, borderRadius: "2px 2px 0 0" }} />
                    </div>
                    <div style={{ width: "42%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                      <div style={{ fontSize: 8.5, color: PT.mut, textAlign: "center", marginBottom: 2 }}>{kfmt(it.prev)}</div>
                      <div style={{ height: `${pri}in`, background: "#C3CBBA", borderRadius: "2px 2px 0 0" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 12, padding: "5px 0.05in 10px" }}>
            {topItems.map(it => <div key={it.name} style={{ flex: 1, textAlign: "center", fontSize: 8.5, color: PT.ink2, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titleCase(it.name)}</div>)}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", fontSize: 8, fontWeight: 700, color: PT.mut, textTransform: "uppercase", padding: "4px 7px", borderBottom: `1px solid ${PT.lineStrong}` }}>Item</th>
                <th style={{ textAlign: "right", fontSize: 8, fontWeight: 700, color: PT.mut, textTransform: "uppercase", padding: "4px 7px", borderBottom: `1px solid ${PT.lineStrong}` }}>90D cs</th>
                <th style={{ textAlign: "right", fontSize: 8, fontWeight: 700, color: PT.mut, textTransform: "uppercase", padding: "4px 7px", borderBottom: `1px solid ${PT.lineStrong}` }}>Prior</th>
                <th style={{ textAlign: "right", fontSize: 8, fontWeight: 700, color: PT.mut, textTransform: "uppercase", padding: "4px 7px", borderBottom: `1px solid ${PT.lineStrong}` }}>Δ%</th>
                <th style={{ textAlign: "right", fontSize: 8, fontWeight: 700, color: PT.mut, textTransform: "uppercase", padding: "4px 7px", borderBottom: `1px solid ${PT.lineStrong}` }}>Placements</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map(it => {
                const dC = it.gPct == null ? PT.mut : it.gPct > 1 ? PT.up : it.gPct < -1 ? PT.down : PT.mut;
                return (
                  <tr key={it.name}>
                    <td style={{ textAlign: "left", color: PT.ink, fontWeight: 600, padding: "3.5px 7px", borderBottom: `1px solid ${PT.line}` }}>{titleCase(it.name)}</td>
                    <td style={{ textAlign: "right", color: PT.ink, fontWeight: 700, padding: "3.5px 7px", borderBottom: `1px solid ${PT.line}` }}>{it.l90.toLocaleString()}</td>
                    <td style={{ textAlign: "right", color: PT.mut, padding: "3.5px 7px", borderBottom: `1px solid ${PT.line}` }}>{it.prev.toLocaleString()}</td>
                    <td style={{ textAlign: "right", color: dC, fontWeight: 600, padding: "3.5px 7px", borderBottom: `1px solid ${PT.line}` }}>{it.gPct == null ? "—" : `${it.gPct > 0 ? "+" : ""}${it.gPct}%`}</td>
                    <td style={{ textAlign: "right", color: PT.ink2, padding: "3.5px 7px", borderBottom: `1px solid ${PT.line}` }}>{it.doorsNow.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PFoot page="4" />
      </div>

      {/* HEALTH — circles up top, then growers / decliners */}
      <div className="pslide">
        <PHead kick="03 · Account Health" title="Where the book stands" />
        <div style={{ flex: 1, padding: "0.18in 0.34in", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div style={{ fontSize: 9.5, color: PT.mut }}>{m.n.toLocaleString()} accounts · circle size = share of 90-day volume</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", flexShrink: 0 }}>
            {[["new", "New", PT.blueSoft, PT.blue], ["healthy", "Healthy", PT.greenSoft, PT.green], ["atrisk", "At risk", PT.amberSoft, PT.amber], ["lapsed", "Lapsed", PT.warmSoft, PT.warm]].map(([k, lab, bg, ink]) => {
              const b = health[k]; const maxP = Math.max(health.new.pct, health.healthy.pct, health.atrisk.pct, health.lapsed.pct, 1);
              const d = Math.round(46 + 52 * Math.sqrt(b.pct / maxP));
              return (
                <div key={k} style={{ textAlign: "center" }}>
                  <div style={{ width: d, height: d, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                    <span style={{ fontSize: d >= 84 ? 22 : d >= 66 ? 17 : 14, fontWeight: 700, color: ink }}>{b.n.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: ink, marginTop: 6, whiteSpace: "nowrap" }}>{lab}</div>
                  <div style={{ fontSize: 9, color: PT.mut }}>{b.pct}%</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 24, flexShrink: 0 }}>
            <div style={{ flex: 1, textAlign: "center", fontSize: 9.5, color: PT.ink2 }}><b style={{ color: PT.green, fontSize: 13 }}>{health.goodPct}%</b> healthy book · new + healthy</div>
            <div style={{ width: 1, flexShrink: 0 }} />
            <div style={{ flex: 1, textAlign: "center", fontSize: 9.5, color: PT.ink2 }}><b style={{ color: PT.warm, fontSize: 13 }}>{health.badPct}%</b> needs attention · at-risk + lapsed</div>
          </div>
          <div style={{ display: "flex", gap: 24, flex: 1, minHeight: 0, borderTop: `1px solid ${PT.lineStrong}`, paddingTop: 12 }}>
            <PAcctList accent={PT.green} rows={bookLists.growers} empty="No growth drivers this quarter."
              title={bookLists.growMode === "growing" ? "Top growing accounts" : "Top accounts"}
              sub={bookLists.growMode === "growing" ? "by 90-day case growth vs prior 90" : "steady — no clear growth drivers this quarter"} />
            <div style={{ width: 1, background: PT.line, flexShrink: 0 }} />
            <PAcctList accent={PT.warm} rows={bookLists.decliners} empty="No material decliners — book is holding."
              title="Biggest decliners" sub="lost & at-risk · 90-day case drop vs prior 90" />
          </div>
        </div>
        <PFoot page="5" />
      </div>

      {/* CHANNEL, CHAIN & MARKET */}
      <div className="pslide">
        <PHead kick="04 · Channel, Chain & Market" title="Where it sells" />
        <div style={{ flex: 1, padding: "0.2in 0.34in", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <PPanelHead>By channel</PPanelHead>
              <PTable rows={channelRows} kind="channel" />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <PPanelHead>By chain</PPanelHead>
              <PTable rows={chainRows} kind="chain" />
            </div>
          </div>
          <div style={{ position: "relative", background: PT.card, border: `1px solid ${PT.line}`, borderRadius: 8, padding: "0.14in 0.18in", flexShrink: 0 }}>
            <PBracket c={PT.purpleDeep} />
            <PPanelHead>Market — rate of sale by area &amp; income</PPanelHead>
            <div style={{ display: "flex", gap: 26 }}>
              <PDemoBars title="By area type" bars={demoRows.area} benchmark={demoRows.benchmark} />
              <PDemoBars title="By household income" bars={demoRows.income} benchmark={demoRows.benchmark} />
            </div>
          </div>
          <div style={{ background: PT.card, border: `1px solid ${PT.line}`, borderRadius: 8, padding: "0.13in 0.16in", fontSize: 11.5, color: PT.ink2, flexShrink: 0 }}>
            <b style={{ color: PT.ink }}>Read:</b> {topCh ? `${titleCase(topCh.key)}` : "Top channels"} {topChain ? `and ${topChain.label}` : ""} carrying growth{softCh && softCh.gPct < 0 ? `; ${titleCase(softCh.key)} softening` : ""}.{(() => { const inc = demoRows.income; const top = inc[inc.length - 1], lowB = inc[1]; return top && lowB && top.ros > lowB.ros * 1.15 ? ` Rate of sale climbs with income — ${top.label.toLowerCase()} ZIPs run ${top.ros.toFixed(1)} vs ${lowB.ros.toFixed(1)} in the lowest tier, a premiumization lever.` : ""; })()}
          </div>
        </div>
        <PFoot page="6" />
      </div>

      {/* EXEC SUMMARY */}
      <div className="pslide">
        <PHead kick="05 · Executive Summary" title="Headwinds & opportunities" />
        <div style={{ flex: 1, padding: "0.2in 0.34in", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: PT.warm, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Headwinds</div>
              {summary.head.length === 0 && <div style={{ fontSize: 11, color: PT.mut }}>No material headwinds — the book is clean.</div>}
              {summary.head.map((x, i) => (
                <div key={i} style={{ display: "flex", gap: 9, marginBottom: 13 }}>
                  <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: PT.warm, lineHeight: 1.45 }}>{i + 1}.</span>
                  <div style={{ fontSize: 11.5, color: PT.ink2, lineHeight: 1.5 }}><b style={{ color: PT.ink }}>{x.t}.</b> {x.d}</div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: PT.green, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Opportunities</div>
              {summary.opp.length === 0 && <div style={{ fontSize: 11, color: PT.mut }}>Hold and defend.</div>}
              {summary.opp.map((x, i) => (
                <div key={i} style={{ display: "flex", gap: 9, marginBottom: 13 }}>
                  <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: PT.green, lineHeight: 1.45 }}>{i + 1}.</span>
                  <div style={{ fontSize: 11.5, color: PT.ink2, lineHeight: 1.5 }}><b style={{ color: PT.ink }}>{x.t}.</b> {x.d}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `2px solid ${PT.green}`, marginTop: 14, paddingTop: 10, fontSize: 12, color: PT.ink2 }}>
            <b style={{ color: PT.ink }}>The ask:</b> {summary.head[0] ? `address ${summary.head[0].t.toLowerCase()}` : "protect the base"}{summary.opp[0] ? `, and ride ${summary.opp[0].t.toLowerCase()}` : ""}.
          </div>
          <div style={{ fontSize: 10, color: PT.mut, marginTop: 10, textAlign: "center" }}>Prepared by {PREPARED_BY} · {titleCase(dist)} · data thru {DATA_THRU}</div>
        </div>
        <PFoot page="7" />
      </div>
    </div>
  );
}

function PTable({ rows, kind }) {
  const cell = { padding: "0.12in 0.07in", textAlign: "right", fontSize: 12.5, color: PT.ink2 };
  const hd = { padding: "0.08in 0.07in", textAlign: "right", fontSize: 9.5, fontWeight: 700, color: PT.mut, textTransform: "uppercase", borderBottom: `1.5px solid ${PT.lineStrong}` };
  const last = kind === "channel" ? "ROS" : "plc/ac";
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
      <thead>
        <tr>
          <th style={{ ...hd, textAlign: "left" }}>{kind}</th>
          <th style={hd}>90D cs</th><th style={hd}>Δ%</th><th style={hd}>acct</th><th style={hd}>{last}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const fast = r.gPct != null && r.gPct >= 8, drop = r.gPct != null && r.gPct <= -8;
          const bg = fast ? PT.greenSoft : drop ? PT.warmSoft : "transparent";
          const dC = r.gPct == null ? PT.mut : r.gPct > 1 ? PT.up : r.gPct < -1 ? PT.down : PT.mut;
          return (
            <tr key={r.key} style={{ background: bg }}>
              <td style={{ ...cell, textAlign: "left", color: r.isIndie ? PT.green : PT.ink, fontWeight: 600, borderBottom: `1px solid ${PT.line}` }}>{r.label || titleCase(r.key)}</td>
              <td style={{ ...cell, fontWeight: 700, color: PT.ink, borderBottom: `1px solid ${PT.line}` }}>{r.cases.toLocaleString()}</td>
              <td style={{ ...cell, color: dC, fontWeight: 600, borderBottom: `1px solid ${PT.line}` }}>{r.gPct == null ? "—" : `${r.gPct > 0 ? "+" : ""}${r.gPct}%`}</td>
              <td style={{ ...cell, borderBottom: `1px solid ${PT.line}` }}>{r.accts.toLocaleString()}</td>
              <td style={{ ...cell, borderBottom: `1px solid ${PT.line}` }}>{kind === "channel" ? r.ros.toFixed(1) : r.avgPlc.toFixed(1)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ================= SCREEN COMPONENTS ================= */
function ItemsSection({ items }) {
  const top = (items.all || []).slice(0, 8);
  if (!top.length) return null;
  const mx = Math.max(...top.map(it => Math.max(it.l90, it.prev)), 1);
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)", padding: "13px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", gap: 12, fontSize: 9, color: "var(--text-2)", marginBottom: 11 }}>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--accent)", borderRadius: 2, verticalAlign: "middle", marginRight: 3 }} />current 90D</span>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: "#C3CBBA", borderRadius: 2, verticalAlign: "middle", marginRight: 3 }} />prior 90D</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {top.map(it => {
          const dC = it.gPct == null ? "var(--text-3)" : it.gPct > 1 ? "var(--up)" : it.gPct < -1 ? "var(--down)" : "var(--text-3)";
          return (
            <div key={it.name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titleCase(it.name)}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", flexShrink: 0 }}>{it.l90.toLocaleString()}{it.gPct != null && <span style={{ fontSize: 9, color: dC, fontWeight: 700, marginLeft: 4 }}>{it.gPct > 0 ? "+" : ""}{it.gPct}%</span>}</span>
              </div>
              <div style={{ height: 9, background: "var(--accent)", borderRadius: 2, width: `${Math.max(2, (it.l90 / mx) * 100)}%`, marginTop: 3 }} />
              <div style={{ height: 5, background: "#C3CBBA", borderRadius: 2, width: `${Math.max(2, (it.prev / mx) * 100)}%`, marginTop: 2 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MoverRow({ it, up }) {
  const c = up ? "var(--up)" : "var(--down)";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: c, flexShrink: 0, marginTop: 1 }}>{up ? "▲" : "▼"}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titleCase(it.name)}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: c, whiteSpace: "nowrap", flexShrink: 0 }}>{it.dCases > 0 ? "+" : ""}{it.dCases.toLocaleString()} cs</span>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2, lineHeight: 1.35 }}>{it.why}{it.gPct != null ? ` · ${it.gPct > 0 ? "+" : ""}${it.gPct}%` : ""}</div>
      </div>
    </div>
  );
}

function HealthCircles({ health, dist, router }) {
  const order = [
    { key: "new", lab: "New", bg: "var(--pop-cool-soft)", ink: "var(--pop-cool-deep)", link: "new" },
    { key: "healthy", lab: "Healthy", bg: "var(--accent-soft)", ink: "var(--accent-deep)", link: "healthy" },
    { key: "atrisk", lab: "At risk", bg: "var(--watch-bg)", ink: "var(--watch-ink)", link: "atrisk" },
    { key: "lapsed", lab: "Lapsed", bg: "var(--atrisk-bg)", ink: "var(--pop-warm-deep)", link: "lapsed" },
  ];
  const maxPct = Math.max(...order.map(o => health[o.key].pct), 1);
  const MIN = 54, MAX = 104;
  const sizeOf = pct => Math.round(MIN + (MAX - MIN) * Math.sqrt(pct / maxPct));
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", gap: 6, marginTop: 18 }}>
        {order.map(o => {
          const b = health[o.key], d = sizeOf(b.pct);
          return (
            <div key={o.key} onClick={() => router.push("/book?distributor=" + encodeURIComponent(dist) + "&health=" + o.link)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", minWidth: 0 }}>
              <div style={{ width: d, height: d, borderRadius: "50%", background: o.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: d >= 86 ? 21 : d >= 70 ? 18 : 15, fontWeight: 700, color: o.ink, letterSpacing: "-0.5px" }}>{b.n.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: o.ink, marginTop: 8, textAlign: "center" }}>{o.lab}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{b.pct}%</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", marginTop: 16 }}>
        <div style={{ width: "50%", padding: "0 12px" }}>
          <div style={{ height: 10, border: "2px solid var(--accent)", borderTop: "none", borderRadius: "0 0 8px 8px" }} />
          <div style={{ textAlign: "center", marginTop: 5 }}><span style={{ fontSize: 18, fontWeight: 700, color: "var(--accent-deep)", letterSpacing: "-.5px" }}>{health.goodPct}%</span><span style={{ fontSize: 9, color: "var(--text-2)", marginLeft: 5 }}>healthy book</span></div>
        </div>
        <div style={{ width: "50%", padding: "0 12px" }}>
          <div style={{ height: 10, border: "2px solid var(--pop-warm)", borderTop: "none", borderRadius: "0 0 8px 8px" }} />
          <div style={{ textAlign: "center", marginTop: 5 }}><span style={{ fontSize: 18, fontWeight: 700, color: "var(--pop-warm-deep)", letterSpacing: "-.5px" }}>{health.badPct}%</span><span style={{ fontSize: 9, color: "var(--text-2)", marginLeft: 5 }}>needs attention</span></div>
        </div>
      </div>
    </>
  );
}

function ExecCard({ x, warm }) {
  const bg = warm ? "var(--pop-warm-soft)" : "var(--accent-soft)";
  const ink = warm ? "var(--pop-warm-deep)" : "var(--accent-deep)";
  return (
    <div style={{ background: bg, borderRadius: 10, padding: "9px 10px", marginBottom: 7 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: ink, lineHeight: 1.3 }}>{x.t}</div>
      <div style={{ fontSize: 10, color: ink, opacity: .9, lineHeight: 1.4, marginTop: 3 }}>{x.d}</div>
    </div>
  );
}

function BreakdownTable({ rows, dist, router, kind }) {
  const go = r => {
    const base = "/book?distributor=" + encodeURIComponent(dist);
    if (kind === "channel") { if (String(r.key).startsWith("All other")) return; router.push(base); }
    else { if (r.isIndie) router.push(base); else router.push(base + "&chain=" + encodeURIComponent(r.key)); }
  };
  const col = { borderLeft: "1px solid var(--border)" };
  const head = { fontSize: 8, fontWeight: 700, letterSpacing: .2, color: "var(--text-3)", textTransform: "uppercase", padding: "7px 6px", textAlign: "right" };
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)", overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-strong)" }}>
        <span style={{ ...head, flex: 1, textAlign: "left", paddingLeft: 12 }}>{kind}</span>
        <span style={{ ...head, width: 48, ...col }}>90D cs</span>
        <span style={{ ...head, width: 38, ...col }}>Δ%</span>
        <span style={{ ...head, width: 32, ...col }}>acct</span>
        <span style={{ ...head, width: 34, ...col }}>plc/ac</span>
        <span style={{ ...head, width: 32, ...col, paddingRight: 10 }}>ROS</span>
      </div>
      {rows.map((r, i) => {
        const grouped = kind === "channel" && String(r.key).startsWith("All other");
        const fast = r.gPct != null && r.gPct >= 8;
        const drop = r.gPct != null && r.gPct <= -8;
        const rowBg = fast ? "var(--accent-soft)" : drop ? "var(--pop-warm-soft)" : "transparent";
        const dC = r.gPct == null ? "var(--text-3)" : r.gPct > 1 ? "var(--up)" : r.gPct < -1 ? "var(--down)" : "var(--text-3)";
        const cell = { fontSize: 10.5, color: "var(--text-2)", padding: "9px 6px", textAlign: "right", fontFeatureSettings: '"tnum" 1' };
        return (
          <div key={r.key} onClick={() => go(r)} style={{ display: "flex", alignItems: "center", background: rowBg, borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--border)", cursor: grouped ? "default" : "pointer" }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: r.isIndie ? "var(--accent-deep)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "9px 6px 9px 12px" }}>{r.label || titleCase(r.key)}</span>
            <span style={{ ...cell, width: 48, ...col, fontSize: 11.5, fontWeight: 700, color: "var(--text)" }}>{r.cases.toLocaleString()}</span>
            <span style={{ ...cell, width: 38, ...col, fontWeight: 600, color: dC }}>{r.gPct == null ? "—" : `${r.gPct > 0 ? "+" : ""}${r.gPct}%`}</span>
            <span style={{ ...cell, width: 32, ...col }}>{r.accts.toLocaleString()}</span>
            <span style={{ ...cell, width: 34, ...col }}>{r.avgPlc.toFixed(1)}</span>
            <span style={{ ...cell, width: 32, ...col, paddingRight: 10 }}>{r.ros.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Top({ dist, distributors, pickDist, canPrint, onExport, exporting }) {
  const disabled = !canPrint || exporting;
  return (
    <div style={{ flexShrink: 0, padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: .5, color: "var(--text-3)", textTransform: "uppercase" }}>Distributor Review</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 5 }}>
        <div style={{ fontSize: 21, fontWeight: 700, color: "var(--text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titleCase(dist) || "—"}</div>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select value={dist} onChange={e => pickDist(e.target.value)} style={{ appearance: "none", WebkitAppearance: "none", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: "var(--accent-deep)", background: "var(--surface)", border: "0.5px solid var(--border-strong)", borderRadius: 8, padding: "6px 24px 6px 11px", cursor: "pointer" }}>
            {distributors.map(d => <option key={d} value={d}>{titleCase(d)}</option>)}
          </select>
          <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "var(--accent-deep)", pointerEvents: "none" }}>▾</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 11 }}>
        <button onClick={onExport} disabled={disabled}
          style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: "10px 0", borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", border: `0.5px solid ${disabled ? "var(--border)" : "var(--accent)"}`, background: disabled ? "var(--surface-2)" : "var(--accent-soft)", color: disabled ? "var(--text-3)" : "var(--accent-deep)" }}>
          {exporting ? "Generating PDF…" : canPrint ? "⤓ Generate distributor report" : "Building report…"}
        </button>
      </div>
    </div>
  );
}

function SecTag({ n, label }) { return <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: .5, color: "var(--text-3)", textTransform: "uppercase", paddingTop: 18 }}>{n} · {label}</div>; }
function H1({ children }) { return <div style={{ fontSize: 19, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px", marginTop: 2 }}>{children}</div>; }
function Bracket({ cool }) {
  const c = cool ? "var(--pop-cool)" : "var(--accent)";
  return (<><span aria-hidden="true" style={{ position: "absolute", top: -1, left: -1, width: 14, height: 14, borderTop: `2px solid ${c}`, borderLeft: `2px solid ${c}`, borderTopLeftRadius: 7 }} /><span aria-hidden="true" style={{ position: "absolute", bottom: -1, right: -1, width: 11, height: 11, borderBottom: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}`, borderBottomRightRadius: 7, opacity: 0.4 }} /></>);
}
function Kpi({ label, value, pct, divider }) {
  const c = pct == null ? "var(--text-3)" : pct > 0 ? "var(--up)" : pct < 0 ? "var(--down)" : "var(--text-3)";
  const arrow = pct == null ? "" : pct > 0 ? "▲" : pct < 0 ? "▼" : "▬";
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "0 6px", borderLeft: divider ? "1px solid var(--border-strong)" : "none" }}>
      <div style={{ fontSize: 8, letterSpacing: .3, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginTop: 3, letterSpacing: "-0.5px", fontFeatureSettings: '"tnum" 1, "lnum" 1' }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, color: c, marginTop: 3 }}>{pct == null ? "—" : `${arrow} ${Math.abs(pct)}%`}</div>
    </div>
  );
}

function buildVerdict(m, dist) {
  const sz = Math.round(m.l52).toLocaleString();
  const v = m.pct, a = m.acctPct, d = m.distPct;
  const trend = v == null ? "running as new" : v >= 5 ? `up ${v}%` : v <= -5 ? `down ${Math.abs(v)}%` : "holding roughly flat";
  let out = `${titleCase(dist)} moved an estimated ${sz} cases over the last 52 weeks. Over the last 90 days volume is ${trend}${v != null ? " versus the prior quarter" : ""}`;
  out += a != null ? `, on an account base that's ${a > 1 ? "up " + a + "%" : a < -1 ? "down " + Math.abs(a) + "%" : "essentially flat"}${d != null ? ` and ${d > 1 ? "distribution up " + d + "%" : d < -1 ? "distribution down " + Math.abs(d) + "%" : "distribution flat"}` : ""}.` : ".";
  if (v != null && a != null) {
    const vel = v - a, gap = v - a;
    if (v <= -3) {
      if (gap >= 6) out += ` This is mostly a velocity problem — accounts are largely intact, but each is pulling roughly ${Math.abs(vel)}% less. The lever is rate-of-sale: displays, features, menu placement.`;
      else if (gap <= -6) out += ` This is a distribution problem more than velocity — accounts are falling faster (${a}%) than volume (${v}%). Win those placements back and volume returns quickly.`;
      else out += ` The decline is broad-based — accounts down about ${Math.abs(a)}% and rate-of-sale down a similar ${Math.abs(vel)}%. It needs both a win-back push and a sell-through fix.`;
    } else if (v >= 3) {
      if (gap <= -6) out += ` The growth is distribution-led — adding accounts (${a}%) faster than volume is climbing (${v}%), so newer accounts haven't fully ramped. Velocity upside is still banked.`;
      else if (gap >= 6) out += ` The growth is velocity-led — the same account base is selling roughly ${vel}% harder. Existing distribution is working; adding points would compound it.`;
      else out += ` It's healthy, balanced growth — accounts up about ${a}% and rate-of-sale up a similar ${vel}%, both pulling the same way.`;
    } else {
      out += ` Volume is flat, but underneath, accounts ${a > 1 ? "up " + a + "%" : a < -1 ? "down " + Math.abs(a) + "%" : "flat"} and velocity ${vel > 1 ? "up " + vel + "%" : vel < -1 ? "down " + Math.abs(vel) + "%" : "flat"} are offsetting — worth watching which way it breaks.`;
    }
  }
  return out;
}

export default function DistPage() {
  return (<Suspense fallback={<div style={wrap} />}><DistInner /></Suspense>);
}
const wrap = { background: "var(--bg)", height: "100vh", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: "var(--font-sans)" };