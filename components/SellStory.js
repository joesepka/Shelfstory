"use client";
// Sell-story generator — Cupertino look (hardcoded so it reads the same in any skin).
// Margin dropdown + a brief on what the account earns, then an item explorer: pick
// an item → 3 velocity graphs (at-account / cold box +15% / promo +20%) with the
// retailer $/mo each generates and a comparison, then top-5 whitespace, then a
// simple city story. Lift %s + area figures are estimates pending live data. No emojis.
import { useMemo, useState } from "react";

const CU = {
  card: "#ffffff", inset: "#f5f5f7", text: "#1d1d1f", sub: "#515154", mut: "#86868b",
  line: "#e8e8ed", green: "#30b36b", greenDeep: "#249b5b", greenSoft: "#e3f5ec",
  blue: "#3a86c8", blueSoft: "#e6f0fa", grey: "#c7ccd2",
  shadow: "0 2px 12px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.05)",
};
const usd = n => "$" + Math.round(n).toLocaleString();
const wholeOf = name => { const s = String(name || "").toUpperCase(); if (s.includes("SOUR APPLE") || s.includes("TROPICAL")) return 33; if (s.includes("VARIETY")) return 26; return 30; };
const MARKUP = 1.27;
const retailerCase = (name, margin) => { const retail = wholeOf(name) * MARKUP; return retail * (margin / (1 - margin)); };
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const COLD = 0.15, PROMO = 0.20;
const PATTERN = [0.82, 0.9, 0.8, 0.94, 0.86, 0.97, 1.0, 0.93, 1.06, 1.0, 1.1, 1.16];

function Bolt({ c }) { return <svg width="15" height="15" viewBox="0 0 24 24" fill={c} stroke="none"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>; }
function MiniBars({ vals, max, color }) {
  const W = 240, H = 38, n = vals.length, slot = W / n, bw = slot * 0.6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden="true">
      {vals.map((v, i) => { const h = Math.max(2, (v / (max || 1)) * (H - 3)); return <rect key={i} x={(i * slot + (slot - bw) / 2).toFixed(1)} y={(H - h).toFixed(1)} width={bw.toFixed(1)} height={h.toFixed(1)} rx="1.5" fill={color} />; })}
    </svg>
  );
}

