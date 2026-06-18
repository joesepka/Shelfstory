"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const T = {
  bg: "#F2F0EA", ink: "#2B2B2B", muted: "#9A968C", line: "#E6E3DB", primary: "#D8463A",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};
const STNAME = { IL: "Illinois", OH: "Ohio", MI: "Michigan", MO: "Missouri", IA: "Iowa", MN: "Minnesota", WI: "Wisconsin", IN: "Indiana" };
const titleCase = s => String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const gpct = (c, p) => p > 0 ? Math.round(100 * (c - p) / p) : null;
const pctile = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.floor((s.length - 1) * p)]; };

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

function NavCard({ href, title, sub }) {
  return (
    <a href={href} style={{ textDecoration: "none" }}>
      <div style={{
        background: "#FFFFFF", border: "0.5px solid #E4DFD3", borderRadius: 18, padding: "18px 18px", marginTop: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,.08)", cursor: "pointer",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{title}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: T.primary, whiteSpace: "nowrap" }}>open ›</div>
        </div>
        <div style={{ fontSize: 13, color: "#7E7A6E", marginTop: 6, lineHeight: 1.4 }}>{sub}</div>
      </div>
    </a>
  );
}

const UP = "#3E8E68", DOWN = "#C0524A", NUM = "#5C584E";
function moveWord(pct) {
  if (pct == null) return null;
  if (pct > 0) return { w: "up", c: UP };
  if (pct < 0) return { w: "down", c: DOWN };
  return { w: "flat", c: "#8A8678" };
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
            .select("account_id,city,state,channel_type,account_weight,cur90,prev90,live_placements,live_prev")
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
    let annual = 0, cur = 0, prev = 0, placeNow = 0, placePrev = 0, activeNow = 0;
    const stAgg = {}, chAgg = {}, cityAgg = {};
    for (const r of rows) {
      annual += r.account_weight || 0;
      cur += r.cur90 || 0; prev += r.prev90 || 0;
      placeNow += r.live_placements || 0; placePrev += r.live_prev || 0;
      if ((r.cur90 || 0) > 0) activeNow++;
      if (r.state) { const e = stAgg[r.state] ||= { cur: 0, prev: 0 }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; }
      if (r.channel_type) { const e = chAgg[r.channel_type] ||= { cur: 0, prev: 0 }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; }
      if (r.city) { const k = `${r.city}|${r.state}`; const e = cityAgg[k] ||= { city: r.city, st: r.state, cur: 0, prev: 0 }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; }
    }
    const volPct = gpct(cur, prev);
    const placePct = gpct(placeNow, placePrev);

    // strongest state by absolute case gain
    let topState = null;
    for (const k in stAgg) { const e = stAgg[k]; const d = e.cur - e.prev; const g = gpct(e.cur, e.prev); if (g != null && (!topState || d > topState.d)) topState = { name: k, d, g }; }

    // hotspot city — must clear the 80th pct of city volume (kills tiny-town noise), then fastest %
    const cityVols = Object.values(cityAgg).map(c => c.cur).filter(v => v > 0);
    const volFloor = Math.max(pctile(cityVols, 0.8), 150);
    let topCity = null;
    for (const k in cityAgg) { const e = cityAgg[k]; const g = gpct(e.cur, e.prev); if (g != null && e.cur >= volFloor && (!topCity || g > topCity.g)) topCity = { name: e.city, g }; }

    // hotspot channel — fastest growing channel
    let topCh = null;
    for (const k in chAgg) { const e = chAgg[k]; const g = gpct(e.cur, e.prev); if (g != null && (!topCh || g > topCh.g)) topCh = { name: k, g }; }

    let hotspot = null;
    if (topCity && topCh) hotspot = topCity.g >= topCh.g ? { kind: "city", ...topCity } : { kind: "channel", ...topCh };
    else hotspot = topCity ? { kind: "city", ...topCity } : topCh ? { kind: "channel", ...topCh } : null;

    return { annual, cur, volPct, placePct, activeNow, topState, hotspot };
  }, [rows]);

  const closers = ["Worth a poke when you dig in.", "Might be worth a closer look.", "Keep half an eye on it.", "Good place to start when you've got a minute."];
  const closer = closers[new Date().getDate() % closers.length];

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}

      <main style={{ position: "relative", minHeight: "100vh", background: T.bg, padding: 24, fontFamily: T.font, maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ fontSize: 27, color: T.ink, marginTop: 16, marginBottom: 4, fontWeight: 700 }}>{greeting()}, Joe.</h1>
        <p style={{ fontSize: 14.5, color: T.muted, marginTop: 0 }}>Here’s the lay of the land.</p>

        <div style={{ marginTop: 14, padding: "2px 2px" }}>
          {!s && !err && <div style={{ fontSize: 13.5, color: T.muted }}>Reading your book…</div>}
          {err && <div style={{ fontSize: 13.5, color: T.primary }}>Couldn’t load your book. {err}</div>}
          {s && (() => {
            const vm = moveWord(s.volPct), pm = moveWord(s.placePct);
            const B = ({ children }) => <b style={{ color: NUM, fontWeight: 700 }}>{children}</b>;
            const M = ({ m }) => m ? <b style={{ color: m.c, fontWeight: 700 }}>{m.w} {Math.abs(s.volPct)}%</b> : null;
            return (
              <div style={{ fontSize: 14, color: "#827D70", lineHeight: 1.7 }}>
                <p style={{ margin: 0 }}>
                  You’re pacing about <B>{Math.round(s.annual).toLocaleString()}</B> cases a year. The last 90 days moved <B>{s.cur.toLocaleString()}</B> of them
                  {vm && <>, <b style={{ color: vm.c, fontWeight: 700 }}>{vm.w} {Math.abs(s.volPct)}%</b> on the prior stretch</>}, across <B>{s.activeNow.toLocaleString()}</B> active accounts
                  {pm && <> — placements <b style={{ color: pm.c, fontWeight: 700 }}>{pm.w} {Math.abs(s.placePct)}%</b></>}.
                </p>
                <p style={{ margin: "9px 0 0" }}>
                  {s.topState && (
                    s.topState.g >= 0
                      ? <><B>{STNAME[s.topState.name] || s.topState.name}</B> is pulling the most weight right now ({s.topState.g >= 0 ? "+" : ""}{s.topState.g}%).</>
                      : <><B>{STNAME[s.topState.name] || s.topState.name}</B> is holding up best of the bunch ({s.topState.g}%).</>
                  )}
                  {s.hotspot && (
                    s.hotspot.kind === "city"
                      ? <> <B>{titleCase(s.hotspot.name)}</B>’s the standout, up <b style={{ color: UP, fontWeight: 700 }}>{s.hotspot.g}%</b>.</>
                      : <> The <B>{titleCase(s.hotspot.name)}</B> channel is where the heat is, up <b style={{ color: UP, fontWeight: 700 }}>{s.hotspot.g}%</b>.</>
                  )}
                  {" "}{closer}
                </p>
              </div>
            );
          })()}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginTop: 28 }}>WHERE TO?</div>
        <NavCard href="/book" title="Accounts"
          sub="Find accounts by area, see what's happening at each, and work your list — account, grid, or tree." />
        <NavCard href="/perf" title="Performance Overview"
          sub="The whole book at a glance — drill territory, channel, and chains, then generate a market report." />
        <NavCard href="/actions" title="Actions to Take"
          sub="Your highest-priority plays — win-backs, at-risk saves, distribution gaps, and momentum to ride." />

        <div style={{ height: 28 }} />
      </main>
    </>
  );
}