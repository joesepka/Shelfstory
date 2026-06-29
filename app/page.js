"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useExplode } from "../lib/useExplode";
import TreeGlyph, { plantState } from "../components/TreeGlyph";

const T = {
  bg: "var(--bg)", ink: "var(--text)", muted: "var(--text-3)", line: "var(--border)", primary: "var(--accent)",
  font: "var(--font-sans)",
  serif: "var(--font-serif)",
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
    key: "sunny", bg: "#FFFFFF",
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
    key: "fair", bg: "#FFFFFF",
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
    const dur = 720;
    let raf, boomT, doneT;
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else { boomT = setTimeout(() => setBoom(true), 60); doneT = setTimeout(() => onDoneRef.current(), 380); }  // one cycle -> open
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
      transition: "opacity .32s ease", opacity: boom ? 0 : 1, pointerEvents: boom ? "none" : "auto",
    }}>
      <SplashClouds />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", transform: boom ? "scale(1.7)" : "scale(1)", transition: "transform .4s cubic-bezier(.4,0,.2,1)" }}>
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
  { href: "/perf", title: "Decision Tree", color: "#3D6E93", sub: "Drill territory, channel, chain, or distributor to the biggest distress — and a report." },
  { href: "/wholesale", title: "Historical Trends", color: "#534AB7", sub: "Depletion and inventory momentum over time." },
  { href: "/actions", title: "Actions", color: "#5E9277", sub: "Your highest-priority plays for the day.", highlight: true },
];

const chevBtn = { border: "none", background: "var(--surface-2)", color: "var(--text-2)", width: 20, height: 20, borderRadius: 10, fontSize: 13, lineHeight: 1, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 };

// small ∆ chip used by the tier captions
function deltaTiny(p) {
  if (p == null) return <span style={{ color: "var(--text-3)" }}>—</span>;
  const c = p > 0 ? "var(--up)" : p < 0 ? "var(--down)" : "var(--text-3)";
  return <span style={{ color: c, fontWeight: 700 }}>{p > 0 ? "▲" : p < 0 ? "▼" : "▬"}{Math.abs(p)}%</span>;
}

// trees-per-account (scaled): expand a tier's health counts into `drawN` trees,
// proportional to its mix, interleaved so colors read as a blend. Few big trees in
// the upper tier, a thicket of small ones in the long tail.
function expandTrees(cnt, total, drawN, h) {
  if (!total || drawN <= 0) return [];
  const order = ["thriving", "bearing", "sapling", "wilting", "bare"];
  const c = order.map(k => ({ k, n: Math.round(((cnt[k] || 0) / total) * drawN) }));
  let sum = c.reduce((s, x) => s + x.n, 0), i = 0;
  while (sum < drawN) { c[i % c.length].n++; sum++; i++; }
  i = 0; while (sum > drawN && i < 400) { const x = c[i % c.length]; if (x.n > 0) { x.n--; sum--; } i++; }
  const pools = c.map(x => Array(x.n).fill(x.k)); const out = []; let go = true;
  while (go) { go = false; for (const q of pools) { if (q.length) { out.push(q.pop()); go = true; } } }
  return out.map(state => ({ state, h }));
}

// stacked health-composition bar (the instant mix read): healthy greens → gold → rust
const HB = [["thriving", "#4a9068"], ["bearing", "#6aa06a"], ["sapling", "#5bb47e"], ["wilting", "#c2922e"], ["bare", "#b0573a"]];
function HealthBar({ health }) {
  const tot = HB.reduce((s, [k]) => s + (health[k] || 0), 0) || 1;
  return (
    <div style={{ display: "flex", height: 7, borderRadius: 3, overflow: "hidden", width: "100%", marginTop: 6 }}>
      {HB.map(([k, c]) => { const w = (health[k] || 0) / tot * 100; return w > 0 ? <div key={k} style={{ width: `${w}%`, background: c }} /> : null; })}
    </div>
  );
}

