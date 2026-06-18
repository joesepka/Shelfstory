"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Splash from "../../components/Splash";


function label(hd) {
  switch (String(hd || "").toLowerCase().trim()) {
    case "accelerating": return { t: "Accelerating", c: "#0C6E50", bg: "#CFEADF" };
    case "at-risk": case "atrisk": case "at risk": return { t: "At risk", c: "#A8302A", bg: "#F4D2CC" };
    case "decelerating": return { t: "Softening", c: "#9A5A1E", bg: "#F6E0C6" };
    case "new": return { t: "New", c: "#1A5E8A", bg: "#D2E6F2" };
    case "lapsed": return { t: "Lapsed", c: "#7E7B73", bg: "#E6E3DB" };
    default: return null;
  }
}
const DECLINING = new Set(["decelerating", "at-risk", "atrisk", "at risk", "lapsed"]);
function isDeclining(hd) { return DECLINING.has(String(hd || "").toLowerCase().trim()); }
function isNew(hd) { return String(hd || "").toLowerCase().trim() === "new"; }
function groupOf(hd) { return isNew(hd) ? "new" : isDeclining(hd) ? "atrisk" : "healthy"; }
function titleCase(s) { return String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
function pctColor(p) { if (p == null) return "#9A968C"; if (p > 1) return "#0C6E50"; if (p < -1) return "#B03A2A"; return "#8A8678"; }
function lastSold(iso) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleString("en-US", { month: "short" }) + " '" + String(d.getFullYear()).slice(2);
}

function buildNote(r) {
  const item = s => titleCase(s);
  const plc = n => { const a = Math.abs(n); return `${a} placement${a === 1 ? "" : "s"}`; };
  const hd = String(r.headline || "").toLowerCase().trim();
  const facts = [];
  if (hd === "at-risk" || hd === "atrisk" || hd === "at risk" || hd === "decelerating") {
    if (r.lost_sku) facts.push(`lost ${item(r.lost_sku)}`);
    if (r.placements_delta < 0) facts.push(`down ${plc(r.placements_delta)}`);
    if (!facts.length) facts.push("running below pace");
  } else if (hd === "accelerating") {
    if (r.growing_count > 0) facts.push(`${r.growing_count} of ${r.active_count} SKUs growing`);
    else facts.push(`accelerating across ${r.active_count || 0} SKUs`);
    if (r.placements_delta > 0) facts.push(`added ${plc(r.placements_delta)}`);
  } else if (hd === "new") {
    facts.push("ramping");
    facts.push(`${r.live_placements || 0} placement${(r.live_placements || 0) === 1 ? "" : "s"}`);
  } else if (hd === "lapsed") {
    const ls = lastSold(r.last_invoice_date);
    facts.push(ls ? `last sold ${ls}` : "no recent sales");
  } else {
    if (r.growing_count > 0) facts.push(`holding · ${r.growing_count} of ${r.active_count} growing`);
    else facts.push("holding steady");
  }
  return facts.slice(0, 2).join(" · ");
}

function Spark({ data }) {
  if (!data || data.length < 2) return null;
  const w = 58, h = 18;
  const mx = Math.max(...data), mn = Math.min(...data), rng = (mx - mn) || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - mn) / rng) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="#C4BFB2" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

// ---------- GRID ----------
function cellTone(cs) {
  switch (cs) {
    case "growth": return { bg: "#CFEADF", fg: "#0C6E50" };
    case "decline": return { bg: "#F6E0C6", fg: "#9A5A1E" };
    case "lost_recent": return { bg: "#F4D2CC", fg: "#B03A2A" };
    default: return { bg: "#FFFFFF", fg: "#6B665A" };
  }
}
const ITEM_W = 64, ROW_H = 50, HEAD_H = 50;
// account column width is computed at render time (≤ 1/3 of viewport) inside GridMatrix

