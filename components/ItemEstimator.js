"use client";
// Item Upgrade Estimator. Pick an item → its profit/month Non-Display vs Display
// (a +20% display uplift), shown as two stat tiles. Uplift is a historical-metric estimate.
import { useMemo, useState } from "react";
import { profitPerCase } from "../lib/pricing";
import FilterSelect from "./FilterSelect";

const usd = n => "$" + Math.round(n).toLocaleString();   // values are pre-rounded to $5
const DISPLAY = 0.20;

export default function ItemEstimator({ items = [], wsReal = [] }) {
  const carried = useMemo(() => items.filter(i => (i.l90 || 0) > 0).sort((a, b) => (b.l90 || 0) - (a.l90 || 0)), [items]);
  const options = useMemo(() => {
    const seen = new Set(), out = [];
    for (const i of carried) if (!seen.has(i.item_name)) { seen.add(i.item_name); out.push({ name: i.item_name, csMo: (i.l90 || 0) / 3, here: true }); }
    for (const w of wsReal) if (!seen.has(w.name)) { seen.add(w.name); out.push({ name: w.name, csMo: w.vel, here: false }); }
    return out;
  }, [carried, wsReal]);

  const [sel, setSel] = useState("");
  const cur = options.find(o => o.name === sel) || options[0];
  const carriedNames = useMemo(() => new Set(carried.map(i => i.item_name)), [carried]);
  if (!cur) return null;

  const pc = profitPerCase(cur.name, 0.30);
  const r5 = n => Math.round(n / 5) * 5;
  const nowD = r5(cur.csMo * pc);
  let dispD = Math.ceil(cur.csMo * (1 + DISPLAY) * pc / 5) * 5;   // display uplift rounds UP...
  if (dispD <= nowD) dispD = nowD + 5;                            // ...and never ties the non-display number
  const SCN = [
    { l: "Non-Display", cs: cur.csMo, d: nowD },
    { l: "Display", lift: "+20%", cs: cur.csMo * (1 + DISPLAY), d: dispD },
  ];
  const base = nowD;

  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow-sm)", padding: "14px 15px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.3 }}>Item upgrade</div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Est. profit / month — with vs without a display · based on historical performance.</div>
      <div style={{ marginTop: 9 }}>
        <FilterSelect plain label="Item" value={cur.name} options={options.map(o => o.name)} onChange={setSel}
          display={n => carriedNames.has(n) ? n : `${n} · not carried`}
          style={{ width: "100%", maxWidth: "none", minWidth: 0, fontSize: 13.5, fontWeight: 600, padding: "10px 14px" }} />
      </div>
      <div style={{ display: "flex", marginTop: 11 }}>
        {SCN.map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", padding: "2px 6px", borderLeft: i > 0 ? "0.5px solid var(--border)" : "none" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-2)", whiteSpace: "nowrap" }}>{s.l}{s.lift ? <span style={{ color: "var(--gold)" }}> {s.lift}</span> : null}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px", fontFeatureSettings: '"tnum" 1', marginTop: 3 }}>{usd(s.d)}</div>
            <div style={{ fontSize: 9.5, color: "var(--text-3)" }}>{s.cs.toFixed(1)} cs/mo</div>
            <div style={{ fontSize: 10.5, fontWeight: 800, marginTop: 2, color: i > 0 ? "var(--accent-deep)" : "var(--text-3)" }}>{i > 0 ? `+${usd(s.d - base)}/mo` : "current"}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-3)", textAlign: "center", marginTop: 8 }}>per month vs non-display · lift is an estimate</div>
    </div>
  );
}