// light-grey section glyphs for the four-square nav (replaces the colored dots)
function NavIcon({ href }) {
  const p = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "#aab2a3", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (href === "/book") return <svg {...p}><rect x="3" y="4" width="7" height="7" rx="1.2" /><rect x="14" y="4" width="7" height="7" rx="1.2" /><rect x="3" y="14" width="7" height="7" rx="1.2" /><rect x="14" y="14" width="7" height="7" rx="1.2" /></svg>;
  if (href === "/perf") return <svg {...p}><circle cx="5" cy="6" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="12" cy="19" r="2" /><path d="M12 17 V11 M12 11 H5 V8 M12 11 H19 V8" /></svg>;
  if (href === "/wholesale") return <svg {...p}><path d="M4 4 V20 H20" /><polyline points="7 15 11 11 14 13 19 7" /></svg>;
  return <svg {...p}><path d="M13 3 L5 13 H11 L10 21 L19 10 H13 Z" /></svg>;
}

export default function Home() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [greet, setGreet] = useState("Welcome");
  const [briefOpen, setBriefOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const touchX = useRef(null);
  const { burst, styleFor } = useExplode();

  useEffect(() => {
    (async () => {
      try {
        let all = [], from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("account_list")
            .select("account_id,cur90,prev90,state,city,chain,headline,account_weight,prior90_pct,last_order_w")
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

  const brief = useMemo(() => buildBrief(rows), [rows]);

  // swipeable header: the whole book, then each state high→low by 90-day volume.
  // each slide carries its 3 stats AND a 3-tier volume landscape (upper / mid / long
  // tail by cumulative L52W volume), each tier depicted by a few health trees.
  const slides = useMemo(() => {
    if (!rows || !rows.length) return null;
    const TIERS = [
      { key: "upper", label: "Upper tier", h: 48, cap: 6 },
      { key: "mid", label: "Mid tier", h: 30, cap: 12 },
      { key: "tail", label: "Long tail", h: 18, cap: 24 },
    ];
    const mk = (label, key, list) => {
      let cur = 0, prev = 0, acctNow = 0, acctPrev = 0;
      for (const r of list) { const c = r.cur90 || 0, p = r.prev90 || 0; cur += c; prev += p; if (c > 0) acctNow++; if (p > 0) acctPrev++; }
      const rosNow = acctNow ? cur / acctNow : 0, rosPrev = acctPrev ? prev / acctPrev : 0;
      // split by cumulative L52W volume (account_weight): 0–25% upper, 25–75% mid, 75–100% tail
      const sorted = [...list].sort((a, b) => (b.account_weight || 0) - (a.account_weight || 0));
      const totW = sorted.reduce((s, r) => s + (r.account_weight || 0), 0) || 1;
      const groups = { upper: [], mid: [], tail: [] };
      let cum = 0;
      for (const r of sorted) { const startF = cum / totW; cum += r.account_weight || 0; (startF < 0.25 ? groups.upper : startF < 0.75 ? groups.mid : groups.tail).push(r); }
      const tiers = TIERS.map(t => {
        const g = groups[t.key];
        let c = 0, p = 0; const cnt = { thriving: 0, bearing: 0, wilting: 0, bare: 0, sapling: 0 };
        for (const r of g) { c += r.cur90 || 0; p += r.prev90 || 0; cnt[plantState(r.headline)]++; }
        const drawN = Math.min(t.cap, g.length);
        return { key: t.key, label: t.label, n: g.length, cur: c, pct: gpct(c, p), health: cnt, trees: expandTrees(cnt, g.length, drawN, t.h) };
      });
      return { label, key, cur, curPct: gpct(cur, prev), acctNow, acctPct: gpct(acctNow, acctPrev), rosNow, rosPct: rosPrev > 0 ? Math.round((100 * (rosNow - rosPrev)) / rosPrev) : null, n: list.length, tiers };
    };
    const byState = {};
    for (const r of rows) { if (!r.state) continue; (byState[r.state] || (byState[r.state] = [])).push(r); }
    const states = Object.keys(byState).map(st => mk(STNAME[st] || st, st, byState[st])).sort((a, b) => b.cur - a.cur);
    return [mk("All accounts", "ALL", rows), ...states];
  }, [rows]);
  const cur = slides ? slides[Math.min(slide, slides.length - 1)] : null;

  function navTo(href) {
    burst(href, () => router.push(href)); // explode the cards, then navigate
  }
  function go(d) { if (!slides) return; const n = slides.length; setSlide(x => (x + d + n) % n); }
  function onTouchStart(e) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e) { if (touchX.current == null) return; const dx = e.changedTouches[0].clientX - touchX.current; touchX.current = null; if (dx < -40) go(1); else if (dx > 40) go(-1); }

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}

      <main style={{ position: "relative", minHeight: "100vh", background: "linear-gradient(180deg,#b6dcf1 0px,#cce4f4 120px,#d7e6df 360px,var(--bg) 500px)", padding: 24, fontFamily: "var(--font-sans)", maxWidth: 480, margin: "0 auto", overflow: "hidden" }}>
        {/* sky clouds, drifting behind everything */}
        <svg className="cl cl1" viewBox="0 0 320 110" aria-hidden="true" style={{ position: "absolute", top: 58, left: -24, width: 124, opacity: 0.8, zIndex: 0 }}><path d={CLOUD_PATH} fill="#ffffff" /></svg>
        <svg className="cl cl2" viewBox="0 0 320 110" aria-hidden="true" style={{ position: "absolute", top: 104, right: -12, width: 90, opacity: 0.6, zIndex: 0 }}><path d={CLOUD_PATH} fill="#ffffff" /></svg>

        <div style={{ position: "relative", zIndex: 1 }}>
        {/* top row: greeting + logo */}
        <div className="riseIn" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginTop: 8 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, color: "var(--text)", margin: "4px 0 4px", fontWeight: 600, letterSpacing: "-0.3px" }}>{greet}, Joe.</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 0 }}>Data last updated {DATA_UPDATED}</p>
          </div>
          <div style={{ flexShrink: 0, marginTop: 4 }}><HeaderLogo /></div>
        </div>

        {/* collapsible brief */}
        <div style={{ marginTop: 16, minHeight: 19 }}>
          {brief && (
            <div className="riseIn" style={{ animationDelay: ".06s" }}>
              <div onClick={() => setBriefOpen(o => !o)}
                className={briefOpen ? "" : "bob"}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "var(--accent-deep)", letterSpacing: 0.2 }}>
                <span style={{ display: "inline-block", transform: briefOpen ? "rotate(90deg)" : "none", transition: "transform .18s" }}>▸</span>
                {briefOpen ? "Hide your brief" : "Expand to see your brief"}
              </div>
              {briefOpen && (
                <div style={{ marginTop: 12, animation: "briefIn .26s ease" }}>
                  <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.62, marginBottom: 12 }}>{brief.p1.map((el, i) => <span key={i}>{el}</span>)}</p>
                  <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.62 }}>{brief.p2.map((el, i) => <span key={i}>{el}</span>)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* loading / error */}
        {!slides && !err && <div style={{ marginTop: 18, fontSize: 13, color: "var(--text-3)" }}>Reading your book…</div>}
        {err && <div style={{ marginTop: 18, fontSize: 13, color: "var(--down)" }}>Couldn’t load your book. {err}</div>}

        {/* swipeable stat box (whole book, then each state high→low by volume) +
            a tier landscape below that blends into the page background */}
        {cur && (
          <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="riseIn" style={{ position: "relative", marginTop: 18, background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 16, boxShadow: "var(--shadow)", padding: "11px 10px 13px", animationDelay: ".1s" }}>
              <span aria-hidden="true" style={{ position: "absolute", top: -1, left: -1, width: 16, height: 16, borderTop: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)", borderTopLeftRadius: 7 }} />
              <span aria-hidden="true" style={{ position: "absolute", bottom: -1, right: -1, width: 13, height: 13, borderBottom: "1.5px solid var(--accent)", borderRight: "1.5px solid var(--accent)", borderBottomRightRadius: 7, opacity: 0.4 }} />
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 9 }}>
                <button aria-label="Previous state" onClick={() => go(-1)} style={chevBtn}>‹</button>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)" }}>{cur.label}</span>
                <button aria-label="Next state" onClick={() => go(1)} style={chevBtn}>›</button>
              </div>
              <div key={cur.key} className="sceneFade" style={{ display: "flex" }}>
                <Stat label="90D Cases" value={cur.cur.toLocaleString()} pct={cur.curPct} delay={0} />
                <Stat label="Active Accts" value={cur.acctNow.toLocaleString()} pct={cur.acctPct} divider delay={0.9} />
                <Stat label="ROS / Acct" value={cur.rosNow.toFixed(1)} unit="cs" pct={cur.rosPct} divider delay={1.8} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 9 }}>
              {slides.slice(0, 9).map((sl, i) => (
                <span key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 16 : 6, height: 6, borderRadius: 3, background: i === slide ? "var(--accent)" : "var(--border-strong)", transition: "width .2s, background .2s", cursor: "pointer" }} />
              ))}
              {slides.length > 9 && <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 2 }}>+{slides.length - 9}</span>}
            </div>
            <div style={{ textAlign: "center", fontSize: 9.5, color: "var(--text-3)", marginTop: 6 }}>vs prior 90 days · swipe for states, highest volume first</div>

            {/* tier landscape (Variation 2): trees + health-composition bar */}
            <div key={"sc" + cur.key} className="sceneFade tierrow">
              {cur.tiers.map(t => (
                <div key={t.key} className="tcol">
                  <div className="thdr">{t.label} {deltaTiny(t.pct)}</div>
                  <div className="ttrees">
                    {t.trees.length ? t.trees.map((tr, i) => <TreeGlyph key={i} state={tr.state} h={tr.h} />) : <span style={{ fontSize: 11, color: "var(--text-3)" }}>—</span>}
                  </div>
                  <HealthBar health={t.health} />
                  <div className="tcounts"><b>{t.n.toLocaleString()}</b> accts<div className="tvol">{t.cur.toLocaleString()} cs · 90D</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* where to — four square */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: 0.5, marginTop: 22, marginBottom: 8 }}>WHERE TO?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {NAV.map(c => (
            <div key={c.href} onClick={() => navTo(c.href)}
              style={{ cursor: "pointer", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14, padding: "13px 13px 12px", minHeight: 96, display: "flex", flexDirection: "column", boxShadow: "var(--shadow-sm)", ...(styleFor(c.href) || {}) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <NavIcon href={c.href} />
                <span style={{ fontSize: 15, color: c.color, lineHeight: 1 }}>→</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginTop: 10, letterSpacing: "-0.2px" }}>{c.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 28 }} />
        </div>
      </main>

      <style>{`
        @keyframes briefIn{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:none;}}
        @keyframes riseIn{from{opacity:0;transform:translateY(7px);}to{opacity:1;transform:none;}}
        .riseIn{animation:riseIn .5s cubic-bezier(.22,.61,.36,1) both;}
        .sceneFade{animation:sceneFade .45s ease both;}
        @keyframes sceneFade{from{opacity:0;transform:translateY(4px) scale(.98);}to{opacity:1;transform:none;}}
        .cl{will-change:transform;animation:floatCloud 50s linear infinite;}
        .cl1{animation-duration:44s;}
        .cl2{animation-duration:62s;animation-delay:-14s;}
        @keyframes floatCloud{from{transform:translateX(-140px);}to{transform:translateX(480px);}}
        .tierrow{display:flex;align-items:stretch;height:172px;margin-top:14px;}
        .tcol{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 4px;}
        .thdr{font-size:11px;font-weight:600;color:var(--accent-deep);line-height:1.2;}
        .ttrees{flex:1;width:100%;display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:center;gap:1px 2px;margin-top:6px;}
        .tcounts{font-size:11px;color:var(--text-2);margin-top:6px;line-height:1.2;}
        .tcounts b{font-size:14px;color:var(--text);font-weight:700;}
        .tvol{font-size:10px;color:var(--text-3);margin-top:1px;}
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
      padding: highlight ? "11px 12px" : "12px 2px",
      marginTop: highlight ? 9 : 0,
      borderBottom: highlight ? "none" : "1px solid var(--border)",
      borderRadius: highlight ? 12 : 0,
      background: highlight ? "var(--surface-2)" : "transparent",
      ...(popStyle || {}),
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.8px", lineHeight: 1.05, textTransform: "lowercase", color: "var(--text)" }}>{name}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {highlight && <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--text-3)" }}>today</span>}
          <span style={{ fontSize: 17, color, lineHeight: 1 }}>→</span>
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{sub}</div>
    </div>
  );
}