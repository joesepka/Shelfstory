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
const gpct = (c, p) => p > 0 ? Math.round(100 * (c - p) / p) : null;
const idsHref = arr => `/book?ids=${arr.slice(0, 40).join(",")}`;

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

const TONE_DOT = { red: "#D9694A", blue: "#3E86C7", amber: "#E0A93E", green: "#2FA36F", ink: "#8A8678" };

// lightweight versions of the Actions plays — same logic, one-line previews
function buildPlays(rows) {
  const out = [];

  // win-back
  const wb = rows.filter(r => (r.cur90 || 0) > 0 && r.last_order_w != null && r.last_order_w >= 2 && (r.cases_per_month || 0) >= 4 && !isNew(r.headline))
    .sort((a, b) => (b.account_weight || 0) - (a.account_weight || 0)).slice(0, 12);
  if (wb.length >= 2) out.push({ tone: "red", tag: "Win-back", line: `${wb.length} steady buyers have gone quiet — worth a call before they lapse.`, href: idsHref(wb.map(r => r.account_id)) });

  // risk cluster by chain
  const byChain = {};
  rows.filter(r => isDeclining(r.headline) && r.chain).forEach(r => { (byChain[r.chain] ||= []).push(r); });
  let cluster = null;
  for (const ch in byChain) { const lst = byChain[ch]; if (lst.length >= 4 && (!cluster || lst.length > cluster.lst.length)) cluster = { chain: ch, lst }; }
  if (cluster) out.push({ tone: "red", tag: "Risk cluster", line: `${cluster.lst.length} ${titleCase(cluster.chain)} stores are softening together.`, href: idsHref(cluster.lst.map(r => r.account_id)) });

  // new-account rescue
  const nr = rows.filter(r => isNew(r.headline) && r.last_order_w != null && r.last_order_w >= 1);
  if (nr.length >= 2) out.push({ tone: "blue", tag: "New accounts", line: `${nr.length} new accounts stalled after their first order.`, href: idsHref(nr.map(r => r.account_id)) });

  // distribution leak
  const lostBy = {};
  rows.forEach(r => { if (r.lost_sku) (lostBy[r.lost_sku] ||= []).push(r); });
  let topLost = null;
  for (const sku in lostBy) if (!topLost || lostBy[sku].length > topLost.lst.length) topLost = { sku, lst: lostBy[sku] };
  if (topLost && topLost.lst.length >= 3) {
    const chCount = {};
    topLost.lst.forEach(r => { if (r.channel_type) chCount[r.channel_type] = (chCount[r.channel_type] || 0) + 1; });
    const domCh = Object.entries(chCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    out.push({ tone: "amber", tag: "Distribution", line: `${titleCase(topLost.sku)} is losing doors${domCh ? ` in ${domCh}` : ""} — ${topLost.lst.length} dropped it.`, href: idsHref(topLost.lst.map(r => r.account_id)) });
  }

  // hot market, thin coverage
  const cityAgg = {};
  rows.forEach(r => { if (!r.city) return; const e = cityAgg[`${r.city}|${r.state}`] ||= { city: r.city, st: r.state, cur: 0, prev: 0, n: 0 }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; e.n++; });
  const citiesArr = Object.values(cityAgg).filter(c => c.n >= 2);
  const medN = citiesArr.length ? citiesArr.map(c => c.n).sort((a, b) => a - b)[Math.floor(citiesArr.length / 2)] : 0;
  const hot = citiesArr.map(c => ({ ...c, g: gpct(c.cur, c.prev) })).filter(c => c.g != null && c.g >= 15 && c.n < medN).sort((a, b) => b.g - a.g)[0];
  if (hot) out.push({ tone: "green", tag: "Hot market", line: `${titleCase(hot.city)} is up ${hot.g}% but you only hold ${hot.n} door${hot.n === 1 ? "" : "s"}.`, href: `/perf/overview?st=${hot.st}&city=${encodeURIComponent(hot.city)}` });

  // distributor watch
  const distAgg = {};
  let bookCur = 0;
  rows.forEach(r => { bookCur += r.cur90 || 0; if (!r.distributor) return; const e = distAgg[r.distributor] ||= { name: r.distributor, cur: 0, prev: 0 }; e.cur += r.cur90 || 0; e.prev += r.prev90 || 0; });
  const dw = Object.values(distAgg).map(d => ({ ...d, share: bookCur ? Math.round(100 * d.cur / bookCur) : 0, g: gpct(d.cur, d.prev) }))
    .filter(d => d.share >= 10 && d.g != null && d.g < 0).sort((a, b) => a.g - b.g)[0];
  if (dw) out.push({ tone: "ink", tag: "Distributor", line: `${titleCase(dw.name)} moves ${dw.share}% of your book and it's down ${Math.abs(dw.g)}%.`, href: `/book?distributor=${encodeURIComponent(dw.name)}` });

  return out;
}

function NavCard({ href, title, sub, ready }) {
  const inner = (
    <div style={{
      background: "#E9E4D8", border: "0.5px solid #DCD6C6", borderRadius: 18, padding: "18px 18px", marginTop: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,.05)", cursor: ready ? "pointer" : "default",
      opacity: ready ? 1 : 0.72,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{title}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: ready ? "#7A766B" : T.muted, whiteSpace: "nowrap" }}>
          {ready ? "open ›" : "coming soon"}
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#7E7A6E", marginTop: 6, lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
  return ready ? <a href={href} style={{ textDecoration: "none" }}>{inner}</a> : inner;
}

function PlayRow({ play }) {
  return (
    <a href={play.href} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 11, textDecoration: "none" }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: TONE_DOT[play.tone] || "#9A968C", marginTop: 6, flexShrink: 0 }} />
      <span style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.42, flex: 1 }}>
        <b style={{ color: TONE_DOT[play.tone] || T.ink, fontWeight: 700 }}>{play.tag}:</b> {play.line}
      </span>
      <span style={{ fontSize: 12, color: "#A39E90", marginTop: 2, flexShrink: 0 }}>›</span>
    </a>
  );
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let all = [], from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("account_list")
            .select("account_id,account_name,chain,city,state,distributor,channel_type,headline,account_weight,cur90,prev90,prior90_pct,cases_per_month,placements_delta,lost_sku,last_order_w")
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
    for (const r of rows) {
      cur += r.cur90 || 0; prev += r.prev90 || 0;
      if (isNew(r.headline)) nNew++; else if (isDeclining(r.headline)) nRisk++; else nHealthy++;
    }
    const pct = prev > 0 ? Math.round(100 * (cur - prev) / prev) : null;
    return { cur, pct, nNew, nRisk, nHealthy, plays: buildPlays(rows) };
  }, [rows]);

  const plays = s?.plays || [];
  const visible = showAll ? plays : plays.slice(0, 2);
  const hiddenCount = Math.max(0, plays.length - 2);

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}

      <main style={{ position: "relative", minHeight: "100vh", background: T.bg, padding: 24, fontFamily: T.font, maxWidth: 480, margin: "0 auto" }}>
        <div style={{ position: "absolute", top: 16, right: 20, fontFamily: "Georgia, serif", fontSize: 13, color: "#C4BFB2", letterSpacing: 0.5 }}>ShelfStory</div>

        <h1 style={{ fontSize: 27, color: T.ink, marginTop: 44, marginBottom: 4, fontWeight: 700 }}>{greeting()}, Joe.</h1>
        <p style={{ fontSize: 15, color: T.muted, marginTop: 0 }}>Here’s where your book stands today.</p>

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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.5 }}>TOP PLAYS TODAY</div>
                <a href="/actions" style={{ fontSize: 11.5, fontWeight: 600, color: "#7A766B", textDecoration: "none" }}>see all ›</a>
              </div>

              {plays.length === 0 && <div style={{ fontSize: 13, color: T.muted }}>No plays meet the threshold right now.</div>}
              {visible.map((p, i) => <PlayRow key={i} play={p} />)}

              {hiddenCount > 0 && (
                <button onClick={() => setShowAll(v => !v)}
                  style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: T.primary, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  {showAll ? "Show less ▴" : `Show ${hiddenCount} more play${hiddenCount === 1 ? "" : "s"} ▾`}
                </button>
              )}
            </>
          )}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginTop: 26 }}>WHERE TO?</div>
        <NavCard href="/book" ready title="Accounts"
          sub="Find accounts by area, see what's happening at each, and work your list — account, grid, or tree." />
        <NavCard href="/perf" ready title="Performance Overview"
          sub="The whole book at a glance — drill territory, channel, and chains, then generate a market report." />
        <NavCard href="/actions" ready title="Actions to Take"
          sub="Your highest-priority plays — win-backs, at-risk saves, distribution gaps, and momentum to ride." />

        <div style={{ height: 28 }} />
      </main>
    </>
  );
}