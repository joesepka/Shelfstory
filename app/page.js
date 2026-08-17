"use client";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { run, fsum, autoForecast } from "../lib/forecast";
import { useExplode } from "../lib/useExplode";
import TreeGlyph, { tierBucket, TierTree } from "../components/TreeGlyph";
import GreyLoader from "../components/Splash";
import { fluidArt } from "../components/treeArt";
import { useTheme } from "../lib/theme";
import { getScope, setScope, getLabel, setLabel, parseScope, LABELS } from "../lib/scope";
import { withHealth } from "../lib/health";
import { SNAPSHOT, SNAP_LABEL } from "../lib/snapshot";
import ThemeChooser from "../components/ThemeChooser";
import LogoMark from "../components/LogoMark";
import { profile } from "../lib/profile";

const T = {
  bg: "var(--bg)", ink: "var(--text)", muted: "var(--text-3)", line: "var(--border)", primary: "var(--accent)",
  font: "var(--font-sans)",
  serif: "var(--font-serif)",
};
const gpct = (c, p) => p > 0 ? Math.round(100 * (c - p) / p) : null;
// case-volume formatter: <1K -> whole number (134); >=1K -> abbreviated (5.1k / 51k)
const kf = v => { const a = Math.abs(v || 0); if (a < 1000) return String(Math.round(v || 0)); return ((v || 0) / 1000).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "k"; };   // <1k -> whole (439); >=1k -> one decimal (1.2k) — matches desktop
const UP = "#5C9A7B", DOWN = "#C07A72", FLAT = "#A5A092";

// logo + splash palette (green)
const BOOK = "#3F6E4A";   // --accent-deep (book strokes)
const TREND = "#5E9277";  // --accent (climbing line / arrow / dots / progress)

// data-as-of label — comes from lib/snapshot.js (the one file to bump per refresh)
const DATA_UPDATED = SNAP_LABEL;
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

const STNAME = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming" };
const DECLINING = new Set(["decelerating", "at-risk", "atrisk", "at risk", "lapsed"]);
const isDeclining = h => DECLINING.has(String(h || "").toLowerCase().trim());
const isNew = h => String(h || "").toLowerCase().trim() === "new";
const isLapsed = h => String(h || "").toLowerCase().trim() === "lapsed";
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
      <span style={{ fontFamily: "var(--font-logo)", fontSize: 17, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>ShelfStory</span>
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
  const { night } = useTheme();
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
      position: "fixed", inset: 0, background: night ? "linear-gradient(180deg,#0c1830 0%,#0f1c22 40%,var(--bg) 100%)" : "linear-gradient(180deg,#b6dcf1 0%,#cce4f4 24%,#d7e6df 62%,var(--bg) 100%)", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      transition: "opacity .34s ease", opacity: out ? 0 : 1, pointerEvents: out ? "none" : "auto",
    }}>
      <SplashClouds />
      <div className="splashIn" style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <LogoMark size={94} />
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 30, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px", marginTop: 12 }}>ShelfStory</div>
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
      <div style={{ fontSize: 10, letterSpacing: 0.3, color: "var(--text-3)", lineHeight: 1.2, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 2, marginTop: 3 }}>
        <span className="statfloat" style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", lineHeight: 1, letterSpacing: "-0.5px", fontFeatureSettings: '"tnum" 1, "lnum" 1', animationDelay: `${delay}s` }}>{value}</span>
        {unit && <span style={{ fontSize: 9.5, color: "var(--text-3)" }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: c, marginTop: 3 }}>
        {arrow} {pct == null ? "—" : `${Math.abs(pct)}%`}
      </div>
    </div>
  );
}

// smaller stat for the annual row beneath the top bar (current · projected · growth) — centered
function SmallStat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center", minWidth: 76 }}>
      <div style={{ fontSize: 8, letterSpacing: 0.3, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || "var(--text)", marginTop: 2, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.2px" }}>{value}</div>
    </div>
  );
}

function A({ children }) { return <strong style={{ fontWeight: 700, color: "var(--text)" }}>{children}</strong>; }

// facts for the snappy top-of-page summary — the few things worth knowing about
// whatever slide is showing (whole book, or one state).
function buildBrief(rows) {
  if (!rows || !rows.length) return null;
  let cur = 0, prev = 0, actNow = 0, actPrev = 0, newC = 0, lostC = 0, distNow = 0, distPrev = 0;
  for (const r of rows) {
    const c = r.cur90 || 0, p = r.prev90 || 0;
    cur += c; prev += p;
    if (c > 0) actNow++;
    if (p > 0) actPrev++;
    const hl = String(r.headline || "").toLowerCase().trim();
    if (hl === "new") newC++; else if (hl === "lapsed") lostC++;
    distNow += r.live_placements || 0; distPrev += r.live_prev || 0;
  }
  const g = gpct(cur, prev);
  // structural signals worth headlining
  const acctNet = actNow ? Math.round((100 * (newC - lostC)) / actNow) : null;               // net account base change %
  const distPct = distPrev > 0 ? Math.round((100 * (distNow - distPrev)) / distPrev) : null;  // distribution (placements) change %
  const rosNow = actNow ? cur / actNow / 3 : 0, rosPrev = actPrev ? prev / actPrev / 3 : 0;   // ROS = 90D cases ÷ active accts ÷ 3 (per month)
  const rosPct = rosPrev > 0 ? Math.round((100 * (rosNow - rosPrev)) / rosPrev) : null;        // rate-of-sale change %

  // weakest / strongest channel that actually carries weight
  const chAgg = {};
  for (const r of rows) { const ch = r.channel; if (!ch) continue; const e = chAgg[ch] ||= { cur: 0, prev: 0, n: 0 }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; e.n++; }
  const chArr = Object.entries(chAgg).map(([k, e]) => ({ name: titleCase(k), g: gpct(e.cur, e.prev), d: Math.round(e.cur - e.prev), n: e.n, share: prev > 0 ? e.prev / prev : 0 })).filter(x => x.g != null);
  const chDown = chArr.filter(x => x.n >= 3 && x.share >= 0.06 && x.g <= -5).sort((a, b) => a.d - b.d)[0] || null;
  const chUp = chArr.filter(x => x.n >= 3 && x.share >= 0.06 && x.g >= 6).sort((a, b) => b.d - a.d)[0] || null;

  const stAgg = {};
  for (const r of rows) { if (!r.state) continue; const e = stAgg[r.state] ||= { cur: 0, prev: 0, n: 0 }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; e.n++; }
  const stArr = Object.entries(stAgg).map(([k, e]) => ({ k, g: gpct(e.cur, e.prev), d: Math.round(e.cur - e.prev), n: e.n })).filter(x => x.g != null);
  const stUp = stArr.filter(x => x.n >= 3 && x.g >= 4).sort((a, b) => b.d - a.d)[0] || null;
  const stDown = stArr.filter(x => x.n >= 3 && x.g <= -4).sort((a, b) => a.d - b.d)[0] || null;

  const cityAgg = {};
  for (const r of rows) { if (!r.city) continue; const key = `${r.city}|${r.state}`; const e = cityAgg[key] ||= { city: r.city, st: r.state, cur: 0, prev: 0, n: 0 }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; e.n++; }
  const cityArr = Object.values(cityAgg).map(c => ({ ...c, g: gpct(c.cur, c.prev), d: Math.round(c.cur - c.prev) }));
  const cityDown = cityArr.filter(c => c.n >= 2 && c.g != null && c.g <= -8).sort((a, b) => a.d - b.d)[0] || null;

  const chainAtRisk = {};
  for (const r of rows) { if (isDeclining(r.headline) && !isLapsed(r.headline) && r.chain) (chainAtRisk[r.chain] ||= []).push(r); }   // watch-only: lapsed is its own bucket, never an at-risk cluster
  let cluster = null;
  for (const ch in chainAtRisk) { const l = chainAtRisk[ch]; if (l.length >= 4 && (!cluster || l.length > cluster.n)) cluster = { chain: ch, n: l.length }; }

  const quietN = rows.filter(r => (r.cur90 || 0) > 0 && r.gapW != null && r.gapW >= 2 && (r.account_weight || 0) > 0).length;

  // growth of the strongest 20% by size — explains "up but losing accounts" (concentration)
  const sized = rows.filter(r => (r.account_weight || 0) > 0).sort((a, b) => (b.account_weight || 0) - (a.account_weight || 0));
  // cap at what actually exists — a small city can have no accounts with 52-week weight,
  // and Math.max(1, 0) used to index past the end of an empty list
  const topN = Math.min(sized.length, Math.max(1, Math.round(sized.length * 0.2)));
  let topCur = 0, topPrev = 0;
  for (let i = 0; i < topN; i++) { topCur += sized[i].cur90 || 0; topPrev += sized[i].prev90 || 0; }
  const topG = gpct(topCur, topPrev);
  // crude brand-stage read: lots of fresh accounts / expanding shelf = growing; flat & few new = mature
  const newShare = actNow ? newC / actNow : 0;
  const stage = (newShare >= 0.08 || (distPct != null && distPct >= 6)) ? "growing" : (newShare <= 0.03 && (distPct == null || distPct <= 1)) ? "mature" : "balanced";

  return { g, acctNet, newCount: newC, lostCount: lostC, distPct, rosNow: Math.round(rosNow * 10) / 10, rosPct, chDown, chUp, stUp, stDown, cityDown, cluster, quietN, topG, stage };
}