function GridMatrix({ accounts }) {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState(null);
  const [acctW, setAcctW] = useState(150);
  const ids = useMemo(() => accounts.map(a => a.account_id), [accounts]);
  const idKey = ids.join(",");

  // size the frozen account column to at most 1/3 of the viewport (min 116, max 190)
  useEffect(() => {
    const calc = () => {
      const vw = typeof window !== "undefined" ? window.innerWidth : 390;
      const cap = Math.min(520, vw); // book maxWidth is 520
      setAcctW(Math.round(Math.max(116, Math.min(190, cap / 3))));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    if (!ids.length) { setItems([]); return; }
    let dead = false;
    (async () => {
      setItems(null);
      let all = [];
      const chunk = 200;
      for (let i = 0; i < ids.length; i += chunk) {
        const { data, error } = await supabase
          .from("item_grid")
          .select("account_id,product_key,item_name,l90,l52,cell_state")
          .in("account_id", ids.slice(i, i + chunk));
        if (error) { if (!dead) setErr(error.message); return; }
        all = all.concat(data || []);
      }
      if (!dead) setItems(all);
    })();
    return () => { dead = true; };
  }, [idKey]);

  const { cols, byAcct } = useMemo(() => {
    if (!items) return { cols: [], byAcct: {} };
    const totL52 = {}, name = {}, byAcct = {};
    for (const it of items) {
      totL52[it.product_key] = (totL52[it.product_key] || 0) + (it.l52 || 0);
      name[it.product_key] = it.item_name;
      (byAcct[it.account_id] ||= {})[it.product_key] = it;
    }
    const cols = Object.keys(totL52).sort((a, b) => totL52[b] - totL52[a]).map(k => ({ key: k, name: name[k] }));
    return { cols, byAcct };
  }, [items]);

  if (err) return <div style={{ color: "#B03A2A", fontSize: 13, padding: 16 }}>Couldn’t load items. {err}</div>;
  if (items === null) return <div style={{ color: "#B5B0A2", fontSize: 13, padding: 16 }}>Building grid…</div>;
  if (!cols.length) return <div style={{ color: "#9A968C", fontSize: 13, padding: 16 }}>No items in this selection.</div>;

  const ACCT_W = acctW;

  const corner = { position: "sticky", top: 0, left: 0, zIndex: 6, width: ACCT_W, minWidth: ACCT_W, maxWidth: ACCT_W, height: HEAD_H,
    background: "#EFEDE6", boxShadow: "2px 2px 4px rgba(0,0,0,.05)", padding: "0 9px", textAlign: "left",
    fontSize: 9.5, fontWeight: 600, color: "#9A968C", verticalAlign: "middle" };
  const headCell = { position: "sticky", top: 0, zIndex: 5, width: ITEM_W, minWidth: ITEM_W, height: HEAD_H,
    background: "#EFEDE6", boxShadow: "0 2px 4px rgba(0,0,0,.05)", padding: "3px 4px", verticalAlign: "middle",
    fontSize: 9, fontWeight: 600, color: "#6B665A", lineHeight: 1.1, textAlign: "center" };
  const rowHead = { position: "sticky", left: 0, zIndex: 4, width: ACCT_W, minWidth: ACCT_W, maxWidth: ACCT_W, height: ROW_H,
    background: "#FFFFFF", boxShadow: "2px 0 4px rgba(0,0,0,.04)", padding: "5px 9px", verticalAlign: "middle",
    textAlign: "left", borderBottom: "1px solid #ECE9E0" };

  return (
    <div className="nobar gridsnap" style={{ overflow: "auto", height: "100%", WebkitOverflowScrolling: "touch",
      scrollSnapType: "x proximity", scrollPaddingLeft: ACCT_W }}>
      <style>{`.gridsnap td.snapcol, .gridsnap th.snapcol { scroll-snap-align: start; }`}</style>
      <table style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={corner}>{accounts.length} accts · 90d cs</th>
            {cols.map(c => (
              <th key={c.key} className="snapcol" style={headCell}>
                <div style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.name}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {accounts.map((a, i) => {
            const lab = label(a.headline);
            return (
              <tr key={a.account_id}>
                <th style={rowHead}>
                  <a href={`/account/${a.account_id}`} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#C2BCAE", flexShrink: 0 }}>#{i + 1}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#2B2B2B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.account_name}</span>
                    </div>
                    <div style={{ fontSize: 9, color: "#A39E90", marginTop: 2, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.chain || "Independent"} · {a.city}
                    </div>
                  </a>
                </th>
                {cols.map(c => {
                  const it = byAcct[a.account_id]?.[c.key];
                  if (!it) return <td key={c.key} className="snapcol" style={{ width: ITEM_W, minWidth: ITEM_W, height: ROW_H, background: "#FAF9F5", borderBottom: "1px solid #ECE9E0", borderLeft: "1px solid #F1EFE8" }} />;
                  const tone = cellTone(it.cell_state);
                  const lost = it.cell_state === "lost_recent";
                  return (
                    <td key={c.key} className="snapcol" style={{ width: ITEM_W, minWidth: ITEM_W, height: ROW_H, background: tone.bg, borderBottom: "1px solid #ECE9E0", borderLeft: "1px solid #F1EFE8", textAlign: "center", verticalAlign: "middle" }}>
                      <a href={`/account/${a.account_id}/item/${c.key}`} style={{ textDecoration: "none", display: "block" }}>
                        {lost
                          ? <span style={{ fontSize: 13, fontWeight: 700, color: "#B03A2A" }}>✕</span>
                          : <span style={{ fontSize: 12, fontWeight: 600, color: tone.fg }}>{Math.round(it.l90 || 0)}</span>}
                      </a>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- TREE (scrolling taper, fading, names) ----------
function treeHeat(p) {
  if (p == null) return "#9A8F7A";
  if (p >= 15) return "#138A47";
  if (p >= 6) return "#3F9E5A";
  if (p >= 2) return "#6FA84F";
  if (p > -2) return "#9A8F7A";
  if (p >= -8) return "#C98A3A";
  if (p >= -20) return "#C0612E";
  return "#C0392B";
}
function hexA(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
const TREE_HEAD = [[1, 150], [1, 130], [2, 108], [2, 96], [3, 80], [3, 72], [4, 62], [4, 56], [4, 50]];
const TREE_TAIL = [[5, 44], [5, 40], [6, 36], [6, 32], [7, 28], [7, 26], [8, 23], [8, 21], [9, 19], [10, 17]];
function treePlan(n) {
  const plan = []; let used = 0;
  for (const row of TREE_HEAD) { if (used >= n) break; plan.push(row); used += row[0]; }
  let bi = 0;
  while (used < n) { const row = TREE_TAIL[Math.min(bi, TREE_TAIL.length - 1)]; plan.push(row); used += row[0]; bi++; }
  return plan;
}

function TreeMap({ accounts }) {
  const rows = useMemo(() => {
    const plan = treePlan(accounts.length);
    const out = []; let idx = 0;
    for (const [count, h] of plan) {
      if (idx >= accounts.length) break;
      out.push({ items: accounts.slice(idx, idx + count), count, h, start: idx });
      idx += count;
    }
    return out;
  }, [accounts]);
  const N = accounts.length || 1;

  return (
    <div className="nobar" style={{ height: "100%", overflowY: "auto", padding: "8px 12px 40px", WebkitOverflowScrolling: "touch" }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap: 5, marginBottom: 5 }}>
          {row.items.map((a, j) => {
            const gi = row.start + j;
            const alpha = Math.max(0.16, 1 - (gi / N) * 0.92);
            const col = treeHeat(a.prior90_pct);
            const bg = hexA(col, alpha);
            const tx = "#fff";
            const sh = "0 1px 3px rgba(0,0,0,.5)";
            const big = row.h >= 80, mid = row.h >= 50;
            const showName = row.h >= 28;
            const showPct = row.h >= 64 && a.prior90_pct != null;
            const clickable = row.h >= 40;
            const v = Math.round(a.account_weight || 0);
            const nameFont = big ? 14 : mid ? 12 : row.h >= 36 ? 10.5 : 9;
            const volFont = big ? 15 : mid ? 12 : 10;
            const inner = (
              <>
                {showName && (
                  <div style={{ fontSize: nameFont, fontWeight: 600, color: tx, lineHeight: 1.05, textShadow: sh, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.account_name}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <span style={{ fontSize: volFont, fontWeight: 700, color: tx, textShadow: sh }}>
                    {v.toLocaleString()}{big && <span style={{ fontSize: 9, fontWeight: 400, opacity: .85 }}> cs</span>}
                  </span>
                  {showPct && <span style={{ fontSize: 10.5, fontWeight: 600, color: tx, opacity: .92 }}>{a.prior90_pct > 0 ? "+" : ""}{a.prior90_pct}%</span>}
                </div>
              </>
            );
            const style = {
              flex: 1, minWidth: 0, height: row.h, background: bg, borderRadius: row.h >= 40 ? 9 : 5,
              padding: big ? "10px 11px" : mid ? "7px 9px" : "4px 6px",
              display: "flex", flexDirection: "column", justifyContent: showName ? "space-between" : "center",
              overflow: "hidden", textDecoration: "none", boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,.15)",
            };
            return clickable
              ? <a key={a.account_id} href={`/account/${a.account_id}`} style={style}>{inner}</a>
              : <div key={a.account_id} style={style}>{inner}</div>;
          })}
          {Array.from({ length: row.count - row.items.length }).map((_, k) => (
            <div key={"sp" + k} style={{ flex: 1, minWidth: 0 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

const CAP = 200, TREE_CAP = 500;
const scrollSel = {
  fontSize: 11.5, padding: "6px 9px", borderRadius: 8, border: "0.5px solid #D6D2C6",
  background: "#FFFFFF", color: "#4A463C", fontFamily: "inherit", minWidth: 96, flexShrink: 0,
  appearance: "none", WebkitAppearance: "none",
};
const VIEWS = ["account", "grid", "tree"];

function BookInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlView = searchParams.get("view");

  // incoming filters from links (Actions / Performance / Home)
  const linkIds = useMemo(() => { const v = searchParams.get("ids"); return v ? v.split(",").filter(Boolean) : null; }, [searchParams]);
  const linkCity = searchParams.get("city");
  const linkState = searchParams.get("state");
  const linkChain = searchParams.get("chain");
  const linkDist = searchParams.get("distributor");
  const linkHealth = searchParams.get("health"); // new | healthy | atrisk

  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [view, setView] = useState(VIEWS.includes(urlView) ? urlView : "account");
  const [stF, setStF] = useState("All");
  const [cityF, setCityF] = useState("All");
  const [chainF, setChainF] = useState("All");
  const [premF, setPremF] = useState("All");
  const [distF, setDistF] = useState("All");
  const [healthFilter, setHealthFilter] = useState(null);
  // link-driven scoping (separate from the dropdown filters)
  const [linkScope, setLinkScope] = useState(null);

  useEffect(() => {
    const v = searchParams.get("view");
    if (VIEWS.includes(v) && v !== view) setView(v);
    if (!v && view !== "account") setView("account");
  }, [searchParams]); // eslint-disable-line

  // apply incoming link params once on mount / when they change
  useEffect(() => {
    if (linkState && linkState !== "All") setStF(linkState);
    if (linkCity) setCityF(linkCity);
    if (linkChain) setChainF(linkChain);
    if (linkDist) setDistF(linkDist);
    if (linkHealth && ["new", "healthy", "atrisk"].includes(linkHealth)) setHealthFilter(linkHealth);
    if (linkIds && linkIds.length) {
      setLinkScope({ kind: "ids", ids: new Set(linkIds), n: linkIds.length });
    } else if (linkCity) {
      setLinkScope({ kind: "city", label: titleCase(linkCity) });
    } else if (linkChain) {
      setLinkScope({ kind: "chain", label: titleCase(linkChain) });
    } else if (linkDist) {
      setLinkScope({ kind: "distributor", label: titleCase(linkDist) });
    } else setLinkScope(null);
  }, [linkIds, linkCity, linkState, linkChain, linkDist, linkHealth]);

  function clearLink() {
    setLinkScope(null);
    setStF("All"); setCityF("All"); setChainF("All"); setDistF("All"); setHealthFilter(null);
    router.replace(view === "account" ? "/book" : `/book?view=${view}`, { scroll: false });
  }

  function changeView(k) {
    setView(k);
    const base = k === "account" ? "/book" : `/book?view=${k}`;
    router.replace(base, { scroll: false });
  }

  useEffect(() => {
    (async () => {
      let all = [], from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("account_list")
          .select("account_id,account_name,channel,chain,city,state,zip,distributor,account_weight,cur90,prior90_pct,cases_per_month,placements_delta,live_placements,live_prev,headline,lost_sku,growing_count,active_count,spark,last_invoice_date,last_order_w")
          .order("account_weight", { ascending: false })
          .range(from, from + 4999);
        if (error) { setErr(error.message); return; }
        all = all.concat(data || []);
        if (!data || data.length < 5000) break;
        from += 5000;
      }
      setRows(all);
    })();
  }, []);

  const states = useMemo(() => rows ? ["All", ...[...new Set(rows.map(r => r.state).filter(Boolean))].sort()] : ["All"], [rows]);
  const cities = useMemo(() => {
    if (!rows) return ["All"];
    const pool = stF === "All" ? rows : rows.filter(r => r.state === stF);
    return ["All", ...[...new Set(pool.map(r => r.city).filter(Boolean))].sort()];
  }, [rows, stF]);
  const chains = useMemo(() => {
    if (!rows) return ["All"];
    let pool = rows;
    if (stF !== "All") pool = pool.filter(r => r.state === stF);
    if (cityF !== "All") pool = pool.filter(r => r.city === cityF);
    return ["All", ...[...new Set(pool.map(r => r.chain).filter(Boolean))].sort()];
  }, [rows, stF, cityF]);
  const dists = useMemo(() => rows ? ["All", ...[...new Set(rows.map(r => r.distributor).filter(Boolean))].sort()] : ["All"], [rows]);

  const isOn = r => String(r.channel || "").toUpperCase().startsWith("ON");

  const geo = useMemo(() => {
    if (!rows) return null;
    let f = rows;
    if (linkScope?.kind === "ids") f = f.filter(r => linkScope.ids.has(r.account_id));
    if (stF !== "All") f = f.filter(r => r.state === stF);
    if (cityF !== "All") f = f.filter(r => r.city === cityF);
    if (chainF !== "All") f = f.filter(r => r.chain === chainF);
    if (premF !== "All") f = f.filter(r => premF === "ON" ? isOn(r) : !isOn(r));
    if (distF !== "All") f = f.filter(r => r.distributor === distF);
    return f;
  }, [rows, stF, cityF, chainF, premF, distF, linkScope]);

  const bal = useMemo(() => {
    if (!geo) return null;
    const g = { healthy: { n: 0, vol: 0 }, new: { n: 0, vol: 0 }, atrisk: { n: 0, vol: 0 } };
    for (const r of geo) {
      const k = groupOf(r.headline);
      g[k].n++;
      g[k].vol += isNew(r.headline) ? (r.cur90 || 0) * 3 : (r.account_weight || 0);
    }
    const tot = g.healthy.vol + g.new.vol + g.atrisk.vol || 1;
    return { ...g, tot, hp: Math.round(100 * g.healthy.vol / tot), np: Math.round(100 * g.new.vol / tot), rp: Math.round(100 * g.atrisk.vol / tot) };
  }, [geo]);

  const shownFull = useMemo(() => {
    if (!geo) return [];
    if (!healthFilter) return geo;
    return geo.filter(r => groupOf(r.headline) === healthFilter);
  }, [geo, healthFilter]);

  const shown = useMemo(() => shownFull.slice(0, CAP), [shownFull]);
  const shownTree = useMemo(() => shownFull.slice(0, TREE_CAP), [shownFull]);

  function toggleHealth(which) { setHealthFilter(h => h === which ? null : which); }

  if (err) return <div style={wrap}><p style={{ color: "#B03A2A", padding: 20, fontSize: 13 }}>Couldn’t load. {err}</p></div>;

  const fullBleed = view === "grid" || view === "tree";

  return (
    <div style={wrap}>
      <style>{`.nobar{scrollbar-width:none;-ms-overflow-style:none;}.nobar::-webkit-scrollbar{display:none;width:0;height:0;}`}</style>

      {/* link-scope banner */}
      {linkScope && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "10px 12px 0", padding: "8px 12px", background: "#EDE7F2", borderRadius: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "#5B4E7A" }}>
            Filtered{linkScope.kind === "ids" ? ` to ${linkScope.n} flagged account${linkScope.n === 1 ? "" : "s"}` : ` to ${linkScope.label}`} from your action list
          </span>
          <button onClick={clearLink} style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 16, border: "none", background: "#fff", color: "#7A6FA0", cursor: "pointer", fontFamily: "inherit" }}>clear ✕</button>
        </div>
      )}

      {/* one scrollable filter row */}
      <div className="nobar" style={{ display: "flex", gap: 6, padding: "12px 12px 8px", overflowX: "auto", flexShrink: 0 }}>
        <select style={scrollSel} value={stF} onChange={e => { setStF(e.target.value); setCityF("All"); setChainF("All"); }}>
          {states.map(s => <option key={s} value={s}>{s === "All" ? "State" : s}</option>)}
        </select>
        <select style={scrollSel} value={cityF} onChange={e => { setCityF(e.target.value); setChainF("All"); }}>
          {cities.map(c => <option key={c} value={c}>{c === "All" ? "City" : c}</option>)}
        </select>
        <select style={scrollSel} value={chainF} onChange={e => setChainF(e.target.value)}>
          {chains.map(c => <option key={c} value={c}>{c === "All" ? "Chain" : c}</option>)}
        </select>
        <select style={scrollSel} value={premF} onChange={e => setPremF(e.target.value)}>
          <option value="All">Premise</option>
          <option value="ON">On-premise</option>
          <option value="OFF">Off-premise</option>
        </select>
        <select style={scrollSel} value={distF} onChange={e => setDistF(e.target.value)}>
          {dists.map(d => <option key={d} value={d}>{d === "All" ? "Distributor" : d}</option>)}
        </select>
        <button disabled title="Coming soon"
          style={{ fontSize: 11.5, padding: "6px 12px", borderRadius: 8, whiteSpace: "nowrap", border: "0.5px solid #D6D2C6", background: "#F0EEE7", color: "#B5B0A2", fontFamily: "inherit", cursor: "not-allowed", flexShrink: 0 }}>
          ◎ Near me
        </button>
      </div>

      {/* view toggle */}
      <div style={{ display: "flex", gap: 4, padding: "0 12px 8px", flexShrink: 0 }}>
        {[["account", "Account"], ["grid", "Grid"], ["tree", "Tree"]].map(([k, t]) => (
          <button key={k} onClick={() => changeView(k)}
            style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: "7px 0", borderRadius: 8, cursor: "pointer", border: "none", fontFamily: "inherit",
              background: view === k ? "#2B2B2B" : "#E6E3DB", color: view === k ? "#fff" : "#7E7B73" }}>
            {t}
          </button>
        ))}
      </div>

      {/* health bar */}
      {bal && (
        <div style={{ padding: "0 12px 10px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 10.5, color: "#6B665A" }}>
            <span><span style={{ color: "#3E86C7", fontWeight: 700 }}>●</span> New <b style={{ color: "#2B2B2B" }}>{bal.new.n.toLocaleString()}</b> accts</span>
            <span><span style={{ color: "#1F9D72", fontWeight: 700 }}>●</span> Healthy <b style={{ color: "#2B2B2B" }}>{bal.healthy.n.toLocaleString()}</b> accts</span>
            <span><span style={{ color: "#D9694A", fontWeight: 700 }}>●</span> At Risk/Lapsed <b style={{ color: "#2B2B2B" }}>{bal.atrisk.n.toLocaleString()}</b> accts</span>
          </div>
          <div style={{ display: "flex", height: 24, borderRadius: 7, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
            <div onClick={() => toggleHealth("new")}
              style={{ width: `${bal.np}%`, background: "#3E86C7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minWidth: 34, overflow: "hidden",
                opacity: healthFilter && healthFilter !== "new" ? 0.34 : 1, transition: "opacity .15s" }}>
              <span style={{ color: "#fff", fontSize: 10.5, fontWeight: 700 }}>{bal.np}%</span>
            </div>
            <div onClick={() => toggleHealth("healthy")}
              style={{ width: `${bal.hp}%`, background: "#1F9D72", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minWidth: 34, overflow: "hidden",
                opacity: healthFilter && healthFilter !== "healthy" ? 0.34 : 1, transition: "opacity .15s" }}>
              <span style={{ color: "#fff", fontSize: 10.5, fontWeight: 700 }}>{bal.hp}%</span>
            </div>
            <div onClick={() => toggleHealth("atrisk")}
              style={{ width: `${bal.rp}%`, background: "#D9694A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minWidth: 34, overflow: "hidden",
                opacity: healthFilter && healthFilter !== "atrisk" ? 0.34 : 1, transition: "opacity .15s" }}>
              <span style={{ color: "#fff", fontSize: 10.5, fontWeight: 700 }}>{bal.rp}%</span>
            </div>
          </div>
          <div style={{ fontSize: 9, color: "#B0AB9D", marginTop: 4, textAlign: "center" }}>% of territory based on annual volume</div>
          {healthFilter && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 7 }}>
              <button onClick={() => setHealthFilter(null)}
                style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                  border: "0.5px solid #D6D2C6", background: "#fff", color: "#6B665A" }}>
                Showing {healthFilter === "atrisk" ? "at-risk" : healthFilter} only · reset ✕
              </button>
            </div>
          )}
        </div>
      )}

      {view === "grid" && (
        <div style={{ display: "flex", gap: 12, padding: "0 12px 8px", fontSize: 9.5, color: "#9A968C", flexShrink: 0, flexWrap: "wrap" }}>
          <span><span style={{ display: "inline-block", width: 9, height: 9, background: "#CFEADF", borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />growing</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, background: "#F6E0C6", borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />softening</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, background: "#fff", border: "0.5px solid #D6D2C6", borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />steady</span>
          <span><span style={{ color: "#B03A2A", fontWeight: 700, marginRight: 2 }}>✕</span>lost</span>
          <span style={{ marginLeft: "auto" }}>cols by L52 vol · cells 90d cs</span>
        </div>
      )}

      <div className="nobar" style={{ flex: 1, overflow: fullBleed ? "hidden" : "auto", minHeight: 0,
        padding: view === "grid" ? "0 0 0 12px" : view === "tree" ? "0" : "0 12px 40px", WebkitOverflowScrolling: "touch" }}>
        {!rows && <Splash fixed={false} />}

        {view === "grid" && rows && <GridMatrix accounts={shown} />}
        {view === "tree" && rows && <TreeMap accounts={shownTree} />}

        {view === "account" && shown.map((r, i) => {
          const lab = label(r.headline);
          const v = Math.round(r.account_weight || 0);
          const pct = r.prior90_pct;
          const note = buildNote(r);
          const stale = (r.last_order_w != null && r.last_order_w >= 2) ? r.last_order_w * 30 : null;
          const loc = `${titleCase(r.channel)} · ${r.chain || "Independent"} · ${r.city}`;

          return (
            <div key={r.account_id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#BBB5A7", width: 22, textAlign: "right", flexShrink: 0 }}>#{i + 1}</span>
              <a href={`/account/${r.account_id}`}
                style={{ flex: 1, minWidth: 0, display: "block", background: "#fff", borderRadius: 11, padding: "10px 13px", textDecoration: "none", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 600, color: "#2B2B2B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.account_name}</span>
                      {lab && <span style={{ fontSize: 10, fontWeight: 700, color: lab.c, background: lab.bg, padding: "2px 8px", borderRadius: 11, whiteSpace: "nowrap", flexShrink: 0 }}>{lab.t}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#9A968C", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{loc}</div>
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
                    <div><span style={{ fontSize: 17, fontWeight: 700, color: "#2B2B2B" }}>{v.toLocaleString()}</span><span style={{ fontSize: 10, color: "#9A968C" }}> cs/yr</span></div>
                    <div style={{ fontSize: 11, marginTop: 1 }}>
                      {pct != null && <span style={{ fontWeight: 700, color: pctColor(pct) }}>{pct > 0 ? "▲" : pct < 0 ? "▼" : "▬"} {Math.abs(pct)}%</span>}
                      {r.cases_per_month != null && <span style={{ color: "#9A968C" }}> · {r.cases_per_month}/mo</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 7, gap: 10 }}>
                  <span style={{ fontSize: 11, color: lab ? lab.c : "#8A8678", lineHeight: 1.3, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {note}{stale && <span style={{ color: "#B03A2A", fontWeight: 600 }}> · {stale}d+ no order</span>}
                  </span>
                  {!isNew(r.headline) && <span style={{ flexShrink: 0, opacity: 0.9 }}><Spark data={r.spark} /></span>}
                </div>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div style={wrap} />}>
      <BookInner />
    </Suspense>
  );
}

const wrap = { background: "#F2F0EA", height: "100vh", maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column" };