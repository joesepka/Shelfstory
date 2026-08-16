"use client";
// STYLE / ITEM DRILL — the overview screen behind a tap on a style or item row on the home
// ledger. Same ledger language: trend-shaded 12-month bars, stat tiles, top accounts with
// the fixed number grid. Scoped to the territory + label the home was on (lib/scope).
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TreeGlyph from "../../components/TreeGlyph";
import { parseScope, getLabel } from "../../lib/scope";
import { SNAPSHOT } from "../../lib/snapshot";

const kf = v => { const a = Math.abs(v || 0); if (a < 1000) return String(Math.round(v || 0)); return ((v || 0) / 1000).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "k"; };
const titleCase = s => String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const ACR = new Set(["IPA", "DIPA", "TIPA", "XPA", "IPL", "NEIPA", "DDH"]);
const styleLabel = s => String(s || "").split(/\s+/).map(w => (ACR.has(w.toUpperCase()) || /^\d+MG$/i.test(w)) ? w.toUpperCase() : (w.toLowerCase().charAt(0).toUpperCase() + w.toLowerCase().slice(1))).join(" ");
const pctBig = p => p == null ? "—" : `${p > 0 ? "▲" : p < 0 ? "▼" : "▬"}${Math.abs(p)}%`;
const pctTone = p => p == null ? "var(--text-3)" : p > 0 ? "var(--up)" : p < 0 ? "var(--down)" : "var(--text-3)";
const RAMP_G = ["#c2d6c6", "#b4cdb9", "#a6c4ac", "#93b89b", "#7fac8a", "#6ca078", "#579266", "#428055", "#35704a"];
const RAMP_Y = ["#ecdcba", "#e6d2a6", "#dfc791", "#d8bc7d", "#d1b169", "#c9a556", "#c09944", "#b68c34", "#ab7f26"];
const RAMP_R = ["#ecd2c9", "#e6c5ba", "#dfb8ab", "#d8aa9c", "#d19c8d", "#c98e7e", "#c07f6f", "#b67060", "#ab6051"];
const RAMP_N = ["#dcdfd9", "#d3d7d0", "#cacfc7", "#c1c7bd", "#b8bfb4", "#aeb6aa", "#a4ada0", "#99a396", "#8e998b"];
const rampAt = (R, i, n) => R[Math.min(R.length - 1, Math.round(i / Math.max(1, n - 1) * (R.length - 1)))];

