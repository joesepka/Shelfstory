"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useExplode } from "../lib/useExplode";

const T = {
  bg: "var(--bg)", ink: "#2B2B2B", muted: "#9A968C", line: "#E6E3DB", primary: "#D8463A",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  serif: "var(--font-sans)",
};
const gpct = (c, p) => p > 0 ? Math.round(100 * (c - p) / p) : null;
const UP = "#5C9A7B", DOWN = "#C07A72", FLAT = "#A5A092";

// logo + splash palette (green)
const BOOK = "#3F6E4A";   // --accent-deep (book strokes)
const TREND = "#5E9277";  // --accent (climbing line / arrow / dots / progress)

// data-as-of label — bump this when you reload the book
const DATA_UPDATED = "June 15th, 2026";

const STNAME = { IL: "Illinois", OH: "Ohio", MI: "Michigan", MO: "Missouri", IA: "Iowa", MN: "Minnesota", WI: "Wisconsin", IN: "Indiana" };
const DECLINING = new Set(["decelerating", "at-risk", "atrisk", "at risk", "lapsed"]);
const isDeclining = h => DECLINING.has(String(h || "").toLowerCase().trim());
const isNew = h => String(h || "").toLowerCase().trim() === "new";
const titleCase = s => String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

// shared cloud path
const CLOUD_PATH = "M18 92 Q10 92 10 84 Q8 72 22 72 Q24 56 44 58 Q48 38 74 42 Q82 24 108 30 Q120 14 142 24 Q158 16 172 30 Q196 26 200 46 Q224 44 226 62 Q252 60 256 76 Q284 74 288 88 Q300 90 300 92 L300 96 Q160 100 18 96 Z";

// ---- weather model: maps the book's 90-day trend to a sky ----
// pct = s.curPct (same number the overview leads with)
function weatherFor(pct) {
  if (pct == null) return WEATHER.fair;
  if (pct >= 6) return WEATHER.sunny;
  if (pct >= -2) return WEATHER.fair;
  if (pct > -8) return WEATHER.overcast;
  return WEATHER.gloomy;
}
const WEATHER = {
  sunny: {
    key: "sunny", bg: "#FBF7EE",
    chip: { t: "Sunny outlook", c: "#8A6310", bg: "#FAF0D6" },
    sun: { x: 0.82, y: 86, r: 30, color: "#F2C14E" },
    rain: false,
    clouds: [
      { top: 64, w: 200, dur: 70, del: 0, color: "#EDE4D2", op: .5 },
      { top: 300, w: 170, dur: 84, del: -25, color: "#F0E8D8", op: .42 },
      { top: 470, w: 210, dur: 76, del: -12, color: "#EEE5D4", op: .4 },
    ],
  },
  fair: {
    key: "fair", bg: "#FAF9F4",
    chip: { t: "Fair · holding steady", c: "#5F6B58", bg: "#EDEEE6" },
    sun: { x: 0.84, y: 78, r: 26, color: "#E8D9A8", behind: true },
    rain: false,
    clouds: [
      { top: 72, w: 280, dur: 72, del: 0, color: "#D9D2C2", op: .4 },
      { top: 188, w: 220, dur: 60, del: -22, color: "#E0DAC9", op: .36 },
      { top: 300, w: 320, dur: 84, del: -44, color: "#DCD6C6", op: .34 },
      { top: 412, w: 240, dur: 56, del: -12, color: "#DAD3C3", op: .34 },
      { top: 500, w: 280, dur: 78, del: -30, color: "#DCD6C6", op: .32 },
    ],
  },
  overcast: {
    key: "overcast", bg: "#EEF0F0",
    chip: { t: "Overcast · softening", c: "#54604F", bg: "#DDE0E2" },
    sun: null, rain: false,
    clouds: [
      { top: 60, w: 300, dur: 66, del: 0, color: "#B5BAC0", op: .5 },
      { top: 168, w: 240, dur: 60, del: -20, color: "#AEB4BB", op: .52 },
      { top: 286, w: 340, dur: 84, del: -40, color: "#B8BDC3", op: .5 },
      { top: 396, w: 250, dur: 56, del: -12, color: "#B0B6BD", op: .5 },
      { top: 492, w: 300, dur: 78, del: -30, color: "#B5BAC0", op: .48 },
    ],
  },
  gloomy: {
    key: "gloomy", bg: "#E2E5E8",
    chip: { t: "Gloomy · book sliding", c: "#79473A", bg: "#EAD9D2" },
    sun: null, rain: true,
    clouds: [
      { top: 52, w: 320, dur: 64, del: 0, color: "#8E96A0", op: .62 },
      { top: 158, w: 260, dur: 58, del: -18, color: "#868E99", op: .64 },
      { top: 276, w: 360, dur: 84, del: -38, color: "#929AA4", op: .6 },
      { top: 384, w: 300, dur: 56, del: -10, color: "#8A929C", op: .62 },
      { top: 484, w: 320, dur: 78, del: -28, color: "#8E96A0", op: .6 },
    ],
  },
};

