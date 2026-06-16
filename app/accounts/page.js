"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import LoadingScreen from "../../components/LoadingScreen";
import GridView from "../../components/GridView";

const BADGE = {
  "Accelerating": { bg: "var(--growing-bg)", fg: "var(--growing-ink)" },
  "Stable":       { bg: "var(--stable-bg)",  fg: "var(--stable-ink)" },
  "Decelerating": { bg: "var(--watch-bg)",   fg: "var(--watch-ink)" },
  "At-Risk":      { bg: "var(--atrisk-bg)",  fg: "var(--atrisk-ink)" },
  "New":          { bg: "var(--new-bg)",     fg: "var(--new-ink)" },
  "Lapsed":       { bg: "transparent",       fg: "var(--lapsed-ink)", bd: "0.5px solid var(--border-strong)" },
};
const SPARKC = {
  "Accelerating": "var(--growing-ink)", "Stable": "var(--text-3)",
  "Decelerating": "var(--watch-ink)", "At-Risk": "var(--atrisk-ink)",
};
const TYPES = ["All", "Accelerating", "Stable", "Decelerating", "At-Risk", "New", "Lapsed"];

function titleCase(s) {
  if (!s) return "";
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function lastSold(iso) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleString("en-US", { month: "short" }) + " '" + String(d.getFullYear()).slice(2);
}

function Spark({ vals, color }) {
  if (!vals || vals.length < 2) return null;
  const w = 120, h = 32, p = 3;
  const mx = Math.max(...vals, 1), mn = Math.min(...vals), rng = mx - mn || 1;
  const pts = vals.map((v, i) => {
    const x = p + (i / (vals.length - 1)) * (w - 2 * p);
    const y = h - p - ((v - mn) / rng) * (h - 2 * p);
    return [x, y];
  });
  const d = pts.map((pt, i) => (i ? "L" : "M") + pt[0].toFixed(1) + " " + pt[1].toFixed(1)).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  );
}

const selStyle = {
  fontSize: 13, padding: "7px 10px", borderRadius: "var(--r-md)",
  border: "0.5px solid var(--border-strong)", background: "var(--surface)",
  color: "var(--text)", fontFamily: "inherit", flex: 1, minWidth: 0,
};

