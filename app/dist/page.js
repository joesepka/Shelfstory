"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Splash from "../../components/Splash";

const PREPARED_BY = "Joe Sepka";
const gpct = (c, p) => p > 0 ? Math.round(100 * (c - p) / p) : (c > 0 ? null : null);
const isNew = h => String(h || "").toLowerCase().trim() === "new";
const isDecl = h => { const x = String(h || "").toLowerCase().trim(); return x === "decelerating" || x === "at-risk" || x === "atrisk" || x === "at risk" || x === "lapsed"; };
const isLapsed = h => String(h || "").toLowerCase().trim() === "lapsed";
const titleCase = s => String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const vol = a => isNew(a.headline) ? (a.cur90 || 0) * 3 : (a.account_weight || 0);
const isOn = r => String(r.channel || "").toUpperCase().startsWith("ON");
function monthLabels(n) { const now = new Date(); const out = []; for (let k = n; k >= 1; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); out.push(d.toLocaleString("en-US", { month: "short" })); } return out; }

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
          .select("account_id,account_name,distributor,chain,city,state,channel,channel_type,headline,account_weight,cur90,prev90,live_placements,live_prev,spark")
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
    return {
      cur, prev, l52, pNow, n: scoped.length, aNow,
      pct: gpct(cur, prev), acctPct: gpct(aNow, aPrev), distPct: gpct(pNow, pPrev),
      rosNow: aNow ? cur / aNow / 3 : 0, cases, accts, ros,
    };
  }, [scoped]);

  const health = useMemo(() => {
    if (!scoped.length) return null;
    const g = { new: { n: 0, vol: 0 }, healthy: { n: 0, vol: 0 }, atrisk: { n: 0, vol: 0 }, lapsed: { n: 0, vol: 0 } };
    for (const a of scoped) {
      const k = isNew(a.headline) ? "new" : isLapsed(a.headline) ? "lapsed" : isDecl(a.headline) ? "atrisk" : "healthy";
      g[k].n++; g[k].vol += vol(a);
    }
    const tot = g.new.vol + g.healthy.vol + g.atrisk.vol + g.lapsed.vol || 1;
    const pc = v => Math.round(100 * v / tot);
    return { ...g, np: pc(g.new.vol), hp: pc(g.healthy.vol), rp: pc(g.atrisk.vol), lp: pc(g.lapsed.vol) };
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
      dCases: Math.round(e.l90 - e.prev), gPct: gpct(e.l90, e.prev), dDoors: e.doorsNow - e.doorsPrev,
    })).filter(e => e.l90 > 0 || e.prev > 0).sort((a, b) => b.l90 - a.l90);
    const top = arr.slice(0, 6), rest = arr.slice(6);
    let other = null;
    if (rest.length) {
      const l90 = rest.reduce((s, e) => s + e.l90, 0), prev = rest.reduce((s, e) => s + e.prev, 0);
      const dDoors = rest.reduce((s, e) => s + e.dDoors, 0);
      other = { name: `All other (${rest.length} SKUs)`, l90, prev, dCases: l90 - prev, gPct: gpct(l90, prev), dDoors, isOther: true };
    }
    return { top, other, count: arr.length, all: arr };
  }, [grid]);

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

  const verdict = useMemo(() => m ? buildVerdict(m, dist) : "", [m, dist]);

  const summary = useMemo(() => {
    if (!m || !health || !items || !channelRows || !chainRows) return null;
    const head = [], opp = [];

    if (m.pct != null && m.pct <= -3) head.push({ mag: Math.abs(m.pct), t: `Volume down ${Math.abs(m.pct)}% vs prior 90`, d: `${Math.round(m.cur).toLocaleString()} cases — ${m.acctPct != null && m.pct - m.acctPct <= -4 ? "accounts falling faster than volume; a distribution problem" : "rate-of-sale is the main drag"}.` });
    if (health.lapsed.n > 0) head.push({ mag: health.lapsed.lp + 8, t: `${health.lapsed.n} accounts lapsed this quarter`, d: `${health.lapsed.lp}% of volume; the at-risk band holds another ${health.rp}% that's still defensible.` });
    const decCh = [...channelRows].filter(r => r.gPct != null && r.gPct <= -3 && !String(r.key).startsWith("All other")).sort((a, b) => a.gPct - b.gPct)[0];
    if (decCh) head.push({ mag: Math.abs(decCh.gPct), t: `${titleCase(decCh.key)} is declining ${Math.abs(decCh.gPct)}%`, d: `${decCh.cases.toLocaleString()} cs across ${decCh.accts} accounts — the softest channel.` });
    const decItem = (items.all || []).filter(it => it.gPct != null && it.gPct <= -5 && it.prev > 0).sort((a, b) => a.dCases - b.dCases)[0];
    if (decItem) head.push({ mag: Math.abs(decItem.gPct), t: `${titleCase(decItem.name)} slipping`, d: `${decItem.dCases.toLocaleString()} cs (${decItem.gPct}%)${decItem.dDoors < 0 ? ` and out of ${Math.abs(decItem.dDoors)} doors` : ""}.` });
    const decChain = [...chainRows].filter(r => !r.isIndie && r.gPct != null && r.gPct <= -3).sort((a, b) => a.gPct - b.gPct)[0];
    if (decChain) head.push({ mag: Math.abs(decChain.gPct), t: `${decChain.label} down ${Math.abs(decChain.gPct)}%`, d: `${decChain.cases.toLocaleString()} cs — worth a chain-level conversation.` });

    if (m.pct != null && m.acctPct != null && m.pct >= 3 && (m.pct - m.acctPct) <= -4) opp.push({ mag: Math.abs(m.pct - m.acctPct) + 5, t: "New accounts haven't ramped", d: `Distribution-led growth — ${health.new.n} new accounts at just ${health.np}% of volume. Velocity upside is still banked.` });
    const grItem = (items.all || []).filter(it => it.gPct != null && it.gPct >= 5).sort((a, b) => b.dCases - a.dCases)[0];
    if (grItem) opp.push({ mag: grItem.gPct, t: `${titleCase(grItem.name)} has momentum`, d: `+${grItem.dCases.toLocaleString()} cs (${grItem.gPct > 0 ? "+" : ""}${grItem.gPct}%)${grItem.dDoors > 0 ? ` and +${grItem.dDoors} doors` : ""} — push it where it's not yet placed.` });
    const grCh = [...channelRows].filter(r => r.gPct != null && r.gPct >= 4 && !String(r.key).startsWith("All other")).sort((a, b) => b.gPct - a.gPct)[0];
    if (grCh) opp.push({ mag: grCh.gPct, t: `${titleCase(grCh.key)} is growing ${grCh.gPct}%`, d: `${grCh.cases.toLocaleString()} cs at ${grCh.ros.toFixed(1)} ROS/mo — lean in.` });
    const indie = chainRows.find(r => r.isIndie);
    if (indie && indie.gPct != null && indie.gPct >= 3) opp.push({ mag: indie.gPct + 2, t: `Independents growing ${indie.gPct}%`, d: `${indie.cases.toLocaleString()} cs across ${indie.accts} accounts — the part you directly control.` });
    const thinChain = [...chainRows].filter(r => r.avgPlc > 0 && r.avgPlc < 3 && r.accts >= 3).sort((a, b) => a.avgPlc - b.avgPlc)[0];
    if (thinChain) opp.push({ mag: 6, t: `${thinChain.label} runs thin menus`, d: `Only ${thinChain.avgPlc.toFixed(1)} SKUs/door across ${thinChain.accts} accounts — room to expand the lineup.` });

    head.sort((a, b) => b.mag - a.mag);
    opp.sort((a, b) => b.mag - a.mag);
    return { head: head.slice(0, 5), opp: opp.slice(0, 5) };
  }, [m, health, items, channelRows, chainRows]);

  if (err) return <div style={wrap}><Top dist={dist} distributors={distributors} pickDist={pickDist} /><p style={{ color: "var(--down)", padding: 20, fontSize: 13 }}>Couldn’t load. {err}</p></div>;

  return (
    <div style={wrap}>
      <style>{`.nobar{scrollbar-width:none;-ms-overflow-style:none;}.nobar::-webkit-scrollbar{display:none;width:0;height:0;}`}</style>
      <Top dist={dist} distributors={distributors} pickDist={pickDist} />

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
                <Kpi label="ROS / mo" value={m.rosNow.toFixed(2)} pct={null} divider />
              </div>
            </div>
            <div style={{ position: "relative", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14, boxShadow: "var(--shadow)", padding: "13px 15px", marginTop: 9 }}>
              <Bracket cool />
              <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>{verdict}</div>
            </div>
            <BarCard title="12-month volume" sub="rolling-90 cases · quarter in focus highlighted" data={m.cases} labels={monthLabels(11)} hi={3} unit="cs" />
            <AcctRosCard title="Accounts & rate of sale" sub="rolling-90 accounts (bars) · monthly ROS (line)" accts={m.accts} ros={m.ros} labels={monthLabels(11)} hi={3} />
          </section>

          <section>
            <SecTag n="02" label="Account Health & Items" />
            <H1>Where the book stands</H1>
            {health && (
              <>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{scoped.length.toLocaleString()} accounts · boxes sized by share of 90-day volume</div>
                <WeightedHealth health={health} dist={dist} router={router} />
                {health.lapsed.n > 0 && (
                  <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)", padding: "11px 13px", marginTop: 9 }}>
                    <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.5 }}>
                      <b style={{ color: "var(--pop-warm-deep)" }}>{health.lapsed.n} account{health.lapsed.n === 1 ? "" : "s"} lapsed</b> this quarter. The at-risk band holds <b style={{ color: "var(--text)" }}>{health.rp}% of volume</b> — defensible if even half are caught.
                    </div>
                  </div>
                )}
              </>
            )}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", marginTop: 18, marginBottom: 6 }}>ITEMS — 90D growth & door movement</div>
            {!items && <div style={{ fontSize: 12, color: "var(--text-3)", padding: "4px 2px" }}>Reading items…</div>}
            {items && (
              <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)", padding: "4px 13px" }}>
                {items.top.map((it, i) => <ItemRow key={it.name} it={it} last={i === items.top.length - 1 && !items.other} />)}
                {items.other && <ItemRow it={items.other} last />}
              </div>
            )}
          </section>

          <section>
            <SecTag n="03" label="Channel & Chain" />
            <H1>Where it sells</H1>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", marginTop: 12, marginBottom: 6 }}>BY CHANNEL</div>
            {!channelRows && <div style={{ fontSize: 12, color: "var(--text-3)", padding: "4px 2px" }}>Reading channels…</div>}
            {channelRows && <BreakdownTable rows={channelRows} dist={dist} router={router} kind="channel" />}
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", marginTop: 16, marginBottom: 6 }}>BY CHAIN</div>
            {!chainRows && <div style={{ fontSize: 12, color: "var(--text-3)", padding: "4px 2px" }}>Reading chains…</div>}
            {chainRows && <BreakdownTable rows={chainRows} dist={dist} router={router} kind="chain" />}
          </section>

          <section>
            <SecTag n="04" label="Executive Summary" />
            <H1>Headwinds & opportunities</H1>
            {!summary && <div style={{ fontSize: 12, color: "var(--text-3)", padding: "8px 2px" }}>Reading the report…</div>}
            {summary && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--pop-warm-deep)", marginTop: 14, marginBottom: 7, letterSpacing: .3 }}>HEADWINDS</div>
                {summary.head.length === 0 && <div style={{ fontSize: 12, color: "var(--text-3)" }}>No material headwinds this quarter — the book is clean.</div>}
                {summary.head.map((x, i) => <ExecCard key={i} x={x} warm />)}
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-deep)", marginTop: 16, marginBottom: 7, letterSpacing: .3 }}>OPPORTUNITIES</div>
                {summary.opp.length === 0 && <div style={{ fontSize: 12, color: "var(--text-3)" }}>No standout opportunities surfaced — hold and defend.</div>}
                {summary.opp.map((x, i) => <ExecCard key={i} x={x} />)}
              </>
            )}
            <div style={{ fontSize: 9.5, color: "var(--text-3)", marginTop: 18, textAlign: "center" }}>Prepared by {PREPARED_BY}</div>
          </section>

          <div style={{ height: 30 }} />
        </div>
      )}
    </div>
  );
}