// small top-right wordmark: open book + rising trendline
function HeaderLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <svg viewBox="0 0 64 48" style={{ width: 30, height: "auto" }} aria-hidden="true">
        <path d="M32 40 q-9 -4 -22 -2 v-22 q13 -2 22 2 z" fill="none" stroke={BOOK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M32 40 q9 -4 22 -2 v-22 q-13 -2 -22 2 z" fill="none" stroke={BOOK} strokeWidth="2.4" strokeLinejoin="round" />
        <polyline points="15,30 23,27 31,22 41,14" fill="none" stroke={TREND} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M37 14 L41 14 L41 18" fill="none" stroke={TREND} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: 0.2 }}>ShelfStory</span>
    </div>
  );
}

// reactive weather layer — sun, clouds, optional rain; tinted to the book's outlook
function Weather({ w, poofing }) {
  return (
    <div className={"weatherLayer" + (poofing ? " poofing" : "")} aria-hidden="true"
      style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none", transition: "opacity .55s ease", opacity: poofing ? 0 : 1 }}>
      {w.sun && (
        <svg className="sun" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: w.sun.behind ? 0.5 : 1 }}>
          {!w.sun.behind && (
            <g className="sunrays" style={{ transformOrigin: `${(w.sun.x * 100)}% ${w.sun.y}px` }}>
              {Array.from({ length: 12 }).map((_, i) => {
                const a = i * 30 * Math.PI / 180;
                const cxv = `calc(${w.sun.x * 100}% + ${Math.cos(a) * (w.sun.r + 5)}px)`;
                return (
                  <line key={i}
                    x1={`calc(${w.sun.x * 100}% + ${Math.cos(a) * (w.sun.r + 5)}px)`} y1={w.sun.y + Math.sin(a) * (w.sun.r + 5)}
                    x2={`calc(${w.sun.x * 100}% + ${Math.cos(a) * (w.sun.r + 15)}px)`} y2={w.sun.y + Math.sin(a) * (w.sun.r + 15)}
                    stroke={w.sun.color} strokeWidth="2.5" strokeLinecap="round" />
                );
              })}
            </g>
          )}
          <circle cx={`${w.sun.x * 100}%`} cy={w.sun.y} r={w.sun.r} fill={w.sun.color} />
        </svg>
      )}
      {w.clouds.map((c, i) => (
        <svg key={i} className="cl" viewBox="0 0 320 110"
          style={{ position: "absolute", top: c.top, left: -(c.w + 40), width: c.w, opacity: c.op, animationDuration: c.dur + "s", animationDelay: c.del + "s" }}>
          <path d={CLOUD_PATH} fill={c.color} />
        </svg>
      ))}
      {w.rain && Array.from({ length: 26 }).map((_, i) => {
        const left = (i * 37 % 96) + 2;
        const top = (i * 53 % 70) + 8;
        const dur = (0.8 + (i % 5) * 0.1).toFixed(2);
        const del = ((i % 7) * 0.18).toFixed(2);
        return <span key={i} className="drop" style={{ left: left + "%", top: top + "%", animationDuration: dur + "s", animationDelay: del + "s" }} />;
      })}
    </div>
  );
}

