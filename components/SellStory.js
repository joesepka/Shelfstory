"use client";
// THINGS TO KNOW — three sections of tight bullets a rep scans in the parking lot
// (Joe, 2026-08-16 v5 "dense"): THE BRAND · HOT NEARBY · NEARBY PEERS. Information
// only — no pitch chips, no instructions; the rep decides.
//
// LABEL DISCIPLINE (bug caught by Joe 2026-08-16): brand numbers MUST come from
// account_parent filtered to the selected label, never account_list — account_list is
// the whole account (Blind Corner + Torch), which reported 305 accounts / 8.7k cases
// where the book says 276 / 7.2k, and turned a Lisle that is DOWN 15% on Blind Corner
// into "up 17%". account_parent carries city/channel/placements per label.
import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import LogoMark from "./LogoMark";

const SECTIONS = [
  { key: "brand", label: "The brand", color: "#5E9277" },
  { key: "hot", label: "Hot nearby", color: "#a8742c" },
  { key: "peers", label: "Nearby peers", color: "#2f7d52" },
];
const STATE_NAME = { IL: "Illinois", WI: "Wisconsin", IN: "Indiana", MO: "Missouri", IA: "Iowa" };
const titleCase = s => !s ? "" : String(s).toLowerCase().replace(/(?<!['\w])\w/g, c => c.toUpperCase());
const kf = v => v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(Math.round(v));
const fmt = n => Math.round(n || 0).toLocaleString();
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r1 = v => v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
const isKegPkg = p => /1\/2|1\/6|HALF|SIXTEL|BBL|KEG/i.test(String(p || ""));
const unitFor = (n, pkg) => {
  const p = String(pkg || "").toUpperCase();
  if (p.includes("SIXTEL") || p.includes("1/6")) return n === 1 ? "sixtel" : "sixtels";
  if (p.includes("HALF") || p.includes("1/2")) return n === 1 ? "half" : "halfs";
  return "cs";
};
const draftName = (name) => {
  const s = String(name || "").trim();
  if (!/1\/2|1\/6|HALF|SIXTEL|BBL|KEG|DRAFT/i.test(s)) return s;
  const base = s.replace(/\s*(1\/2\s*BBL|1\/6\s*BBL|1\/2BBL|1\/6BBL|HALF\s*KEG|SIXTEL|HALF|KEG|BBL|DRAFT)\s*/gi, " ").replace(/\s+/g, " ").trim();
  return base ? `${base} draft` : s;
};
const SEASONALW = /MARZEN|MÄRZEN|OKTOBER|FEST|AUTUMN|SEASONAL|WINTER|SUMMER|PUMPKIN/i;

export default function SellStory({ d, parents = null }) {
  const [open, setOpen] = useState(false);
  const [secs, setSecs] = useState(null);
  const busy = useRef(false);

  const build = async () => {
    if (busy.current || secs) return;
    busy.current = true;
    try {
      const { acc, items = [], cohort = [], wsReal = [], zipTrend = {}, zipScope = null, mktAll = [], onP } = d;
      const uTitle = s => String(s || "").toLowerCase().replace(/(?<![\p{L}\p{N}'])\p{L}/gu, c => c.toUpperCase());
      const pretty = s => uTitle(s).replace(/\bIpa\b/g, "IPA").replace(/\bDipa\b/g, "DIPA").replace(/\bTipa\b/g, "TIPA").replace(/\bThc\b/g, "THC").replace(/\bSl\b/g, "SL");
      const carried = new Set(items.map(i => i.product_key));
      const liveSlots = new Set(items.filter(x => (x.l90 || 0) > 0).map(x => x.slot_key).filter(Boolean));
      const cityWord = acc.city ? titleCase(acc.city) : null;
      const stName = STATE_NAME[acc.state] || acc.state;
      const myPlc = acc.live_placements || 0;
      const myRos = myPlc > 0 ? (acc.cur90 || 0) / myPlc / 3 : 0;
      const isBinnys = /BINNY/i.test(String(acc.chain || ""));
      const labels = (parents && parents.length) ? parents.map(p => String(p).toUpperCase()) : null;   // null = all labels
      const brandWord = labels && labels.length === 1 ? titleCase(labels[0]) : "The book";
      const ct = String(acc.channel_type || "").toUpperCase();
      const peerWord = /BAR|RESTAURANT/.test(ct) ? "bars and restaurants" : /LIQUOR/.test(ct) ? "liquor stores" : /GROCERY/.test(ct) ? "grocery stores" : /GOLF/.test(ct) ? "golf courses" : /CONVENIENCE/.test(ct) ? "c-stores" : "accounts";
      const draftUnit = (() => {
        if (!onP) return { one: "case", many: "cases" };
        let half = 0, six = 0;
        for (const i of items) { if ((i.l90 || 0) <= 0 || !isKegPkg(i.package)) continue; const p = String(i.package).toUpperCase(); if (p.includes("SIXTEL") || p.includes("1/6")) six++; else half++; }
        if (six > half) return { one: "sixtel", many: "sixtels" };
        if (half > 0) return { one: "half", many: "halfs" };
        return { one: "keg", many: "kegs" };
      })();
      const handleWord = onP ? "tap" : "SKU";

      const brand = [], hot = [], peers = [];
      const named = new Set();

      // ---- label-scoped market rows (account_parent), new items, Binny's siblings ----
      let mkRows = [], newItems = [], sibs = [], sibItems = [];
      try {
        const pullMarket = async () => {
          let out = [], from = 0;
          while (true) {
            let q = supabase.from("account_parent").select("account_id,parent,city,cur90,prev90,live_placements,live_prev").eq("state", acc.state);
            if (labels) q = q.in("parent", labels);
            const { data, error } = await q.range(from, from + 4999);
            if (error) break;
            out = out.concat(data || []);
            if (!data || data.length < 5000) break;
            from += 5000;
          }
          return out;
        };
        const [mk, niRes, sbRes] = await Promise.all([
          pullMarket(),
          supabase.from("new_items").select("item_name, package, parent, style_group, l90"),
          isBinnys ? supabase.from("account_list").select("account_id, cur90").eq("chain", acc.chain) : Promise.resolve({ data: null }),
        ]);
        mkRows = mk;
        newItems = (niRes.data || []).filter(n => !labels || labels.includes(String(n.parent || "").toUpperCase()));
        sibs = (sbRes.data || []).filter(a => a.account_id !== acc.account_id && (a.cur90 || 0) > 0);
        if (sibs.length >= 3) {
          const ids = sibs.map(a => a.account_id).slice(0, 150);
          const { data: si } = await supabase.from("item_grid").select("account_id, product_key, item_name, l90, package, slot_key, parent, style_parent").in("account_id", ids);
          sibItems = (si || []).filter(r => { const torch = String(r.parent || "").toUpperCase() === "TORCH" || String(r.style_parent || "").toUpperCase().includes("THC"); return !labels ? true : (labels.includes("TORCH") ? true : !torch); });
        }
      } catch { }

      // ============ THE BRAND ============
      const agg = rows => {
        let c = 0, p = 0, an = 0, ap = 0, pl = 0, plp = 0;
        for (const r of rows) { const cv = +r.cur90 || 0, pv = +r.prev90 || 0; c += cv; p += pv; if (cv > 0) an++; if (pv > 0) ap++; pl += +r.live_placements || 0; plp += +r.live_prev || 0; }
        return { c, p, an, ap, pl, plp, g: p >= 30 ? Math.round((c - p) / p * 100) : null, ros: an > 0 ? c / an / 3 : 0, rosP: ap > 0 ? p / ap / 3 : 0 };
      };
      const st = agg(mkRows);
      const cityRows = cityWord ? mkRows.filter(r => String(r.city || "").toUpperCase() === String(acc.city).toUpperCase()) : [];
      const city = cityRows.length >= 4 ? agg(cityRows) : null;

      if (st.g != null && st.g >= 3) brand.push({ line: `Up ${st.g}% in ${stName} — ${kf(st.c)} cases.`, r: `state 90D vs prior` });
      // the city only earns a line when it's actually a good story here
      if (city && city.g != null && city.g >= 3) brand.push({ line: `Up ${city.g}% around ${cityWord} — ${fmt(city.c)} cs / ${fmt(city.an)} accts.`, r: `${cityWord} 90D vs prior` });

      // strongest movement — accounts, placements, or rate of sale (top two)
      const sc = (city && city.an >= 5 && city.g != null && city.g >= 3) ? city : st;
      const scWhere = sc === city ? `around ${cityWord}` : `in ${stName}`;
      const aD = sc.an - sc.ap, plD = sc.pl - sc.plp;
      const rosG = sc.rosP > 0 ? Math.round((sc.ros - sc.rosP) / sc.rosP * 100) : null;
      const moves = [];
      if (aD >= 2) moves.push({ v: aD / Math.max(1, sc.ap), line: `Up ${fmt(aD)} accounts ${scWhere}.`, r: `${fmt(sc.an)} buying now` });
      if (plD >= 3 && sc.plp > 0) moves.push({ v: plD / sc.plp, line: `Up ${fmt(plD)} placements ${scWhere} (+${Math.round(plD / sc.plp * 100)}%).`, r: `${fmt(sc.pl)} live now` });
      if (rosG != null && rosG >= 5) moves.push({ v: rosG / 100, line: `Rate of sale up ${rosG}% ${scWhere}.`, r: `${r1(sc.ros)} cs per account/mo` });
      moves.sort((a, b) => b.v - a.v).slice(0, 2).forEach(m => brand.push(m));

      // ============ HOT NEARBY — no velocity stat, just who's carrying it ============
      const carriesSeasonal = items.some(i => (i.l90 || 0) > 0 && SEASONALW.test(String(i.item_name || "") + " " + String(i.style_parent || "")));
      const seasonalNew = newItems.filter(n => SEASONALW.test(n.item_name + " " + (n.style_group || "")) && !carried.has(n.item_name) && (n.l90 || 0) > 0 && (onP || !isKegPkg(n.package))).sort((a, b) => (b.l90 || 0) - (a.l90 || 0))[0];
      if (!carriesSeasonal && seasonalNew) hot.push({ line: `No seasonal on ${onP ? "tap" : "the shelf"} — new one at ${kf(seasonalNew.l90)} cs book-wide.`, r: `${draftName(pretty(seasonalNew.item_name))}, new` });
      const picks = wsReal
        .filter(w => onP || !w.draft)
        .map(w => ({ ...w, nm: draftName(pretty(w.name)), trend: w.pk != null && zipTrend[w.pk] != null ? zipTrend[w.pk] : null }))
        .sort((a, b) => (((b.trend >= 15 ? 100 : 0) + b.carriers) - ((a.trend >= 15 ? 100 : 0) + a.carriers)) || (b.dollars - a.dollars));
      for (const mv of picks) {
        if (hot.length >= 5) break;
        if (!(mv.trend >= 15 || mv.carriers >= 3)) continue;
        if (SEASONALW.test(mv.name) || named.has(mv.nm)) continue;
        named.add(mv.nm);
        hot.push({
          line: mv.trend >= 15
            ? `${mv.nm} up ${mv.trend}% ${zipScope ? `around ${zipScope}` : "nearby"} — ${fmt(mv.carriers)} ${peerWord} ${onP ? "pour" : "stock"} it.`
            : `${fmt(mv.carriers)} ${peerWord} like this one ${onP ? "pour" : "stock"} ${mv.nm}.`,
          r: `not here`,
        });
      }

      // ============ NEARBY PEERS ============
      const ch = acc.channel_type;
      let pool = cohort.filter(a => a.account_id !== acc.account_id && (!ch || a.channel_type === ch) && a.state === acc.state && (a.cur90 || 0) > 0);
      if (pool.length < 8) pool = cohort.filter(a => a.account_id !== acc.account_id && (!ch || a.channel_type === ch) && (a.cur90 || 0) > 0);
      if (pool.length >= 8) {
        const topQ = [...pool].sort((a, b) => (b.cur90 || 0) - (a.cur90 || 0)).slice(0, Math.max(4, Math.ceil(pool.length / 4)));
        const mPlc = Math.round(median(topQ.map(a => a.live_placements || 0)));
        const m90 = Math.round(median(topQ.map(a => a.cur90 || 0)));
        const mRosV = topQ.map(a => (a.live_placements > 0 ? (a.cur90 || 0) / a.live_placements / 3 : null)).filter(x => x != null);
        const mRos = mRosV.length ? median(mRosV) : 0;
        // what the good ones do — no scorekeeping against this account (Joe: just give the info)
        const uw = onP ? draftUnit.many : "cs";
        if (mPlc >= 1) peers.push({ line: `Best ${peerWord} near ${cityWord || "here"}: ${mPlc} ${handleWord}${mPlc === 1 ? "" : "s"}, ${fmt(m90)} ${uw}/qtr.`, r: `top ¼ of ${pool.length}` });
        if (mRos > 0) peers.push({ line: `They turn ~${r1(mRos)} ${uw}/${handleWord}/mo.`, r: `rate of sale` });
      }
      if (isBinnys && sibs.length >= 3 && sibItems.length) {
        const byPk = {};
        for (const r of sibItems) { if ((r.l90 || 0) > 0) { const g = byPk[r.product_key] || (byPk[r.product_key] = { name: r.item_name, pkg: r.package, slot: r.slot_key, vels: [] }); g.vels.push((r.l90 || 0) / 3); } }
        const need = Math.max(2, Math.ceil(sibs.length / 3));
        const gap = Object.entries(byPk)
          .filter(([pk, g]) => !carried.has(pk) && !(g.slot && liveSlots.has(g.slot)))
          .map(([pk, g]) => { const m = mktAll.find(x => x.product_key === pk); return { nm: draftName(pretty(m ? m.item_name : g.name)), n: g.vels.length }; })
          .filter(g => g.n >= need && !named.has(g.nm))
          .sort((a, b) => b.n - a.n)[0];
        if (gap) peers.push({ line: `${gap.n} other Binny's carry ${gap.nm}.`, r: `${gap.n} of ${sibs.length} stores · not here` });
      }
      if (myRos >= 0.6 && myPlc >= 2) {
        const annual = Math.round((myRos * 12) / 5) * 5;
        if (annual >= 20) peers.push({ line: `One more ${handleWord} here ≈ ${fmt(annual)} ${onP ? draftUnit.many : "cs"}/yr.`, r: `their own rate of sale` });
      }

      setSecs([{ ...SECTIONS[0], rows: brand }, { ...SECTIONS[1], rows: hot }, { ...SECTIONS[2], rows: peers }].filter(s => s.rows.length));
    } catch { setSecs([]); }
    busy.current = false;
  };

  const toggle = () => { const next = !open; setOpen(next); if (next) build(); };
  let n = 0;

  return (
    <div style={{ marginTop: 10 }}>
      {/* self-contained so the component drops into either app (mobile also defines these) */}
      <style>{`@keyframes rowIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}
        .ttkRow{animation:rowIn .2s ease both}
        .ttkBtn{transition:transform .12s ease,background .14s ease}.ttkBtn:active{transform:scale(.98)}`}</style>
      <button className="ttkBtn" onClick={toggle}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, border: "0.5px solid var(--border-strong)", background: open ? "var(--surface-2)" : "var(--surface)", borderRadius: open ? "12px 12px 0 0" : 12, padding: "8px 0", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: open ? "var(--text)" : "var(--text-2)", cursor: "pointer", boxShadow: open ? "none" : "var(--shadow-sm)" }}>
        <LogoMark size={20} />Things to Know{open ? " ↑" : ""}
      </button>
      {open && (
        <div style={{ border: "0.5px solid var(--border-strong)", borderTop: "none", borderRadius: "0 0 14px 14px", background: "var(--surface)", padding: "6px 13px 10px" }}>
          {!secs && <div style={{ padding: "14px 2px", fontSize: 11.5, color: "var(--text-3)", textAlign: "center" }}>Reading the market…</div>}
          {secs && secs.length === 0 && <div style={{ padding: "14px 2px", fontSize: 11.5, color: "var(--text-3)", textAlign: "center" }}>Nothing worth flagging on this one right now.</div>}
          {(secs || []).map((s, si) => (
            <div key={s.key} style={{ paddingTop: si === 0 ? 4 : 8, marginTop: si === 0 ? 0 : 3, borderTop: si === 0 ? "none" : "0.5px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase", color: "var(--text-3)", marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: s.color, flexShrink: 0 }} />{s.label}
              </div>
              {s.rows.map((row, i) => {
                n++;
                return (
                  <div key={i} className="ttkRow" style={{ animationDelay: `${Math.min(n * 22, 240)}ms`, padding: "3.5px 0" }}>
                    <span style={{ fontSize: 11.5, lineHeight: 1.34, color: "var(--text)", fontWeight: 500 }}>{row.line}</span>
                    {row.r && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, color: "var(--text-3)" }}> · {row.r}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