function ExecCard({ x, warm }) {
  const bg = warm ? "var(--pop-warm-soft)" : "var(--accent-soft)";
  const ink = warm ? "var(--pop-warm-deep)" : "var(--accent-deep)";
  return (
    <div style={{ background: bg, borderRadius: 11, padding: "11px 13px", marginBottom: 8 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: ink, lineHeight: 1.3 }}>{x.t}</div>
      <div style={{ fontSize: 11, color: ink, opacity: .9, lineHeight: 1.45, marginTop: 4 }}>{x.d}</div>
    </div>
  );
}

function WeightedHealth({ health, dist, router }) {
  const go = h => router.push("/book?distributor=" + encodeURIComponent(dist) + "&health=" + h);
  const BOX_H = 188, MIN_ROW = 44, MIN_W = 13, R = 12;
  const topVol = health.new.vol + health.healthy.vol;
  const botVol = health.atrisk.vol + health.lapsed.vol;
  const totVol = topVol + botVol || 1;
  let topH = Math.round(BOX_H * (topVol / totVol));
  topH = Math.max(MIN_ROW, Math.min(BOX_H - MIN_ROW, topH));
  const botH = BOX_H - topH;
  const splitW = (a, b) => { const t = a + b || 1; let wa = Math.round(100 * a / t); wa = Math.max(MIN_W, Math.min(100 - MIN_W, wa)); return [wa, 100 - wa]; };
  const [newW, healthyW] = splitW(health.new.vol, health.healthy.vol);
  const [riskW, lapsedW] = splitW(health.atrisk.vol, health.lapsed.vol);
  const cell = (bg, ink, lab, n, pct, note, w, h, key, corner) => (
    <div onClick={() => go(key)} style={{ width: `${w}%`, height: h, background: bg, padding: "10px 12px", cursor: "pointer", overflow: "hidden", display: "flex", flexDirection: "column",
      borderTopLeftRadius: corner.tl ? R : 0, borderTopRightRadius: corner.tr ? R : 0, borderBottomLeftRadius: corner.bl ? R : 0, borderBottomRightRadius: corner.br ? R : 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: ink }}>{lab}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 3 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: ink, letterSpacing: "-0.5px" }}>{n.toLocaleString()}</span>
        <span style={{ fontSize: 10.5, color: ink, opacity: .8 }}>{pct}%</span>
      </div>
      {note && h >= 78 && <div style={{ fontSize: 9.5, color: ink, opacity: .85, marginTop: "auto" }}>{note}</div>}
    </div>
  );
  return (
    <div style={{ marginTop: 10, overflow: "hidden", borderRadius: R }}>
      <div style={{ display: "flex", height: topH }}>
        {cell("var(--pop-cool-soft)", "var(--pop-cool-deep)", "New", health.new.n, health.np, null, newW, "100%", "new", { tl: 1 })}
        {cell("var(--accent-soft)", "var(--accent-deep)", "Healthy", health.healthy.n, health.hp, null, healthyW, "100%", "healthy", { tr: 1 })}
      </div>
      <div style={{ display: "flex", height: botH }}>
        {cell("var(--watch-bg)", "var(--watch-ink)", "At risk", health.atrisk.n, health.rp, `${health.rp}% of volume`, riskW, "100%", "atrisk", { bl: 1 })}
        {cell("var(--atrisk-bg)", "var(--pop-warm-deep)", "Lapsed", health.lapsed.n, health.lp, "lost this quarter", lapsedW, "100%", "lapsed", { br: 1 })}
      </div>
    </div>
  );
}

