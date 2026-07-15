"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useExplode } from "../lib/useExplode";
import TreeGlyph, { tierBucket, TierTree } from "../components/TreeGlyph";
import { getScope, setScope } from "../lib/scope";
import ThemeChooser from "../components/ThemeChooser";
import LogoMark from "../components/LogoMark";

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
// four rolling-90 quarter labels ending at the data date (spark is 12 months long)
const QLABELS = (() => { const b = new Date(DATA_UPDATED.replace(/(\d+)(st|nd|rd|th)/, "$1")); if (isNaN(b)) return ["Q1", "Q2", "Q3", "Q4"]; return [9, 6, 3, 0].map(back => { const d = new Date(b.getFullYear(), b.getMonth() - back, 1); return `Q${Math.floor(d.getMonth() / 3) + 1} '${String(d.getFullYear()).slice(2)}`; }); })();

// a daily line at the top — resilience + doing the right thing
const QUOTES = [
  { t: "You may encounter many defeats, but you must not be defeated.", a: "Maya Angelou" },
  { t: "Do what is right, not what is easy nor what is popular.", a: "Roy T. Bennett" },
  { t: "When they go low, we go high.", a: "Michelle Obama" },
  { t: "It always seems impossible until it's done.", a: "Nelson Mandela" },
  { t: "If it is not right, do not do it; if it is not true, do not say it.", a: "Marcus Aurelius" },
  { t: "The world breaks everyone, and afterward many are strong at the broken places.", a: "Ernest Hemingway" },
  { t: "Success is measured not by the position reached, but by the obstacles overcome.", a: "Booker T. Washington" },
];

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

// the ShelfStory mark now lives in components/LogoMark.js (shared with the loaders)
function HeaderLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <LogoMark size={30} />
      <span style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.2px" }}>ShelfStory</span>
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

// soft white clouds drifting on the splash sky
function SplashClouds() {
  const clouds = [
    { vb: "0 0 360 120", w: 360, top: 40, left: -60, color: "#ffffff" },
    { vb: "0 0 320 110", w: 300, top: 150, left: 120, color: "#ffffff" },
    { vb: "0 0 300 110", w: 320, top: 300, left: -40, color: "#ffffff" },
    { vb: "0 0 260 100", w: 240, top: 430, left: 160, color: "#ffffff" },
    { vb: "0 0 220 100", w: 260, top: 520, left: -30, color: "#ffffff" },
  ];
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      {clouds.map((c, i) => (
        <svg key={i} viewBox="0 0 320 110" style={{ position: "absolute", width: c.w, top: c.top, left: c.left, opacity: 0.7 }}>
          <path d={CLOUD_PATH} fill={c.color} />
        </svg>
      ))}
    </div>
  );
}

