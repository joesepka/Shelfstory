"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import LoadingScreen from "./LoadingScreen";

let GRID_CACHE = null;

const CELL = {
  growth:  { bg: "var(--growing-bg)", fg: "var(--growing-ink)" },
  decline: { bg: "var(--watch-bg)",   fg: "var(--watch-ink)" },
  stable:  { bg: "transparent",       fg: "var(--text)" },
};

export default function GridView({ accounts }) {
  const router = useRouter();
  const [rows, setRows] = useState(GRID_CACHE);
  const [err, setErr] = useState(null);
  const [cols, setCols] = useState([]); // 3 product_keys

  useEffect(() => {
    if (GRID_CACHE) { setRows(GRID_CACHE); return; }
    (async () => {
      let all = [], from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("item_grid").select("*").range(from, from + 999);
        if (error) { setErr(error.message); return; }
        all = all.concat(data);
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      GRID_CACHE = all;
      setRows(all);
    })();
  }, []);

  const cellMap = useMemo(() => {
    const m = {};
    if (rows) for (const r of rows) (m[r.account_id] ||= {})[r.product_key] = r;
    return m;
  }, [rows]);

  const totalMap = useMemo(() => {
    const m = {};
    if (rows) for (const r of rows) m[r.account_id] = (m[r.account_id] || 0) + (r.l90 || 0);
    return m;
  }, [rows]);

  const items = useMemo(() => {
    const m = new Map();
    if (rows) for (const r of rows) if (!m.has(r.product_key)) m.set(r.product_key, r.item_name);
    return [...m.entries()].map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const sig = useMemo(() => accounts.map(a => a.account_id).join(","), [accounts]);

  const top3 = useMemo(() => {
    if (!rows) return [];
    const tot = {};
    for (const a of accounts) {
      const byItem = cellMap[a.account_id];
      if (!byItem) continue;
      for (const pk in byItem) tot[pk] = (tot[pk] || 0) + (byItem[pk].l90 || 0);
    }
    return Object.keys(tot).sort((x, y) => tot[y] - tot[x]).slice(0, 3);
  }, [rows, cellMap, accounts]);

  useEffect(() => { if (top3.length) setCols(top3); }, [sig, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <p className="state-msg">Couldn’t load grid. {err}</p>;
  if (!rows) return <LoadingScreen />;
  if (!accounts.length) return <p className="state-msg">No accounts match these filters.</p>;

  const showCols = cols.length ? cols : top3;

  const thBase = { position: "sticky", top: 0, zIndex: 3, background: "var(--bg)", padding: "4px 3px" };

  return (
    <>
      <div style={{ maxHeight: "70vh", overflow: "auto", WebkitOverflowScrolling: "touch",
                    border: "0.5px solid var(--border)", borderRadius: "var(--r-md)" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, top: 0, background: "var(--bg)", zIndex: 4, minWidth: 128 }} />
              <th style={{ ...thBase, minWidth: 62 }}>
                <div style={{ fontSize: 9, color: "var(--text-3)", textAlign: "center", marginBottom: 2 }}>&nbsp;</div>
                <div style={{ fontSize: 11, fontWeight: 500, padding: "5px 4px", borderRadius: 8, textAlign: "center",
                              background: "var(--surface-2)", color: "var(--text)", lineHeight: 1.15 }}>Total<br/>90D</div>
              </th>
              {showCols.map((pk, ci) => (
                <th key={ci} style={{ ...thBase, minWidth: 70 }}>
                  <div style={{ fontSize: 9, color: "var(--text-3)", textAlign: "center", marginBottom: 2 }}>select</div>
                  <select
                    value={pk}
                    onChange={(e) => { const next = [...showCols]; next[ci] = e.target.value; setCols(next); }}
                    style={{ width: "100%", fontSize: 11, fontWeight: 500, padding: "4px 6px", borderRadius: 8,
                             border: "0.5px solid var(--border-strong)", background: "var(--surface-2)",
                             color: "var(--text)", fontFamily: "inherit", textAlign: "center",
                             appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                  >
                    {items.map(it => <option key={it.key} value={it.key}>{it.name}</option>)}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((a, ri) => {
              const byItem = cellMap[a.account_id] || {};
              const total = totalMap[a.account_id] || 0;
              return (
                <tr key={a.account_id}>
                  <td
                    onClick={() => router.push(`/account/${a.account_id}`)}
                    style={{ position: "sticky", left: 0, background: "var(--surface)", zIndex: 1,
                             borderBottom: "0.5px solid var(--border)", padding: "7px 8px", cursor: "pointer", minWidth: 128 }}
                  >
                    <div style={{ display: "flex", gap: 7 }}>
                      <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{ri + 1}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.1, whiteSpace: "nowrap" }}>{a.account_name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                          {a.city}{a.state ? `, ${a.state}` : ""}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ textAlign: "center", padding: "7px 3px", borderBottom: "0.5px solid var(--border)",
                               background: "var(--surface-2)", fontWeight: 500 }}>
                    {total > 0 ? total : "·"}
                  </td>

                  {showCols.map((pk, ci) => {
                    const c = byItem[pk];
                    if (!c) return <td key={ci} style={{ textAlign: "center", color: "var(--border-strong)", borderBottom: "0.5px solid var(--border)" }}>·</td>;
                    const lost = c.cell_state === "lost_recent";
                    const st = CELL[c.cell_state] || CELL.stable;
                    return (
                      <td
                        key={ci}
                        onClick={() => router.push(`/account/${a.account_id}/item/${pk}`)}
                        style={{ textAlign: "center", padding: "7px 3px", borderBottom: "0.5px solid var(--border)", cursor: "pointer" }}
                      >
                        {lost ? (
                          <span style={{ display: "inline-block", minWidth: 24, padding: "3px 5px", borderRadius: 6,
                                         background: "var(--atrisk-bg)", color: "var(--atrisk-ink)", fontWeight: 600 }}>X</span>
                        ) : (
                          <span style={{ display: "inline-block", minWidth: 24, padding: "3px 5px", borderRadius: 6,
                                         background: st.bg, color: st.fg, fontWeight: 500 }}>{c.l90}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, fontSize: 11, color: "var(--text-2)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--growing-bg)", border: "0.5px solid var(--growing-ink)" }} /> accelerating</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--watch-bg)", border: "0.5px solid var(--watch-ink)" }} /> decelerating</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ color: "var(--atrisk-ink)", fontWeight: 600 }}>X</span> recently lost</span>
        <span>90-day cases</span>
      </div>
    </>
  );
}