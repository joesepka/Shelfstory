"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const STNAME = { IL: "Illinois", OH: "Ohio", MI: "Michigan", MO: "Missouri", IA: "Iowa", MN: "Minnesota", WI: "Wisconsin", IN: "Indiana" };
function gpct(c, p) { return p > 0 ? Math.round(100 * (c - p) / p) : (c > 0 ? null : null); }
function isNew(h) { return String(h || "").toLowerCase().trim() === "new"; }
function isDecl(h) { const x = String(h || "").toLowerCase().trim(); return x === "decelerating" || x === "at-risk" || x === "lapsed"; }
function vol(a) { return isNew(a.headline) ? (a.cur90 || 0) * 3 : (a.account_weight || 0); }
function titleCase(s) { return String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
function band(g) { if (g == null) return "#9AA593"; if (g >= 5) return "#4A9068"; if (g > -5) return "#9AA593"; if (g > -15) return "#C2922E"; return "#C56A4A"; }
function hexA(hex, a) { const h = hex.replace("#", ""); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16); return `rgba(${r},${g},${b},${a})`; }
function monthLabels(n) { const now = new Date(); const out = []; for (let k = n - 1; k >= 0; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); out.push(d.toLocaleString("en-US", { month: "short" })); } return out; }

function OvInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const scope = { st: sp.get("st"), city: sp.get("city"), channel: sp.get("channel"), chain: sp.get("chain") };
  const [rows, setRows] = useState(null);
  const [items, setItems] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      let q = supabase.from("account_list").select("account_id,account_name,city,state,channel_type,chain,headline,account_weight,cur90,prev90,live_placements,live_prev,spark");
      if (scope.st) q = q.eq("state", scope.st);
      if (scope.city) q = q.eq("city", scope.city);
      if (scope.channel) q = q.eq("channel_type", scope.channel);
      if (scope.chain) q = q.eq("chain", scope.chain);
      const { data, error } = await q.limit(20000);
      if (error) { setErr(error.message); return; }
      setRows(data || []);
      const ids = (data || []).map(a => a.account_id);
      if (!ids.length) { setItems([]); return; }
      let all = [];
      for (let i = 0; i < ids.length; i += 200) {
        const r = await supabase.from("item_grid").select("item_name,l90,l90_prev,l52").in("account_id", ids.slice(i, i + 200));
        if (r.error) { setErr(r.error.message); return; }
        all = all.concat(r.data || []);
      }
      setItems(all);
    })();
  }, [sp]); // eslint-disable-line

  const title = useMemo(() => {
    if (scope.chain && scope.city) return `${scope.chain} · ${scope.city}`;
    if (scope.chain && scope.st) return `${scope.chain} · ${scope.st}`;
    if (scope.chain) return scope.chain;
    if (scope.city) return `${scope.city}, ${scope.st || ""}`.replace(/, $/, "");
    if (scope.channel && scope.st) return `${scope.channel} · ${STNAME[scope.st] || scope.st}`;
    if (scope.channel) return scope.channel;
    if (scope.st) return STNAME[scope.st] || scope.st;
    return "All Territory";
  }, [sp]); // eslint-disable-line

  const m = useMemo(() => {
    if (!rows) return null;
    let cur = 0, prev = 0, l52 = 0, pNow = 0, pPrev = 0, aNow = 0, aPrev = 0;
    const g = { new: 0, healthy: 0, atrisk: 0 };
    for (const a of rows) {
      cur += a.cur90 || 0; prev += a.prev90 || 0; l52 += a.account_weight || 0; pNow += a.live_placements || 0; pPrev += a.live_prev || 0;
      if ((a.cur90 || 0) > 0) aNow++; if ((a.prev90 || 0) > 0) aPrev++;
      g[isNew(a.headline) ? "new" : isDecl(a.headline) ? "atrisk" : "healthy"] += vol(a);
    }
    const tot = g.new + g.healthy + g.atrisk || 1;
    // driver dimension
    let dim = "state";
    if (scope.chain || scope.channel) dim = "item";
    else if (scope.city) dim = "channel";
    else if (scope.st) dim = "city";
    let ups = [], downs = [];
    if (dim === "item" && items) {
      const im = {};
      for (const it of items) { im[it.item_name] = (im[it.item_name] || 0) + ((it.l90 || 0) - (it.l90_prev || 0)); }
      const arr = Object.entries(im).map(([name, d]) => ({ name, d: Math.round(d) }));
      ups = arr.filter(x => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 3);
      downs = arr.filter(x => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 3);
    } else if (dim !== "item") {
      const sub = {};
      for (const a of rows) { const k = dim === "city" ? a.city : dim === "channel" ? a.channel_type : a.state; if (!k) continue; const e = sub[k] || (sub[k] = { d: 0, now: 0, prev: 0 }); e.d += (a.cur90 || 0) - (a.prev90 || 0); if ((a.cur90 || 0) > 0) e.now++; if ((a.prev90 || 0) > 0) e.prev++; }
      const arr = Object.entries(sub).map(([name, e]) => ({ name, d: Math.round(e.d), an: e.now - e.prev }));
      ups = arr.filter(x => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 3);
      downs = arr.filter(x => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 3);
    }
    // items list
    let itemList = null;
    if (items) {
      const im = {};
      for (const it of items) { const e = im[it.item_name] || (im[it.item_name] = { l52: 0, l90: 0, prev: 0 }); e.l52 += it.l52 || 0; e.l90 += it.l90 || 0; e.prev += it.l90_prev || 0; }
      itemList = Object.entries(im).map(([name, e]) => ({ name, l52: e.l52, g: gpct(e.l90, e.prev) })).filter(x => x.l52 > 0).sort((a, b) => b.l52 - a.l52);
    }
    // 90-day rolling series across the scope, 12 periods (oldest -> newest)
    const NP = 12;
    const casesSeries = new Array(NP).fill(0), acctsSeries = new Array(NP).fill(0);
    for (const a of rows) {
      const sp = Array.isArray(a.spark) ? a.spark : [];
      const off = Math.max(0, NP - sp.length); // pad missing (older) periods at front
      for (let i = 0; i < sp.length && off + i < NP; i++) {
        const v = +sp[i] || 0; const idx = off + i;
        casesSeries[idx] += v; if (v > 0) acctsSeries[idx] += 1;
      }
    }
    return {
      cur, prev, l52, pNow, pPrev, n: rows.length, g, tot,
      np: Math.round(100 * g.new / tot), hp: Math.round(100 * g.healthy / tot), rp: Math.round(100 * g.atrisk / tot),
      pct: gpct(cur, prev), distPct: gpct(pNow, pPrev), acctPct: gpct(aNow, aPrev),
      aNow, aPrev, dim, ups, downs, itemList, casesSeries, acctsSeries,
    };
  }, [rows, items]); // eslint-disable-line

  if (err) return <div style={wrap}><Top title={title} label={null} back={() => router.push("/perf")} /><p style={{ color: "var(--down)", padding: 20, fontSize: 13 }}>Couldn’t load. {err}</p></div>;

  const dimWord = m ? (m.dim === "city" ? "market" : m.dim === "channel" ? "channel" : m.dim === "item" ? "SKU" : "state") : "";
  const mlabel = m ? marketLabel(m) : null;
  const verdict = m ? buildVerdict(m, title) : "";

  return (
    <div style={wrap}>
      <Top title={title} label={mlabel} back={() => router.push("/perf")} />
      {!m && <div style={{ color: "var(--text-3)", fontSize: 13, padding: 16 }}>Building overview…</div>}
      {m && (
        <div className="nobar" style={{ flex: 1, overflowY: "auto", padding: "0 16px 36px", WebkitOverflowScrolling: "touch" }}>
          <style>{`.nobar{scrollbar-width:none;-ms-overflow-style:none;}.nobar::-webkit-scrollbar{display:none;width:0;height:0;}`}</style>
          {/* health bar — top */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-2)", marginBottom: 5 }}>
              <span><span style={{ color: "var(--pop-cool)" }}>●</span> New {m.np}%</span>
              <span><span style={{ color: "var(--accent)" }}>●</span> Healthy {m.hp}%</span>
              <span><span style={{ color: "var(--pop-warm)" }}>●</span> At Risk {m.rp}%</span>
            </div>
            <div style={{ display: "flex", height: 24, borderRadius: 7, overflow: "hidden", boxShadow: "0 1px 3px rgba(45,60,40,.06)" }}>
              <div style={{ width: `${m.np}%`, background: "var(--pop-cool)" }} />
              <div style={{ width: `${m.hp}%`, background: "var(--accent)" }} />
              <div style={{ width: `${m.rp}%`, background: "var(--pop-warm)" }} />
            </div>
          </div>

          {/* verdict */}
          <div style={{ position: "relative", background: "var(--surface)", borderRadius: 14, padding: "14px 16px", boxShadow: "var(--shadow)", marginBottom: 12 }}>
            <span aria-hidden="true" style={{ position: "absolute", top: -1, left: -1, width: 15, height: 15, borderTop: "2px solid var(--pop-cool)", borderLeft: "2px solid var(--pop-cool)", borderTopLeftRadius: 7 }} />
            <span aria-hidden="true" style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderBottom: "1.5px solid var(--pop-cool)", borderRight: "1.5px solid var(--pop-cool)", borderBottomRightRadius: 7, opacity: 0.4 }} />
            <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.55 }}>{verdict}</div>
          </div>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            <Kpi label="L52W cases" val={Math.round(m.l52).toLocaleString()} sub="estimate" subc="var(--text-3)" />
            <Kpi label="90-day cases" val={Math.round(m.cur).toLocaleString()} sub={m.pct != null ? `${m.pct > 0 ? "+" : ""}${m.pct}% vs prior 90` : "new"} subc={m.pct >= 0 ? "var(--up)" : "var(--down)"} />
            <Kpi label="Accounts" val={m.n.toLocaleString()} sub={m.acctPct != null ? `${m.acctPct > 0 ? "+" : ""}${m.acctPct}% (90D)` : ""} subc={m.acctPct >= 0 ? "var(--up)" : "var(--down)"} />
            <Kpi label="Live placements" val={Math.round(m.pNow).toLocaleString()} sub={m.distPct != null ? `${m.distPct > 0 ? "+" : ""}${m.distPct}% (90D)` : ""} subc={m.distPct >= 0 ? "var(--up)" : "var(--down)"} />
          </div>

          {/* rolling trends */}
          <BarChart title="90-Day Rolling Cases" sub="trailing-90 case volume · last 12 periods" data={m.casesSeries} labels={monthLabels(12)} color="#5E8FC0"
            topVal={Math.round(m.cur / 3).toLocaleString()} topUnit="cs/mo" deltaPct={m.pct} deltaLabel="vs prev 90D" />
          <BarChart title="90-Day Rolling Accounts" sub="accounts selling on a trailing-90 basis · last 12 periods" data={m.acctsSeries} labels={monthLabels(12)} color="#5E9277"
            topVal={m.aNow.toLocaleString()} topUnit="current accts" deltaPct={m.acctPct} deltaLabel="vs prev 90D" />

          {/* tailwinds / headwinds */}
          <Section title={`Tailwinds`} sub={`top ${dimWord}s pushing growth`}>
            {m.ups.length ? m.ups.map(x => <MoverRow key={x.name} up name={x.name} d={x.d} an={x.an} />) : <Empty />}
          </Section>
          <Section title={`Headwinds`} sub={`biggest ${dimWord}s dragging`}>
            {m.downs.length ? m.downs.map(x => <MoverRow key={x.name} name={x.name} d={x.d} an={x.an} />) : <Empty />}
          </Section>

          {/* items */}
          {m.itemList && m.itemList.length > 0 && (
            <Section title="Items in this market" sub={`${m.itemList.length} SKUs selling`}>
              {(() => { const mx = Math.max(...m.itemList.map(i => i.l52)) || 1; return m.itemList.map(it => (
                <div key={it.name} style={{ marginBottom: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                    <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{titleCase(it.name)}</span>
                    <span style={{ fontSize: 12, color: "var(--text-2)" }}>{Math.round(it.l52).toLocaleString()} cs
                      {it.g != null && <span style={{ marginLeft: 6, fontWeight: 600, color: it.g > 1 ? "var(--up)" : it.g < -1 ? "var(--down)" : "var(--text-3)" }}>{it.g > 0 ? "+" : ""}{it.g}%</span>}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${100 * it.l52 / mx}%`, height: "100%", background: band(it.g), borderRadius: 3 }} />
                  </div>
                </div>
              )); })()}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function BarChart({ title, sub, data, labels, color, topVal, topUnit, deltaPct, deltaLabel }) {
  if (!data || !data.length) return null;
  const mx = Math.max(...data, 1), n = data.length;
  return (
    <div style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 14px", boxShadow: "var(--shadow)", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{title}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{topVal}<span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-3)" }}> {topUnit}</span></div>
          {deltaPct != null && <div style={{ fontSize: 11, fontWeight: 600, color: deltaPct > 0 ? "var(--up)" : deltaPct < 0 ? "var(--down)" : "var(--text-3)", marginTop: 2 }}>{deltaPct > 0 ? "+" : ""}{deltaPct}% {deltaLabel}</div>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 88 }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}>
            <div style={{ width: "100%", height: `${v > 0 ? Math.max(3, (v / mx) * 100) : 0}%`, background: i === n - 1 ? color : hexA(color, .5), borderRadius: "3px 3px 0 0" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
        {labels.map((l, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 8.5, color: "var(--text-3)" }}>{l}</div>)}
      </div>
    </div>
  );
}

function Top({ title, label, back }) {
  return (
    <div style={{ flexShrink: 0, padding: "12px 16px 10px" }}>
      <div onClick={back} style={{ fontSize: 12.5, color: "var(--accent-deep)", cursor: "pointer", marginBottom: 6 }}>‹ Back to explorer</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: .5, color: "var(--text-3)" }}>MARKET OVERVIEW</div>
          <div style={{ fontSize: 23, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{title}</div>
        </div>
        {label && <div style={{ flexShrink: 0, marginTop: 2, fontSize: 11, fontWeight: 700, color: label.c, background: label.bg, padding: "5px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{label.t}</div>}
      </div>
    </div>
  );
}

function marketLabel(m) {
  const p = m.pct;
  if (p == null) return { t: "New market", c: "var(--new-ink)", bg: "var(--new-bg)" };
  if (p >= 8) return { t: "Growing market", c: "var(--growing-ink)", bg: "var(--growing-bg)" };
  if (p <= -8) return { t: "Contracting market", c: "var(--atrisk-ink)", bg: "var(--atrisk-bg)" };
  if (m.rp >= 45) return { t: "At-risk market", c: "var(--watch-ink)", bg: "var(--watch-bg)" };
  return { t: "Stable market", c: "var(--text-2)", bg: "var(--surface-2)" };
}

// Stretched conversational read: decomposes volume into distribution vs velocity vs accounts.
function buildVerdict(m, title) {
  const sz = Math.round(m.l52).toLocaleString();
  const v = m.pct, a = m.acctPct, d = m.distPct;
  const trend = v == null ? "running as a new market" : v >= 5 ? `up ${v}%` : v <= -5 ? `down ${Math.abs(v)}%` : "holding roughly flat";
  let out = `${title} moved an estimated ${sz} cases over the last 52 weeks. Over the last 90 days volume is ${trend}${v != null ? " versus the prior quarter" : ""}`;
  out += a != null ? `, on an account base that's ${a > 1 ? "up " + a + "%" : a < -1 ? "down " + Math.abs(a) + "%" : "essentially flat"}${d != null ? ` and ${d > 1 ? "distribution up " + d + "%" : d < -1 ? "distribution down " + Math.abs(d) + "%" : "distribution flat"} (placements)` : ""}.` : ".";

  // decomposition: velocity proxy = volume% - accounts%
  if (v != null && a != null) {
    const vel = v - a;
    const gap = v - a;
    if (v <= -3) {
      if (gap >= 6) out += ` This is mostly a velocity problem, not lost distribution — your accounts are largely intact, but each one is pulling roughly ${Math.abs(vel)}% less. The points of sale are there; the product is just moving slower on shelf, so the lever is rate-of-sale: displays, features, menu placement.`;
      else if (gap <= -6) out += ` This is a distribution problem more than a velocity one — accounts are falling faster (${a}%) than volume (${v}%), which means the accounts still ordering are actually selling harder. Win those lost accounts back and the volume returns quickly.`;
      else out += ` The decline is broad-based — accounts are down about ${Math.abs(a)}% and rate-of-sale is down a similar ${Math.abs(vel)}%, so you're losing points of distribution and velocity at the same time. It needs both a win-back push and a sell-through fix.`;
    } else if (v >= 3) {
      if (gap <= -6) out += ` The growth is distribution-led — you're adding accounts (${a}%) faster than volume is climbing (${v}%), so newer accounts haven't fully ramped yet. There's velocity upside still banked as they mature.`;
      else if (gap >= 6) out += ` The growth is velocity-led — the same account base is selling roughly ${vel}% harder. Your existing distribution is working; adding more points would compound it.`;
      else out += ` It's healthy, balanced growth — accounts up about ${a}% and rate-of-sale up a similar ${vel}%, both pulling the same direction.`;
    } else {
      out += ` Volume is flat, but underneath, accounts ${a > 1 ? "up " + a + "%" : a < -1 ? "down " + Math.abs(a) + "%" : "flat"} and velocity ${vel > 1 ? "up " + vel + "%" : vel < -1 ? "down " + Math.abs(vel) + "%" : "flat"} are offsetting — worth watching which way it breaks.`;
    }
  }

  const top = m.ups[0], drag = m.downs[0];
  if (top && drag) out += ` Drilling in, ${titleCase(top.name)} is the biggest tailwind (+${top.d.toLocaleString()} cs) while ${titleCase(drag.name)} is the biggest drag (${drag.d.toLocaleString()} cs).`;
  else if (top) out += ` ${titleCase(top.name)} is carrying the gains (+${top.d.toLocaleString()} cs).`;
  else if (drag) out += ` ${titleCase(drag.name)} is the single biggest drag (${drag.d.toLocaleString()} cs).`;
  return out;
}
function Kpi({ label, val, sub, subc }) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: 12, padding: "11px 13px", boxShadow: "var(--shadow)" }}>
      <div style={{ fontSize: 10.5, color: "var(--text-3)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{val}</div>
      {sub ? <div style={{ fontSize: 11, fontWeight: 600, color: subc || "var(--text-3)", marginTop: 3 }}>{sub}</div> : null}
    </div>
  );
}
function Section({ title, sub, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{title} <span style={{ fontWeight: 400, color: "var(--text-3)", fontSize: 11 }}>· {sub}</span></div>
      <div style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 14px", boxShadow: "var(--shadow)", marginTop: 6 }}>{children}</div>
    </div>
  );
}
function MoverRow({ up, name, d, an }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "3px 0", fontSize: 13 }}>
      <span style={{ color: "var(--text)" }}><span style={{ color: up ? "var(--up)" : "var(--down)", fontWeight: 700 }}>{up ? "▲" : "▼"}</span> {titleCase(name)}</span>
      <span style={{ color: "var(--text-2)" }}>{d > 0 ? "+" : ""}{d.toLocaleString()} cs{an ? <span style={{ color: "var(--text-3)" }}> · {an > 0 ? "+" : ""}{an} accts</span> : null}</span>
    </div>
  );
}
function Empty() { return <div style={{ fontSize: 12, color: "var(--text-3)" }}>None in this scope.</div>; }

export default function OverviewPage() {
  return (<Suspense fallback={<div style={wrap} />}><OvInner /></Suspense>);
}
const wrap = { background: "var(--bg)", minHeight: "100vh", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: "var(--font-sans)" };