// simple loader: the ShelfStory mark + wordmark on the sky, a gentle fade in/out
function Splash({ onDone, ready }) {
  const [out, setOut] = useState(false);
  const [minDone, setMinDone] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const firedRef = useRef(false);
  useEffect(() => { const t = setTimeout(() => setMinDone(true), 1180); return () => clearTimeout(t); }, []);
  // hold the splash until BOTH the intro has played AND the book's data is ready,
  // so the home appears fully-formed instead of loading in piecemeal
  useEffect(() => {
    if (!minDone || !ready || firedRef.current) return;
    firedRef.current = true;
    setOut(true);
    const t = setTimeout(() => onDoneRef.current(), 360);
    return () => clearTimeout(t);
  }, [minDone, ready]);
  return (
    <div style={{
      position: "fixed", inset: 0, background: "linear-gradient(180deg,#b6dcf1 0%,#cce4f4 24%,#d7e6df 62%,var(--bg) 100%)", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      transition: "opacity .34s ease", opacity: out ? 0 : 1, pointerEvents: out ? "none" : "auto",
    }}>
      <SplashClouds />
      <div className="splashIn" style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <LogoMark size={94} />
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.4px", marginTop: 12 }}>ShelfStory</div>
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
      <div style={{ fontSize: 10, letterSpacing: 0.3, color: "var(--text-3)", lineHeight: 1.2, height: 22, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
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

// facts for the snappy top-of-page summary — the few things worth knowing about
// whatever slide is showing (whole book, or one state).
function buildBrief(rows) {
  if (!rows || !rows.length) return null;
  let cur = 0, prev = 0;
  for (const r of rows) { cur += r.cur90 || 0; prev += r.prev90 || 0; }
  const g = gpct(cur, prev);

  const stAgg = {};
  for (const r of rows) { if (!r.state) continue; const e = stAgg[r.state] ||= { cur: 0, prev: 0, n: 0 }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; e.n++; }
  const stArr = Object.entries(stAgg).map(([k, e]) => ({ k, g: gpct(e.cur, e.prev), d: Math.round(e.cur - e.prev), n: e.n })).filter(x => x.g != null);
  const stUp = stArr.filter(x => x.n >= 3 && x.g >= 4).sort((a, b) => b.d - a.d)[0] || null;
  const stDown = stArr.filter(x => x.n >= 3 && x.g <= -4).sort((a, b) => a.d - b.d)[0] || null;

  const cityAgg = {};
  for (const r of rows) { if (!r.city) continue; const key = `${r.city}|${r.state}`; const e = cityAgg[key] ||= { city: r.city, st: r.state, cur: 0, prev: 0, n: 0 }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; e.n++; }
  const cityArr = Object.values(cityAgg).map(c => ({ ...c, g: gpct(c.cur, c.prev), d: Math.round(c.cur - c.prev) }));
  const cityUp = cityArr.filter(c => c.n >= 2 && c.g != null && c.g >= 8).sort((a, b) => b.d - a.d)[0] || null;
  const cityDown = cityArr.filter(c => c.n >= 2 && c.g != null && c.g <= -8).sort((a, b) => a.d - b.d)[0] || null;

  const newCount = rows.filter(r => isNew(r.headline)).length;

  const chainAtRisk = {};
  for (const r of rows) { if (isDeclining(r.headline) && r.chain) (chainAtRisk[r.chain] ||= []).push(r); }
  let cluster = null;
  for (const ch in chainAtRisk) { const l = chainAtRisk[ch]; if (l.length >= 4 && (!cluster || l.length > cluster.n)) cluster = { chain: ch, n: l.length }; }

  const quiet = rows.filter(r => (r.cur90 || 0) > 0 && r.last_order_w != null && r.last_order_w >= 2 && (r.account_weight || 0) > 0);

  return { g, stUp, stDown, cityUp, cityDown, newCount, cluster, quietN: quiet.length };
}

// the snappy 2–3 sentence "need to know" about the card below — trend, one thing to
// watch, one bright spot. Defaults to holding-steady when nothing is running.
function Snappy({ cur }) {
  const b = cur.brief, scope = cur.key === "ALL" ? "Your book" : cur.label, g = cur.curPct;
  const trend = g == null ? "holding steady" : g >= 6 ? `up ${g}%` : g >= -2 ? "holding steady" : g > -8 ? `softening ${Math.abs(g)}%` : `sliding ${Math.abs(g)}%`;
  const trendColor = g == null ? "#6b7d5e" : g >= 6 ? "#2f8f5c" : g >= -2 ? "#3f6e4a" : "#b5824a";
  let concern = null, pos = null;
  if (b) {
    if (b.stDown) concern = `keep an eye on ${STNAME[b.stDown.k] || b.stDown.k} (down ${Math.abs(b.stDown.g)}%)`;
    else if (b.cityDown) concern = `keep an eye on ${titleCase(b.cityDown.city)} (down ${Math.abs(b.cityDown.g)}%)`;
    else if (b.cluster) concern = `the ${b.cluster.n} ${titleCase(b.cluster.chain)} stores softening together are worth a look`;
    else if (b.quietN >= 3) concern = `${b.quietN} steady accounts have gone quiet 60+ days`;
    if (b.stUp) pos = `${STNAME[b.stUp.k] || b.stUp.k} is carrying you, up ${b.stUp.g}%`;
    else if (b.cityUp) pos = `a strong run in ${titleCase(b.cityUp.city)}, +${b.cityUp.g}%`;
    else if (b.newCount > 0) pos = `${b.newCount} new account${b.newCount === 1 ? "" : "s"} opened this quarter`;
  }
  return (
    <p style={{ position: "relative", margin: 0, paddingLeft: 13, fontFamily: "var(--font-serif)", fontSize: 14.5, lineHeight: 1.52, color: "#3a4a30", letterSpacing: "0.1px" }}>
      <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 3, bottom: 3, width: 3, borderRadius: 3, background: "linear-gradient(#84b268, rgba(132,178,104,.2))" }} />
      {scope} is <b style={{ color: trendColor, fontWeight: 600 }}>{trend}</b> over 90 days.{" "}
      {concern ? <>Take a look — <b style={{ color: "#b5824a", fontWeight: 600 }}>{concern}</b>.</> : <>Nothing urgent on the watch list right now.</>}{" "}
      {pos && <>Bright spot — <b style={{ color: "#2f8f5c", fontWeight: 600 }}>{pos}</b>.</>}
    </p>
  );
}

// home nav — big-editorial list. order here is display order; `color` tints the
// arrow, `highlight` gives the row a subtle coral wash (the priority action).
const NAV = [
  { href: "/book", title: "Accounts", tab: "Accounts", color: "#3F6E4A", sub: "Find accounts by area and work your list." },
  { href: "/perf", title: "Decision Tree", tab: "Decisions", color: "#3D6E93", sub: "Drill territory, channel, chain, or distributor to the biggest distress — and a report." },
  { href: "/wholesale", title: "Historical Trends", tab: "Trends", color: "#534AB7", sub: "Depletion and inventory momentum over time." },
  { href: "/actions", title: "Actions", tab: "Actions", color: "#5E9277", sub: "Your highest-priority plays for the day.", highlight: true },
];

// exact Fair Skies nav icons (green line-icons): Accounts / Decisions / Trends / Actions
const FS_ICONS = [
  <><path d="M4 9l1.6-4h12.8L20 9" /><path d="M5 9v10h14V9" /><path d="M10 19v-5h4v5" /></>,
  <><path d="M12 20v-9" /><path d="M12 11L7 6" /><path d="M12 11l5-5" /><circle cx="7" cy="5" r="1.4" fill="#3f6e4a" stroke="none" /><circle cx="17" cy="5" r="1.4" fill="#3f6e4a" stroke="none" /></>,
  <><path d="M4 16l5-5 3 3 6-7" /><path d="M15 7h4v4" /></>,
  <><path d="M6 21V4" /><path d="M6 5h11l-2.2 3L17 11H6" /></>,
];

const chevBtn = { border: "none", background: "var(--surface-2)", color: "var(--text-2)", width: 20, height: 20, borderRadius: 10, fontSize: 13, lineHeight: 1, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 };

// small ∆ chip used by the tier captions
function deltaTiny(p) {
  if (p == null) return <span style={{ color: "var(--text-3)" }}>—</span>;
  const c = p > 0 ? "var(--up)" : p < 0 ? "var(--down)" : "var(--text-3)";
  return <span style={{ color: c, fontWeight: 700 }}>{p > 0 ? "▲" : p < 0 ? "▼" : "▬"}{Math.abs(p)}%</span>;
}

// a tier's overall health → a vitality (0..1, drives the single tree's fullness)
// and a color carried strongly through the canopy (green → gold → rust).
// the book by quarter — taller bars = 90D cases, growth vs prior quarter above each
function SeasonBars({ quarters }) {
  const max = Math.max(1, ...quarters.map(q => q.cases || 0));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 9, marginTop: 4, height: 134, padding: "0 2px" }}>
      {quarters.map((q, i) => {
        const h = 34 + Math.round((q.cases / max) * 88), g = q.qoq, on = i === quarters.length - 1;
        const c = g == null ? "#8ab07d" : g >= 6 ? "#4a9068" : g >= 0 ? "#8ab07d" : g <= -5 ? "#c07a72" : "#d0a24a";
        return (
          <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
            <div style={{ height: 14, fontSize: 10.5, fontWeight: 700, color: g == null ? "var(--text-3)" : g > 0 ? "var(--up)" : g < 0 ? "var(--down)" : "var(--text-3)" }}>{g == null ? "" : `${g > 0 ? "▲" : g < 0 ? "▼" : "▬"}${Math.abs(g)}%`}</div>
            <div style={{ width: "72%", maxWidth: 42, height: h, borderRadius: "6px 6px 3px 3px", background: c, opacity: on ? 1 : 0.82, boxShadow: on ? "inset 0 0 0 1.7px rgba(47,61,40,.8)" : "none", transition: "height .3s" }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginTop: 5, fontVariantNumeric: "tabular-nums" }}>{(q.cases || 0).toLocaleString()}</div>
            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 1 }}>{q.label}</div>
          </div>
        );
      })}
    </div>
  );
}
// realistic branching root systems — generated ONCE, deterministically (fixed seeds so
// server + client render identically). A main root forks into ever-finer, tapering roots
// that trend downward. Two variants so the two windows don't look like clones.
function makeRootSystem(seed) {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const segs = [];
  function grow(x, y, ang, len, w, depth) {
    if (depth <= 0 || len < 3 || w < 0.5) return;
    let px = x, py = y, pa = ang; const pts = [`M${x.toFixed(1)} ${y.toFixed(1)}`];
    for (let k = 0; k < 2; k++) {
      pa += (rnd() - 0.5) * 0.55;
      const nx = px + Math.cos(pa) * (len / 2), ny = py + Math.sin(pa) * (len / 2);
      const cx = px + Math.cos(pa) * (len / 4), cy = py + Math.sin(pa) * (len / 4);
      pts.push(`Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`);
      px = nx; py = ny;
    }
    segs.push({ d: pts.join(" "), w });
    const kids = depth >= 3 ? 2 + (rnd() < 0.5 ? 1 : 0) : (rnd() < 0.7 ? 2 : 1);
    for (let i = 0; i < kids; i++) {
      const spread = (i - (kids - 1) / 2) * (0.55 + rnd() * 0.4) + (rnd() - 0.5) * 0.3;
      // pull each child back toward straight-down so the system trends downward
      const na = (pa + spread) * 0.55 + (Math.PI / 2) * 0.45;
      grow(px, py, na, len * (0.66 + rnd() * 0.16), w * (0.62 + rnd() * 0.12), depth - 1);
    }
  }
  const mains = 3 + Math.floor(rnd() * 2);
  for (let i = 0; i < mains; i++) {
    const a = (Math.PI / 2) + ((i - (mains - 1) / 2) / mains) * 1.5;
    grow(50, 4, a, 16 + rnd() * 8, 3.2, 4);
  }
  return segs;
}
const ROOT_SYSTEMS = [makeRootSystem(1337), makeRootSystem(9241)];

