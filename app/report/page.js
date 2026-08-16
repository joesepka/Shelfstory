"use client";
// GENERATE REPORT — the ShelfCast business review, verbatim on mobile: the same prompt
// (key timeframe YTD / L6M / 90D + comparison point), the same deck slides, the same
// PowerPoint / PDF exports. This is the universal report format (Joe, 2026-08-16).
// Scoped to the territory + label the app is currently on (lib/scope).
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { withHealth } from "../../lib/health";
import { parseScope, getLabel } from "../../lib/scope";
import { buildDeck } from "../../lib/deckData";
import DeckPrompt from "../../components/DeckPrompt";
import DeckViewCast from "../../components/DeckViewCast";

const titleCase = s => String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export default function ReportPage() {
  const router = useRouter();
  const label = getLabel();
  const scopeSel = useMemo(() => parseScope(), []);
  const [base, setBase] = useState(null);   // { accts, acctMo, pgrid }
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deck, setDeck] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let rows = [], from = 0;
        while (true) {
          const { data, error } = await supabase.from("account_list")
            .select("account_id,account_name,city,chain,channel_type,income_bucket,sales_rep,cur90,prev90,account_weight,headline,spark,live_placements,live_prev,last_order_w,prior90_pct,state,channel")
            .range(from, from + 4999);
          if (error) throw error;
          rows = rows.concat(data || []);
          if (!data || data.length < 5000) break;
          from += 5000;
        }
        // label-scoped monthly windows — the same healed map the whole app runs on
        const { monthly } = await withHealth(rows, label || null);
        let ig = [], f2 = 0;
        while (true) {
          const { data, error } = await supabase.from("item_grid")
            .select("account_id,product_key,item_name,brand,package,style_parent,parent,l90,l90_prev,l52")
            .range(f2, f2 + 4999);
          if (error) throw error;
          ig = ig.concat(data || []);
          if (!data || data.length < 5000) break;
          f2 += 5000;
        }
        const pgrid = ig.filter(r => !label || r.parent === label)
          .map(r => ({ account_id: r.account_id, pk: r.product_key, item: r.item_name, brand: r.brand, package: r.package, sp: r.style_parent, l90: +r.l90 || 0, prev: +r.l90_prev || 0, l52: +r.l52 || 0 }));
        const accts = rows.map(a => ({ id: a.account_id, name: a.account_name, city: a.city, chain: a.chain, income: a.income_bucket, ctype: a.channel_type, rep: a.sales_rep || "Unassigned" }));
        setBase({ accts, acctMo: monthly, pgrid });
      } catch (e) { setErr(e.message || "load failed"); }
    })();
  }, []);   // eslint-disable-line

  const labelWord = label === "" ? "Blind Corner + Torch" : label === "TORCH" ? "Torch" : "Blind Corner";
  const scopes = useMemo(() => {
    if (!base) return null;
    const allIds = [...new Set(base.accts.map(a => a.id))];
    const uni = { kind: "custom", ids: allIds, name: "All Territories", sub: `every account in the book · ${labelWord}`, n: allIds.length };
    if (scopeSel.kind === "rep") {
      const ids = [...new Set(base.accts.filter(a => a.rep === scopeSel.value).map(a => a.id))];
      return { sel: { kind: "custom", ids, name: titleCase(scopeSel.value), sub: `${titleCase(scopeSel.value)} territory · ${labelWord}`, n: ids.length }, uni };
    }
    return { sel: uni, uni: null };
  }, [base, scopeSel, labelWord]);

  const onBuild = ({ key, cmp, which }) => {
    if (!base || !scopes || busy) return;
    const scope = which === "uni" && scopes.uni ? scopes.uni : scopes.sel;
    setBusy(true);
    (async () => {
      try {
        let itemWin = null;
        if (key !== "90D") {   // item tables need real per-window cases on any non-default timeframe
          const { data: rows } = await supabase.rpc("deck_item_windows", { p_ids: scope.ids, p_parent: label || null });
          if (rows) { itemWin = {}; for (const r of rows) { const a = itemWin[r.pk] || (itemWin[r.pk] = new Array(24).fill(0)); if (r.w >= 0 && r.w <= 23) a[23 - r.w] = Number(r.cases) || 0; } }
        }
        const d = buildDeck({ scope, accts: base.accts, acctMo: base.acctMo, pgrid: base.pgrid, tf: { key, cmp }, itemWin });
        if (d) setDeck(d);
      } catch (e) { setErr(e.message || "build failed"); }
      setBusy(false);
    })();
  };

  if (deck) return <DeckViewCast data={deck} onClose={() => setDeck(null)} />;
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {!base && !err && <div style={{ padding: 30, fontSize: 13, color: "var(--text-3)" }}>Reading your book…</div>}
      {err && <div style={{ padding: 30, fontSize: 13, color: "var(--down)" }}>Couldn’t load. {err}</div>}
      {base && scopes && (
        <DeckPrompt scope={scopes.sel} universe={scopes.uni} busy={busy} onBuild={onBuild} onClose={() => router.back()} />
      )}
    </div>
  );
}
