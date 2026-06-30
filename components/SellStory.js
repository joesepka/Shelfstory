"use client";
// Sell-story generator — Cupertino look (hardcoded so it reads the same in any skin).
// Margin is fixed at 30%. Numbers are now real where the data exists: account profit
// (items × pricing), the channel/area average profit and whitespace medians come from
// nearby same-channel peers. Lift %s (cold box / promo) remain editable estimates.
// No emojis. Built to be a snappy in-hand tool for a rep.
import { useMemo, useState } from "react";
import { profitPerCase } from "../lib/pricing";

const CU = {
  card: "#ffffff", inset: "#f5f5f7", text: "#1d1d1f", sub: "#515154", mut: "#86868b",
  line: "#e8e8ed", green: "#30b36b", greenDeep: "#249b5b", greenSoft: "#e3f5ec",
  blue: "#3a86c8", blueSoft: "#e6f0fa", grey: "#c7ccd2",
  shadow: "0 2px 12px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.05)",
};
const usd = n => "$" + Math.round(n).toLocaleString();
const COLD = 0.15, PROMO = 0.20;

function Bolt({ c }) { return <svg width="15" height="15" viewBox="0 0 24 24" fill={c} stroke="none"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>; }
function Check({ c }) { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}><path d="M20 6 9 17l-5-5" /></svg>; }

