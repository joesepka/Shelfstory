"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Splash from "../../components/Splash";
import { useExplode } from "../../lib/useExplode";
import FilterSelect from "../../components/FilterSelect";
import TreeGlyph from "../../components/TreeGlyph";
import { getScope } from "../../lib/scope";


function label(hd) {
  switch (String(hd || "").toLowerCase().trim()) {
    case "accelerating": return { t: "Accelerating", c: "var(--growing-ink)", bg: "var(--growing-bg)" };
    case "at-risk": case "atrisk": case "at risk": return { t: "At risk", c: "var(--atrisk-ink)", bg: "var(--atrisk-bg)" };
    case "decelerating": return { t: "Softening", c: "var(--watch-ink)", bg: "var(--watch-bg)" };
    case "new": return { t: "New", c: "var(--new-ink)", bg: "var(--new-bg)" };
    case "lapsed": return { t: "Lapsed", c: "#fff", bg: "#8B3A2B" };
    default: return null;
  }
}
const DECLINING = new Set(["decelerating", "at-risk", "atrisk", "at risk", "lapsed"]);
function isDeclining(hd) { return DECLINING.has(String(hd || "").toLowerCase().trim()); }
function isNew(hd) { return String(hd || "").toLowerCase().trim() === "new"; }
function isLapsed(hd) { return String(hd || "").toLowerCase().trim() === "lapsed"; }
function groupOf(hd) { return isNew(hd) ? "new" : isLapsed(hd) ? "lapsed" : isDeclining(hd) ? "atrisk" : "healthy"; }
function titleCase(s) { return String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
function pctColor(p) { if (p == null) return "var(--text-3)"; if (p > 1) return "var(--up)"; if (p < -1) return "var(--down)"; return "var(--text-3)"; }
// bracket accent color by status (green growing · orange risk · blue new · muted steady)
function bracketColor(hd) {
  const h = String(hd || "").toLowerCase().trim();
  if (h === "accelerating") return "var(--accent)";
  if (h === "new") return "var(--pop-cool)";
  if (DECLINING.has(h)) return "var(--pop-warm)";
  return "var(--text-3)";
}
// tap-feedback tint by health severity — green (healthy / accelerating) ·
// yellow (decelerating) · red (at-risk / lapsed)
function cardTapBg(hd) {
  const h = String(hd || "").toLowerCase().trim();
  if (h === "at-risk" || h === "atrisk" || h === "at risk" || h === "lapsed") return "#f4d9cf";
  if (h === "decelerating") return "#f6ead0";
  return "#dcefda";
}
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
      <polyline points={pts} fill="none" stroke="#C6CFBC" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

// ---------- GRID ----------
function cellTone(cs) {
  switch (cs) {
    case "growth": return { bg: "var(--growing-bg)", fg: "var(--growing-ink)" };
    case "decline": return { bg: "var(--watch-bg)", fg: "var(--watch-ink)" };
    case "lost_recent": return { bg: "var(--atrisk-bg)", fg: "var(--atrisk-ink)" };
    default: return { bg: "var(--surface)", fg: "var(--text-2)" };
  }
}
const ITEM_W = 64, ROW_H = 50, HEAD_H = 50, TOTAL_W = 56;

function hasPlacement(it) { return !!it && (it.l90 || 0) > 0; }

function GridMatrix({ accounts }) {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState(null);
  const [acctW, setAcctW] = useState(150);
  const [colFilters, setColFilters] = useState([]);
  const [menuKey, setMenuKey] = useState(null);
  const ids = useMemo(() => accounts.map(a => a.account_id), [accounts]);
  const idKey = ids.join(",");

  useEffect(() => {
    const calc = () => {
      const vw = typeof window !== "undefined" ? window.innerWidth : 390;
      const cap = Math.min(520, vw);
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

  const fAccounts = useMemo(() => {
    if (!colFilters.length) return accounts;
    return accounts.filter(a => colFilters.every(f => {
      const placed = hasPlacement(byAcct[a.account_id]?.[f.key]);
      return f.mode === "placed" ? placed : !placed;
    }));
  }, [accounts, colFilters, byAcct]);

  function applyFilter(key, name, mode) {
    setColFilters(prev => {
      const others = prev.filter(f => f.key !== key);
      const existing = prev.find(f => f.key === key);
      if (existing && existing.mode === mode) return others;
      return [...others, { key, name, mode }];
    });
    setMenuKey(null);
  }
  function removeFilter(key) { setColFilters(prev => prev.filter(f => f.key !== key)); }
  function clearFilters() { setColFilters([]); }
  const filterOf = key => colFilters.find(f => f.key === key);

  if (err) return <div style={{ color: "var(--down)", fontSize: 13, padding: 16 }}>Couldn’t load items. {err}</div>;
  if (items === null) return <div style={{ color: "var(--text-3)", fontSize: 13, padding: 16 }}>Building grid…</div>;
  if (!cols.length) return <div style={{ color: "var(--text-3)", fontSize: 13, padding: 16 }}>No items in this selection.</div>;

  const ACCT_W = acctW;

  const corner = { position: "sticky", top: 0, left: 0, zIndex: 6, width: ACCT_W, minWidth: ACCT_W, maxWidth: ACCT_W, height: HEAD_H,
    background: "#E8EDE0", boxShadow: "2px 2px 4px rgba(45,60,40,.05)", padding: "0 9px", textAlign: "left",
    fontSize: 9.5, fontWeight: 600, color: "var(--text-3)", verticalAlign: "middle" };
  const totalHead = { position: "sticky", top: 0, zIndex: 5, width: TOTAL_W, minWidth: TOTAL_W, height: HEAD_H,
    background: "#EDEFE9", boxShadow: "0 2px 4px rgba(45,60,40,.05)", padding: "3px 4px", verticalAlign: "middle",
    fontSize: 9, fontWeight: 600, color: "var(--text-3)", lineHeight: 1.1, textAlign: "center" };
  const headCell = { position: "sticky", top: 0, zIndex: 5, width: ITEM_W, minWidth: ITEM_W, height: HEAD_H,
    background: "#E8EDE0", boxShadow: "0 2px 4px rgba(45,60,40,.05)", padding: "3px 4px", verticalAlign: "middle",
    fontSize: 9, fontWeight: 600, color: "var(--text-2)", lineHeight: 1.1, textAlign: "center" };
  const rowHead = { position: "sticky", left: 0, zIndex: 4, width: ACCT_W, minWidth: ACCT_W, maxWidth: ACCT_W, height: ROW_H,
    background: "var(--surface)", boxShadow: "2px 0 4px rgba(45,60,40,.04)", padding: "5px 9px", verticalAlign: "middle",
    textAlign: "left", borderBottom: "1px solid var(--border)" };

  return (
    <>
      {colFilters.length > 0 && (
        <div className="nobar" style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", padding: "0 0 8px", flexShrink: 0 }}>
          {colFilters.map(f => (
            <span key={f.key} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700,
              padding: "4px 6px 4px 9px", borderRadius: 20, whiteSpace: "nowrap",
              color: f.mode === "gaps" ? "var(--pop-warm-deep)" : "var(--accent-deep)",
              background: f.mode === "gaps" ? "var(--pop-warm-soft)" : "var(--accent-soft)" }}>
              {titleCase(f.name)} · {f.mode === "gaps" ? "gaps" : "placed"}
              <span onClick={() => removeFilter(f.key)} style={{ cursor: "pointer", opacity: .7, fontWeight: 700 }}>✕</span>
            </span>
          ))}
          <span onClick={clearFilters} style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: "var(--accent-deep)", textDecoration: "underline", cursor: "pointer", whiteSpace: "nowrap" }}>Clear all</span>
          <span style={{ flexShrink: 0, fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}>· {fAccounts.length} of {accounts.length}</span>
        </div>
      )}

      <div className="nobar gridscroll" style={{ overflow: "auto", height: "100%", WebkitOverflowScrolling: "touch",
        touchAction: "pan-x pan-y", overscrollBehavior: "contain", contain: "layout paint", willChange: "transform" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={corner}>{fAccounts.length} accts · 90d cs</th>
              <th style={totalHead}>90D<br/>total</th>
              {cols.map(c => {
                const active = filterOf(c.key);
                const open = menuKey === c.key;
                return (
                  <th key={c.key} style={{ ...headCell, position: "sticky", cursor: "pointer",
                    background: active ? (active.mode === "gaps" ? "var(--pop-warm-soft)" : "var(--accent-soft)") : headCell.background,
                    color: active ? (active.mode === "gaps" ? "var(--pop-warm-deep)" : "var(--accent-deep)") : headCell.color }}
                    onClick={() => setMenuKey(open ? null : c.key)}>
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.name}</div>
                      <span style={{ fontSize: 7, opacity: .65 }}>▾</span>
                      {open && (
                        <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 3, zIndex: 30,
                          background: "var(--surface)", border: "0.5px solid var(--border-strong)", borderRadius: 9, boxShadow: "var(--shadow-pop)", width: 132, overflow: "hidden", textAlign: "left" }}>
                          <div style={{ fontSize: 8, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: .4, padding: "7px 10px 3px" }}>{titleCase(c.name)}</div>
                          <button onClick={() => applyFilter(c.key, c.name, "gaps")} style={menuBtn(active?.mode === "gaps")}>
                            Show gaps<span style={menuSub}>no 90-day cases</span>
                          </button>
                          <button onClick={() => applyFilter(c.key, c.name, "placed")} style={menuBtn(active?.mode === "placed")}>
                            Has placement<span style={menuSub}>pulling now</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {fAccounts.map((a, i) => {
              const lab = label(a.headline);
              const tot90 = Math.round(a.cur90 || 0);
              return (
                <tr key={a.account_id}>
                  <th style={rowHead}>
                    <a href={`/account/${a.account_id}`} style={{ textDecoration: "none", display: "block" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", flexShrink: 0 }}>#{i + 1}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.account_name}</span>
                      </div>
                      <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {a.city} · {a.chain || "Independent"}
                      </div>
                    </a>
                  </th>
                  <td style={{ width: TOTAL_W, minWidth: TOTAL_W, height: ROW_H, background: "#F6F7F2", borderBottom: "1px solid var(--border)", borderLeft: "1px solid #EEF2E8", textAlign: "center", verticalAlign: "middle" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-3)", fontFeatureSettings: '"tnum" 1, "lnum" 1' }}>{tot90.toLocaleString()}</span>
                  </td>
                  {cols.map(c => {
                    const it = byAcct[a.account_id]?.[c.key];
                    if (!it) return <td key={c.key} style={{ width: ITEM_W, minWidth: ITEM_W, height: ROW_H, background: "#F4F7EF", borderBottom: "1px solid var(--border)", borderLeft: "1px solid #EEF2E8" }} />;
                    const tone = cellTone(it.cell_state);
                    const lost = it.cell_state === "lost_recent";
                    return (
                      <td key={c.key} style={{ width: ITEM_W, minWidth: ITEM_W, height: ROW_H, background: tone.bg, borderBottom: "1px solid var(--border)", borderLeft: "1px solid #EEF2E8", textAlign: "center", verticalAlign: "middle" }}>
                        <a href={`/account/${a.account_id}/item/${c.key}`} style={{ textDecoration: "none", display: "block" }}>
                          {lost
                            ? <span style={{ fontSize: 13, fontWeight: 700, color: "var(--atrisk-ink)" }}>✕</span>
                            : <span style={{ fontSize: 12, fontWeight: 600, color: tone.fg }}>{Math.round(it.l90 || 0)}</span>}
                        </a>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {fAccounts.length === 0 && (
              <tr><td colSpan={cols.length + 2} style={{ padding: 16, fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>No accounts match these item filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
const menuBtn = on => ({ display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer", fontFamily: "inherit",
  fontSize: 11.5, fontWeight: 600, padding: "8px 10px", color: on ? "var(--accent-deep)" : "var(--text)",
  background: on ? "var(--accent-soft)" : "transparent" });
const menuSub = { display: "block", fontSize: 8.5, fontWeight: 500, color: "var(--text-3)", marginTop: 1 };

// ---------- TREE ----------
function treeHeat(p) {
  if (p == null) return "#9AA593";
  if (p >= 15) return "#2E7D54";
  if (p >= 6) return "#4A9068";
  if (p >= 2) return "#6AA06A";
  if (p > -2) return "#9AA593";
  if (p >= -8) return "#C2922E";
  if (p >= -20) return "#C56A4A";
  return "#B0573A";
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
    <div className="nobar" style={{ height: "100%", overflowY: "auto", padding: "8px 12px 40px", WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}>
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
const VIEWS = ["account", "grid", "tree"];

function BookInner() {
  const router = useRouter();
  const { burst, styleFor } = useExplode();
  const searchParams = useSearchParams();
  const urlView = searchParams.get("view");

  const linkIds = useMemo(() => { const v = searchParams.get("ids"); return v ? v.split(",").filter(Boolean) : null; }, [searchParams]);
  const linkCity = searchParams.get("city");
  const linkState = searchParams.get("state");
  const linkChain = searchParams.get("chain");
  const linkDist = searchParams.get("distributor");
  const linkHealth = searchParams.get("health"); // new | healthy | atrisk | lapsed

  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [tapId, setTapId] = useState(null);
  const [view, setView] = useState(VIEWS.includes(urlView) ? urlView : "account");
  const [q, setQ] = useState("");
  const [stF, setStF] = useState("All");
  const [cityF, setCityF] = useState("All");
  const [chainF, setChainF] = useState("All");
  const [premF, setPremF] = useState("All");
  const [distF, setDistF] = useState("All");
  const [healthFilter, setHealthFilter] = useState(null);
  const [linkScope, setLinkScope] = useState(null);

  useEffect(() => {
    const v = searchParams.get("view");
    if (VIEWS.includes(v) && v !== view) setView(v);
    if (!v && view !== "account") setView("account");
  }, [searchParams]); // eslint-disable-line

  useEffect(() => {
    if (linkState && linkState !== "All") setStF(linkState);
    else { const sc = getScope(); if (sc) setStF(sc); }   // remembered scope from home
    if (linkCity) setCityF(linkCity);
    if (linkChain) setChainF(linkChain);
    if (linkDist) setDistF(linkDist);
    if (linkHealth && ["new", "healthy", "atrisk", "lapsed"].includes(linkHealth)) setHealthFilter(linkHealth);
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
    const g = { healthy: { n: 0, vol: 0 }, new: { n: 0, vol: 0 }, atrisk: { n: 0, vol: 0 }, lapsed: { n: 0, vol: 0 } };
    for (const r of geo) {
      const k = groupOf(r.headline);
      g[k].n++;
      g[k].vol += isNew(r.headline) ? (r.cur90 || 0) * 3 : (r.account_weight || 0);
    }
    const tot = g.healthy.vol + g.new.vol + g.atrisk.vol + g.lapsed.vol || 1;
    return { ...g, tot, hp: Math.round(100 * g.healthy.vol / tot), np: Math.round(100 * g.new.vol / tot), rp: Math.round(100 * g.atrisk.vol / tot), lp: Math.round(100 * g.lapsed.vol / tot) };
  }, [geo]);

  const shownFull = useMemo(() => {
    let f = geo || [];
    if (healthFilter === "lapsed") f = f.filter(r => isLapsed(r.headline));
    else if (healthFilter) f = f.filter(r => groupOf(r.headline) === healthFilter);
    const t = q.trim().toLowerCase();
    if (t) f = f.filter(r => String(r.account_name || "").toLowerCase().includes(t));
    return f;
  }, [geo, healthFilter, q]);

  const shown = useMemo(() => shownFull.slice(0, CAP), [shownFull]);
  const shownTree = useMemo(() => shownFull.slice(0, TREE_CAP), [shownFull]);

  function toggleHealth(which) { setHealthFilter(h => h === which ? null : which); }

  if (err) return <div style={wrap}><p style={{ color: "var(--down)", padding: 20, fontSize: 13 }}>Couldn’t load. {err}</p></div>;

  const fullBleed = view === "grid" || view === "tree";

  return (
    <div className="pagefade" style={wrap}>
      <style>{`.nobar{scrollbar-width:none;-ms-overflow-style:none;}.nobar::-webkit-scrollbar{display:none;width:0;height:0;}`}</style>

      {linkScope && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "10px 12px 0", padding: "8px 12px", background: "var(--pop-cool-soft)", borderRadius: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "var(--pop-cool-deep)" }}>
            Filtered{linkScope.kind === "ids" ? ` to ${linkScope.n} flagged account${linkScope.n === 1 ? "" : "s"}` : ` to ${linkScope.label}`} from your action list
          </span>
          <button onClick={clearLink} style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 16, border: "none", background: "var(--surface)", color: "var(--pop-cool-deep)", cursor: "pointer", fontFamily: "inherit" }}>clear ✕</button>
        </div>
      )}

      <div style={{ padding: "10px 12px 2px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "0.5px solid var(--border-strong)", borderRadius: 11, padding: "9px 12px", boxShadow: "var(--shadow-sm)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9AA593" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search accounts by name…"
            style={{ border: "none", background: "none", outline: "none", fontFamily: "inherit", fontSize: 13, color: "var(--text)", width: "100%" }} />
          {q && <span onClick={() => setQ("")} style={{ cursor: "pointer", color: "var(--text-3)", fontWeight: 700, fontSize: 13 }}>✕</span>}
        </div>
      </div>

      <div className="nobar" style={{ display: "flex", gap: 6, padding: "10px 12px 8px", overflowX: "auto", flexShrink: 0 }}>
        <FilterSelect label="State" value={stF} options={states} onChange={v => { setStF(v); setCityF("All"); setChainF("All"); }} display={s => s === "All" ? "All states" : s} />
        <FilterSelect label="City" value={cityF} options={cities} onChange={v => { setCityF(v); setChainF("All"); }} display={c => c === "All" ? "All cities" : c} />
        <FilterSelect label="Chain" value={chainF} options={chains} onChange={setChainF} display={c => c === "All" ? "All chains" : c} />
        <FilterSelect label="Premise" value={premF} options={["All", "ON", "OFF"]} onChange={setPremF} display={p => p === "ON" ? "On-premise" : p === "OFF" ? "Off-premise" : "All premise"} />
        <FilterSelect label="Distributor" value={distF} options={dists} onChange={setDistF} display={d => d === "All" ? "All distributors" : d} />
        <button disabled title="Coming soon"
          style={{ flexShrink: 0, fontSize: 11.5, padding: "8px 11px", borderRadius: 10, whiteSpace: "nowrap", border: "0.5px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text-3)", fontFamily: "inherit", cursor: "not-allowed", boxSizing: "border-box" }}>
          ◎ Near me
        </button>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "0 12px 8px", flexShrink: 0 }}>
        {[["account", "Account"], ["grid", "Grid"], ["tree", "Tree"]].map(([k, t]) => (
          <button key={k} onClick={() => changeView(k)} className="tapd"
            style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: "7px 0", borderRadius: 8, cursor: "pointer", border: "none", fontFamily: "inherit",
              background: view === k ? "var(--text-2)" : "var(--surface-2)", color: view === k ? "#fff" : "var(--text-2)" }}>
            {t}
          </button>
        ))}
      </div>

      {bal && (
        <div style={{ padding: "0 12px 10px", flexShrink: 0 }}>
          <div style={{ display: "flex", height: 15, borderRadius: 6, overflow: "hidden", marginBottom: 7, boxShadow: "0 1px 2px rgba(45,60,40,.06)" }}>
            <div onClick={() => toggleHealth("new")}
              style={{ width: `${bal.np}%`, background: "var(--pop-cool)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minWidth: 30, overflow: "hidden",
                opacity: healthFilter && healthFilter !== "new" ? 0.32 : 1,
                boxShadow: healthFilter === "new" ? "inset 0 0 0 2px rgba(255,255,255,.72)" : "none", transition: "opacity .15s" }}>
              <span style={{ color: "#fff", fontSize: 8.5, fontWeight: 700 }}>{bal.np}%</span>
            </div>
            <div onClick={() => toggleHealth("healthy")}
              style={{ width: `${bal.hp}%`, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minWidth: 30, overflow: "hidden",
                opacity: healthFilter && healthFilter !== "healthy" ? 0.32 : 1,
                boxShadow: healthFilter === "healthy" ? "inset 0 0 0 2px rgba(255,255,255,.72)" : "none", transition: "opacity .15s" }}>
              <span style={{ color: "#fff", fontSize: 8.5, fontWeight: 700 }}>{bal.hp}%</span>
            </div>
            <div onClick={() => toggleHealth("atrisk")}
              style={{ width: `${bal.rp}%`, background: "var(--pop-warm)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minWidth: 28, overflow: "hidden",
                opacity: healthFilter && healthFilter !== "atrisk" ? 0.32 : 1,
                boxShadow: healthFilter === "atrisk" ? "inset 0 0 0 2px rgba(255,255,255,.72)" : "none", transition: "opacity .15s" }}>
              <span style={{ color: "#fff", fontSize: 8.5, fontWeight: 700 }}>{bal.rp}%</span>
            </div>
            <div onClick={() => toggleHealth("lapsed")}
              style={{ width: `${bal.lp}%`, background: "#8B3A2B", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minWidth: 26, overflow: "hidden",
                opacity: healthFilter && healthFilter !== "lapsed" ? 0.32 : 1,
                boxShadow: healthFilter === "lapsed" ? "inset 0 0 0 2px rgba(255,255,255,.72)" : "none", transition: "opacity .15s" }}>
              <span style={{ color: "#fff", fontSize: 8.5, fontWeight: 700 }}>{bal.lp}%</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-2)" }}>
            <span onClick={() => toggleHealth("new")} style={{ cursor: "pointer" }}>
              <span style={{ color: "var(--pop-cool)", fontWeight: 700 }}>●</span> New <b style={{ color: "var(--text)" }}>{bal.new.n.toLocaleString()}</b>
            </span>
            <span onClick={() => toggleHealth("healthy")} style={{ cursor: "pointer" }}>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>●</span> Healthy <b style={{ color: "var(--text)" }}>{bal.healthy.n.toLocaleString()}</b>
            </span>
            <span onClick={() => toggleHealth("atrisk")} style={{ cursor: "pointer" }}>
              <span style={{ color: "var(--pop-warm)", fontWeight: 700 }}>●</span> At Risk <b style={{ color: "var(--text)" }}>{bal.atrisk.n.toLocaleString()}</b>
            </span>
            <span onClick={() => toggleHealth("lapsed")} style={{ cursor: "pointer" }}>
              <span style={{ color: "#8B3A2B", fontWeight: 700 }}>●</span> Lapsed <b style={{ color: "var(--text)" }}>{bal.lapsed.n.toLocaleString()}</b>
            </span>
          </div>
          {healthFilter && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 7 }}>
              <button onClick={() => setHealthFilter(null)}
                style={{ fontSize: 10.5, fontWeight: 600, padding: "3px 11px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                  border: "0.5px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-2)" }}>
                Showing {healthFilter === "atrisk" ? "at-risk" : healthFilter} only · clear ✕
              </button>
            </div>
          )}
        </div>
      )}

      {view === "grid" && (
        <div style={{ display: "flex", gap: 12, padding: "0 12px 8px", fontSize: 9.5, color: "var(--text-3)", flexShrink: 0, flexWrap: "wrap" }}>
          <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--growing-bg)", borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />growing</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--watch-bg)", borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />softening</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, background: "var(--surface)", border: "0.5px solid var(--border-strong)", borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />steady</span>
          <span><span style={{ color: "var(--atrisk-ink)", fontWeight: 700, marginRight: 2 }}>✕</span>lost</span>
          <span style={{ marginLeft: "auto" }}>tap a column ▾ to filter · grey = 90D total · cells 90d cs</span>
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
          const loc = `${r.city} · ${r.chain || "Independent"}`;
          const bc = bracketColor(r.headline);
          const lapsed = isLapsed(r.headline);

          const href = `/account/${r.account_id}`;
          return (
            <a key={r.account_id} href={href}
              onClick={(e) => { e.preventDefault(); setTapId(r.account_id); burst(r.account_id, () => router.push(href)); }}
              style={{ position: "relative", display: "block", background: tapId === r.account_id ? cardTapBg(r.headline) : lapsed ? "var(--lapsed-card-bg)" : (pct != null && pct >= 30 ? "#e3f3db" : "var(--surface)"), transition: "background .15s ease", borderRadius: "var(--r-md)", padding: "9px 13px 10px", marginBottom: 9, textDecoration: "none", boxShadow: "var(--shadow)", ...(styleFor(r.account_id) || {}) }}>
              <span aria-hidden="true" style={{ position: "absolute", top: -1, left: -1, width: 15, height: 15, borderTop: `2px solid ${bc}`, borderLeft: `2px solid ${bc}`, borderTopLeftRadius: 7 }} />
              <span aria-hidden="true" style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderBottom: `1.5px solid ${bc}`, borderRight: `1.5px solid ${bc}`, borderBottomRightRadius: 7, opacity: 0.4 }} />

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 30, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <TreeGlyph headline={r.headline} pct={pct} h={38} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)" }}>#{i + 1}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.account_name}</span>
                      {lab && <span style={{ fontSize: 9, fontWeight: 700, color: lab.c, background: lab.bg, padding: "2px 7px", borderRadius: 11, whiteSpace: "nowrap", flexShrink: 0 }}>{lab.t}</span>}
                    </div>
                    <div style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
                      <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px" }}>{v.toLocaleString()}</span><span style={{ fontSize: 10, color: "var(--text-3)" }}> cs/yr</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginTop: 3 }}>
                    <span style={{ fontSize: 10.5, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{loc}</span>
                    <span style={{ fontSize: 11, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {pct != null && <span style={{ fontWeight: 700, color: pctColor(pct) }}>{pct > 0 ? "▲" : pct < 0 ? "▼" : "▬"} {Math.abs(pct)}%</span>}
                      {r.cases_per_month != null && <span style={{ color: "var(--text-3)" }}> · {r.cases_per_month}/mo</span>}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6, gap: 10 }}>
                    <span style={{ fontSize: 11, color: lab ? lab.c : "var(--text-2)", lineHeight: 1.3, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {note}{stale && <span style={{ color: "var(--down)", fontWeight: 600 }}> · {stale}d+ no order</span>}
                    </span>
                    {!isNew(r.headline) && <span style={{ flexShrink: 0, opacity: 0.9 }}><Spark data={r.spark} /></span>}
                  </div>
                </div>
              </div>
            </a>
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

const wrap = { background: "var(--bg)", height: "100vh", maxWidth: "var(--maxw)", margin: "0 auto", display: "flex", flexDirection: "column" };