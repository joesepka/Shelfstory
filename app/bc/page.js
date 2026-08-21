"use client";
// Mobile brewery overview — the phone-sized twin of shelfcast's /bc. Parent toggle +
// clickable style-group trees + cities + items (sub-brand + pack). Reads the active
// profile's DB (NEXT_PUBLIC_PROFILE=brewery). Its own screen; the account list stays home.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TreeGlyph from "../../components/TreeGlyph";
import { run, fsum } from "../../lib/forecast";
import { parseScope, getLabel, setScope } from "../../lib/scope";

const kf = v => { const a = Math.abs(v || 0); if (a < 1000) return String(Math.round(v || 0)); return ((v || 0) / 1000).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "k"; };
const pctS = v => v == null ? "" : `${v > 0 ? "▲" : v < 0 ? "▼" : ""}${Math.abs(Math.round(v * 100))}%`;
const pctC = v => v == null ? "var(--text-3)" : v > 0.02 ? "var(--up)" : v < -0.02 ? "var(--down)" : "var(--text-3)";
const titleCase = s => String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const ACR = new Set(["IPA", "DIPA", "TIPA", "XPA", "IPL", "NEIPA", "DDH"]);
const styleLabel = s => String(s || "").split(/\s+/).map(w => (ACR.has(w.toUpperCase()) || /^\d+MG$/i.test(w)) ? w.toUpperCase() : (w.toLowerCase().charAt(0).toUpperCase() + w.toLowerCase().slice(1))).join(" ");
const g90Of = (cur, prev) => prev > 0 ? (cur - prev) / prev : (cur > 0 ? 0.25 : 0);
const treeProps = (cur, g90) => cur > 0 ? { pct: Math.round(g90 * 100) } : { headline: "lapsed" };