export default function SellStory({ acc, items = [], white = [], moves = [], areaAvgMo = null, praise = [], wsReal = [], penetration = null, peerTopGrowth = 0 }) {
  const [open, setOpen] = useState(false);
  const M = 0.30;

  const carried = useMemo(() => items.filter(i => (i.l90 || 0) > 0).sort((a, b) => (b.l90 || 0) - (a.l90 || 0)), [items]);

  const options = useMemo(() => {
    const seen = new Set(), out = [];
    for (const i of carried) if (!seen.has(i.item_name)) { seen.add(i.item_name); out.push({ name: i.item_name, csMo: (i.l90 || 0) / 3, here: true }); }
    for (const w of wsReal) if (!seen.has(w.name)) { seen.add(w.name); out.push({ name: w.name, csMo: w.vel, here: false }); }
    return out;
  }, [carried, wsReal]);

  const [sel, setSel] = useState("");
  const cur = options.find(o => o.name === sel) || options[0];

  const accountMo = useMemo(() => carried.reduce((s, i) => s + ((i.l90 || 0) / 3) * profitPerCase(i.item_name, M), 0), [carried]);
  const takeaway = areaAvgMo == null ? ""
    : accountMo >= areaAvgMo * 1.05 ? `Running ~${Math.round((accountMo / areaAvgMo - 1) * 100)}% ahead of similar stores — strong velocity. Praise it, then add SKUs to push further.`
    : accountMo <= areaAvgMo * 0.95 ? `About ~${Math.round((1 - accountMo / areaAvgMo) * 100)}% behind similar stores — room to grow. Pitch a few more SKUs and better placement.`
    : "Right in line with similar stores — a cold-box move or a couple SKUs pulls ahead.";

  const explore = useMemo(() => {
    if (!cur) return null;
    const pc = profitPerCase(cur.name, M);
    const csB = cur.csMo, csC = cur.csMo * (1 + COLD), csP = cur.csMo * (1 + PROMO);
    return { csB, csC, csP, dB: csB * pc, dC: csC * pc, dP: csP * pc, max: csP * pc || 1 };
  }, [cur]);

  const wsMax = Math.max(...wsReal.map(w => w.dollars), 1);
  const chan = String(acc?.channel || "store").toLowerCase();

  const cityBullets = [];
  if (penetration && penetration.total > 0) cityBullets.push(`Datum is in ${penetration.carry} of ${penetration.total} ${chan}s like this one in ${acc?.city || "your area"}.`);
  if (peerTopGrowth >= 8) cityBullets.push(`A nearby ${chan} grew +${Math.round(peerTopGrowth)}% last quarter — momentum's in the area.`);
  cityBullets.push("The Variety Pack is an easy trial driver to widen the set.");

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

  return (
    <div style={{ fontFamily: "var(--font-sans)", marginBottom: 10, animation: "riseIn .35s cubic-bezier(.2,.7,.2,1) both" }}>
      {/* header + butter-up */}
      <Card style={{ background: "linear-gradient(180deg,#f4faf6,#ffffff)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: CU.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Bolt c="#fff" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: CU.text, letterSpacing: "-0.3px" }}>Sell story</div>
            <div style={{ fontSize: 11.5, color: CU.mut, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{acc?.account_name}</div>
          </div>
          <button onClick={() => setOpen(false)} style={{ border: "none", background: CU.inset, color: CU.sub, borderRadius: 20, fontSize: 12, fontWeight: 600, padding: "5px 11px", cursor: "pointer", fontFamily: "inherit" }}>Close</button>
        </div>
        {praise && praise.length > 0 ? (
          <div style={{ marginTop: 11, borderTop: `1px solid ${CU.line}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
            {praise.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                <Check c={CU.green} />
                <span style={{ fontSize: 12.5, color: CU.sub, lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 11, borderTop: `1px solid ${CU.line}`, paddingTop: 10, fontSize: 12.5, color: CU.mut }}>Steady, dependable account — keep the relationship warm.</div>
        )}
      </Card>

      {/* suggested plays */}
      {moves && moves.length > 0 && (
        <Card>
          <Cap c={CU.text}>Suggested plays</Cap>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
            {moves.map((m, i) => { const s = String(m).toLowerCase(); const col = s.startsWith("win back") ? "#c24a30" : s.startsWith("ride") ? CU.greenDeep : CU.blue; return (
              <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "9px 11px", borderRadius: 10, background: CU.inset, borderLeft: `3px solid ${col}` }}>
                <span style={{ color: col, fontWeight: 800, flexShrink: 0 }}>→</span>
                <span style={{ fontSize: 12.5, lineHeight: 1.4, color: CU.text }}>{m}</span>
              </div>
            ); })}
          </div>
        </Card>
      )}

      {/* account profit vs area average */}
      <Card>
        <Cap c={CU.text}>Account profit · per month</Cap>
        <div style={{ display: "flex", gap: 10, marginTop: 9 }}>
          <div style={{ flex: 1, background: CU.greenSoft, borderRadius: 11, padding: "10px 12px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: CU.greenDeep }}>This account</div>
            <div style={{ fontSize: 23, fontWeight: 800, color: CU.greenDeep, letterSpacing: "-0.7px" }}>{usd(accountMo)}</div>
          </div>
          <div style={{ flex: 1, background: CU.inset, borderRadius: 11, padding: "10px 12px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: CU.sub }}>Avg {chan} nearby</div>
            <div style={{ fontSize: 23, fontWeight: 800, color: CU.text, letterSpacing: "-0.7px" }}>{areaAvgMo != null ? usd(areaAvgMo) : "—"}</div>
          </div>
        </div>
        {takeaway && <div style={{ fontSize: 12, color: CU.sub, marginTop: 8, lineHeight: 1.4 }}>{takeaway}</div>}
        <div style={{ fontSize: 10, color: CU.mut, marginTop: 4 }}>profit = sell − buy at 30% margin</div>
      </Card>

      {/* item explorer */}
      {cur && explore && (
        <Card>
          <Cap c={CU.text}>Explore an item</Cap>
          <select value={cur.name} onChange={e => setSel(e.target.value)} style={{ width: "100%", marginTop: 8, fontSize: 13.5, fontWeight: 600, color: CU.text, background: "#fff", border: `1px solid ${CU.line}`, borderRadius: 10, padding: "9px 11px", fontFamily: "inherit", cursor: "pointer" }}>
            {options.map(o => <option key={o.name} value={o.name}>{o.name}{o.here ? "" : " · not carried"}</option>)}
          </select>
          <div style={{ fontSize: 11, color: CU.mut, marginTop: 9 }}>Profit / month (sell − buy at 30%) — {cur.here ? "velocity at this account" : "area average (not carried here)"} · lifts <Est /></div>
          {(() => {
            const BARS = [["Current", explore.dB, explore.csB, CU.grey, CU.sub, ""], ["Cold box", explore.dC, explore.csC, CU.blue, CU.blue, "+15%"], ["Promo", explore.dP, explore.csP, CU.green, CU.greenDeep, "+20%"]];
            return (
              <>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-end", height: 104, padding: "8px 4px 0" }}>
                  {BARS.map(([l, d, cs, bar, txt]) => (
                    <div key={l} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: txt }}>{usd(d)}</div>
                      <div style={{ width: "60%", maxWidth: 46, height: `${Math.max(6, (d / explore.max) * 72).toFixed(0)}px`, background: bar, borderRadius: "7px 7px 0 0", marginTop: 4 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 7, padding: "0 4px" }}>
                  {BARS.map(([l, d, cs, bar, txt, lift]) => (
                    <div key={l} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: CU.text }}>{l} {lift && <span style={{ fontSize: 10, fontWeight: 700, color: txt }}>{lift}</span>}</div>
                      <div style={{ fontSize: 11, color: CU.mut, marginTop: 1 }}>{cs.toFixed(1)} cs/mo</div>
                      {d > explore.dB ? <div style={{ fontSize: 10.5, fontWeight: 800, color: CU.greenDeep, marginTop: 1 }}>+{usd(d - explore.dB)}/mo</div> : <div style={{ fontSize: 10.5, color: CU.mut, marginTop: 1 }}>baseline</div>}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </Card>
      )}

      {/* whitespace (real medians from nearby carriers) */}
      {wsReal.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Cap c={CU.text}>Top whitespace · sells nearby</Cap>
            <span style={{ fontSize: 10.5, color: CU.mut }}>profit / mo to you</span>
          </div>
          <div style={{ fontSize: 11, color: CU.mut, margin: "3px 0 7px" }}>median velocity of nearby {chan}s that carry it</div>
          {wsReal.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderTop: i ? `1px solid ${CU.line}` : "none" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: CU.text, width: 102, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: CU.inset, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${(w.dollars / wsMax * 100).toFixed(0)}%`, background: CU.blue, borderRadius: 3 }} /></div>
              <span style={{ fontSize: 11, color: CU.mut, width: 52, textAlign: "right", flexShrink: 0 }}>{w.vel} cs/mo</span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: CU.greenDeep, width: 52, textAlign: "right", flexShrink: 0 }}>+{usd(w.dollars)}</span>
            </div>
          ))}
        </Card>
      )}

      {/* the city */}
      <Card>
        <Cap c={CU.text}>Your area · how it's doing</Cap>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {cityBullets.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span style={{ flexShrink: 0, width: 5, height: 5, borderRadius: 3, marginTop: 6, background: CU.green }} />
              <span style={{ fontSize: 12.5, color: CU.sub, lineHeight: 1.45 }}>{t}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