export default function AccountsPage() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [view, setView] = useState("detail");
  const [type, setType] = useState("All");
  const [stF, setStF] = useState("All");
  const [cityF, setCityF] = useState("All");
  const [chainF, setChainF] = useState("All");

  useEffect(() => {
    (async () => {
      let all = [], from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("account_list").select("*")
          .order("account_weight", { ascending: false })
          .range(from, from + 999);
        if (error) { setErr(error.message); return; }
        all = all.concat(data);
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      setRows(all);
    })();
  }, []);

  const states = useMemo(
    () => rows ? ["All", ...[...new Set(rows.map((r) => r.state).filter(Boolean))].sort()] : ["All"],
    [rows]
  );
  const cities = useMemo(() => {
    if (!rows) return ["All"];
    const pool = stF === "All" ? rows : rows.filter((r) => r.state === stF);
    return ["All", ...[...new Set(pool.map((r) => r.city).filter(Boolean))].sort()];
  }, [rows, stF]);
  const chains = useMemo(
    () => rows ? ["All", "Independents", ...[...new Set(rows.map((r) => r.chain).filter(Boolean))].sort()] : ["All"],
    [rows]
  );

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (type !== "All" && r.headline !== type) return false;
      if (stF !== "All" && r.state !== stF) return false;
      if (cityF !== "All" && r.city !== cityF) return false;
      if (chainF === "Independents" && r.chain) return false;
      if (chainF !== "All" && chainF !== "Independents" && r.chain !== chainF) return false;
      return true;
    });
  }, [rows, type, stF, cityF, chainF]);

  if (err) return <div className="wrap"><p className="state-msg">Couldn’t load accounts. {err}</p></div>;
  if (!rows) return <LoadingScreen />;

  return (
    <div className="wrap">
      <div className="topbar"><h1>Account intel</h1></div>

      <div className="seg">
        <button className={view === "detail" ? "on" : ""} onClick={() => setView("detail")}>Account detail</button>
        <button className={view === "grid" ? "on" : ""} onClick={() => setView("grid")}>Grid</button>
      </div>

      {view === "detail" && (
        <div className="filters">
          {TYPES.map((t) => (
            <button key={t} className={"chip" + (type === t ? " on" : "")} onClick={() => setType(t)}>{t}</button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 7, paddingBottom: 12 }}>
        <select style={selStyle} value={stF} onChange={(e) => { setStF(e.target.value); setCityF("All"); }}>
          {states.map((s) => <option key={s} value={s}>{s === "All" ? "All states" : s}</option>)}
        </select>
        <select style={selStyle} value={cityF} onChange={(e) => setCityF(e.target.value)}>
          {cities.map((c) => <option key={c} value={c}>{c === "All" ? "All cities" : c}</option>)}
        </select>
        <select style={selStyle} value={chainF} onChange={(e) => setChainF(e.target.value)}>
          {chains.map((c) => <option key={c} value={c}>{c === "All" ? "All chains" : c}</option>)}
        </select>
      </div>

      {view === "grid" ? (
        <GridView accounts={filtered} />
      ) : (
        <>
          <div className="count">{filtered.length} accounts · by annualized volume</div>

          {filtered.map((r, i) => {
            const b = BADGE[r.headline] || BADGE["Stable"];
            const isLapsed = r.headline === "Lapsed";
            const isNew = r.headline === "New";
            const showSpark = !isLapsed && !isNew;
            const pct = r.prior90_pct;
            const dl = r.placements_delta;
            return (
              <a key={r.account_id} className="card" href={`/account/${r.account_id}`} style={{ display: "block" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-3)", minWidth: 22, paddingTop: 1 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.2 }}>{r.account_name}</div>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 9px", borderRadius: "var(--r-sm)", whiteSpace: "nowrap", background: b.bg, color: b.fg, border: b.bd || "none" }}>{r.headline}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>
                      {titleCase(r.channel)} · {r.chain || "Independent"} · {r.city}
                    </div>

                    {showSpark && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 }}>
                        <div>
                          <Spark vals={r.spark} color={SPARKC[r.headline] || "var(--text-3)"} />
                          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>rolling 90 · 12 mo</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {pct == null ? null : (
                            <span style={{ fontSize: 13, fontWeight: 500, color: pct > 0 ? "var(--up)" : pct < 0 ? "var(--down)" : "var(--flat)" }}>
                              {pct > 0 ? "▲" : pct < 0 ? "▼" : "▬"} {Math.abs(pct)}%
                            </span>
                          )}
                          {pct != null && <div style={{ fontSize: 10, color: "var(--text-3)" }}>vs prior 90</div>}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 11, paddingTop: 9, borderTop: "0.5px solid var(--border)" }}>
                      <div>
                        <span style={{ fontSize: 17, fontWeight: 500 }}>{r.account_weight}</span>
                        <span style={{ fontSize: 11, color: "var(--text-2)" }}> cs annual</span>
                      </div>
                      <div style={{ textAlign: "right", fontSize: 12 }}>
                        {isLapsed ? (
                          <span style={{ color: "var(--text-3)" }}>
                            {lastSold(r.last_invoice_date) ? `last sold ${lastSold(r.last_invoice_date)}` : "no recent sales"}
                          </span>
                        ) : (
                          <span>
                            <span style={{ fontWeight: 500 }}>{r.live_placements} active</span>
                            {dl !== 0 && (
                              <span style={{ color: dl < 0 ? "var(--down)" : "var(--up)" }}> {dl > 0 ? "+" : ""}{dl} vs prev 90</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </>
      )}
    </div>
  );
}