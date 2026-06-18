"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const T = {
  bg: "#F2F0EA", surface: "#FFFFFF", ink: "#2B2B2B", muted: "#9A968C",
  line: "#E6E3DB", primary: "#D8463A",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};
const STNAME = { IL: "Illinois", OH: "Ohio", MI: "Michigan", MO: "Missouri", IA: "Iowa", MN: "Minnesota", WI: "Wisconsin", IN: "Indiana" };
const DECLINING = new Set(["decelerating", "at-risk", "atrisk", "at risk", "lapsed"]);
const isDeclining = h => DECLINING.has(String(h || "").toLowerCase().trim());
const isNew = h => String(h || "").toLowerCase().trim() === "new";
const titleCase = s => String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const csDelta = d => `${d >= 0 ? "+" : ""}${Math.round(d).toLocaleString()} cs`;

function Splash({ onDone }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const dur = 1500;
    let raf;
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const cx = 170, cy = 150, s = 1.6;
  const pts = [
    { x: cx - 40 * s, y: cy + 22 * s },
    { x: cx - 22 * s, y: cy + 26 * s },
    { x: cx - 4 * s, y: cy + 16 * s },
    { x: cx + 16 * s, y: cy + 10 * s },
    { x: cx + 44 * s, y: cy - 14 * s },
  ];
  const totalSeg = pts.length - 1;
  const segFloat = progress * totalSeg;
  const fullSeg = Math.floor(segFloat);
  const frac = segFloat - fullSeg;

  const drawnPts = [pts[0]];
  for (let i = 1; i <= fullSeg && i < pts.length; i++) drawnPts.push(pts[i]);
  let tip = drawnPts[drawnPts.length - 1];
  if (fullSeg < totalSeg) {
    const a = pts[fullSeg], b = pts[fullSeg + 1];
    tip = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
    drawnPts.push(tip);
  } else {
    tip = pts[pts.length - 1];
  }
  const linePath = "M " + drawnPts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ");

  const prev = drawnPts[drawnPts.length - 2] || drawnPts[0];
  const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  const ah = 9 * s;
  const b1 = ang + (150 * Math.PI) / 180;
  const b2 = ang - (150 * Math.PI) / 180;
  const arrow = progress > 0.05
    ? `M ${(tip.x + ah * Math.cos(b1)).toFixed(1)} ${(tip.y + ah * Math.sin(b1)).toFixed(1)} L ${tip.x.toFixed(1)} ${tip.y.toFixed(1)} L ${(tip.x + ah * Math.cos(b2)).toFixed(1)} ${(tip.y + ah * Math.sin(b2)).toFixed(1)}`
    : "";

  const L = `M ${cx} ${cy} q ${-36 * s} ${-14 * s} ${-56 * s} ${-7 * s} v ${46 * s} q ${22 * s} ${-8 * s} ${56 * s} ${7 * s} z`;
  const R = `M ${cx} ${cy} q ${36 * s} ${-14 * s} ${56 * s} ${-7 * s} v ${46 * s} q ${-22 * s} ${-8 * s} ${-56 * s} ${7 * s} z`;

  return (
    <div style={{
      position: "fixed", inset: 0, background: T.bg, zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      transition: "opacity 0.4s ease", opacity: progress >= 1 ? 0 : 1, pointerEvents: progress >= 1 ? "none" : "auto",
    }}>
      <svg viewBox="0 0 340 260" style={{ width: 260, height: "auto" }}>
        <path d={L} stroke={T.ink} strokeWidth={1.8} fill="none" strokeLinejoin="round" opacity={0.5} />
        <path d={R} stroke={T.ink} strokeWidth={1.8} fill="none" strokeLinejoin="round" opacity={0.5} />
        {drawnPts.length > 1 && (
          <path d={linePath} stroke={T.primary} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {pts.slice(0, fullSeg + 1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.6} fill={T.primary} />
        ))}
        {arrow && <path d={arrow} stroke={T.primary} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 26, color: T.ink, letterSpacing: 1, marginTop: 18 }}>ShelfStory</div>
      <div style={{ width: 130, height: 4, background: T.line, borderRadius: 2, marginTop: 22, overflow: "hidden" }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", background: T.primary, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function NavCard({ href, title, sub, ready }) {
  const inner = (
    <div style={{
      background: T.surface, borderRadius: 18, padding: "18px 18px", marginTop: 14,
      boxShadow: "0 1px 4px rgba(0,0,0,.07)", cursor: ready ? "pointer" : "default",
      opacity: ready ? 1 : 0.72,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{title}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: ready ? "#7A766B" : T.muted, whiteSpace: "nowrap" }}>
          {ready ? "open ›" : "coming soon"}
        </div>
      </div>
      <div style={{ fontSize: 13, color: T.muted, marginTop: 6, lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
  return ready ? <a href={href} style={{ textDecoration: "none" }}>{inner}</a> : inner;
}

function NeedRow({ tone, children }) {
  const c = tone === "up" ? "#1F9D72" : tone === "down" ? "#D9694A" : "#C9962E";
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 11 }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: c, marginTop: 6, flexShrink: 0 }} />
      <span style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.42 }}>{children}</span>
    </div>
  );
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let all = [], from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("account_list")
            .select("account_id,state,city,channel_type,headline,cur90,prev90,lost_sku")
            .order("account_weight", { ascending: false })
            .range(from, from + 4999);
          if (error) throw error;
          all = all.concat(data || []);
          if (!data || data.length < 5000) break;
          from += 5000;
        }
        setRows(all);
      } catch (e) { setErr(e.message || "load failed"); }
    })();
  }, []);

  const s = useMemo(() => {
    if (!rows) return null;
    let cur = 0, prev = 0, nNew = 0, nRisk = 0, nHealthy = 0;
    const stAgg = {}, chAgg = {}, lost = {};
    for (const r of rows) {
      cur += r.cur90 || 0; prev += r.prev90 || 0;
      const hd = r.headline;
      if (isNew(hd)) nNew++; else if (isDeclining(hd)) nRisk++; else nHealthy++;
      if (r.state) {
        const e = stAgg[r.state] || (stAgg[r.state] = { cur: 0, prev: 0, cities: {} });
        e.cur += r.cur90 || 0; e.prev += r.prev90 || 0;
        if (r.city) { const c = e.cities[r.city] || (e.cities[r.city] = { cur: 0, prev: 0 }); c.cur += r.cur90 || 0; c.prev += r.prev90 || 0; }
      }
      if (r.channel_type) { const e = chAgg[r.channel_type] || (chAgg[r.channel_type] = { cur: 0, prev: 0 }); e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; }
      if (r.lost_sku) lost[r.lost_sku] = (lost[r.lost_sku] || 0) + 1;
    }
    const pct = prev > 0 ? Math.round(100 * (cur - prev) / prev) : null;

    let topState = null;
    for (const k in stAgg) { const e = stAgg[k]; const d = e.cur - e.prev; if (!topState || Math.abs(d) > Math.abs(topState.d)) topState = { name: k, d, cur: e.cur, prev: e.prev, cities: e.cities }; }
    let topCity = null;
    if (topState) for (const c in topState.cities) { const e = topState.cities[c]; const d = e.cur - e.prev; if (!topCity || Math.abs(d) > Math.abs(topCity.d)) topCity = { name: c, d }; }
    let topCh = null;
    for (const k in chAgg) { const e = chAgg[k]; const d = e.cur - e.prev; if (!topCh || Math.abs(d) > Math.abs(topCh.d)) topCh = { name: k, d, cur: e.cur, prev: e.prev }; }
    let topLost = null;
    for (const k in lost) if (!topLost || lost[k] > topLost.n) topLost = { name: k, n: lost[k] };

    return { total: rows.length, cur, pct, nNew, nRisk, nHealthy, topState, topCity, topCh, topLost };
  }, [rows]);

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}

      <main style={{ position: "relative", minHeight: "100vh", background: T.bg, padding: 24, fontFamily: T.font, maxWidth: 480, margin: "0 auto" }}>
        <div style={{ position: "absolute", top: 16, right: 20, fontFamily: "Georgia, serif", fontSize: 13, color: "#C4BFB2", letterSpacing: 0.5 }}>ShelfStory</div>

        <h1 style={{ fontSize: 27, color: T.ink, marginTop: 44, marginBottom: 4, fontWeight: 700 }}>{greeting()}, Joe.</h1>
        <p style={{ fontSize: 15, color: T.muted, marginTop: 0 }}>Here’s where your book stands today.</p>

        {/* L90 headline + Need to Know */}
        <div style={{ background: T.surface, borderRadius: 18, padding: "16px 18px", marginTop: 18, boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
          {!s && !err && <div style={{ fontSize: 13.5, color: T.muted }}>Reading your book…</div>}
          {err && <div style={{ fontSize: 13.5, color: T.primary }}>Couldn’t load your book. {err}</div>}
          {s && (
            <>
              <div style={{ fontSize: 14.5, color: T.ink, lineHeight: 1.5 }}>
                Your book moved <b>{s.cur.toLocaleString()} cases</b> over the last 90 days
                {s.pct != null && <>, <b style={{ color: s.pct >= 0 ? "#1F7A52" : T.primary }}>{s.pct >= 0 ? "+" : ""}{s.pct}%</b> vs the prior quarter</>}.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1F7A52", background: "#E2F1E9", padding: "3px 9px", borderRadius: 11 }}>{s.nHealthy.toLocaleString()} healthy</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1A5E8A", background: "#E2EDF8", padding: "3px 9px", borderRadius: 11 }}>{s.nNew.toLocaleString()} new</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#A8302A", background: "#F6E1DD", padding: "3px 9px", borderRadius: 11 }}>{s.nRisk.toLocaleString()} at-risk</span>
              </div>
              <div style={{ height: 1, background: T.line, margin: "14px 0 12px" }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginBottom: 10 }}>NEED TO KNOW</div>

              {s.topState && (() => {
                const up = s.topState.d >= 0;
                const stPct = s.topState.prev > 0 ? Math.round(100 * s.topState.d / s.topState.prev) : null;
                return (
                  <NeedRow tone={up ? "up" : "down"}>
                    <b>{STNAME[s.topState.name] || s.topState.name}</b> is {up ? "up" : "down"} {stPct != null ? `${Math.abs(stPct)}%` : ""} ({csDelta(s.topState.d)})
                    {s.topCity && <>, {up ? "led by" : "dragged by"} <b>{titleCase(s.topCity.name)}</b> ({csDelta(s.topCity.d)})</>}.
                  </NeedRow>
                );
              })()}

              {s.topCh && (() => {
                const up = s.topCh.d >= 0;
                const chPct = s.topCh.prev > 0 ? Math.round(100 * s.topCh.d / s.topCh.prev) : null;
                return (
                  <NeedRow tone={up ? "up" : "down"}>
                    <b>{titleCase(s.topCh.name)}</b> is {up ? "on fire" : "cooling off"} — {up ? "up" : "down"} {chPct != null ? `${Math.abs(chPct)}% ` : ""}({csDelta(s.topCh.d)}) across the channel over the last 90 days.
                  </NeedRow>
                );
              })()}

              {s.topLost && (
                <NeedRow tone="flat">
                  <b>{titleCase(s.topLost.name)}</b> is losing distribution — pulled from <b>{s.topLost.n.toLocaleString()}</b> account{s.topLost.n === 1 ? "" : "s"} in the last 90 days. Worth a look before it spreads.
                </NeedRow>
              )}
            </>
          )}
        </div>

        {/* nav */}
        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginTop: 26 }}>WHERE TO?</div>
        <NavCard href="/book" ready title="Accounts"
          sub="Find accounts by area, see exactly what's happening at each, and work your list — account, grid, or tree." />
        <NavCard href="/perf" ready title="Performance Overview"
          sub="The whole book at a glance — drill territory, channel, and chains, then generate a market report." />
        <NavCard href="/actions" ready title="Actions to Take"
          sub="Your highest-priority plays — win-backs, at-risk saves, distribution gaps, and momentum to ride." />

        <div style={{ height: 28 }} />
      </main>
    </>
  );
}