// the snappy 2–3 sentence "need to know" about the card below — trend, one thing to
// watch, one bright spot. Defaults to holding-steady when nothing is running.
function Snappy({ cur }) {
  const b = cur.brief, scope = cur.key === "ALL" ? "Your book" : cur.label, g = cur.curPct;
  const trend = g == null ? "holding steady" : g >= 6 ? `up ${g}%` : g >= -2 ? "holding steady" : g > -8 ? `softening ${Math.abs(g)}%` : `sliding ${Math.abs(g)}%`;
  const trendColor = g == null ? "var(--text-3)" : g >= 6 ? "var(--up)" : g >= -2 ? "var(--accent-deep)" : "var(--gold)";
  const amber = { color: "var(--gold)", fontWeight: 600 }, green = { color: "var(--up)", fontWeight: 600 };

  // tie the story to the trees below — name ONLY the tiers whose pill actually fires, so the
  // brief above and the pills below are a clean 1-to-1 (same tierSignal drives both).
  const tiers = cur.tiers3 || [];
  const losing = tiers.filter(t => tierSignal(t).kind === "losing" && t.lostN > t.newN).sort((a, x) => (x.lostN - x.newN) - (a.lostN - a.newN));
  const gaining = tiers.filter(t => tierSignal(t).kind === "gaining").sort((a, x) => (x.newN - x.lostN) - (a.newN - a.lostN));
  const nameTiers = arr => arr.length === 0 ? null : arr.map(t => t.label.toLowerCase()).reduce((s, x, i, a) => i === 0 ? x : i === a.length - 1 ? `${s} and ${x}` : `${s}, ${x}`, "");
  const lossWhere = nameTiers(losing), gainWhere = nameTiers(gaining);
  const gainPl = gaining.length > 1;
  const stage = b && b.stage;

  // divergence read — volume and account-count moving opposite ways, with the WHY (rate of sale)
  let diverge = null;
  if (b && g != null) {
    if (g >= 3 && b.acctNet != null && b.acctNet <= -3) {
      const strong = b.topG != null && b.topG > 0;
      diverge = <>But it&rsquo;s on a <b style={amber}>shrinking base</b> — you&rsquo;ve net-lost accounts ({b.acctNet}%){lossWhere ? <>, mostly your <b style={amber}>{lossWhere}</b> accounts</> : null} while <b style={green}>rate of sale is up {b.rosPct != null && b.rosPct > 0 ? `${b.rosPct}%` : "sharply"}</b>{strong ? <>, so your strongest are getting stronger (top accounts +{b.topG}%)</> : null}. Fewer, bigger accounts carrying the book — mind the concentration.</>;
    } else if (g <= -3 && b.acctNet != null && b.acctNet >= 3) {
      diverge = <>But you&rsquo;re <b style={amber}>spreading thin</b> — adding accounts (+{b.acctNet}%){gainWhere ? <> in your <b style={amber}>{gainWhere}</b> tier{gainPl ? "s" : ""}</> : null} faster than they sell{b.rosPct != null && b.rosPct < 0 ? <>, so <b style={amber}>rate of sale slipped {Math.abs(b.rosPct)}%</b></> : null}. The new points of distribution need a velocity push.</>;
    }
  }

  // rank the real problems — structural (base / distribution / rate-of-sale / channel) beats geographic.
  // (skip the plain account-loss line when the divergence read already explains it)
  const concerns = [];
  if (b && !diverge) {
    if (b.acctNet != null && b.acctNet <= -3) concerns.push({ sev: Math.abs(b.acctNet) * 1.5 + 12, node: <>You&rsquo;re <b style={amber}>losing accounts — net {b.acctNet}%</b>{lossWhere ? <>, mostly your <b style={amber}>{lossWhere}</b> accounts</> : null} ({b.lostCount} lapsed vs {b.newCount} new); {stage === "mature" ? "expected as the book rationalizes — mind the shelf" : "shore up the base"}.</> });
    if (b.distPct != null && b.distPct <= -2) concerns.push({ sev: Math.abs(b.distPct) * 1.6 + 9, node: <><b style={amber}>Watch your distribution</b> — placements down {Math.abs(b.distPct)}%.</> });
    if (b.rosPct != null && b.rosPct <= -3) concerns.push({ sev: Math.abs(b.rosPct) + 6, node: <>Rate of sale is <b style={amber}>softening — {b.rosNow} cs/acct, off {Math.abs(b.rosPct)}%</b>.</> });
    if (b.chDown) concerns.push({ sev: Math.abs(b.chDown.g) + 4, node: <><b style={amber}>{b.chDown.name}</b> is your soft spot, down {Math.abs(b.chDown.g)}% ({b.chDown.n} accounts).</> });
    if (b.stDown) concerns.push({ sev: Math.abs(b.stDown.g) + 1, node: <>Keep an eye on <b style={amber}>{STNAME[b.stDown.k] || b.stDown.k}</b>, down {Math.abs(b.stDown.g)}%.</> });
    else if (b.cityDown) concerns.push({ sev: Math.abs(b.cityDown.g), node: <>Keep an eye on <b style={amber}>{titleCase(b.cityDown.city)}</b>, down {Math.abs(b.cityDown.g)}%.</> });
    if (b.cluster) concerns.push({ sev: b.cluster.n + 2, node: <>The <b style={amber}>{b.cluster.n} {titleCase(b.cluster.chain)}</b> stores softening together are worth a look.</> });
    else if (b.quietN >= 3) concerns.push({ sev: 3, node: <><b style={amber}>{b.quietN} steady accounts</b> have gone quiet 60+ days.</> });
  }
  concerns.sort((x, y) => y.sev - x.sev);
  const showSecond = concerns[1] && concerns[1].sev >= 9; // only stack a 2nd if it's also structural
  let pos = null;
  if (b && !diverge) {
    if (b.chUp) pos = <><b style={green}>{b.chUp.name}</b> is pulling hard, +{b.chUp.g}%</>;
    else if (b.stUp) pos = <><b style={green}>{STNAME[b.stUp.k] || b.stUp.k}</b> is carrying you, up {b.stUp.g}%</>;
    else if (b.distPct != null && b.distPct >= 3) pos = <>distribution grew <b style={green}>+{b.distPct}%</b></>;
    else if (b.newCount > 0) pos = <><b style={green}>{b.newCount} new account{b.newCount === 1 ? "" : "s"}</b>{gainWhere ? <> in your {gainWhere} tier{gainPl ? "s" : ""}</> : null} just opened</>;
  }
  return (
    <p style={{ position: "relative", margin: 0, paddingLeft: 13, fontFamily: "var(--font-serif)", fontSize: 12.6, lineHeight: 1.38, color: "var(--text-2)", letterSpacing: "0.1px" }}>
      <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 3, bottom: 3, width: 3, borderRadius: 3, background: "linear-gradient(var(--accent), rgba(132,178,104,.15))" }} />
      {scope} is <b style={{ color: trendColor, fontWeight: 600 }}>{trend}</b> over 90 days.{" "}
      {diverge ? diverge
        : <>{concerns.length ? <>{concerns[0].node}{showSecond ? <> {concerns[1].node}</> : null}{" "}</> : <>Nothing urgent on the watch list right now.{" "}</>}{pos && <>Bright spot — {pos}.</>}</>}
    </p>
  );
}

