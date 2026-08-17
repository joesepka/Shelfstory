"use client";
// SELL STORY — what a rep can SAY, in three beats (Joe's structure, 2026-08-16):
//   THE BRAND    · positive brand story first — state momentum, anything interesting landing
//   THE AREA     · what accounts like this one are doing nearby (Binny's siblings only for Binny's)
//   THIS ACCOUNT · their own history and their own math
// Tone rule: observations, not orders. "Booter draft is up 58% nearby" — the rep fills in
// the blank. We never say "you have to have this"; naming an item = pitching it (chip shown).
// Draft rule: any 1/2 or 1/6 keg is called "<beer> draft", never the keg size.
import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import LogoMark from "./LogoMark";

const SECTIONS = { brand: "The brand", area: "The area", account: "This account" };
const BUCKET = {
  brand: ["Momentum", "#5E9277"],
  new: ["Just landed", "#2F7D8C"],
  family: ["Same banner", "#2F7D8C"],
  peer: ["Nearby peers", "#2f7d52"],
  mover: ["Moving nearby", "#a8742c"],
  history: ["Their history", "#8b3a2b"],
  math: ["Their math", "#8b3a2b"],
};
const STATE_NAME = { IL: "Illinois", WI: "Wisconsin", IN: "Indiana", MO: "Missouri", IA: "Iowa" };
const titleCase = s => !s ? "" : String(s).toLowerCase().replace(/(?<!['\w])\w/g, c => c.toUpperCase());
const kf = v => v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(Math.round(v));
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const packUnits = (mo, pkg) => {
  const p = String(pkg || "").toUpperCase();
  const n1 = mo >= 10 ? Math.round(mo) : Math.round(mo * 10) / 10;
  if (p.includes("SIXTEL") || p.includes("1/6")) return { n: n1, unit: n1 === 1 ? "sixtel" : "sixtels" };
  if (p.includes("HALF") || p.includes("1/2")) return { n: n1, unit: n1 === 1 ? "half" : "halfs" };
  return { n: n1, unit: "cs" };
};
// "Booter 1/2bbl" / "Half Keg Booter" → "Booter draft" — reps talk handles, not keg sizes
const draftName = (name) => {
  const s = String(name || "").trim();
  if (!/1\/2|1\/6|HALF|SIXTEL|BBL|KEG|DRAFT/i.test(s)) return s;
  const base = s.replace(/\s*(1\/2\s*BBL|1\/6\s*BBL|1\/2BBL|1\/6BBL|HALF\s*KEG|SIXTEL|HALF|KEG|BBL|DRAFT)\s*/gi, " ").replace(/\s+/g, " ").trim();
  return base ? `${base} draft` : s;
};
const SEASONALW = /MARZEN|MÄRZEN|OKTOBER|FEST|AUTUMN|SEASONAL|WINTER|SUMMER/i;

export default function SellStory({ d, parents = null }) {
  const [open, setOpen] = useState(false);
  const [stories, setStories] = useState(null);
  const busy = useRef(false);

  const build = async () => {
    if (busy.current || stories) return;
    busy.current = true;
    try {
      const { acc, items = [], cohort = [], wsReal = [], penetration = null, peerAvgGrowth = null, zipTrend = {}, zipScope = null, dep = { byPk: {} }, mktAll = [], liveSet = null, onP } = d;
      // unicode-aware title case — "MÄRZEN" must come out "Märzen", not "MäRzen"
      const uTitle = s => String(s || "").toLowerCase().replace(/(?<![\p{L}\p{N}'])\p{L}/gu, c => c.toUpperCase());
      const pretty = s => uTitle(s).replace(/\bIpa\b/g, "IPA").replace(/\bDipa\b/g, "DIPA").replace(/\bThc\b/g, "THC").replace(/\bSl\b/g, "SL");
      const nameOf = pk => { const m = mktAll.find(x => x.product_key === pk); return m ? m.item_name : null; };
      const carried = new Set(items.map(i => i.product_key));
      const liveSlots = new Set(items.filter(x => (x.l90 || 0) > 0).map(x => x.slot_key).filter(Boolean));
      const handleWord = onP ? "tap" : "SKU";
      const chWord = titleCase(acc.channel_type || acc.channel || "similar");
      const where = acc.city ? `around ${titleCase(acc.city)}` : "in the area";
      const myPlc = acc.live_placements || 0;
      const myRos = myPlc > 0 ? (acc.cur90 || 0) / myPlc / 3 : 0;
      const isBinnys = /BINNY/i.test(String(acc.chain || ""));

      // ---- lazy fetches: state totals for the brand opener, new items, Binny's siblings ----
      let newItems = [], sibs = [], sibItems = [], stateG = null, stateCur = 0;
      try {
        const [niRes, stRes, sbRes] = await Promise.all([
          supabase.from("new_items").select("item_name, package, parent, style_group, first_seen, l90"),
          supabase.from("account_list").select("cur90, prev90").eq("state", acc.state),
          isBinnys ? supabase.from("account_list").select("account_id, cur90, live_placements").eq("chain", acc.chain) : Promise.resolve({ data: null }),
        ]);
        newItems = (niRes.data || []).filter(n => String(n.parent || "").toUpperCase() !== "TORCH" || (parents || []).includes("TORCH"));
        const sc = (stRes.data || []).reduce((s, a) => s + (Number(a.cur90) || 0), 0);
        const sp = (stRes.data || []).reduce((s, a) => s + (Number(a.prev90) || 0), 0);
        stateCur = sc;
        if (sp >= 50) stateG = Math.round(((sc - sp) / sp) * 100);
        sibs = (sbRes.data || []).filter(a => a.account_id !== acc.account_id);
        if (sibs.length >= 3) {
          const ids = sibs.map(a => a.account_id).slice(0, 150);
          const { data: si } = await supabase.from("item_grid").select("account_id, product_key, item_name, l90, package, slot_key, parent, style_parent").in("account_id", ids);
          const wantTorch = (parents || []).includes("TORCH");
          sibItems = (si || []).filter(r => {
            const torch = String(r.parent || "").toUpperCase() === "TORCH" || String(r.style_parent || "").toUpperCase().includes("THC");
            return wantTorch ? true : !torch;
          });
        }
      } catch { }

      const S = { brand: [], area: [], account: [] };

      // ======== THE BRAND — always open on a positive note ========
      const stName = STATE_NAME[acc.state] || acc.state;
      if (stateG != null && stateG >= 3) {
        S.brand.push({ bucket: "brand",
          line: `Blind Corner is up ${stateG}% in ${stName} this quarter — ${kf(stateCur)} cases in the last 90 days.`,
          receipts: `state 90D vs prior 90D · every account` });
      } else if (peerAvgGrowth != null && peerAvgGrowth >= 3) {
        S.brand.push({ bucket: "brand",
          line: `${chWord} accounts are growing on Blind Corner — the 90-day pace is +${Math.round(peerAvgGrowth)}% across the book.`,
          receipts: `${penetration ? `${penetration.carry.toLocaleString()}/${penetration.total.toLocaleString()} carry · ` : ""}avg 90D` });
      }
      // ...then anything interesting landing (naming it = pitching it, so the chip rides along).
      // Premise-aware: an off-premise shelf never gets pitched a keg.
      const isKeg = n => /1\/2|1\/6|HALF|SIXTEL|BBL|KEG/i.test(String(n.item_name || "") + " " + String(n.package || ""));
      const ni = newItems.filter(n => !carried.has(n.item_name) && (n.l90 || 0) > 0 && (onP || !isKeg(n))).sort((a, b) => (b.l90 || 0) - (a.l90 || 0))[0];
      if (ni) {
        const nname = draftName(pretty(ni.item_name));
        const seasonal = SEASONALW.test(ni.item_name + " " + (ni.style_group || ""));
        S.brand.push({ bucket: "new", pitch: nname,
          line: `${nname} just landed — ${kf(ni.l90)} cases out of the gate${seasonal ? ", right as the season's window opens" : ""}.`,
          receipts: `NEW ≤ 90 days · book 90D ${kf(ni.l90)} cs` });
      }

      // ======== THE AREA — what accounts like this one are doing ========
      // Binny's talks banner; everyone else talks the area (Joe's rule)
      if (isBinnys && sibs.filter(a => (a.cur90 || 0) > 0).length >= 3 && sibItems.length) {
        const sibsActive = sibs.filter(a => (a.cur90 || 0) > 0);
        const byPk = {};
        for (const r of sibItems) { if ((r.l90 || 0) > 0) { const g = byPk[r.product_key] || (byPk[r.product_key] = { name: r.item_name, pkg: r.package, slot: r.slot_key, vels: [] }); g.vels.push((r.l90 || 0) / 3); } }
        const need = Math.max(2, Math.ceil(sibsActive.length / 3));
        const gaps = Object.entries(byPk)
          .filter(([pk, g]) => !carried.has(pk) && !(g.slot && liveSlots.has(g.slot)))
          .map(([pk, g]) => ({ pk, name: draftName(nameOf(pk) || pretty(g.name)), pkg: g.pkg, n: g.vels.length, vel: median(g.vels) }))
          .filter(g => g.n >= need)
          .sort((a, b) => (b.n - a.n) || (b.vel - a.vel));
        if (gaps[0]) {
          const g = gaps[0], u = packUnits(g.vel, g.pkg);
          S.area.push({ bucket: "family", pitch: g.name,
            line: `${g.n} other Binny's carry ${g.name}${u.n >= 1 ? ` — banner average ${u.n.toLocaleString()} ${u.unit}/mo` : ""}.`,
            receipts: `${g.n}/${sibsActive.length} stores · not on this shelf · slot open` });
        }
      }
      // top-quartile peers — an observation about the neighborhood, not a quota
      const ch = acc.channel_type;
      let pool = cohort.filter(a => a.account_id !== acc.account_id && (!ch || a.channel_type === ch) && a.state === acc.state && (a.cur90 || 0) > 0);
      if (pool.length < 8) pool = cohort.filter(a => a.account_id !== acc.account_id && (!ch || a.channel_type === ch) && (a.cur90 || 0) > 0);
      if (pool.length >= 8) {
        const topQ = [...pool].sort((a, b) => (b.cur90 || 0) - (a.cur90 || 0)).slice(0, Math.max(4, Math.ceil(pool.length / 4)));
        const mPlc = Math.round(median(topQ.map(a => a.live_placements || 0)));
        const m90 = Math.round(median(topQ.map(a => a.cur90 || 0)));
        const mRosV = topQ.map(a => (a.live_placements > 0 ? (a.cur90 || 0) / a.live_placements / 3 : null)).filter(x => x != null);
        const mRos = mRosV.length ? median(mRosV) : 0;
        if (mPlc - myPlc >= 1 && (acc.cur90 || 0) < m90) {
          S.area.push({ bucket: "peer",
            line: onP
              ? `The top ${chWord.toLowerCase()} accounts ${where} run ${mPlc} Blind Corner ${mPlc === 1 ? "tap" : "taps"} and do ${m90.toLocaleString()} cases a quarter.`
              : `The top ${chWord.toLowerCase()} shelves ${where} carry ${mPlc} Blind Corner SKUs and do ${m90.toLocaleString()} cases a quarter.`,
            receipts: `top ¼ of ${pool.length} ${chWord.toLowerCase()} accts · this shelf: ${myPlc} ${handleWord}${myPlc === 1 ? "" : "s"}` });
        } else if (myRos > 0 && mRos > 0 && mRos >= myRos * 1.25) {
          const f = v => v >= 3 ? Math.round(v) : Math.round(v * 10) / 10;
          S.area.push({ bucket: "peer",
            line: `Peers at the top turn ${f(mRos)} cases per ${handleWord} a month around here.`,
            receipts: `top ¼ of ${pool.length} peers · this shelf: ${f(myRos)}/${handleWord}/mo` });
        }
      }
      // what's moving nearby — pure observation; the shelf gap lives in the receipts
      const picks = wsReal
        .filter(w => onP || !w.draft)
        .map(w => ({ ...w, trend: w.pk != null && zipTrend[w.pk] != null ? zipTrend[w.pk] : null }))
        .sort((a, b) => (((b.trend >= 15 ? 100 : 0) + b.carriers) - ((a.trend >= 15 ? 100 : 0) + a.carriers)) || (b.dollars - a.dollars));
      const mv = picks[0];
      if (mv && (mv.trend >= 15 || mv.carriers >= 3)) {
        const mname = draftName(mv.name);
        const u = packUnits(mv.velRaw != null ? mv.velRaw : mv.vel, mv.pkg);
        S.area.push({ bucket: "mover", pitch: mname,
          line: mv.trend >= 15
            ? `${mname} is up ${mv.trend}% ${zipScope ? `around ${zipScope}` : "nearby"} — ${mv.carriers.toLocaleString()} comparable ${onP ? "bars pour it" : "shelves stock it"}.`
            : `${mv.carriers.toLocaleString()} ${chWord.toLowerCase()} accounts like this one ${onP ? "pour" : "stock"} ${mname}${u.n >= 1 ? `, ~${u.n.toLocaleString()} ${u.unit}/mo` : ""}.`,
          receipts: `${mv.trend != null ? `nearby 90D ▲${mv.trend}% · ` : ""}not carried here · slot open` });
      }

      // ======== THIS ACCOUNT — their own story ========
      const lost = items
        .filter(i => (i.l90 || 0) <= 0 && (!liveSet || liveSet.has(i.product_key)))
        .map(i => { const line = ((dep.byPk[i.product_key] || {}).line) || []; return { ...i, peak: Math.max(0, ...line) }; })
        .filter(i => i.peak >= 3 && !(i.slot_key && liveSlots.has(i.slot_key)))
        .sort((a, b) => b.peak - a.peak)[0];
      if (lost) {
        const lname = draftName(lost.item_name);
        const u = packUnits(lost.peak / 3, lost.package);
        S.account.push({ bucket: "history", pitch: lname,
          line: `This ${onP ? "bar" : "store"} did ${u.n.toLocaleString()} ${u.unit}/mo on ${lname} at its best — and it's still moving in the market.`,
          receipts: `own history · peak ${Math.round(lost.peak)} cs/90D · ${onP ? "handle" : "slot"} open` });
      }
      if (myRos >= 0.6 && myPlc >= 2) {
        const annual = Math.round((myRos * 12) / 5) * 5;
        if (annual >= 20) {
          S.account.push({ bucket: "math",
            line: `At this ${onP ? "bar" : "shelf"}'s own pace, one added ${handleWord} is worth roughly ${annual.toLocaleString()} cases a year.`,
            receipts: `their ros ${myRos >= 3 ? Math.round(myRos) : Math.round(myRos * 10) / 10} cs/${handleWord}/mo × 12` });
        }
      }

      // quick and simple: 2 brand · 2 area · 2 account max, one pitch per SKU
      const seen = new Set(), out = [];
      for (const sec of ["brand", "area", "account"]) {
        let n = 0;
        for (const c of S[sec]) {
          if (c.pitch && seen.has(c.pitch)) continue;
          if (n >= 2) break;
          if (c.pitch) seen.add(c.pitch);
          out.push({ ...c, section: sec });
          n++;
        }
      }
      setStories(out);
    } catch { setStories([]); }
    busy.current = false;
  };

  const toggle = () => { const next = !open; setOpen(next); if (next) build(); };

  let lastSec = null;
  return (
    <div style={{ marginTop: 10 }}>
      <button className="tapd" onClick={toggle}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, border: "0.5px solid var(--border-strong)", background: open ? "var(--surface-2)" : "var(--surface)", borderRadius: open ? "12px 12px 0 0" : 12, padding: "8px 0", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: open ? "var(--text)" : "var(--text-2)", cursor: "pointer", boxShadow: open ? "none" : "var(--shadow-sm)" }}>
        <LogoMark size={20} />Sell Story{open ? " ↑" : ""}
      </button>
      {open && (
        <div style={{ border: "0.5px solid var(--border-strong)", borderTop: "none", borderRadius: "0 0 14px 14px", background: "var(--surface)", padding: "2px 12px 9px" }}>
          {!stories && <div style={{ padding: "14px 2px", fontSize: 11.5, color: "var(--text-3)", textAlign: "center" }}>Reading the market…</div>}
          {stories && stories.length === 0 && <div style={{ padding: "14px 2px", fontSize: 11.5, color: "var(--text-3)", textAlign: "center" }}>Nothing clears the bar for this account right now — that's the filter doing its job.</div>}
          {(stories || []).map((s, i) => {
            const [lb, col] = BUCKET[s.bucket] || BUCKET.brand;
            const showSec = s.section !== lastSec; lastSec = s.section;
            return (
              <div key={i} className="rowIn" style={{ animationDelay: `${i * 30}ms` }}>
                {showSec && <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#5c6353", padding: "10px 2px 0", borderTop: i > 0 ? "0.5px solid var(--border)" : "none", marginTop: i > 0 ? 4 : 0 }}>{SECTIONS[s.section]}</div>}
                <div style={{ padding: "7px 2px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 8, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--text-3)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: col, flexShrink: 0 }} />{lb}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.45, marginTop: 4, color: "var(--text)", fontWeight: 500 }}>{s.line}</div>
                  {s.receipts && <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, color: "var(--text-3)", marginTop: 4 }}>{s.receipts}</div>}
                  {s.pitch && <span style={{ display: "inline-block", marginTop: 5, fontSize: 9.5, fontWeight: 700, color: "#2c5138", background: "#eef4ee", border: "0.5px solid #cfe0d4", borderRadius: 7, padding: "2.5px 8px" }}>Pitch: {s.pitch}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