function Tile({ lb, v, sub, tone }) {
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "8px 10px", minWidth: 0 }}>
      <div style={{ fontSize: 8.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 700, whiteSpace: "nowrap" }}>{lb}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 600, color: tone || "var(--text)", marginTop: 2, whiteSpace: "nowrap" }}>{v}</div>
      {sub && <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 1, whiteSpace: "nowrap" }}>{sub}</div>}
    </div>
  );
}

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();
  const type = sp.get("type") || "style";
  const k = sp.get("k") || "";
  const label = getLabel();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [series, setSeries] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [ar, fr] = await Promise.all([
          supabase.from("account_list").select("account_id,account_name,city,sales_rep"),
          supabase.rpc("fc_base"),
        ]);
        if (ar.error || fr.error) throw (ar.error || fr.error);
        let items = [], from = 0;
        while (true) {
          const { data, error } = await supabase.from("item_grid").select("account_id,product_key,brand,package,fc_group,parent,l90,l90_prev,l52,is_new_item").range(from, from + 4999);
          if (error) throw error;
          items = items.concat(data || []);
          if (!data || data.length < 5000) break;
          from += 5000;
        }
        setD({ acc: ar.data || [], fc: fr.data || [], items });
      } catch (e) { setErr(e.message || "load failed"); }
    })();
  }, []);

  const styleOf = useMemo(() => { const m = {}; if (d) for (const r of d.fc) if (r.product_key && m[r.product_key] == null) m[r.product_key] = r.style_group || "—"; return m; }, [d]);
  const scope = useMemo(() => parseScope(), []);
  const scopeIds = useMemo(() => { if (!d || scope.kind !== "rep") return null; const s2 = new Set(); for (const a of d.acc) if ((a.sales_rep || "Unassigned") === scope.value) s2.add(a.account_id); return s2; }, [d, scope]);
  const accOf = useMemo(() => { const m = new Map(); if (d) for (const a of d.acc) m.set(a.account_id, a); return m; }, [d]);
  const inScope = it => (!label || it.parent === label) && (!scopeIds || scopeIds.has(it.account_id));
  const rowsF = useMemo(() => {
    if (!d) return null;
    return d.items.filter(it => inScope(it) && (type === "style" ? (styleOf[it.fc_group] || "—") === k : ((it.brand || "—") + "||" + (it.package || "")) === k));
  }, [d, scopeIds, styleOf, type, k]);   // eslint-disable-line

  const stat = useMemo(() => {
    if (!rowsF) return null;
    let cur = 0, prev = 0, l52 = 0, plc = 0, plcP = 0;
    const an = new Set(), ap = new Set();
    for (const it of rowsF) {
      const a = +it.l90 || 0, b = +it.l90_prev || 0;
      cur += a; prev += b; l52 += +it.l52 || 0;
      if (a > 0) { plc++; an.add(it.account_id); }
      if (b > 0) { plcP++; ap.add(it.account_id); }
    }
    return { cur, prev, pct: prev > 0 ? Math.round(100 * (cur - prev) / prev) : null, l52, plc, plcP, aN: an.size, aP: ap.size };
  }, [rowsF]);

  // accounts in scope that DON'T carry this cut (whitespace teaser)
  const whiteN = useMemo(() => {
    if (!d || !rowsF) return null;
    const active = new Set();
    for (const it of d.items) if (inScope(it) && (+it.l90 || 0) > 0) active.add(it.account_id);
    const carry = new Set(rowsF.filter(it => (+it.l90 || 0) > 0).map(it => it.account_id));
    return Math.max(0, active.size - carry.size);
  }, [d, rowsF, scopeIds]);   // eslint-disable-line

  // 12-month series from the real depletion windows for exactly these product keys
  useEffect(() => {
    if (!rowsF) return;
    if (!rowsF.length) { setSeries([]); return; }
    let dead = false;
    (async () => {
      try {
        const keys = [...new Set(rowsF.map(it => it.product_key).filter(Boolean))].slice(0, 40);
        const okA = new Set(rowsF.map(it => it.account_id));
        let all = [], from = 0;
        while (from < 20000) {
          const { data, error } = await supabase.from("depletions_window").select("account_id,product_key,window_index,cases").in("product_key", keys).lt("window_index", 12).range(from, from + 4999);
          if (error) throw error;
          all = all.concat(data || []);
          if (!data || data.length < 5000) break;
          from += 5000;
        }
        const s2 = new Array(12).fill(0);
        for (const r of all) { if (!okA.has(r.account_id)) continue; const w = +r.window_index; if (w >= 0 && w < 12) s2[11 - w] += Math.max(0, +r.cases || 0); }
        if (!dead) setSeries(s2);
      } catch { if (!dead) setSeries([]); }
    })();
    return () => { dead = true; };
  }, [rowsF]);

  const topAccts = useMemo(() => {
    if (!rowsF) return null;
    const g = {};
    for (const it of rowsF) { const e = g[it.account_id] || (g[it.account_id] = { id: it.account_id, cur: 0, prev: 0, plc: 0 }); e.cur += +it.l90 || 0; e.prev += +it.l90_prev || 0; if ((+it.l90 || 0) > 0) e.plc++; }
    return Object.values(g).filter(x => x.cur > 0 || x.prev > 0).sort((a2, b2) => b2.cur - a2.cur).slice(0, 8);
  }, [rowsF]);

  const name = type === "style" ? styleLabel(k) : (() => { const [b2, p2] = k.split("||"); return titleCase(b2) + (p2 ? ` · ${p2}` : ""); })();
  const scopeWord = scope.kind === "rep" ? titleCase(scope.value) : "All territories";
  const labelWord = label === "" ? "All labels" : label === "TORCH" ? "Torch" : "Blind Corner";
  const mShort = q => { const t = new Date(SNAPSHOT); t.setMonth(t.getMonth() + q); return t.toLocaleString("en-US", { month: "short" }).toUpperCase(); };
  const ramp = stat ? (stat.pct == null ? RAMP_N : stat.pct >= 5 ? RAMP_G : stat.pct <= -12 ? RAMP_R : stat.pct <= -2 ? RAMP_Y : RAMP_N) : RAMP_N;
  const mx = series && series.length ? Math.max(1, ...series) : 1;

  if (err) return <div className="wrap" style={{ padding: 30, color: "var(--down)" }}>Couldn’t load. {err}</div>;
  if (!d || !stat) return <div className="wrap" style={{ padding: 30, color: "var(--text-3)" }}>Loading…</div>;

  return (
    <div className="wrap pagefade" style={{ padding: "12px 20px 90px", maxWidth: 480, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <button onClick={() => router.back()} style={{ border: "none", background: "transparent", padding: "0 0 6px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: "var(--text-3)", cursor: "pointer" }}>‹ Back</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TreeGlyph {...(stat.cur > 0 ? { pct: stat.pct == null ? 0 : stat.pct } : { headline: "lapsed" })} h={54} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}><span style={{ fontFamily: "var(--font-serif)", fontSize: 23, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>{rowsF && rowsF.length > 0 && rowsF.some(it => it.is_new_item) ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "#5b6bd0", background: "rgba(91,107,208,.12)", borderRadius: 5, padding: "1.5px 6px", flexShrink: 0 }}>New item</span> : null}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2 }}>{scopeWord} · {labelWord} · {type === "style" ? "style" : "item"}</div>
        </div>
      </div>

      {/* trend-shaded 12 months, numbers on every bar */}
      <div style={{ marginTop: 12, background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14, padding: "11px 13px 9px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".09em", color: "var(--text-3)", fontWeight: 600 }}>CASES · MONTHLY</span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "var(--text-2)" }}>{series ? `${kf(series.reduce((s2, v) => s2 + v, 0))} · 12 mo` : "loading…"}</span>
        </div>
        {series && series.length > 0 ? (
          <>
            <div style={{ display: "flex", alignItems: "stretch", gap: 3, height: 92, marginTop: 8 }}>
              {series.map((v, i) => (
                <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 6.5, fontWeight: 600, color: "var(--text-3)", textAlign: "center", lineHeight: 1, marginBottom: 2, whiteSpace: "nowrap" }}>{v >= 1000 ? kf(v) : Math.round(v)}</div>
                  <div style={{ height: `${Math.max(3, (v / mx) * 82)}%`, borderRadius: "2px 2px 0 0", background: rampAt(ramp, i, series.length), transformOrigin: "bottom", animation: "barGrow .5s cubic-bezier(.2,.7,.3,1) both", animationDelay: `${i * 0.04}s` }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 6.8, textAlign: "center", color: "var(--text-3)" }}>
              {series.map((v2, i) => <span key={i} style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>{mShort(i - (series.length - 1))}</span>)}
            </div>
          </>
        ) : <div style={{ height: 104, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--text-3)" }}>{series ? "No depletions in this cut." : "Reading depletions…"}</div>}
      </div>

      {/* the cut's numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 10 }}>
        <Tile lb="90D Cases" v={<span>{kf(stat.cur)}<span style={{ fontSize: 9.5, fontWeight: 700, marginLeft: 4, color: pctTone(stat.pct) }}>{pctBig(stat.pct)}</span></span>} sub="vs prev 90D" />
        <Tile lb="Accounts" v={<span>{stat.aN.toLocaleString()}<span style={{ fontSize: 9.5, fontWeight: 700, marginLeft: 4, color: pctTone(stat.aN - stat.aP) }}>{stat.aN - stat.aP > 0 ? `▲${stat.aN - stat.aP}` : stat.aN - stat.aP < 0 ? `▼${Math.abs(stat.aN - stat.aP)}` : "▬0"}</span></span>} sub="carrying · vs prev" />
        <Tile lb="Placements" v={<span>{stat.plc.toLocaleString()}<span style={{ fontSize: 9.5, fontWeight: 700, marginLeft: 4, color: pctTone(stat.plc - stat.plcP) }}>{stat.plc - stat.plcP > 0 ? `▲${stat.plc - stat.plcP}` : stat.plc - stat.plcP < 0 ? `▼${Math.abs(stat.plc - stat.plcP)}` : "▬0"}</span></span>} sub="vs prev 90D" />
        <Tile lb="Annual" v={kf(stat.l52)} sub="52 wks" />
      </div>

      {/* who's buying it */}
      {topAccts && topAccts.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "16px 0 7px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-3)" }}>Top accounts</span>
            <span style={{ fontSize: 9, color: "var(--text-3)" }}>this {type === "style" ? "style" : "item"}’s 90D cases · vs prev</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topAccts.map(t => { const a2 = accOf.get(t.id) || {}; const p2 = t.prev > 0 ? Math.round(100 * (t.cur - t.prev) / t.prev) : null; return (
              <div key={t.id} onClick={() => router.push("/account/" + encodeURIComponent(t.id))} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a2.account_name || t.id}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{titleCase(a2.city)}{type === "style" ? ` · ${t.plc} item${t.plc === 1 ? "" : "s"}` : ""}</div>
                </div>
                <div style={{ marginLeft: "auto", flexShrink: 0, display: "grid", gridTemplateColumns: "54px 42px", columnGap: 4, alignItems: "baseline" }}>
                  <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{kf(t.cur)}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: pctTone(p2) }}>{pctBig(p2)}</span>
                </div>
                <span style={{ color: "var(--border-strong)", fontSize: 14 }}>›</span>
              </div>
            ); })}
          </div>
        </>
      )}

      {/* whitespace teaser */}
      {whiteN != null && whiteN > 0 && (
        <div onClick={() => router.push("/book")} style={{ marginTop: 12, background: "var(--surface)", border: "0.5px solid var(--border-strong)", borderRadius: 12, padding: "10px 13px", fontSize: 11.5, color: "var(--text-2)", cursor: "pointer" }}>
          <b style={{ color: "var(--text)" }}>{whiteN.toLocaleString()} active account{whiteN === 1 ? "" : "s"}</b> in this scope don’t carry it — whitespace →
        </div>
      )}
    </div>
  );
}

export default function DrillPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <Inner />
    </Suspense>
  );
}
