"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const T = {
  bg: "#F2F0EA", ink: "#2B2B2B", muted: "#9A968C", line: "#E6E3DB", primary: "#D8463A",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};
const gpct = (c, p) => p > 0 ? Math.round(100 * (c - p) / p) : null;
const UP = "#5C9A7B", DOWN = "#C07A72", FLAT = "#A5A092";

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
      <div style={{ fontFamily: T.serif, fontSize: 26, color: T.ink, letterSpacing: 1, marginTop: 18 }}>ShelfStory</div>
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

function Stat({ label, value, unit, pct }) {
  const c = pct == null ? FLAT : pct > 0 ? UP : pct < 0 ? DOWN : FLAT;
  const arrow = pct == null ? "" : pct > 0 ? "▲" : pct < 0 ? "▼" : "▬";
  return (
    <div style={{ flex: 1, minWidth: 0, padding: "0 4px", borderLeft: "1px solid #E0DCD0" }}>
      <div style={{ fontSize: 8.5, letterSpacing: 0.3, color: T.muted, lineHeight: 1.2, height: 22 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginTop: 3 }}>
        <span style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, color: "#4A463C", lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 9, color: T.muted }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: c, marginTop: 5 }}>
        {arrow} {pct == null ? "—" : `${Math.abs(pct)}%`}
      </div>
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
            .select("account_id,cur90,prev90,live_placements,live_prev")
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
    let cur = 0, prev = 0, placeNow = 0, placePrev = 0, acctNow = 0, acctPrev = 0;
    for (const r of rows) {
      cur += r.cur90 || 0; prev += r.prev90 || 0;
      placeNow += r.live_placements || 0; placePrev += r.live_prev || 0;
      if ((r.cur90 || 0) > 0) acctNow++;
      if ((r.prev90 || 0) > 0) acctPrev++;
    }
    const rosNow = acctNow ? cur / acctNow : 0;
    const rosPrev = acctPrev ? prev / acctPrev : 0;
    return {
      cur, curPct: gpct(cur, prev),
      acctNow, acctPct: gpct(acctNow, acctPrev),
      placeNow, placePct: gpct(placeNow, placePrev),
      rosNow, rosPct: rosPrev > 0 ? Math.round(100 * (rosNow - rosPrev) / rosPrev) : null,
    };
  }, [rows]);

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}

      <main style={{ position: "relative", minHeight: "100vh", background: T.bg, padding: 24, fontFamily: T.font, maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ fontSize: 27, color: T.ink, marginTop: 16, marginBottom: 4, fontWeight: 700 }}>{greeting()}, Joe.</h1>
        <p style={{ fontSize: 14.5, color: T.muted, marginTop: 0 }}>Here’s the lay of the land.</p>

        <div style={{ marginTop: 18, minHeight: 56 }}>
          {!s && !err && <div style={{ fontSize: 13, color: T.muted }}>Reading your book…</div>}
          {err && <div style={{ fontSize: 13, color: T.primary }}>Couldn’t load your book. {err}</div>}
          {s && (
            <div style={{ display: "flex", marginLeft: -4 }}>
              <Stat label="90D Cases" value={s.cur.toLocaleString()} pct={s.curPct} />
              <Stat label="Active Accts" value={s.acctNow.toLocaleString()} pct={s.acctPct} />
              <Stat label="Placements" value={s.placeNow.toLocaleString()} pct={s.placePct} />
              <Stat label="ROS / Acct" value={s.rosNow.toFixed(1)} unit="cs" pct={s.rosPct} />
            </div>
          )}
          {s && <div style={{ fontSize: 9, color: "#BCB7A9", marginTop: 9, marginLeft: 0 }}>vs prior 90 days</div>}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginTop: 26 }}>WHERE TO?</div>
        <a href="/book" style={{ textDecoration: "none" }}>
          <NavCardInner title="Accounts" sub="Find accounts by area, see what's happening at each, and work your list — account, grid, or tree." />
        </a>
        <a href="/perf" style={{ textDecoration: "none" }}>
          <NavCardInner title="Performance Overview" sub="The whole book at a glance — drill territory, channel, and chains, then generate a market report." />
        </a>
        <a href="/actions" style={{ textDecoration: "none" }}>
          <NavCardInner title="Actions to Take" sub="Your highest-priority plays — win-backs, at-risk saves, distribution gaps, and momentum to ride." />
        </a>

        <div style={{ height: 28 }} />
      </main>
    </>
  );
}

function NavCardInner({ title, sub }) {
  return (
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
  );
}