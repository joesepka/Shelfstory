"use client";
// Sell-story generator — Cupertino look (hardcoded so it reads the same in any skin).
// Reacts live to the account's real items + the retailer-margin dropdown using the
// Datum price list. Lift %s are editable estimates; area-story figures are demo
// placeholders until the peer/pricing data is wired. No emojis — inline SVG icons.
import { useMemo, useState } from "react";

const CU = {
  card: "#ffffff", inset: "#f5f5f7", text: "#1d1d1f", sub: "#515154", mut: "#86868b",
  line: "#e8e8ed", green: "#30b36b", greenDeep: "#249b5b", greenSoft: "#e3f5ec",
  blue: "#3a86c8", blueSoft: "#e6f0fa", amber: "#e0a83a", amberSoft: "#fbf0d6",
  shadow: "0 2px 12px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.05)",
};
const usd = n => "$" + Math.round(n).toLocaleString();
const wholeOf = name => { const s = String(name || "").toUpperCase(); if (s.includes("SOUR APPLE") || s.includes("TROPICAL")) return 33; if (s.includes("VARIETY")) return 26; return 30; };
const MARKUP = 1.27; // distributor: retail = wholesale × 1.27
const perCase = (name, margin) => { const w = wholeOf(name), retail = w * MARKUP; return { whole: w, retail, dist: retail - w, retailer: retail * (margin / (1 - margin)) }; };
const LIFT = { cold: 0.15, disp: 0.25, promo: 0.30 };
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function Ico({ name, c }) {
  const p = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "cold") return <svg {...p}><path d="M12 2v20M4 7l8 5 8-5M4 17l8-5 8 5M12 2l0 0M5 12h14" /></svg>;
  if (name === "disp") return <svg {...p} fill={c} stroke="none"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></svg>;
  if (name === "promo") return <svg {...p}><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /><line x1="6" y1="18" x2="18" y2="6" /></svg>;
  if (name === "store") return <svg {...p}><path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M4 9h16" /></svg>;
  if (name === "bolt") return <svg {...p} fill={c} stroke="none"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>;
  return null;
}

