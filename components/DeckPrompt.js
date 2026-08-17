"use client";
import { useEffect, useRef, useState } from "react";
const ChevronDown = ({ size = 13, strokeWidth = 2.2, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
);

// Pre-build prompt for the business review: pick the volume timeframe and its
// comparison point, then build. Two rules are baked in and shown to the user:
// distribution metrics always read the latest 90 days, and rate of sale is
// always computed on the current 90 days — the timeframe moves volume only.
// YTD has no "previous period", so it always compares to prior year.
const TIMEFRAMES = [["90D", "90D (QTR)"], ["YTD", "YTD"], ["L6M", "L6M"]];
const COMPARES = [["prev", "vs Previous"], ["yoy", "vs Prior Year"]];

// quiet label-plus-chevron dropdown (the "Best ▾ / Everywhere ▾" pattern):
// no pill chrome on the trigger, an anchored option list below.
function GhostSelect({ label, value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const cur = options.find(o => o[0] === value);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => { if (!disabled) setOpen(o => !o); }} aria-label={label}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: open ? "#f1f2ee" : "transparent",
          borderRadius: 9, padding: "7px 10px", cursor: disabled ? "default" : "pointer", fontFamily: "inherit",
          fontSize: 13, fontWeight: 600, color: disabled ? "var(--text-3)" : "var(--text)", transition: "background .12s" }}
        onMouseEnter={e => { if (!disabled && !open) e.currentTarget.style.background = "#f4f5f1"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}>
        {cur ? cur[1] : value}
        <ChevronDown size={13} strokeWidth={2.2} style={{ color: "var(--text-3)", marginTop: 1 }} />
      </button>
      {open && (
        <div className="nobar" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 30, minWidth: 168,
          background: "var(--surface)", border: "0.5px solid var(--border-strong)", borderRadius: 12,
          boxShadow: "var(--shadow-pop, 0 10px 30px rgba(40,40,30,.16))", padding: 5, animation: "fsPop .14s ease" }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-3)", padding: "5px 9px 4px" }}>{label}</div>
          {options.map(([v, lbl, note]) => {
            const seld = v === value;
            return (
              <button type="button" key={v} onClick={() => { onChange(v); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  fontSize: 12.5, fontFamily: "inherit", cursor: "pointer", border: "none", borderRadius: 9, marginBottom: 1,
                  padding: "8px 10px", background: seld ? "#f1f2ee" : "transparent",
                  color: "var(--text)", fontWeight: seld ? 700 : 400 }}>
                <span>{lbl}{note ? <span style={{ display: "block", fontSize: 9.5, fontWeight: 400, color: "var(--text-3)", marginTop: 1 }}>{note}</span> : null}</span>
                {seld && <span aria-hidden="true" style={{ flexShrink: 0, color: "#8f957f", fontWeight: 700 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DeckPrompt({ scope, universe, busy, err, onBuild, onClose }) {
  const [tfKey, setTfKey] = useState("90D");   // default: the 90-day quarter…
  const [cmp, setCmp] = useState("prev");      // …against the previous 90
  const [which, setWhich] = useState("sel");   // deck covers the current selection by default
  const pickTf = k => { setTfKey(k); if (k === "YTD") setCmp("yoy"); };   // YTD only compares to prior year
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  const compares = tfKey === "YTD"
    ? [["yoy", "vs Prior Year", "YTD always compares to last year"]]
    : COMPARES;
  const active = which === "uni" && universe ? universe : scope;
  const scopeRow = (key, s) => {
    if (!s) return null;
    const on = which === key;
    return (
      <button type="button" key={key} onClick={() => setWhich(key)}
        style={{ display: "flex", alignItems: "flex-start", gap: 9, width: "100%", textAlign: "left", border: on ? "1px solid #c9cec1" : "1px solid var(--border, #E9EBE8)",
          background: on ? "#f1f2ee" : "transparent", borderRadius: 11, padding: "9px 11px", cursor: "pointer", fontFamily: "inherit" }}>
        <span style={{ flexShrink: 0, width: 13, height: 13, marginTop: 2, borderRadius: 999, border: on ? "4px solid #5c6353" : "1.5px solid #c9cec1", boxSizing: "border-box", background: "#fff" }} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
            {key === "sel" ? "This selection" : "Whole book"}
            <span style={{ fontWeight: 500, color: "var(--text-3)" }}> · {(s.n || 0).toLocaleString()} accounts</span>
          </span>
          <span style={{ display: "block", fontSize: 10.5, color: "var(--text-3)", marginTop: 1, lineHeight: 1.35 }}>{s.name}{s.sub ? ` · ${s.sub}` : ""}</span>
        </span>
      </button>
    );
  };
  return (
    <div onClick={() => { if (!busy) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(30,34,28,.32)",
      display: "flex", alignItems: "center", justifyContent: "center", animation: "fsPop .14s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 392, maxWidth: "calc(100vw - 40px)", background: "var(--surface, #fff)",
        border: "1px solid #e7e8ec", borderRadius: 16, boxShadow: "0 24px 60px -18px rgba(30,34,28,.35)", padding: "20px 22px 18px", fontFamily: "var(--font-sans)" }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase", color: "var(--text-3)" }}>Shareable report</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginTop: 3 }}>{active ? active.name : ""}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>Business review · exports to PowerPoint or PDF from the preview</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
          {scopeRow("sel", scope)}
          {universe && scopeRow("uni", universe)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)" }}>Key Timeframe:</span>
            <GhostSelect label="Key timeframe" value={tfKey} options={TIMEFRAMES} onChange={pickTf} />
          </div>
          <div style={{ height: 1, background: "var(--border, #E9EBE8)" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)" }}>Comparison point:</span>
            <GhostSelect label="Comparison point" value={cmp} options={compares} onChange={setCmp} />
          </div>
        </div>

        <div style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.45, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border, #E9EBE8)" }}>
          Timeframe applies to volume. Placements and other distribution counts always read the latest 90 days, and rate of sale is always the current 90-day figure.
        </div>

        {err && <div style={{ fontSize: 11, color: "var(--down, #c0564e)", marginTop: 9 }}>Couldn&rsquo;t build the report. {err}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button type="button" onClick={() => { if (!busy) onClose(); }}
            style={{ border: "none", background: "transparent", color: "var(--text-3)", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", padding: "8px 12px", borderRadius: 10, cursor: busy ? "default" : "pointer" }}>
            Cancel
          </button>
          {/* small-sample warning — a handful of accounts can't carry a trend (Joe, 2026-08-16) */}
          {active && active.n != null && active.n < 5 && (
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: "#f8f1e0", border: "0.5px solid #e6d9b8", borderRadius: 10, padding: "9px 12px", marginBottom: 10 }}>
              <span style={{ fontSize: 13, lineHeight: 1.1, color: "#9c7420" }}>&#9888;</span>
              <span style={{ fontSize: 11.5, lineHeight: 1.4, color: "#6b5a2e" }}>
                <b>Small sample.</b> This selection covers {active.n} account{active.n === 1 ? "" : "s"} — percentages and trends can swing hard on a single order. Read the numbers as a snapshot, not a trend.
              </span>
            </div>
          )}
          <button type="button" disabled={busy} onClick={() => onBuild({ key: tfKey, cmp: tfKey === "YTD" ? "yoy" : cmp, which })}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "0.5px solid #cfe0d4", background: "#eef4ee", color: "#2f6b46",
              fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", padding: "8px 16px", borderRadius: 10, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Building…" : "Build Deck"}
          </button>
        </div>
      </div>
    </div>
  );
}
