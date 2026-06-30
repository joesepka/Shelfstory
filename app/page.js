"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useExplode } from "../lib/useExplode";
import TreeGlyph, { plantState, TierTree } from "../components/TreeGlyph";
import { getScope, setScope } from "../lib/scope";
import ThemePicker from "../components/ThemePicker";

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

// small top-right wordmark: open book + a rising line that sprouts a leaf
function LogoMark({ size = 30 }) {
  return (
    <svg viewBox="0 0 64 48" style={{ width: size, height: "auto" }} aria-hidden="true">
      <path d="M32 40 q-9 -4 -22 -2 v-22 q13 -2 22 2 z" fill="none" stroke={BOOK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M32 40 q9 -4 22 -2 v-22 q-13 -2 -22 2 z" fill="none" stroke={BOOK} strokeWidth="2.4" strokeLinejoin="round" />
      <polyline className="lm-line" points="16,31 24,28 31,23 39,16" fill="none" stroke={TREND} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path className="lm-leaf" d="M39 16 q-2 -6 -8 -6 q1 6 8 6 z" fill={TREND} />
      <path className="lm-leaf" d="M39 16 q5 -4 11 -3 q-3 6 -11 3 z" fill={TREND} />
    </svg>
  );
}
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
function Splash({ onDone }) {
  const [out, setOut] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 1180);
    const t2 = setTimeout(() => onDoneRef.current(), 1520);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
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

// a tier's overall health → a vitality (0..1, drives the single tree's fullness)
// and a color carried strongly through the canopy (green → gold → rust).
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
function NavIcon({ href }) {
  const p = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "#aab2a3", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
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

export default function Home() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [greet, setGreet] = useState("Welcome");
  const [briefOpen, setBriefOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [confirm, setConfirm] = useState(null);
  const touchX = useRef(null);
  const { burst, styleFor } = useExplode();

  useEffect(() => {
    (async () => {
      try {
        let all = [], from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("account_list")
            .select("account_id,account_name,cur90,prev90,state,city,chain,headline,account_weight,prior90_pct,last_order_w")
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
      let cur = 0, prev = 0, acctNow = 0, acctPrev = 0;
      for (const r of list) { const c = r.cur90 || 0, p = r.prev90 || 0; cur += c; prev += p; if (c > 0) acctNow++; if (p > 0) acctPrev++; }
      const rosNow = acctNow ? cur / acctNow : 0, rosPrev = acctPrev ? prev / acctPrev : 0;
      // split by cumulative L52W volume into quarters
      const sorted = [...list].sort((a, b) => (b.account_weight || 0) - (a.account_weight || 0));
      const totW = sorted.reduce((s, r) => s + (r.account_weight || 0), 0) || 1;
      const groups = { top: [], mid: [], small: [], tail: [] };
      let cum = 0;
      for (const r of sorted) { const f = cum / totW; cum += r.account_weight || 0; (f < 0.25 ? groups.top : f < 0.5 ? groups.mid : f < 0.75 ? groups.small : groups.tail).push(r); }
      const tiers = TIER_DEFS.map(t => {
        const g = groups[t.key];
        let c = 0, p = 0; const cnt = { thriving: 0, bearing: 0, wilting: 0, bare: 0, sapling: 0 };
        for (const r of g) { c += r.cur90 || 0; p += r.prev90 || 0; cnt[plantState(r.headline)]++; }
        const pct = gpct(c, p), sc = tierScore(pct, cnt, g.length);
        return { key: t.key, label: t.label, n: g.length, cur: c, pct, vit: sc.vit, color: sc.color, desc: tierDesc(pct, cnt, g.length) };
      });
      return { label, key, cur, curPct: gpct(cur, prev), acctNow, acctPct: gpct(acctNow, acctPrev), rosNow, rosPct: rosPrev > 0 ? Math.round((100 * (rosNow - rosPrev)) / rosPrev) : null, n: list.length, brief: buildBrief(list), tiers };
    };
    const byState = {};
    for (const r of rows) { if (!r.state) continue; (byState[r.state] || (byState[r.state] = [])).push(r); }
    const states = Object.keys(byState).map(st => mk(STNAME[st] || st, st, byState[st])).sort((a, b) => b.cur - a.cur);
    return [mk("All accounts", "ALL", rows), ...states];
  }, [rows]);
  const cur = slides ? slides[Math.min(slide, slides.length - 1)] : null;

  // always open on "All states" — clears any remembered scope on entry
  useEffect(() => { setScope(""); }, []);

  function navTo(href) {
    burst(href, () => router.push(href)); // explode the cards, then navigate
  }
  function pick(i) { if (!slides) return; setSlide(i); setScope(slides[i].key === "ALL" ? "" : slides[i].key); }
  function go(d) { if (!slides) return; const n = slides.length; pick((slide + d + n) % n); }
  function onTouchStart(e) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e) { if (touchX.current == null) return; const dx = e.changedTouches[0].clientX - touchX.current; touchX.current = null; if (dx < -40) go(1); else if (dx > 40) go(-1); }

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}

      <main className="pagefade" style={{ position: "relative", minHeight: "100vh", background: "linear-gradient(180deg,#b6dcf1 0px,#cce4f4 120px,#d7e6df 360px,var(--bg) 500px)", padding: 24, fontFamily: "var(--font-sans)", maxWidth: 480, margin: "0 auto", overflow: "hidden" }}>
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

        {/* skin picker */}
        <div className="riseIn" style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <ThemePicker />
        </div>

        {/* buttons — four square */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          {NAV.map(c => (
            <div key={c.href} onClick={() => navTo(c.href)}
              style={{ cursor: "pointer", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 14, padding: "12px 13px 11px", minHeight: 86, display: "flex", flexDirection: "column", boxShadow: "var(--shadow-sm)", ...(styleFor(c.href) || {}) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <NavIcon href={c.href} />
                <span style={{ fontSize: 15, color: c.color, lineHeight: 1 }}>→</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginTop: 8, letterSpacing: "-0.2px" }}>{c.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* loading / error */}
        {!slides && !err && <div style={{ marginTop: 18, fontSize: 13, color: "var(--text-3)" }}>Reading your book…</div>}
        {err && <div style={{ marginTop: 18, fontSize: 13, color: "var(--down)" }}>Couldn’t load your book. {err}</div>}

        {/* scope indicator — between the buttons and the stat box */}
        {cur && (
          <div className="riseIn" style={{ marginTop: 18 }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.3px", lineHeight: 1.1 }}>{cur.key === "ALL" ? "All states" : cur.label}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{cur.key === "ALL" ? "Your whole book" : `Focused on ${cur.label}`}{slides.length > 1 ? " · swipe the stats to change" : ""}</div>
          </div>
        )}

        {/* info box (swipeable) — cases / accts / ROS */}
        {cur && (
          <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ marginTop: 10 }}>
            <div className="riseIn" style={{ position: "relative", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 16, boxShadow: "var(--shadow)", padding: "13px 10px" }}>
              <span aria-hidden="true" style={{ position: "absolute", top: -1, left: -1, width: 16, height: 16, borderTop: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)", borderTopLeftRadius: 7 }} />
              <span aria-hidden="true" style={{ position: "absolute", bottom: -1, right: -1, width: 13, height: 13, borderBottom: "1.5px solid var(--accent)", borderRight: "1.5px solid var(--accent)", borderBottomRightRadius: 7, opacity: 0.4 }} />
              <div key={cur.key} className="sceneFade" style={{ display: "flex" }}>
                <Stat label="90D Cases" value={cur.cur.toLocaleString()} pct={cur.curPct} delay={0} />
                <Stat label="Active Accts" value={cur.acctNow.toLocaleString()} pct={cur.acctPct} divider delay={0.9} />
                <Stat label="ROS / Acct" value={cur.rosNow.toFixed(1)} unit="cs" pct={cur.rosPct} divider delay={1.8} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 9 }}>
              {slides.slice(0, 9).map((sl, i) => (
                <span key={i} onClick={() => pick(i)} style={{ width: i === slide ? 16 : 6, height: 6, borderRadius: 3, background: i === slide ? "var(--accent)" : "var(--border-strong)", transition: "width .2s, background .2s", cursor: "pointer" }} />
              ))}
              {slides.length > 9 && <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 2 }}>+{slides.length - 9}</span>}
            </div>
            <div style={{ textAlign: "center", fontSize: 9.5, color: "var(--text-3)", marginTop: 6 }}>vs prior 90 days</div>
          </div>
        )}

        {/* collapsible brief — state-specific */}
        {cur && cur.brief && (
          <div style={{ marginTop: 14, minHeight: 19 }}>
            <div className="riseIn">
              <div onClick={() => setBriefOpen(o => !o)}
                className={briefOpen ? "" : "bob"}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "var(--accent-deep)", letterSpacing: 0.2 }}>
                <span style={{ display: "inline-block", transform: briefOpen ? "rotate(90deg)" : "none", transition: "transform .18s" }}>▸</span>
                {briefOpen ? "Hide your brief" : "Expand to see your brief"}
              </div>
              {briefOpen && (
                <div key={cur.key} style={{ marginTop: 12, animation: "briefIn .26s ease" }}>
                  <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.62, marginBottom: 12 }}>{cur.brief.p1.map((el, i) => <span key={i}>{el}</span>)}</p>
                  <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.62 }}>{cur.brief.p2.map((el, i) => <span key={i}>{el}</span>)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* the book by tier — four health trees, each ~25% of volume */}
        {cur && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: 0.5 }}>THE BOOK BY TIER</div>
            <div key={"t4" + cur.key} className="sceneFade tier4row">
              {cur.tiers.map((t, idx) => (
                <Fragment key={t.key}>
                  {idx > 0 && <div className="t4div" aria-hidden="true" />}
                  <div className="t4col" style={{ cursor: t.n ? "pointer" : "default" }}
                    onClick={() => { if (t.n) router.push(`/book?tier=${t.key}${cur.key !== "ALL" ? `&state=${cur.key}` : ""}`); }}>
                    <div className="t4tree">{t.n ? <TierTree t={t.vit} color={t.color} h={[66, 56, 48, 42][idx]} /> : <span style={{ fontSize: 11, color: "var(--text-3)" }}>—</span>}</div>
                    <div className="t4lbl">{t.label}</div>
                    <div className="t4n">{t.n.toLocaleString()} acct{t.n === 1 ? "" : "s"}</div>
                    <div className="t4desc">{t.desc}</div>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 28 }} />
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
        .tier4row{display:flex;align-items:flex-end;margin-top:12px;}
        .t4div{width:1px;background:#e2e4df;align-self:stretch;flex-shrink:0;}
        .t4col{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center;padding:0 5px;}
        .t4tree{display:flex;align-items:flex-end;justify-content:center;min-height:68px;}
        .t4lbl{font-size:11.5px;font-weight:700;color:var(--text);margin-top:7px;}
        .t4n{font-size:10px;color:var(--text-3);margin-top:1px;}
        .t4desc{font-size:10px;color:var(--text-3);margin-top:2px;line-height:1.25;}
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