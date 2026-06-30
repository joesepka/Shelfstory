"use client";
// Account tagging — Cupertino look. A button that opens a tray to (eventually)
// pick account-level metrics that stick with the account, and mark any item
// (carried or whitespace) as "sold in" so we can track it. Toggles are local
// state only for now — persistence wires up later.
import { useMemo, useState } from "react";

const CU = {
  card: "#ffffff", inset: "#f5f5f7", text: "#1d1d1f", sub: "#515154", mut: "#86868b",
  line: "#e8e8ed", green: "#30b36b", greenDeep: "#249b5b", greenSoft: "#e3f5ec",
  shadow: "0 2px 12px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.05)",
};
const SOON = () => <span style={{ fontSize: 8.5, fontWeight: 800, color: CU.mut, background: CU.inset, borderRadius: 5, padding: "1px 5px", letterSpacing: 0.3 }}>SOON</span>;

export default function AccountTag({ acc, items = [], white = [] }) {
  const [open, setOpen] = useState(false);
  const [soldIn, setSoldIn] = useState({});

  const list = useMemo(() => {
    const seen = new Set(), out = [];
    for (const i of items) if (!seen.has(i.item_name)) { seen.add(i.item_name); out.push({ name: i.item_name, carried: (i.l90 || 0) > 0 }); }
    for (const w of white) if (!seen.has(w.item_name)) { seen.add(w.item_name); out.push({ name: w.item_name, carried: false }); }
    return out;
  }, [items, white]);

  const tog = name => setSoldIn(s => ({ ...s, [name]: !s[name] }));
  const count = Object.values(soldIn).filter(Boolean).length;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ width: "100%", border: `1px solid ${CU.line}`, borderRadius: 14, padding: "12px 16px", background: "#fff", color: CU.text, fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", boxShadow: CU.shadow, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, letterSpacing: "-0.2px" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={CU.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.6 13.4 11 3.8a2 2 0 0 0-1.4-.6H4v5.6a2 2 0 0 0 .6 1.4l9.6 9.6a2 2 0 0 0 2.8 0l3.6-3.6a2 2 0 0 0 0-2.8Z" /><circle cx="7.5" cy="7.5" r="1.2" fill={CU.sub} /></svg>
        Account tag
      </button>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)", animation: "riseIn .35s cubic-bezier(.2,.7,.2,1) both" }}>
      <div style={{ background: CU.card, border: `1px solid ${CU.line}`, borderRadius: 16, padding: "14px 15px", boxShadow: CU.shadow }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: CU.text, letterSpacing: "-0.3px" }}>Account tag</div>
            <div style={{ fontSize: 11.5, color: CU.mut }}>Mark what's true at this account — saves with it soon</div>
          </div>
          <button onClick={() => setOpen(false)} style={{ border: "none", background: CU.inset, color: CU.sub, borderRadius: 20, fontSize: 12, fontWeight: 600, padding: "5px 11px", cursor: "pointer", fontFamily: "inherit" }}>Close</button>
        </div>

        {/* metrics that stick with the account */}
        <div style={{ marginTop: 12, borderTop: `1px solid ${CU.line}`, paddingTop: 11 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CU.sub }}>Account metrics <SOON /></div>
          <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap" }}>
            {["Cooler doors", "Has display space", "Key decision-maker", "Pays on time", "Promo-friendly"].map((m, i) => (
              <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: CU.mut, background: CU.inset, border: `1px dashed ${CU.line}`, borderRadius: 9, padding: "6px 10px" }}>{m}</span>
            ))}
            <span style={{ fontSize: 11.5, fontWeight: 700, color: CU.greenDeep, background: CU.greenSoft, borderRadius: 9, padding: "6px 10px" }}>+ Add metric</span>
          </div>
        </div>

        {/* sold-in tracker for every item */}
        <div style={{ marginTop: 14, borderTop: `1px solid ${CU.line}`, paddingTop: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: CU.sub }}>Items — mark what's sold in</span>
            {count > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: CU.greenDeep }}>{count} tagged</span>}
          </div>
          <div style={{ marginTop: 8 }}>
            {list.map((it, i) => {
              const on = !!soldIn[it.name];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderTop: i ? `1px solid ${CU.line}` : "none" }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: CU.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: it.carried ? CU.greenDeep : CU.mut, background: it.carried ? CU.greenSoft : CU.inset, borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>{it.carried ? "Carried" : "Whitespace"}</span>
                  <button onClick={() => tog(it.name)} style={{ flexShrink: 0, border: `1px solid ${on ? CU.green : CU.line}`, background: on ? CU.green : "#fff", color: on ? "#fff" : CU.sub, borderRadius: 9, fontSize: 11.5, fontWeight: 700, padding: "5px 11px", cursor: "pointer", fontFamily: "inherit", minWidth: 78 }}>{on ? "Sold in ✓" : "Sold in"}</button>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 10.5, color: CU.mut, marginTop: 9, fontStyle: "italic" }}>Tags aren't saved yet — they'll persist with the account and teach the model next.</div>
        </div>
      </div>
    </div>
  );
}
