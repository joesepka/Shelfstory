// The ShelfStory / Blind Corner deck as NATIVE PowerPoint — a faithful replica of the
// print deck in components/deckSlides.js (same palette, type scale, geometry and copy),
// with every element left editable: real text boxes, shapes, tables and charts.
//
// Coordinates: the print slide is a 940x726px canvas on an 11x8.5in page. px() maps
// design pixels to inches so the PPTX lines up with the PDF almost exactly.

const INK = "0A0A0A", PINK = "EDB3B0", PINK2 = "D98F8A", PINKPALE = "FCF1F0";
const GREY = "6E6E6E", GREY2 = "9A9A9A", RULE = "E3E3E3", RULELT = "EFEFEF";
const UP = "2E7D52", UPL = "C7E0D2", DN = "C0564E", DNL = "EBCCC7", GREEN = "52A97B";
const LITE = "BFD9C9", PRIOR = "BDBDBD", NEWC = "4F8F52", TEAL = "2F7D8C", TEALLT = "A9CFD7";
const FCBLUE = "5B6BD0", WARM = "B5817A", WARMD = "8B3A2B", GOLD = "8A6A12", GOLDBG = "F4EAD6";
const DISP = "Arial Black", BODY = "Arial";
const MIXC = { "Hazy Ipa": "E5A29D", "Ipa": "52A97B", "Lager / Ale": "C9A227", "Seltzer": "6D93D4", "Limited": "E5A29D", "Core": "52A97B", "Thc": "7D6BC0", "Seasonal": "C9A227", "Collab": "6D93D4", "House": "8FC0A5" };
const HC = { surging: ["2E7D52", "E4F1E9"], stable: ["5C7A68", "EFF2F0"], new: ["4F8F52", "E6F2E1"], "at risk": ["9C7420", "F5EBD5"], softening: ["9C7420", "F5EBD5"], lapsed: ["8B3A2B", "F1DDD8"] };

const fmt = n => Math.round(n || 0).toLocaleString("en-US");
const kf = v => v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(Math.round(v));
const arrow = p => p == null ? "" : p > 0 ? "▲" : p < 0 ? "▼" : "";
const dltC = p => p == null ? GREY2 : p > 0 ? UP : p < 0 ? DN : GREY2;
const mixHex = (a, b, t) => { const P = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; const A = P(a), B = P(b); return A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };

// px -> inches (940px canvas across 10.64in of an 11in page, .18in print margin)
const S = 10.64 / 940, X0 = 0.18, Y0 = 0.18;
const px = v => v * S;
const P = (x, y, w, h) => ({ x: X0 + px(x), y: Y0 + px(y), w: px(w), h: px(h) });
const pt = cssPx => Math.round(cssPx * 0.815 * 10) / 10;

