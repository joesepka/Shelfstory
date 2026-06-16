"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import LoadingScreen from "../../components/LoadingScreen";
import GridView from "../../components/GridView";

// headline -> display label + colors + left-edge
const HEAD = {
  "Accelerating": { label: "Upside",    bg: "var(--growing-bg)", fg: "var(--growing-ink)", edge: "var(--growing-ink)" },
  "Stable":       { label: "Steady",    bg: "var(--stable-bg)",  fg: "var(--stable-ink)",  edge: "var(--border-strong)" },
  "Decelerating": { label: "Softening", bg: "var(--watch-bg)",   fg: "var(--watch-ink)",   edge: "var(--watch-ink)" },
  "At-Risk":      { label: "At risk",   bg: "var(--atrisk-bg)",  fg: "var(--atrisk-ink)",  edge: "var(--atrisk-ink)" },
  "New":          { label: "New",       bg: "var(--new-bg)",     fg: "var(--new-ink)",     edge: "var(--new-ink)" },
  "Lapsed":       { label: "Lapsed",    bg: "transparent",       fg: "var(--lapsed-ink)",  edge: "var(--border-strong)" },
};
const TYPES = ["All", "Upside", "Steady", "Softening", "At risk", "New", "Lapsed"];
const LABEL_TO_HEAD = { "Upside": "Accelerating", "Steady": "Stable", "Softening": "Decelerating", "At risk": "At-Risk", "New": "New", "Lapsed": "Lapsed" };

function titleCase(s) {
  if (!s) return "";
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function lastSold(iso) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleString("en-US", { month: "short" }) + " '" + String(d.getFullYear()).slice(2);
}
function plc(n) {
  const a = Math.abs(n);
  return `${a} placement${a === 1 ? "" : "s"}`;
}

// up to two sharp facts per card
function buildNote(r) {
  const item = (s) => titleCase(s);
  const facts = [];
  const h = r.headline;

  if (h === "At-Risk" || h === "Decelerating") {
    if (r.lost_sku) facts.push(`lost ${item(r.lost_sku)}`);
    if (r.placements_delta < 0) facts.push(`down ${plc(r.placements_delta)}`);
    if (!facts.length) facts.push("running below pace");
  } else if (h === "Accelerating") {
    if (r.growing_count > 0) facts.push(`${r.growing_count} of ${r.active_count} SKUs growing`);
    else facts.push(`accelerating across ${r.active_count} SKUs`);
    if (r.placements_delta > 0) facts.push(`added ${plc(r.placements_delta)}`);
  } else if (h === "Stable") {
    if (r.growing_count > 0) facts.push(`holding · ${r.growing_count} of ${r.active_count} SKUs growing`);
    else facts.push("holding steady");
    if (r.lost_sku) facts.push(`watch ${item(r.lost_sku)}`);
  } else if (h === "New") {
    facts.push("ramping");
    facts.push(`${r.live_placements} placement${r.live_placements === 1 ? "" : "s"}`);
  } else if (h === "Lapsed") {
    const ls = lastSold(r.last_invoice_date);
    facts.push(ls ? `last sold ${ls}` : "no recent sales");
  }
  return facts.slice(0, 2).join(" · ");
}

const selStyle = {
  fontSize: 13, padding: "7px 10px", borderRadius: "var(--r-md)",
  border: "0.5px solid var(--border-strong)", background: "var(--surface)",
  color: "var(--text)", fontFamily: "inherit", flex: 1, minWidth: 0,
};

export default function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlView = searchParams.get("view") === "grid" ? "grid" : "detail";

  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [view, setView] = useState(urlView);
  const [type, setType] = useState("All");
  const [stF, setStF] = useState("All");
  const [cityF, setCityF] = useState("All");
  const [chainF, setChainF] = useState("All");

  useEffect(() => { setView(urlView); }, [urlView]);

  function switchView(v) {
    setView(v);
    router.replace(v === "grid" ? "/accounts?view=grid" : "/accounts");
  }

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
    const headFilter = type === "All" ? null : LABEL_TO_HEAD[type];
    return rows.filter((r) => {
      if (headFilter && r.headline !== headFilter) return false;
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
        <button className={view === "detail" ? "on" : ""} onClick={() => switchView("detail")}>Accounts</button>
        <button className={view === "grid" ? "on" : ""} onClick={() => switchView("grid")}>Grid</button>
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
          <div className="count">{filtered.length} accounts · by annual volume</div>

          {filtered.map((r) => {
            const h = HEAD[r.headline] || HEAD["Stable"];
            const pct = r.prior90_pct;
            const note = buildNote(r);
            const up = pct > 0;
            return (
              <a key={r.account_id} href={`/account/${r.account_id}`}
                 style={{ display: "block", background: "var(--surface)", border: "0.5px solid var(--border)",
                          borderLeft: `3px solid ${h.edge}`, borderRadius: "var(--r-lg)", padding: "9px 12px", marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.1 }}>{r.account_name}</span>
                      <span style={{ fontSize: 9, fontWeight: 500, padding: "1px 7px", borderRadius: 6, whiteSpace: "nowrap", background: h.bg, color: h.fg, border: r.headline === "Lapsed" ? "0.5px solid var(--border-strong)" : "none" }}>{h.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
                      {titleCase(r.channel)} · {r.chain || "Independent"} · {r.city}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div><span style={{ fontSize: 16, fontWeight: 600 }}>{r.account_weight}</span><span style={{ fontSize: 10, color: "var(--text-3)" }}> cs/yr</span></div>
                    <div style={{ fontSize: 11 }}>
                      {pct != null && <span style={{ fontWeight: 600, color: up ? "var(--up)" : pct < 0 ? "var(--down)" : "var(--flat)" }}>{up ? "▲" : pct < 0 ? "▼" : "▬"} {Math.abs(pct)}%</span>}
                      <span style={{ color: "var(--text-3)" }}> · {r.cases_per_month}/mo</span>
                    </div>
                  </div>
                </div>
                {note && <div style={{ fontSize: 11, color: h.fg, marginTop: 6, lineHeight: 1.3 }}>{note}</div>}
              </a>
            );
          })}
        </>
      )}
    </div>
  );
}