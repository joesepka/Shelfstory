"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import LoadingScreen from "../../../../../components/LoadingScreen";

const SNAPSHOT = new Date("2026-06-15T00:00:00"); // window 0 "data thru" date

function monthLabel(i, withYear) {
  const d = new Date(SNAPSHOT);
  d.setDate(d.getDate() - 30 * i);
  return d.toLocaleString("en-US", withYear ? { month: "short", year: "numeric" } : { month: "short" });
}

export default function ItemHistory() {
  const { id, code } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [winRes, prodRes, acctRes] = await Promise.all([
          supabase.from("depletions_window").select("window_index, cases")
            .eq("account_id", id).eq("product_key", code).lte("window_index", 11),
          supabase.from("products").select("product, package").eq("product_key", code).maybeSingle(),
          supabase.from("accounts").select("account_name").eq("account_id", id).maybeSingle(),
        ]);
        if (winRes.error) throw winRes.error;

        const byIdx = {};
        for (const r of winRes.data) byIdx[r.window_index] = Number(r.cases);
        const months = [];
        for (let i = 0; i < 12; i++) months.push({ i, label: monthLabel(i, false), cases: byIdx[i] || 0 });

        const total = months.reduce((s, m) => s + m.cases, 0);
        const peak = Math.max(...months.map((m) => m.cases), 0);
        const avg = total / 12;
        const lastOrderIdx = months.find((m) => m.cases > 0)?.i;
        const lastOrdered = lastOrderIdx == null ? "—" : monthLabel(lastOrderIdx, true);
        const lost = (byIdx[0] || 0) === 0;

        setData({
          item: prodRes.data?.product || "Item",
          package: prodRes.data?.package || "",
          account: acctRes.data?.account_name || "",
          months, total, peak, avg, lastOrdered, lost,
        });
      } catch (e) {
        setErr(e.message || "load failed");
      }
    })();
  }, [id, code]);

  if (err) return <div className="wrap"><p className="state-msg">Couldn’t load history. {err}</p></div>;
  if (!data) return <LoadingScreen />;

  // chart geometry — oldest (left) -> newest (right)
  const series = [...data.months].reverse();
  const W = 620, H = 190, padL = 14, padR = 14, padT = 30, padB = 26;
  const mx = Math.max(...series.map((m) => m.cases), 1);
  const n = series.length;
  const X = (i) => padL + (i / (n - 1)) * (W - padL - padR);
  const Y = (v) => padT + (1 - v / mx) * (H - padT - padB);
  const line = series.map((m, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(m.cases).toFixed(1)).join(" ");

  const lineColor = data.lost ? "var(--atrisk-ink)" : "var(--growing-ink)";

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0 10px" }}>
        <button
          onClick={() => router.back()}
          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 22, color: "var(--text-2)", lineHeight: 1, padding: 0 }}
          aria-label="Back"
        >‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.15 }}>{data.item}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>
            {data.package ? `${data.package} · ` : ""}{data.account}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: "var(--r-sm)",
                       background: data.lost ? "var(--atrisk-bg)" : "var(--growing-bg)",
                       color: data.lost ? "var(--atrisk-ink)" : "var(--growing-ink)" }}>
          {data.lost ? "lost" : "active"}
        </span>
      </div>

      <div style={{ display: "flex", border: "0.5px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", marginBottom: 14 }}>
        {[
          ["last ordered", data.lastOrdered],
          ["12-mo total", `${data.total} cs`],
          ["peak month", `${data.peak} cs`],
          ["avg / mo", `${data.avg.toFixed(1)} cs`],
        ].map(([label, val], i) => (
          <div key={i} style={{ flex: 1, padding: "9px 11px", borderRight: i < 3 ? "0.5px solid var(--border)" : "none" }}>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "var(--text-3)", paddingBottom: 4 }}>cases ordered · each 30-day period</div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly order history">
        <path d={line} fill="none" stroke={lineColor} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {series.map((m, i) => (
          <g key={i}>
            {m.cases > 0 && <circle cx={X(i)} cy={Y(m.cases)} r="3" fill={lineColor} />}
            {m.cases > 0 && (
              <text x={X(i)} y={Y(m.cases) - 9} textAnchor="middle" fontSize="13" fontWeight="500" fill="var(--text)">
                {m.cases}
              </text>
            )}
            <text x={X(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-3)">{m.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}