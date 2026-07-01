"use client";
import { useEffect, useRef, useState } from "react";
import { kfmt, greenBar, blueBar, purpleBar } from "../lib/utils";

const PURPLE_DEEP = "var(--purple-benchmark)";  // dashed benchmark + accents (matches purpleBar deep end)

// Shared ON-SCREEN charts (Harbor Green). Animated: bars pop up from the axis,
// the ROS line draws on left->right. The PDF-deck print charts are intentionally
// separate and static (hardcoded PT colors for html2canvas capture).
// Keyframes barGrow / dotIn live in app/globals.css.

// Over-time bars. Highlights the most recent `hi` periods; labels only a few x ticks.
export function BarCard({ title, sub, data, labels, hi, unit }) {
  const mx = Math.max(...data, 1), n = data.length;
  const gap = n > 8 ? 2 : 3;                                   // shared with AcctRosCard so columns line up
  const showLab = i => n <= 6 || i % 3 === 0 || i === n - 1;   // only a few x labels
  const lo = Math.min(...data.filter(x => x > 0), mx); // case bars: green, shaded by value (softer=lighter, better=darker)
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow)", padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{title}</div>
        <div style={{ fontSize: 9.5, color: "var(--text-3)" }}>{Math.round(data[n - 1]).toLocaleString()} {unit} latest</div>
      </div>
      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap, height: 120, marginTop: 10 }}>
        {data.map((v, i) => {
          const on = i >= n - hi;
          return (
            <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", minWidth: 0 }}>
              <div style={{ fontSize: 6.5, lineHeight: 1, textAlign: "center", marginBottom: 2, color: on ? "var(--accent-deep)" : "var(--text-3)", fontWeight: on ? 700 : 400, fontFeatureSettings: '"tnum" 1', whiteSpace: "nowrap", overflow: "hidden" }}>{v > 0 ? kfmt(v) : ""}</div>
              <div style={{ width: "100%", height: `${v > 0 ? Math.max(2, (v / mx) * 92) : 0}%`, background: greenBar(v, lo, mx), borderRadius: "2px 2px 0 0", transformOrigin: "bottom", animation: "barGrow .45s cubic-bezier(.34,1.56,.64,1) both", animationDelay: `${i * 25}ms` }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap, marginTop: 4 }}>
        {labels.map((l, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 7.5, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden" }}>{showLab(i) ? l : ""}</div>)}
      </div>
    </div>
  );
}

// Rolling-90 accounts (bars) + ROS/mo (line, independently scaled). The line draws
// on via a clip-path reveal, with start/middle/end ROS labels and a tilted endpoint arrow.
export function AcctRosCard({ title, sub, accts, ros, labels, hi }) {
  const n = accts.length, mxA = Math.max(...accts, 1);
  const dense = n > 8;
  const alo = Math.min(...accts.filter(x => x > 0), mxA); // account bars: blue, shaded by value
  const mxR = Math.max(...ros, 0.1), mnR = Math.min(...ros.filter(x => x > 0), mxR);
  const span = (mxR - mnR) || 1, pad = span * 0.6, lo = Math.max(0, mnR - pad), hi2 = mxR + pad;
  const yOf = r => 88 - ((r - lo) / ((hi2 - lo) || 1)) * 72;
  const xOf = i => n > 1 ? (i / (n - 1)) * 100 : 50;
  const pts = accts.map((_, i) => `${xOf(i).toFixed(1)},${yOf(ros[i]).toFixed(1)}`).join(" ");
  const ye = yOf(ros[n - 1]);                                       // y% of the latest ROS point
  const clipId = "rosrev-" + String(title).replace(/[^a-zA-Z0-9]/g, ""); // unique per card
  // measure the plot so the endpoint arrow can tilt along the line's true (stretched) slope
  const plotRef = useRef(null);
  const [pw, setPw] = useState(420);
  useEffect(() => {
    const el = plotRef.current; if (!el) return;
    const upd = () => setPw(el.clientWidth || 420);
    upd();
    const ro = new ResizeObserver(upd); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const arrowAng = n > 1 ? Math.atan2((ye - yOf(ros[n - 2])) / 100 * 120, (pw || 420) / (n - 1)) * 180 / Math.PI : 0;
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow)", padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{title}</div>
        <div style={{ fontSize: 9.5, color: "var(--text-3)" }}>{Math.round(accts[n - 1]).toLocaleString()} accts · {ros[n - 1].toFixed(1)} ROS</div>
      </div>
      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>
      <div ref={plotRef} style={{ position: "relative", height: 120, marginTop: 10 }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: dense ? 2 : 3 }}>
          {accts.map((v, i) => {
            const on = i >= n - hi;
            return (
              <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", minWidth: 0 }}>
                <div style={{ fontSize: 6.5, lineHeight: 1, textAlign: "center", marginBottom: 2, color: on ? "var(--pop-cool-deep)" : "var(--text-3)", fontWeight: on ? 700 : 400, fontFeatureSettings: '"tnum" 1' }}>{v > 0 ? kfmt(v) : ""}</div>
                <div style={{ width: "100%", height: `${v > 0 ? Math.max(2, (v / mxA) * 80) : 0}%`, background: blueBar(v, alo, mxA), borderRadius: "2px 2px 0 0", transformOrigin: "bottom", animation: "barGrow .45s cubic-bezier(.34,1.56,.64,1) both", animationDelay: `${i * 25}ms` }} />
              </div>
            );
          })}
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          <defs>
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              <rect x="0" y="0" width="0" height="100"><animate attributeName="width" from="0" to="100" dur="0.7s" begin="0.25s" fill="freeze" /></rect>
            </clipPath>
          </defs>
          <polyline points={pts} fill="none" stroke="var(--gold)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" clipPath={`url(#${clipId})`} />
        </svg>
        {/* ROS value at start / middle / end of the line */}
        {[0, Math.floor((n - 1) / 2), n - 1].filter((p, i, a) => a.indexOf(p) === i).map((p) => (
          <div key={p} style={{ position: "absolute", left: p === 0 ? "1%" : p === n - 1 ? undefined : `${xOf(p)}%`, right: p === n - 1 ? "1%" : undefined, top: `${yOf(ros[p])}%`, transform: `translate(${p === 0 || p === n - 1 ? "0" : "-50%"}, -160%)`, fontSize: 9.5, fontWeight: 800, color: "var(--gold)", whiteSpace: "nowrap", fontFeatureSettings: '"tnum" 1', opacity: 0, animation: "dotIn .25s ease-out .95s forwards" }}>{ros[p].toFixed(1)}</div>
        ))}
        {/* arrow on the latest ROS point, tilted along the line */}
        <div style={{ position: "absolute", right: 0, top: `${ye}%`, transform: "translate(50%,-50%)", opacity: 0, animation: "dotIn .25s ease-out .95s forwards" }}>
          <svg width="13" height="13" viewBox="0 0 12 12" style={{ display: "block", overflow: "visible", transform: `rotate(${arrowAng}deg)` }}>
            <path d="M3 2 L9 6 L3 10" fill="none" stroke="var(--gold)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div style={{ display: "flex", gap: dense ? 2 : 3, marginTop: 4 }}>
        {labels.map((l, i) => { const show = !dense || i % 3 === 0 || i === n - 1; return <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 7.5, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden" }}>{show ? l : ""}</div>; })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 7, fontSize: 9, color: "var(--text-3)" }}>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--pop-cool)", borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />accounts</span>
        <span><span style={{ display: "inline-block", width: 12, height: 3, background: "var(--gold)", marginRight: 3, verticalAlign: "middle", borderRadius: 1 }} />ROS / mo</span>
      </div>
    </div>
  );
}

// Categorical ROS-by-channel bars (purple, value-shaded). Current 90-day ROS on each
// bar with a momentum chip (▲/▼ vs prior 90), plus a dashed benchmark line at the
// overall scope ROS for at-a-glance comparison. Not a time series — bars are channels.
export function ChannelRosCard({ title, sub, bars, benchmark }) {
  const ross = bars.map(b => b.ros);
  const mx = Math.max(...ross, benchmark || 0, 0.1);
  const lo = Math.min(...ross.filter(x => x > 0), mx);
  const scale = mx * 1.18;                                    // headroom above tallest bar for labels
  const benchTop = benchmark > 0 ? (1 - benchmark / scale) * 100 : -1;
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow)", padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{title}</div>
        <div style={{ fontSize: 9.5, color: "var(--text-3)" }}>{benchmark.toFixed(1)} ROS overall</div>
      </div>
      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>
      <div style={{ position: "relative", height: 132, marginTop: 12 }}>
        {benchmark > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: `${benchTop}%`, borderTop: `1.4px dashed ${PURPLE_DEEP}`, opacity: 0.5, zIndex: 2 }}>
            <span style={{ position: "absolute", right: 0, top: -11, fontSize: 7, fontWeight: 700, color: PURPLE_DEEP, opacity: 0.85, fontFeatureSettings: '"tnum" 1' }}>benchmark</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 7 }}>
          {bars.map((b, i) => {
            const d = b.ros - b.prevRos, up = d > 0.05, down = d < -0.05;
            return (
              <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", minWidth: 0, background: "var(--surface-2)", borderRadius: "8px 8px 0 0" }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, lineHeight: 1, textAlign: "center", color: "var(--text)", fontFeatureSettings: '"tnum" 1' }}>{b.ros.toFixed(1)}</div>
                <div style={{ fontSize: 6.5, lineHeight: 1.1, textAlign: "center", marginBottom: 3, color: up ? "var(--up)" : down ? "var(--down)" : "var(--text-3)", fontWeight: 700, fontFeatureSettings: '"tnum" 1' }}>{up ? "▲" : down ? "▼" : "·"}{(up || down) ? Math.abs(d).toFixed(1) : ""}</div>
                <div style={{ width: "100%", height: `${b.ros > 0 ? Math.max(2, (b.ros / scale) * 100) : 0}%`, background: purpleBar(b.ros, lo, mx), borderRadius: "2px 2px 0 0", transformOrigin: "bottom", animation: "barGrow .45s cubic-bezier(.34,1.56,.64,1) both", animationDelay: `${i * 30}ms` }} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 5 }}>
        {bars.map((b, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}</div>)}
      </div>
    </div>
  );
}

// Multi-line ROS over time for the top-5 items in scope (one categorical color each).
// Lines reveal left->right; legend carries the latest ROS per item. The Items / Brands
// toggle is a stub — Brands is disabled ("soon") until brand rollups land.
export function ItemRosLines({ title, sub, series, labels }) {
  const n = labels.length;
  const all = series.flatMap(s => s.ros).filter(x => x > 0);
  const mx = Math.max(...all, 0.1), mn = Math.min(...all, mx);
  const span = (mx - mn) || 1, pad = span * 0.35, lo = Math.max(0, mn - pad), hi = mx + pad;
  const yOf = r => 92 - ((r - lo) / ((hi - lo) || 1)) * 84;
  const xOf = i => n > 1 ? (i / (n - 1)) * 100 : 50;
  const clipId = "itemros-" + String(title).replace(/[^a-zA-Z0-9]/g, "");
  const showLab = i => n <= 6 || i % 2 === 0 || i === n - 1;
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow)", padding: "12px 14px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{title}</div>
        <div style={{ display: "flex", gap: 3 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: "var(--r-sm)", background: "var(--text-2)", color: "#fff" }}>Items</span>
          <span style={{ fontSize: 9.5, fontWeight: 600, padding: "3px 8px", borderRadius: "var(--r-sm)", background: "var(--surface-2)", color: "var(--text-3)", opacity: 0.6 }}>Brands · soon</span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>
      <div style={{ position: "relative", height: 138, marginTop: 10 }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          <defs>
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              <rect x="0" y="0" width="0" height="100"><animate attributeName="width" from="0" to="100" dur="0.7s" begin="0.2s" fill="freeze" /></rect>
            </clipPath>
          </defs>
          {series.map((s, si) => (
            <polyline key={si} points={s.ros.map((r, i) => `${xOf(i).toFixed(1)},${yOf(r).toFixed(1)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" clipPath={`url(#${clipId})`} />
          ))}
        </svg>
        {series.map((s, si) => (
          <div key={si} style={{ position: "absolute", right: 0, top: `${yOf(s.ros[n - 1])}%`, transform: "translate(50%,-50%)", width: 6, height: 6, borderRadius: "50%", background: s.color, border: "1px solid var(--surface)", opacity: 0, animation: "dotIn .25s ease-out .9s forwards" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
        {labels.map((l, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 7.5, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden" }}>{showLab(i) ? l : ""}</div>)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px", marginTop: 8 }}>
        {series.map((s, si) => (
          <span key={si} style={{ fontSize: 9, color: "var(--text-2)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ display: "inline-block", width: 11, height: 2.5, background: s.color, borderRadius: 1 }} />
            {s.name}<b style={{ color: "var(--text)", fontFeatureSettings: '"tnum" 1' }}>{s.ros[n - 1].toFixed(1)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
