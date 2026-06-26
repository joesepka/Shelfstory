"use client";
import { useState } from "react";

// Shared filter control: a uniform pill that opens a bottom-sheet option list.
// - label: placeholder shown when nothing is selected (and the sheet title)
// - value / options / onChange: controlled selection
// - display(opt): formats an option for display (defaults to String)
// - allValue: the "no filter" value (default "All"); when set, the pill goes
//   accent-active and shows a ✕ to clear without opening the sheet.
export default function FilterSelect({ label, value, options, onChange, display, allValue = "All" }) {
  const [open, setOpen] = useState(false);
  const fmt = display || (o => String(o));
  const active = value !== allValue;
  const pick = (o) => { onChange(o); setOpen(false); };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label}
        style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 5,
          fontSize: 11.5, fontWeight: active ? 700 : 500, padding: "8px 11px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
          border: active ? "1px solid var(--accent)" : "0.5px solid var(--border-strong)",
          background: active ? "var(--accent-soft)" : "var(--surface)", color: active ? "var(--accent-deep)" : "var(--text-2)" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active ? fmt(value) : label}</span>
        {active
          ? <span role="button" aria-label={`Clear ${label}`} onClick={(e) => { e.stopPropagation(); onChange(allValue); }} style={{ flexShrink: 0, fontWeight: 700, fontSize: 11, opacity: .75 }}>✕</span>
          : <span aria-hidden="true" style={{ flexShrink: 0, fontSize: 9, opacity: .5 }}>▾</span>}
      </button>
      {open && (
        <div onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label={label}
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(30,28,22,.34)", animation: "fsFade .18s ease",
            display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--surface)", borderTopLeftRadius: 18, borderTopRightRadius: 18, maxWidth: "var(--maxw)", width: "100%",
              margin: "0 auto", maxHeight: "72vh", display: "flex", flexDirection: "column", animation: "fsUp .26s cubic-bezier(.22,1,.36,1)",
              boxShadow: "0 -8px 30px rgba(40,40,30,.18)" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 9 }}>
              <div style={{ width: 38, height: 4, borderRadius: 2, background: "var(--border-strong)" }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .4, textTransform: "uppercase", color: "var(--text-3)", padding: "10px 18px 4px" }}>{label}</div>
            <div style={{ overflowY: "auto", padding: "2px 8px 16px", WebkitOverflowScrolling: "touch" }}>
              {options.map((o) => {
                const seld = o === value;
                return (
                  <button type="button" key={String(o)} onClick={() => pick(o)}
                    style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                      fontSize: 14.5, fontFamily: "inherit", cursor: "pointer", border: "none", borderRadius: 11, marginBottom: 1,
                      padding: "12px 13px", background: seld ? "var(--accent-soft)" : "transparent",
                      color: seld ? "var(--accent-deep)" : "var(--text)", fontWeight: seld ? 700 : 400 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmt(o)}</span>
                    {seld && <span aria-hidden="true" style={{ flexShrink: 0, color: "var(--accent)", fontWeight: 700 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
