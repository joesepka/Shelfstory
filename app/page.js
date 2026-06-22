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

// splash logo palette (matches theme.css) — all green
const BOOK = "#3F6E4A";   // --accent-deep (book strokes)
const TREND = "#5E9277";  // --accent (climbing line / arrow / dots / progress)

const STNAME = { IL: "Illinois", OH: "Ohio", MI: "Michigan", MO: "Missouri", IA: "Iowa", MN: "Minnesota", WI: "Wisconsin", IN: "Indiana" };
const DECLINING = new Set(["decelerating", "at-risk", "atrisk", "at risk", "lapsed"]);
const isDeclining = h => DECLINING.has(String(h || "").toLowerCase().trim());
const isNew = h => String(h || "").toLowerCase().trim() === "new";
const titleCase = s => String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

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
    <div style={{ flex: 1, minWidth: 0, padding: "0 4px", borderLeft: "1px solid var(--border-strong)" }}>
      <div style={{ fontSize: 8.5, letterSpacing: 0.3, color: "var(--text-3)", lineHeight: 1.2, height: 22, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginTop: 3 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", lineHeight: 1, letterSpacing: "-0.5px", fontFeatureSettings: '"tnum" 1, "lnum" 1' }}>{value}</span>
        {unit && <span style={{ fontSize: 9, color: "var(--text-3)" }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: c, marginTop: 5 }}>
        {arrow} {pct == null ? "—" : `${Math.abs(pct)}%`}
      </div>
    </div>
  );
}

// bolded anchor — the place / SKU / number your eye should catch
function A({ children }) { return <strong style={{ fontWeight: 700, color: "var(--text)" }}>{children}</strong>; }

// builds the 2-paragraph brief from account-level rows
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

// drifting background clouds — very light, themed, behind everything
function Clouds() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      <span className="cloud c1" />
      <span className="cloud c2" />
      <span className="cloud c3" />
      <span className="cloud c4" />
    </div>
  );
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [greet, setGreet] = useState("Welcome");
  const [briefOpen, setBriefOpen] = useState(false);

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

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}

      <main style={{ position: "relative", minHeight: "100vh", background: "var(--bg)", padding: 24, fontFamily: "var(--font-sans)", maxWidth: 480, margin: "0 auto", overflow: "hidden" }}>
        <Clouds />

        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, color: "var(--text)", marginTop: 16, marginBottom: 4, fontWeight: 600, letterSpacing: "-0.3px" }}>{greet}, Joe.</h1>
          <p style={{ fontSize: 14.5, color: "var(--text-3)", marginTop: 0 }}>Here’s the lay of the land.</p>

          <div style={{ marginTop: 18, minHeight: 56 }}>
            {!s && !err && <div style={{ fontSize: 13, color: "var(--text-3)" }}>Reading your book…</div>}
            {err && <div style={{ fontSize: 13, color: "var(--down)" }}>Couldn’t load your book. {err}</div>}
            {s && (
              <div style={{ position: "relative", padding: "4px 6px 6px" }}>
                <span aria-hidden="true" style={{ position: "absolute", top: -1, left: -1, width: 16, height: 16, borderTop: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)", borderTopLeftRadius: 7 }} />
                <span aria-hidden="true" style={{ position: "absolute", bottom: -1, right: -1, width: 13, height: 13, borderBottom: "1.5px solid var(--accent)", borderRight: "1.5px solid var(--accent)", borderBottomRightRadius: 7, opacity: 0.4 }} />
                <div style={{ display: "flex", marginLeft: -4 }}>
                  <Stat label="90D Cases" value={s.cur.toLocaleString()} pct={s.curPct} />
                  <Stat label="Active Accts" value={s.acctNow.toLocaleString()} pct={s.acctPct} />
                  <Stat label="ROS / Acct" value={s.rosNow.toFixed(1)} unit="cs" pct={s.rosPct} />
                </div>
              </div>
            )}
            {s && <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 9, marginLeft: 0 }}>vs prior 90 days</div>}
          </div>

          {/* collapsible brief — opens to plain prose, no box */}
          {s && brief && (
            <div style={{ marginTop: 16 }}>
              <div onClick={() => setBriefOpen(o => !o)}
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

          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: 0.5, marginTop: 26 }}>WHERE TO?</div>
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
        </div>
      </main>

      <style>{`
        @keyframes briefIn{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:none;}}
        .cloud{position:absolute;border-radius:50%;filter:blur(42px);opacity:.4;will-change:transform;}
        .cloud.c1{width:230px;height:230px;top:-60px;right:-70px;background:var(--accent-soft);animation:drift1 38s ease-in-out infinite;}
        .cloud.c2{width:200px;height:200px;top:34%;left:-90px;background:var(--pop-cool-soft);animation:drift2 46s ease-in-out infinite;}
        .cloud.c3{width:180px;height:180px;bottom:8%;right:-60px;background:var(--pop-warm-soft);animation:drift3 42s ease-in-out infinite;}
        .cloud.c4{width:160px;height:160px;bottom:-50px;left:24%;background:var(--accent-soft);animation:drift4 52s ease-in-out infinite;}
        @keyframes drift1{0%,100%{transform:translate(0,0)}50%{transform:translate(-26px,22px)}}
        @keyframes drift2{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-18px)}}
        @keyframes drift3{0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,-24px)}}
        @keyframes drift4{0%,100%{transform:translate(0,0)}50%{transform:translate(24px,16px)}}
        @media (prefers-reduced-motion: reduce){.cloud{animation:none !important;}}
      `}</style>
    </>
  );
}

function NavCardInner({ title, sub }) {
  return (
    <div style={{
      background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 18, padding: "18px 18px", marginTop: 12,
      boxShadow: "var(--shadow)", cursor: "pointer",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{title}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent-deep)", whiteSpace: "nowrap" }}>open ›</div>
      </div>
      <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6, lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}