export default function BreweryMobile() {
  const router = useRouter();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [parent, setParent] = useState(null);
  const [style, setStyle] = useState(null);
  const [scopeRep, setScopeRep] = useState(null);   // territory carried over from home's selection
  useEffect(() => { const sc = parseScope(); if (sc.kind === "rep") setScopeRep(sc.value); const lb = getLabel(); if (lb) setParent(lb); }, []);
  // a territory that no longer exists (Aug 2026 re-cut) would scope this to nothing — drop it
  useEffect(() => { if (!d || !scopeRep) return; if (!d.acc.some(a => (a.sales_rep || "Unassigned") === scopeRep)) { setScopeRep(null); setScope(""); } }, [d, scopeRep]);

  useEffect(() => {
    (async () => {
      try {
        const [ar, ir, fr] = await Promise.all([
          supabase.from("account_list").select("account_id,city,cur90,prev90,account_weight,sales_rep"),
          supabase.from("item_grid").select("account_id,parent,brand,package,l90,l90_prev,l52,fc_group"),
          supabase.rpc("fc_base"),
        ]);
        if (ar.error || ir.error || fr.error) throw (ar.error || ir.error || fr.error);
        setD({ acc: ar.data || [], items: ir.data || [], fc: fr.data || [] });
      } catch (e) { setErr(e.message || "load failed"); }
    })();
  }, []);

  const parents = useMemo(() => d ? [...new Set(d.fc.map(r => r.parent).filter(Boolean))].sort() : [], [d]);
  const P = parent || parents[0] || null;
  const acctCity = useMemo(() => { const m = new Map(); if (d) for (const a of d.acc) m.set(a.account_id, a.city || "—"); return m; }, [d]);
  // territory scope from home — every read below narrows to these accounts
  const scopeIds = useMemo(() => { if (!d || !scopeRep) return null; const s2 = new Set(); for (const a of d.acc) if ((a.sales_rep || "Unassigned") === scopeRep) s2.add(a.account_id); return s2; }, [d, scopeRep]);
  const inScope = it => !scopeIds || scopeIds.has(it.account_id);
  // fc_group -> style group (fc_base carries the mapping) so styles can be computed item-side, scoped
  const styleOf = useMemo(() => { const m = {}; if (d) for (const r of d.fc) if (r.product_key && m[r.product_key] == null) m[r.product_key] = r.style_group || "—"; return m; }, [d]);

  const cities = useMemo(() => {
    if (!d || !P) return [];
    const g = {};
    for (const it of d.items) {
      if (it.parent !== P || !inScope(it)) continue;
      const c = acctCity.get(it.account_id) || "—";
      const e = g[c] || (g[c] = { city: c, cur: 0, prev: 0, wt: 0, accts: new Set() });
      e.cur += +it.l90 || 0; e.prev += +it.l90_prev || 0; e.wt += +it.l52 || 0;
      if ((+it.l90 || 0) > 0) e.accts.add(it.account_id);
    }
    return Object.values(g).map(e => ({ ...e, accts: e.accts.size, g90: g90Of(e.cur, e.prev) })).sort((a, b) => b.wt - a.wt);
  }, [d, P, acctCity]);

  const styles = useMemo(() => {
    if (!d || !P) return [];
    const g = {};
    for (const it of d.items) {
      if (it.parent !== P || !inScope(it)) continue;
      const sg = styleOf[it.fc_group] || "—";
      const e = g[sg] || (g[sg] = { sg, cur: 0, prev: 0, wt: 0 });
      e.cur += +it.l90 || 0; e.prev += +it.l90_prev || 0; e.wt += +it.l52 || 0;
    }
    return Object.values(g).map(e => ({ ...e, g90: g90Of(e.cur, e.prev) })).filter(s => s.wt > 0).sort((a, b) => b.wt - a.wt);
  }, [d, P, scopeIds, styleOf]);   // eslint-disable-line

  const styleGroups = useMemo(() => {
    if (!d || !P || !style) return [];
    const g = {};
    for (const it of d.items) {
      if (it.parent !== P || !inScope(it) || (styleOf[it.fc_group] || "—") !== style) continue;
      const e = g[it.fc_group] || (g[it.fc_group] = { fg: it.fc_group, cur: 0, prev: 0, wt: 0 });
      e.cur += +it.l90 || 0; e.prev += +it.l90_prev || 0; e.wt += +it.l52 || 0;
    }
    return Object.values(g).map(e => ({ fg: e.fg, wt: e.wt, g90: g90Of(e.cur, e.prev) })).sort((a, b) => b.wt - a.wt);
  }, [d, P, style, scopeIds, styleOf]);   // eslint-disable-line

  const topItems = useMemo(() => {
    if (!d || !P) return [];
    const g = {};
    for (const it of d.items) {
      if (it.parent !== P || !inScope(it)) continue;
      const key = (it.brand || "—") + "||" + (it.package || "");
      const e = g[key] || (g[key] = { brand: it.brand || "—", pack: it.package || "", cur: 0, prev: 0, wt: 0 });
      e.cur += +it.l90 || 0; e.prev += +it.l90_prev || 0; e.wt += +it.l52 || 0;
    }
    return Object.values(g).map(e => ({ ...e, g90: g90Of(e.cur, e.prev) })).filter(x => x.wt > 0).sort((a, b) => b.wt - a.wt);
  }, [d, P, scopeIds]);   // eslint-disable-line

  const stat = useMemo(() => {
    if (!d || !P) return null;
    let proj = null, trailing = 0;
    if (!scopeIds) {
      try { const m = run(d.fc.filter(r => r.parent === P)); if (m) { proj = 0; for (const s2 of m.root.children.values()) proj += fsum(s2.forecast || []); } } catch {}
    }
    for (const it of d.items) if (it.parent === P && inScope(it)) trailing += +it.l52 || 0;
    const cur = styles.reduce((s2, x) => s2 + x.cur, 0);
    const prev90 = styles.reduce((s2, x) => s2 + x.prev, 0);
    const curPct = prev90 > 0 ? Math.round(100 * (cur - prev90) / prev90) : null;   // integer %, same convention as the home card
    const now = new Set(), prev = new Set();
    for (const it of d.items) { if (it.parent !== P || !inScope(it)) continue; if ((+it.l90 || 0) > 0) now.add(it.account_id); if ((+it.l90_prev || 0) > 0) prev.add(it.account_id); }
    const acctPct = prev.size > 0 ? Math.round(100 * (now.size - prev.size) / prev.size) : null;
    return { trailing, proj, cur, curPct, accts: now.size, acctPct };
  }, [d, P, styles, scopeIds]);   // eslint-disable-line

  if (err) return <div className="wrap" style={{ padding: 30, color: "var(--down)" }}>Couldn’t load. {err}</div>;
  if (!d) return <div className="wrap" style={{ padding: 30, color: "var(--text-3)" }}>Loading brewery…</div>;
  if (!parents.length) return <div className="wrap" style={{ padding: 30, color: "var(--text-3)" }}>No parent data — set NEXT_PUBLIC_PROFILE=brewery.</div>;

  const St = ({ label, val, sub, blue }) => (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 9.5, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 19, fontWeight: 600, color: blue ? "#5b6bd0" : "var(--text)", marginTop: 2 }}>{val}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>}
    </div>
  );

  const Dlt = ({ p }) => p == null ? null : <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 6, color: p > 0 ? "var(--up)" : p < 0 ? "var(--down)" : "var(--text-3)" }}>{p > 0 ? "▲" : p < 0 ? "▼" : "▬"} {Math.abs(p)}%</span>;

  return (
    <div className="wrap pagefade" style={{ paddingBottom: 90 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 8px" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, letterSpacing: "-.01em" }}>Overview{scopeRep ? ` · ${titleCase(scopeRep)}` : ""}</div>
        <button onClick={() => router.push("/")} style={{ border: "none", background: "var(--surface-2)", color: "var(--text-2)", borderRadius: 16, fontSize: 11.5, fontWeight: 600, padding: "5px 12px", fontFamily: "inherit" }}>home →</button>
      </div>
      {scopeRep && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "0 0 10px", padding: "7px 12px", background: "var(--pop-cool-soft)", borderRadius: 10 }}>
          <span style={{ fontSize: 11.5, color: "var(--pop-cool-deep)" }}>Scoped to your {titleCase(scopeRep)} selection from home</span>
          <button onClick={() => setScopeRep(null)} style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 14, border: "none", background: "var(--surface)", color: "var(--pop-cool-deep)", cursor: "pointer", fontFamily: "inherit" }}>whole book ✕</button>
        </div>
      )}

      {/* parent toggle */}
      <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 11, padding: 4, marginBottom: 14 }}>
        {parents.map(p => (
          <button key={p} onClick={() => { setParent(p); setStyle(null); }}
            style={{ flex: 1, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "8px 0", borderRadius: 8, cursor: "pointer",
              background: p === P ? "var(--surface)" : "transparent", color: p === P ? "var(--text)" : "var(--text-3)", boxShadow: p === P ? "var(--shadow-sm)" : "none" }}>
            {p === "BLIND CORNER" ? "Blind Corner" : p === "TORCH" ? "Torch / Base" : titleCase(p)}</button>   // profile-literal-ok — Blind-Corner-only scratch route, not a tenant surface
        ))}
      </div>

      {/* stat band 2x2 */}
      {stat && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
          <St label="annual (CE)" val={kf(stat.trailing)} sub="trailing 52 wks" />
          {stat.proj != null
            ? <St label="projected 52w" val={kf(stat.proj)} sub={stat.trailing > 0 ? pctS(stat.proj / stat.trailing - 1) + " vs trailing" : ""} blue />
            : <St label="projected 52w" val="—" sub="book-level only" blue />}
          <St label="90D Cases" val={<span>{kf(stat.cur)}<Dlt p={stat.curPct} /></span>} sub="vs prev 90D" />
          <St label="Accounts" val={<span>{kf(stat.accts)}<Dlt p={stat.acctPct} /></span>} sub="vs prev 90D" />
        </div>
      )}

      {/* style trees */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>Styles · tap a tree</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(98px, 1fr))", gap: 8, marginBottom: 8 }}>
        {styles.map(s => {
          const sel = s.sg === style;
          return (
            <button key={s.sg} onClick={() => setStyle(sel ? null : s.sg)}
              style={{ border: sel ? "1.5px solid #5b6bd0" : "0.5px solid var(--border)", background: "var(--surface)", borderRadius: 12, padding: "8px 6px", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center" }}><TreeGlyph {...treeProps(s.cur, s.g90)} h={40} /></div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 3, lineHeight: 1.15, minHeight: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>{styleLabel(s.sg)}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 600 }}>{kf(s.wt)} <span style={{ fontSize: 10, color: pctC(s.g90) }}>{pctS(s.g90)}</span></div>
            </button>
          );
        })}
      </div>

      {/* style drill */}
      {style && (
        <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "10px 14px", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{styleLabel(style)} · groups</span>
            <button onClick={() => setStyle(null)} style={{ border: "none", background: "var(--surface-2)", color: "var(--text-2)", borderRadius: 14, fontSize: 11, fontWeight: 600, padding: "3px 10px", fontFamily: "inherit" }}>✕</button>
          </div>
          {styleGroups.map((g, i) => (
            <div key={g.fg} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < styleGroups.length - 1 ? "0.5px solid var(--border)" : "none" }}>
              <span style={{ fontSize: 12.5 }}>{styleLabel(g.fg)}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600 }}>{kf(g.wt)} <span style={{ fontSize: 10.5, color: pctC(g.g90), marginLeft: 3 }}>{pctS(g.g90)}</span></span>
            </div>
          ))}
        </div>
      )}

      {/* items */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-3)", margin: "18px 0 8px" }}>Items · sub-brand + pack</div>
      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 4 }}>
        {topItems.slice(0, 25).map((it, i) => (
          <div key={it.brand + it.pack} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: i < Math.min(topItems.length, 25) - 1 ? "0.5px solid var(--border)" : "none" }}>
            <span style={{ fontSize: 13, minWidth: 0 }}><span style={{ fontWeight: 600 }}>{titleCase(it.brand)}</span><span style={{ color: "var(--text-3)", fontFamily: "var(--font-mono)", fontSize: 11 }}> · {it.pack}</span></span>
            <span style={{ whiteSpace: "nowrap" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{kf(it.wt)}</span><span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: pctC(it.g90), marginLeft: 5 }}>{pctS(it.g90)}</span></span>
          </div>
        ))}
      </div>

      {/* cities */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-3)", margin: "18px 0 8px" }}>Cities</div>
      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {cities.slice(0, 40).map((c, i) => (
          <div key={c.city} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: i < Math.min(cities.length, 40) - 1 ? "0.5px solid var(--border)" : "none" }}>
            <TreeGlyph {...treeProps(c.cur, c.g90)} h={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{titleCase(c.city)}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{c.accts} account{c.accts === 1 ? "" : "s"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, fontWeight: 600 }}>{kf(c.wt)}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: pctC(c.g90) }}>{pctS(c.g90)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