export default function SellStory({ acc, items = [], white = [] }) {
  const [open, setOpen] = useState(false);
  const [margin, setMargin] = useState(0.30);

  const carried = useMemo(() => items.filter(i => (i.l90 || 0) > 0).sort((a, b) => (b.l90 || 0) - (a.l90 || 0)), [items]);
  const areaAvg = useMemo(() => mean(carried.map(i => (i.l90 || 0) / 3)) || 5, [carried]);

  // item options = carried + whitespace, de-duped by name
  const options = useMemo(() => {
    const seen = new Set(), out = [];
    for (const i of carried) { if (!seen.has(i.item_name)) { seen.add(i.item_name); out.push({ name: i.item_name, csMo: (i.l90 || 0) / 3, here: true }); } }
    for (const w of white) { if (!seen.has(w.item_name)) { seen.add(w.item_name); out.push({ name: w.item_name, csMo: areaAvg * 0.75, here: false }); } }
    return out;
  }, [carried, white, areaAvg]);

  const [sel, setSel] = useState("");
  const cur = options.find(o => o.name === sel) || options[0];

  const acctMo = useMemo(() => carried.reduce((s, i) => s + ((i.l90 || 0) / 3) * retailerCase(i.item_name, margin), 0), [carried, margin]);
  const brandMo = useMemo(() => carried.reduce((s, i) => s + ((i.l90 || 0) / 3) * wholeOf(i.item_name), 0), [carried, margin]);

  const explore = useMemo(() => {
    if (!cur) return null;
    const base = PATTERN.map(p => cur.csMo * p);
    const cold = base.map(v => v * (1 + COLD));
    const promo = base.map(v => v * (1 + PROMO));
    const max = Math.max(...promo, 1);
    const pc = retailerCase(cur.name, margin);
    return { base, cold, promo, max, dBase: cur.csMo * pc, dCold: cur.csMo * (1 + COLD) * pc, dPromo: cur.csMo * (1 + PROMO) * pc };
  }, [cur, margin]);

  const ws = useMemo(() => white.slice(0, 5).map((w, idx) => {
    const vel = Math.max(2, Math.round(areaAvg * 0.8) - idx);
    return { name: w.item_name, vel, dollars: vel * retailerCase(w.item_name, margin) };
  }), [white, areaAvg, margin]);
  const wsMax = Math.max(...ws.map(w => w.dollars), 1);
  const chan = String(acc?.channel || "store").toLowerCase();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ width: "100%", border: "none", borderRadius: 14, padding: "13px 16px", background: CU.green, color: "#fff", fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", boxShadow: "0 4px 14px rgba(48,179,107,.32)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "-0.2px", marginBottom: 10 }}>
        <Bolt c="#fff" /> Generate sell story
      </button>
    );
  }

  const Card = ({ children, style }) => <div style={{ background: CU.card, border: `1px solid ${CU.line}`, borderRadius: 16, padding: "14px 15px", boxShadow: CU.shadow, marginBottom: 10, ...style }}>{children}</div>;
  const Cap = ({ children, c }) => <div style={{ fontSize: 11, fontWeight: 700, color: c || CU.mut }}>{children}</div>;
  const Est = () => <span style={{ fontSize: 8.5, fontWeight: 800, color: CU.mut, background: CU.inset, borderRadius: 5, padding: "1px 5px", letterSpacing: 0.3 }}>EST</span>;

  const Graph = ({ title, vals, color, dollars, sub }) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: CU.text }}>{title} {sub}</span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: CU.greenDeep }}>{usd(dollars)}<span style={{ fontSize: 10, color: CU.mut, fontWeight: 600 }}>/mo</span></span>
      </div>
      <div style={{ marginTop: 4 }}><MiniBars vals={vals} max={explore.max} color={color} /></div>
    </div>
  );

  return (
    <div style={{ fontFamily: "var(--font-sans)", marginBottom: 10, animation: "riseIn .35s cubic-bezier(.2,.7,.2,1) both" }}>
      {/* header + margin */}
      <Card style={{ background: "linear-gradient(180deg,#f4faf6,#ffffff)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: CU.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Bolt c="#fff" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: CU.text, letterSpacing: "-0.3px" }}>Sell story</div>
            <div style={{ fontSize: 11.5, color: CU.mut, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{acc?.account_name}</div>
          </div>
          <button onClick={() => setOpen(false)} style={{ border: "none", background: CU.inset, color: CU.sub, borderRadius: 20, fontSize: 12, fontWeight: 600, padding: "5px 11px", cursor: "pointer", fontFamily: "inherit" }}>Close</button>
        </div>
        <div style={{ marginTop: 12, borderTop: `1px solid ${CU.line}`, paddingTop: 11, display: "flex", alignItems: "center", gap: 9 }}>
          <Cap c={CU.sub}>Retailer margin</Cap>
          <select value={margin} onChange={e => setMargin(Number(e.target.value))} style={{ fontSize: 12.5, fontWeight: 700, color: CU.text, background: CU.inset, border: `1px solid ${CU.line}`, borderRadius: 9, padding: "6px 10px", fontFamily: "inherit", cursor: "pointer" }}>
            <option value={0.25}>25%</option><option value={0.30}>30%</option><option value={0.35}>35%</option>
          </select>
        </div>
      </Card>

      {/* brief: what the account earns now */}
      <Card>
        <Cap c={CU.mut}>This account, at current pricing</Cap>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 3 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: CU.greenDeep, letterSpacing: "-0.8px" }}>{usd(acctMo)}</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: CU.sub }}>/mo in your margin</span>
        </div>
        <div style={{ fontSize: 11.5, color: CU.mut, marginTop: 2 }}>on {usd(brandMo)}/mo of Datum at {Math.round(margin * 100)}% retail margin</div>
      </Card>

      {/* item explorer */}
      {cur && explore && (
        <Card>
          <Cap c={CU.text}>Explore an item</Cap>
          <select value={cur.name} onChange={e => setSel(e.target.value)} style={{ width: "100%", marginTop: 8, fontSize: 13.5, fontWeight: 600, color: CU.text, background: "#fff", border: `1px solid ${CU.line}`, borderRadius: 10, padding: "9px 11px", fontFamily: "inherit", cursor: "pointer" }}>
            {options.map(o => <option key={o.name} value={o.name}>{o.name}{o.here ? "" : " · not carried"}</option>)}
          </select>
          <Graph title="Velocity" sub={<span style={{ fontSize: 10.5, fontWeight: 600, color: CU.mut }}>{cur.here ? "at this account" : "area average"}</span>} vals={explore.base} color={CU.grey} dollars={explore.dBase} />
          <Graph title="In cold box" sub={<span style={{ fontSize: 10.5, fontWeight: 700, color: CU.blue }}>+15% <Est /></span>} vals={explore.cold} color={CU.blue} dollars={explore.dCold} />
          <Graph title="On promo" sub={<span style={{ fontSize: 10.5, fontWeight: 700, color: CU.greenDeep }}>+20% <Est /></span>} vals={explore.promo} color={CU.green} dollars={explore.dPromo} />
          {/* comparison */}
          <div style={{ marginTop: 14, borderTop: `1px solid ${CU.line}`, paddingTop: 11 }}>
            <Cap c={CU.mut}>Retailer $/mo · compared</Cap>
            <div style={{ marginTop: 7, display: "flex", flexDirection: "column", gap: 6 }}>
              {[["Today", explore.dBase, CU.grey], ["Cold box", explore.dCold, CU.blue], ["Promo", explore.dPromo, CU.green]].map(([l, d, c], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 56, fontSize: 11.5, color: CU.sub, flexShrink: 0 }}>{l}</span>
                  <div style={{ flex: 1, height: 16, borderRadius: 5, background: CU.inset, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${(d / explore.dPromo * 100).toFixed(0)}%`, background: c, borderRadius: 5 }} /></div>
                  <span style={{ width: 56, fontSize: 12.5, fontWeight: 800, color: CU.text, textAlign: "right", flexShrink: 0 }}>{usd(d)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* whitespace top 5 */}
      {ws.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Cap c={CU.text}>Top whitespace · sells nearby</Cap>
            <span style={{ fontSize: 10.5, color: CU.mut }}>est. $/mo to you</span>
          </div>
          <div style={{ marginTop: 8 }}>
            {ws.map((w, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: i ? `1px solid ${CU.line}` : "none" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: CU.text, width: 122, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: CU.inset, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${(w.dollars / wsMax * 100).toFixed(0)}%`, background: CU.blue, borderRadius: 3 }} /></div>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: CU.greenDeep, width: 56, textAlign: "right", flexShrink: 0 }}>+{usd(w.dollars)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* the city story */}
      <Card>
        <Cap c={CU.text}>Your city · how it's doing</Cap>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            `Datum is in roughly 120 ${chan}s across Chicago — about 73% of the ${chan}s in the metro.`,
            "Volume is up ~18% year over year here, ahead of the energy category.",
            "Rate of sale runs ~9% higher at accounts that moved Datum into the cooler.",
            "The Variety Pack is the breakout package nearby — the fastest-growing SKU in the area.",
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span style={{ flexShrink: 0, width: 5, height: 5, borderRadius: 3, marginTop: 6, background: CU.green }} />
              <span style={{ fontSize: 12.5, color: CU.sub, lineHeight: 1.45 }}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: CU.mut, marginTop: 9, fontStyle: "italic" }}>City figures are demo placeholders — wire to live data next.</div>
      </Card>
    </div>
  );
}