export async function deckToPptx(pptxgen, D, meta = {}) {
  const pres = new pptxgen();
  pres.defineLayout({ name: "LETTER_LS", width: 11, height: 8.5 });
  pres.layout = "LETTER_LS";
  const M = D.tfMeta || { dflt: true, stat: "90-day cases", col: "90D", winShort: "90 days", winNoun: "last 90 days", period: D.dataThru, cmpShort: "prior 90", cmpLong: "the prior 90 days", cmpNoun: "prior 90 days", rank: "ranked on the quarter", grew: "grew this quarter", over: "over the quarter", newPhrase: "new this quarter", zeroCmp: "no prior-quarter volume at all", hadNone: "had no volume at all a quarter ago" };
  const PERIOD = D.dataThru || M.period || "";
  const LOGO = meta.logoData || null;   // base64 data-uri of the Blind Corner logo
  const rosBase = r => (r.l90 != null ? r.l90 : r.cur);
  // timeframe-aware, wording shared verbatim with components/deckSlides.js so the two renderers match
  const SRC = "Source: distributor depletion reporting through the snapshot date. " + (M.dflt ? "Cases are 90-day rolling totals against the immediately preceding 90 days unless stated as 52-week." : "Volume figures are " + M.winShort + " totals against " + M.cmpLong + "; distribution counts (placements, accounts carrying) and rate of sale always read the latest 90 days. Figures stated as 52-week are unchanged.") + " Health is read from each account's own monthly order line: new on its first order in 52 weeks, lapsed after 90 days without one, surging or softening only when confirmed across consecutive months against its own baseline.";

  const WANT = meta.only || null; const want = n => !WANT || WANT.includes(n);
  // ---------- shared chrome ----------
  const T = (s, txt, xpx, ypx, wpx, hpx, o = {}) => s.addText(txt, { ...P(xpx, ypx, wpx, hpx), fontFace: BODY, color: INK, margin: 0, valign: "top", ...o });
  // every page carries a tiny ShelfStory stamp in the bottom-right corner
  const mkSlide = () => { const s = pres.addSlide(); T(s, "SHELFSTORY", 806, 707, 118, 10, { align: "right", fontSize: 4.8, bold: true, charSpacing: 1.8, color: "CFCFCF" }); return s; };
  const lbl = (s, txt, xpx, ypx, wpx, o = {}) => T(s, String(txt).toUpperCase(), xpx, ypx, wpx, 14, { fontSize: 7, bold: true, charSpacing: 1.6, color: GREY2, ...o });
  const rect = (s, xpx, ypx, wpx, hpx, color, o = {}) => s.addShape("rect", { ...P(xpx, ypx, wpx, hpx), fill: { color }, line: { type: "none" }, ...o });
  const head = (s, title, sub) => {
    T(s, title, 44, 26, 700, 44, { fontFace: DISP, fontSize: pt(31), bold: true });
    lbl(s, sub, 44, 70, 700, { charSpacing: 2 });
    if (LOGO) s.addImage({ data: LOGO, ...P(830, 24, 66, 52), sizing: { type: "contain", ...P(0, 0, 66, 52) } });
  };
  const foot = (s, t) => {
    rect(s, 44, 688, 852, 1, RULELT);
    T(s, t || SRC, 44, 694, 852, 26, { fontSize: 6, color: GREY2, lineSpacingMultiple: 1.25 });
  };
  const dlt = (s, p, xpx, ypx, o = {}) => { if (p == null) return; T(s, `${arrow(p)} ${Math.abs(p)}%`, xpx, ypx, o.wpx || 60, 14, { fontSize: pt(10.5), bold: true, color: dltC(p), ...o }); };

  // ---------- 1 · cover ----------
  if (want(1)) {
    const s = mkSlide();
    rect(s, 0, 0, 940, 726, "FFFFFF");
    rect(s, 16, 14, 908, 132, PINK);          // salmon band
    T(s, "BUSINESS REVIEW", 60, 66, 300, 20, { fontSize: 8, bold: true, charSpacing: 2.4, color: "6E6E6E" });
    if (LOGO) s.addImage({ data: LOGO, ...P(770, 40, 110, 84), sizing: { type: "contain", ...P(0, 0, 110, 84) } });
    T(s, String(D.scope.name).toUpperCase(), 60, 300, 820, 96, { fontFace: DISP, fontSize: pt(84), bold: true });
    T(s, `${D.scope.sub || ""}   ·   ${PERIOD}`, 62, 400, 700, 24, { fontSize: pt(14), color: GREY });
    rect(s, 62, 442, 130, 3, INK);
    const stats = [[String(M.stat).toUpperCase(), fmt(D.cur90), D.casesPct], ["ACTIVE ACCOUNTS", fmt(D.accts), D.acctsPct], ["52-WEEK CASES", fmt(D.l52), D.l52Pct], ["CASES / ACCT / MO", String(D.ros), null]];
    stats.forEach(([k, v, p], i) => {
      const x = 62 + i * 200;
      lbl(s, k, x, 468, 180);
      s.addText([{ text: v, options: { fontFace: DISP, fontSize: pt(30), bold: true, color: INK } }].concat(p != null ? [{ text: `  ${arrow(p)} ${Math.abs(p)}%`, options: { fontSize: pt(9.5), bold: true, color: dltC(p) } }] : []),
        { ...P(x, 486, 190, 44), margin: 0, valign: "top" });
    });
    T(s, `Prepared from distributor depletion reporting through the snapshot date   ·   Blind Corner Brewery`, 62, 660, 700, 18, { fontSize: pt(9), color: GREY2 });
  }

  // ---------- 2 · overview ----------
  if (want(2)) {
    const s = mkSlide();
    head(s, `${String(D.scope.name).toUpperCase()} OVERVIEW`, `${PERIOD} · ${D.scope.sub || ""}`);
    // four stat columns
    const S4 = [[M.stat, fmt(D.cur90), D.casesPct, `vs ${fmt(D.prev90)} ${M.cmpShort}`], ["Active accounts", fmt(D.accts), D.acctsPct, `of ${D.withHist} with history`], ["Placements", fmt(D.plN), D.plcPct, "account × SKU pairs"], ["Cases / acct / mo", String(D.ros), null, `vs ${D.rosPrev} prior 90`]];
    S4.forEach(([k, v, p, sub], i) => {
      const x = 44 + i * 213;
      if (i) rect(s, x - 10, 104, 1, 62, RULELT);
      lbl(s, k, x, 104, 200, { align: "center" });
      s.addText([{ text: v, options: { fontFace: DISP, fontSize: pt(26), bold: true, color: INK } }].concat(p != null ? [{ text: `  ${arrow(p)} ${Math.abs(p)}%`, options: { fontSize: pt(9.5), bold: true, color: dltC(p) } }] : []),
        { ...P(x, 120, 200, 34), align: "center", margin: 0, valign: "top" });
      T(s, sub, x, 154, 200, 14, { align: "center", fontSize: 6.8, color: GREY2 });
    });
    rect(s, 44, 176, 852, 1, RULE);
    // left: what's going on
    lbl(s, "What's going on", 44, 196, 240);
    const bullets = [
      [`Volume is ${D.casesPct >= 0 ? "up" : "down"} ${Math.abs(D.casesPct)}% ${M.over}. `, `${D.scope.name} shipped ${fmt(D.cur90)} cases in the ${PERIOD}, against ${fmt(D.prev90)} in the ${M.cmpShort}.`],
      [`${D.accts} accounts ordered in the window `, `(${D.acctsPct >= 0 ? "up" : "down"} ${Math.abs(D.acctsPct || 0)}%), carrying ${fmt(D.plN)} placements — the count of account-and-SKU pairs that moved — ${D.plcPct >= 0 ? "up" : "down"} ${Math.abs(D.plcPct)}%.`],
      [`Rate of sale ${D.ros >= D.rosPrev ? "held at" : "eased to"} ${D.ros} cases per account per month `, `against ${D.rosPrev} in the prior quarter.`],
      [`The trailing 52 weeks total ${fmt(D.l52)} cases `, `versus ${fmt(D.p52)} the year before${D.lapN ? `; ${D.lapN} account${D.lapN === 1 ? " has" : "s have"} gone quiet and ${D.lapN === 1 ? "is" : "are"} counted lapsed.` : "."}`],
    ];
    bullets.forEach(([b, r], i) => {
      T(s, String(i + 1), 44, 222 + i * 88, 16, 18, { fontFace: DISP, fontSize: pt(13), bold: true, color: PINK2 });
      s.addText([{ text: b, options: { bold: true } }, { text: r }], { ...P(66, 220 + i * 88, 218, 84), fontFace: BODY, fontSize: pt(11), color: "2B2B2B", margin: 0, valign: "top", lineSpacingMultiple: 1.18 });
    });
    rect(s, 300, 196, 1, 420, RULELT);
    // right: two native charts
    lbl(s, "Cases sold per month", 322, 192, 200);
    T(s, "· 12 months", 528, 193, 100, 12, { fontSize: 6.8, color: "C4C4C4" });
    const vals = (D.hist || []).slice(-12).map(v => Math.round(v));
    s.addChart("bar", [{ name: "Cases", labels: D.months || [], values: vals }], {
      ...P(316, 206, 580, 170), barDir: "col", barGapWidthPct: 42,
      chartColors: vals.map((_, i) => mixHex("E3F1E4", "52A97B", Math.pow(i / 11, 1.2))),
      showLegend: false, showTitle: false, showValue: true, dataLabelPosition: "outEnd", dataLabelColor: "3F8A63", dataLabelFontSize: 7, dataLabelFontFace: BODY, dataLabelFormatCode: "#,##0",
      catAxisLabelColor: GREY2, catAxisLabelFontSize: 7.5, catAxisLabelFontFace: BODY, catAxisLineColor: "E8E8E8", catGridLine: { style: "none" },
      valAxisHidden: true, valGridLine: { style: "none" }, valAxisLineShow: false, valAxisMaxVal: Math.max(...vals) * 1.25,
    });
    lbl(s, "Active accounts", 322, 384, 160);
    T(s, "· rolling 90 days", 478, 385, 110, 12, { fontSize: 6.8, color: "C4C4C4" });
    rect(s, 806, 388, 14, 2.5, UP); T(s, "cases / acct / mo", 824, 383, 80, 12, { fontSize: 6.5, bold: true, color: UP });
    const accV = D.accSeries || [], rosV = D.rosSeries || [];
    const accMax = Math.max(...accV, 1) * 1.25;
    s.addChart("bar", [{ name: "Active accounts", labels: D.months || [], values: accV }], {
      ...P(316, 398, 580, 170), barDir: "col", barGapWidthPct: 42,
      chartColors: accV.map((_, i) => mixHex("FCF1F0", "E5A29D", Math.pow(i / 11, 1.2))),
      showLegend: false, showTitle: false, showValue: true, dataLabelPosition: "outEnd", dataLabelColor: "C0817C", dataLabelFontSize: 7, dataLabelFontFace: BODY,
      catAxisLabelColor: GREY2, catAxisLabelFontSize: 7.5, catAxisLineColor: "E8E8E8", catGridLine: { style: "none" },
      valAxisHidden: true, valGridLine: { style: "none" }, valAxisLineShow: false, valAxisMaxVal: accMax,
    });
    // the cases/acct/mo line rides on top as editable shapes, exactly like the print deck's polyline
    if (rosV.length === 12) {
      const plotL = 316 + 8, plotW = 580 - 16 - 30, plotT = 398 + 8, plotH = 170 - 8 - 30;
      const lmx = Math.max(...rosV) * 1.12, lmn = Math.min(...rosV) * 0.72, rg = (lmx - lmn) || 1;
      const cx = i => plotL + (i + 0.5) * (plotW / 12);
      const cy = v => plotT + plotH - ((v - lmn) / rg) * plotH;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < 11; i++) {
          const x1 = cx(i), y1 = cy(rosV[i]), x2 = cx(i + 1), y2 = cy(rosV[i + 1]);
          s.addShape("line", { x: X0 + px(Math.min(x1, x2)), y: Y0 + px(Math.min(y1, y2)), w: px(Math.abs(x2 - x1)), h: px(Math.abs(y2 - y1)), flipV: (y2 < y1), line: { color: pass === 0 ? "FFFFFF" : UP, width: pass === 0 ? 3.2 : 1.8 } });
        }
      }
      s.addShape("ellipse", { ...P(cx(11) - 4, cy(rosV[11]) - 4, 8, 8), fill: { color: UP }, line: { color: "FFFFFF", width: 1.2 } });
      [lmx, (lmx + lmn) / 2, lmn].forEach(t2 => T(s, t2.toFixed(1), 316 + 580 - 28, cy(t2) - 4, 28, 10, { fontSize: 6, color: UP, align: "right" }));
      T(s, "cs/ac", 316 + 580 - 28, 398 + 170 - 26, 28, 10, { fontSize: 5.8, color: UP, align: "right" });
    }
    // bottom pair
    rect(s, 316, 580, 580, 1, RULE);
    lbl(s, "52-week cases · actual", 340, 592, 240, { align: "center" });
    T(s, fmt(D.l52), 340, 606, 240, 30, { align: "center", fontFace: DISP, fontSize: pt(25), bold: true });
    T(s, `${arrow(D.l52Pct)} ${Math.abs(D.l52Pct)}%`, 340, 636, 240, 14, { align: "center", fontSize: pt(10.5), bold: true, color: dltC(D.l52Pct) });
    T(s, `vs ${fmt(D.p52)} prior year`, 340, 650, 240, 12, { align: "center", fontSize: 6.5, color: GREY2 });
    rect(s, 606, 592, 1, 66, RULELT);
    lbl(s, "52-week cases · forecast", 632, 592, 240, { align: "center", color: FCBLUE });
    T(s, fmt(D.fc52), 632, 606, 240, 30, { align: "center", fontFace: DISP, fontSize: pt(25), bold: true, color: FCBLUE });
    T(s, `${arrow(D.fcPct)} ${Math.abs(D.fcPct)}%`, 632, 636, 240, 14, { align: "center", fontSize: pt(10.5), bold: true, color: FCBLUE });
    T(s, "next 12 months vs trailing 52", 632, 650, 240, 12, { align: "center", fontSize: 6.5, color: "8990BE" });
    foot(s);
  }

  // ---------- 3/4 · items (draft first when it earns a page, then package) ----------
  const itemsSlide = (seg, label) => {
    const sd = D[seg]; if (!sd || !sd.rows.length) return;
    const s = mkSlide();
    head(s, `${label.toUpperCase()} OVERVIEW`, `${D.scope.name} · ${PERIOD} · ${sd.all} ${label.toLowerCase()} brands with volume`);
    rect(s, 44, 96, 852, 2, INK);
    lbl(s, `Total ${label.toLowerCase()} cases · ${M.winShort}`, 44, 108, 215);
    T(s, fmt(sd.tot), 252, 100, 90, 30, { fontFace: DISP, fontSize: pt(23), bold: true });
    dlt(s, sd.pct, 348, 108);
    T(s, `vs ${fmt(sd.totP)} ${M.cmpShort}`, 412, 110, 160, 12, { fontSize: 6.8, color: GREY2 });
    rect(s, 44, 134, 852, 1, RULE);
    // left: brand table
    lbl(s, `Top ${sd.rows.length} brands by ${M.stat}`, 44, 150, 300);
    const headRow = ["BRAND", M.col, "PRIOR", "CHG", "ACCTS", "CS/AC"].map((t, i) => ({ text: t, options: { bold: true, color: GREY2, fontFace: BODY, fontSize: 6.5, charSpacing: 1, align: i ? "right" : "left", valign: "middle" } }));
    const body = sd.rows.map((r, i) => {
      const cp = r.prev > 0 ? Math.round(((r.cur - r.prev) / r.prev) * 100) : null;
      const ros = r.acc ? (rosBase(r) / r.acc / 3) : 0;
      const fill = i < 3 ? { color: "FAFCFA" } : undefined;
      return [
        { text: r.n, options: { fontSize: pt(10.3), bold: i < 3, color: INK, fill } },
        { text: fmt(r.cur), options: { fontSize: pt(11), fontFace: DISP, align: "right", color: INK, fill } },
        { text: fmt(r.prev), options: { fontSize: pt(9.5), align: "right", color: GREY2, fill } },
        { text: cp == null ? "new" : `${arrow(cp)}${Math.abs(cp)}%`, options: { fontSize: pt(9.5), bold: true, align: "right", color: cp == null ? NEWC : dltC(cp), fill } },
        { text: [{ text: String(r.acc), options: { bold: true, color: INK } }, ...(r.accP != null && r.acc - r.accP !== 0 ? [{ text: ` ${r.acc - r.accP > 0 ? "▲" : "▼"}${Math.abs(r.acc - r.accP)}`, options: { fontSize: pt(7.5), bold: true, color: dltC(r.acc - r.accP) } }] : [])], options: { fontSize: pt(10), align: "right", fill } },
        { text: ros.toFixed(1), options: { fontSize: pt(10), align: "right", color: GREY, fill } },
      ];
    });
    s.addTable([headRow, ...body], { ...P(44, 166, 420, 10), colW: [px(184), px(52), px(48), px(48), px(48), px(40)], rowH: px(21.5), border: { type: "solid", color: RULELT, pt: 0.5 }, valign: "middle", margin: 0.02 });
    // left: what's going on
    const newN = sd.rows.filter(r => r.prev === 0).length, newC = sd.rows.filter(r => r.prev === 0).reduce((a, r) => a + r.cur, 0);
    const bl = [
      [`${sd.rows[0].n} leads the ${label.toLowerCase()} book. `, `${fmt(sd.rows[0].cur)} cases — ${Math.round(sd.rows[0].cur / sd.tot * 100)}% of ${label.toLowerCase()} volume — across ${sd.rows[0].acc} accounts at ${(rosBase(sd.rows[0]) / (sd.rows[0].acc || 1) / 3).toFixed(1)} cases per account per month.`],
      newN ? [`${newN} of the top ten ${newN === 1 ? "is" : "are"} ${M.newPhrase}`, `, adding ${fmt(newC)} cases with ${M.zeroCmp}.`] : [`The top ten are all established brands`, ` — no new arrivals reached the leaderboard this quarter.`],
      [`${label} totals ${fmt(sd.tot)} cases`, `, ${sd.pct >= 0 ? "up" : "down"} ${Math.abs(sd.pct)}% against ${fmt(sd.totP)} in ${M.cmpLong}, across ${sd.all} brands with volume.`],
    ];
    const tblBottom = 166 + (sd.rows.length + 1) * 21.5;
    lbl(s, "What's going on", 44, tblBottom + 16, 240);
    bl.forEach(([b, r], i) => {
      T(s, String(i + 1), 44, tblBottom + 34 + i * 46, 14, 14, { fontFace: DISP, fontSize: pt(11), bold: true, color: PINK2 });
      s.addText([{ text: b, options: { bold: true } }, { text: r }], { ...P(62, tblBottom + 33 + i * 46, 402, 44), fontFace: BODY, fontSize: pt(10), color: "2B2B2B", margin: 0, valign: "top", lineSpacingMultiple: 1.15 });
    });
    rect(s, 486, 150, 1, 520, RULELT);
    // right: ROS top-6 native bar + dashed benchmark line series
    const top6 = sd.rows.slice(0, 6).map(r => ({ n: r.n, acc: r.acc, ros: r.acc ? +(rosBase(r) / r.acc / 3).toFixed(1) : 0 }));
    const bm = top6[0].ros;
    lbl(s, `Rate of sale · top ${top6.length}`, 508, 150, 250);
    T(s, `dotted line = ${top6[0].n}`, 750, 151, 146, 12, { align: "right", fontSize: 6.5, color: GREY2 });
    const rosMax = Math.ceil(Math.max(...top6.map(d => d.ros)) * 1.3 * 10) / 10;
    s.addChart("bar", [{ name: "Cases/acct/mo", labels: top6.map(d => d.n), values: top6.map(d => d.ros) }], {
      ...P(500, 166, 396, 230), barDir: "col",
      chartColors: top6.map((_, i) => i === 0 ? GREEN : LITE), barGapWidthPct: 38,
      valAxisLabelColor: GREY2, valAxisLabelFontSize: 6.5, valGridLine: { color: "F0F0F0", size: 0.5 }, valAxisMaxVal: rosMax, valAxisMinVal: 0,
      catAxisLabelColor: "2B2B2B", catAxisLabelFontSize: 6.8, catGridLine: { style: "none" },
      showLegend: false, showTitle: false, showValue: true, dataLabelPosition: "outEnd", dataLabelColor: "2E7D52", dataLabelFontSize: 7.5, dataLabelFontFace: BODY, dataLabelFormatCode: "0.0",
      showValAxisTitle: true, valAxisTitle: "CASES / ACCOUNT / MO", valAxisTitleFontSize: 6, valAxisTitleColor: "7A7A7A",
    });
    // dashed benchmark, an editable line shape laid over the plot area
    {
      const plotL = 500 + 44, plotR = 500 + 396 - 10, plotT = 166 + 10, plotB = 166 + 230 - 42;
      const yb = plotT + (plotB - plotT) * (1 - bm / rosMax);
      s.addShape("line", { ...P(plotL, yb, plotR - plotL, 0), line: { color: INK, width: 1, dashType: "dash" } });
      T(s, `${top6[0].n} ${bm.toFixed(1)}`, plotR - 120, yb - 13, 120, 11, { align: "right", fontSize: 6.5, bold: true, color: INK });
    }
    // red account counts under the chart categories
    top6.forEach((d, i) => {
      const w = 396 / 6;
      T(s, `${d.acc} accounts`, 500 + 30 + i * (366 / 6), 398, 366 / 6, 12, { align: "center", fontSize: 6.3, color: "A9615B" });
    });
    // style mix stacked bar (shapes)
    rect(s, 500, 430, 396, 1, RULE);
    lbl(s, `Share of ${label.toLowerCase()} cases by style`, 508, 444, 260);
    T(s, M.winShort, 800, 445, 96, 12, { align: "right", fontSize: 6.5, color: GREY2 });
    let mx = 508;
    (sd.mix || []).forEach(([k, v]) => {
      const w = 380 * (v / 100);
      rect(s, mx, 462, w, 34, MIXC[k] || "CFCFCF");
      if (v >= 7) T(s, `${v.toFixed(1)}%`, mx, 471, w, 16, { align: "center", fontFace: DISP, fontSize: pt(11), bold: true, color: "FFFFFF" });
      mx += w;
    });
    (sd.mix || []).forEach(([k, v], mi) => {
      const lx2 = 508 + (mi % 4) * 98, ly2 = 508 + Math.floor(mi / 4) * 18;
      rect(s, lx2, ly2, 8, 8, MIXC[k] || "CFCFCF");
      T(s, `${k} ${v.toFixed(1)}%`, lx2 + 12, ly2 - 3, 88, 14, { fontSize: 7.5, color: GREY });
    });
    foot(s, SRC + ` Brands aggregate every ${label.toLowerCase()} format they sell in. Accounts = accounts that ordered the brand in the window.`);
  };
  if (want(3) && D.draft && D.pkg && D.draft.tot >= D.pkg.tot * 0.05 && D.draft.rows.length) itemsSlide("draft", "Draft");
  if (want(3) && D.draft && D.pkg && D.pkg.tot >= D.draft.tot * 0.05 && D.pkg.rows.length) itemsSlide("pkg", "Package");

  // ---------- 5 · account universe ----------
  if (want(4)) {
    const s = mkSlide();
    head(s, "ACCOUNT UNIVERSE", `${D.scope.name} · ${PERIOD} · ${D.withHist} accounts with history`);
    rect(s, 44, 96, 852, 2, INK);
    lbl(s, "Active accounts · 90 days", 44, 108, 170);
    T(s, String(D.accts), 210, 100, 60, 30, { fontFace: DISP, fontSize: pt(23), bold: true });
    dlt(s, D.acctsPct, 268, 108);
    T(s, `of ${D.withHist} with history · ${fmt(D.totL52)} cases over 52 weeks · ${D.ros} cases per account per month`, 330, 110, 480, 12, { fontSize: 6.8, color: GREY2 });
    rect(s, 44, 134, 852, 1, RULE);
    // left: buckets
    lbl(s, "Where the accounts sit", 44, 150, 240);
    T(s, "bar = share of 52-week volume", 260, 151, 160, 12, { align: "right", fontSize: 6.3, color: GREY2 });
    const mxW = Math.max(...D.buckets.map(b => b.wt), 1);
    D.buckets.forEach((b, i) => {
      const y = 176 + i * 86;
      const c = (b.c || "#888").replace("#", "");
      rect(s, 44, y + 3, 9, 9, c);
      T(s, b.k, 60, y - 2, 150, 18, { fontSize: pt(11.5), bold: true });
      T(s, String(b.n), 330, y - 8, 60, 26, { align: "right", fontFace: DISP, fontSize: pt(17), bold: true });
      T(s, "accounts", 394, y + 2, 44, 12, { fontSize: 6.5, color: GREY2 });
      rect(s, 44, y + 20, 380, 13, "F2F2F2");
      rect(s, 44, y + 20, Math.max(2, 380 * (b.wt / mxW)), 13, c);
      s.addText([
        { text: `${fmt(b.l52)} cases`, options: { bold: true, color: "2B2B2B" } },
        { text: ` over 52 weeks · ${(b.l52 / D.totL52 * 100).toFixed(1)}% of volume${b.ros ? ` · ${b.ros} cs/acct/mo` : " · no orders in 90 days"}${b.lift ? "  (bar shown at 3× — one quarter of history)" : ""}`, options: {} },
      ], { ...P(44, y + 38, 400, 14), fontFace: BODY, fontSize: 7, color: GREY, margin: 0 });
    });
    rect(s, 466, 150, 1, 520, RULELT);
    // right: bullets + income chart
    const surg = D.buckets.find(b => b.k === "Surging"), lap = D.buckets.find(b => b.k === "Lapsed");
    const bl = [
      [`${D.accts} of ${D.withHist} accounts ordered in the last 90 days`, D.acctsPct != null ? `, ${D.acctsPct >= 0 ? "up" : "down"} ${Math.abs(D.acctsPct)}% on the prior quarter.` : "."],
      surg ? [`${surg.n} surging accounts hold ${Math.round(surg.l52 / D.totL52 * 100)}% of the annual volume`, ` at ${surg.ros} cases per account per month.`] : null,
      lap ? [`${lap.n} account${lap.n === 1 ? " has" : "s have"} gone quiet`, `, together worth ${Math.round(lap.l52 / D.totL52 * 100)}% of the year.`] : null,
    ].filter(Boolean);
    bl.forEach(([b, r], i) => {
      T(s, String(i + 1), 486, 152 + i * 34, 14, 14, { fontFace: DISP, fontSize: pt(11), bold: true, color: PINK2 });
      s.addText([{ text: b, options: { bold: true } }, { text: r }], { ...P(504, 151 + i * 34, 392, 32), fontFace: BODY, fontSize: pt(10), color: "2B2B2B", margin: 0, valign: "top", lineSpacingMultiple: 1.12 });
    });
    rect(s, 486, 262, 410, 1, RULE);
    const dim = (D.scope.kind === "chain" ? D.income : D.types).filter(d => d.act > 0);
    lbl(s, `Rate of sale by ${D.scope.kind === "chain" ? "income band" : "channel"}`, 486, 276, 280);
    T(s, "ordered by volume", 790, 277, 106, 12, { align: "right", fontSize: 6.5, color: GREY2 });
    if (dim.length) {
      const bm2 = dim[0].ros;
      const rosMax2 = Math.ceil(Math.max(...dim.map(d => d.ros)) * 1.28 * 10) / 10;
      s.addChart("bar", [{ name: "Cases/acct/mo", labels: dim.map(d => d.k), values: dim.map(d => +d.ros.toFixed(1)) }], {
        ...P(486, 292, 410, 250), barDir: "col",
        chartColors: dim.map((_, i) => i === 0 ? TEAL : TEALLT), barGapWidthPct: 52,
        valAxisLabelColor: GREY2, valAxisLabelFontSize: 6.5, valGridLine: { color: "F1F1F1", size: 0.5 }, valAxisMaxVal: rosMax2, valAxisMinVal: 0,
        catAxisLabelColor: "2B2B2B", catAxisLabelFontSize: 7, catGridLine: { style: "none" },
        showLegend: false, showTitle: false, showValue: true, dataLabelPosition: "outEnd", dataLabelColor: "2F7D8C", dataLabelFontSize: 7.5,
      });
      {
        // measured against a real PowerPoint render: the plot area leaves ~24px under the
        // baseline for category labels (not 40) — get this wrong and the dashed line rides
        // high enough to strike through the first bar's value label
        const plotL = 486 + 40, plotR = 486 + 410 - 10, plotT = 292 + 10, plotB = 292 + 250 - 24;
        const yb2 = plotT + (plotB - plotT) * (1 - bm2 / rosMax2);
        s.addShape("line", { ...P(plotL, yb2, plotR - plotL, 0), line: { color: INK, width: 0.9, dashType: "dash" } });
        T(s, `${dim[0].k} ${bm2.toFixed(1)}`, plotR - 140, yb2 + 4, 130, 11, { align: "right", fontSize: 6.5, bold: true, color: INK });
      }
      // pink active-account bubbles + cases captions
      T(s, "● = ACTIVE ACCOUNTS IN BAND", 500, 300, 180, 12, { fontSize: 6, bold: true, color: PINK2 });
      dim.forEach((d, i) => {
        const w = 380 / dim.length, cx = 500 + i * w + w / 2;
        s.addShape("ellipse", { ...P(cx - 12, 380, 24, 24), fill: { color: PINK2 }, line: { color: "FFFFFF", width: 1.25 } });
        T(s, String(d.act), cx - 12, 385, 24, 14, { align: "center", fontSize: pt(9.5), bold: true, color: "FFFFFF" });
        T(s, `${fmt(d.cases)} cases`, cx - 40, 548, 80, 12, { align: "center", fontSize: 6.3, color: GREY2 });
      });
    }
    // bottom: by account type shares
    rect(s, 44, 588, 852, 2, INK);
    lbl(s, "By account type · share of accounts against share of volume", 44, 598, 500);
    const typeTot = { n: D.types.reduce((t, x) => t + x.n, 0) || 1, v: D.types.reduce((t, x) => t + x.l52, 0) || 1 };
    lbl(s, "Accounts", 44, 618, 100); lbl(s, "52-wk volume", 152, 618, 110);
    let ay = 0;
    D.types.slice(0, 3).forEach((t2, i) => {
      const aw = t2.n / typeTot.n, vw = t2.l52 / typeTot.v;
      const col = i === 0 ? UP : i === 1 ? TEAL : WARM;
      rect(s, 44, 634 + ay, 92 * Math.max(aw, 0.02) / 1, 40, col);
      if (aw >= 0.2) T(s, `${Math.round(aw * 100)}%`, 44, 646 + ay, 92 * aw, 16, { align: "center", fontSize: pt(9.5), bold: true, color: "FFFFFF" });
      rect(s, 152, 634 + ay, 92 * Math.max(vw, 0.02), 40, col);
      if (vw >= 0.2) T(s, `${Math.round(vw * 100)}%`, 152, 646 + ay, 92 * vw, 16, { align: "center", fontSize: pt(9.5), bold: true, color: "FFFFFF" });
      rect(s, 262, 646 + ay, 9, 9, col);
      T(s, t2.k, 278, 642 + ay, 160, 16, { fontSize: pt(9.5), bold: true });
      ay += 0;
    });
    T(s, `${D.withHist}`, 796, 630, 50, 18, { align: "right", fontSize: pt(10), bold: true });
    T(s, "accts", 850, 634, 40, 12, { fontSize: 6.3, color: GREY2 });
    T(s, `${fmt(D.totL52)}`, 776, 648, 70, 18, { align: "right", fontSize: pt(10), bold: true });
    T(s, "52-wk cs", 850, 652, 44, 12, { fontSize: 6.3, color: GREY2 });
    T(s, `${D.ros}`, 796, 666, 50, 18, { align: "right", fontSize: pt(10), bold: true, color: "A9615B" });
    T(s, "cs/ac/mo", 850, 670, 44, 12, { fontSize: 6.3, color: GREY2 });
    foot(s);
  }

  // ---------- 6 · movement ----------
  if (want(5) && ((D.upList && D.upList.length) || (D.dnList && D.dnList.length))) {
    const s = mkSlide();
    head(s, "ACCOUNT MOVEMENT", `${D.scope.name} · ${PERIOD} · ${M.cmpNoun} ○ against ${M.winNoun} ●`);
    rect(s, 44, 96, 852, 2, INK);
    const band = [["Accounts that grew", `+${fmt(D.growC)}`, `cases across ${D.growN} accounts`, UP], ["Accounts that declined", fmt(D.declC), `cases across ${D.declN} accounts`, DN], ["Net movement", `${D.growC + D.declC >= 0 ? "+" : ""}${fmt(D.growC + D.declC)}`, "cases", INK]];
    band.forEach(([k, v, sub, c], i) => {
      const x = 44 + i * 285;
      if (i) rect(s, x - 14, 102, 1, 44, RULELT);
      lbl(s, k, x, 104, 250);
      T(s, v, x, 118, 120, 28, { fontFace: DISP, fontSize: pt(21), bold: true, color: c });
      T(s, sub, x + 96, 126, 170, 12, { fontSize: 6.8, color: GREY2 });
    });
    rect(s, 44, 152, 852, 1, RULE);
    const listCol = (x0, list, neg, title, note) => {
      rect(s, x0, 168, 4, 12, neg ? DN : UP);
      lbl(s, title, x0 + 12, 168, 260, { color: neg ? DN : UP });
      if (note) T(s, note, x0 + 200, 169, 216, 12, { align: "right", fontSize: 6, color: GREY2 });
      T(s, "PRIOR ○ → NOW ●", x0 + 160, 186, 130, 10, { fontSize: 5.8, color: "BEBEBE", align: "center" });
      T(s, "Δ CS", x0 + 330, 186, 40, 10, { fontSize: 6, bold: true, color: GREY2, align: "right" });
      T(s, "Δ SKUS", x0 + 374, 186, 42, 10, { fontSize: 6, bold: true, color: GREY2, align: "right" });
      rect(s, x0, 198, 416, 1, RULE);
      const SMax = Math.max(...list.map(r => Math.max(r.cur, r.prev)), 1) * 1.02;
      list.forEach((r, i) => {
        const y = 204 + i * 23;
        rect(s, x0, y + 22, 416, 0.75, RULELT);
        T(s, r.n, x0, y + 3, 118, 14, { fontSize: pt(9.2), bold: true });
        const hc = HC[r.h] || HC.stable;
        s.addShape("roundRect", { ...P(x0 + 122, y + 4, 44, 11), rectRadius: 0.03, fill: { color: hc[1] }, line: { type: "none" } });
        T(s, String(r.h).toUpperCase(), x0 + 122, y + 5.5, 44, 9, { align: "center", fontSize: 5, bold: true, color: hc[0], charSpacing: 0.3 });
        // dumbbell
        const tx = x0 + 178, tw = 140;
        const x1 = tx + tw * (r.prev / SMax), x2 = tx + tw * (r.cur / SMax);
        rect(s, Math.min(x1, x2), y + 10, Math.max(2, Math.abs(x2 - x1)), 2, neg ? DNL : UPL);
        s.addShape("ellipse", { ...P(x1 - 3.5, y + 7, 7, 7), fill: { color: "FFFFFF" }, line: { color: PRIOR, width: 1.1 } });
        s.addShape("ellipse", { ...P(x2 - 4.5, y + 6, 9, 9), fill: { color: neg ? DN : UP }, line: { color: "FFFFFF", width: 1 } });
        T(s, `${r.d > 0 ? "+" : ""}${r.d}`, x0 + 326, y + 3, 44, 13, { align: "right", fontSize: pt(9.5), bold: true, color: neg ? DN : UP });
        const pd = (r.plc || 0) - (r.plcP || 0);
        T(s, pd !== 0 ? `${pd > 0 ? "▲" : "▼"}${Math.abs(pd)}` : "—", x0 + 374, y + 3, 42, 13, { align: "right", fontSize: pt(8.8), bold: pd !== 0, color: pd > 0 ? UP : pd < 0 ? DN : "C9C9C9" });
      });
    };
    listCol(44, D.upList, false, `Top ${D.upList.length} growth accounts`);
    rect(s, 470, 168, 1, 470, RULELT);
    listCol(482, D.dnList, true, `Top ${D.dnList.length} declining accounts`, `${M.rank} · labels read the 12-month trend`);
    const newN = D.upList.filter(r => r.prev === 0).length;
    rect(s, 44, 636, 852, 1, RULE);
    s.addText([{ text: `${D.growN} accounts ${M.grew}`, options: { bold: true } }, { text: `, adding ${fmt(D.growC)} cases between them${newN ? `; ${newN} of the ${D.upList.length} shown ${M.hadNone}` : ""}.` }], { ...P(44, 644, 410, 34), fontFace: BODY, fontSize: pt(9.2), color: "2B2B2B", margin: 0, lineSpacingMultiple: 1.2 });
    s.addText([{ text: "The SKU column separates two problems. ", options: { bold: true } }, { text: "An account that lost items has distribution to rebuild; one that held its items and still fell is a velocity conversation." }], { ...P(482, 644, 414, 34), fontFace: BODY, fontSize: pt(9.2), color: "2B2B2B", margin: 0, lineSpacingMultiple: 1.2 });
    foot(s, SRC + " Δ SKUs is the change in the count of distinct items the account bought." + (D.outlier ? ` ${D.outlier.n} (${fmt(D.outlier.prev)} → ${fmt(D.outlier.cur)} cases, +${fmt(D.outlier.d)}) is excluded from the lists because its scale compresses every other account; it remains in all totals above.` : ""));
  }

  // ---------- 7 · lapsed ----------
  if (want(6) && D.lapN >= 2) {
    const s = mkSlide();
    head(s, "LAPSED ACCOUNTS", `${D.scope.name} · no order in the ${M.dflt ? PERIOD.toLowerCase() : "last 90 days"}`);
    rect(s, 44, 96, 852, 2, INK);
    const winnable = D.qBands[0].n + D.qBands[1].n, winnableV = D.qBands[0].v + D.qBands[1].v;
    const band = [["Lapsed accounts", String(D.lapN), `of ${D.withHist} with history · ${Math.round(D.lapN / D.withHist * 100)}%`, WARMD], ["Cases they last bought", fmt(D.lapLife), `over 24 months · ${fmt(D.lapL52)} in the last year`, INK], ["Quiet under nine months", String(winnable), `accounts · ${fmt(winnableV)} cases · the winnable pool`, WARMD]];
    band.forEach(([k, v, sub, c], i) => {
      const x = 44 + i * 285;
      if (i) rect(s, x - 14, 102, 1, 46, RULELT);
      lbl(s, k, x, 104, 250);
      T(s, v, x, 118, 100, 28, { fontFace: DISP, fontSize: pt(22), bold: true, color: c });
      T(s, sub, x + 70, 127, 210, 12, { fontSize: 6.8, color: GREY2 });
    });
    rect(s, 44, 154, 852, 1, RULE);
    lbl(s, "Largest lapsed accounts", 44, 170, 260);
    (D.lapsed || []).forEach((t2, i) => {
      const y = 192 + i * 34;
      rect(s, 44, y + 32, 440, 0.75, RULELT);
      T(s, String(i + 1), 44, y + 6, 14, 12, { align: "right", fontSize: 6.5, color: "BDBDBD" });
      T(s, t2.n, 64, y, 250, 14, { fontSize: pt(9.2), bold: true });
      if (i < Math.min(6, Math.ceil(D.lapsed.length / 2))) {
        s.addShape("roundRect", { ...P(64 + Math.min(t2.n.length * 5.4, 210) + 8, y + 1, 44, 11), rectRadius: 0.03, fill: { color: GOLDBG }, line: { type: "none" } });
        T(s, "TOP TIER", 64 + Math.min(t2.n.length * 5.4, 210) + 8, y + 2.5, 44, 9, { align: "center", fontSize: 5, bold: true, color: GOLD });
      }
      T(s, `${t2.city} · ${t2.ct}`, 64, y + 15, 250, 11, { fontSize: 6, color: GREY2 });
      T(s, fmt(t2.life), 330, y + 2, 60, 16, { align: "right", fontFace: DISP, fontSize: pt(12), bold: true });
      T(s, "cs", 392, y + 8, 16, 10, { fontSize: 5.8, color: GREY2 });
      T(s, `${t2.q} mo`, 404, y + 5, 40, 12, { align: "right", fontSize: pt(8.6), bold: t2.q <= 6, color: t2.q <= 6 ? WARMD : GREY2 });
      T(s, `${t2.sku} sk`, 448, y + 5, 32, 12, { align: "right", fontSize: pt(8.4), color: GREY });
    });
    rect(s, 500, 170, 1, 500, RULELT);
    lbl(s, "How long they have been quiet", 520, 170, 300);
    let qx = 520;
    D.qBands.filter(q => q.v > 0).forEach(q => {
      const w = 376 * (q.v / D.lapLife);
      rect(s, qx, 192, w, 30, (q.c || "#B5817A").replace("#", ""));
      if (q.v / D.lapLife >= 0.12) T(s, `${Math.round(q.v / D.lapLife * 100)}%`, qx, 200, w, 16, { align: "center", fontFace: DISP, fontSize: pt(11), bold: true, color: "FFFFFF" });
      qx += w;
    });
    let qy = 232;
    D.qBands.filter(q => q.n > 0).forEach(q => {
      rect(s, 520, qy + 2, 8, 8, (q.c || "#B5817A").replace("#", ""));
      s.addText([{ text: q.k + "  ", options: { bold: true } }, { text: `${q.n} accts · ${fmt(q.v)} cs`, options: { color: GREY } }], { ...P(534, qy - 2, 340, 14), fontFace: BODY, fontSize: 7, color: INK, margin: 0 });
      qy += 16;
    });
    rect(s, 520, qy + 12, 376, 1, RULE);
    lbl(s, "By channel", 520, qy + 24, 200);
    const mxC = Math.max(...D.lapChan.map(c => c.v), 1);
    D.lapChan.forEach((c, i) => {
      const y = qy + 44 + i * 22;
      T(s, c.k, 520, y, 78, 12, { fontSize: pt(9), bold: true });
      rect(s, 604, y + 2, 210, 9, "F3F3F3");
      rect(s, 604, y + 2, Math.max(2, 210 * (c.v / mxC)), 9, WARM);
      T(s, String(c.n), 820, y, 24, 12, { align: "right", fontSize: pt(9), bold: true });
      T(s, `${fmt(c.v)} cs`, 848, y, 48, 12, { align: "right", fontSize: 7, color: GREY });
    });
    const noteY = qy + 44 + D.lapChan.length * 22 + 16;
    rect(s, 520, noteY, 3, 44, WARM);
    s.addText([{ text: `${winnable} account${winnable === 1 ? " has" : "s have"} been quiet under nine months`, options: { bold: true } }, { text: `, holding ${fmt(winnableV)} cases — ${Math.round(winnableV / D.lapLife * 100)}% of all lapsed volume. They still remember the brand and most still have space on the shelf.` }], { ...P(532, noteY - 2, 360, 50), fontFace: BODY, fontSize: pt(9.8), color: "2B2B2B", margin: 0, lineSpacingMultiple: 1.2 });
    foot(s, SRC + " Cases shown are what the account bought across the 24 months on file. Months quiet counts from its last order. Top tier flags the largest by lifetime volume.");
  }

  // ---------- 8 · recap ----------
  if (want(7)) {
    const s = mkSlide();
    head(s, "WHERE TO SPEND THE QUARTER", `${D.scope.name} · ${PERIOD} · opportunities and headwinds`);
    rect(s, 44, 96, 852, 2, INK);
    const S4 = [[M.stat, fmt(D.cur90), D.casesPct, `vs ${fmt(D.prev90)} ${M.cmpShort}`], ["Active accounts", fmt(D.accts), D.acctsPct, `of ${D.withHist} with history`], ["Placements", fmt(D.plN), D.plcPct, "account × SKU pairs"], ["Cases / acct / mo", String(D.ros), null, `vs ${D.rosPrev} prior 90`]];
    S4.forEach(([k, v, p, sub], i) => {
      const x = 44 + i * 213;
      if (i) rect(s, x - 10, 108, 1, 62, RULELT);
      lbl(s, k, x, 108, 200, { align: "center" });
      s.addText([{ text: v, options: { fontFace: DISP, fontSize: pt(26), bold: true, color: INK } }].concat(p != null ? [{ text: `  ${arrow(p)} ${Math.abs(p)}%`, options: { fontSize: pt(9.5), bold: true, color: dltC(p) } }] : []),
        { ...P(x, 124, 200, 34), align: "center", margin: 0, valign: "top" });
      T(s, sub, x, 158, 200, 14, { align: "center", fontSize: 6.8, color: GREY2 });
    });
    rect(s, 44, 180, 852, 1, RULE);
    const surg = D.buckets.find(b => b.k === "Surging"), lap = D.buckets.find(b => b.k === "Lapsed");
    const risk = D.buckets.find(b => b.k === "At risk") || { n: 0, l52: 0 }, soft = D.buckets.find(b => b.k === "Softening") || { n: 0, l52: 0 };
    const win = D.qBands[0].n + D.qBands[1].n, winV = D.qBands[0].v + D.qBands[1].v;
    const topBrand = (D.pkg.rows[0] && D.pkg.rows[0].cur >= ((D.draft.rows[0] || { cur: 0 }).cur)) ? D.pkg.rows[0] : (D.draft.rows[0] || D.pkg.rows[0]);
    const OPP = [
      win ? { h: "Wake the recently quiet", v: fmt(winV), u: "cases", b: `${win} account${win === 1 ? " has" : "s have"} been silent under nine months and can be worked before the relationship cools.` } : null,
      topBrand ? { h: `Deepen ${topBrand.n}`, v: String(topBrand.acc), u: "accounts", b: `It already sits in ${topBrand.acc} accounts at ${(rosBase(topBrand) / (topBrand.acc || 1) / 3).toFixed(1)} cases per account per month. The shelf is won; the velocity is the opportunity.` } : null,
      { h: "Press the accounts already climbing", v: surg ? String(surg.n) : "0", u: "surging accounts", b: `They run ${surg ? surg.ros : 0} cases per account per month against the book's ${D.ros}. More of what they carry is the fastest volume in the market.` },
    ].filter(Boolean).slice(0, 3);
    const HEADW = [
      lap && lap.n ? { h: "Dormant accounts", v: String(lap.n), u: "accounts", b: `${Math.round(lap.n / D.withHist * 100)}% of everyone who has ever bought, worth ${fmt(lap.l52)} cases in the last twelve months.` } : null,
      (risk.n + soft.n) ? { h: "Accounts wobbling", v: fmt(risk.l52 + soft.l52), u: "cases at risk", b: `${risk.n + soft.n} at-risk and softening account${risk.n + soft.n === 1 ? "" : "s"} hold this much 52-week volume. Reachable now, expensive later.` } : null,
      { h: "Placement change", v: `${D.plcPct >= 0 ? "+" : ""}${D.plcPct}%`, u: "placements", b: `Account-and-SKU pairs moved from ${fmt(D.plP)} to ${fmt(D.plN)}. Distribution and velocity have to move together for the quarter to hold.` },
    ].filter(Boolean).slice(0, 3);
    const col = (items, x0, color, title) => {
      rect(s, x0, 200, 4, 13, color);
      lbl(s, title, x0 + 12, 200, 200, { color });
      items.forEach((it, i) => {
        const y = 232 + i * 96;
        T(s, it.v, x0, y, 64, 24, { align: "right", fontFace: DISP, fontSize: pt(22), bold: true, color });
        T(s, it.u, x0, y + 26, 64, 12, { align: "right", fontSize: 6, color: GREY2 });
        rect(s, x0 + 74, y, 1, 76, RULELT);
        T(s, it.h, x0 + 88, y, 330, 16, { fontSize: pt(11.5), bold: true });
        T(s, it.b, x0 + 88, y + 18, 330, 60, { fontSize: pt(9.6), color: "3A3A3A", lineSpacingMultiple: 1.25 });
      });
    };
    col(OPP, 44, UP, "Opportunities");
    rect(s, 470, 200, 1, 330, RULELT);
    col(HEADW, 482, DN, "Headwinds");
    rect(s, 44, 556, 852, 1, RULE);
    lbl(s, "52-week cases · actual", 160, 570, 240, { align: "center" });
    T(s, fmt(D.l52), 160, 586, 240, 32, { align: "center", fontFace: DISP, fontSize: pt(26), bold: true });
    T(s, `${arrow(D.l52Pct)} ${Math.abs(D.l52Pct)}%`, 160, 620, 240, 14, { align: "center", fontSize: pt(10.5), bold: true, color: dltC(D.l52Pct) });
    T(s, `vs ${fmt(D.p52)} prior year`, 160, 636, 240, 12, { align: "center", fontSize: 6.5, color: GREY2 });
    rect(s, 470, 566, 1, 84, RULELT);
    lbl(s, "Rate of sale · now", 540, 570, 240, { align: "center", color: FCBLUE });
    T(s, String(D.ros), 540, 586, 240, 32, { align: "center", fontFace: DISP, fontSize: pt(26), bold: true, color: FCBLUE });
    T(s, `${arrow(Math.round(((D.ros - D.rosPrev) / (D.rosPrev || 1)) * 100))} ${Math.abs(Math.round(((D.ros - D.rosPrev) / (D.rosPrev || 1)) * 100))}%`, 540, 620, 240, 14, { align: "center", fontSize: pt(10.5), bold: true, color: FCBLUE });
    T(s, `cases per account per month vs ${D.rosPrev}`, 540, 636, 240, 12, { align: "center", fontSize: 6.5, color: "8990BE" });
    foot(s, "Every figure on this page is drawn from distributor depletion reporting through the snapshot date and appears on an earlier slide. " + SRC.replace("Source: distributor depletion reporting through the snapshot date. ", ""));
  }

  return pres;
}