// neutral splash clouds (data not loaded yet, so weather is unknown at splash time)
function SplashClouds() {
  const clouds = [
    { vb: "0 0 360 120", w: 360, top: 40, left: -60, color: "#D9D2C2" },
    { vb: "0 0 320 110", w: 300, top: 150, left: 120, color: "#E0DAC9" },
    { vb: "0 0 300 110", w: 320, top: 300, left: -40, color: "#DCD6C6" },
    { vb: "0 0 260 100", w: 240, top: 430, left: 160, color: "#DAD3C3" },
    { vb: "0 0 220 100", w: 260, top: 520, left: -30, color: "#DCD6C6" },
  ];
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      {clouds.map((c, i) => (
        <svg key={i} viewBox="0 0 320 110" style={{ position: "absolute", width: c.w, top: c.top, left: c.left, opacity: 0.4 }}>
          <path d={CLOUD_PATH} fill={c.color} />
        </svg>
      ))}
    </div>
  );
}

function Splash({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [boom, setBoom] = useState(false);
  // pin onDone so a parent re-render (e.g. book data loading) can't restart the
  // animation — it must draw exactly ONE cycle, then explode open.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const start = Date.now();
    const dur = 1150;
    let raf, boomT, doneT;
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else { boomT = setTimeout(() => setBoom(true), 110); doneT = setTimeout(() => onDoneRef.current(), 580); }  // one cycle -> explode open
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(boomT); clearTimeout(doneT); };
  }, []);

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
      transition: "opacity .46s ease", opacity: boom ? 0 : 1, pointerEvents: boom ? "none" : "auto",
    }}>
      <SplashClouds />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", transform: boom ? "scale(2.6)" : "scale(1)", transition: "transform .48s cubic-bezier(.34,1.56,.64,1)" }}>
        <svg viewBox="0 0 340 260" style={{ width: 260, height: "auto" }}>
          <path d={L} stroke={BOOK} strokeWidth={1.8} fill="none" strokeLinejoin="round" opacity={0.85} />
          <path d={R} stroke={BOOK} strokeWidth={1.8} fill="none" strokeLinejoin="round" opacity={0.85} />
          {drawnPts.length > 1 && (
            <path d={linePath} stroke={TREND} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {pts.slice(0, fullSeg + 1).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.6} fill={TREND} />
          ))}
          {arrow && <path d={arrow} stroke={TREND} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        <div style={{ fontFamily: T.serif, fontSize: 26, color: T.ink, letterSpacing: 1, marginTop: 18 }}>ShelfStory</div>
        <div style={{ width: 130, height: 4, background: T.line, borderRadius: 2, marginTop: 22, overflow: "hidden" }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", background: TREND, borderRadius: 2 }} />
        </div>
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

function Stat({ label, value, unit, pct, divider, delay = 0 }) {
  const c = pct == null ? FLAT : pct > 0 ? UP : pct < 0 ? DOWN : FLAT;
  const arrow = pct == null ? "" : pct > 0 ? "▲" : pct < 0 ? "▼" : "▬";
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center", borderLeft: divider ? "1px solid var(--border-strong)" : "none" }}>
      <div style={{ fontSize: 8.5, letterSpacing: 0.3, color: "var(--text-3)", lineHeight: 1.2, height: 22, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 2, marginTop: 3 }}>
        <span className="statfloat" style={{ fontSize: 21, fontWeight: 700, color: "var(--text)", lineHeight: 1, letterSpacing: "-0.5px", fontFeatureSettings: '"tnum" 1, "lnum" 1', animationDelay: `${delay}s` }}>{value}</span>
        {unit && <span style={{ fontSize: 9.5, color: "var(--text-3)" }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: c, marginTop: 5 }}>
        {arrow} {pct == null ? "—" : `${Math.abs(pct)}%`}
      </div>
    </div>
  );
}

function A({ children }) { return <strong style={{ fontWeight: 700, color: "var(--text)" }}>{children}</strong>; }

function buildBrief(rows) {
  if (!rows || !rows.length) return null;

  let cur = 0, prev = 0;
  for (const r of rows) { cur += r.cur90 || 0; prev += r.prev90 || 0; }
  const g = gpct(cur, prev);

  const stAgg = {};
  for (const r of rows) { if (!r.state) continue; const e = stAgg[r.state] ||= { cur: 0, prev: 0, n: 0 }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; e.n++; }
  const stArr = Object.entries(stAgg).map(([k, e]) => ({ k, g: gpct(e.cur, e.prev), d: Math.round(e.cur - e.prev), n: e.n })).filter(x => x.g != null);
  const stUp = stArr.filter(x => x.n >= 3 && x.g >= 4).sort((a, b) => b.d - a.d)[0];
  const stDown = stArr.filter(x => x.n >= 3 && x.g <= -4).sort((a, b) => a.d - b.d)[0];

  const cityAgg = {};
  for (const r of rows) { if (!r.city) continue; const key = `${r.city}|${r.state}`; const e = cityAgg[key] ||= { city: r.city, st: r.state, cur: 0, prev: 0, n: 0 }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; e.n++; }
  const cityArr = Object.values(cityAgg).map(c => ({ ...c, g: gpct(c.cur, c.prev), d: Math.round(c.cur - c.prev) }));
  const cityUp = cityArr.filter(c => c.n >= 2 && c.g != null && c.g >= 8).sort((a, b) => b.d - a.d)[0];
  const cityDown = cityArr.filter(c => c.n >= 2 && c.g != null && c.g <= -8).sort((a, b) => a.d - b.d)[0];

  const newCount = rows.filter(r => isNew(r.headline)).length;

  const chainAtRisk = {};
  for (const r of rows) { if (isDeclining(r.headline) && r.chain) (chainAtRisk[r.chain] ||= []).push(r); }
  let cluster = null;
  for (const ch in chainAtRisk) { const l = chainAtRisk[ch]; if (l.length >= 4 && (!cluster || l.length > cluster.n)) cluster = { chain: ch, n: l.length }; }

  const quiet = rows.filter(r => (r.cur90 || 0) > 0 && r.last_order_w != null && r.last_order_w >= 2 && (r.account_weight || 0) > 0);
  const quietVol = Math.round(quiet.reduce((s, r) => s + (r.account_weight || 0) / 12, 0));

  const trendWord = g == null ? "holding steady" : g >= 5 ? `up ${g}%` : g <= -5 ? `down ${Math.abs(g)}%` : "roughly flat";

  const p1 = [];
  p1.push(<>Your book is <A>{trendWord}</A> over the last 90 days</>);
  if (stUp) p1.push(<>, carried by <A>{STNAME[stUp.k] || stUp.k}</A> (up {stUp.g}%)</>);
  if (cityUp && (!stUp || cityUp.city)) p1.push(<> with a strong run in <A>{titleCase(cityUp.city)}</A> (+{cityUp.g}%)</>);
  p1.push(<>. </>);
  if (newCount > 0) p1.push(<><A>{newCount}</A> new account{newCount === 1 ? "" : "s"} opened this quarter{newCount >= 3 ? " — worth locking in before they stall" : ""}. </>);
  if (!stUp && !cityUp && newCount === 0) p1.push(<>Nothing's running away on the upside right now — it's a hold-and-defend quarter. </>);

  const p2 = [];
  let opened = false;
  if (stDown) { p2.push(<>Keep an eye on <A>{STNAME[stDown.k] || stDown.k}</A> — it's down {Math.abs(stDown.g)}%</>); opened = true; }
  if (cityDown) {
    if (opened) p2.push(<>, and <A>{titleCase(cityDown.city)}</A> specifically is off {Math.abs(cityDown.g)}%</>);
    else { p2.push(<>Keep an eye on <A>{titleCase(cityDown.city)}</A> — down {Math.abs(cityDown.g)}%</>); opened = true; }
  }
  if (cluster) {
    if (opened) p2.push(<>. <A>{cluster.n} {titleCase(cluster.chain)}</A> locations are softening together — usually one fixable cause, not {cluster.n} separate problems</>);
    else { p2.push(<><A>{cluster.n} {titleCase(cluster.chain)}</A> locations are softening together</>); opened = true; }
  }
  if (opened) p2.push(<>. </>);
  if (quiet.length >= 3) p2.push(<>On rate of sale, <A>{quiet.length}</A> steady accounts have gone quiet (60+ days) — roughly <A>{quietVol.toLocaleString()} cs/mo</A> of pace at risk if they slip to lapsed. </>);
  if (!opened && quiet.length < 3) p2.push(<>No major red flags this quarter — the watch list is short. </>);

  return { p1, p2 };
}

// home nav — big-editorial list. order here is display order; `color` tints the
// arrow, `highlight` gives the row a subtle coral wash (the priority action).
const NAV = [
  { href: "/book", title: "Accounts", color: "#3F6E4A", sub: "Find accounts by area and work your list." },
  { href: "/perf", title: "Decision Tree", color: "#3D6E93", sub: "Drill the whole book to its biggest areas of distress — and where to act." },
  { href: "/dist", title: "Presentation", color: "#8A6310", sub: "A full, presentable per-distributor review." },
  { href: "/wholesale", title: "Historical Trends", color: "#534AB7", sub: "Depletion and inventory momentum over time." },
  { href: "/actions", title: "Actions", color: "#B0573A", sub: "Your highest-priority plays for the day.", highlight: true },
];

export default function Home() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [greet, setGreet] = useState("Welcome");
  const [briefOpen, setBriefOpen] = useState(false);
  const [poofing, setPoofing] = useState(false);
  const { burst, styleFor } = useExplode();

  useEffect(() => {
    (async () => {
      try {
        let all = [], from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("account_list")
            .select("account_id,cur90,prev90,live_placements,live_prev,state,city,chain,headline,account_weight,last_order_w")
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

  useEffect(() => { setGreet(greeting()); }, []);

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

  const brief = useMemo(() => buildBrief(rows), [rows]);

  // weather follows the book's 90-day trend (same number the overview leads with)
  const w = useMemo(() => weatherFor(s ? s.curPct : null), [s]);

  function navTo(href) {
    if (poofing) return;
    setPoofing(true);              // fade the weather sky
    burst(href, () => router.push(href)); // explode the cards, then navigate
  }

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}

      <main style={{ position: "relative", minHeight: "100vh", background: w.bg, transition: "background .8s ease", padding: 24, fontFamily: "var(--font-sans)", maxWidth: 480, margin: "0 auto", overflow: "hidden" }}>
        <Weather w={w} poofing={poofing} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* top row: greeting + logo */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginTop: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 26, color: "var(--text)", margin: "4px 0 4px", fontWeight: 700, letterSpacing: "-0.3px" }}>{greet}, Joe.</h1>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 0 }}>Data last updated {DATA_UPDATED}</p>
              {/* reserved slot so the chip's arrival never shoves the layout down */}
              <div style={{ minHeight: 29, marginTop: 8 }}>
                {s && <span className="riseIn" style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, color: w.chip.c, background: w.chip.bg, padding: "3px 10px", borderRadius: 20 }}>{w.chip.t}</span>}
              </div>
            </div>
            <div style={{ flexShrink: 0, marginTop: 4 }}><HeaderLogo /></div>
          </div>

          {/* collapsible brief — outer slot stays mounted so the toggle reserves its line */}
          <div style={{ marginTop: 16, minHeight: 19 }}>
            {s && brief && (
              <div className="riseIn" style={{ animationDelay: ".06s" }}>
                <div onClick={() => setBriefOpen(o => !o)}
                  className={briefOpen ? "" : "bob"}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "var(--accent-deep)", letterSpacing: 0.2 }}>
                  <span style={{ display: "inline-block", transform: briefOpen ? "rotate(90deg)" : "none", transition: "transform .18s" }}>▸</span>
                  {briefOpen ? "Hide your brief" : "Expand to see your brief"}
                </div>
                {briefOpen && (
                  <div style={{ marginTop: 12, animation: "briefIn .26s ease" }}>
                    <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.62, marginBottom: 12 }}>{brief.p1}</p>
                    <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.62 }}>{brief.p2}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: 18, minHeight: 64 }}>
            {!s && !err && <div style={{ fontSize: 13, color: "var(--text-3)" }}>Reading your book…</div>}
            {err && <div style={{ fontSize: 13, color: "var(--down)" }}>Couldn’t load your book. {err}</div>}
            {s && (
              <div className="riseIn" style={{ animationDelay: ".12s", position: "relative", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 16, boxShadow: "var(--shadow)", padding: "13px 10px" }}>
                <span aria-hidden="true" style={{ position: "absolute", top: -1, left: -1, width: 16, height: 16, borderTop: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)", borderTopLeftRadius: 7 }} />
                <span aria-hidden="true" style={{ position: "absolute", bottom: -1, right: -1, width: 13, height: 13, borderBottom: "1.5px solid var(--accent)", borderRight: "1.5px solid var(--accent)", borderBottomRightRadius: 7, opacity: 0.4 }} />
                <div style={{ display: "flex" }}>
                  <Stat label="90D Cases" value={s.cur.toLocaleString()} pct={s.curPct} delay={0} />
                  <Stat label="Active Accts" value={s.acctNow.toLocaleString()} pct={s.acctPct} divider delay={0.9} />
                  <Stat label="ROS / Acct" value={s.rosNow.toFixed(1)} unit="cs" pct={s.rosPct} divider delay={1.8} />
                </div>
              </div>
            )}
            {s && <div className="riseIn" style={{ animationDelay: ".18s", textAlign: "center", fontSize: 9, color: "var(--text-3)", marginTop: 8 }}>vs prior 90 days</div>}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: 0.5, marginTop: 22, marginBottom: 2 }}>WHERE TO?</div>
          {NAV.map(c => (
            <EditorialRow key={c.href} name={c.title} sub={c.sub} color={c.color} highlight={c.highlight} onClick={() => navTo(c.href)} popStyle={styleFor(c.href)} />
          ))}

          <div style={{ height: 28 }} />
        </div>
      </main>

      <style>{`
        @keyframes briefIn{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:none;}}
        @keyframes riseIn{from{opacity:0;transform:translateY(7px);}to{opacity:1;transform:none;}}
        .riseIn{animation:riseIn .5s cubic-bezier(.22,.61,.36,1) both;}
        .edrow{transition:opacity .15s ease, background .15s ease;}
        .edrow:active{opacity:.6;}
        @media (hover:hover){.edrow:hover{opacity:.72;}}
        .weatherLayer .cl{will-change:transform;animation-name:driftAcross;animation-timing-function:linear;animation-iteration-count:infinite;}
        @keyframes driftAcross{from{transform:translateX(0);}to{transform:translateX(620px);}}
        .weatherLayer .sunrays{animation:rayspin 90s linear infinite;}
        @keyframes rayspin{from{transform:rotate(0);}to{transform:rotate(360deg);}}
        .weatherLayer .sun{animation:sunPulse 5s ease-in-out infinite;}
        @keyframes sunPulse{0%,100%{opacity:.92;}50%{opacity:1;}}
        .weatherLayer .drop{position:absolute;width:1.5px;height:9px;background:#8A929C;opacity:.4;border-radius:1px;animation-name:rainfall;animation-timing-function:linear;animation-iteration-count:infinite;}
        @keyframes rainfall{0%{transform:translateY(-10px);opacity:0;}30%{opacity:.45;}100%{transform:translateY(46px);opacity:0;}}
        .weatherLayer.poofing .cl{animation:poof .6s ease-out forwards !important;}
        @keyframes poof{0%{transform:scale(1);}35%{transform:scale(1.4);opacity:.3;}100%{transform:scale(2.2);opacity:0;}}
        @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        .bob{animation:bob 2.6s ease-in-out infinite;}
        @keyframes statFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
        .statfloat{display:inline-block;animation:statFloat 4.6s ease-in-out infinite;}
        @media (prefers-reduced-motion: reduce){.cl,.bob,.sunrays,.sun,.drop,.statfloat,.riseIn{animation:none !important;}}
      `}</style>
    </>
  );
}

// big-editorial nav row: oversized lowercase name, section-tinted arrow, hairline
// divider. The priority action gets a subtle coral wash + "today" tag.
function EditorialRow({ name, sub, color, onClick, popStyle, highlight }) {
  return (
    <div className="edrow" onClick={onClick} style={{
      cursor: "pointer",
      padding: highlight ? "12px 13px" : "13px 2px",
      marginTop: highlight ? 9 : 0,
      borderBottom: highlight ? "none" : "1px solid var(--border)",
      borderRadius: highlight ? 14 : 0,
      background: highlight ? "rgba(176,87,58,0.07)" : "transparent",
      ...(popStyle || {}),
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-1px", lineHeight: 1.05, textTransform: "lowercase", color: highlight ? color : "var(--text)" }}>{name}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {highlight && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color, background: "rgba(176,87,58,0.13)", padding: "2px 8px", borderRadius: 20 }}>today</span>}
          <span style={{ fontSize: 19, color, lineHeight: 1 }}>→</span>
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{sub}</div>
    </div>
  );
}