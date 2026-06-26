"use client";
import { useEffect, useRef, useState } from "react";
import { kfmt } from "../lib/utils";

// Shared ON-SCREEN charts (Harbor Green). Animated: bars pop up from the axis,
// the ROS line draws on left->right. The PDF-deck print charts are intentionally
// separate and static (hardcoded PT colors for html2canvas capture).
// Keyframes barGrow / dotIn live in app/globals.css.

// Over-time bars. Highlights the most recent `hi` periods; labels only a few x ticks.
export function BarCard({ title, sub, data, labels, hi, unit }) {
  const mx = Math.max(...data, 1), n = data.length;
  const gap = n > 8 ? 2 : 3;                                   // shared with AcctRosCard so columns line up
  const showLab = i => n <= 6 || i % 3 === 0 || i === n - 1;   // only a few x labels
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)", padding: "12px 14px", marginTop: 12 }}>
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
              <div style={{ width: "100%", height: `${v > 0 ? Math.max(2, (v / mx) * 92) : 0}%`, background: on ? "var(--accent)" : "#C9DCD0", borderRadius: "2px 2px 0 0", transformOrigin: "bottom", animation: "barGrow .45s cubic-bezier(.34,1.56,.64,1) both", animationDelay: `${i * 25}ms` }} />
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
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)", padding: "12px 14px", marginTop: 12 }}>
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
                <div style={{ width: "100%", height: `${v > 0 ? Math.max(2, (v / mxA) * 80) : 0}%`, background: on ? "var(--pop-cool)" : "#CBD9E6", borderRadius: "2px 2px 0 0", transformOrigin: "bottom", animation: "barGrow .45s cubic-bezier(.34,1.56,.64,1) both", animationDelay: `${i * 25}ms` }} />
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
          <polyline points={pts} fill="none" stroke="var(--pop-warm)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" clipPath={`url(#${clipId})`} />
        </svg>
        {/* ROS value at start / middle / end of the line */}
        {[0, Math.floor((n - 1) / 2), n - 1].filter((p, i, a) => a.indexOf(p) === i).map((p) => (
          <div key={p} style={{ position: "absolute", left: p === 0 ? "1%" : p === n - 1 ? undefined : `${xOf(p)}%`, right: p === n - 1 ? "1%" : undefined, top: `${yOf(ros[p])}%`, transform: `translate(${p === 0 || p === n - 1 ? "0" : "-50%"}, -160%)`, fontSize: 8, fontWeight: 700, color: "var(--pop-warm-deep)", whiteSpace: "nowrap", fontFeatureSettings: '"tnum" 1', opacity: 0, animation: "dotIn .25s ease-out .95s forwards" }}>{ros[p].toFixed(1)}</div>
        ))}
        {/* arrow on the latest ROS point, tilted along the line */}
        <div style={{ position: "absolute", right: 0, top: `${ye}%`, transform: "translate(50%,-50%)", opacity: 0, animation: "dotIn .25s ease-out .95s forwards" }}>
          <svg width="13" height="13" viewBox="0 0 12 12" style={{ display: "block", overflow: "visible", transform: `rotate(${arrowAng}deg)` }}>
            <path d="M3 2 L9 6 L3 10" fill="none" stroke="var(--pop-warm)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div style={{ display: "flex", gap: dense ? 2 : 3, marginTop: 4 }}>
        {labels.map((l, i) => { const show = !dense || i % 3 === 0 || i === n - 1; return <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 7.5, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden" }}>{show ? l : ""}</div>; })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 7, fontSize: 9, color: "var(--text-3)" }}>
        <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--pop-cool)", borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />accounts</span>
        <span><span style={{ display: "inline-block", width: 12, height: 2, background: "var(--pop-warm)", marginRight: 3, verticalAlign: "middle" }} />ROS / mo</span>
      </div>
    </div>
  );
}