export default function SellStory({ acc, items = [], white = [] }) {
  const [open, setOpen] = useState(false);
  const [margin, setMargin] = useState(0.30);
  const [place, setPlace] = useState({});
  const tog = (pk, k) => setPlace(p => ({ ...p, [pk]: { ...(p[pk] || {}), [k]: !(p[pk]?.[k]) } }));

  const carried = useMemo(() => items.filter(i => (i.l90 || 0) > 0).sort((a, b) => (b.l90 || 0) - (a.l90 || 0)), [items]);

  const margins = useMemo(() => {
    let brand = 0, dist = 0, ret = 0;
    const rows = carried.map(i => {
      const csMo = (i.l90 || 0) / 3, pc = perCase(i.item_name, margin);
      brand += csMo * pc.whole; dist += csMo * pc.dist; ret += csMo * pc.retailer;
      return { name: i.item_name, csMo, ret: csMo * pc.retailer };
    });
    return { rows, brand, dist, ret, tot: brand + dist + ret };
  }, [carried, margin]);

  const opps = useMemo(() => {
    const out = [];
    for (const i of carried) {
      const csMo = (i.l90 || 0) / 3, pc = perCase(i.item_name, margin).retailer;
      const pl = place[i.product_key] || {};
      let lever;
      if (!pl.cold && !pl.disp) lever = "disp";
      else if (!pl.cold) lever = "cold";
      else if (!pl.disp) lever = "disp";
      else lever = "promo";
      out.push({ name: i.item_name, csMo, lever, lift: LIFT[lever], dollars: csMo * LIFT[lever] * pc });
    }
    return out.sort((a, b) => b.dollars - a.dollars).slice(0, 3);
  }, [carried, margin, place]);

  const ws = useMemo(() => {
    const avg = mean(carried.map(i => (i.l90 || 0) / 3));
    const vel = Math.max(2, Math.round(avg * 0.7));
    return white.slice(0, 4).map((w, idx) => {
      const v = Math.max(2, vel - idx); // taper a touch by market position
      return { name: w.item_name, vel: v, dollars: v * perCase(w.item_name, margin).retailer };
    });
  }, [white, carried, margin]);

  const oppSum = opps.reduce((s, o) => s + o.dollars, 0);
  const wsSum = ws.reduce((s, o) => s + o.dollars, 0);
  const potMo = oppSum + wsSum;
  const chan = String(acc?.channel || "store").toLowerCase();
  const topMover = carried[0]?.item_name;

  const LEVER = { cold: { ico: "cold", c: CU.blue, soft: CU.blueSoft, label: "Move to the cold box" }, disp: { ico: "disp", c: CU.green, soft: CU.greenSoft, label: "Put on display" }, promo: { ico: "promo", c: CU.amber, soft: CU.amberSoft, label: "Run a promo on" } };

  if (!open) {
    return (
      <div style={{ marginBottom: 14 }}>
        <button onClick={() => setOpen(true)} style={{ width: "100%", border: "none", borderRadius: 14, padding: "13px 16px", background: CU.green, color: "#fff", fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", boxShadow: "0 4px 14px rgba(48,179,107,.32)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "-0.2px" }}>
          <Ico name="bolt" c="#fff" /> Generate sell story
        </button>
      </div>
    );
  }

  const Card = ({ children, style }) => <div style={{ background: CU.card, border: `1px solid ${CU.line}`, borderRadius: 16, padding: "14px 15px", boxShadow: CU.shadow, marginBottom: 10, ...style }}>{children}</div>;
  const Cap = ({ children, c }) => <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "-0.1px", color: c || CU.mut, textTransform: "none" }}>{children}</div>;
  const Est = () => <span style={{ fontSize: 8.5, fontWeight: 800, color: CU.mut, background: CU.inset, borderRadius: 5, padding: "1px 5px", letterSpacing: 0.3 }}>EST</span>;

  return (
    <div style={{ fontFamily: "var(--font-sans)", marginBottom: 14, animation: "riseIn .35s cubic-bezier(.2,.7,.2,1) both" }}>
      {/* header + inputs */}
      <Card style={{ background: "linear-gradient(180deg,#f4faf6,#ffffff)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: CU.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ico name="bolt" c="#fff" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: CU.text, letterSpacing: "-0.3px" }}>Sell story</div>
            <div style={{ fontSize: 11.5, color: CU.mut, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{acc?.account_name}</div>
          </div>
          <button onClick={() => setOpen(false)} style={{ border: "none", background: CU.inset, color: CU.sub, borderRadius: 20, fontSize: 12, fontWeight: 600, padding: "5px 11px", cursor: "pointer", fontFamily: "inherit" }}>Close</button>
        </div>
        <div style={{ marginTop: 12, borderTop: `1px solid ${CU.line}`, paddingTop: 11, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <Cap c={CU.sub}>Retailer margin</Cap>
          <select value={margin} onChange={e => setMargin(Number(e.target.value))} style={{ fontSize: 12.5, fontWeight: 700, color: CU.text, background: CU.inset, border: `1px solid ${CU.line}`, borderRadius: 9, padding: "6px 10px", fontFamily: "inherit", cursor: "pointer" }}>
            <option value={0.25}>25%</option><option value={0.30}>30%</option><option value={0.35}>35%</option>
          </select>
        </div>
        <div style={{ marginTop: 10 }}>
          <Cap c={CU.mut}>Current placement — tap what's already set</Cap>
          <div style={{ marginTop: 7, display: "flex", flexDirection: "column", gap: 6 }}>
            {carried.slice(0, 4).map(i => {
              const pl = place[i.product_key] || {};
              const Pill = ({ k, ico, label }) => (
                <button onClick={() => tog(i.product_key, k)} style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 10.5, fontWeight: 700, borderRadius: 8, padding: "4px 8px", background: pl[k] ? (k === "cold" ? CU.blueSoft : CU.greenSoft) : CU.inset, color: pl[k] ? (k === "cold" ? CU.blue : CU.greenDeep) : CU.mut }}>
                  <Ico name={ico} c={pl[k] ? (k === "cold" ? CU.blue : CU.greenDeep) : CU.mut} /> {label}
                </button>
              );
              return (
                <div key={i.product_key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: CU.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.item_name}</span>
                  <Pill k="cold" ico="cold" label="Cold box" />
                  <Pill k="disp" ico="disp" label="Display" />
                </div>
              );
            })}
            {carried.length > 4 && <span style={{ fontSize: 10.5, color: CU.mut }}>+ {carried.length - 4} more items…</span>}
          </div>
        </div>
      </Card>

      {/* potential headline */}
      <Card style={{ background: CU.green, border: "none", boxShadow: "0 6px 18px rgba(48,179,107,.28)" }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>Estimated upside for this account</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>{usd(potMo)}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.85)" }}>/mo</span>
          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "#fff" }}>≈ {usd(potMo * 12)}/yr</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.8)", marginTop: 3 }}>moves {usd(oppSum)} · whitespace {usd(wsSum)} · margin held</div>
      </Card>

      {/* MARGIN BOX */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Cap c={CU.text}>Margin · per month</Cap>
          <span style={{ fontSize: 11.5, color: CU.mut }}>at {Math.round(margin * 100)}% retail margin</span>
        </div>
        <div style={{ display: "flex", height: 26, borderRadius: 8, overflow: "hidden", margin: "10px 0 6px", fontSize: 10, fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: "26px" }}>
          <div style={{ width: `${(100 * margins.brand / margins.tot) || 0}%`, background: "#7cc6a0" }} title="Brand">Brand</div>
          <div style={{ width: `${(100 * margins.dist / margins.tot) || 0}%`, background: CU.blue }} title="Distributor">Dist</div>
          <div style={{ width: `${(100 * margins.ret / margins.tot) || 0}%`, background: CU.green }} title="Retailer">You</div>
        </div>
        <div style={{ display: "flex", gap: 8, fontSize: 11.5, color: CU.sub, marginBottom: 8 }}>
          <span>Brand <b style={{ color: CU.text }}>{usd(margins.brand)}</b></span>
          <span>Dist <b style={{ color: CU.text }}>{usd(margins.dist)}</b></span>
          <span>Retailer <b style={{ color: CU.greenDeep }}>{usd(margins.ret)}</b></span>
        </div>
        {margins.rows.slice(0, 5).map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", fontSize: 12, padding: "5px 0", borderTop: `1px solid ${CU.line}` }}>
            <span style={{ flex: 1, minWidth: 0, color: CU.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
            <span style={{ color: CU.mut, width: 56, textAlign: "right" }}>{r.csMo.toFixed(1)} cs/mo</span>
            <span style={{ color: CU.greenDeep, fontWeight: 700, width: 64, textAlign: "right" }}>{usd(r.ret)}/mo</span>
          </div>
        ))}
      </Card>

      {/* OPPORTUNITIES */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Cap c={CU.text}>Opportunities · in dollars</Cap>
          <span style={{ fontSize: 11.5, color: CU.mut }}>lifts are <Est /></span>
        </div>
        <div style={{ marginTop: 4 }}>
          {opps.map((o, i) => { const L = LEVER[o.lever]; return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${CU.line}` }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: L.soft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ico name={L.ico} c={L.c} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: CU.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{L.label} <b>{o.name}</b></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: CU.inset, overflow: "hidden", maxWidth: 90 }}><span style={{ display: "block", height: "100%", width: `${o.lift / 0.3 * 100}%`, background: L.c, borderRadius: 3 }} /></div>
                  <span style={{ fontSize: 10.5, color: CU.mut }}>{o.csMo.toFixed(1)} cs/mo · +{Math.round(o.lift * 100)}%</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: CU.greenDeep }}>+{usd(o.dollars)}</div>
                <div style={{ fontSize: 10.5, color: CU.mut }}>+{usd(o.dollars * 12)}/yr</div>
              </div>
            </div>
          ); })}
        </div>
      </Card>

      {/* WHITESPACE */}
      {ws.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Cap c={CU.text}>Whitespace · selling nearby, not here</Cap>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: CU.greenDeep }}>+{usd(wsSum)}/mo</span>
          </div>
          <div style={{ fontSize: 11, color: CU.mut, margin: "3px 0 7px" }}>at the median velocity of in-city {chan}s that carry it <Est /></div>
          {ws.map((w, i) => { const mx = Math.max(...ws.map(x => x.dollars)); return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: `1px solid ${CU.line}` }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: CU.text, width: 116, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: CU.inset, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${mx ? (w.dollars / mx * 100) : 0}%`, background: CU.blue, borderRadius: 3 }} /></div>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: CU.greenDeep, width: 64, textAlign: "right", flexShrink: 0 }}>+{usd(w.dollars)}</span>
            </div>
          ); })}
        </Card>
      )}

      {/* THE STORY */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Cap c={CU.text}>The story · your area</Cap>
          <span style={{ fontSize: 10.5, color: CU.mut }}>Chicago {chan}s, anonymized</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "12px 0 6px" }}>
          <svg width="56" height="56" viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
            <circle cx="28" cy="28" r="21" fill="none" stroke={CU.line} strokeWidth="6" />
            <circle cx="28" cy="28" r="21" fill="none" stroke={CU.green} strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 21} strokeDashoffset={2 * Math.PI * 21 * (1 - 0.73)} transform="rotate(-90 28 28)" />
            <text x="28" y="32" textAnchor="middle" fontSize="14" fontWeight="800" fill={CU.text}>73%</text>
          </svg>
          <div style={{ fontSize: 12.5, color: CU.sub, lineHeight: 1.4 }}>Datum reaches an estimated <b style={{ color: CU.text }}>73%</b> of {chan}s in your area — and the cooler sets are pulling ahead.</div>
        </div>
        {[
          ["store", `A nearby ${chan} added ${white[0]?.item_name || "a new flavor"} and grew Datum ~38% in 4 months.`],
          ["bolt", "Energy is the fastest-growing category in your area, about +18% YoY."],
          ["disp", topMover ? `${topMover} is a top mover nearby — sells roughly 2× faster where it's chilled.` : "Chilled placements move roughly 2× faster nearby."],
        ].map(([ic, t], i) => (
          <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "7px 0", borderTop: `1px solid ${CU.line}` }}>
            <span style={{ marginTop: 1, flexShrink: 0 }}><Ico name={ic} c={CU.mut} /></span>
            <span style={{ fontSize: 12.5, color: CU.sub, lineHeight: 1.4 }}>{t}</span>
          </div>
        ))}
        <div style={{ fontSize: 10, color: CU.mut, marginTop: 8, fontStyle: "italic" }}>Area figures are demo placeholders — wire to live peers next.</div>
      </Card>

      {/* TAGGING TRAY (stubs) */}
      <Card style={{ background: CU.inset, border: `1px dashed ${CU.line}`, boxShadow: "none" }}>
        <Cap c={CU.sub}>After the call · tag what happened <span style={{ fontSize: 8.5, fontWeight: 800, color: CU.mut, background: "#fff", borderRadius: 5, padding: "1px 5px" }}>SOON</span></Cap>
        <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
          {[["cold", "Tag on display + dates"], ["store", "Tag new sell-in"], ["disp", "Tag a metric"]].map(([ic, t], i) => (
            <button key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${CU.line}`, background: "#fff", color: CU.sub, borderRadius: 10, padding: "7px 11px", fontSize: 11.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}><Ico name={ic} c={CU.mut} /> {t}</button>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: CU.mut, marginTop: 8 }}>These log to teach the model — over time the “est.” lifts get replaced by your measured results.</div>
      </Card>
    </div>
  );
}