function rowTag(r) {
  const g = r.gPct;
  if (g != null && g >= 8) return { t: "growing fast", c: "var(--accent-deep)", bg: "var(--accent-soft)" };
  if (g != null && g <= -8) return { t: "declining", c: "var(--pop-warm-deep)", bg: "var(--pop-warm-soft)" };
  if (r.avgPlc >= 7 && r.accts >= 4) return { t: "deep menu", c: "var(--accent-deep)", bg: "var(--accent-soft)" };
  if (r.accts >= 5 && r.avgPlc > 0 && r.avgPlc < 2.5) return { t: "thin menu", c: "var(--pop-cool-deep)", bg: "var(--pop-cool-soft)" };
  return null;
}
function BreakdownTable({ rows, dist, router, kind }) {
  const go = r => {
    const base = "/book?distributor=" + encodeURIComponent(dist);
    if (kind === "channel") { if (String(r.key).startsWith("All other")) return; router.push(base); }
    else { if (r.isIndie) router.push(base); else router.push(base + "&chain=" + encodeURIComponent(r.key)); }
  };
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)", overflow: "hidden" }}>
      <div style={{ display: "flex", padding: "7px 13px", fontSize: 8.5, fontWeight: 700, letterSpacing: .3, color: "var(--text-3)", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>
        <span style={{ flex: 1 }}>{kind}</span>
        <span style={{ width: 58, textAlign: "right" }}>90D cs</span>
        <span style={{ width: 38, textAlign: "right" }}>accts</span>
        <span style={{ width: 40, textAlign: "right" }}>plc/ac</span>
        <span style={{ width: 44, textAlign: "right" }}>ROS/mo</span>
      </div>
      {rows.map((r, i) => {
        const tag = rowTag(r);
        const grouped = kind === "channel" && String(r.key).startsWith("All other");
        return (
          <div key={r.key} onClick={() => go(r)} style={{ display: "flex", alignItems: "center", padding: "9px 13px", borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--border)", cursor: grouped ? "default" : "pointer" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: r.isIndie ? "var(--accent-deep)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label || titleCase(r.key)}</span>
              {tag && <span style={{ fontSize: 8, fontWeight: 700, color: tag.c, background: tag.bg, padding: "1px 6px", borderRadius: 8, flexShrink: 0 }}>{tag.t}</span>}
            </span>
            <span style={{ width: 58, textAlign: "right", fontSize: 12, fontWeight: 700, color: "var(--text)", fontFeatureSettings: '"tnum" 1' }}>{r.cases.toLocaleString()}</span>
            <span style={{ width: 38, textAlign: "right", fontSize: 11, color: "var(--text-2)", fontFeatureSettings: '"tnum" 1' }}>{r.accts.toLocaleString()}</span>
            <span style={{ width: 40, textAlign: "right", fontSize: 11, color: "var(--text-2)", fontFeatureSettings: '"tnum" 1' }}>{r.avgPlc.toFixed(1)}</span>
            <span style={{ width: 44, textAlign: "right", fontSize: 11, color: "var(--text-2)", fontFeatureSettings: '"tnum" 1' }}>{r.ros.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}

function itemTag(it) {
  const cUp = it.dCases > 0, cDn = it.dCases < 0, dUp = it.dDoors > 0, dDn = it.dDoors < 0;
  if (cUp && it.dDoors <= 0) return { t: "velocity", c: "var(--accent-deep)", bg: "var(--accent-soft)" };
  if (dUp && it.dCases <= 0) return { t: "new doors", c: "var(--pop-cool-deep)", bg: "var(--pop-cool-soft)" };
  if (cUp && dUp) return { t: "momentum", c: "var(--accent-deep)", bg: "var(--accent-soft)" };
  if (cDn && dDn) return { t: "slipping", c: "var(--pop-warm-deep)", bg: "var(--pop-warm-soft)" };
  return null;
}
function ItemRow({ it, last }) {
  const tag = it.isOther ? null : itemTag(it);
  const cColor = it.dCases > 0 ? "var(--up)" : it.dCases < 0 ? "var(--down)" : "var(--text-3)";
  const dColor = it.dDoors > 0 ? "var(--up)" : it.dDoors < 0 ? "var(--down)" : "var(--text-3)";
  return (
    <div style={{ padding: "9px 0", borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: it.isOther ? "var(--text-3)" : "var(--text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.isOther ? it.name : titleCase(it.name)}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", flexShrink: 0 }}>{it.l90.toLocaleString()} <span style={{ fontWeight: 400, fontSize: 9.5, color: "var(--text-3)" }}>cs</span></span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
        <span style={{ fontSize: 10.5, color: cColor, fontWeight: 600 }}>{it.dCases > 0 ? "▲" : it.dCases < 0 ? "▼" : "▬"} {it.dCases > 0 ? "+" : ""}{it.dCases.toLocaleString()} cs{it.gPct != null ? ` (${it.gPct > 0 ? "+" : ""}${it.gPct}%)` : ""}</span>
        <span style={{ fontSize: 10.5, color: dColor, fontWeight: 600 }}>· {it.dDoors > 0 ? "+" : ""}{it.dDoors} door{Math.abs(it.dDoors) === 1 ? "" : "s"}</span>
        {tag && <span style={{ marginLeft: "auto", fontSize: 8.5, fontWeight: 700, color: tag.c, background: tag.bg, padding: "2px 7px", borderRadius: 9 }}>{tag.t}</span>}
      </div>
    </div>
  );
}

function Top({ dist, distributors, pickDist }) {
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
        <button onClick={() => window.print()} style={{ flex: 1, fontSize: 11.5, fontWeight: 700, padding: "8px 0", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", border: "0.5px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-2)" }}>⤓ Export PDF</button>
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
function BarCard({ title, sub, data, labels, hi, unit }) {
  const mx = Math.max(...data, 1), n = data.length;
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)", padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{title}</div>
        <div style={{ fontSize: 9.5, color: "var(--text-3)" }}>{Math.round(data[n - 1]).toLocaleString()} {unit}</div>
      </div>
      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 70, marginTop: 9 }}>
        {data.map((v, i) => (<div key={i} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}><div style={{ width: "100%", height: `${v > 0 ? Math.max(3, (v / mx) * 100) : 0}%`, background: i >= n - hi ? "var(--accent)" : "#C9DCD0", borderRadius: "2px 2px 0 0" }} /></div>))}
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 3 }}>{labels.map((l, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 7.5, color: "var(--text-3)" }}>{l}</div>)}</div>
    </div>
  );
}
function AcctRosCard({ title, sub, accts, ros, labels, hi }) {
  const n = accts.length, mxA = Math.max(...accts, 1);
  const mxR = Math.max(...ros, 1), mnR = Math.min(...ros.filter(x => x > 0), mxR);
  const yOf = r => { const norm = mxR > mnR ? (r - mnR) / (mxR - mnR) : 0.5; return 92 - norm * 80; };
  const pts = ros.map((r, i) => `${(((i + 0.5) / n) * 100).toFixed(1)},${yOf(r).toFixed(1)}`).join(" ");
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)", padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{title}</div>
        <div style={{ fontSize: 9.5, color: "var(--text-3)" }}>{Math.round(accts[n - 1]).toLocaleString()} accts · {ros[n - 1].toFixed(2)} ROS</div>
      </div>
      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>
      <div style={{ position: "relative", height: 76, marginTop: 9 }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 3 }}>
          {accts.map((v, i) => (<div key={i} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}><div style={{ width: "100%", height: `${v > 0 ? Math.max(3, (v / mxA) * 100) : 0}%`, background: i >= n - hi ? "var(--pop-cool)" : "#CBD9E6", borderRadius: "2px 2px 0 0" }} /></div>))}
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          <polyline points={pts} fill="none" stroke="var(--pop-warm)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {ros.map((r, i) => <circle key={i} cx={((i + 0.5) / n) * 100} cy={yOf(r)} r="1.6" fill="var(--surface)" stroke="var(--pop-warm)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />)}
        </svg>
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 3 }}>{labels.map((l, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 7.5, color: "var(--text-3)" }}>{l}</div>)}</div>
      <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 9, color: "var(--text-3)" }}>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--pop-cool)", borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />accounts</span>
        <span><span style={{ display: "inline-block", width: 12, height: 2, background: "var(--pop-warm)", marginRight: 3, verticalAlign: "middle" }} />ROS / mo</span>
      </div>
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
      else if (gap <= -6) out += ` This is a distribution problem more than velocity — accounts are falling faster (${a}%) than volume (${v}%). Win those doors back and volume returns quickly.`;
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