// roots below a tree — the whole system grows with that window's distribution (placements)
function Roots({ scale = 0.6, variant = 0 }) {
  const s = Math.max(0.42, Math.min(1, scale));
  const segs = ROOT_SYSTEMS[variant % ROOT_SYSTEMS.length];
  const k = 0.7 + 0.3 * s, sz = 0.86 + 0.14 * s;
  return (
    <svg viewBox="0 0 100 96" width={Math.round(78 * sz)} height={Math.round(75 * sz)} aria-hidden="true" style={{ display: "block", marginTop: -4 }}>
      <ellipse cx="50" cy="6" rx={13 + s * 11} ry="2.8" fill="#e2d4bd" opacity="0.7" />
      <g transform={`translate(50 5) scale(${k.toFixed(3)}) translate(-50 -5)`}>
        {segs.map((sg, i) => (
          <path key={i} d={sg.d} fill="none" stroke={sg.w > 2 ? "#6f4327" : sg.w > 1.1 ? "#875233" : "#9e6a41"} strokeWidth={sg.w.toFixed(2)} strokeLinecap="round" strokeLinejoin="round" opacity={0.92} />
        ))}
      </g>
    </svg>
  );
}

// two windows side by side — canopy = overall account health, roots = distribution
function RootedPair({ windows }) {
  const maxDist = Math.max(1, ...windows.map(w => w.dist || 0));
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
      {windows.map((w, i) => {
        const on = i === windows.length - 1;
        return (
          <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "9px 4px 12px", borderRadius: 22, background: on ? "linear-gradient(180deg, rgba(255,255,255,.6), rgba(245,248,239,.26))" : "transparent" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: on ? "var(--accent)" : "var(--text-3)", letterSpacing: 0.3 }}>{w.label}</div>
            <div style={{ height: 74, display: "flex", alignItems: "flex-end", marginTop: 4 }}><TierTree t={w.vit} color={w.color} h={68} /></div>
            <Roots scale={(w.dist || 0) / maxDist} variant={i} />
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums", marginTop: 3 }}>{(w.dist || 0).toLocaleString()}</div>
            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: -1 }}>placements</div>
            <div style={{ fontSize: 9.5, marginTop: 3 }}>{deltaTiny(w.pct)} <span style={{ color: "var(--text-3)" }}>cases</span></div>
          </div>
        );
      })}
    </div>
  );
}
// three volume tiers standing on the Fair Skies rolling ground — Large / Mid / Small,
// each a health tree (color + fullness) with its stats, split by a soft divider.
function TierTrees({ tiers }) {
  return (
    <div style={{ marginTop: 8 }}>
      {/* the rolling hill with the trees planted ON it (trunks tucked into the grass) */}
      <div style={{ position: "relative", height: 132, overflow: "hidden", borderRadius: "16px 16px 0 0" }}>
        <svg viewBox="0 0 380 120" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}>
          <defs><linearGradient id="ttHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fbd72" stopOpacity="0.55" /><stop offset="1" stopColor="#6f9e5a" stopOpacity="0.16" /></linearGradient></defs>
          <path d="M0 90 C 70 74, 150 86, 220 80 C 290 74, 340 86, 380 78 L380 120 L0 120 Z" fill="url(#ttHill)" />
          <path d="M0 90 C 70 74, 150 86, 220 80 C 290 74, 340 86, 380 78" fill="none" stroke="#eaf3df" strokeWidth="1.5" opacity="0.8" />
        </svg>
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "0 2px" }}>
          {tiers.map(t => (
            <div key={t.label} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
              <div style={{ textAlign: "center", marginBottom: 3, lineHeight: 1.05 }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: "var(--text-3)", letterSpacing: 0.4 }}>ROS</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{t.ros != null ? t.ros.toFixed(1) : "—"}</div>
                <div style={{ fontSize: 9, marginTop: 1 }}>{deltaTiny(t.rosPct)}</div>
              </div>
              <TierTree t={t.vit} color={t.color} h={88} />
            </div>
          ))}
        </div>
      </div>
      {/* the soil strip + stats, flush under the hill so it reads as one continuous ground */}
      <div style={{ display: "flex", alignItems: "flex-start", background: "linear-gradient(180deg, rgba(111,158,90,.17), rgba(111,158,90,0))", borderRadius: "0 0 16px 16px", padding: "5px 2px 9px" }}>
        {tiers.map((t, i) => (
          <Fragment key={t.label}>
            {i > 0 && <div style={{ alignSelf: "stretch", width: 1, background: "var(--border-strong)", opacity: 0.4, margin: "3px 0" }} />}
            <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{t.label}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{t.n.toLocaleString()} accts</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums", marginTop: 1 }}>{t.cases.toLocaleString()}<span style={{ fontWeight: 500, color: "var(--text-3)", fontSize: 9 }}> cs</span></div>
              <div style={{ fontSize: 10, marginTop: 1 }}>{deltaTiny(t.pct)}</div>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
function tierScore(pct, cnt, n) {
  if (!n) return { vit: 0.5, color: "#6aa06a" };
  const healthy = ((cnt.thriving || 0) + (cnt.bearing || 0) + (cnt.sapling || 0)) / n;
  const strug = ((cnt.wilting || 0) + (cnt.bare || 0)) / n;
  const score = healthy - strug + (pct == null ? 0 : Math.max(-0.25, Math.min(0.25, pct / 40)));
  const vit = Math.max(0.05, Math.min(1, 0.5 + score * 0.55));
  const color = score >= 0.5 ? "#2f7d54" : score >= 0.2 ? "#4a9068" : score >= -0.05 ? "#6aa06a" : score >= -0.35 ? "#c98f1f" : "#b0573a";
  return { vit, color };
}

// one-line nuance under the tree — what's actually happening in the tier
function tierDesc(pct, cnt, n) {
  if (!n) return "No accounts";
  const lap = (cnt.bare || 0) / n, risk = (cnt.wilting || 0) / n, fresh = (cnt.sapling || 0) / n;
  if (lap >= 0.25) return "Losing accounts";
  if (pct != null && pct <= -5) return "Slowing down";
  if (risk >= 0.3) return "Several at risk";
  if (fresh >= 0.3) return "Lots of new accounts";
  if (pct != null && pct >= 8) return "Gaining momentum";
  return "Holding steady";
}

// turn a tier's health mix into `slots` representative tree states (largest-remainder,
// ordered healthy → struggling) so the grove mirrors the real composition.
function allocStates(cnt, total, slots) {
  if (!total || slots <= 0) return [];
  const order = ["thriving", "bearing", "sapling", "wilting", "bare"];
  const c = order.map(k => ({ k, n: Math.round(((cnt[k] || 0) / total) * slots) }));
  let sum = c.reduce((s, x) => s + x.n, 0), i = 0;
  while (sum < slots) { c[i % c.length].n++; sum++; i++; }
  i = 0; while (sum > slots && i < 400) { const x = c[i % c.length]; if (x.n > 0) { x.n--; sum--; } i++; }
  const out = [];
  for (const x of c) for (let j = 0; j < x.n; j++) out.push(x.k);
  out.sort((p, q) => order.indexOf(p) - order.indexOf(q));
  return out;
}

// light-grey section glyphs for the four-square nav (replaces the colored dots)
function NavIcon({ href, color = "#aab2a3", size = 22 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (href === "/book") return <svg {...p}><rect x="3" y="4" width="7" height="7" rx="1.2" /><rect x="14" y="4" width="7" height="7" rx="1.2" /><rect x="3" y="14" width="7" height="7" rx="1.2" /><rect x="14" y="14" width="7" height="7" rx="1.2" /></svg>;
  if (href === "/perf") return <svg {...p}><circle cx="5" cy="6" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="12" cy="19" r="2" /><path d="M12 17 V11 M12 11 H5 V8 M12 11 H19 V8" /></svg>;
  if (href === "/wholesale") return <svg {...p}><path d="M4 4 V20 H20" /><polyline points="7 15 11 11 14 13 19 7" /></svg>;
  return <svg {...p}><path d="M13 3 L5 13 H11 L10 21 L19 10 H13 Z" /></svg>;
}

// ---- Wedge: the whole book as a left-tall, right-tapering health wedge ----
const COLW = { thriving: "#4a9068", bearing: "#6aa06a", wilting: "#c2922e", bare: "#b0573a", sapling: "#5bb47e" };
const WWORD = { thriving: "Growing", bearing: "Steady", wilting: "At risk", bare: "Lapsed", sapling: "New" };
function dialogBtn(primary) { return { flex: 1, padding: "11px 0", borderRadius: 11, fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, cursor: "pointer", border: primary ? "1px solid var(--accent)" : "0.5px solid var(--border-strong)", background: primary ? "var(--accent)" : "var(--surface)", color: primary ? "#fff" : "var(--text-2)" }; }

function WedgeView({ wedge, onOpen }) {
  const [hot, setHot] = useState(-1);
  const ref = useRef(null);
  const slices = useMemo(() => {
    const arr = (wedge.indiv || []).map(a => ({ ...a, kind: "acct" }));
    if (wedge.pool) wedge.pool.samp.forEach(s => arr.push({ w: s.w, state: s.state, kind: "pool" }));
    return arr;
  }, [wedge]);
  const L = 14, R = 346, BASE = 128;
  const n = Math.max(1, slices.length);
  const sw = (R - L) / n;
  const vmax = slices.length ? Math.max(...slices.map(s => s.w), 1) : 1;
  const Hh = w => Math.max(3, (w / vmax) * 104);
  const idxAt = e => { const r = ref.current.getBoundingClientRect(); const vx = (e.clientX - r.left) / r.width * 360; return Math.max(0, Math.min(slices.length - 1, Math.floor((vx - L) / sw))); };
  const it = hot >= 0 && hot < slices.length ? slices[hot] : null;
  const hx = it ? L + hot * sw : 0, hh = it ? Hh(it.w) : 0, hy = BASE - hh;
  const leftRos = wedge.indiv && wedge.indiv.length ? Math.round(wedge.indiv[0].cur / 3) : 0;
  const rightRos = wedge.pool ? Math.round(wedge.pool.cur / wedge.pool.n / 3) : (wedge.indiv && wedge.indiv.length ? Math.round(wedge.indiv[wedge.indiv.length - 1].cur / 3) : 0);
  return (
    <div>
      <div className="wedgeRo" style={{ marginTop: 12 }}>
        {it ? (it.kind === "acct"
          ? <span><span className="rdot" style={{ background: COLW[it.state] }} /><b>{it.name}</b> · {it.cur.toLocaleString()} cs · 90D · {Math.round(it.cur / 3).toLocaleString()} cs/acct·mo · <span style={{ color: COLW[it.state], fontWeight: 700 }}>{WWORD[it.state]}</span></span>
          : <span><span className="rdot" style={{ background: "var(--soil-dk)" }} /><b>Long tail</b> · {wedge.pool.n.toLocaleString()} accounts · {wedge.pool.cur.toLocaleString()} cs · 90D · release to open</span>)
          : <span className="wedgeHint">Drag across to scan · release to open an account</span>}
      </div>
      <svg ref={ref} viewBox="0 0 360 150" width="100%" style={{ display: "block", touchAction: "none", cursor: "crosshair", marginTop: 6 }}
        onPointerMove={e => { e.preventDefault(); setHot(idxAt(e)); }}
        onPointerDown={e => { e.preventDefault(); setHot(idxAt(e)); }}
        onPointerUp={e => { e.preventDefault(); const s = slices[idxAt(e)]; if (s) onOpen(s.kind === "acct" ? { ...s } : { kind: "pool" }); }}
        onPointerLeave={() => setHot(-1)} aria-hidden="true">
        <line x1={L} y1={BASE} x2={R} y2={BASE} stroke="#cdb98f" strokeWidth="2" />
        {slices.map((s, i) => { const h = Hh(s.w); return <rect key={i} x={(L + i * sw).toFixed(2)} y={(BASE - h).toFixed(2)} width={(sw + 0.6).toFixed(2)} height={h.toFixed(2)} fill={COLW[s.state]} opacity={it && i === hot ? 1 : 0.92} />; })}
        {it && <rect x={(hx - 0.5).toFixed(2)} y={(hy - 3).toFixed(2)} width={(sw + 1.6).toFixed(2)} height={(hh + 3).toFixed(2)} fill="none" stroke="#2c3a26" strokeWidth="1.6" rx="1" />}
        {it && <circle cx={(hx + sw / 2).toFixed(2)} cy={(hy - 3).toFixed(2)} r="3.4" fill={COLW[it.state]} />}
        <text x={L} y="14" fontSize="11" fill="#7d8478">{leftRos.toLocaleString()} cs/acct·mo</text>
        <text x={R} y={BASE - 3} fontSize="11" fill="#7d8478" textAnchor="end">{rightRos}</text>
        {it && (() => {
          const lab = it.kind === "acct" ? (it.name && it.name.length > 20 ? it.name.slice(0, 19) + "…" : (it.name || "Account")) : "Long tail";
          const lx = Math.max(54, Math.min(306, hx + sw / 2));
          const ly = Math.max(20, hy - 7);
          const w = lab.length * 5.4 + 12;
          return <g key="lab">
            <rect x={(lx - w / 2).toFixed(1)} y={(ly - 12).toFixed(1)} width={w.toFixed(1)} height="15" rx="4" fill="#fbfdf8" stroke="#c2d6b4" strokeWidth="0.5" />
            <text x={lx.toFixed(1)} y={(ly - 1.5).toFixed(1)} fontSize="9.5" fontWeight="600" fill="#2c3a26" textAnchor="middle">{lab}</text>
          </g>;
        })()}
      </svg>
    </div>
  );
}

// shown once per fresh page load (not on in-app navigation back home)
let booted = false;

export default function Home() {
  const router = useRouter();
  const [phase, setPhase] = useState(booted ? "ready" : "splash"); // splash → ready
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [greet, setGreet] = useState("Welcome");
  const [slide, setSlide] = useState(0);
  const [confirm, setConfirm] = useState(null);
  const drag = useRef({ x: 0, on: false });
  const [dragDx, setDragDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [noTrans, setNoTrans] = useState(false);
  const { burst, styleFor } = useExplode();

  useEffect(() => {
    (async () => {
      try {
        let all = [], from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("account_list")
            .select("account_id,account_name,cur90,prev90,state,city,chain,headline,account_weight,prior90_pct,last_order_w,spark,live_placements,live_prev")
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

  // swipeable header: the whole book, then each state high→low by 90-day volume.
  // each slide carries its 3 stats, a state-specific brief, and four volume tiers
  // (each ~25% of L52W volume) — top / mid / small / long tail — as health trees.
  const TIER_DEFS = [{ key: "top", label: "Top tier" }, { key: "mid", label: "Mid tier" }, { key: "small", label: "Small tier" }, { key: "tail", label: "Long tail" }];
  const slides = useMemo(() => {
    if (!rows || !rows.length) return null;
    const mk = (label, key, list) => {
      let cur = 0, prev = 0, acctNow = 0, acctPrev = 0, newA = 0, lostA = 0;
      for (const r of list) { const c = r.cur90 || 0, p = r.prev90 || 0; cur += c; prev += p; if (c > 0) acctNow++; if (p > 0) acctPrev++; const hl = String(r.headline || "").toLowerCase().trim(); if (hl === "new") newA++; else if (hl === "lapsed") lostA++; }
      const rosNow = acctNow ? cur / acctNow : 0, rosPrev = acctPrev ? prev / acctPrev : 0;
      // split by cumulative L52W volume into quarters
      const sorted = [...list].sort((a, b) => (b.account_weight || 0) - (a.account_weight || 0));
      const totW = sorted.reduce((s, r) => s + (r.account_weight || 0), 0) || 1;
      const groups = { top: [], mid: [], small: [], tail: [] };
      let cum = 0;
      for (const r of sorted) { const f = cum / totW; cum += r.account_weight || 0; (f < 0.25 ? groups.top : f < 0.5 ? groups.mid : f < 0.75 ? groups.small : groups.tail).push(r); }
      const tiers = TIER_DEFS.map(t => {
        const g = groups[t.key];
        let c = 0, p = 0, an = 0; const cnt = { thriving: 0, bearing: 0, wilting: 0, bare: 0, sapling: 0 };
        for (const r of g) { c += r.cur90 || 0; p += r.prev90 || 0; if ((r.cur90 || 0) > 0) an++; cnt[tierBucket(r.headline)]++; }
        const pct = gpct(c, p), sc = tierScore(pct, cnt, g.length);
        return { key: t.key, label: t.label, n: g.length, cur: c, ros: an ? c / an : 0, pct, vit: sc.vit, color: sc.color, desc: tierDesc(pct, cnt, g.length) };
      });
      const allCnt = { thriving: 0, bearing: 0, wilting: 0, bare: 0, sapling: 0 }, sp = new Array(12).fill(0);
      let distNow = 0, distPrev = 0;
      for (const r of list) { allCnt[tierBucket(r.headline)]++; distNow += r.live_placements || 0; distPrev += r.live_prev || 0; const s = r.spark; if (Array.isArray(s)) for (let i = 0; i < 12; i++) sp[i] += s[i] || 0; }
      const curPct = gpct(cur, prev), stSc = tierScore(curPct, allCnt, list.length);
      const quarters = [2, 5, 8, 11].map((qi, k, arr) => { const cases = Math.round(sp[qi]), prior = k > 0 ? sp[arr[k - 1]] : null; return { label: QLABELS[k], cases, qoq: prior > 0 ? Math.round((100 * (cases - prior)) / prior) : null }; });
      // two windows for the rooted trees: prior 90d (left) and this 90d (right).
      // canopy health = tierScore for that window's growth; roots = summed distribution (placements).
      const priorScore = tierScore(quarters[2].qoq, allCnt, list.length);
      const windows = [
        { label: "Prev 90 days", vit: priorScore.vit, color: priorScore.color, pct: quarters[2].qoq, dist: distPrev },
        { label: "This 90 days", vit: stSc.vit, color: stSc.color, pct: curPct, dist: distNow },
      ];
      // three volume tiers for the ground trees — Large (top 20% of accounts by size),
      // Mid (20–60%), Small (60–80%); ranked by L52W volume (fallback 90-day)
      const bySize = list.filter(r => (r.account_weight || r.cur90 || 0) > 0).sort((a, b) => (b.account_weight || b.cur90 || 0) - (a.account_weight || a.cur90 || 0));
      const NB = bySize.length, c1 = Math.round(NB * 0.2), c2 = Math.round(NB * 0.6), c3 = Math.round(NB * 0.8);
      const tstat = (lbl, rws) => { let c = 0, p = 0, an = 0, ap = 0; const cn = { thriving: 0, bearing: 0, wilting: 0, bare: 0, sapling: 0 }; for (const r of rws) { const cc = r.cur90 || 0, pp = r.prev90 || 0; c += cc; p += pp; if (cc > 0) an++; if (pp > 0) ap++; cn[tierBucket(r.headline)]++; } const pc = gpct(c, p), sc = tierScore(pc, cn, rws.length), ros = an ? c / an : 0, rosPrev = ap ? p / ap : 0; return { label: lbl, n: rws.length, cases: Math.round(c), pct: pc, vit: sc.vit, color: sc.color, ros, rosPct: rosPrev > 0 ? Math.round((100 * (ros - rosPrev)) / rosPrev) : null }; };
      const tiers3 = [tstat("Large", bySize.slice(0, c1)), tstat("Mid", bySize.slice(c1, c2)), tstat("Small", bySize.slice(c2, c3))];
      return { label, key, cur, curPct, acctNow, acctPct: acctNow ? Math.round((100 * (newA - lostA)) / acctNow) : null, rosNow, rosPct: rosPrev > 0 ? Math.round((100 * (rosNow - rosPrev)) / rosPrev) : null, n: list.length, brief: buildBrief(list), tiers, treeVit: stSc.vit, treeColor: stSc.color, quarters, windows, tiers3 };
    };
    const byState = {};
    for (const r of rows) { if (!r.state) continue; (byState[r.state] || (byState[r.state] = [])).push(r); }
    const states = Object.keys(byState).map(st => mk(STNAME[st] || st, st, byState[st])).sort((a, b) => b.cur - a.cur);
    return [mk("All accounts", "ALL", rows), ...states];
  }, [rows]);
  // top chains across the whole book — for the chain orchard (tap → that chain's report)
  const chains = useMemo(() => {
    if (!rows) return null;
    const m = {};
    for (const r of rows) { const ch = r.chain; if (!ch) continue; const e = m[ch] || (m[ch] = { chain: ch, cur: 0, prev: 0, n: 0, cnt: { thriving: 0, bearing: 0, wilting: 0, bare: 0, sapling: 0 } }); e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; e.n++; e.cnt[tierBucket(r.headline)]++; }
    return Object.values(m).filter(e => e.n >= 3).map(e => { const pct = gpct(e.cur, e.prev), sc = tierScore(pct, e.cnt, e.n); return { chain: e.chain, cur: e.cur, pct, n: e.n, vit: sc.vit, color: sc.color }; }).sort((a, b) => b.cur - a.cur).slice(0, 8);
  }, [rows]);
  const cur = slides ? slides[Math.min(slide, slides.length - 1)] : null;

  // always open on "All states" — clears any remembered scope on entry
  useEffect(() => { setScope(""); }, []);

  function navTo(href) {
    burst(href, () => router.push(href)); // explode the cards, then navigate
  }
  function pick(i) { if (!slides) return; setSlide(i); setScope(slides[i].key === "ALL" ? "" : slides[i].key); }
  function go(d) { if (!slides) return; const n = slides.length; pick((slide + d + n) % n); }
  // Gmail-style drag: the bar follows the finger with a little rubber-band, then
  // snaps back and commits to the next/prev slide if dragged past the threshold.
  function onDown(e) { if (!slides || slides.length < 2) return; drag.current = { x: e.clientX, on: true }; setDragging(true); }
  function onMove(e) { if (!drag.current.on) return; let d = e.clientX - drag.current.x; if (Math.abs(d) > 90) d = (d > 0 ? 1 : -1) * (90 + (Math.abs(d) - 90) * 0.35); setDragDx(d); }
  function onUp() { if (!drag.current.on) return; drag.current.on = false; setDragging(false); const d = dragDx; if (d < -48) commit(1); else if (d > 48) commit(-1); else setDragDx(0); }
  // carousel commit: slide the card out the way it was swiped, swap, then slide the
  // new card in from the other side — a full rotate rather than a snap-back.
  function commit(dir) { const W = 440; setDragDx(dir === 1 ? -W : W); setTimeout(() => { go(dir); setNoTrans(true); setDragDx(dir === 1 ? W : -W); requestAnimationFrame(() => requestAnimationFrame(() => { setNoTrans(false); setDragDx(0); })); }, 300); }

  return (
    <>
      {phase === "splash" && <Splash ready={!!slides || !!err} onDone={() => { booted = true; setPhase("ready"); }} />}
      {pickerOpen && <ThemeChooser onChoose={() => setPickerOpen(false)} onClose={() => setPickerOpen(false)} />}

      <main className="pagefade" style={{ position: "relative", minHeight: "100vh", background: "linear-gradient(180deg,#b6dcf1 0px,#cce4f4 120px,#d7e6df 360px,var(--bg) 500px)", padding: "14px 20px 12px", fontFamily: "var(--font-sans)", maxWidth: 480, margin: "0 auto", overflow: "hidden" }}>
        {/* sky clouds, drifting behind everything */}
        {/* soft sun, upper right — a warm glow, not a cartoon (clouds drift in front) */}
        <div aria-hidden="true" style={{ position: "absolute", top: -20, right: -16, width: 138, height: 138, zIndex: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 62% 40%, rgba(242,201,120,.55), rgba(242,201,120,.16) 44%, transparent 70%)" }} />
          <div style={{ position: "absolute", top: 40, right: 44, width: 44, height: 44, borderRadius: "50%", background: "radial-gradient(circle at 38% 34%, #f5d68f, #ecbb61 66%, #e3a842)", boxShadow: "0 0 22px 5px rgba(236,187,97,.3)" }} />
        </div>
        <svg className="cl cl1" viewBox="0 0 320 110" aria-hidden="true" style={{ position: "absolute", top: 58, left: -24, width: 124, opacity: 0.8, zIndex: 0 }}><path d={CLOUD_PATH} fill="#ffffff" /></svg>
        <svg className="cl cl2" viewBox="0 0 320 110" aria-hidden="true" style={{ position: "absolute", top: 104, right: -12, width: 90, opacity: 0.6, zIndex: 0 }}><path d={CLOUD_PATH} fill="#ffffff" /></svg>

        <div style={{ position: "relative", zIndex: 1 }}>
        {/* top row: greeting (kept low-key) + logo */}
        <div className="riseIn" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 2 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: "var(--text-2)", fontWeight: 600, letterSpacing: "-0.1px" }}>{greet}, Joe</div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 1 }}>Updated {DATA_UPDATED}</div>
          </div>
          <div style={{ flexShrink: 0 }}><HeaderLogo /></div>
        </div>

        {/* the scope you're viewing — centered + prominent */}
        {cur && (
          <div className="riseIn" style={{ marginTop: 14, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 27, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.4px", lineHeight: 1.05 }}>{cur.key === "ALL" ? "All states" : cur.label}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{cur.key === "ALL" ? "Your whole book" : `Focused on ${cur.label}`}{slides.length > 1 ? " · swipe the stats to change" : ""}</div>
          </div>
        )}

        {/* info box (swipeable) — 90D cases / accts / ROS — ABOVE the brief */}
        {cur && (
          <div style={{ marginTop: 14 }}>
            <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
              style={{ transform: `translateX(${dragDx}px)`, transition: (dragging || noTrans) ? "none" : "transform .3s cubic-bezier(.2,.7,.2,1)", touchAction: "pan-y", cursor: slides && slides.length > 1 ? "grab" : "default" }}>
            <div className="riseIn" style={{ position: "relative", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 16, boxShadow: "var(--shadow)", padding: "11px 10px" }}>
              <span aria-hidden="true" style={{ position: "absolute", top: -1, left: -1, width: 16, height: 16, borderTop: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)", borderTopLeftRadius: 7 }} />
              <span aria-hidden="true" style={{ position: "absolute", bottom: -1, right: -1, width: 13, height: 13, borderBottom: "1.5px solid var(--accent)", borderRight: "1.5px solid var(--accent)", borderBottomRightRadius: 7, opacity: 0.4 }} />
              <div key={cur.key} className="sceneFade" style={{ display: "flex" }}>
                <Stat label="90D Cases" value={cur.cur.toLocaleString()} pct={cur.curPct} delay={0} />
                <Stat label="Active Accts" value={cur.acctNow.toLocaleString()} pct={cur.acctPct} divider delay={0.9} />
                <Stat label="ROS / Acct" value={cur.rosNow.toFixed(1)} unit="cs" pct={cur.rosPct} divider delay={1.8} />
              </div>
            </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 6 }}>
              {slides.slice(0, 9).map((sl, i) => (
                <span key={i} onClick={() => pick(i)} style={{ width: i === slide ? 16 : 6, height: 6, borderRadius: 3, background: i === slide ? "var(--accent)" : "var(--border-strong)", transition: "width .2s, background .2s", cursor: "pointer" }} />
              ))}
              {slides.length > 9 && <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 2 }}>+{slides.length - 9}</span>}
            </div>
            <div style={{ textAlign: "center", fontSize: 9.5, color: "var(--text-3)", marginTop: 3 }}>vs prior 90 days</div>
          </div>
        )}


        {/* snappy need-to-know — BELOW the 90D card, trails the swipe with a sticky lag */}
        <div className="riseIn" style={{ marginTop: 12, marginBottom: 2, transform: `translateX(${Math.max(-44, Math.min(44, dragDx * 0.5))}px)`, transition: dragging ? "transform .22s ease" : noTrans ? "none" : "transform .5s cubic-bezier(.2,.7,.2,1) .05s" }}>
          {cur ? <Snappy cur={cur} /> : <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Reading your book…</div>}
        </div>

        {/* loading / error */}
        {!slides && !err && <div style={{ marginTop: 18, fontSize: 13, color: "var(--text-3)" }}>Reading your book…</div>}
        {err && <div style={{ marginTop: 18, fontSize: 13, color: "var(--down)" }}>Couldn’t load your book. {err}</div>}

        {/* primary nav — Fair Skies stepping-stones (exact style) */}
        <div className="riseIn" style={{ display: "flex", gap: 9, marginTop: 18 }}>
          {NAV.map((c, i) => (
            <div key={c.href} onClick={() => router.push(c.href)} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "12px 4px 11px", borderRadius: ["22px", "24px 22px 26px 22px", "22px 26px 22px 24px", "22px"][i] || "22px", cursor: "pointer", background: "linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.62))", boxShadow: "0 12px 24px -18px rgba(63,110,74,.6), inset 0 1px 0 rgba(255,255,255,.6)" }}>
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="#3f6e4a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{FS_ICONS[i]}</svg>
              <span style={{ fontSize: 11, color: "#41533a", letterSpacing: "0.2px", whiteSpace: "nowrap" }}>{c.tab}</span>
            </div>
          ))}
        </div>

        {/* your book by size — Large / Mid / Small tiers standing on the hills */}
        {cur && cur.tiers3 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: 0.3, marginBottom: 2 }}>YOUR BOOK BY SIZE <span style={{ fontWeight: 600, opacity: 0.75 }}>· health of large, mid & small accounts</span></div>
            <TierTrees tiers={cur.tiers3} />
          </div>
        )}

        {/* (state & chain orchards removed — the rooted tree is the only bottom section now) */}

        <div style={{ height: 8 }} />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button onClick={() => setPickerOpen(true)} aria-label="Change tree style" style={{ border: "none", background: "transparent", color: "var(--text-3)", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", opacity: 0.65, display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 22 11 10 10 0 0 0 12 2Z" /><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" /><circle cx="15.5" cy="7" r="1.4" fill="currentColor" stroke="none" /><circle cx="17.5" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>
            Change style
          </button>
        </div>
        <div style={{ height: 20 }} />
        </div>
      </main>

      {confirm && (
        <div onClick={() => setConfirm(null)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(40,55,35,.34)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-pop)", padding: "18px 18px 14px", maxWidth: 320, width: "100%", animation: "briefIn .2s ease" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, color: "var(--text)", lineHeight: 1.25 }}>{confirm.kind === "acct" ? `Go to ${confirm.name}?` : "Open the long-tail accounts?"}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 6 }}>{confirm.kind === "acct" ? "Open this account's detail." : "See the smaller accounts in your list."}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setConfirm(null)} style={dialogBtn(false)}>No</button>
              <button onClick={() => { const c = confirm; setConfirm(null); if (c.kind === "acct" && c.id) router.push(`/account/${c.id}`); else router.push("/book"); }} style={dialogBtn(true)}>Yes</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes briefIn{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:none;}}
        @keyframes riseIn{from{opacity:0;transform:translateY(7px);}to{opacity:1;transform:none;}}
        .riseIn{animation:riseIn .5s cubic-bezier(.22,.61,.36,1) both;}
        .sceneFade{animation:sceneFade .45s ease both;}
        @keyframes sceneFade{from{opacity:0;transform:translateY(4px) scale(.98);}to{opacity:1;transform:none;}}
        .splashIn{animation:splashIn .5s cubic-bezier(.22,.61,.36,1) both;}
        @keyframes splashIn{from{opacity:0;transform:translateY(8px) scale(.97);}to{opacity:1;transform:none;}}
        .splashIn .lm-line{stroke-dasharray:30;stroke-dashoffset:30;animation:lmDraw .66s ease .22s forwards;}
        .splashIn .lm-leaf{opacity:0;transform-box:fill-box;transform-origin:center;animation:lmLeaf .4s cubic-bezier(.34,1.56,.64,1) .82s forwards;}
        @keyframes lmDraw{to{stroke-dashoffset:0;}}
        @keyframes lmLeaf{from{opacity:0;transform:scale(.4);}to{opacity:1;transform:scale(1);}}
        @media (prefers-reduced-motion: reduce){.splashIn .lm-line{stroke-dashoffset:0;animation:none;}.splashIn .lm-leaf{opacity:1;animation:none;}}
        .cl{will-change:transform;animation:floatCloud 50s linear infinite;}
        .cl1{animation-duration:44s;}
        .cl2{animation-duration:62s;animation-delay:-14s;}
        @keyframes floatCloud{from{transform:translateX(-140px);}to{transform:translateX(480px);}}
        .wedgeRo{margin-top:10px;background:var(--surface);border:0.5px solid var(--border);border-radius:12px;padding:9px 11px;font-size:12px;color:var(--text-2);min-height:20px;line-height:1.4;}
        .wedgeRo b{color:var(--text);font-weight:700;}
        .rdot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;}
        .wedgeHint{color:var(--text-3);}
        .tier4row{display:flex;align-items:stretch;margin-top:8px;}
        .t4div{width:1px;background:#e2e4df;align-self:stretch;flex-shrink:0;}
        .t4col{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;padding:2px 5px 0;min-height:152px;}
        .t4circle{position:absolute;left:50%;top:57%;transform:translate(-50%,-50%);border-radius:50%;z-index:0;pointer-events:none;opacity:0.13;}
        .t4btn{position:relative;z-index:1;font-size:11.5px;font-weight:700;white-space:nowrap;margin-bottom:1px;}
        .t4bot{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;width:100%;}
        .t4ros{font-size:13px;font-weight:800;color:var(--text);line-height:1;margin-bottom:3px;font-variant-numeric:tabular-nums;}
        .t4ros span{font-size:8.5px;font-weight:600;color:var(--text-3);}
        .t4tree{display:flex;align-items:flex-end;justify-content:center;min-height:54px;}
        .t4n{font-size:10px;color:var(--text-3);margin-top:3px;}
        .t4desc{font-size:9.5px;color:var(--text-3);margin-top:2px;line-height:1.2;min-height:23px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .orchard{display:flex;gap:2px;overflow-x:auto;padding:5px 2px 2px;-webkit-overflow-scrolling:touch;}
        .orchTree{flex:0 0 auto;width:64px;display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:3px 2px 5px;border-radius:12px;transition:background .12s ease;}
        .orchTree:active{background:rgba(94,146,119,.14);}
        @media (hover:hover){.orchTree:hover{background:rgba(94,146,119,.08);}}
        .orchTop{display:flex;align-items:flex-end;justify-content:center;min-height:60px;}
        .orchName{font-size:10px;font-weight:700;color:var(--text-2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:62px;text-align:center;}
        .orchPct{font-size:9.5px;font-weight:700;margin-top:1px;}
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