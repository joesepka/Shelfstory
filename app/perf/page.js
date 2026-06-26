"use client";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Splash from "../../components/Splash";

function gpct(cur, prev) { return prev > 0 ? Math.round(100 * (cur - prev) / prev) : (cur > 0 ? 999 : null); }
function fmtPct(g) { if (g == null || g === 999) return "new"; return (g > 0 ? "+" : "") + g + "%"; }
function isNew(h) { return String(h || "").toLowerCase().trim() === "new"; }
function vol(a) { return isNew(a.headline) ? (a.cur90 || 0) * 3 : (a.account_weight || 0); }
function band(g) { if (g == null) return "#9AA593"; if (g >= 5) return "#4A9068"; if (g > -5) return "#9AA593"; if (g > -15) return "#C2922E"; return "#C56A4A"; }
function hexA(hex, a) { const h = hex.replace("#", ""); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16); return `rgba(${r},${g},${b},${a})`; }
function accStr(an) { return an ? ` · ${an > 0 ? "+" : ""}${an} accts` : ""; }
const STNAME = { IL: "Illinois", OH: "Ohio", MI: "Michigan", MO: "Missouri", IA: "Iowa", MN: "Minnesota", WI: "Wisconsin", IN: "Indiana" };

const SEQ_C = [1, 1, 2, 2, 3, 3, 4, 4, 5];
const SEQ_H = [150, 130, 112, 98, 86, 80, 74, 72, 70];
const CAP = 50;
function buildRows(boxes) {
  const rows = []; let i = 0, placed = 0;
  while (placed < boxes.length && placed < CAP) {
    const c = i < SEQ_C.length ? SEQ_C[i] : 6;
    const h = i < SEQ_H.length ? SEQ_H[i] : 66;
    rows.push({ h, c, boxes: boxes.slice(placed, placed + c), start: placed });
    placed += c; i++;
  }
  return rows;
}