// home nav — big-editorial list. order here is display order; `color` tints the
// arrow, `highlight` gives the row a subtle coral wash (the priority action).
// nav as a 2×2 grid: Accounts + Actions on top, Drill Down + Trends below.
// icon = the exact Fair Skies green line-icon for each destination.
const NAV_OVERVIEW = { href: "/bc", title: "Overview", tab: "Overview", color: "#3F6E4A", sub: "The book at a glance, scoped to your selection.", icon: <><circle cx="12" cy="12" r="8.5" /><path d="M12 12l3.5-3.5" /><path d="M12 3.5v2M20.5 12h-2M12 20.5v-2M3.5 12h2" /></> };
const NAV = [
  { href: "/book", title: "Accounts", tab: "Accounts", color: "#3F6E4A", sub: "Find accounts by area and work your list.", icon: <><path d="M4 9l1.6-4h12.8L20 9" /><path d="M5 9v10h14V9" /><path d="M10 19v-5h4v5" /></> },
  { href: "/actions", title: "Actions", tab: "Actions", color: "#5E9277", sub: "Your highest-priority plays for the day.", highlight: true, icon: <><path d="M6 21V4" /><path d="M6 5h11l-2.2 3L17 11H6" /></> },
  { href: "/perf", title: "Drill Down", tab: "Drill Down", color: "#3D6E93", sub: "Drill territory, channel, chain, or distributor to the biggest distress — and a report.", icon: <><path d="M12 20v-9" /><path d="M12 11L7 6" /><path d="M12 11l5-5" /><circle cx="7" cy="5" r="1.4" fill="#3f6e4a" stroke="none" /><circle cx="17" cy="5" r="1.4" fill="#3f6e4a" stroke="none" /></> },
  { href: "/wholesale", title: "Trends", tab: "Trends", color: "#534AB7", sub: "Depletion and inventory momentum over time.", icon: <><path d="M4 16l5-5 3 3 6-7" /><path d="M15 7h4v4" /></> },
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
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginTop: 5, fontVariantNumeric: "tabular-nums" }}>{kf(q.cases || 0)}</div>
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
// a fluid health tree that can GROW IN: from bare (h=0) to its real health `h`.
// on the home the tier trees fill in (fast + snappy) the moment they scroll into view;
// pass play=false to hold at bare, or animate=false elsewhere to just appear.
function FluidTree({ h, size = 78, play = true, delay = 0 }) {
  const { theme } = useTheme();
  const sfx = useId().replace(/[:]/g, "");
  const target = Math.max(0, Math.min(1, h || 0));
  const [hv, setHv] = useState(0);
  const cur = useRef(0), started = useRef(false);
  useEffect(() => {
    if (!play) { cur.current = target; setHv(target); return; }
    const from = started.current ? cur.current : 0, wait = started.current ? 0 : delay;
    started.current = true;
    let raf, startAt = null; const dur = 500, ease = t => 1 - Math.pow(1 - t, 3);
    const step = now => {
      if (startAt === null) startAt = now + wait;
      if (now < startAt) { raf = requestAnimationFrame(step); return; }
      const t = Math.min(1, (now - startAt) / dur), v = from + (target - from) * ease(t);
      cur.current = v; setHv(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [play, target, delay]);
  const W = Math.round((size * 60) / 62);
  return <svg width={W} height={size} viewBox="0 0 60 62" style={{ display: "block" }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: fluidArt(theme, hv, sfx) }} />;
}

// SINGLE SOURCE OF TRUTH for a tier's account/shelf story. The brief (above) and the
// tier pill (below) BOTH read this, so they can never disagree — `kind` drives the
// brief's wording, `text`/`tone` draw the pill. Change a threshold here and both move.
function tierSignal(t) {
  const n = t.n || 1, net = (t.newN - t.lostN) / n, fortifying = t.distPerPct != null && t.distPerPct >= 4;
  const big = t.label === "Large" || t.label === "Mid";
  // lapsed accounts (darker-red pill) — Large/Mid surface even a SINGLE lapse (losing a big
  // account is the priority); Small waits for a real rate of loss so the pill isn't noisy.
  // Fortifying (each remaining account carries more shelf) can reframe Small, never big/mid.
  // Joe: ONLY call out lapsed when the tier is actually declining in VOLUME — a growing tier
  // that happens to have shed a few accounts shouldn't wave a red flag.
  if ((t.pct != null && t.pct < 0) && (big ? t.lostN >= 1 : (t.lostN >= 3 && net <= -0.03))) return (fortifying && !big)
    ? { kind: "fortifying", tone: "good", text: "fortifying" }
    : { kind: "losing", tone: "bad", text: `▾ ${t.lostN.toLocaleString()} lapsed` };
  // shelf eroding — placements slipping while the accounts mostly hold (the early warning)
  if (t.distPct != null && t.distPct <= -5 && net > -0.03) return { kind: "shelf", tone: "warn", text: `shelf ▾${Math.abs(t.distPct)}%` };
  // new accounts landing
  if (t.newN >= 3 && net >= 0.05) return { kind: "gaining", tone: "good", text: `+${t.newN.toLocaleString()} new` };
  return { kind: null };
}
function tierTag(t) { const s = tierSignal(t); return s.kind ? { text: s.text, tone: s.tone } : null; }

// The landscape stage — fills whatever screen height is left so the whole home is exactly
// one phone screen, no scrolling. Territory trees ride a horizontal CAROUSEL: the active
// tree stands centered on the grass, its neighbors peek in from the edges, and a swipe
// drags the whole row finger-follow, snapping one tree left or right. The sun/moon live
// inside the scene, the health word is a chip up top, and the territory read floats as a
// card on the field. Grass starts halfway up so the card sits on green, not sky.
const BLEED = 20;         // main's horizontal padding, cancelled so the ground is full width
function ScopeTree({ slides, idx, cur, dragDx, dragging, onOpen }) {
  const { night } = useTheme();
  const stRef = useRef(null);
  const [stW, setStW] = useState(392);   // measured stage size drives the carousel geometry
  const [stH, setStH] = useState(430);
  useLayoutEffect(() => {
    const m = () => { if (stRef.current) { setStW(stRef.current.clientWidth || 392); setStH(stRef.current.clientHeight || 430); } };
    m(); window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);
  const CELL = Math.round(stW * 0.55);               // one tree per cell; neighbors peek in ~40px at the edges
  const baseX = Math.round((stW - CELL) / 2) - idx * CELL;
  const size = Math.min(292, Math.round(Math.min(stW * 0.72, stH * 0.58)));
  // the scope's health word — same bands + colors as the desktop status scale
  const vitStatus = v => v >= 0.80 ? ["Surging", "#2f9d63"] : v >= 0.62 ? ["Healthy", "#3f8a5a"] : v >= 0.48 ? ["Steady", "#8a8f98"] : v >= 0.37 ? ["Softening", "#cf8a54"] : v >= 0.26 ? ["Slipping", "#c0783c"] : v >= 0.15 ? ["At Risk", "#c0564e"] : ["Critical", "#a5342b"];
  const [stWord, stColor] = vitStatus(cur.treeVit || 0.5);
  return (
    <div ref={stRef} onClick={onOpen} style={{ position: "relative", cursor: "pointer", flex: 1, minHeight: 240, overflow: "hidden", marginLeft: -BLEED, marginRight: -BLEED, marginTop: 6 }}>
      {/* ground — the grass line sits halfway up so the read card floats on the field */}
      <svg viewBox="0 0 380 268" preserveAspectRatio="none" aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}>
        <defs><linearGradient id="stHill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "#34502f" : "#8fbd72"} stopOpacity={night ? "0.7" : "0.55"} />
          <stop offset="1" stopColor={night ? "#16241a" : "#6f9e5a"} stopOpacity={night ? "0.25" : "0.16"} /></linearGradient></defs>
        <path d="M0 166 Q 190 102 380 166 L380 268 L0 268 Z" fill="url(#stHill)" />
        <path d="M0 166 Q 190 102 380 166" fill="none"
          stroke={night ? "rgba(150,200,140,.4)" : "#eaf3df"} strokeWidth="1.5" opacity="0.8" />
      </svg>
      {/* sun & moon live in the scene */}
      <div aria-hidden="true" style={{ position: "absolute", top: 12, right: 22, width: 54, height: 68, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 8, right: 11, width: 34, height: 34, transition: "transform .8s cubic-bezier(.5,.03,.25,1), opacity .5s ease", transform: night ? "translateY(60px)" : "translateY(0)", opacity: night ? 0 : 1 }}>
          <div style={{ position: "absolute", inset: -7, background: "radial-gradient(circle at 55% 44%, rgba(242,201,120,.5), rgba(242,201,120,.12) 50%, transparent 74%)" }} />
          <div style={{ position: "absolute", inset: 3, borderRadius: "50%", background: "radial-gradient(circle at 38% 34%, #f5d68f, #ecbb61 66%, #e3a842)", boxShadow: "0 0 18px 4px rgba(236,187,97,.32)" }} />
        </div>
        <div style={{ position: "absolute", top: 6, right: 7, width: 40, height: 40, transition: "transform .8s cubic-bezier(.5,.03,.25,1), opacity .5s ease", transform: night ? "translateY(0)" : "translateY(60px)", opacity: night ? 1 : 0 }}>
          <svg viewBox="0 0 44 44" width="40" height="40" style={{ filter: "drop-shadow(0 0 7px rgba(200,208,196,.4))" }}><path d="M29 6 A 16 16 0 1 0 29 38 A 13 16 0 1 1 29 6 Z" fill="#b7bfb2" /></svg>
        </div>
      </div>
      {/* the tree carousel — every territory's tree in a row; a swipe slides the row */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", transform: `translateX(${baseX + dragDx}px)`, transition: dragging ? "none" : "transform .5s cubic-bezier(.22,.61,.36,1)", willChange: "transform" }}>
        {slides.map((s, i) => (
          <div key={s.key} style={{ flex: `0 0 ${CELL}px`, position: "relative" }}>
            <div style={{ position: "absolute", left: "50%", bottom: `calc(50% - ${10 + Math.round(size * 0.14)}px)`, transform: `translateX(-50%) translateY(${i === idx ? 0 : 40}px) scale(${i === idx ? 1 : 0.72})`, transformOrigin: "50% 100%", opacity: i === idx ? 1 : 0.55, filter: i === idx ? "none" : "saturate(.85)", transition: "transform .5s cubic-bezier(.22,.61,.36,1), opacity .5s ease" }}>
              <FluidTree h={s.treeVit} size={size} play={true} delay={90} />
            </div>
          </div>
        ))}
      </div>
      {/* health word chip — top left of the scene */}
      <div key={"st" + cur.key} className="sceneFade" style={{ position: "absolute", top: 12, left: 30, zIndex: 3 }}>
        <span style={{ display: "inline-flex", padding: "4px 11px", borderRadius: 999, background: `${stColor}1f`, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase", color: stColor }}>{stWord}</span>
      </div>
      {/* the territory read — a frosted card floating on the grass */}
      <div key={"tb" + cur.key} className="sceneFade" style={{ position: "absolute", left: 30, right: 30, bottom: 12, zIndex: 3, background: night ? "rgba(16,24,17,.72)" : "rgba(255,255,255,.78)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "0.5px solid var(--border)", borderRadius: 18, boxShadow: "var(--shadow-pop)", padding: "10px 14px 11px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--text-3)", marginBottom: 5 }}>Territory read</div>
        <TerrBlurb cur={cur} />
      </div>
    </div>
  );
}

// the territory read lines — overall trend + the one or two need-to-knows + the bright
// spot, scoped to whatever slide is showing (reads the same brief the pills read)
function TerrBlurb({ cur }) {
  const b = cur.brief || {};
  const g = cur.curPct;
  const scope = cur.key === "ALL" ? "Your book" : cur.label;
  const trend = g == null ? "holding steady" : g >= 6 ? `up ${g}%` : g >= -2 ? "holding steady" : g > -8 ? `softening ${Math.abs(g)}%` : `sliding ${Math.abs(g)}%`;
  const trendColor = g == null ? "var(--text-3)" : g >= 6 ? "var(--up)" : g >= -2 ? "var(--accent-deep)" : "var(--gold)";
  const amber = { color: "var(--gold)", fontWeight: 700 }, green = { color: "var(--up)", fontWeight: 700 };
  const lines = [];
  if (b.acctNet != null && b.acctNet <= -3) lines.push(<span key="a">Losing accounts — net <b style={amber}>{b.acctNet}%</b> ({b.lostCount} lapsed vs {b.newCount} new).</span>);
  else if (b.distPct != null && b.distPct <= -2) lines.push(<span key="d">Placements down <b style={amber}>{Math.abs(b.distPct)}%</b> — watch distribution.</span>);
  else if (b.rosPct != null && b.rosPct <= -3) lines.push(<span key="r">Rate of sale off <b style={amber}>{Math.abs(b.rosPct)}%</b>.</span>);
  else if (b.chDown) lines.push(<span key="c"><b style={amber}>{b.chDown.name}</b> is the soft spot, down {Math.abs(b.chDown.g)}%.</span>);
  if (lines.length < 2 && b.quietN >= 3) lines.push(<span key="q"><b style={amber}>{b.quietN} steady accounts</b> quiet 60+ days.</span>);
  const pos = b.chUp ? <span><b style={green}>{b.chUp.name}</b> pulling +{b.chUp.g}%</span>
    : (b.distPct != null && b.distPct >= 3) ? <span>distribution grew <b style={green}>+{b.distPct}%</b></span>
    : b.newCount > 0 ? <span><b style={green}>{b.newCount} new account{b.newCount === 1 ? "" : "s"}</b> opened</span> : null;
  return (
    <div style={{ fontFamily: "var(--font-serif)", fontSize: 12, lineHeight: 1.45, color: "var(--text-2)", letterSpacing: "0.1px" }}>
      <div><b style={{ color: "var(--text)", fontWeight: 700 }}>{scope}</b> is <b style={{ color: trendColor, fontWeight: 700 }}>{trend}</b> over 90 days.</div>
      {lines.slice(0, 2).map((l, i) => <div key={i} style={{ marginTop: 3 }}>{l}</div>)}
      {pos && <div style={{ marginTop: 3 }}>Bright spot — {pos}.</div>}
      {!lines.length && !pos && <div style={{ marginTop: 3 }}>Nothing urgent on the watch list.</div>}
      <div style={{ marginTop: 7, fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700, color: "var(--accent-deep)", opacity: 0.95 }}>tap the tree for accounts →</div>
    </div>
  );
}

function TierTrees({ tiers, scope }) {
  const router = useRouter();
  const { night } = useTheme();
  const secRef = useRef(null);
  const [play, setPlay] = useState(false);
  // tap a tier → the account list, filtered to that size band within the current scope
  const go = t => router.push("/book?size=" + t.label.toLowerCase() + (scope && scope !== "ALL" ? "&state=" + encodeURIComponent(scope) : ""));
  useEffect(() => {
    const el = secRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setPlay(true); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setPlay(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={secRef} style={{ position: "relative", marginTop: 8 }}>
      {/* the rolling hill with the trees planted ON it (trunks tucked into the grass) */}
      <div style={{ position: "relative", height: 110, overflow: "hidden", borderRadius: "16px 16px 0 0" }}>
        <svg viewBox="0 0 380 120" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}>
          <defs><linearGradient id="ttHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={night ? "#34502f" : "#8fbd72"} stopOpacity={night ? "0.7" : "0.55"} /><stop offset="1" stopColor={night ? "#16241a" : "#6f9e5a"} stopOpacity={night ? "0.25" : "0.16"} /></linearGradient></defs>
          <path d="M0 90 C 70 74, 150 86, 220 80 C 290 74, 340 86, 380 78 L380 120 L0 120 Z" fill="url(#ttHill)" />
          <path d="M0 90 C 70 74, 150 86, 220 80 C 290 74, 340 86, 380 78" fill="none" stroke={night ? "rgba(150,200,140,.4)" : "#eaf3df"} strokeWidth="1.5" opacity="0.8" />
        </svg>
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "0 2px" }}>
          {tiers.map((t, i) => (
            <div key={t.label} onClick={() => go(t)} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", cursor: "pointer" }}>
              <div style={{ textAlign: "center", marginBottom: 3, lineHeight: 1.05 }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: "var(--text-3)", letterSpacing: 0.4 }}>ROS</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{t.ros != null ? t.ros.toFixed(1) : "—"}</div>
                <div style={{ fontSize: 9, marginTop: 1 }}>{deltaTiny(t.rosPct)}</div>
              </div>
              <FluidTree h={t.vit} size={74} play={play} delay={i * 90} />
            </div>
          ))}
        </div>
      </div>
      {/* the soil strip + stats, flush under the hill so it reads as one continuous ground */}
      <div style={{ display: "flex", alignItems: "flex-start", background: night ? "linear-gradient(180deg, rgba(52,80,47,.35), rgba(52,80,47,0))" : "linear-gradient(180deg, rgba(111,158,90,.17), rgba(111,158,90,0))", borderRadius: "0 0 16px 16px", padding: "5px 2px 9px" }}>
        {tiers.map((t, i) => (
          <div key={t.label} onClick={() => go(t)} style={{ flex: 1, minWidth: 0, textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{t.label}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{t.n.toLocaleString()} accts</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums", marginTop: 1 }}>{kf(t.cases)}<span style={{ fontWeight: 500, color: "var(--text-3)", fontSize: 9 }}> cs</span></div>
            <div style={{ fontSize: 10, marginTop: 1 }}>{deltaTiny(t.pct)}</div>
            {(() => { const tg = tierTag(t); return tg ? <div style={{ display: "inline-block", marginTop: 4, fontSize: 8.5, fontWeight: 700, letterSpacing: 0.2, padding: "2px 7px", borderRadius: 9, background: tg.tone === "good" ? "var(--growing-bg)" : tg.tone === "bad" ? "var(--lapsed-bg)" : "var(--watch-bg)", color: tg.tone === "good" ? "var(--accent-deep)" : tg.tone === "bad" ? "#fff" : "var(--gold)" }}>{tg.text}</div> : null; })()}
          </div>
        ))}
      </div>
      {/* full-height dividers between the 3 tiers — from the ROS area down through the stats */}
      <div aria-hidden="true" style={{ position: "absolute", top: 8, bottom: 6, left: "33.33%", transform: "translateX(-50%)", width: 1, background: "var(--border-strong)", opacity: 0.4, zIndex: 3, pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "absolute", top: 8, bottom: 6, left: "66.67%", transform: "translateX(-50%)", width: 1, background: "var(--border-strong)", opacity: 0.4, zIndex: 3, pointerEvents: "none" }} />
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
          ? <span><span className="rdot" style={{ background: COLW[it.state] }} /><b>{it.name}</b> · {kf(it.cur)} cs · 90D · {Math.round(it.cur / 3).toLocaleString()} cs/acct·mo · <span style={{ color: COLW[it.state], fontWeight: 700 }}>{WWORD[it.state]}</span></span>
          : <span><span className="rdot" style={{ background: "var(--soil-dk)" }} /><b>Long tail</b> · {wedge.pool.n.toLocaleString()} accounts · {kf(wedge.pool.cur)} cs · 90D · release to open</span>)
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

// ---- ledger home (Joe's overview-first front door) ----------------------------------
// formatting + style helpers ported from the Overview page so the two screens can't drift
const ACRH = new Set(["IPA", "DIPA", "TIPA", "XPA", "IPL", "NEIPA", "DDH"]);
const styleLabelH = s => String(s || "").split(/\s+/).map(w => (ACRH.has(w.toUpperCase()) || /^\d+MG$/i.test(w)) ? w.toUpperCase() : (w.toLowerCase().charAt(0).toUpperCase() + w.toLowerCase().slice(1))).join(" ");
const pctSH = v => v == null ? "" : `${v > 0 ? "▲" : v < 0 ? "▼" : ""}${Math.abs(Math.round(v * 100))}%`;
const pctCH = v => v == null ? "var(--text-3)" : v > 0.02 ? "var(--up)" : v < -0.02 ? "var(--down)" : "var(--text-3)";
const g90OfH = (c, p) => p > 0 ? (c - p) / p : null;
const treePropsH = (cur, g90) => cur > 0 ? { pct: Math.round((g90 || 0) * 100) } : { headline: "lapsed" };
const HL_W = { "at-risk": ["At Risk", "var(--down)"], "decelerating": ["Softening", "var(--gold)"], "lapsed": ["Lapsed", "#a5342b"], "accelerating": ["Surging", "var(--up)"], "new": ["New", "#5b6bd0"], "stable": ["Stable", "var(--text-3)"] };

function HDlt({ p }) {
  if (p == null) return null;
  const c = p > 0 ? "var(--up)" : p < 0 ? "var(--down)" : "var(--text-3)";
  return <span style={{ fontSize: 9.5, fontWeight: 700, marginLeft: 4, color: c }}>{p > 0 ? "▲" : p < 0 ? "▼" : "▬"} {Math.abs(p)}%</span>;
}
function HTile({ lb, v, pct, sub, tone, onClick }) {
  return (
    <div onClick={onClick} className={onClick ? "tap" : undefined} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "8px 9px", cursor: onClick ? "pointer" : "default", minWidth: 0 }}>
      <div style={{ fontSize: 8.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 700, whiteSpace: "nowrap" }}>{lb}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 600, color: tone || "var(--text)", marginTop: 2, whiteSpace: "nowrap" }}>{v}<HDlt p={pct} /></div>
      {sub && <div style={{ fontSize: 8.5, color: "var(--text-3)", marginTop: 1, whiteSpace: "nowrap" }}>{sub}</div>}
    </div>
  );
}
function SectHead({ t, more, onMore }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "16px 0 7px" }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-3)" }}>{t}</span>
      {more ? <button onClick={onMore} style={{ border: "none", background: "transparent", fontFamily: "inherit", fontSize: 10.5, fontWeight: 700, color: "var(--accent-deep)", cursor: "pointer", padding: 0 }}>{more}</button> : null}
    </div>
  );
}
// The desktop cases+forecast graph, pocket-size: 12 trailing months (grey bars) then the
// 12-month forecast (indigo — grey-blue when it's a directional sub-scope projection, same
// rule the desktop uses below book level), split by a dashed "now" line.
const pctBig = p => p == null ? "—" : `${p > 0 ? "▲" : p < 0 ? "▼" : "▬"}${Math.abs(p)}%`;
const pctTone = p => p == null ? "var(--text-3)" : p > 0 ? "var(--up)" : p < 0 ? "var(--down)" : "var(--text-3)";
// bar ramps: the last 12 months shade darker toward "now", in the color of the trend —
// green rising, gold softening, red sliding, grey steady. Accounts ride the teal ramp
// (the deck palette's teal) so the two charts read apart at a glance — and never forecast-blue.
const RAMP_G = ["#c2d6c6", "#b4cdb9", "#a6c4ac", "#93b89b", "#7fac8a", "#6ca078", "#579266", "#428055", "#35704a"];
const RAMP_Y = ["#ecdcba", "#e6d2a6", "#dfc791", "#d8bc7d", "#d1b169", "#c9a556", "#c09944", "#b68c34", "#ab7f26"];
const RAMP_R = ["#ecd2c9", "#e6c5ba", "#dfb8ab", "#d8aa9c", "#d19c8d", "#c98e7e", "#c07f6f", "#b67060", "#ab6051"];
const RAMP_N = ["#dcdfd9", "#d3d7d0", "#cacfc7", "#c1c7bd", "#b8bfb4", "#aeb6aa", "#a4ada0", "#99a396", "#8e998b"];
const RAMP_A = ["#d3e7ea", "#c2dce1", "#afd0d6", "#9bc3ca", "#87b6be", "#71a8b2", "#5c9aa6", "#458c99", "#2f7d8c"];
const rampAt = (R, i, n) => R[Math.min(R.length - 1, Math.round(i / Math.max(1, n - 1) * (R.length - 1)))];
function TrendGraph({ cases, accts, ros, pct, skey }) {
  const [mode, setMode] = useState(0);        // 0 cases · 1 accounts
  const [fading, setFading] = useState(false);   // tap → old chart fades out, new one grows in
  const mShort = k => { const t = new Date(SNAPSHOT); t.setMonth(t.getMonth() + k); return t.toLocaleString("en-US", { month: "short" }).toUpperCase(); };
  const N = (cases || []).length || 12;
  const total = Math.round((cases || []).reduce((s2, v) => s2 + (v || 0), 0));
  const lastA = (accts || []).length ? accts[accts.length - 1] : 0;
  const lastR = (ros || []).length ? ros[ros.length - 1] : null;
  const ramp0 = pct == null ? RAMP_N : pct >= 5 ? RAMP_G : pct <= -12 ? RAMP_R : pct <= -2 ? RAMP_Y : RAMP_N;
  const bnum = (v, m) => m === 0 ? (v >= 1000 ? kf(v) : String(Math.round(v))) : String(Math.round(v));
  // one chart panel: bars + a number on every bar (+ the desktop's ROS line on accounts)
  const panel = (m, pk) => {
    const vals = m === 0 ? (cases || []) : (accts || []);
    const mx = Math.max(1, ...vals);
    const ramp = m === 0 ? ramp0 : RAMP_A;
    let pts = null;
    if (m === 1 && ros && ros.length) {
      const rmx = Math.max(...ros) * 1.15 || 1, rmn = Math.min(...ros) * 0.85;
      pts = ros.map((x, i) => `${(i / Math.max(1, ros.length - 1) * 100).toFixed(1)},${(37 - ((x - rmn) / ((rmx - rmn) || 1)) * 30).toFixed(1)}`).join(" ");
    }
    return (
      <div key={pk} style={{ width: "100%", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "stretch", gap: 3, height: 96 }}>
          {vals.map((v, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 6.5, fontWeight: 600, color: "var(--text-3)", textAlign: "center", lineHeight: 1, marginBottom: 2, whiteSpace: "nowrap" }}>{bnum(v, m)}</div>
              <div style={{ height: `${Math.max(3, (v / mx) * 82)}%`, borderRadius: "2px 2px 0 0", background: rampAt(ramp, i, vals.length), transformOrigin: "bottom", animation: "barGrow .5s cubic-bezier(.2,.7,.3,1) both", animationDelay: `${i * 0.04}s` }} />
            </div>
          ))}
        </div>
        {pts && (
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ position: "absolute", left: 0, top: 10, width: "100%", height: "calc(100% - 10px)", overflow: "visible", pointerEvents: "none" }}>
            <polyline points={pts} fill="none" stroke="#fff" strokeWidth="4" opacity="0.85" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={pts} fill="none" stroke="#1f6272" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        )}
      </div>
    );
  };
  return (
    <div style={{ marginTop: 10, background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14, padding: "11px 13px 8px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span key={"h" + mode} className="sceneFade" style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".09em", color: "var(--text-3)", fontWeight: 600 }}>{mode === 0 ? "CASES · MONTHLY" : "ACTIVE ACCOUNTS · ROLLING 90"}</span>
        <span key={"v" + mode} className="sceneFade" style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "var(--text-2)", whiteSpace: "nowrap" }}>{mode === 0 ? `${kf(total)} · 12 mo` : <>{lastA.toLocaleString()} now{lastR != null ? <span style={{ color: "#1f6272" }}> · ros {lastR.toFixed(1)}</span> : null}</>}</span>
      </div>
      {/* tap → the whole chart fades out, then the other one mounts and grows in
          fresh (Joe's call: a clean swap, not a slide) */}
      <div className="tap" style={{ overflow: "hidden", marginTop: 8, cursor: "pointer" }}
        onClick={() => { if (fading) return; setFading(true); setTimeout(() => { setMode(m => 1 - m); setFading(false); }, 170); }}>
        <div key={skey + "-" + mode} style={{ opacity: fading ? 0 : 1, transition: "opacity .17s ease" }}>
          {panel(mode, "c")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 6.8, textAlign: "center", color: "var(--text-3)" }}>
        {(cases || []).map((v2, i) => <span key={i} style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>{mShort(i - (N - 1))}</span>)}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
        {[0, 1].map(d2 => <span key={d2} style={{ width: d2 === mode ? 14 : 5, height: 5, borderRadius: 3, background: d2 === mode ? "var(--border-strong)" : "var(--border)", transition: "width .2s" }} />)}
        <span style={{ fontSize: 8.5, fontWeight: 600, color: "var(--text-3)", marginLeft: 4 }}>tap for {mode === 0 ? "accounts" : "cases"}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [phase, setPhase] = useState(booted ? "ready" : "splash"); // splash → ready
  const [pickerOpen, setPickerOpen] = useState(false);
  const [labelPop, setLabelPop] = useState(false);   // the little label pop-up by the bottom switches
  const [rows, setRows] = useState(null);
  const [fcRows, setFcRows] = useState(null);   // fc_base — desktop's forecast source, so annual numbers tie out
  const [monthly, setMonthly] = useState(null);   // account_id -> months[24], for city-level annuals
  const [labelParam, setLabelParam] = useState(() => getLabel());   // resolved BEFORE the first fetch — no all-labels flash (getLabel defaults to BLIND CORNER)
  const [plcMap, setPlcMap] = useState(null);   // account_id -> {now,prev} label-scoped placement counts; null = use whole-account columns
  const plcCache = useRef({});                  // per-label cache so flipping labels doesn't refetch
  const brewery = profile.name === "brewery";
  // while home is mounted, the page's overscroll zone is sky — pulling down past the
  // top shows blue (night: night sky), not a white bar breaking the header illusion
  useEffect(() => { document.documentElement.classList.add("skyTop"); return () => document.documentElement.classList.remove("skyTop"); }, []);
  const [err, setErr] = useState(null);
  const [greet, setGreet] = useState("Welcome");
  const [slide, setSlide] = useState(0);
  const [confirm, setConfirm] = useState(null);
  const drag = useRef({ x: 0, on: false });
  const movedRef = useRef(false);   // a real swipe suppresses the tree's tap-through
  const [dragDx, setDragDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [homeItems, setHomeItems] = useState(null);   // item_grid slice for styles + top SKUs
  const [newItems, setNewItems] = useState(null);     // master additions inside 90 days (new_items table)
  const [toast, setToast] = useState(null);           // "drill coming soon" note
  const [q, setQ] = useState("");                     // find-an-account search text
  const [view, setView] = useState(profile.name === "brewery" ? "grid" : "ledger");   // front door: territory squares, then the ledger
  const [openStyles, setOpenStyles] = useState(false);   // See all = expand in place
  const [openSkus, setOpenSkus] = useState(false);
  const [openChains, setOpenChains] = useState(false);
  const [openAccts, setOpenAccts] = useState(false);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 1900); return () => clearTimeout(t); }, [toast]);
  const { burst, styleFor } = useExplode();
  const { night, setNight } = useTheme();


  useEffect(() => {
    (async () => {
      try {
        let all = [], from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("account_list")
            .select("account_id,account_name,cur90,prev90,state,city,chain,channel,sales_rep,headline,account_weight,prior90_pct,last_order_w,spark,live_placements,live_prev")
            .order("account_weight", { ascending: false })
            .range(from, from + 4999);
          if (error) throw error;
          all = all.concat(data || []);
          if (!data || data.length < 5000) break;
          from += 5000;
        }
        // heal headline + 90-day figures off the monthly windows so every tag on mobile
        // matches the desktop classifier exactly (see lib/health.js)
        const { rows: healed, monthly: mo } = await withHealth(all, labelParam);
        setRows(healed); setMonthly(mo);
      } catch (e) { setErr(e.message || "load failed"); }
    })();
  }, [labelParam]);   // switching label refetches so every number re-scopes

  // Placements under a label: account_list's live_placements/live_prev are whole-account,
  // so when a label is selected count label-only placements from item_grid instead
  // (items with l90>0 now / l90_prev>0 prior, per account). No label -> columns as-is.
  useEffect(() => {
    if (!brewery || !labelParam) { setPlcMap(null); return; }
    if (plcCache.current[labelParam]) { setPlcMap(plcCache.current[labelParam]); return; }
    let dead = false;
    setPlcMap(null);
    (async () => {
      try {
        const m = {};
        let from = 0;
        while (true) {
          const { data, error } = await supabase.from("item_grid")
            .select("account_id,l90,l90_prev").eq("parent", labelParam)
            .range(from, from + 4999);
          if (error) throw error;
          for (const r of (data || [])) {
            const e = m[r.account_id] || (m[r.account_id] = { now: 0, prev: 0 });
            if ((Number(r.l90) || 0) > 0) e.now++;
            if ((Number(r.l90_prev) || 0) > 0) e.prev++;
          }
          if (!data || data.length < 5000) break;
          from += 5000;
        }
        plcCache.current[labelParam] = m;
        if (!dead) setPlcMap(m);
      } catch { /* fall back to whole-account columns */ }
    })();
    return () => { dead = true; };
  }, [labelParam, brewery]);

  // item_grid slice for the ledger home's styles + top SKUs (same select the Overview uses)
  useEffect(() => {
    if (!brewery) return;
    (async () => {
      try {
        let all = [], from = 0;
        while (true) {
          const { data, error } = await supabase.from("item_grid")
            .select("account_id,parent,brand,package,l90,l90_prev,l52,fc_group,is_new_item")
            .range(from, from + 4999);
          if (error) throw error;
          all = all.concat(data || []);
          if (!data || data.length < 5000) break;
          from += 5000;
        }
        setHomeItems(all);
      } catch { /* styles + SKU sections just stay hidden */ }
    })();
  }, [brewery]);

  // brand-new items straight from the pipeline flag (new_items table)
  useEffect(() => {
    if (!brewery) return;
    (async () => { try { const { data, error } = await supabase.from("new_items").select("item_name,brand,package,package_type,parent,style_group,first_seen,has_sales,l90"); if (!error) setNewItems(data || []); } catch { /* rail stays hidden */ } })();
  }, [brewery]);

  // fc_base — the SAME source + engine the desktop forecast uses, so Current/Projected Annual match it exactly
  useEffect(() => { (async () => { try { const { data, error } = await supabase.rpc("fc_base"); if (!error && data) setFcRows(data); } catch {} })(); }, []);

  useEffect(() => { setGreet(greeting()); }, []);

  // swipeable header: the whole book, then each state high→low by 90-day volume.
  // each slide carries its 3 stats, a state-specific brief, and four volume tiers
  // (each ~25% of L52W volume) — top / mid / small / long tail — as health trees.
  const TIER_DEFS = [{ key: "top", label: "Top tier" }, { key: "mid", label: "Mid tier" }, { key: "small", label: "Small tier" }, { key: "tail", label: "Long tail" }];
  // Per-state trailing-52w (Current Annual) + 12-mo forecast (Projected Annual), computed by the
  // DESKTOP's own engine (run) on the SAME fc_base rows — so the mobile ties out to desktop exactly.
  const fcByState = useMemo(() => {
    if (!fcRows || !fcRows.length) return null;
    const { root } = run(fcRows);
    const o = { ALL: { L52: fsum(root.history.slice(12)), fc52: fsum(root.forecast || []) } };
    for (const s of root.children.values()) o[s.state] = { L52: fsum(s.history.slice(12)), fc52: fsum(s.forecast || []) };
    return o;
  }, [fcRows]);
  const slides = useMemo(() => {
    if (!rows || !rows.length) return null;
    const mk = (label, key, list) => {
      let cur = 0, prev = 0, acctNow = 0, acctPrev = 0, newA = 0, lostA = 0;
      for (const r of list) { const c = r.cur90 || 0, p = r.prev90 || 0; cur += c; prev += p; if (c > 0) acctNow++; if (p > 0) acctPrev++; const hl = String(r.headline || "").toLowerCase().trim(); if (hl === "new") newA++; else if (hl === "lapsed") lostA++; }
      const rosNow = acctNow ? cur / acctNow / 3 : 0, rosPrev = acctPrev ? prev / acctPrev / 3 : 0;   // per-account per-MONTH (÷3) — matches desktop's rate-of-sale
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
        return { key: t.key, label: t.label, n: g.length, cur: c, ros: an ? c / an / 3 : 0, pct, vit: sc.vit, color: sc.color, desc: tierDesc(pct, cnt, g.length) };
      });
      const allCnt = { thriving: 0, bearing: 0, wilting: 0, bare: 0, sapling: 0 }, sp = new Array(12).fill(0);
      let distNow = 0, distPrev = 0;
      for (const r of list) { allCnt[tierBucket(r.headline)]++; const pl = plcMap && plcMap[r.account_id]; distNow += plcMap ? (pl ? pl.now : 0) : (r.live_placements || 0); distPrev += plcMap ? (pl ? pl.prev : 0) : (r.live_prev || 0); const s = r.spark; if (Array.isArray(s)) for (let i = 0; i < 12; i++) sp[i] += s[i] || 0; }
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
      // Mid (20–60%), Small (60–80%); ranked by L52W volume. A young account (<12 months
      // of history, inferred from when sales first appear in its 12-point spark) has its
      // volume annualized, so a fast-ramping newcomer isn't under-bucketed by a partial year.
      const effWeight = r => {
        const w = r.account_weight || r.cur90 || 0;
        const s = r.spark;
        if (Array.isArray(s) && s.length === 12) {
          const firstIdx = s.findIndex(v => (v || 0) > 0);        // months since first order ≈ 12 - firstIdx
          if (firstIdx > 0) return w * (12 / Math.max(3, 12 - firstIdx)); // annualize; floor tenure at 3 mo
        }
        return w;
      };
      const bySize = list.filter(r => effWeight(r) > 0).sort((a, b) => effWeight(b) - effWeight(a));
      const NB = bySize.length, c1 = Math.round(NB * 0.2), c2 = Math.round(NB * 0.6), c3 = Math.round(NB * 0.8);
      const tstat = (lbl, rws) => { let c = 0, p = 0, an = 0, ap = 0, newN = 0, lostN = 0, dN = 0, dP = 0; const cn = { thriving: 0, bearing: 0, wilting: 0, bare: 0, sapling: 0 }; for (const r of rws) { const cc = r.cur90 || 0, pp = r.prev90 || 0; c += cc; p += pp; if (cc > 0) an++; if (pp > 0) ap++; dN += r.live_placements || 0; dP += r.live_prev || 0; const hl = String(r.headline || "").toLowerCase().trim(); if (hl === "new") newN++; else if (hl === "lapsed") lostN++; cn[tierBucket(r.headline)]++; } const pc = gpct(c, p), sc = tierScore(pc, cn, rws.length), ros = an ? c / an / 3 : 0, rosPrev = ap ? p / ap / 3 : 0, perNow = an ? dN / an : 0, perPrev = ap ? dP / ap : 0; return { label: lbl, n: rws.length, cases: Math.round(c), pct: pc, vit: sc.vit, color: sc.color, ros, rosPct: rosPrev > 0 ? Math.round((100 * (ros - rosPrev)) / rosPrev) : null, newN, lostN, distPct: dP > 0 ? Math.round((100 * (dN - dP)) / dP) : null, distPerPct: perPrev > 0 ? Math.round((100 * (perNow - perPrev)) / perPrev) : null }; };
      const tiers3 = [tstat("Large", bySize.slice(0, c1)), tstat("Mid", bySize.slice(c1, c2)), tstat("Small", bySize.slice(c2, c3))];
      // fc_base only carries state-level nodes, so a city gets the same deterministic
      // projection the desktop uses below state level — annuals appear on every slide
      let fc = fcByState ? fcByState[key] : null;
      if (!fc && brewery && monthly) {
        const h = new Array(24).fill(0);
        for (const r of list) { const m = monthly[r.account_id]; if (!m) continue; for (let i = 0; i < 24; i++) h[i] += m[i] || 0; }
        if (h.some(v => v > 0)) fc = { L52: fsum(h.slice(12)), fc52: fsum(autoForecast(h)) };
      }
      const l52w = fc ? Math.round(fc.L52) : null, proj52w = fc ? Math.round(fc.fc52) : null, projPct = (fc && l52w > 0) ? Math.round((proj52w - l52w) / l52w * 100) : null;   // Current/Projected Annual straight from the desktop engine (ties out exactly)
      return { label, key, cur, curPct, acctNow, acctPct: acctPrev > 0 ? Math.round((100 * (acctNow - acctPrev)) / acctPrev) : null, /* vs prior 90 = active-now vs active-prior (desktop convention) */ rosNow, rosPct: rosPrev > 0 ? Math.round((100 * (rosNow - rosPrev)) / rosPrev) : null, n: list.length, brief: buildBrief(list), tiers, treeVit: stSc.vit, treeColor: stSc.color, quarters, windows, tiers3, distNow, distPrev, distPct: gpct(distNow, distPrev), l52w, proj52w, projPct };
    };
    // Brewery world swipes by TERRITORY — the Sales_Rep grouping, exactly how the desktop's
    // front door slices the book. All Territories first, then each rep's book high→low
    // (Unassigned last, whatever its size). Each slide shows ONE tree for that territory.
    if (brewery) {
      const byRep = {};
      for (const r of rows) { const rp = r.sales_rep || "Unassigned"; (byRep[rp] || (byRep[rp] = [])).push(r); }
      const reps = Object.keys(byRep)
        .map(rp => mk(titleCase(rp), "REP:" + rp, byRep[rp]))
        .sort((a, b) => ((a.label === "Unassigned") - (b.label === "Unassigned")) || b.cur - a.cur);
      return [mk("All Territories", "ALL", rows), ...reps];
    }
    const byState = {};
    for (const r of rows) { if (!r.state) continue; (byState[r.state] || (byState[r.state] = [])).push(r); }
    const states = Object.keys(byState).map(st => mk(STNAME[st] || st, st, byState[st])).sort((a, b) => b.cur - a.cur);
    return [mk("All accounts", "ALL", rows), ...states];
  }, [rows, fcByState, brewery, monthly, plcMap]);
  // top chains across the whole book — for the chain orchard (tap → that chain's report)
  const chains = useMemo(() => {
    if (!rows) return null;
    const m = {};
    for (const r of rows) { const ch = r.chain; if (!ch) continue; const e = m[ch] || (m[ch] = { chain: ch, cur: 0, prev: 0, n: 0, cnt: { thriving: 0, bearing: 0, wilting: 0, bare: 0, sapling: 0 } }); e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; e.n++; e.cnt[tierBucket(r.headline)]++; }
    return Object.values(m).filter(e => e.n >= 3).map(e => { const pct = gpct(e.cur, e.prev), sc = tierScore(pct, e.cnt, e.n); return { chain: e.chain, cur: e.cur, pct, n: e.n, vit: sc.vit, color: sc.color }; }).sort((a, b) => b.cur - a.cur).slice(0, 8);
  }, [rows]);
  const cur = slides ? slides[Math.min(slide, slides.length - 1)] : null;
  // biggest slide's volume — the scale every scope tree is sized against
  const maxSlideCur = useMemo(() => (slides ? Math.max(...slides.map(s => s.cur || 0), 1) : 1), [slides]);

  // fc_group -> style group, carried on fc_base rows (the Overview's own trick)
  const styleOf = useMemo(() => { const m = {}; if (fcRows) for (const r of fcRows) if (r.product_key && m[r.product_key] == null) m[r.product_key] = r.style_group || "—"; return m; }, [fcRows]);
  // ---- ledger-home scoped reads: everything below re-slices to the selected chip ----
  const scopeIds = useMemo(() => {
    if (!rows || !cur || cur.key === "ALL") return null;             // null = whole book
    const rep = cur.key.slice(4);
    const ids = new Set();
    for (const r of rows) if ((r.sales_rep || "Unassigned") === rep) ids.add(r.account_id);
    return ids;
  }, [rows, cur]);
  // cases + forecast for the chip — real engine numbers for the whole book (ties out to the
  // Overview tab), and the desktop's deterministic DIRECTIONAL projection below book level
  // (fc_base carries no account_id, so territories can't run the real engine)
  const fcScope = useMemo(() => {
    if (!brewery || !cur) return null;
    if (cur.key === "ALL") {
      if (!fcRows || !fcRows.length) return null;
      try {
        const rf = labelParam ? fcRows.filter(r => r.parent === labelParam) : fcRows;
        if (!rf.length) return null;
        const { root } = run(rf);
        const H = root.history || [], fc = (root.forecast || []).slice(0, 12);
        return { hist: H.slice(12), fc3: fc.slice(0, 3), L52: Math.round(fsum(H.slice(12))), fc52: Math.round(fsum(fc)), sim: false };
      } catch { return null; }
    }
    if (!monthly || !scopeIds) return null;
    const h = new Array(24).fill(0);
    for (const id of scopeIds) { const m = monthly[id]; if (!m) continue; for (let i = 0; i < 24; i++) h[i] += m[i] || 0; }
    if (!h.some(v => v > 0)) return null;
    const fc = autoForecast(h);
    return { hist: h.slice(12), fc3: fc.slice(0, 3), L52: Math.round(fsum(h.slice(12))), fc52: Math.round(fsum(fc)), sim: true };
  }, [brewery, cur, fcRows, labelParam, monthly, scopeIds]);
  // rolling-90 ACTIVE ACCOUNTS by month (last 12) — the graph's second chart
  const acctSeries = useMemo(() => {
    if (!brewery || !rows || !monthly) return null;
    const ids = scopeIds ? [...scopeIds] : rows.map(r => r.account_id);
    const accts = [], ros = [];
    for (let k = 12; k < 24; k++) {
      let n = 0, c = 0;
      for (const id of ids) { const m = monthly[id]; if (!m) continue; const r90 = (m[k] || 0) + (m[k - 1] || 0) + (m[k - 2] || 0); if (r90 > 0) { n++; c += r90; } }
      accts.push(n); ros.push(n > 0 ? c / n / 3 : 0);
    }
    return { accts, ros };
  }, [brewery, rows, monthly, scopeIds]);
  // the Accounts rail: watch first, then lapsed, then surging, then the rest — so the top
  // three are always the most call-worthy names whatever the mix (Joe's ordering)
  const watchRows = useMemo(() => {
    if (!rows || !cur) return null;
    const list = cur.key === "ALL" ? rows : rows.filter(r => (r.sales_rep || "Unassigned") === cur.key.slice(4));
    const pri = h => (h === "decelerating" || h === "at-risk") ? 0 : h === "lapsed" ? 1 : h === "accelerating" ? 2 : 3;
    return list.slice().sort((a2, b2) => {
      const ha = String(a2.headline || "").toLowerCase().trim(), hb = String(b2.headline || "").toLowerCase().trim();
      return (pri(ha) - pri(hb)) || ((b2.account_weight || 0) - (a2.account_weight || 0));
    });
  }, [rows, cur]);
  // scoped headcounts for the book buttons
  const bookCounts = useMemo(() => {
    if (!rows || !cur) return null;
    const list = cur.key === "ALL" ? rows : rows.filter(r => (r.sales_rep || "Unassigned") === cur.key.slice(4));
    let lapsed = 0, surging = 0;
    for (const r of list) { const h = String(r.headline || "").toLowerCase().trim(); if (h === "lapsed") lapsed++; else if (h === "accelerating") surging++; }
    return { total: list.length, lapsed, surging };
  }, [rows, cur]);
  // top chains in scope — the Chains rail
  const homeChains = useMemo(() => {
    if (!rows || !cur) return null;
    const list = cur.key === "ALL" ? rows : rows.filter(r => (r.sales_rep || "Unassigned") === cur.key.slice(4));
    const g = {};
    for (const r of list) { const ch = r.chain; if (!ch) continue; const e = g[ch] || (g[ch] = { ch, cur: 0, prev: 0, wt: 0, n: 0, nP: 0 }); e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; e.wt += r.account_weight || 0; if ((r.cur90 || 0) > 0) e.n++; if ((r.prev90 || 0) > 0) e.nP++; }
    return Object.values(g).filter(e => e.n >= 2).sort((a2, b2) => b2.wt - a2.wt).map(e => ({ ...e, pct: gpct(e.cur, e.prev) }));
  }, [rows, cur]);
  const inHome = it => (!scopeIds || scopeIds.has(it.account_id)) && (!labelParam || it.parent === labelParam);
  const homeStyles = useMemo(() => {
    if (!homeItems) return null;
    const g = {};
    for (const it of homeItems) { if (!inHome(it)) continue; const sg = styleOf[it.fc_group] || "—"; const e = g[sg] || (g[sg] = { sg, cur: 0, prev: 0, wt: 0, plc: 0, plcP: 0, accts: new Set() }); e.cur += +it.l90 || 0; e.prev += +it.l90_prev || 0; e.wt += +it.l52 || 0; if ((+it.l90 || 0) > 0) { e.plc++; e.accts.add(it.account_id); } if ((+it.l90_prev || 0) > 0) e.plcP++; }
    return Object.values(g).map(e => ({ ...e, n: e.accts.size, g90: g90OfH(e.cur, e.prev) })).filter(x => x.wt > 0).sort((a2, b2) => b2.wt - a2.wt);
  }, [homeItems, scopeIds, labelParam, styleOf]);   // eslint-disable-line
  const homeSkus = useMemo(() => {
    if (!homeItems) return null;
    const g = {};
    for (const it of homeItems) { if (!inHome(it)) continue; const k = (it.brand || "—") + "||" + (it.package || ""); const e = g[k] || (g[k] = { brand: it.brand || "—", pack: it.package || "", cur: 0, prev: 0, wt: 0, accts: new Set(), acctsP: new Set() }); e.cur += +it.l90 || 0; e.prev += +it.l90_prev || 0; e.wt += +it.l52 || 0; if (it.is_new_item) e.isNew = true; if ((+it.l90 || 0) > 0) e.accts.add(it.account_id); if ((+it.l90_prev || 0) > 0) e.acctsP.add(it.account_id); }
    return Object.values(g).map(e => ({ ...e, n: e.accts.size, nP: e.acctsP.size, g90: g90OfH(e.cur, e.prev) })).filter(x => x.wt > 0).sort((a2, b2) => b2.wt - a2.wt);
  }, [homeItems, scopeIds, labelParam]);   // eslint-disable-line
  const homeCities = useMemo(() => {
    if (!rows || !cur) return null;
    const list = cur.key === "ALL" ? rows : rows.filter(r => (r.sales_rep || "Unassigned") === cur.key.slice(4));
    const g = {};
    for (const r of list) { const c = r.city || "—"; const e = g[c] || (g[c] = { city: c, cur: 0, prev: 0, wt: 0, n: 0 }); e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; e.wt += r.account_weight || 0; if ((r.cur90 || 0) > 0) e.n++; }
    return Object.values(g).filter(e => e.wt > 0).sort((a2, b2) => b2.wt - a2.wt).slice(0, 6).map(e => ({ ...e, pct: gpct(e.cur, e.prev) }));
  }, [rows, cur]);
  // find-an-account: whole book, any scope — name, city or chain, biggest first
  const found = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!rows || t.length < 2) return null;
    return rows.filter(r => String(r.account_name || "").toLowerCase().includes(t) || String(r.city || "").toLowerCase().includes(t) || String(r.chain || "").toLowerCase().includes(t)).slice(0, 8);
  }, [rows, q]);

  // coming back from a drill or account card: reopen the ledger on the remembered
  // territory. The ‹ Territories button is what clears the slate now.
  useEffect(() => {
    if (!brewery || !slides) return;
    // ...but ONLY inside the same session. The territory is remembered in localStorage,
    // so without this a cold open of the app landed in whatever book you were last in
    // instead of the front door (Joe, 2026-08-16).
    let warm = false;
    try { warm = sessionStorage.getItem("ssWarm") === "1"; sessionStorage.setItem("ssWarm", "1"); } catch { }
    if (!warm) return;
    const sc = parseScope();
    if (sc.kind === "rep") { const i = slides.findIndex(sl => sl.key === "REP:" + sc.value); if (i >= 0) { setSlide(i); setView("ledger"); } }
  }, [slides]);   // eslint-disable-line

  function navTo(href) {
    burst(href, () => router.push(href)); // explode the cards, then navigate
  }
  function pick(i) { if (!slides) return; setSlide(i); setScope(slides[i].key === "ALL" ? "" : slides[i].key); }
  // Finger-follow drag: the tree carousel tracks the finger with a little rubber-band,
  // then snaps one tree left/right if dragged past the threshold (no wrap at the ends).
  function onDown(e) { if (!slides || slides.length < 2) return; drag.current = { x: e.clientX, on: true }; movedRef.current = false; setDragging(true); }
  function onMove(e) { if (!drag.current.on) return; let d = e.clientX - drag.current.x; if (Math.abs(d) > 8) movedRef.current = true; if (Math.abs(d) > 90) d = (d > 0 ? 1 : -1) * (90 + (Math.abs(d) - 90) * 0.35); setDragDx(d); }
  function onUp() { if (!drag.current.on) return; drag.current.on = false; setDragging(false); const d = dragDx; if (slides) { if (d < -48 && slide < slides.length - 1) pick(slide + 1); else if (d > 48 && slide > 0) pick(slide - 1); } setDragDx(0); }

  // one search block, used by both screens (sticky on the front door, in-flow on the ledger)
  const searchInner = cur ? (
    <>
      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border-strong)", borderRadius: 13, padding: "7px 12px", display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></svg>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find an account — name, city, chain…" style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 12.5, color: "var(--text)", padding: 0 }} />
        {q ? <button onClick={() => setQ("")} aria-label="Clear search" style={{ border: "none", background: "transparent", color: "var(--text-3)", cursor: "pointer", fontSize: 13, padding: 0, fontFamily: "inherit", lineHeight: 1 }}>✕</button> : null}
      </div>
      {found && (
        <div style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, background: "var(--surface)", border: "0.5px solid var(--border-strong)", borderRadius: 13, boxShadow: "var(--shadow-pop)", overflow: "hidden" }}>
          {found.length === 0 && <div style={{ padding: "11px 14px", fontSize: 12, color: "var(--text-3)" }}>No accounts match “{q.trim()}”.</div>}
          {found.map((r, i) => (
            <div key={r.account_id} className="tap" onClick={() => { setQ(""); router.push("/account/" + encodeURIComponent(r.account_id)); }} style={{ padding: "9px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", borderTop: i === 0 ? "none" : "0.5px solid var(--border)" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.account_name}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{titleCase(r.city)}{r.chain ? ` · ${titleCase(r.chain).replace(/'(\w)/g, (m2, x2) => "'" + x2.toLowerCase())}` : ""}</div>
              </div>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", whiteSpace: "nowrap" }}>{kf(r.cur90 || 0)}<span style={{ fontSize: 8.5, color: "var(--text-3)" }}> cs/90d</span></span>
              <span style={{ color: "var(--border-strong)", fontSize: 14 }}>›</span>
            </div>
          ))}
        </div>
      )}
    </>
  ) : null;

  return (
    <>
      {phase === "splash" && <Splash ready={!!slides || !!err} onDone={() => { booted = true; setPhase("ready"); }} />}
      {/* returning to home in-session skips the sky splash — show the grey loading logo
          until the book is ready so the page reveals fully-formed, not piecemeal */}
      {phase === "ready" && !slides && !err && <GreyLoader />}
      {pickerOpen && <ThemeChooser onChoose={() => setPickerOpen(false)} onClose={() => setPickerOpen(false)} />}

      {/* Flat ledger ground — a happier white by day, the theme's dark by night */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "#fdfdfb" }} />
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "#0f1713", opacity: night ? 1 : 0, transition: "opacity .8s ease" }} />

      <main className="pagefade" style={{ position: "relative", minHeight: "100vh", padding: "10px 20px 26px", fontFamily: "var(--font-sans)", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ position: "relative", zIndex: 1 }}>
        {/* the sky header — frozen over both views, a little blue like the splash */}
        <div style={{ position: "sticky", top: 0, zIndex: 45, margin: "0 -20px", padding: "5px 20px 15px", background: night ? "linear-gradient(180deg, #101a24 0%, rgba(16,26,36,0.94) 62%, rgba(15,23,19,0) 100%)" : "linear-gradient(180deg, #cbe5f5 0%, #d9ecf7 50%, rgba(233,244,251,0.9) 76%, rgba(253,253,251,0) 100%)" }}>
          {/* bleed: solid sky extending well above the header, so any gap that opens at
              the top during a hard pull-down shows sky — never a white break */}
          <div aria-hidden="true" style={{ position: "absolute", left: -4, right: -4, top: -160, height: 160, background: night ? "#101a24" : "#cbe5f5", pointerEvents: "none" }} />
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
            <svg className="cl" viewBox="0 0 320 110" style={{ position: "absolute", top: 4, left: -26, width: 104, opacity: night ? 0.08 : 0.75 }}><path d={CLOUD_PATH} fill={night ? "#9fb0c4" : "#ffffff"} /></svg>
            <svg className="cl cl2" viewBox="0 0 320 110" style={{ position: "absolute", top: 22, right: -14, width: 76, opacity: night ? 0.06 : 0.55 }}><path d={CLOUD_PATH} fill={night ? "#9fb0c4" : "#ffffff"} /></svg>
          </div>
          <div className="riseIn" style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, height: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <div style={{ minWidth: 0, lineHeight: 1.18 }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}>Updated {DATA_UPDATED}{brewery ? ` · ${labelParam === "" ? "All labels" : labelParam === "TORCH" ? "Torch" : "Blind Corner"}` : ""}</div>
              </div>
            </div>
            <div style={{ flexShrink: 0 }}><HeaderLogo /></div>
          </div>
          {brewery && cur && (
            <>
              <div style={{ position: "relative", zIndex: 30, marginTop: 6 }}>{searchInner}</div>
              <button onClick={() => { if (view === "ledger" && cur.key !== "ALL") setScope(cur.key); else setScope(""); router.push("/book"); }} style={{ position: "relative", zIndex: 1, marginTop: 5, width: "100%", border: "0.5px solid var(--border-strong)", background: "var(--surface)", borderRadius: 13, padding: "7px 0", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--text-2)", cursor: "pointer" }}>Go to accounts</button>
            </>
          )}
        </div>

        {/* FRONT DOOR — sticky account search over the territory tree squares */}
        {brewery && cur && view === "grid" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              {slides.map((sl, i) => sl.key === "ALL" ? (
                <button key={sl.key} onClick={() => { pick(i); setView("ledger"); }} className="riseIn tap" style={{ gridColumn: "1 / -1", border: "1.5px solid var(--border-strong)", background: "var(--surface)", borderRadius: 16, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
                  <span style={{ flexShrink: 0, display: "flex" }}><TreeGlyph {...(sl.cur > 0 ? { pct: sl.curPct == null ? 0 : sl.curPct } : { headline: "lapsed" })} h={58} /></span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--text)", lineHeight: 1.1 }}>All Territories</span>
                    <span style={{ display: "block", fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{sl.acctNow.toLocaleString()} account{sl.acctNow === 1 ? "" : "s"} · the whole book</span>
                  </span>
                  <span style={{ marginLeft: "auto", flexShrink: 0, textAlign: "right" }}>
                    <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{kf(sl.cur)}</span>
                    <span style={{ display: "block", fontSize: 10.5, fontWeight: 700, marginTop: 1, color: sl.curPct == null ? "var(--text-3)" : sl.curPct > 0 ? "var(--up)" : sl.curPct < 0 ? "var(--down)" : "var(--text-3)" }}>{sl.curPct == null ? "" : `${sl.curPct > 0 ? "▲" : sl.curPct < 0 ? "▼" : "▬"} ${Math.abs(sl.curPct)}%`}</span>
                  </span>
                  <span style={{ color: "var(--border-strong)", fontSize: 15, flexShrink: 0 }}>›</span>
                </button>
              ) : (
                <button key={sl.key} onClick={() => { pick(i); setView("ledger"); }} className="riseIn tap" style={{ border: "0.5px solid var(--border)", background: "var(--surface)", borderRadius: 16, padding: "16px 8px 13px", cursor: "pointer", fontFamily: "inherit", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, animationDelay: `${Math.min(i, 10) * 0.05}s` }}>
                  <TreeGlyph {...(sl.cur > 0 ? { pct: sl.curPct == null ? 0 : sl.curPct } : { headline: "lapsed" })} h={92} />
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", lineHeight: 1.15, marginTop: 2 }}>{sl.label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{kf(sl.cur)} <span style={{ fontSize: 10, color: sl.curPct == null ? "var(--text-3)" : sl.curPct > 0 ? "var(--up)" : sl.curPct < 0 ? "var(--down)" : "var(--text-3)" }}>{sl.curPct == null ? "" : `${sl.curPct > 0 ? "▲" : sl.curPct < 0 ? "▼" : "▬"}${Math.abs(sl.curPct)}%`}</span></div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: -2 }}>{sl.acctNow.toLocaleString()} account{sl.acctNow === 1 ? "" : "s"}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* the scope you’re viewing — centered + prominent */}
        {cur && view === "ledger" && (
          <div className="riseIn" style={{ marginTop: 6 }}>
            {brewery && (
              <button onClick={() => { setScope(""); setSlide(0); setView("grid"); }} style={{ border: "none", background: "transparent", padding: "0 0 5px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: "var(--text-3)", cursor: "pointer" }}>‹ Territories</button>
            )}
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 27, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.4px", lineHeight: 1.05 }}>Your book{cur.key !== "ALL" ? <span style={{ fontSize: 20, fontWeight: 600, color: "var(--text-2)" }}> · {cur.label}</span> : null}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
              <HTile lb="Annual" v={fcScope ? kf(fcScope.L52) : "—"} sub="run rate · 52 wks" />
              <HTile lb="Proj 52w" v={fcScope ? kf(fcScope.fc52) : "—"} tone="#5b6bd0" sub={fcScope && fcScope.L52 > 0 ? `${fcScope.fc52 >= fcScope.L52 ? "▲" : "▼"} ${Math.abs(Math.round((fcScope.fc52 - fcScope.L52) / fcScope.L52 * 100))}%${fcScope.sim ? " est" : " vs 52w"}` : "next 12 mo"} />
            </div>
          </div>
        )}

        {/* the four trends, one row — no absolutes, just direction */}
        {cur && view === "ledger" && (
          <div key={"tl" + cur.key} className="sceneFade" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 10 }}>
            <HTile lb="90D Trend" v={pctBig(cur.curPct)} tone={pctTone(cur.curPct)} sub="vs prev 90D" />
            <HTile lb="Accounts" v={pctBig(cur.acctPct)} tone={pctTone(cur.acctPct)} sub="vs prev 90D" />
            <HTile lb="Placements" v={pctBig(cur.distPct)} tone={pctTone(cur.distPct)} sub="vs prev 90D" />
            <HTile lb="ROS" v={pctBig(cur.rosPct)} tone={pctTone(cur.rosPct)} sub="vs prev 90D" />
          </div>
        )}

        {/* the trend graph — last 12 months, shaded by trend; swipe for rolling-90 accounts */}
        {view === "ledger" && fcScope && <TrendGraph cases={fcScope.hist} accts={acctSeries ? acctSeries.accts : null} ros={acctSeries ? acctSeries.ros : null} pct={cur ? cur.curPct : null} skey={cur ? cur.key : "ALL"} />}

        {/* accounts — watch first, then lapsed / surging / the rest; See all opens the book */}
        {view === "ledger" && cur && watchRows && watchRows.length > 0 && (
          <>
            <SectHead t="Accounts" more={openAccts ? "Show less ↑" : "See all ↓"} onMore={() => setOpenAccts(o => !o)} />
            {bookCounts && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
                {[
                  ["Watch", "watch", watchRows.filter(r2 => { const h2 = String(r2.headline || "").toLowerCase().trim(); return h2 === "decelerating" || h2 === "at-risk"; }).length, "#8a5a20", "rgba(176,127,54,.08)", "rgba(176,127,54,.3)"],
                  ["Lapsed", "lapsed", bookCounts.lapsed, "#a05242", "rgba(176,87,58,.07)", "rgba(176,87,58,.3)"],
                  ["Surging", "surging", bookCounts.surging, "var(--up)", "rgba(47,125,82,.07)", "rgba(47,125,82,.3)"],
                  ["All accounts", "", bookCounts.total, "var(--text-2)", "var(--surface)", "var(--border-strong)"],
                ].map(([lb2, hp, n2, fg, bg2, bd]) => (
                  <button key={lb2} className="tapd" onClick={() => { setScope(cur.key === "ALL" ? "" : cur.key); router.push("/book" + (hp ? "?health=" + hp : "")); }} style={{ border: `0.5px solid ${bd}`, background: bg2, borderRadius: 13, padding: "8px 2px 7px", fontFamily: "inherit", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: fg, whiteSpace: "nowrap" }}>{lb2}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: fg }}>{Number(n2).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
            {openAccts && <div className="rowIn" style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase", color: "#9c7420", margin: "0 2px 6px" }}>Watch list · slowing or at-risk</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(openAccts ? watchRows.filter(r2 => { const h2 = String(r2.headline || "").toLowerCase().trim(); return h2 === "decelerating" || h2 === "at-risk"; }) : watchRows.slice(0, 3)).map((r, i2) => { const h = String(r.headline || "").toLowerCase().trim(); const cPct = (r.prev90 || 0) > 0 ? Math.round(100 * ((r.cur90 || 0) - r.prev90) / r.prev90) : null; const plcN = plcMap ? ((plcMap[r.account_id] || {}).now || 0) : (r.live_placements || 0); const plcPv = plcMap ? ((plcMap[r.account_id] || {}).prev || 0) : (r.live_prev || 0); const pd = plcN - plcPv; return (
                <div key={r.account_id} className="tap rowIn" onClick={() => router.push("/account/" + encodeURIComponent(r.account_id))} style={{ animationDelay: `${Math.min(i2 * 18, 240)}ms`, background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "7px 12px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                  <span style={{ flexShrink: 0, display: "flex" }}><TreeGlyph headline={r.headline} h={30} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.account_name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{titleCase(r.city)} · <span style={{ color: (HL_W[h] || HL_W.stable)[1], fontWeight: 700 }}>{(HL_W[h] || HL_W.stable)[0]}</span></div>
                  </div>
                  <div style={{ marginLeft: "auto", flexShrink: 0, display: "grid", gridTemplateColumns: "54px 42px", columnGap: 4, rowGap: 1, alignItems: "baseline" }}>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{kf(r.cur90 || 0)}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: pctTone(cPct) }}>{pctBig(cPct)}</span>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>{plcN.toLocaleString()} sku{plcN === 1 ? "" : "s"}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: pd > 0 ? "var(--up)" : pd < 0 ? "var(--down)" : "var(--text-3)" }}>{pd > 0 ? `▲${pd}` : pd < 0 ? `▼${Math.abs(pd)}` : "▬0"}</span>
                  </div>
                  <span style={{ color: "var(--border-strong)", fontSize: 14 }}>›</span>
                </div>
              ); })}
            </div>
          </>
        )}

        {/* (the four book doors now live at the top of the Accounts section, Watch first) */}

        {/* styles — top three; cases + placements, numbers on a fixed grid */}
        {view === "ledger" && brewery && cur && homeStyles && homeStyles.length > 0 && (
          <>
            <SectHead t={`${cur.key === "ALL" ? "Book" : cur.label} · Styles`} more={openStyles ? "Show less ↑" : "See all ↓"} onMore={() => setOpenStyles(o => !o)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(openStyles ? homeStyles : homeStyles.slice(0, 3)).map((st2, i2) => { const pd = (st2.plc || 0) - (st2.plcP || 0); return (
                <div key={st2.sg} className="tap rowIn" onClick={() => router.push("/drill?type=style&k=" + encodeURIComponent(st2.sg))} style={{ animationDelay: `${Math.min(i2 * 18, 240)}ms`, background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "7px 12px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                  <span style={{ flexShrink: 0, display: "flex" }}><TreeGlyph {...treePropsH(st2.cur, st2.g90)} h={30} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{styleLabelH(st2.sg)}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{st2.n.toLocaleString()} account{st2.n === 1 ? "" : "s"}</div>
                  </div>
                  <div style={{ marginLeft: "auto", flexShrink: 0, display: "grid", gridTemplateColumns: "54px 42px", columnGap: 4, rowGap: 1, alignItems: "baseline" }}>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{kf(st2.cur)}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: pctCH(st2.g90) }}>{pctSH(st2.g90)}</span>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>{(st2.plc || 0).toLocaleString()} plc</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: pd > 0 ? "var(--up)" : pd < 0 ? "var(--down)" : "var(--text-3)" }}>{pd > 0 ? `▲${pd}` : pd < 0 ? `▼${Math.abs(pd)}` : "▬0"}</span>
                  </div>
                  <span style={{ color: "var(--border-strong)", fontSize: 14 }}>›</span>
                </div>
              ); })}
            </div>
          </>
        )}

        {/* items — top three, same fixed number grid, tap = drill */}
        {view === "ledger" && brewery && cur && homeSkus && homeSkus.length > 0 && (
          <>
            <SectHead t="Items" more={openSkus ? "Show less ↑" : "See all ↓"} onMore={() => setOpenSkus(o => !o)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(openSkus ? homeSkus : homeSkus.slice(0, 3)).map((it2, i2) => { const pd = (it2.n || 0) - (it2.nP || 0); return (
                <div key={it2.brand + "|" + it2.pack} className="tap rowIn" onClick={() => router.push("/drill?type=item&k=" + encodeURIComponent(it2.brand + "||" + it2.pack))} style={{ animationDelay: `${Math.min(i2 * 18, 240)}ms`, background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "7px 12px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                  <span style={{ flexShrink: 0, display: "flex" }}><TreeGlyph {...treePropsH(it2.cur, it2.g90)} h={30} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><span style={{ fontWeight: 700, fontSize: 12.5, color: "var(--text)" }}>{titleCase(it2.brand)}</span>{it2.pack ? <span style={{ fontSize: 10.5, color: "var(--text-3)" }}> · {it2.pack}</span> : null}</span>{it2.isNew ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "#5b6bd0", background: "rgba(91,107,208,.12)", borderRadius: 5, padding: "1.5px 6px", flexShrink: 0 }}>New item</span> : null}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{it2.n.toLocaleString()} account{it2.n === 1 ? "" : "s"}</div>
                  </div>
                  <div style={{ marginLeft: "auto", flexShrink: 0, display: "grid", gridTemplateColumns: "54px 42px", columnGap: 4, rowGap: 1, alignItems: "baseline" }}>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{kf(it2.cur)}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: pctCH(it2.g90) }}>{pctSH(it2.g90)}</span>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>{(it2.n || 0).toLocaleString()} plc</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: pd > 0 ? "var(--up)" : pd < 0 ? "var(--down)" : "var(--text-3)" }}>{pd > 0 ? `▲${pd}` : pd < 0 ? `▼${Math.abs(pd)}` : "▬0"}</span>
                  </div>
                  <span style={{ color: "var(--border-strong)", fontSize: 14 }}>›</span>
                </div>
              ); })}
            </div>
          </>
        )}

        {/* chains — top three in scope; a tap opens that chain's account list */}
        {view === "ledger" && brewery && cur && homeChains && homeChains.length > 0 && (
          <>
            <SectHead t="Chains" more={openChains ? "Show less ↑" : "See all ↓"} onMore={() => setOpenChains(o => !o)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(openChains ? homeChains : homeChains.slice(0, 3)).map((c3, i2) => { const nd = (c3.n || 0) - (c3.nP || 0); return (
                <div key={c3.ch} className="tap rowIn" onClick={() => { setScope(cur.key === "ALL" ? "" : cur.key); router.push("/book?chain=" + encodeURIComponent(c3.ch)); }} style={{ animationDelay: `${Math.min(i2 * 18, 240)}ms`, background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "7px 12px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                  <span style={{ flexShrink: 0, display: "flex" }}><TreeGlyph {...(c3.cur > 0 ? { pct: c3.pct == null ? 0 : c3.pct } : { headline: "lapsed" })} h={30} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titleCase(c3.ch).replace(/'(\w)/g, (m3, x3) => "'" + x3.toLowerCase())}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{c3.n.toLocaleString()} account{c3.n === 1 ? "" : "s"}</div>
                  </div>
                  <div style={{ marginLeft: "auto", flexShrink: 0, display: "grid", gridTemplateColumns: "54px 42px", columnGap: 4, rowGap: 1, alignItems: "baseline" }}>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{kf(c3.cur)}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: pctTone(c3.pct) }}>{pctBig(c3.pct)}</span>
                    <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)" }}>{c3.n.toLocaleString()} accts</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: nd > 0 ? "var(--up)" : nd < 0 ? "var(--down)" : "var(--text-3)" }}>{nd > 0 ? `▲${nd}` : nd < 0 ? `▼${Math.abs(nd)}` : "▬0"}</span>
                  </div>
                  <span style={{ color: "var(--border-strong)", fontSize: 14 }}>›</span>
                </div>
              ); })}
            </div>
          </>
        )}

        {/* new items — fresh master additions (selling or not), straight off the flag */}
        {view === "ledger" && brewery && cur && newItems && newItems.filter(n2 => !labelParam || n2.parent === labelParam).length > 0 && (
          <>
            <SectHead t="New items" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {newItems.filter(n2 => !labelParam || n2.parent === labelParam).map(n2 => (
                <div key={n2.item_name} className="tap" onClick={() => router.push("/drill?type=item&k=" + encodeURIComponent((n2.brand || "—") + "||" + (n2.package || "")))} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "7px 12px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                  <span style={{ flexShrink: 0, display: "flex" }}><TreeGlyph headline="new" h={30} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><span style={{ fontWeight: 700, fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n2.item_name}</span><span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "#5b6bd0", background: "rgba(91,107,208,.12)", borderRadius: 5, padding: "1.5px 6px", flexShrink: 0 }}>New item</span></div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{n2.has_sales ? "selling · " : "no sales yet · "}added {n2.first_seen}</div>
                  </div>
                  <span style={{ marginLeft: "auto", whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{kf(n2.l90 || 0)}<span style={{ fontSize: 8.5, color: "var(--text-3)" }}> cs/90d</span></span>
                  <span style={{ color: "var(--border-strong)", fontSize: 14 }}>›</span>
                </div>
              ))}
            </div>
          </>
        )}

        {toast && (
          <div style={{ position: "fixed", left: "50%", bottom: 86, transform: "translateX(-50%)", zIndex: 80, background: "var(--surface)", border: "0.5px solid var(--border-strong)", borderRadius: 999, boxShadow: "var(--shadow-pop)", padding: "9px 16px", fontSize: 12, fontWeight: 700, color: "var(--text-2)", whiteSpace: "nowrap" }}>{toast}</div>
        )}

        <div style={{ height: 2 }} />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button onClick={() => setPickerOpen(true)} aria-label="Change tree style" style={{ border: "none", background: "transparent", color: "var(--text-3)", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", opacity: 0.7, display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 8px", whiteSpace: "nowrap" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 22 11 10 10 0 0 0 12 2Z" /><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" /><circle cx="15.5" cy="7" r="1.4" fill="currentColor" stroke="none" /><circle cx="17.5" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>
            Change style
          </button>
          <span aria-hidden="true" style={{ width: 1, height: 13, background: "var(--border-strong)", opacity: 0.55 }} />
          {brewery && (
            <span style={{ position: "relative", display: "inline-flex" }}>
              <button onClick={() => setLabelPop(o => !o)} aria-label="Choose label" style={{ border: "none", background: "transparent", color: "var(--text-3)", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", opacity: 0.7, display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 8px", whiteSpace: "nowrap" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.6 13.4 12 22 2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" /></svg>
                {labelParam === "" ? "All labels" : labelParam === "TORCH" ? "Torch" : "Blind Corner"}
              </button>
              {labelPop && <>
                <span onClick={() => setLabelPop(false)} style={{ position: "fixed", inset: 0, zIndex: 70 }} />
                <span style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", zIndex: 71, background: "var(--surface)", border: "0.5px solid var(--border-strong)", borderRadius: 12, boxShadow: "var(--shadow-pop)", padding: 5, display: "flex", flexDirection: "column", minWidth: 148 }}>
                  {LABELS.map(([v, lbl]) => {
                    const on = labelParam === v;
                    return (
                      <button key={v || "all"} onClick={() => { setLabelPop(false); if (on) return; setLabel(v); setLabelParam(v); setRows(null); setSlide(0); }}
                        style={{ border: "none", background: on ? "var(--surface-2)" : "transparent", color: on ? "var(--text)" : "var(--text-2)", fontFamily: "inherit", fontSize: 12.5, fontWeight: on ? 700 : 600, padding: "8px 12px", borderRadius: 8, cursor: on ? "default" : "pointer", textAlign: "left", whiteSpace: "nowrap" }}>
                        {lbl}{on ? "  ✓" : ""}
                      </button>
                    );
                  })}
                </span>
              </>}
            </span>
          )}
          {brewery && <span aria-hidden="true" style={{ width: 1, height: 13, background: "var(--border-strong)", opacity: 0.55 }} />}
          <button onClick={() => setNight(!night)} aria-label={night ? "Turn off nighttime mode" : "Turn on nighttime mode"} style={{ border: "none", background: "transparent", color: night ? "#e6c86a" : "var(--text-3)", fontSize: 11.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", opacity: night ? 1 : 0.7, display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 8px", whiteSpace: "nowrap" }}>
            {night
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" /></svg>}
            {night ? "Night on" : "Nighttime"}
          </button>
        </div>
        <div style={{ height: 2 }} />
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