function PerfInner() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [scope, setScope] = useState({});           // at most {st} or {channel}
  const [viewOverride, setViewOverride] = useState(null);
  const [items, setItems] = useState(null);
  const [pop, setPop] = useState(null);             // {key, phase:'out'|'boom'}
  const animating = useRef(false);

  useEffect(() => {
    (async () => {
      let all = [], from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("account_list")
          .select("account_id,state,city,channel_type,chain,distributor,headline,account_weight,cur90,prev90,live_placements,live_prev")
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

  function defaultView() { if (scope.channel) return "chain"; return "territory"; }
  const view = viewOverride || defaultView();
  const hasFilter = !!(scope.st || scope.channel);

  const scoped = useMemo(() => {
    if (!rows) return [];
    return rows.filter(a =>
      (!scope.st || a.state === scope.st) &&
      (!scope.channel || a.channel_type === scope.channel));
  }, [rows, scope]);

  const scopeSig = JSON.stringify(scope);
  useEffect(() => {
    if (view !== "chain") { setItems(null); return; }
    if (!scoped.length) { setItems([]); return; }
    let dead = false;
    (async () => {
      setItems(null);
      const ids = scoped.map(a => a.account_id);
      let all = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase.from("item_grid").select("account_id,item_name,l90,l90_prev").in("account_id", ids.slice(i, i + 200));
        if (error) { if (!dead) setErr(error.message); return; }
        all = all.concat(data || []);
      }
      if (!dead) setItems(all);
    })();
    return () => { dead = true; };
  }, [scopeSig, view, scoped.length]); // eslint-disable-line

  function dimKey(a) { if (view === "territory") return scope.st ? a.city : a.state; if (view === "channel") return a.channel_type; if (view === "distributor") return a.distributor; return a.chain; }
  function driverDim() { if (view === "territory") return scope.st ? "channel" : "city"; if (view === "channel") return "chain"; if (view === "distributor") return "channel"; return null; }
  function driverKey(d, a) { if (d === "city") return a.city; if (d === "channel") return a.channel_type; if (d === "chain") return a.chain || "Independent"; }

  const acctBoxes = useMemo(() => {
    const ddim = driverDim(); const groups = {};
    for (const a of scoped) { if (view === "chain" && !a.chain) continue; const k = dimKey(a); if (k == null || k === "") continue; (groups[k] ||= []).push(a); }
    const out = [];
    for (const k in groups) {
      const acc = groups[k]; let cur = 0, prev = 0, size = 0, pNow = 0, pPrev = 0;
      for (const a of acc) { cur += a.cur90 || 0; prev += a.prev90 || 0; size += vol(a); pNow += a.live_placements || 0; pPrev += a.live_prev || 0; }
      let up = null, down = null;
      if (ddim) {
        const sub = {};
        for (const a of acc) { const dk = driverKey(ddim, a); if (dk == null || dk === "") continue; const e = sub[dk] || (sub[dk] = { d: 0, now: 0, prev: 0 }); e.d += (a.cur90 || 0) - (a.prev90 || 0); if ((a.cur90 || 0) > 0) e.now++; if ((a.prev90 || 0) > 0) e.prev++; }
        for (const dk in sub) { const d = Math.round(sub[dk].d), an = sub[dk].now - sub[dk].prev; if (d > 0 && (!up || d > up.d)) up = { name: dk, d, an }; if (d < 0 && (!down || d < down.d)) down = { name: dk, d, an }; }
      }
      out.push({ key: k, label: k, size, g: gpct(cur, prev), dg: pPrev > 0 ? Math.round(100 * (pNow - pPrev) / pPrev) : (pNow > 0 ? 999 : null), up, down });
    }
    return out.filter(b => b.size > 0).sort((a, b) => b.size - a.size);
  }, [scoped, view, scope]);

  const chainItemDrivers = useMemo(() => {
    if (view !== "chain" || !items) return {};
    const chainOf = {}; for (const a of scoped) if (a.chain) chainOf[a.account_id] = a.chain;
    const m = {};
    for (const it of items) { const ch = chainOf[it.account_id]; if (!ch) continue; (m[ch] ||= {}); m[ch][it.item_name] = (m[ch][it.item_name] || 0) + ((it.l90 || 0) - (it.l90_prev || 0)); }
    const res = {};
    for (const ch in m) { let up = null, down = null; for (const nm in m[ch]) { const d = Math.round(m[ch][nm]); if (d > 0 && (!up || d > up.d)) up = { name: nm, d }; if (d < 0 && (!down || d < down.d)) down = { name: nm, d }; } res[ch] = { up, down }; }
    return res;
  }, [items, scoped, view]);

  const boxes = acctBoxes;
  const taperRows = useMemo(() => buildRows(boxes), [boxes]);
  const more = boxes.length > CAP ? boxes.length - CAP : 0;

  function ovURL(extra) {
    const p = {}; if (scope.st) p.st = scope.st; if (scope.channel) p.channel = scope.channel;
    Object.assign(p, extra || {});
    const qs = new URLSearchParams(p).toString();
    return "/perf/overview" + (qs ? "?" + qs : "");
  }
  function scopeName() { if (scope.channel) return scope.channel; if (scope.st) return STNAME[scope.st] || scope.st; return "All Territory"; }

  function clickBox(b) {
    if (animating.current) return;
    let action;
    if (view === "distributor") action = { type: "ov", extra: { distributor: b.key } }; // straight to that distributor's review
    else if (view === "territory" && !scope.st && !hasFilter) action = { type: "scope", scope: { st: b.key } };
    else if (view === "channel" && !hasFilter) action = { type: "scope", scope: { channel: b.key } };
    else if (view === "territory") action = { type: "ov", extra: { city: b.key } };
    else action = { type: "ov", extra: { chain: b.key } }; // chain click
    animating.current = true;
    setPop({ key: b.key, phase: "out" });
    setTimeout(() => setPop({ key: b.key, phase: "boom" }), 170);
    setTimeout(() => {
      if (action.type === "scope") { setScope(action.scope); setViewOverride(null); setPop(null); animating.current = false; }
      else { router.push(ovURL(action.extra)); }
    }, 440);
  }
  function setView(v) { if (animating.current) return; setViewOverride(v); }

  function vtitle() { if (view === "territory") return scope.st ? "Cities" : "Markets"; if (view === "channel") return "Channels"; if (view === "distributor") return "Distributors"; return "Chains"; }
  function unitWord() { if (view === "territory") return scope.st ? "city" : "market"; if (view === "channel") return "channel"; if (view === "distributor") return "distributor"; return "chain"; }
  function bigHeadline(b, gi) {
    const sz = Math.round(b.size).toLocaleString(), u = unitWord();
    const lead = gi === 0 ? `Your biggest ${u}` : `#${gi + 1} ${u}`;
    const trend = b.g == null ? "" : b.g >= 5 ? `growing ${b.g}%` : b.g <= -5 ? `down ${Math.abs(b.g)}%` : "holding flat";
    let mv = "";
    if (b.up && b.down) mv = ` ${b.up.name} is pushing (+${b.up.d.toLocaleString()} cs) while ${b.down.name} drags (${b.down.d.toLocaleString()} cs).`;
    else if (b.up) mv = ` ${b.up.name} is leading the gains (+${b.up.d.toLocaleString()} cs).`;
    else if (b.down) mv = ` ${b.down.name} is the biggest drag (${b.down.d.toLocaleString()} cs).`;
    return `${lead} at ${sz} cs L52W${trend ? `, ${trend}` : ""}.${mv}`;
  }

  if (err) return <div style={wrap}><p style={{ color: "var(--down)", padding: 20, fontSize: 13 }}>Couldn’t load. {err}</p></div>;

  return (
    <div style={wrap}>
      <style>{`.nobar{scrollbar-width:none;-ms-overflow-style:none;}.nobar::-webkit-scrollbar{display:none;width:0;height:0;}
        @keyframes pfIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}`}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", fontSize: 12, color: "var(--text-3)", flex: 1, minWidth: 0 }}>
          <span style={crumbC} onClick={() => { setScope({}); setViewOverride(null); }}>All</span>
          {scope.st && <><span>›</span><span>{STNAME[scope.st] || scope.st}</span></>}
          {scope.channel && <><span>›</span><span>{scope.channel}</span></>}
        </div>
        {hasFilter && (
          <button onClick={() => { setScope({}); setViewOverride(null); }}
            style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, padding: "6px 13px", borderRadius: 20, border: "1.5px solid var(--accent)", background: "var(--surface)", color: "var(--accent-deep)", cursor: "pointer", fontFamily: "inherit" }}>↺ Reset</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, padding: "0 14px 8px", flexShrink: 0 }}>
        {[["territory", scope.st ? "Cities" : "Territory"], ["channel", "Channel"], ["chain", "Chain"], ["distributor", "Distributor"]].map(([k, t]) => (
          <button key={k} onClick={() => setView(k)} style={{ flex: 1, fontSize: 11.5, fontWeight: 600, padding: "8px 0", borderRadius: 8, cursor: "pointer", border: "none", fontFamily: "inherit", background: view === k ? "var(--accent)" : "var(--surface-2)", color: view === k ? "var(--accent-ink)" : "var(--text-2)" }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: "0 14px 9px", flexShrink: 0 }}>
        <button onClick={() => router.push(ovURL())}
          style={{ width: "100%", fontSize: 13, fontWeight: 600, padding: "10px 0", borderRadius: 10, cursor: "pointer", border: "1.5px dashed var(--border-strong)", background: "transparent", color: "var(--text-2)", fontFamily: "inherit" }}>
          Generate Market Report — {scopeName()} →
        </button>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", padding: "2px 14px 5px", flexShrink: 0 }}>
        {vtitle()} <span style={{ fontWeight: 400, color: "var(--text-3)", fontSize: 11 }}>· size = L52W volume · color = 90-day growth</span>
      </div>
      <div style={{ display: "flex", gap: 11, flexWrap: "wrap", padding: "0 14px 8px", fontSize: 9.5, color: "var(--text-3)", flexShrink: 0 }}>
        {[["#4A9068", "material growth"], ["#9AA593", "flat"], ["#C2922E", "moderate decline"], ["#C56A4A", "material decline"]].map(([c, t]) => (
          <span key={t}><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: c, marginRight: 3, verticalAlign: "middle" }} />{t}</span>
        ))}
      </div>

      <div key={scopeSig + view} className="nobar" style={{ flex: 1, overflowY: "auto", padding: "0 14px 28px", animation: pop ? "none" : "pfIn .26s ease", WebkitOverflowScrolling: "touch" }}>
        {!rows && <div style={{ position: "relative", height: 320 }}><Splash fixed={false} /></div>}
        {rows && !boxes.length && <div style={{ color: "var(--text-3)", fontSize: 13, padding: 10 }}>Nothing in this scope.</div>}

        {taperRows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 5, marginBottom: 5 }}>
            {row.boxes.map((b, j) => {
              const gi = row.start + j;
              const alpha = Math.max(0.5, 1 - gi * 0.0125);
              const col = hexA(band(b.g), alpha);
              const drv = view === "chain" ? (chainItemDrivers[b.label] || {}) : b;
              const up = drv.up, down = drv.down;
              const isNL = row.h >= 128, isMov = row.h >= 92 && row.h < 128, isMed = row.h >= 70 && row.h < 92;
              const me = pop && pop.key === b.key, other = pop && pop.key !== b.key;
              let tf = "scale(1)", op = 1, dur = ".18s", z = 1;
              if (me) { if (pop.phase === "boom") { tf = "scale(2.2)"; op = 0; dur = ".26s"; z = 6; } else { z = 6; } }
              else if (other) { op = 0; tf = "scale(.97)"; }
              return (
                <div key={b.key} onClick={() => clickBox(b)}
                  style={{ flex: 1, minWidth: 0, height: row.h, position: "relative", zIndex: z, background: col, borderRadius: 9, overflow: "hidden", cursor: "pointer",
                    display: "flex", flexDirection: "column", justifyContent: "space-between", padding: isNL ? "10px 12px" : isMov ? "9px 10px" : isMed ? "7px 9px" : "5px 7px",
                    boxShadow: "inset 0 0 0 .5px rgba(255,255,255,.28)", transform: tf, opacity: op, transition: `transform ${dur} ease, opacity .2s ease` }}>
                  {isNL ? (
                    <>
                      <div><div style={{ ...tNm, fontSize: 16 }}>{b.label}</div>
                        <div style={{ ...tMv, fontSize: 11.5, whiteSpace: "normal", lineHeight: 1.3, marginTop: 4 }}>{bigHeadline(b, gi)}</div></div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <span style={{ ...tV, fontSize: 18 }}>{Math.round(b.size).toLocaleString()} <span style={tU}>cs L52W</span></span>
                        <span style={tMet}>Vol {fmtPct(b.g)}{b.dg != null && <> · Dist {fmtPct(b.dg)}</>} <span style={{ opacity: .7 }}>(90D)</span></span>
                      </div>
                    </>
                  ) : isMov ? (
                    <>
                      <div><div style={tNm}>{b.label}</div>
                        {up && <div style={tMv}>▲ {up.name} +{up.d.toLocaleString()} cs{accStr(up.an)}</div>}
                        {down && <div style={tMv}>▼ {down.name} {down.d.toLocaleString()} cs{accStr(down.an)}</div>}</div>
                      <div><div style={tV}>{Math.round(b.size).toLocaleString()} <span style={tU}>cs L52W</span></div>
                        <div style={tMet}>Vol {fmtPct(b.g)}{b.dg != null && <> · Dist {fmtPct(b.dg)}</>} <span style={{ opacity: .7 }}>(90D)</span></div></div>
                    </>
                  ) : isMed ? (
                    <>
                      <div style={{ ...tNm, fontSize: 12 }}>{b.label}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <span style={{ ...tV, fontSize: 12 }}>{Math.round(b.size).toLocaleString()}<span style={{ ...tU, fontSize: 9 }}> cs</span></span>
                        <span style={{ ...tMet, fontSize: 10.5 }}>{fmtPct(b.g)}</span></div>
                    </>
                  ) : (
                    <>
                      <div style={{ ...tNm, fontSize: 10 }}>{b.label}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <span style={{ ...tV, fontSize: 11 }}>{Math.round(b.size).toLocaleString()}</span>
                        <span style={{ ...tMet, fontSize: 9.5 }}>{fmtPct(b.g)}</span></div>
                    </>
                  )}
                </div>
              );
            })}
            {Array.from({ length: row.c - row.boxes.length }).map((_, k) => <div key={"sp" + k} style={{ flex: 1, minWidth: 0 }} />)}
          </div>
        ))}
        {more > 0 && <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)", padding: "8px 0 4px" }}>+{more} smaller {unitWord()}s not shown</div>}
      </div>
    </div>
  );
}

export default function PerfPage() {
  return (<Suspense fallback={<div style={wrap} />}><PerfInner /></Suspense>);
}

const wrap = { background: "var(--bg)", height: "100vh", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: "var(--font-sans)" };
const crumbC = { cursor: "pointer", color: "var(--accent-deep)" };
const tNm = { fontWeight: 600, color: "#fff", fontSize: 14, lineHeight: 1.05, textShadow: "0 1px 2px rgba(0,0,0,.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const tMv = { fontSize: 10.5, color: "#fff", opacity: .96, textShadow: "0 1px 2px rgba(0,0,0,.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 };
const tV = { fontWeight: 700, color: "#fff", fontSize: 16, textShadow: "0 1px 2px rgba(0,0,0,.45)", lineHeight: 1 };
const tU = { fontWeight: 500, opacity: .8, fontSize: 10 };
const tMet = { fontSize: 10.5, color: "#fff", opacity: .92, textShadow: "0 1px 2px rgba(0,0,0,.45)", marginTop: 2 };