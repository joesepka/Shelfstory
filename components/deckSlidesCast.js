// AUTO-PORTED from the approved deck mockups. Each renderer returns one slide's HTML;
// renderDeck(D, logoSrc) returns the slides in order, skipping any with no real data.
/* eslint-disable */
import { SNAP_LABEL } from "../lib/snapshot.js";
import { cutOf, stackSeries, CUT_DIMS } from "../lib/deckData.js";
// THE SHELF SHIPS WITH ONE SLIDE PER DESIGN (Joe, 2026-08-18: "This is a library. You pick and
// add to decks — they all just exist."). There is no "in use" cover; there are three covers.
// A default variant is an ordinary variant — same builder, own settings entry — defined in code
// rather than made by a person, so it is not deletable. The base slide is design 3, which is why
// a deck built before any of this comes out unchanged.
// THE SHELF SHIPS ONE SLIDE PER DESIGN (Joe, 2026-08-18: "This is a library. You pick and add
// to decks — they all just exist."). Filled in at the bottom of this file, once the per-type
// design lists exist; declared here because renderDeckSlides reads them.
export const DEFAULT_VARIANTS = [];
// what design a given slide id is drawing, and where that sits in its type's three
const designOf = (base, id) => ((SETTINGS_SEEN[id] || {}).design)
  || ((DEFAULT_VARIANT_SETTINGS[id] || {}).design) || "editorial";
const designOrd = (base, id) => Math.max(0, designListOf(base).findIndex(x => x[0] === designOf(base, id)));
let SETTINGS_SEEN = {};
export const DEFAULT_VARIANT_SETTINGS = {};

export function renderDeckSlides(D0, logoSrc, brandName, settings, variants) {
// D0 is the deck as built. Slides that offer a SCOPE FILTER shadow it with a cut view
// of the same data (see cutOf); everything else just reads D0 through this alias.
const D = D0;
// Per-slide template settings from the Library editor: { overview: { voice, bullets } }.
// They are TEMPLATE settings — saved once, applied to every deck built afterwards.
// `stats` and `graphs` are BLOCK LISTS: which named regions are on, in what order.
// null means "all of them", so settings saved before blocks existed still render whole.
const SET = Object.assign({}, DEFAULT_VARIANT_SETTINGS, settings || {});
SETTINGS_SEEN = SET;
const packOf = (sid) => (setOf(sid).pack === "pkg" ? "pkg" : "draft");
const setOf = (id) => Object.assign({ voice: "neutral", bullets: 4, title: "Overview", layout: "text-left", chart: "green", chart2: "rose", bar: "normal", words: "bullets", design: "editorial", titleSize: "m", brow: "Business Review", pack: "draft", split: "package", span: "12", mode: "stack", bands: "4", labels: "on", sayAt: "below", say: "b3", tone: "informative", gsize: "expanded", measure: "accounts", parts: null, stats: null, graphs: null }, SET[id] || {});

/* ---------- named blocks ------------------------------------------------------
   A block is one region of a slide: a stable id, its own renderer, its own settings.
   `block()` is the only place an id reaches the HTML — everything downstream (the
   editor's controls, the hover outline, drag-to-reorder) finds a region by reading
   data-block, so a region without one is invisible to all of it.

   The div block() emits IS the div that region already had — same styles, one extra
   attribute — so naming a region cannot move it.                                   */
const block = (id, style, inner) =>
  inner ? `<div data-block="${id}"${style ? ` style="${style}"` : ""}>${inner}</div>` : "";
// A saved block list, cleaned: ids in the order they were saved, anything unrecognised
// dropped (a retired block can't crash an old template), and no list at all means all.
const onlyOn = (chosen, catalogue) => {
  const known = catalogue.map(c => c[0]);
  return Array.isArray(chosen) ? chosen.filter(id => known.indexOf(id) >= 0) : known;
};
  const LOGO = logoSrc || "/blindcorner/desktop/brand/blindcorner/logo.png";
const BRAND_NAME = brandName || "Blind Corner Brewery";
const fmt=n=>Math.round(n).toLocaleString();
const kf=v=>v>=1000?(v/1000).toFixed(1)+'k':String(Math.round(v));
const arrow=p=>p==null?'':(p>0?'▲':p<0?'▼':'');
const sgn=p=>p==null?'':(p>0?'up':p<0?'dn':'');
const logo=h=>'<img src="'+LOGO+'" style="height:'+h+'px;display:block">';
const mix=(a,b,t)=>{const p=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const A=p(a),B=p(b);return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')';};
const PERIOD = D.dataThru || `90 days ended ${SNAP_LABEL}`;
// timeframe labels — the fallback IS today's wording, so default decks never change
const M = D.tfMeta || { dflt:true, stat:"90-day cases", col:"90D", winShort:"90 days", winNoun:"last 90 days",
  cmpShort:"prior 90", cmpLong:"the prior 90 days", cmpNoun:"prior 90 days", rank:"ranked on the quarter",
  grew:"grew this quarter", over:"over the quarter", newPhrase:"new this quarter",
  zeroCmp:"no prior-quarter volume at all", hadNone:"had no volume at all a quarter ago" };
// ROS is ALWAYS the current-90-day read, whatever the timeframe — rows carry l90 for it
const rosBase = r => (r.l90 != null ? r.l90 : r.cur);
const SRC="Source: distributor depletion reporting through the snapshot date. "+(M.dflt?"Cases are 90-day rolling totals against the immediately preceding 90 days unless stated as 52-week.":"Volume figures are "+M.winShort+" totals against "+M.cmpLong+"; distribution counts (placements, accounts carrying) and rate of sale always read the latest 90 days. Figures stated as 52-week are unchanged.")+" Health is read from each account's own monthly order line: new on its first order in 52 weeks, lapsed after 90 days without one, surging or softening only when confirmed across consecutive months against its own baseline.";

/* ---------- shared chrome ---------- */
const head=(title,sub)=>`
 <div style="display:flex;align-items:center;justify-content:space-between">
  <div><div class="fig" style="font-size:31px">${title}</div>
   <div class="lbl" style="letter-spacing:1.6px;margin-top:6px">${sub}</div></div>
  ${logo(56)}</div>`;
const foot=(t)=>`<div style="border-top:1px solid var(--ruleLt);padding-top:6px;margin-top:8px">
  <div style="font-size:7.4px;line-height:1.5;color:var(--grey2)">${t||SRC}</div></div>`;
// lines = [{info, sell}] written by the slide; `accent` colours the bullet numerals.
const sayBlock=(ST,lines,accent)=>{const form=ST.say||"b3";
  if(form==="none"||!lines||!lines.length) return "";
  // ONE VOICE for now (Joe, 2026-08-19: "just do a simple informative voice always across
  // the board until we get more complicated"). The `sell` phrasings stay written in each
  // slide, unused, so turning the choice back on later is a one-line change here.
  const key="info";
  const pick=lines.map(l=>l[key]||l.info||l.sell).filter(Boolean);
  if(!pick.length) return "";
  if(form==="para") return `<div style="font-size:11.4px;line-height:1.55;color:#2B2B2B">${pick.join(" ")}</div>`;
  const n=form==="b1"?1:form==="b2"?2:3;
  return `<div class="lbl" style="margin-bottom:9px">Key insights</div>`+
    pick.slice(0,n).map((b,i)=>`<div style="display:flex;gap:9px;margin-bottom:11px">
      <span class="fig" style="font-size:12px;color:${accent||"var(--green)"};width:13px;flex-shrink:0">${i+1}</span>
      <span style="font-size:10.8px;line-height:1.5;color:#2B2B2B">${b}</span></div>`).join("");};

/* Where the words sit decides the whole body layout, so it is composed once here rather than
   in each slide. `centered` only narrows the graph when the text is ABOVE or BELOW it — beside
   a text column the graph is already narrow, and shrinking it twice just wastes the page.  */
const sayLayout=(ST,graph,text)=>{
  const at=["above","below","left","right"].indexOf(ST.sayAt)>=0?ST.sayAt:"below";
  const side=at==="left"||at==="right", has=!!text;
  if(side&&has) return `<div style="flex:1;display:flex;gap:26px;min-height:0;align-items:center;padding-top:8px">
     ${at==="left"?`<div style="width:31%;min-width:0">${text}</div><div style="width:1px;align-self:stretch;background:var(--ruleLt)"></div>`:""}
     <div style="flex:1;min-width:0">${graph}</div>
     ${at==="right"?`<div style="width:1px;align-self:stretch;background:var(--ruleLt)"></div><div style="width:31%;min-width:0">${text}</div>`:""}
   </div>`;
  const w = ST.gsize==="centered" ? "78%" : "100%";
  return `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0;gap:14px;padding-top:8px">
     ${at==="above"&&has?text:""}
     <div style="width:${w};margin:0 auto">${graph}</div>
     ${at!=="above"&&has?text:""}
   </div>`;};

const wrap=b=>`<div class="slide"><div style="padding:28px 44px 16px;height:100%;display:flex;flex-direction:column">${b}</div>
 <div style="position:absolute;right:14px;bottom:8px;font-size:6px;font-weight:700;letter-spacing:1.4px;color:#CFCFCF">SHELFSTORY</div></div>`;

/* ---------- charts ---------- */
const CW=600,PL=4,PR=40,PT=18,PB=26;
function barChart(o){
  // [corner radius, share of the column the bar fills]. The radius is fixed now — only the
  // width is a choice. The old keys still resolve so nothing saved before this breaks.
  const BS={wide:[2.5,0.86],normal:[2.5,0.62],thin:[2.5,0.34],
            rounded:[2.5,0.62],square:[2.5,0.62],slim:[2.5,0.34]}[o.bar||'normal']||[2.5,0.62];
  const H=o.h||150, pw=CW-PL-PR, ph=H-PT-PB, n=o.vals.length, step=pw/n, bw=Math.min(step*BS[1],BS[1]>0.7?46:32), mx=Math.max(...o.vals,1);
  let s='<svg viewBox="0 0 '+CW+' '+H+'" style="width:100%;height:'+H+'px;display:block" preserveAspectRatio="none">';
  s+='<line x1="'+PL+'" y1="'+(PT+ph)+'" x2="'+(PL+pw)+'" y2="'+(PT+ph)+'" stroke="#E8E8E8"/>';
  o.vals.forEach((v,i)=>{const t=Math.pow(i/(n-1||1),1.2),c=mix(o.c[0],o.c[1],t),bh=Math.max(2,(v/mx)*ph),x=PL+i*step+(step-bw)/2,y=PT+ph-bh;
    s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="'+BS[0]+'" fill="'+c+'"/>';
    s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(y-5).toFixed(1)+'" text-anchor="middle" font-family="Arial" font-size="9.5" font-weight="bold" fill="'+mix('#B4B4B4',o.lab,t)+'">'+(o.fmt?o.fmt(v):v)+'</text>';});
  o.labels.forEach((L,i)=>{const x=PL+i*step+step/2;
    s+='<text x="'+x.toFixed(1)+'" y="'+(PT+ph+13)+'" text-anchor="middle" font-family="Arial" font-size="9" fill="#9A9A9A">'+L+'</text>';
    if(o.yr&&o.yr[i]) s+='<text x="'+x.toFixed(1)+'" y="'+(PT+ph+22)+'" text-anchor="middle" font-family="Arial" font-size="7.5" fill="#C4C4C4">'+o.yr[i]+'</text>';});
  if(o.line){const lmx=Math.max(...o.line)*1.12,lmn=Math.min(...o.line)*0.72,rg=lmx-lmn||1,yOf=v=>PT+ph-((v-lmn)/rg)*ph;
    const pts=o.line.map((v,i)=>(PL+i*step+step/2).toFixed(1)+','+yOf(v).toFixed(1)).join(' ');
    s+='<polyline points="'+pts+'" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>';
    s+='<polyline points="'+pts+'" fill="none" stroke="var(--up)" stroke-width="2.3" stroke-linejoin="round"/>';
    const lx=PL+(n-1)*step+step/2;
    s+='<circle cx="'+lx.toFixed(1)+'" cy="'+yOf(o.line[n-1]).toFixed(1)+'" r="3.4" fill="var(--up)" stroke="#fff" stroke-width="1.6"/>';
    [lmx,(lmx+lmn)/2,lmn].forEach(t=>s+='<text x="'+(CW-PR+7)+'" y="'+(yOf(t)+3).toFixed(1)+'" font-family="Arial" font-size="8" fill="var(--up)" opacity=".8">'+t.toFixed(1)+'</text>');
    s+='<text x="'+(CW-PR+7)+'" y="'+(PT+ph+13)+'" font-family="Arial" font-size="7" fill="var(--up)" opacity=".7">cs/ac</text>';}
  return s+'</svg>';
}
// Graph palettes the Library editor can choose between. Each is [pale, full, labelInk] —
// bars ramp pale->full left to right, so the newest month always reads strongest.
const ramp = rampOf;
// ?? not || — a hue of 0 is red, not "unset", and || would quietly turn it green
/* MONTHS OR QUARTERS (Joe, 2026-08-19). Twelve columns is a lot of detail for a board slide,
   so the same series can bucket into four. Cases SUM across a quarter; active accounts and
   rate of sale are rates, so they AVERAGE — summing them would invent accounts that were the
   same account three months running. Labels name the months covered rather than saying "Q1",
   because these are trailing quarters off the snapshot, not calendar ones.                 */
const byQuarter=(vals,labels,how)=>{const v=[],l=[];
  for(let i=0;i<vals.length;i+=3){const g=vals.slice(i,i+3); if(!g.length) continue;
    const sum=g.reduce((a,b)=>a+(+b||0),0);
    v.push(how==='avg' ? sum/g.length : sum);
    l.push(labels[i]+'–'+labels[Math.min(i+2,labels.length-1)]);}
  return {v,l};};
const casesChart=(D,h,rk,bs,q)=>{const R=ramp(rk??'green');
  const src=D.hist.slice(-12).map(v=>Math.round(v));
  const Q=q?byQuarter(src,D.months,'sum'):null;
  return barChart({vals:Q?Q.v.map(Math.round):src,labels:Q?Q.l:D.months,yr:Q?null:D.yr,c:[R[0],R[1]],lab:R[2],fmt:kf,h,bar:bs});};
const acctChart =(D,h,rk,bs,q)=>{const R=ramp(rk??'rose');
  const Q=q?byQuarter(D.accSeries,D.months,'avg'):null;
  const QR=q&&D.rosSeries?byQuarter(D.rosSeries,D.months,'avg'):null;
  return barChart({vals:Q?Q.v.map(Math.round):D.accSeries,labels:Q?Q.l:D.months,yr:Q?null:D.yr,c:[R[0],R[1]],lab:R[2],line:QR?QR.v:D.rosSeries,h,bar:bs});};
const gHead=(t,sub,legend)=>'<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1px;padding-right:'+(PR/CW*100).toFixed(2)+'%">'
  +'<span class="lbl">'+t+' <span style="color:#C4C4C4;font-weight:400;letter-spacing:0;text-transform:none">'+sub+'</span></span>'
  +(legend?'<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:14px;height:2.5px;background:var(--up)"></span><span style="font-size:8px;font-weight:700;color:var(--up)">cases / acct / mo</span></span>':'')+'</div>';

/* ---------- 1 · cover -------------------------------------------------------
   THREE REGISTERS, ONE FAMILY (Joe, 2026-08-18).

   Every default slide gets three designs — **editorial** (bold), **modern** (clean /
   studio) and **boardroom** (conservative, the thing a distributor put out five years
   ago) — and any of the three must be able to sit in a deck beside any other and still
   read as one document.

   What makes that hold is that only the REGISTER changes. All three cover designs are
   the same engine drawing the same five things — eyebrow, logo, scope name, the sub +
   period line, the source footer — out of the same palette tokens, the same `.fig`
   display face and the same page. What varies is scale, alignment, how much air, and
   how the accent is spent:

     editorial  huge tight caps, the logo bleeding off the corner, accent as a bar
     modern     small confident type anchored low, two hairlines, acres of air,
                the accent spent once on a 7px square
     boardroom  centred and symmetric, accent band across the top, rules above and
                below, wide-tracked caps at a polite size

   The accent appears EXACTLY ONCE in each. That restraint is most of why they sit
   together. Keep it if you add a fourth.

   THE PARTS ARE WRITTEN ONCE. A cover is always the same six things — eyebrow, mark,
   name, meta, rules, footer — and a design is only an ARRANGEMENT of them at a chosen
   scale. So the wording, the source line and the scope name each exist in exactly one
   place, and a fourth register costs one short layout function, not another copy of the
   whole slide (Joe, 2026-08-18: "all built from the same engine").                    */
/* Every part except the scope name can be taken off, and the name can be sized up or down.
   TITLE SIZE IS A MULTIPLIER, NOT A NUMBER (Joe, 2026-08-18). Each design has its own idea of
   how loud the name should be — 92px editorial, 46px boardroom — so "Large" means large FOR
   THIS DESIGN. An absolute px would let you set 92 on the boardroom cover and blow up the
   register the whole family depends on.
   `P` is the little context each design draws with: P.on(part) and P.f (the size factor). */
const cvFoot  = `Prepared from distributor depletion reporting through the snapshot date &nbsp;·&nbsp; ${BRAND_NAME}`;
const cvBrow  = (P, track, size) => (!P.on("eyebrow") || !P.brow) ? "" : `<span style="font-size:${size||9.5}px;font-weight:700;letter-spacing:${track||2.2}px;text-transform:uppercase;color:var(--grey2)">${P.brow}</span>`;
const cvMark  = (P, h) => P.on("mark") ? logo(h) : "";
const cvName  = (P, size, track, caps, lh) => `<div class="fig" style="font-size:${(size*P.f).toFixed(1)}px;letter-spacing:${track}px;line-height:${lh}">${caps ? D.scope.name.toUpperCase() : D.scope.name}</div>`;
const cvMeta  = (P, size, oneLine) => {
  const a = P.on("sub") ? D.scope.sub : "", b = P.on("period") ? PERIOD : "";
  if (!a && !b) return "";
  if (oneLine) return `<div style="font-size:${size}px;color:var(--grey)">${[a, b].filter(Boolean).join(" &nbsp;·&nbsp; ")}</div>`;
  return (a ? `<div style="font-size:${size}px;color:var(--grey)">${a}</div>` : "")
       + (b ? `<div style="font-size:${size}px;color:var(--grey2);margin-top:${a ? 4 : 0}px">${b}</div>` : "");
};
const cvRule  = (m, w) => `<div style="height:1px;background:var(--rule);${w?'width:'+w+';':''}margin:${m}"></div>`;
const cvSrc   = (P, center) => !P.on("source") ? "" : `<div style="font-size:9px;color:var(--grey2)${center?';text-align:center':''}">${cvFoot}</div>`;
const cvPage  = (pad, body, extra) => `<div class="slide"><div style="height:100%;${extra||''}padding:${pad};display:flex;flex-direction:column">${body}</div></div>`;

// Each design is an arrangement, nothing more. The accent is spent EXACTLY ONCE in each —
// a bar, a dot, a band — which is most of why the three sit together in one deck.
const COVERS = {
  // BOLD — the name at full size, the mark bleeding off the corner.
  editorial: (P) => cvPage("52px 56px 38px",
    `${P.on("mark") ? `<img src="${LOGO}" style="position:absolute;right:-150px;top:-90px;height:720px;opacity:.10">` : ""}
   <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start">
     <div>${cvBrow(P)}</div>
     ${cvMark(P, 70)}
   </div>
   <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center">
     ${cvName(P, 92, -1.5, true, .9)}
     <div style="height:3px;width:110px;background:var(--pink);margin:24px 0 20px"></div>
     ${cvMeta(P, 16, true)}
   </div>
   <div style="position:relative">${cvSrc(P)}</div>`, "position:relative;overflow:hidden;"),

  // CLEAN / STUDIO — the argument is the white space. Nothing centred, nothing decorated,
  // the name sits low and keeps its own case instead of shouting.
  modern: (P) => cvPage("64px 74px 50px",
    `<div style="display:flex;align-items:center;justify-content:space-between">
     <span style="display:inline-flex;align-items:center;gap:11px">
       <span style="width:7px;height:7px;background:var(--pink);display:block"></span>${cvBrow(P)}
     </span>
     ${cvMark(P, 34)}
   </div>
   ${cvRule("20px 0 0")}
   <div style="flex:1"></div>
   ${cvName(P, 58, -1, false, 1)}
   <div style="margin-top:18px">${cvMeta(P, 13.5, false)}</div>
   ${cvRule("30px 0 13px")}
   ${cvSrc(P)}`),

  // CONSERVATIVE / BOARDROOM — symmetric and ruled, the way a distributor deck has always
  // opened. Caps tracked wide rather than squeezed tight, at a size that doesn't shout.
  boardroom: (P) => cvPage("0",
    `<div style="height:7px;background:var(--pink);flex-shrink:0"></div>
   <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 92px">
     ${cvMark(P, 96)}
     ${cvRule("36px 0 0", "100%")}
     <div style="margin:24px 0 17px">${cvBrow(P, 3, 10.5)}</div>
     ${cvName(P, 46, 0.5, true, 1.08)}
     <div style="width:66px;height:2px;background:var(--pink2);margin:21px 0 19px"></div>
     ${cvMeta(P, 13.5, false)}
     ${cvRule("36px 0 0", "100%")}
   </div>
   <div style="flex-shrink:0;padding:0 70px 34px">${cvSrc(P, true)}</div>`),
};
// what a cover can be made of, and how loud its name is. Simple on purpose: take things off,
// put them back, size the name for this design (Joe, 2026-08-18).
const TITLE_F = { s: 0.78, m: 1, l: 1.26 };
function sTitle(sid){
  const CV = setOf(sid || "cover");
  const on = onlyOn(CV.parts, COVER_PARTS);
  const P = { on: k => on.indexOf(k) >= 0, f: TITLE_F[CV.titleSize] || 1, brow: CV.brow == null ? "Business Review" : CV.brow };
  return (COVERS[CV.design] || COVERS.editorial)(P);
}

/* ---------- 2 · overview ----------------------------------------------------
   THE OVERVIEW IS BUILT FROM NAMED BLOCKS (Joe, 2026-08-18).

   A block is one region of the slide, and it has three things: a stable id, its own
   little renderer, and settings that decide whether it's on and what it shows. The
   write-up column was the first block; the stat row, the two graphs and the 52-week
   strip are the rest, so the slide is regions now instead of one long string.

   The ids are permanent. Everything later points at them — the editor's toggles, the
   metric picker, the hover outline, and eventually dragging a block to a new spot — so
   renaming one would quietly break saved templates.

   Two of the ids are SLOTS, not metrics: graph1 and graph2 mean "the first graph" and
   "the second graph". What each slot draws is `graphs`; its colour ramp is `chart` /
   `chart2`, which were already slot-shaped. That's why the metric picker later needs no
   new machinery — it just puts a different name in the list.                          */
function sOverview(sid){
  // sid is which slide is being drawn — "overview", or the id of a Save-As copy of it.
  // Everything else here reads settings through it, so a copy is simply the same code
  // pointed at a different settings entry.
  const OV = setOf(sid || "overview");

  /* THE SCOPE FILTER. `D` inside this function is the deck AS THIS SLIDE MEASURES IT —
     the whole book by default, or one slice of it when the slide carries a cut. Nothing
     below needs to know which: it reads D and gets the right numbers. Shadowing the outer
     D is the whole trick, and it's why the chart helpers take their data as an argument
     rather than closing over the deck's (Joe, 2026-08-18).                              */
  const D = cutOf(D0, OV.cut) || D0;
  const CUT = D.cut || null;

  /* --- which blocks are on, and in what order ---------------------------------
     Settings name blocks by id. No setting at all means all of them, so every deck
     built before any of this existed still comes out exactly as it did.             */
  const statsOn  = onlyOn(OV.stats,  OVERVIEW_STATS);
  // A cut has no per-account months behind it, so the accounts graph is not on offer —
  // better absent than quietly drawing the whole book under an "IPA" headline. And with no
  // window data at all there is no truthful cases graph either.
  const DESIGN = OV.design || "editorial";
  // ONE GRAPH ON THE ONE-GROWTH-STEP DESIGN (Joe, 2026-08-19: "just do one of them without
  // double graphs… use only volume"). That design says a single thing loudly, so a second
  // chart argues with its own premise — it keeps volume, which is the number in the headline.
  const graphsOn = onlyOn(OV.graphs, OVERVIEW_GRAPHS)
    .filter(g => !CUT || (g === "cases" && D.canGraph))
    .filter(g => DESIGN !== "modern" || g === "cases");
  const stacked = OV.layout === "text-top" || OV.layout === "text-bottom";
  const textFirst = OV.layout === "text-left" || OV.layout === "text-top";

  /* --- block: the stat row ---------------------------------------------------- */
  const STAT = {
    cases:      [M.stat,              fmt(D.cur90), D.casesPct, "vs "+fmt(D.prev90)+" "+M.cmpShort],
    accounts:   ["Active accounts",   fmt(D.accts), D.acctsPct, "of "+D.withHist+" with history"],
    placements: ["Placements",        fmt(D.plN),   D.plcPct,   "account × SKU pairs"],
    ros:        ["Cases / acct / mo", D.ros,        null,       "vs "+D.rosPrev+" prior 90"],
  };
  const statCell=(s,i)=>`<div style="flex:1;text-align:center;${i?'border-left:1px solid var(--ruleLt);':''}">
        <div class="lbl">${s[0]}</div>
        <div style="display:flex;align-items:baseline;gap:8px;margin-top:6px;justify-content:center">
          <span class="fig" style="font-size:33px">${s[1]}</span>
          ${s[2]!=null?'<span class="dlt '+sgn(s[2])+'">'+arrow(s[2])+' '+Math.abs(s[2])+'%</span>':''}</div>
        <div style="font-size:8.5px;color:var(--grey2);margin-top:4px">${s[3]}</div></div>`;
  // The hairline underneath belongs TO the stat row — take the row away and the rule
  // goes with it, the same way the divider travels with the write-up column.
  // the same four stats read DOWN a rail — label left, figure right — for the design that
  // gives the page to the graphs
  const statCellDown=(s,i)=>`<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:10px 0;${i?'border-top:1px solid var(--ruleLt);':''}">
        <span class="lbl" style="min-width:0">${s[0]}</span>
        <span style="display:flex;align-items:baseline;gap:7px;flex-shrink:0">
          <span class="fig" style="font-size:23px">${s[1]}</span>
          ${s[2]!=null?'<span class="dlt '+sgn(s[2])+'">'+arrow(s[2])+' '+Math.abs(s[2])+'%</span>':''}</span></div>`;
  const blkStatsDown = !statsOn.length ? "" :
    block("stats","", statsOn.map((id,i)=>statCellDown(STAT[id],i)).join(''));
  const blkStats = !statsOn.length ? "" :
    block("stats",`padding:15px 0 13px${DESIGN==="boardroom"?";border-top:1px solid var(--rule)":""}`,`<div style="display:flex">${statsOn.map((id,i)=>statCell(STAT[id],i)).join('')}</div>`)
    + `<div style="height:1px;background:var(--rule)"></div>`;

  /* --- blocks: the graphs -----------------------------------------------------
     Heights come out of one pool, so the column fills the same room however many
     graphs are on. Two graphs share it and land on 148 side-by-side / 96 stacked —
     exactly what the slide shipped with. One graph takes the lot. FREED is the room
     the stat row hands back when it is switched off.                               */
  // Each design has its own idea of how much room the graph column gets. Two graphs sharing
  // the editorial pool still land on 148 / 96 — exactly what the slide shipped with.
  const POOL = DESIGN === "boardroom" ? 236 : DESIGN === "modern" ? 300 : (stacked ? 202 : 306);
  const FREED = 90;
  const side = false;                                     // no design puts the graphs side by side now
  const nDown = side ? 1 : Math.max(1, graphsOn.length);   // how many stack vertically
  const room = POOL + (statsOn.length ? 0 : FREED) - 10*(nDown-1);
  const gH = graphsOn.length ? Math.round(room/nDown) : 0;
  const GRAPH = {
    cases:    (h,rk)=>gHead('Cases sold per month','· 12 months')    + casesChart(D,h,rk,OV.bar),
    accounts: (h,rk)=>gHead('Active accounts','· rolling 90 days',1) + acctChart(D,h,rk,OV.bar),
  };
  const RAMP_AT = [OV.chart, OV.chart2];                  // slot 1's colour, slot 2's colour
  const blkGraphs = graphsOn.map((metric,i)=>
    block("graph"+(i+1), i?"margin-top:10px":"", GRAPH[metric](gH, RAMP_AT[i] ?? undefined))).join('');

  /* --- block: the 52-week strip ----------------------------------------------- */
  const blkTotals = block("totals",
    `border-top:1px solid var(--rule);margin-top:11px;padding-top:11px;display:flex;padding-right:${(PR/CW*100).toFixed(2)}%`,
    `<div style="flex:1;text-align:center"><div class="lbl">52-week cases · actual</div>
           <div class="fig" style="font-size:25px;margin-top:5px">${fmt(D.l52)}</div>
           <div class="dlt ${sgn(D.l52Pct)}" style="margin-top:5px">${arrow(D.l52Pct)} ${Math.abs(D.l52Pct)}%</div>
           <div style="font-size:8px;color:var(--grey2);margin-top:4px">vs ${fmt(D.p52)} prior year</div></div>
         <div style="width:1px;background:var(--ruleLt)"></div>
         <div style="flex:1;text-align:center"><div class="lbl" style="color:var(--fcBlue)">52-week cases · forecast</div>
           <div class="fig" style="font-size:25px;margin-top:5px;color:var(--fcBlue)">${fmt(D.fc52)}</div>
           <div class="dlt" style="margin-top:5px;color:var(--fcBlue)">${arrow(D.fcPct)} ${Math.abs(D.fcPct)}%</div>
           <div style="font-size:8px;color:#8990BE;margin-top:4px">next 12 months vs trailing 52</div></div>`);

  /* --- block: the write-up ----------------------------------------------------
     Same numbers either way — only the framing changes. Neutral reports; Selling leads
     with what it means for the buyer. Nothing here invents a figure the data doesn't
     carry.                                                                          */
  const bulletsNeutral=[
    `<b>Volume is ${D.casesPct>=0?'up':'down'} ${Math.abs(D.casesPct)}% ${M.over}.</b> ${D.scope.name} shipped ${fmt(D.cur90)} cases in the ${PERIOD}, against ${fmt(D.prev90)} in the ${M.cmpShort}.`,
    `<b>${D.accts} accounts ordered in the window</b>${D.acctsPct!=null?` (${D.acctsPct>=0?'up':'down'} ${Math.abs(D.acctsPct)}%)`:''}, carrying ${fmt(D.plN)} placements — the count of account-and-SKU pairs that moved — ${D.plcPct>=0?'up':'down'} ${Math.abs(D.plcPct)}%.`,
    `<b>Rate of sale ${D.ros>=D.rosPrev?'held at':'eased to'} ${D.ros} cases per account per month</b> against ${D.rosPrev} in the prior quarter.`,
    `<b>The trailing 52 weeks total ${fmt(D.l52)} cases</b> versus ${fmt(D.p52)} the year before${D.lapN?`; ${D.lapN} account${D.lapN===1?'':'s'} ${D.lapN===1?'has':'have'} gone quiet and ${D.lapN===1?'is':'are'} counted lapsed.`:'.'}`,
  ];
  const bulletsSelling=[
    `<b>${D.casesPct>=0?`Demand is building — ${Math.abs(D.casesPct)}% more cases moved ${M.over}.`:`Volume needs attention — down ${Math.abs(D.casesPct)}% ${M.over}.`}</b> ${fmt(D.cur90)} cases in the ${PERIOD} against ${fmt(D.prev90)} before it.`,
    `<b>${D.accts} accounts are buying${D.acctsPct!=null&&D.acctsPct>0?`, ${Math.abs(D.acctsPct)}% more than last quarter`:''}.</b> That's ${fmt(D.plN)} placements earning their space${D.plcPct>0?` — ${Math.abs(D.plcPct)}% more than the prior quarter`:''}.`,
    `<b>${D.ros>=D.rosPrev?`Every account is working harder — ${D.ros} cases a month, up from ${D.rosPrev}.`:`Rate of sale slipped to ${D.ros} cases per account per month, from ${D.rosPrev}.`}</b> ${D.ros>=D.rosPrev?'Shelf space here is paying for itself.':'Worth a look at what changed.'}`,
    `<b>${fmt(D.l52)} cases over the last 52 weeks</b> against ${fmt(D.p52)} the year before${D.lapN?` — with ${D.lapN} quiet account${D.lapN===1?'':'s'} still to win back.`:'.'}`,
  ];
  // The SAME facts as a running paragraph instead of a numbered list — the register of the
  // brand-story lead: a couple of sentences, the numbers bolded, nothing invented (Joe,
  // 2026-08-18). Voice still only reframes.
  const proseNeutral =
    `<b>${D.scope.name} shipped ${fmt(D.cur90)} cases</b> in the ${PERIOD}, ${D.casesPct>=0?'up':'down'} ${Math.abs(D.casesPct)}% against ${fmt(D.prev90)} in the ${M.cmpShort}. ${D.accts} accounts ordered in the window, carrying <b>${fmt(D.plN)} placements</b>${D.plcPct!=null?` (${D.plcPct>=0?'up':'down'} ${Math.abs(D.plcPct)}%)`:''}, at ${D.ros} cases per account per month against ${D.rosPrev} the quarter before. <b>The trailing 52 weeks total ${fmt(D.l52)} cases</b> versus ${fmt(D.p52)} the year before${D.lapN?`, with ${D.lapN} account${D.lapN===1?'':'s'} now counted lapsed`:''}.`;
  const proseSelling =
    `<b>${D.scope.name} is ${D.casesPct>=0?'building':'slipping'}</b> — ${fmt(D.cur90)} cases in the ${PERIOD}, ${Math.abs(D.casesPct)}% ${D.casesPct>=0?'more':'less'} than the ${M.cmpShort}. ${D.accts} accounts are buying and <b>${fmt(D.plN)} placements</b> are earning their space${D.ros>=D.rosPrev?`, each one turning ${D.ros} cases a month, up from ${D.rosPrev}`:`, at ${D.ros} cases a month`}. <b>${fmt(D.l52)} cases over the last 52 weeks</b> against ${fmt(D.p52)} the year before${D.lapN?` — with ${D.lapN} quiet account${D.lapN===1?'':'s'} still to win back`:''}.`;
  // `words` is the write-up mode. A template saved before it existed only had a bullet count,
  // and 0 was how you turned the column off — so that still reads as "none".
  const words = OV.words || (OV.bullets === 0 ? "none" : "bullets");
  const bullets = words !== "bullets" ? []
    : (OV.voice==="selling"?bulletsSelling:bulletsNeutral).slice(0, Math.max(1, Math.min(4, OV.bullets)));
  const prose = words === "prose" ? (OV.voice==="selling" ? proseSelling : proseNeutral) : "";
  const blkText = (!bullets.length && !prose) ? "" :
    block("text",`width:${DESIGN!=="editorial"||stacked?"100%":"31%"};display:flex;flex-direction:column;justify-content:${DESIGN==="editorial"?"center":"flex-start"}`,
      `<div class="lbl" style="margin-bottom:${stacked?6:12}px">Key insights</div>`
      + (prose
        ? `<div style="font-size:${stacked?12.5:15}px;line-height:1.42;color:#2B2B2B">${prose}</div>`
        : `<div style="${stacked?"display:flex;gap:22px":""}">
       ${bullets.map((b,i)=>`<div style="display:flex;gap:10px;margin-bottom:${stacked?4:(DESIGN==="editorial"?15:7)}px;${stacked?"flex:1":""}">
         <span class="fig" style="font-size:13px;color:var(--pink2);width:14px;flex-shrink:0">${i+1}</span>
         <span style="font-size:11.3px;line-height:1.48;color:#2B2B2B">${b}</span></div>`).join('')}
       </div>`));
  // the divider exists only to separate the write-up from the graphs, so it travels with
  // the write-up: no words, no rule
  const VRULE = (blkText && !stacked) ? '<div style="width:1px;background:var(--ruleLt)"></div>' : "";

  // The scope name is LOCKED into the headline — you can retitle the slide ("Break down")
  // but Illinois never falls out of it (Joe, 2026-08-18).
  const ovTitle = (D.scope.name + " " + (CUT ? CUT.value + " " : "") + (OV.title || "Overview")).toUpperCase();

  /* --- assembly: THREE ARRANGEMENTS OF THE SAME FIVE BLOCKS ---------------------
     Same engine, same regions, same numbers — only where they sit changes. All three carry
     every piece of information; none of them drops a graph or a stat to make room, because
     "two different ways to show it" is not the same as showing less (Joe, 2026-08-18).

       3 · editorial   stats across the top, the write-up leading a column beside the graphs
       1 · boardroom   a ruled report page: stat table, the two graphs SIDE BY SIDE, notes
                       beneath them, totals as a ruled strip across the foot
       2 · modern      the graphs take the page; the stats read down a quiet left rail with
                       the write-up under them, and the 52-week pair closes the rail        */
  const SHAPES = {
    editorial: () => `${head(ovTitle,PERIOD+" · "+D.scope.sub)}
   ${blkStats}
   <div style="flex:1;display:flex;${stacked?"flex-direction:column;gap:10px":"gap:28px"};padding-top:12px;min-height:0">
     ${textFirst?blkText+VRULE:""}
     <div style="flex:1;min-width:0;display:flex;flex-direction:column">
       ${blkGraphs}
       ${blkTotals}
     </div>
     ${!textFirst?VRULE+blkText:""}
   </div>${foot()}`,

    /* 1 · READS DOWN, NOT ACROSS. No side-by-side column at all: the stats band, then each
       graph full width, then the write-up and the 52-week pair. One vertical run — the shape
       a printed page takes when it isn't trying to be a dashboard (Joe: "vertical instead of
       horizontal"). Every number the other two carry is still here. */
    boardroom: () => `${head(ovTitle,PERIOD+" · "+D.scope.sub)}
   ${blkStats}
   <div style="flex:1;display:flex;flex-direction:column;padding-top:10px;min-height:0">
     ${blkGraphs}
     ${blkText ? `<div style="border-top:1px solid var(--ruleLt);margin-top:11px;padding-top:10px">${blkText}</div>` : ""}
     <div style="flex:1"></div>
     ${blkTotals}
   </div>${foot()}`,

    /* 2 · ONE GROWTH STEP. The quarter's move IS the slide: the case count and its change at
       full size, with everything else demoted to support it — the other three stats as a
       quiet line under it, the graphs small to its right, the write-up and the 52-week pair
       beneath. Same information, one thing said loudly instead of four things said evenly. */
    modern: () => {
      const hero = statsOn.includes("cases") ? STAT.cases : (STAT[statsOn[0]] || STAT.cases);
      const rest = statsOn.filter(id => STAT[id] !== hero);
      return `${head(ovTitle,PERIOD+" · "+D.scope.sub)}
   <div style="flex:1;display:flex;gap:30px;padding-top:14px;min-height:0">
     <div style="width:38%;display:flex;flex-direction:column">
       <div class="lbl">${hero[0]}</div>
       <div style="display:flex;align-items:baseline;gap:12px;margin-top:4px">
         <span class="fig" style="font-size:72px;letter-spacing:-1.5px;line-height:.92">${hero[1]}</span>
         ${hero[2]!=null?'<span class="dlt '+sgn(hero[2])+'" style="font-size:19px">'+arrow(hero[2])+' '+Math.abs(hero[2])+'%</span>':''}
       </div>
       <div style="font-size:10px;color:var(--grey2);margin-top:5px">${hero[3]}</div>
       ${rest.length?`<div style="display:flex;gap:20px;border-top:1px solid var(--ruleLt);margin-top:13px;padding-top:11px">
         ${rest.map(id=>{const r=STAT[id];return `<div style="min-width:0">
           <div class="lbl">${r[0]}</div>
           <div style="display:flex;align-items:baseline;gap:6px;margin-top:3px">
             <span class="fig" style="font-size:21px">${r[1]}</span>
             ${r[2]!=null?'<span class="dlt '+sgn(r[2])+'">'+arrow(r[2])+' '+Math.abs(r[2])+'%</span>':''}</div></div>`;}).join('')}
       </div>`:""}
       ${blkText ? `<div style="border-top:1px solid var(--ruleLt);margin-top:13px;padding-top:11px">${blkText}</div>` : ""}
       <div style="flex:1"></div>
       ${blkTotals}
     </div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center">
       ${blkGraphs}
     </div>
   </div>${foot()}`;
    },
  };
  return wrap((SHAPES[DESIGN] || SHAPES.editorial)());
}

/* ---------- 3/4 · items ---------- */
function sItems(seg,label,sid){
  const s=D[seg]; if(!s.rows.length) return "";
  const mxV=Math.max(...s.rows.map(r=>Math.max(r.cur,r.prev)),1);
  const top6=s.rows.slice(0,6).map(r=>({...r,ros:r.acc?+(rosBase(r)/r.acc/3).toFixed(1):0}));
  const rmx=Math.max(...top6.map(r=>r.ros),1)*1.18;
  const bm=top6[0].ros;
  const rosSvg=(()=>{const W=400,H=250,pt=26,pb=56,pl=40,pr=14,pw=W-pl-pr,ph=H-pt-pb;
    const step=pw/top6.length,bw=Math.min(step*0.62,58),y=v=>pt+ph-(v/rmx)*ph;
    let x='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:'+H+'px;display:block">';
    [0,rmx/2,rmx].forEach(t=>{x+='<line x1="'+pl+'" y1="'+y(t)+'" x2="'+(pl+pw)+'" y2="'+y(t)+'" stroke="'+(t===0?'#CFCFCF':'#F0F0F0')+'"/>'
      +'<text x="'+(pl-7)+'" y="'+(y(t)+3)+'" text-anchor="end" font-family="Arial" font-size="8" fill="#9A9A9A">'+t.toFixed(1)+'</text>';});
    x+='<text transform="translate(11,'+(pt+ph/2)+') rotate(-90)" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold" fill="#7A7A7A">CASES / ACCOUNT / MO</text>';
    x+='<line x1="'+pl+'" y1="'+y(bm)+'" x2="'+(pl+pw)+'" y2="'+y(bm)+'" stroke="#0A0A0A" stroke-width="1.2" stroke-dasharray="4 3"/>';
    x+='<text x="'+(pl+pw)+'" y="'+(y(bm)-6)+'" text-anchor="end" font-family="Arial" font-size="8" font-weight="bold" fill="#0A0A0A">'+top6[0].n+' '+bm.toFixed(1)+'</text>';
    top6.forEach((d,i)=>{const cx=pl+i*step+step/2,bh=(d.ros/rmx)*ph;
      x+='<rect x="'+(cx-bw/2)+'" y="'+y(d.ros)+'" width="'+bw+'" height="'+Math.max(1,bh)+'" rx="2" fill="'+(i===0?'var(--green)':'#BFD9C9')+'"/>';
      x+='<text x="'+cx+'" y="'+(y(d.ros)-6)+'" text-anchor="middle" font-family="Arial" font-size="10.5" font-weight="bold" fill="'+(i===0?'#2E7D52':'#6E9E85')+'">'+d.ros.toFixed(1)+'</text>';
      const p=d.n.length>11&&d.n.includes(' ')?[d.n.slice(0,d.n.indexOf(' ')),d.n.slice(d.n.indexOf(' ')+1)]:[d.n];
      p.forEach((q,li)=>x+='<text x="'+cx+'" y="'+(pt+ph+13+li*9.5)+'" text-anchor="middle" font-family="Arial" font-size="8.2" font-weight="bold" fill="#2B2B2B">'+q+'</text>');
      x+='<text x="'+cx+'" y="'+(pt+ph+13+p.length*9.5+3)+'" text-anchor="middle" font-family="Arial" font-size="7.8" fill="#A9615B">'+d.acc+' accounts</text>';});
    return x+'</svg>';})();
  const MIXC={"Hazy Ipa":"#E5A29D","Ipa":"#52A97B","Lager / Ale":"#C9A227","Seltzer":"#6D93D4"};
  const newN=s.rows.filter(r=>r.prev===0).length, newC=s.rows.filter(r=>r.prev===0).reduce((a,r)=>a+r.cur,0);
  const bullets=[
    `<b>${s.rows[0].n} leads the ${label.toLowerCase()} book.</b> ${fmt(s.rows[0].cur)} cases — ${Math.round(s.rows[0].cur/s.tot*100)}% of ${label.toLowerCase()} volume — across ${s.rows[0].acc} account${s.rows[0].acc===1?'':'s'} at ${(rosBase(s.rows[0])/(s.rows[0].acc||1)/3).toFixed(1)} cases per account per month.`,
    newN?`<b>${newN} of the top ten ${newN===1?'is':'are'} ${M.newPhrase}</b>, adding ${fmt(newC)} cases with ${M.zeroCmp}.`
        :`<b>The top ten are all established brands</b> — no new arrivals reached the leaderboard this quarter.`,
    `<b>${label} totals ${fmt(s.tot)} cases</b>, ${s.pct>=0?'up':'down'} ${Math.abs(s.pct)}% against ${fmt(s.totP)} in ${M.cmpLong}, across ${s.all} brand${s.all===1?'':'s'} with volume.`,
  ];
  /* THREE REGISTERS, SAME RANKING (Joe, 2026-08-18). The original is the TABLE — this slide
     grew out of a distributor report and reads like one, so it files under utilitarian and
     stays exactly as it was. The other two say the same thing differently:
       modern  the ranking AS BARS — each brand against its prior, nothing to scan
       bold    the finding first and at size, with the ranking demoted to evidence          */
  const IT = setOf(sid || "items");
  const DES = IT.design || "utilitarian";
  const foot2 = foot(SRC+" Brands aggregate every "+label.toLowerCase()+" format they sell in. Accounts = accounts that ordered the brand in the window.");
  const HEAD = head(label.toUpperCase()+" OVERVIEW",D.scope.name+" · "+PERIOD+" · "+s.all+" "+label.toLowerCase()+" brands with volume");

  const band = `<div style="display:flex;align-items:baseline;gap:12px;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:9px 0">
     <span class="lbl">Total ${label.toLowerCase()} cases · ${M.winShort}</span>
     <span class="fig" style="font-size:23px">${fmt(s.tot)}</span>
     <span class="dlt ${sgn(s.pct)}">${arrow(s.pct)} ${Math.abs(s.pct)}%</span>
     <span style="font-size:8.5px;color:var(--grey2)">vs ${fmt(s.totP)} ${M.cmpShort}</span></div>`;

  const table = `<div class="lbl" style="margin-bottom:7px">Top ${s.rows.length} brand${s.rows.length===1?'':'s'} by ${M.stat}</div>
       <table style="width:100%;border-collapse:collapse">
         <tr><th class="lbl" style="text-align:left;padding-bottom:5px">Brand</th><th class="lbl" style="text-align:right">${M.col}</th>
         <th class="lbl" style="text-align:right">Prior</th><th class="lbl" style="text-align:right">Chg</th>
         <th class="lbl" style="text-align:right">Accts</th><th class="lbl" style="text-align:right">Cs/ac</th></tr>
         ${s.rows.map((r,i)=>{const cp=r.prev>0?Math.round((r.cur-r.prev)/r.prev*100):null,ros=r.acc?rosBase(r)/r.acc/3:0;
           return `<tr style="border-top:1px solid ${i<3?'var(--rule)':'var(--ruleLt)'};background:${i<3?'#FAFCFA':'transparent'}">
             <td style="padding:5.5px 0;font-size:10.3px;font-weight:${i<3?700:400}">${r.n}</td>
             <td style="text-align:right;font-family:var(--disp);font-size:11.5px">${fmt(r.cur)}</td>
             <td style="text-align:right;font-size:9.5px;color:var(--grey2)">${fmt(r.prev)}</td>
             <td style="text-align:right;font-size:9.5px;font-weight:700" class="${cp==null?'':sgn(cp)}" ${cp==null?'style="color:var(--new)"':''}>${cp==null?'new':arrow(cp)+Math.abs(cp)+'%'}</td>
             <td style="text-align:right;font-size:10px;color:#A9615B;font-weight:700">${r.acc}</td>
             <td style="text-align:right;font-size:10px;color:var(--grey)">${ros.toFixed(1)}</td></tr>`;}).join('')}
       </table>`;

  // the same ranking as a picture: this window solid, the prior ghosted beneath it
  const barFit = (n) => Math.max(7, Math.min(17, Math.round((548/Math.max(1,Math.min(n,s.rows.length)) - 22)/2)));
  const bars = (n,h0,cA,cB) => { const h = h0==='fit' ? barFit(n) : h0; return `<div class="lbl" style="margin-bottom:9px">Top ${Math.min(n,s.rows.length)} brand${s.rows.length===1?'':'s'} · ${M.col} against ${M.cmpShort}</div>
       ${s.rows.slice(0,n).map((r,i)=>{const cp=r.prev>0?Math.round((r.cur-r.prev)/r.prev*100):null;
         return `<div style="margin-bottom:${h>7?9:6}px">
           <div style="display:flex;align-items:baseline;gap:7px;white-space:nowrap">
             <span style="font-size:10.4px;font-weight:${i<3?700:500};flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${r.n}</span>
             <span style="font-size:8.6px;color:#A9615B;font-weight:700">${r.acc} acct${r.acc===1?'':'s'}</span>
             <span class="fig" style="font-size:11.5px">${fmt(r.cur)}</span>
             <span style="font-size:9px;font-weight:700;width:38px;text-align:right;color:${cp==null?'var(--new)':cp>0?'var(--up)':cp<0?'var(--dn)':'var(--grey2)'}">${cp==null?'new':arrow(cp)+Math.abs(cp)+'%'}</span>
           </div>
           <div style="margin-top:3px">
             <div style="height:${h}px;background:#F1F3EF;border-radius:2px 2px 0 0;overflow:hidden"><div style="height:100%;width:${Math.max(1.5,r.cur/mxV*100)}%;background:${cA||"var(--green)"}"></div></div>
             <div style="height:${h}px;background:#F7F8F5;border-radius:0 0 2px 2px;overflow:hidden;margin-top:1px"><div style="height:100%;width:${Math.max(1.5,r.prev/mxV*100)}%;background:${cB||"var(--lite)"}"></div></div>
           </div></div>`;}).join('')}`; };

  const words = (size) => `<div class="lbl" style="margin-bottom:8px">Key insights</div>
         ${bullets.map((b,i)=>`<div style="display:flex;gap:9px;margin-bottom:9px">
           <span class="fig" style="font-size:11px;color:var(--pink2);width:12px;flex-shrink:0">${i+1}</span>
           <span style="font-size:${size}px;line-height:1.46;color:#2B2B2B">${b}</span></div>`).join('')}`;

  const rosBlock = `<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px">
         <span class="lbl">Rate of sale · top ${top6.length}${M.dflt?'':' · last 90 days'}</span>
         <span style="font-size:8px;color:var(--grey2)">dotted line = ${top6[0].n}</span></div>
       ${rosSvg}`;

  const SHAPES = {
    // THE ORIGINAL, untouched — ranked table, notes beneath, rate of sale beside.
    utilitarian: () => `${HEAD}
   ${band}
   <div style="flex:1;display:flex;gap:26px;padding-top:13px;min-height:0">
     <div style="width:50%;display:flex;flex-direction:column;min-width:0">
       ${table}
       <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:12px 0 4px">${words(10.2)}</div>
     </div>
     <div style="width:1px;background:var(--ruleLt)"></div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column">${rosBlock}</div>
   </div>${foot2}`,

    // MODERN — no table at all. The ranking IS the picture; rate of sale and the notes support it.
    modern: () => `${HEAD}
   ${band}
   <div style="flex:1;display:flex;gap:26px;padding-top:14px;min-height:0">
     <div style="width:54%;min-width:0">${bars(9,"fit","#B5817A","#E8D2CF")}</div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column">
       ${rosBlock}
       <div style="border-top:1px solid var(--ruleLt);margin-top:10px;padding-top:10px">${words(9.8)}</div>
     </div>
   </div>${foot2}`,

    // BOLD — the finding first and at size, the ranking demoted to the evidence for it.
    bold: () => `${HEAD}
   ${band}
   <div style="flex:1;display:flex;gap:26px;padding-top:14px;min-height:0">
     <div style="width:44%;display:flex;flex-direction:column;min-width:0">
       <div class="lbl">Leading the ${label.toLowerCase()} book</div>
       <div class="fig" style="font-size:32px;line-height:1.04;margin-top:5px">${s.rows[0].n}</div>
       <div style="display:flex;align-items:baseline;gap:9px;margin-top:8px">
         <span class="fig" style="font-size:29px">${fmt(s.rows[0].cur)}</span>
         <span style="font-size:11px;color:var(--grey)">cases · ${Math.round(s.rows[0].cur/s.tot*100)}% of ${label.toLowerCase()}</span>
       </div>
       <div style="height:3px;width:96px;background:var(--pink);margin:13px 0 12px"></div>
       <div style="font-size:11.4px;line-height:1.5;color:#2B2B2B">${bullets[0]}</div>
       <div style="flex:1"></div>
       <div style="border-top:1px solid var(--ruleLt);padding-top:10px;font-size:10px;line-height:1.45;color:#2B2B2B">${bullets[2]}</div>
     </div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column">${bars(8,"fit","#6B7683","#D3D8DD")}</div>
   </div>${foot2}`,
  };
  return wrap((SHAPES[DES] || SHAPES.utilitarian)());
}

/* ---------- 5 · universe ---------- */
function sUniverse(sid){
  const mxW=Math.max(...D.buckets.map(b=>b.wt),1);
  // a chain sells into one kind of account, so channel adds nothing — show demographics alone.
  // every other scope (state, city, distributor) gets channel first, demographics beneath it.
  const isChain = D.scope.kind==="chain";
  const incomeOK = D.income.filter(i=>i.act>0).length>=2;
  const chartFor=(dim,dimLabel,H)=>{const W=430,pt=26,pb=46,pl=34,pr=14,pw=W-pl-pr,ph=H-pt-pb;
    const rmx=Math.max(...dim.map(d=>d.ros),1)*1.28;
    const step=pw/dim.length,bw=Math.min(step*0.46,42),y=v=>pt+ph-(v/rmx)*ph;
    let x='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:'+H+'px;display:block">';
    [0,rmx/2,rmx].forEach(t=>{x+='<line x1="'+pl+'" y1="'+y(t)+'" x2="'+(pl+pw)+'" y2="'+y(t)+'" stroke="'+(t===0?'#CFCFCF':'#F1F1F1')+'"/>'
      +'<text x="'+(pl-6)+'" y="'+(y(t)+3)+'" text-anchor="end" font-family="Arial" font-size="7.5" fill="#9A9A9A">'+t.toFixed(0)+'</text>';});
    x+='<text transform="translate(9,'+(pt+ph/2)+') rotate(-90)" text-anchor="middle" font-family="Arial" font-size="7.2" font-weight="bold" fill="#7A7A7A">CASES / ACCOUNT / MO</text>';
    const bm=dim[0].ros;
    x+='<line x1="'+pl+'" y1="'+y(bm)+'" x2="'+(pl+pw)+'" y2="'+y(bm)+'" stroke="#0A0A0A" stroke-width="1.1" stroke-dasharray="4 3"/>';
    x+='<text x="'+(pl+pw)+'" y="'+(y(bm)-5)+'" text-anchor="end" font-family="Arial" font-size="7.8" font-weight="bold" fill="#0A0A0A">'+dim[0].k+' '+bm.toFixed(1)+'</text>';
    dim.forEach((d,i)=>{const cx=pl+i*step+step/2,bh=(d.ros/rmx)*ph;
      x+='<rect x="'+(cx-bw/2)+'" y="'+y(d.ros)+'" width="'+bw+'" height="'+Math.max(1,bh)+'" rx="2" fill="'+(i===0?'var(--teal)':'var(--tealLt)')+'"/>';
      x+='<text x="'+cx+'" y="'+(y(d.ros)-6)+'" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold" fill="'+(i===0?'#2F7D8C':'#5E97A3')+'">'+d.ros.toFixed(1)+'</text>';
      x+='<text x="'+cx+'" y="'+(pt+ph+14)+'" text-anchor="middle" font-family="Arial" font-size="8.6" font-weight="bold" fill="#2B2B2B">'+d.k+'</text>';
      x+='<text x="'+cx+'" y="'+(pt+ph+25)+'" text-anchor="middle" font-family="Arial" font-size="7.6" fill="var(--grey2)">'+fmt(d.cases)+' cases</text>';
      const bh2=bh, cy=bh2>44?y(d.ros)+Math.min(bh2-16,34):y(d.ros)-26;
      x+='<circle cx="'+cx+'" cy="'+cy+'" r="12" fill="var(--pink2)" stroke="#fff" stroke-width="1.6"/>';
      x+='<text x="'+cx+'" y="'+(cy+3.6)+'" text-anchor="middle" font-family="Arial" font-size="9.5" font-weight="bold" fill="#fff">'+d.act+'</text>';});
    x+='<text x="'+pl+'" y="'+(pt-10)+'" font-family="Arial" font-size="7.2" font-weight="bold" fill="var(--pink2)">● = ACTIVE ACCOUNTS</text>';
    return x+'</svg>';};
  const incomeDim=D.income.filter(i=>i.act>0), typeDim=D.types.filter(t=>t.act>0);
  // one channel in scope says nothing — drop that chart entirely (Joe, 2026-08-16)
  const oneChan = typeDim.length < 2;
  const panels = (isChain || oneChan)
    ? (incomeOK ? [["Rate of sale by area demographic", chartFor(incomeDim,"income band",260)]] : [])
    : [["Rate of sale by channel", chartFor(typeDim,"channel",188)]]
      .concat(incomeOK ? [["Rate of sale by area demographic", chartFor(incomeDim,"income band",188)]] : []);
  const surg=D.buckets.find(b=>b.k==="Surging"), lap=D.buckets.find(b=>b.k==="Lapsed");
  const bl=[
    `<b>${D.accts} of ${D.withHist} accounts ordered in the last 90 days</b>${D.acctsPct!=null?`, ${D.acctsPct>=0?'up':'down'} ${Math.abs(D.acctsPct)}% on the prior quarter`:''}.`,
    surg?`<b>${surg.n} surging account${surg.n===1?'':'s'} hold ${Math.round(surg.l52/D.totL52*100)}% of the annual volume</b> at ${surg.ros} cases per account per month.`:'',
    lap?`<b>${lap.n} account${lap.n===1?'':'s'} ${lap.n===1?'has':'have'} gone quiet</b>, together worth ${Math.round(lap.l52/D.totL52*100)}% of the year.`:'',
  ].filter(Boolean);
  /* THREE REGISTERS (Joe, 2026-08-18). The original is the report page and keeps its place as
     utilitarian, demographics and all. The other two drop the rate-of-sale panels — Joe's call:
     on this slide the health of the book is the point, not the demographic cut.
       modern  THE RIBBON — the same flow the Acct Health board draws, ported to the page
       bold    the one sentence that matters, at size, over the buckets that prove it       */
  const UV = setOf(sid || "universe");
  const UDES = UV.design || "utilitarian";

  /* THE RIBBON. Three health bands on the left carrying into their buckets on the right, each
     sized by share of 52-week volume — the picture the board already shows, so a deck and the
     screen tell the same story. Bands are laid out FROM their buckets (first kid's top to last
     kid's bottom) rather than independently, which is what keeps the ribbons from crossing. */
  const BAND_OF = { Surging: "Healthy", Stable: "Healthy", New: "Healthy", "At risk": "Watch", Softening: "Watch", Lapsed: "Lapsed" };
  const BAND_C  = { Healthy: "#2E7D52", Watch: "#C8912A", Lapsed: "#B5817A" };
  const ribbonSvg = (H) => {
    const W = 852, PT = 20, PB = 12, GAP = 9, XA = 690, BARW = 26, XB = 244, TAB = 7;
    const ph = H - PT - PB;
    const kids = D.buckets.filter(b => b.n > 0);
    if (!kids.length) return "";
    const tot = kids.reduce((a, b) => a + b.wt, 0) || 1;
    const order = ["Healthy", "Watch", "Lapsed"];
    const grouped = order.map(k => ({ k, kids: kids.filter(b => BAND_OF[b.k] === k) })).filter(g => g.kids.length);
    const room = ph - GAP * (kids.length - 1) - GAP * (grouped.length - 1);
    let y = PT; const laid = [];
    for (const g of grouped) {
      const box = { ...g, y0: y, kids: [] };
      for (const b of g.kids) { const h = Math.max(13, (b.wt / tot) * room); box.kids.push({ ...b, y0: y, y1: y + h }); y += h + GAP; }
      box.y1 = y - GAP; box.wt = g.kids.reduce((a, c) => a + c.wt, 0);
      laid.push(box); y += GAP;
    }
    // a min height on a tiny bucket can still overrun the plot; squeeze the whole stack if so
    const over = (laid.length ? laid[laid.length - 1].y1 : PT) - (PT + ph);
    if (over > 0) { const k = ph / (ph + over);
      for (const g of laid) { g.y0 = PT + (g.y0 - PT) * k; g.y1 = PT + (g.y1 - PT) * k;
        for (const b of g.kids) { b.y0 = PT + (b.y0 - PT) * k; b.y1 = PT + (b.y1 - PT) * k; } } }
    // a0/b0 are the BAND's slice on the right, a1/b1 the bucket's tab on the left
    const rib = (a0, b0, a1, b1, col) => { const m = (XB + TAB + XA) / 2;
      return `<path d="M ${XB + TAB} ${a1} C ${m} ${a1} ${m} ${a0} ${XA} ${a0} L ${XA} ${b0} C ${m} ${b0} ${m} ${b1} ${XB + TAB} ${b1} Z" fill="${col}" opacity=".26"/>`; };
    let x = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block">`;
    for (const g of laid) {
      const col = BAND_C[g.k], bh = g.y1 - g.y0;
      // the band's own height splits between its buckets in proportion, so no ribbon crosses
      let sy = g.y0;
      for (const b of g.kids) {
        const share = bh * (b.wt / (g.wt || 1));
        x += rib(sy, sy + share, b.y0, b.y1, col);
        sy += share;
      }
      x += `<rect x="${XA}" y="${g.y0}" width="${BARW}" height="${bh}" fill="${col}"/>`;
      x += `<text x="${XA + BARW / 2}" y="${(g.y0 + g.y1) / 2 + 4}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#fff">${Math.round(g.wt / tot * 100)}%</text>`;
      x += `<text x="${XA + BARW + 11}" y="${(g.y0 + g.y1) / 2 - 2}" font-family="Arial" font-size="10.5" font-weight="bold" fill="#1b201a" letter-spacing="0.6">${g.k.toUpperCase()}</text>`;
      x += `<text x="${XA + BARW + 11}" y="${(g.y0 + g.y1) / 2 + 10}" font-family="Arial" font-size="8" fill="#8f957f">${fmt(g.kids.reduce((a, c) => a + c.l52, 0))} cs/yr · ${g.kids.reduce((a, c) => a + c.n, 0)} accts</text>`;
      for (const b of g.kids) {
        x += `<rect x="${XB}" y="${b.y0}" width="${TAB}" height="${b.y1 - b.y0}" fill="${b.c}"/>`;
        const my = (b.y0 + b.y1) / 2;
        x += `<text x="${XB - 11}" y="${my - 1}" text-anchor="end" font-family="Arial" font-size="11.5" font-weight="bold" fill="#1b201a">${b.k}</text>`;
        x += `<text x="${XB - 11}" y="${my + 11}" text-anchor="end" font-family="Arial" font-size="8.2" fill="#8f957f">${b.n} account${b.n === 1 ? "" : "s"} · ${fmt(b.l52)} cs/yr${b.ros ? " · " + b.ros + " cs/acct/mo" : " · no orders in 90 days"}</text>`;
      }
    }
    x += `<text x="${W - 4}" y="${PT - 7}" text-anchor="end" font-family="Arial" font-size="7.6" fill="#c3c8ba">Weighted by 52-week volume</text>`;
    return x + "</svg>";
  };

  const uBand = `<div style="display:flex;align-items:baseline;gap:12px;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:9px 0">
     <span class="lbl">Active accounts · 90 days</span><span class="fig" style="font-size:23px">${D.accts}</span>
     ${D.acctsPct!=null?'<span class="dlt '+sgn(D.acctsPct)+'">'+arrow(D.acctsPct)+' '+Math.abs(D.acctsPct)+'%</span>':''}
     <span style="font-size:8.5px;color:var(--grey2)">of ${D.withHist} with history · ${fmt(D.totL52)} cases over 52 weeks · ${D.ros} cases per account per month</span></div>`;
  const uHead = head("ACCOUNT UNIVERSE",D.scope.name+" · "+PERIOD+" · "+D.withHist+" accounts with history");
  const uWords = (size,gapB) => bl.map((b,i)=>`<div style="display:flex;gap:9px;margin-bottom:${gapB}px">
           <span class="fig" style="font-size:11px;color:var(--pink2);width:12px;flex-shrink:0">${i+1}</span>
           <span style="font-size:${size}px;line-height:1.45;color:#2B2B2B">${b}</span></div>`).join('');
  const healthy = D.buckets.filter(b=>BAND_OF[b.k]==="Healthy").reduce((a,c)=>a+c.l52,0);

  const USHAPES = {
    // THE ORIGINAL — bucket bars on the left, rate of sale by channel and demographic on the right.
    utilitarian: () => `${uHead}
   ${uBand}
   <div style="flex:1;display:flex;gap:26px;padding-top:12px;min-height:0">
     <div style="width:45%;display:flex;flex-direction:column;min-width:0">
       <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px">
         <span class="lbl">Where the accounts sit</span><span style="font-size:7.8px;color:var(--grey2)">bar = share of 52-week volume</span></div>
       <div style="flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0">
         ${D.buckets.map(b=>`<div style="margin-bottom:14px">
           <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px">
             <span style="width:9px;height:9px;border-radius:2px;background:${b.c};flex-shrink:0"></span>
             <span style="font-size:11.5px;font-weight:700;flex:1">${b.k}</span>
             <span class="fig" style="font-size:17px">${b.n}</span>
             <span style="font-size:8px;color:var(--grey2)">accounts</span></div>
           <div style="height:13px;background:#F2F2F2;border-radius:2px;overflow:hidden">
             <div style="width:${(b.wt/mxW*100).toFixed(1)}%;height:100%;background:${b.c}"></div></div>
           <div style="font-size:8.4px;color:var(--grey);margin-top:4px">
             <b style="color:#2B2B2B">${fmt(b.l52)} cases</b> over 52 weeks · ${(b.l52/D.totL52*100).toFixed(1)}% of volume${b.ros?' · '+b.ros+' cs/acct/mo':' · no orders in 90 days'}
             ${b.lift?'<br><span style="color:var(--new)">bar shown at 3× — only one quarter of history</span>':''}</div></div>`).join('')}
       </div>
     </div>
     <div style="width:1px;background:var(--ruleLt)"></div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column">
       <div style="padding-bottom:10px">${uWords(10.2,7)}</div>
       <div style="flex:1;min-height:0;border-top:1px solid var(--rule);padding-top:10px;display:flex;flex-direction:column;justify-content:space-evenly">
         ${panels.map(([t,svg],i)=>`<div${i?' style="padding-top:10px;border-top:1px solid var(--ruleLt)"':''}>
           <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px">
             <span class="lbl">${t}</span><span style="font-size:7.8px;color:var(--grey2)">ordered by volume</span></div>
           ${svg}</div>`).join('')}</div>
     </div>
   </div>
   ${foot()}`,

    // MODERN — the board's own flow, full width. Where the volume sits and where it's going.
    modern: () => `${uHead}
   ${uBand}
   <div style="flex:1;display:flex;flex-direction:column;padding-top:8px;min-height:0">
     <div class="lbl" style="margin-bottom:2px">How the book divides · every account with history</div>
     ${ribbonSvg(432)}
     <div style="flex:1"></div>
     <div style="border-top:1px solid var(--rule);padding-top:10px;display:flex;gap:26px">
       ${bl.map((b,i)=>`<div style="flex:1;display:flex;gap:8px">
         <span class="fig" style="font-size:11px;color:var(--pink2);width:12px;flex-shrink:0">${i+1}</span>
         <span style="font-size:9.6px;line-height:1.44;color:#2B2B2B">${b}</span></div>`).join('')}
     </div>
   </div>
   ${foot()}`,

    // BOLD — one sentence at size, and the buckets that prove it underneath.
    bold: () => `${uHead}
   ${uBand}
   <div style="flex:1;display:flex;gap:30px;padding-top:16px;min-height:0">
     <div style="width:34%;display:flex;flex-direction:column;min-width:0">
       <div class="lbl">Healthy and new accounts hold</div>
       <div class="fig" style="font-size:88px;letter-spacing:-2px;line-height:.92;margin-top:2px">${Math.round(healthy/D.totL52*100)}%</div>
       <div style="font-size:13px;color:var(--grey);margin-top:8px">of the trailing 52 weeks</div>
       <div style="height:3px;width:104px;background:var(--pink);margin:16px 0 14px"></div>
       <div style="font-size:11.4px;line-height:1.5;color:#2B2B2B">${bl[0]}</div>
       <div style="flex:1"></div>
       ${bl[2]?`<div style="border-top:1px solid var(--ruleLt);padding-top:10px;font-size:10.2px;line-height:1.45;color:#2B2B2B">${bl[2]}</div>`:""}
     </div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center">
       <div class="lbl" style="margin-bottom:12px">Every account, by health</div>
       ${D.buckets.map(b=>`<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
         <span style="width:74px;flex-shrink:0;font-size:12.5px;font-weight:700">${b.k}</span>
         <span style="flex:1;min-width:0;height:24px;background:#F2F2F2;border-radius:3px;overflow:hidden">
           <span style="display:block;width:${(b.wt/mxW*100).toFixed(1)}%;height:100%;background:${b.c}"></span></span>
         <span class="fig" style="font-size:20px;width:40px;text-align:right">${b.n}</span>
         <span style="font-size:9px;color:var(--grey2);width:104px">${fmt(b.l52)} cs/yr · ${(b.l52/D.totL52*100).toFixed(1)}%</span></div>`).join('')}
     </div>
   </div>
   ${foot()}`,
  };
  return wrap((USHAPES[UDES] || USHAPES.utilitarian)());
}

/* ---------- 5b · volume by month, stacked ------------------------------------------------
   Recreated from a stacked-column chart Joe sent (2026-08-19). The SHAPE is the point, not the
   source's specifics: months across, one column per month, the column split into bands, the
   number printed inside each band. What it splits BY, how many months, how many bands, and
   whether the columns stack / sit side by side / normalise to 100% are all settings — so one
   builder covers the whole family and nobody has to describe a slide to a model. Deterministic
   from data and settings, start to finish.                                                  */
function sStacked(sid){
  const ST = setOf(sid || "stack");
  const dim  = ["package","style","brand"].indexOf(ST.split) >= 0 ? ST.split : "package";
  const span = +ST.span || 12, cap = +ST.bands || 4;
  const mode = ST.mode === "share" ? "share" : "stack";
  const showN = ST.labels !== "off";
  const S2 = stackSeries(D, dim, cap, span);
  if (!S2 || !S2.bands.length) return "";
  const dimName = (CUT_DIMS.find(c => c[0] === dim) || ["","Split"])[1];

  const R = rampOf(ST.chart || "teal");
  const colAt = (i,n) => n <= 1 ? R[2] : mix(R[2], R[0], i/(n-1));
  const cols = S2.bands.map((_,i) => colAt(i, S2.bands.length));

  /* The plot takes its aspect from where the words sit. Beside a text column the graph gets
     roughly two thirds of the width, so a 880x474 viewBox would render two thirds as TALL as
     well and float in a sea of white — a narrower box fills the same height. */
  const beside = ST.sayAt==="left" || ST.sayAt==="right";
  const W = beside ? 560 : 880, H = 474, PL=54, PR=10, PT=18, PB=46;
  const pw=W-PL-PR, ph=H-PT-PB;
  const nice = v => { const p=Math.pow(10,Math.floor(Math.log10(v))), r=v/p;
    const m = r<=1?1:r<=1.2?1.2:r<=1.5?1.5:r<=2?2:r<=2.5?2.5:r<=3?3:r<=4?4:r<=5?5:r<=6?6:r<=8?8:10;
    return m*p; };
  const top = mode==="share" ? 100 : nice(S2.max);
  const y = v => PT + ph - (v/top)*ph;
  const step = pw/S2.months.length;
  const bw = Math.min(step*0.62, 58);

  let g=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">`;
  for (let i=0;i<=4;i++){ const v=top*i/4, yy=y(v);
    g+=`<line x1="${PL}" y1="${yy.toFixed(1)}" x2="${W-PR}" y2="${yy.toFixed(1)}" stroke="${i?'#EDEFEA':'#D8DBD4'}"/>`;
    g+=`<text x="${PL-8}" y="${(yy+3).toFixed(1)}" text-anchor="end" font-family="Arial" font-size="8.4" fill="#9A9A9A">${mode==="share"?Math.round(v)+"%":fmt(v)}</text>`; }

  S2.months.forEach((mo,i)=>{
    const cx = PL + i*step + step/2, colTot = S2.totals[i] || 0;
    const vals = S2.bands.map(b => mode==="share" ? (colTot ? b.v[i]/colTot*100 : 0) : b.v[i]);
    {
      let acc=0;
      vals.forEach((v,bi)=>{ const h=(v/top)*ph; if(h<=0) return;
        const yy = PT+ph-acc-h;
        g+=`<rect x="${(cx-bw/2).toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${cols[bi]}"/>`;
        // the number only goes inside when the band is actually tall enough to hold it
        if (showN && h>=13) g+=`<text x="${cx.toFixed(1)}" y="${(yy+h/2+3.2).toFixed(1)}" text-anchor="middle" font-family="Arial" font-size="8.6" font-weight="bold" fill="${bi<Math.ceil(S2.bands.length/2)?'#fff':'#2B2B2B'}">${mode==="share"?Math.round(v)+"%":fmt(v)}</text>`;
        acc+=h; });
      if (showN && mode!=="share" && colTot>0)
        g+=`<text x="${cx.toFixed(1)}" y="${(PT+ph-acc-6).toFixed(1)}" text-anchor="middle" font-family="Arial" font-size="8.8" font-weight="bold" fill="#6E7468">${fmt(colTot)}</text>`;
    }
    g+=`<text x="${cx.toFixed(1)}" y="${(PT+ph+15)}" text-anchor="middle" font-family="Arial" font-size="9.4" font-weight="bold" fill="#2B2B2B">${mo}</text>`;
  });
  g+=`<line x1="${PL}" y1="${(PT+ph).toFixed(1)}" x2="${W-PR}" y2="${(PT+ph).toFixed(1)}" stroke="#B9BEB2"/></svg>`;

  const legend = `<div style="display:flex;justify-content:center;flex-wrap:wrap;gap:16px;margin-top:9px">
    ${S2.bands.map((b,i)=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:9px;color:#2B2B2B">
      <span style="width:9px;height:9px;border-radius:2px;background:${cols[i]}"></span>${b.k}
      <span style="color:var(--grey2)">${fmt(b.tot)}</span></span>`).join("")}</div>`;

  const grand = S2.bands.reduce((t,b)=>t+b.tot,0);
  const band = `<div style="display:flex;align-items:baseline;gap:14px;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:9px 0">
     <span class="lbl">Cases by month · split by ${dimName.toLowerCase()}</span>
     <span class="fig" style="font-size:19px">${fmt(grand)}</span>
     <span style="font-size:8.6px;color:var(--grey2)">cases across the last ${S2.span} months · ${S2.bands.length} band${S2.bands.length===1?"":"s"}${mode==="share"?" · shown as share of each month":""}</span></div>`;

  /* Both voices are written here, from the same numbers — the setting picks one. Selling
     leans on what it means; informative states what it is. */
  const b0 = S2.bands[0], last = S2.totals[S2.totals.length-1], first = S2.totals[0];
  const mvPct = first > 0 ? Math.round((last-first)/first*100) : null;
  const share = grand > 0 ? Math.round(b0.tot/grand*100) : 0;
  const lines = [
    { info: `<b>${b0.k}</b> is the largest ${dimName.toLowerCase()} at <b>${fmt(b0.tot)} cases</b> — ${share}% of the ${fmt(grand)} moved over ${S2.span} months.`,
      sell: `<b>${b0.k}</b> is carrying this book — <b>${share}% of everything</b> that moved in ${S2.span} months. That is where the shelf is already working for you.` },
    mvPct==null ? null : { info: `The most recent month ran <b>${fmt(last)} cases</b> against <b>${fmt(first)}</b> ${S2.span} months earlier, ${mvPct>=0?"up":"down"} <b>${Math.abs(mvPct)}%</b>.`,
      sell: mvPct>=0 ? `The line is <b>rising</b> — ${fmt(last)} cases last month against ${fmt(first)} at the start, <b>up ${Math.abs(mvPct)}%</b>. The momentum is real, not a single big order.`
                     : `Volume has slipped to <b>${fmt(last)} cases</b> from ${fmt(first)}, <b>down ${Math.abs(mvPct)}%</b>. Worth deciding where the next push goes before it settles.` },
    { info: `${S2.bands.length} band${S2.bands.length===1?"":"s"} shown${S2.bands.some(b=>b.other)?", with the remainder grouped as Other":""}; every case in the scope is in a column.`,
      sell: `The top ${S2.bands.filter(b=>!b.other).length} account${S2.bands.filter(b=>!b.other).length===1?"s":""} for <b>${Math.round(S2.bands.filter(b=>!b.other).reduce((t,b)=>t+b.tot,0)/grand*100)}%</b> of the volume — a short list to work, not a long one.` },
  ].filter(Boolean);

  return wrap(`${head("VOLUME BY MONTH", D.scope.name+" · trailing "+S2.span+" months · "+D.scope.sub)}
   ${band}
   ${sayLayout(ST, g+legend, sayBlock(ST, lines, "var(--teal)"))}
   ${foot(SRC+" Monthly cases come from each product's own order line, summed into its "+dimName.toLowerCase()+" — no volume is apportioned. Bands beyond the chosen count roll into Other so the columns still total the book.")}`);
}

/* ---------- 5c · then vs now, as two circles -----------------------------------------------
   Recreated from a proportional-bubble chart Joe sent (2026-08-19): a small circle, a large
   one, connector lines between them, the figure inside each, and the change called out beside
   the big one. Faithful to the reference — no extra chart forms bolted on.

   THE ONE THING THAT MATTERS HERE: circles are sized by AREA, not by radius. Radius-scaling a
   2x number draws a circle four times the size and overstates every comparison on the slide.
   r = k*sqrt(v) is the whole reason this is honest.                                        */
function sBubble(sid){
  const BT = setOf(sid || "bubble");
  const MEASURES = {
    accounts:   { lab: "Accounts",    now: D.accts,  was: D.acctsP, note: "ordering in the window" },
    placements: { lab: "Placements",  now: D.plN,    was: D.plP,    note: "account-and-SKU pairs on shelf" },
    cases:      { lab: "Cases",       now: D.cur90,  was: D.prev90, note: "cases in the window" },
    ros:        { lab: "Cases / acct / mo", now: D.ros, was: D.rosPrev, note: "rate of sale" },
  };
  const key = MEASURES[BT.measure] ? BT.measure : "accounts";
  const M2 = MEASURES[key];
  const now = +M2.now || 0, was = +M2.was || 0;
  if (!now && !was) return "";
  const pct = was > 0 ? Math.round((now - was) / was * 100) : null;
  const up = pct == null ? true : pct >= 0;
  const dec = key === "ros";
  const num = v => dec ? (Math.round(v * 10) / 10).toLocaleString() : fmt(v);

  const R = rampOf(BT.chart || "teal");
  const FILL = R[2], FILL2 = mix(R[2], R[0], 0.55);

  // area-true radii, with the larger circle pinned to the space available
  /* Text below the circles leaves far less height than text beside them, so the plot is sized
     to the layout rather than a fixed box — at 430 tall the third bullet ran into the footer. */
  const beside = BT.sayAt==="left" || BT.sayAt==="right";
  const hasText = (BT.say||"b3") !== "none";
  const W = beside ? 620 : 880, H = beside ? 470 : (hasText ? 330 : 460);
  const big = Math.max(now, was), small = Math.min(now, was);

  /* SOLVED TO FILL, NOT GUESSED (Joe, 2026-08-19: the graph "gets cut off if you do certain
     text orientations ... always try to resize so it fills a lot of the space"). A fixed radius
     broke whenever the two figures were CLOSE — at 8 vs 8.6 the small circle is 93% of the big
     one, the pair needs nearly four radii of width, and it ran off the left edge. So the radius
     is solved from the space instead: the largest r that fits both the width and the height. */
  const ratio = big > 0 ? Math.sqrt(small / big) : 0.3;
  const GAPC = 30, DELTA_W = pct != null ? 104 : 12, PADX = 12;
  const availW = W - PADX*2 - DELTA_W, availH = H - 52;
  const rBig = Math.max(30, Math.min((availW - GAPC) / (2 * (1 + ratio)), availH / 2));
  const rSml = Math.max(14, rBig * ratio);
  const nowIsBig = now >= was;
  const pairW = 2*rSml + GAPC + 2*rBig;
  const x0 = PADX + Math.max(0, (availW - pairW) / 2);
  const cxS = x0 + rSml, cxB = x0 + 2*rSml + GAPC + rBig;
  const cyB = H/2 - 6, cyS = cyB + (rBig - rSml) * 0.5;

  const circle = (cx, cy, r, val, lab, fill) => `
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}"/>
    <text x="${cx.toFixed(1)}" y="${(cy + r * 0.06).toFixed(1)}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${Math.max(15, r * 0.52).toFixed(0)}" fill="#fff">${val}</text>
    <text x="${cx.toFixed(1)}" y="${(cy + r * 0.42).toFixed(1)}" text-anchor="middle" font-family="Arial" font-size="${Math.max(8.5, r * 0.13).toFixed(1)}" fill="#fff" opacity=".92">${lab}</text>`;

  let g = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">`;
  // the two connectors that make it read as one thing growing, not two separate circles
  g += `<line x1="${(cxS + rSml * 0.72).toFixed(1)}" y1="${(cyS - rSml * 0.7).toFixed(1)}" x2="${(cxB - rBig * 0.72).toFixed(1)}" y2="${(cyB - rBig * 0.7).toFixed(1)}" stroke="${FILL}" stroke-width="1" opacity=".55"/>`;
  g += `<line x1="${(cxS + rSml * 0.72).toFixed(1)}" y1="${(cyS + rSml * 0.7).toFixed(1)}" x2="${(cxB - rBig * 0.72).toFixed(1)}" y2="${(cyB + rBig * 0.7).toFixed(1)}" stroke="#8b9186" stroke-width="1" opacity=".55"/>`;
  g += circle(cxS, cyS, rSml, num(nowIsBig ? was : now), M2.lab, FILL2);
  g += circle(cxB, cyB, rBig, num(nowIsBig ? now : was), M2.lab, FILL);
  if (pct != null) {
    const dx = cxB + rBig + 22, dy = cyB - rBig * 0.62;
    g += `<text x="${dx}" y="${dy}" font-family="Arial" font-weight="bold" font-size="30" fill="${up ? "#2E7D52" : "#B5534A"}">${up ? "+" : "−"}${Math.abs(pct)}%</text>`;
    g += `<text x="${dx}" y="${dy + 20}" font-family="Arial" font-size="11.5" fill="#6E7468">vs ${M.cmpShort}</text>`;
  }
  g += `<text x="${cxS.toFixed(1)}" y="${(cyS + rSml + 20).toFixed(1)}" text-anchor="middle" font-family="Arial" font-size="9.6" fill="#9A9A9A">${M.cmpShort}</text>`;
  g += `<text x="${cxB.toFixed(1)}" y="${(cyB + rBig + 22).toFixed(1)}" text-anchor="middle" font-family="Arial" font-size="10.4" font-weight="bold" fill="#6E7468">${M.winShort}</text>`;
  g += `</svg>`;

  const lines = [
    { info: `<b>${M2.lab}</b> ran <b>${num(now)}</b> in ${M.winNoun}, against <b>${num(was)}</b> ${M.cmpNoun}${pct != null ? ` — ${up ? "up" : "down"} <b>${Math.abs(pct)}%</b>` : ""}.`,
      sell: pct == null ? `<b>${num(now)} ${M2.lab.toLowerCase()}</b> in ${M.winNoun}.`
        : up ? `${M2.lab} went from <b>${num(was)}</b> to <b>${num(now)}</b> — <b>up ${Math.abs(pct)}%</b> in one window. That is the shape of the trend, not a rounding difference.`
             : `${M2.lab} slipped from <b>${num(was)}</b> to <b>${num(now)}</b>, <b>down ${Math.abs(pct)}%</b>. Worth naming before it compounds.` },
    { info: `The circles are sized by area, so the smaller one is a true ${big > 0 ? Math.round(small / big * 100) : 0}% of the larger.`,
      sell: `The gap you can see is the gap in the book — the circles are area-true, so nothing here is drawn bigger than it is.` },
    { info: `Measured across ${D.scope.name} · ${M2.note}.`,
      sell: `Across ${D.scope.name}, every account in scope — ${M2.note}.` },
  ];

  return wrap(`${head("THEN AND NOW", D.scope.name+" · "+M.winShort+" against "+M.cmpShort+" · "+D.scope.sub)}
   <div style="display:flex;align-items:baseline;gap:14px;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:9px 0">
     <span class="lbl">${M2.lab} · ${M.winShort} against ${M.cmpShort}</span>
     <span class="fig" style="font-size:19px">${num(now)}</span>
     <span style="font-size:8.6px;color:var(--grey2)">from ${num(was)}${pct!=null?` · ${up?"up":"down"} ${Math.abs(pct)}%`:""} · ${M2.note}</span></div>
   ${sayLayout(BT, g, sayBlock(BT, lines, "var(--teal)"))}
   ${foot(SRC+" Circles are scaled by AREA, not radius, so a figure twice the size draws a circle twice the area — the visual comparison matches the arithmetic.")}`);
}

/* ---------- 6 · movers ---------- */
function sMovers(sid){
  if(!D.upList.length && !D.dnList.length) return "";
  const HC={surging:["#2E7D52","#E4F1E9"],stable:["#5C7A68","#EFF2F0"],new:["#4F8F52","#E6F2E1"],
            "at risk":["#9C7420","#F5EBD5"],softening:["#9C7420","#F5EBD5"],lapsed:["#8B3A2B","#F1DDD8"]};
  const tag=h=>'<span class="tag" style="color:'+(HC[h]||HC.stable)[0]+';background:'+(HC[h]||HC.stable)[1]+'">'+h+'</span>';
  const sMax=A=>Math.max(...A.map(r=>Math.max(r.cur,r.prev)),1)*1.02;
  const rows=(A,neg)=>{const S=sMax(A);
    return A.map(r=>{const x1=(r.prev/S)*100,x2=(r.cur/S)*100,lo=Math.min(x1,x2),hi=Math.max(x1,x2),pd=r.plc-r.plcP;
      const C=neg?'var(--dn)':'var(--up)',CL=neg?'var(--dnL)':'var(--upL)';
      return `<div class="rw"><span class="cNm"><b>${r.n}</b>${tag(r.h)}</span>
        <span class="cTrk"><span class="plot">
          <span style="position:absolute;top:6px;left:${lo.toFixed(1)}%;width:${(hi-lo).toFixed(1)}%;height:2px;background:${CL}"></span>
          <span style="position:absolute;top:3.5px;left:calc(${x1.toFixed(1)}% - 3.5px);width:7px;height:7px;border-radius:50%;background:#fff;border:1.6px solid var(--prior)"></span>
          <span style="position:absolute;top:2.5px;left:calc(${x2.toFixed(1)}% - 4.5px);width:9px;height:9px;border-radius:50%;background:${C};border:1.5px solid #fff"></span>
        </span></span>
        <span class="cDel" style="color:${C}">${r.d>0?'+':''}${r.d}</span>
        <span class="cSku">${pd!==0?'<span style="font-weight:700;color:'+(pd>0?'var(--up)':'var(--dn)')+'">'+(pd>0?'▲':'▼')+Math.abs(pd)+'</span>':'<span style="color:#C9C9C9">—</span>'}</span></div>`;}).join('');};
  const ch=()=>`<div style="display:flex;align-items:flex-end;gap:8px;padding-bottom:4px;border-bottom:1px solid var(--rule)">
    <span class="cNm"></span><span class="cTrk"><span class="lbl" style="font-size:7px;position:absolute;left:0;bottom:0;color:#BEBEBE">prior ○ → now ●</span></span>
    <span class="lbl cDel" style="font-family:Arial">Δ cs</span><span class="lbl cSku">Δ SKUs</span></div>`;
  const newN=D.upList.filter(r=>r.prev===0).length;
  /* THREE REGISTERS (Joe, 2026-08-18). The original is two ranked lists with a track each — a
     report page, so it files UTILITARIAN and stays as it is. The other two:
       modern  one diverging chart off a centre line: gainers right, decliners left, so the
               balance of the quarter reads in a single shape instead of two lists
       bold    the net of the quarter said once, at size, with the names as evidence         */
  const MV = setOf(sid || "movers");
  const MDES = MV.design || "utilitarian";
  const mHead = head("ACCOUNT MOVEMENT",D.scope.name+" · "+PERIOD+" · "+M.rank);
  const mHeadOrig = head("ACCOUNT MOVEMENT",D.scope.name+" · "+PERIOD+" · "+M.cmpNoun+" ○ against "+M.winNoun+" ●");
  const mOriginalBody = `
   <div style="display:flex;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:10px">
     <div style="flex:1;padding:8px 0"><span class="lbl">Accounts that grew</span>
       <div style="display:flex;align-items:baseline;gap:8px;margin-top:3px"><span class="fig" style="font-size:21px;color:var(--up)">+${fmt(D.growC)}</span>
       <span style="font-size:8.3px;color:var(--grey2)">cases across ${D.growN} accounts</span></div></div>
     <div style="flex:1;padding:8px 0 8px 18px;border-left:1px solid var(--ruleLt)"><span class="lbl">Accounts that declined</span>
       <div style="display:flex;align-items:baseline;gap:8px;margin-top:3px"><span class="fig" style="font-size:21px;color:var(--dn)">${fmt(D.declC)}</span>
       <span style="font-size:8.3px;color:var(--grey2)">cases across ${D.declN} accounts</span></div></div>
     <div style="flex:1;padding:8px 0 8px 18px;border-left:1px solid var(--ruleLt)"><span class="lbl">Net movement</span>
       <div style="display:flex;align-items:baseline;gap:8px;margin-top:3px"><span class="fig" style="font-size:21px">${D.growC+D.declC>=0?'+':''}${fmt(D.growC+D.declC)}</span>
       <span style="font-size:8.3px;color:var(--grey2)">cases</span></div></div></div>
   <div style="flex:1;display:flex;gap:26px;padding-top:12px;min-height:0;overflow:hidden">
     <div style="width:50%;min-width:0;display:flex;flex-direction:column">
       <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:7px">
         <span style="width:4px;height:12px;background:var(--up);border-radius:2px"></span>
         <span class="lbl" style="color:var(--up)">Top ${D.upList.length} growth accounts</span></div>
       ${ch()}${rows(D.upList)}</div>
     <div style="width:1px;background:var(--ruleLt)"></div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column">
       <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:7px">
         <span style="display:flex;align-items:baseline;gap:8px">
           <span style="width:4px;height:12px;background:var(--dn);border-radius:2px"></span>
           <span class="lbl" style="color:var(--dn)">Top ${D.dnList.length} declining accounts</span></span>
         <span style="font-size:7.4px;color:var(--grey2)">${M.rank} · labels read the 12-month trend</span></div>
       ${ch()}${rows(D.dnList,1)}</div>
   </div>
   <div style="border-top:1px solid var(--rule);margin-top:10px;padding-top:9px;display:flex;gap:26px;align-items:flex-start;flex-shrink:0">
     <div style="width:50%;min-width:0;font-size:9.2px;line-height:1.5;color:#2B2B2B">
       <b>${D.growN} accounts ${M.grew}</b>, adding ${fmt(D.growC)} cases between them${newN?`; ${newN} of the ${D.upList.length} shown ${M.hadNone}`:''}.
     </div>
     <div style="width:1px;align-self:stretch;background:var(--ruleLt)"></div>
     <div style="flex:1;min-width:0;font-size:9.2px;line-height:1.5;color:#2B2B2B">
       <b>The SKU column separates two problems.</b> An account that lost items has distribution to rebuild; one that held its items and still fell is a velocity conversation.
     </div>
   </div>`;
  const mFoot = foot(SRC+" Δ SKUs is the change in the count of distinct items the account bought."+(D.outlier?` <b>${D.outlier.n} (${fmt(D.outlier.prev)} → ${fmt(D.outlier.cur)} cases, +${fmt(D.outlier.d)}) is excluded from the lists</b> because its scale compresses every other account; it remains in all totals above.`:""));

  // one axis, both directions — the quarter's balance in a single picture
  const divergent = (n, rowH, grouped) => {
    const ups = D.upList.slice(0, n).map(r => ({ ...r, d: (r.cur||0) - (r.prev||0) }));
    const dns = D.dnList.slice(0, n).map(r => ({ ...r, d: (r.cur||0) - (r.prev||0) }));
    const mx = Math.max(1, ...ups.map(r => Math.abs(r.d)), ...dns.map(r => Math.abs(r.d)));
    const line = (r, neg) => `<div style="display:flex;align-items:center;height:${rowH}px;gap:8px">
        <span style="width:34%;text-align:right;font-size:9.6px;font-weight:${neg?500:700};color:#2B2B2B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${neg?r.n:''}</span>
        <span style="flex:1;min-width:0;display:flex;align-items:center;justify-content:${neg?'flex-end':'flex-start'}">
          <span style="height:${rowH-7}px;width:${Math.max(1.5,Math.abs(r.d)/mx*100)}%;background:${neg?'var(--dn)':'var(--up)'};border-radius:${neg?'2px 0 0 2px':'0 2px 2px 0'}"></span></span>
        <span style="width:34%;font-size:9.6px;font-weight:${neg?700:700};color:#2B2B2B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${neg?'':r.n}</span>
      </div>`;
    const val = (r, neg) => `<div style="height:${rowH}px;display:flex;align-items:center;justify-content:${neg?'flex-start':'flex-end'};font-family:var(--disp);font-size:10px;color:${neg?'var(--dn)':'var(--up)'}">${neg?'−':'+'}${fmt(Math.abs(r.d))}</div>`;
    /* ONE CENTRE LINE, both directions off it (Joe, 2026-08-19). Fell first and grew second
       stacked as two blocks read as two charts; a single axis with a row per account — losers
       to the left of it, gainers to the right — is one picture. */
    const pair = (r, neg) => `<div style="display:flex;align-items:center;height:${rowH}px">
        <span style="flex:1;min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:8px">
          <span style="font-size:9.4px;font-weight:${neg?700:400};color:${neg?'#2B2B2B':'var(--grey2)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${neg?r.n:''}</span>
          ${neg?`<span style="height:${rowH-8}px;width:${Math.max(1.5,Math.abs(r.d)/mx*46)}%;background:var(--dn);border-radius:2px 0 0 2px"></span>`:''}
        </span>
        <span style="width:1px;height:${rowH}px;background:var(--ink);flex-shrink:0"></span>
        <span style="flex:1;min-width:0;display:flex;align-items:center;gap:8px">
          ${neg?'':`<span style="height:${rowH-8}px;width:${Math.max(1.5,Math.abs(r.d)/mx*46)}%;background:var(--up);border-radius:0 2px 2px 0"></span>`}
          <span style="font-size:9.4px;font-weight:${neg?400:700};color:${neg?'var(--grey2)':'#2B2B2B'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${neg?'':r.n}</span>
          <span style="margin-left:auto;font-family:var(--disp);font-size:10px;flex-shrink:0;color:${neg?'var(--dn)':'var(--up)'}">${neg?'−':'+'}${fmt(Math.abs(r.d))}</span>
        </span>
      </div>`;
    // grouped = every grower, then every decliner, each still reading off the centre line;
    // interleaved = one of each, which shows the balance but scatters the ranking (Joe, 2026-08-19)
    const rows2 = [];
    if (grouped) { ups.forEach(r => rows2.push(pair(r, 0))); dns.forEach(r => rows2.push(pair(r, 1))); }
    else for (let i = 0; i < Math.max(dns.length, ups.length); i++) { if (dns[i]) rows2.push(pair(dns[i], 1)); if (ups[i]) rows2.push(pair(ups[i], 0)); }
    return `<div>${rows2.join('')}</div>`;
  };
  const netCases = (D.growC||0) - (D.declC||0);

  const MSHAPES = {
    // THE ORIGINAL — two ranked lists side by side, each with its own track.
    utilitarian: () => `${mHeadOrig}${mOriginalBody}
   ${mFoot}`,

    // MODERN — one axis, gainers right and decliners left, so the balance reads at a glance.
    modern: () => `${mHead}
   <div style="display:flex;align-items:baseline;gap:12px;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:9px 0">
     <span class="lbl">Net movement · ${M.winShort}</span>
     <span class="fig" style="font-size:23px;color:${netCases>=0?'var(--up)':'var(--dn)'}">${netCases>=0?'+':'−'}${fmt(Math.abs(netCases))}</span>
     <span style="font-size:8.5px;color:var(--grey2)">cases · ${D.growN} accounts up ${fmt(D.growC)} · ${D.declN} down ${fmt(D.declC)}</span></div>
   <div style="flex:1;display:flex;flex-direction:column;padding-top:12px;min-height:0">
     <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px">
       <span class="lbl">Biggest moves either way · case change against ${M.cmpShort}</span>
       <span style="display:inline-flex;gap:12px;font-size:8px;color:var(--grey2)">
         <span><span style="display:inline-block;width:9px;height:9px;background:var(--dn);border-radius:2px;vertical-align:middle;margin-right:4px"></span>fell</span>
         <span><span style="display:inline-block;width:9px;height:9px;background:var(--up);border-radius:2px;vertical-align:middle;margin-right:4px"></span>grew</span></span></div>
     ${divergent(7, 21, true)}
     <div style="flex:1"></div>
     <div style="border-top:1px solid var(--rule);padding-top:9px;font-size:9.2px;line-height:1.5;color:#2B2B2B">
       <b>The SKU column separates two problems.</b> An account that lost items has distribution to rebuild; one that held its items and still fell is a velocity conversation.
     </div>
   </div>
   ${mFoot}`,

    // BOLD — the net said once, at size, with the names underneath as the evidence.
    bold: () => `${mHead}
   <div style="flex:1;display:flex;gap:30px;padding-top:16px;min-height:0">
     <div style="width:38%;display:flex;flex-direction:column;min-width:0">
       <div class="lbl">Net movement this quarter</div>
       <div class="fig" style="font-size:64px;letter-spacing:-1.5px;line-height:.95;margin-top:3px;color:${netCases>=0?'var(--up)':'var(--dn)'}">${netCases>=0?'+':'−'}${fmt(Math.abs(netCases))}</div>
       <div style="font-size:12px;color:var(--grey);margin-top:6px">cases, ${M.over}</div>
       <div style="height:3px;width:96px;background:var(--pink);margin:15px 0 13px"></div>
       <div style="font-size:11.2px;line-height:1.5;color:#2B2B2B">
         <b>${D.growN} accounts ${M.grew}</b>, adding ${fmt(D.growC)} cases between them, while <b>${D.declN} fell</b> and gave back ${fmt(D.declC)}.
       </div>
       <div style="flex:1"></div>
       <div style="border-top:1px solid var(--ruleLt);padding-top:10px;font-size:9.6px;line-height:1.48;color:#2B2B2B">
         <b>The SKU column separates two problems.</b> An account that lost items has distribution to rebuild; one that held its items and still fell is a velocity conversation.
       </div>
     </div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center">
       ${divergent(6, 22)}
     </div>
   </div>
   ${mFoot}`,
  };
  return wrap((MSHAPES[MDES] || MSHAPES.utilitarian)());
}

/* ---------- 7 · lapsed ---------- */
function sLapsed(sid){
  if(D.lapN < 2) return "";   // not worth a page
  const mxL=Math.max(...D.lapsed.map(t=>t.life),1);
  const winnable=D.qBands[0].n+D.qBands[1].n, winnableV=D.qBands[0].v+D.qBands[1].v;
  const mxC=Math.max(...D.lapChan.map(c=>c.v),1);
  /* THREE REGISTERS (Joe, 2026-08-18). The original is a ranked table of quiet accounts with
     their bands and channels — a working list, so it files UTILITARIAN and is unchanged.
       modern  HOW LONG THEY HAVE BEEN QUIET as one band chart; the window to act is the story
       bold    the number that has walked out, said once, with the winnable part beside it   */
  const LP = setOf(sid || "lapsed");
  const LDES = LP.design || "utilitarian";
  const lHead = head("LAPSED ACCOUNTS",D.scope.name+" · no order in the "+(M.dflt?PERIOD.toLowerCase():"last 90 days"));
  const lOriginalBody = `
   <div style="display:flex;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px">
     <div style="flex:1;padding:9px 0"><span class="lbl">Lapsed accounts</span>
       <div style="display:flex;align-items:baseline;gap:8px;margin-top:3px"><span class="fig" style="font-size:22px;color:var(--warmD)">${D.lapN}</span>
       <span style="font-size:8.4px;color:var(--grey2)">of ${D.withHist} with history · ${Math.round(D.lapN/D.withHist*100)}%</span></div></div>
     <div style="flex:1;padding:9px 0 9px 18px;border-left:1px solid var(--ruleLt)"><span class="lbl">Cases they last bought</span>
       <div style="display:flex;align-items:baseline;gap:8px;margin-top:3px"><span class="fig" style="font-size:22px">${fmt(D.lapLife)}</span>
       <span style="font-size:8.4px;color:var(--grey2)">over 24 months · ${fmt(D.lapL52)} in the last year</span></div></div>
     <div style="flex:1;padding:9px 0 9px 18px;border-left:1px solid var(--ruleLt)"><span class="lbl">Quiet under nine months</span>
       <div style="display:flex;align-items:baseline;gap:8px;margin-top:3px"><span class="fig" style="font-size:22px;color:var(--warmD)">${winnable}</span>
       <span style="font-size:8.4px;color:var(--grey2)">accounts · ${fmt(winnableV)} cases · the winnable pool</span></div></div></div>
   <div style="flex:1;display:flex;gap:26px;padding-top:13px;min-height:0">
     <div style="width:52%;min-width:0;display:flex;flex-direction:column">
       <div class="lbl" style="margin-bottom:9px">Largest lapsed accounts</div>
       <div style="flex:1;min-height:0">
         ${D.lapsed.map((t,i)=>`<div style="display:flex;align-items:center;gap:7px;padding:3.6px 0;border-bottom:1px solid var(--ruleLt)">
           <span style="width:13px;font-size:8px;color:#BDBDBD;text-align:right">${i+1}</span>
           <span style="flex:1;min-width:0">
             <span style="display:flex;align-items:center;gap:5px">
               <span style="font-size:9.2px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.n}</span>
               ${i<Math.min(6,Math.ceil(D.lapsed.length/2))?'<span class="tier">top tier</span>':''}</span>
             <span style="display:block;font-size:7.2px;color:var(--grey2)">${t.city} · ${t.ct}</span></span>
           <span style="width:52px;text-align:right"><span class="fig" style="font-size:12px">${fmt(t.life)}</span><span style="font-size:7px;color:var(--grey2)"> cs</span></span>
           <span style="width:40px;text-align:right;font-size:8.6px;color:${t.q<=6?'var(--warmD)':'var(--grey2)'};font-weight:${t.q<=6?700:400}">${t.q} mo</span>
           <span style="width:30px;text-align:right;font-size:8.4px;color:var(--grey)">${t.sku} sk</span></div>`).join('')}
       </div>
     </div>
     <div style="width:1px;background:var(--ruleLt)"></div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column">
       <div class="lbl" style="margin-bottom:9px">How long they have been quiet</div>
       <div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly;min-height:0">
         <div>
           <div style="display:flex;height:30px;border-radius:3px;overflow:hidden">
             ${D.qBands.filter(q=>q.v>0).map(q=>`<div style="width:${(q.v/D.lapLife*100).toFixed(1)}%;background:${q.c};display:flex;align-items:center;justify-content:center">
               <span class="fig" style="font-size:11px;color:#fff">${Math.round(q.v/D.lapLife*100)}%</span></div>`).join('')}</div>
           <div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px">
             ${D.qBands.filter(q=>q.n>0).map(q=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:8.4px">
               <span style="width:8px;height:8px;border-radius:2px;background:${q.c}"></span>
               <b>${q.k}</b> <span style="color:var(--grey)">${q.n} accts · ${fmt(q.v)} cs</span></span>`).join('')}</div>
         </div>
         <div style="padding-top:14px;border-top:1px solid var(--rule)">
           <div class="lbl" style="margin-bottom:8px">By channel</div>
           ${D.lapChan.map(c=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
             <span style="width:88px;font-size:9px;font-weight:700">${c.k}</span>
             <div style="flex:1;height:9px;background:#F3F3F3;border-radius:2px;overflow:hidden">
               <div style="width:${(c.v/mxC*100).toFixed(1)}%;height:100%;background:var(--warm)"></div></div>
             <span style="width:26px;text-align:right;font-size:9px;font-weight:700">${c.n}</span>
             <span style="width:42px;text-align:right;font-size:8.4px;color:var(--grey)">${fmt(c.v)} cs</span></div>`).join('')}
         </div>
         <div style="padding-top:14px;border-top:1px solid var(--rule)">
           <div style="display:flex;gap:8px">
             <span style="width:3px;flex-shrink:0;background:var(--warm);border-radius:2px;margin:3px 0"></span>
             <span style="font-size:9.8px;line-height:1.45;color:#2B2B2B"><b>${winnable} account${winnable===1?'':'s'} ${winnable===1?'has':'have'} been quiet under nine months</b>, holding ${fmt(winnableV)} cases — ${Math.round(winnableV/D.lapLife*100)}% of all lapsed volume. They still remember the brand and most still have space on the shelf.</span></div>
         </div>
       </div>
     </div>
   </div>`;
  const lFoot = foot(SRC+" Cases shown are what the account bought across the 24 months on file. Months quiet counts from its last order. Top tier flags the largest by lifetime volume.");
  const qMax = Math.max(...D.qBands.map(q=>q.v),1);
  const chMax = Math.max(...D.lapChan.map(c=>c.v),1);

  const LSHAPES = {
    utilitarian: () => `${lHead}${lOriginalBody}${lFoot}`,

    /* MODERN — WHAT EACH LOST ACCOUNT WAS WORTH (Joe, 2026-08-19). The band chart said how
       long they had been quiet; this says how much walked out with them, biggest first, as
       columns off a shared baseline. Ten names is a call list, not a summary. */
    modern: () => { const top = [...D.lapsed].sort((a,b)=>b.l52-a.l52).slice(0,10); const tmx = Math.max(...top.map(t=>t.l52),1);
      return `${lHead}
   <div style="display:flex;align-items:baseline;gap:12px;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:9px 0">
     <span class="lbl">Volume that walked out</span><span class="fig" style="font-size:23px">${fmt(D.lapL52)}</span>
     <span style="font-size:8.5px;color:var(--grey2)">cases over the last 52 weeks · ${D.lapN} accounts · ${Math.round(D.lapN/D.withHist*100)}% of everyone who has ever bought</span></div>
   <div style="flex:1;display:flex;flex-direction:column;padding-top:14px;min-height:0">
     <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px">
       <span class="lbl">The ${top.length} biggest losses · 52-week cases</span>
       <span style="font-size:7.8px;color:var(--grey2)">months quiet under each name</span></div>
     <div style="flex:1;min-height:0;display:flex;align-items:stretch;gap:9px">
       ${top.map(t=>`<div style="flex:1;min-width:0;display:flex;flex-direction:column">
         <div style="flex-shrink:0;text-align:center"><span class="fig" style="font-size:12px">${fmt(t.l52)}</span></div>
         <div style="flex:1;min-height:0;display:flex;align-items:flex-end;justify-content:center;margin-top:4px">
           <div style="width:62%;height:${Math.max(2,(t.l52/tmx*100)).toFixed(1)}%;background:var(--warmD);border-radius:3px 3px 0 0"></div></div>
         <div style="flex-shrink:0;border-top:0.5px solid var(--rule);padding-top:5px;margin-top:0;text-align:center">
           <div style="font-size:8.6px;font-weight:700;color:#2B2B2B;line-height:1.25;height:22px;overflow:hidden">${t.n}</div>
           <div style="font-size:7.6px;color:var(--grey2);margin-top:2px">${t.life} mo quiet</div></div></div>`).join('')}
     </div>
     <div style="border-top:1px solid var(--rule);margin-top:11px;padding-top:9px;font-size:9.6px;line-height:1.5;color:#2B2B2B">
       <b>${D.qBands[0].n+D.qBands[1].n} of them have been silent under nine months</b> — ${fmt(D.qBands[0].v+D.qBands[1].v)} cases a year, and the relationship is still warm.
     </div>
   </div>${lFoot}`; },

    // BOLD — what walked out, said once, with the reachable part next to it.
    bold: () => `${lHead}
   <div style="flex:1;display:flex;gap:30px;padding-top:18px;min-height:0">
     <div style="width:42%;display:flex;flex-direction:column;min-width:0">
       <div class="lbl">Cases that walked out</div>
       <div class="fig" style="font-size:74px;letter-spacing:-1.6px;line-height:.94;margin-top:3px;color:var(--warmD)">${fmt(D.lapL52)}</div>
       <div style="font-size:12.5px;color:var(--grey);margin-top:7px">over the last 52 weeks, across ${D.lapN} account${D.lapN===1?'':'s'}</div>
       <div style="height:3px;width:100px;background:var(--pink);margin:16px 0 14px"></div>
       <div style="font-size:11.4px;line-height:1.5;color:#2B2B2B">
         <b>${D.qBands[0].n+D.qBands[1].n} have been quiet under nine months</b>, worth ${fmt(D.qBands[0].v+D.qBands[1].v)} cases a year. Those are the ones still worth a call.
       </div>
       <div style="flex:1"></div>
       <div style="border-top:1px solid var(--ruleLt);padding-top:10px;font-size:9.8px;line-height:1.46;color:#2B2B2B">
         That is <b>${Math.round(D.lapN/D.withHist*100)}% of everyone who has ever bought here</b> — lapsed relationships, not accounts that never started.
       </div>
     </div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center">
       <div class="lbl" style="margin-bottom:10px">Longest quiet first</div>
       ${D.lapsed.slice(0,9).map(t=>`<div style="display:flex;align-items:center;gap:9px;height:26px">
         <span style="flex:1;min-width:0;font-size:10.4px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.n}</span>
         <span style="width:120px;height:9px;background:#F2F2F2;border-radius:2px;overflow:hidden;flex-shrink:0">
           <span style="display:block;height:100%;width:${Math.min(100,(t.life/mxL*100)).toFixed(1)}%;background:var(--warm)"></span></span>
         <span style="font-family:var(--disp);font-size:11px;width:52px;text-align:right">${fmt(t.l52)}</span>
         <span style="font-size:8.2px;color:var(--grey2);width:56px;text-align:right">${t.life} mo quiet</span></div>`).join('')}
     </div>
   </div>${lFoot}`,
  };
  return wrap((LSHAPES[LDES] || LSHAPES.utilitarian)());
}

/* ---------- 8 · recap ---------- */
function sRecap(sid){
  const surg=D.buckets.find(b=>b.k==="Surging"), lap=D.buckets.find(b=>b.k==="Lapsed");
  const risk=(D.buckets.find(b=>b.k==="At risk")||{n:0,l52:0}), soft=(D.buckets.find(b=>b.k==="Softening")||{n:0,l52:0});
  const win=D.qBands[0].n+D.qBands[1].n, winV=D.qBands[0].v+D.qBands[1].v;
  const topBrand=(D.pkg.rows[0]&&D.pkg.rows[0].cur>=(D.draft.rows[0]||{cur:0}).cur)?D.pkg.rows[0]:(D.draft.rows[0]||D.pkg.rows[0]);
  const OPP=[
    win?{h:"Wake the recently quiet",v:fmt(winV),u:"cases",b:`${win} account${win===1?'':'s'} ${win===1?'has':'have'} been silent under nine months and can be worked before the relationship cools.`}:null,
    topBrand?{h:`Deepen ${topBrand.n}`,v:String(topBrand.acc),u:"accounts",b:`It already sits in ${topBrand.acc} account${topBrand.acc===1?'':'s'} at ${(rosBase(topBrand)/(topBrand.acc||1)/3).toFixed(1)} cases per account per month. The shelf is won; the velocity is the opportunity.`}:null,
    {h:"Press the accounts already climbing",v:surg?String(surg.n):"0",u:"surging accounts",b:`They run ${surg?surg.ros:0} cases per account per month against the book's ${D.ros}. More of what they carry is the fastest volume in the market.`},
  ].filter(Boolean).slice(0,3);
  const HEAD=[
    lap&&lap.n?{h:"Dormant accounts",v:String(lap.n),u:"accounts",b:`${Math.round(lap.n/D.withHist*100)}% of everyone who has ever bought, worth ${fmt(lap.l52)} cases in the last twelve months.`}:null,
    (risk.n+soft.n)?{h:"Accounts wobbling",v:fmt(risk.l52+soft.l52),u:"cases at risk",b:`${risk.n+soft.n} at-risk and softening account${risk.n+soft.n===1?'':'s'} hold this much 52-week volume. Reachable now, expensive later.`}:null,
    {h:"Placement change",v:(D.plcPct>=0?'+':'')+D.plcPct+"%",u:"placements",b:`Account-and-SKU pairs moved from ${fmt(D.plP)} to ${fmt(D.plN)}. Distribution and velocity have to move together for the quarter to hold.`},
  ].filter(Boolean).slice(0,3);
  const ASK_UNUSED=`${win?`Reactivate the ${win} recently quiet account${win===1?'':'s'}`:'Protect the active base'}${topBrand?`, and drive depth on ${topBrand.n} in the ${topBrand.acc} account${topBrand.acc===1?'':'s'} already carrying it`:''}. Those moves are worth more than any new placement this quarter.`;
  const S4=[[M.stat,fmt(D.cur90),D.casesPct,"vs "+fmt(D.prev90)+" "+M.cmpShort],
            ["Active accounts",fmt(D.accts),D.acctsPct,"of "+D.withHist+" with history"],
            ["Placements",fmt(D.plN),D.plcPct,"account × SKU pairs"],
            ["Cases / acct / mo",D.ros,null,"vs "+D.rosPrev+" prior 90"]];
  const col=(A,c)=>A.map(x=>`<div style="display:flex;gap:13px;margin-bottom:15px;align-items:flex-start">
     <div style="width:64px;flex-shrink:0;text-align:right">
       <div class="fig" style="font-size:22px;color:${c}">${x.v}</div>
       <div style="font-size:7.2px;color:var(--grey2);margin-top:3px;line-height:1.25">${x.u}</div></div>
     <div style="width:1px;align-self:stretch;background:var(--ruleLt)"></div>
     <div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:700;line-height:1.25">${x.h}</div>
       <div style="font-size:9.6px;line-height:1.5;color:#3A3A3A;margin-top:4px">${x.b}</div></div></div>`).join('');
  /* THREE REGISTERS (Joe, 2026-08-18). The original is a recommendation — three things to do
     and three to watch, written as arguments — so it files BOLD and stays as it is.
       utilitarian  the same six as one ruled table: do / watch, the number, the reason
       modern       the three moves as the page, headwinds reduced to a strip beneath        */
  const RC = setOf(sid || "recap");
  const RDES = RC.design || "bold";
  const rHead = head("WHERE TO SPEND THE QUARTER",D.scope.name+" · "+PERIOD+" · opportunities and headwinds");
  const rOriginalBody = `
   <div style="border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:13px 0">
     <div style="display:flex">${S4.map((s,i)=>`<div style="flex:1;text-align:center;${i?'border-left:1px solid var(--ruleLt);':''}">
       <div class="lbl">${s[0]}</div>
       <div style="display:flex;align-items:baseline;gap:8px;margin-top:6px;justify-content:center">
         <span class="fig" style="font-size:31px">${s[1]}</span>
         ${s[2]!=null?'<span class="dlt '+sgn(s[2])+'">'+arrow(s[2])+' '+Math.abs(s[2])+'%</span>':''}</div>
       <div style="font-size:8.5px;color:var(--grey2);margin-top:4px">${s[3]}</div></div>`).join('')}</div></div>
   <div style="flex:1;display:flex;gap:28px;padding-top:16px;min-height:0">
     <div style="width:50%;min-width:0;display:flex;flex-direction:column">
       <div style="display:flex;align-items:center;gap:8px;margin-bottom:13px">
         <span style="width:4px;height:13px;background:var(--up);border-radius:2px"></span>
         <span class="lbl" style="color:var(--up)">Opportunities</span></div>
       <div style="flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0">${col(OPP,'var(--up)')}</div></div>
     <div style="width:1px;background:var(--ruleLt)"></div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column">
       <div style="display:flex;align-items:center;gap:8px;margin-bottom:13px">
         <span style="width:4px;height:13px;background:var(--dn);border-radius:2px"></span>
         <span class="lbl" style="color:var(--dn)">Headwinds</span></div>
       <div style="flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0">${col(HEAD,'var(--dn)')}</div></div>
   </div>
   <div style="border-top:1px solid var(--rule);margin-top:12px;padding-top:12px;display:flex">
     <div style="flex:1;text-align:center"><div class="lbl">52-week cases · actual</div>
       <div class="fig" style="font-size:26px;margin-top:5px">${fmt(D.l52)}</div>
       <div class="dlt ${sgn(D.l52Pct)}" style="margin-top:5px">${arrow(D.l52Pct)} ${Math.abs(D.l52Pct)}%</div>
       <div style="font-size:8px;color:var(--grey2);margin-top:4px">vs ${fmt(D.p52)} prior year</div></div>
     <div style="width:1px;background:var(--ruleLt)"></div>
     <div style="flex:1;text-align:center"><div class="lbl" style="color:var(--fcBlue)">52-week cases · forecast</div>
       <div class="fig" style="font-size:26px;margin-top:5px;color:var(--fcBlue)">${fmt(D.fc52)}</div>
       <div class="dlt" style="margin-top:5px;color:var(--fcBlue)">${arrow(D.fcPct)} ${Math.abs(D.fcPct)}%</div>
       <div style="font-size:8px;color:#8990BE;margin-top:4px">next 12 months vs trailing 52</div></div>
   </div>`;
  const rFoot = foot("Every figure on this page is drawn from distributor depletion reporting through the snapshot date and appears on an earlier slide. "+SRC.replace('Source: distributor depletion reporting through the snapshot date. ',''));
  const allRows = OPP.map(o=>({...o,kind:"Do"})).concat(HEAD.map(h=>({...h,kind:"Watch"})));

  const RSHAPES = {
    bold: () => `${rHead}${rOriginalBody}${rFoot}`,

    // UTILITARIAN — the same six lines as a ruled table, nothing raised above anything else.
    utilitarian: () => `${rHead}
   <div style="display:flex;align-items:baseline;gap:12px;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:9px 0">
     <span class="lbl">${OPP.length} moves · ${HEAD.length} to watch</span>
     <span style="font-size:8.5px;color:var(--grey2)">every figure appears on an earlier slide</span></div>
   <div style="flex:1;padding-top:12px;min-height:0">
     <table style="width:100%;border-collapse:collapse">
       <tr><th class="lbl" style="text-align:left;padding-bottom:6px;width:56px">Type</th>
         <th class="lbl" style="text-align:left">What</th>
         <th class="lbl" style="text-align:right;width:88px">Size</th>
         <th class="lbl" style="text-align:left;padding-left:18px">Why it matters</th></tr>
       ${allRows.map((r,i)=>`<tr style="border-top:1px solid ${i?'var(--ruleLt)':'var(--rule)'};background:${r.kind==="Do"?'#FAFCFA':'transparent'}">
         <td style="padding:10px 0;font-size:9px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${r.kind==="Do"?'var(--up)':'var(--warmD)'}">${r.kind}</td>
         <td style="font-size:11.4px;font-weight:700;padding-right:12px">${r.h}</td>
         <td style="text-align:right;white-space:nowrap"><span class="fig" style="font-size:17px">${r.v}</span>
           <span style="font-size:8px;color:var(--grey2);display:block;margin-top:1px">${r.u}</span></td>
         <td style="padding-left:18px;font-size:9.8px;line-height:1.45;color:#2B2B2B">${r.b}</td></tr>`).join('')}
     </table>
   </div>${rFoot}`,

    // MODERN — the three moves take the page; the headwinds sit under them as one quiet strip.
    modern: () => `${rHead}
   <div style="display:flex;align-items:baseline;gap:12px;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:9px 0">
     <span class="lbl">Where the quarter is won</span>
     <span style="font-size:8.5px;color:var(--grey2)">three moves, and what is working against them</span></div>
   <div style="flex:1;display:flex;flex-direction:column;padding-top:16px;min-height:0">
     <div style="display:flex;gap:26px">
       ${OPP.map((o,i)=>`<div style="flex:1;min-width:0;${i?'border-left:1px solid var(--ruleLt);padding-left:26px':''}">
         <div style="width:26px;height:3px;background:var(--pink);margin-bottom:10px"></div>
         <div class="fig" style="font-size:40px;line-height:.98">${o.v}</div>
         <div style="font-size:9px;letter-spacing:.6px;text-transform:uppercase;color:var(--grey2);margin-top:4px">${o.u}</div>
         <div style="font-size:12.5px;font-weight:700;margin-top:11px;line-height:1.3">${o.h}</div>
         <div style="font-size:10px;line-height:1.5;color:#2B2B2B;margin-top:7px">${o.b}</div></div>`).join('')}
     </div>
     <div style="flex:1"></div>
     <div style="border-top:1px solid var(--rule);padding-top:11px">
       <div class="lbl" style="margin-bottom:8px;color:var(--warmD)">Working against it</div>
       <div style="display:flex;gap:26px">
         ${HEAD.map(h=>`<div style="flex:1;min-width:0;display:flex;gap:9px;align-items:baseline">
           <span class="fig" style="font-size:17px;color:var(--warmD);flex-shrink:0">${h.v}</span>
           <span style="min-width:0"><b style="font-size:10px">${h.h}</b>
             <span style="display:block;font-size:9.2px;line-height:1.44;color:#2B2B2B;margin-top:2px">${h.b}</span></span></div>`).join('')}
       </div>
     </div>
   </div>${rFoot}`,
  };
  return wrap((RSHAPES[RDES] || RSHAPES.bold)());
}


/* ---------- 3 · brand story (only when there IS one) ---------- */
// The three levers of real growth: more accounts carrying, more facings inside them,
// and faster turns on each one. If the quarter isn't actually a growth story the slide
// drops out entirely rather than spin a bad one (Joe, 2026-08-16).
function brandStoryOK(){
  const lv=[D.acctsPct,D.plcPct,rosPct()].filter(v=>v!=null&&v>0).length;
  return D.casesPct!=null && D.casesPct>0 && lv>=2 && (D.styles||[]).length>=2;
}
function rosPct(){ return D.rosPrev>0 ? Math.round((D.ros-D.rosPrev)/D.rosPrev*100) : null; }
function sBrandStory(sid){
  const rp=rosPct();
  const up=[[D.acctsPct,"more accounts carrying it"],[D.plcPct,"more of the shelf inside them"],[rp,"faster turns on every facing"]]
    .filter(([v])=>v!=null&&v>0).map(([,t])=>t);
  const lead = up.length>=3 ? `<b>${D.scope.name}</b> is growing on <b>all three levers at once</b> — ${up[0]}, ${up[1]}, and ${up[2]}. Growth this quarter is <b>real distribution</b>, not a handful of big orders.`
    : `<b>${D.scope.name}</b> is up <b>${D.casesPct}%</b> on the quarter, carried by <b>${up.join("</b> and <b>")}</b>.`;
  const stat=(lab,val,prev,pctv,sub,col)=>`
    <div style="flex:1;padding:0 22px;${col?'border-left:1px solid var(--rule)':''}">
      <div class="lbl">${lab}</div>
      <div style="display:flex;align-items:baseline;gap:9px;margin-top:5px">
        <span class="fig" style="font-size:34px">${val}</span>
        ${pctv!=null?`<span class="dlt ${sgn(pctv)}">${arrow(pctv)} ${Math.abs(pctv)}%</span>`:''}</div>
      <div style="font-size:9.5px;color:var(--grey2);margin-top:3px">${prev} a quarter ago${sub?' · '+sub:''}</div>
    </div>`;
  // vertical style columns — cases this window, prior ghosted behind, change under each
  const st=(D.styles||[]).slice(0,7), smx=Math.max(...st.map(s=>Math.max(s.cur,s.prev)),1);
  const CW2=840,H2=330,pl2=6,pb2=54,pt2=26,ph2=H2-pt2-pb2,step2=(CW2-pl2*2)/st.length,bw2=Math.min(step2*0.34,54);
  let sv='<svg viewBox="0 0 '+CW2+' '+H2+'" style="width:100%;height:auto;display:block">';
  sv+='<line x1="'+pl2+'" y1="'+(pt2+ph2)+'" x2="'+(CW2-pl2)+'" y2="'+(pt2+ph2)+'" stroke="#E3E3E3"/>';
  st.forEach((s2,i)=>{
    const cx=pl2+i*step2+step2/2, hC=Math.max(2,(s2.cur/smx)*ph2), hP=Math.max(1,(s2.prev/smx)*ph2);
    // the pair sits side by side at equal width, centred on cx — the prior window is the thing
    // being compared, not a ghost behind the current one (Joe, 2026-08-19)
    sv+='<rect x="'+(cx-bw2-1).toFixed(1)+'" y="'+(pt2+ph2-hP).toFixed(1)+'" width="'+bw2.toFixed(1)+'" height="'+hP.toFixed(1)+'" rx="2" fill="#EBD9AE"/>';
    sv+='<rect x="'+(cx+1).toFixed(1)+'" y="'+(pt2+ph2-hC).toFixed(1)+'" width="'+bw2.toFixed(1)+'" height="'+hC.toFixed(1)+'" rx="2" fill="'+(i===0?'#A87418':'#C8912A')+'" opacity="'+(i===0?1:0.86-i*0.07)+'"/>';
    sv+='<text x="'+(cx+1+bw2/2).toFixed(1)+'" y="'+(pt2+ph2-hC-7).toFixed(1)+'" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#0A0A0A">'+fmt(s2.cur)+'</text>';
    sv+='<text x="'+cx.toFixed(1)+'" y="'+(pt2+ph2+16)+'" text-anchor="middle" font-family="Arial" font-size="9.6" font-weight="bold" fill="#2B2B2B">'+s2.k+'</text>';
    if(s2.pct!=null) sv+='<text x="'+cx.toFixed(1)+'" y="'+(pt2+ph2+30)+'" text-anchor="middle" font-family="Arial" font-size="9.4" font-weight="bold" fill="'+(s2.pct>0?'#2E7D52':s2.pct<0?'#C0564E':'#9A9A9A')+'">'+arrow(s2.pct)+Math.abs(s2.pct)+'%</text>';
    sv+='<text x="'+cx.toFixed(1)+'" y="'+(pt2+ph2+43)+'" text-anchor="middle" font-family="Arial" font-size="8.4" fill="#9A9A9A">'+s2.acc+' accts</text>';
  });
  sv+='</svg>';
  /* THREE REGISTERS (Joe, 2026-08-18). The original opens with a full-width narrative lead over
     three levers, so it files under BOLD and keeps its place unchanged. The other two:
       utilitarian  the three levers as a ruled table with the styles listed under them —
                    the same facts with nothing raised above anything else
       modern       the styles chart takes the page, the levers reduced to a quiet strip     */
  const BS = setOf(sid || "brand");
  const BDES = BS.design || "bold";
  const bHead = head("THE BRAND STORY",D.scope.name+" · "+PERIOD+" · "+D.scope.sub);
  const bFoot = foot(SRC+" Placements count account-and-SKU pairs that moved in the window. Styles aggregate every brand and format selling in that style across the scope.");
  const legend = (cA, cB) => `<span style="display:inline-flex;align-items:center;gap:12px;font-size:8px;color:var(--grey2)">
         <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:9px;height:9px;background:${cA || "var(--green)"};border-radius:2px"></span>${M.winShort}</span>
         <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:9px;height:9px;background:${cB || "#E1E4DF"};border-radius:2px"></span>${M.cmpShort}</span>
       </span>`;
  // the three levers as rows rather than columns — label, now, prior, change
  const leverRows = [
    ["Accounts carrying", fmt(D.accts), fmt(D.acctsP), D.acctsPct, D.accts-D.acctsP>0?"+"+(D.accts-D.acctsP)+" accounts":"—"],
    ["Placements on shelf", fmt(D.plN), fmt(D.plP), D.plcPct, D.plN-D.plP>0?"+"+fmt(D.plN-D.plP)+" facings":"—"],
    ["Rate of sale · cases / acct / mo", String(D.ros), String(D.rosPrev), rp, D.ros>=D.rosPrev?"each account working harder":"—"],
  ];
  const leverTable = `<table style="width:100%;border-collapse:collapse">
       <tr><th class="lbl" style="text-align:left;padding-bottom:5px">Lever</th>
         <th class="lbl" style="text-align:right">${M.col}</th><th class="lbl" style="text-align:right">${M.cmpShort}</th>
         <th class="lbl" style="text-align:right">Chg</th><th class="lbl" style="text-align:left;padding-left:16px">What moved</th></tr>
       ${leverRows.map((r,i)=>`<tr style="border-top:1px solid ${i?'var(--ruleLt)':'var(--rule)'}">
         <td style="padding:9px 0;font-size:11px;font-weight:700">${r[0]}</td>
         <td style="text-align:right;font-family:var(--disp);font-size:17px">${r[1]}</td>
         <td style="text-align:right;font-size:10px;color:var(--grey2)">${r[2]}</td>
         <td style="text-align:right;font-size:10px;font-weight:700" class="${r[3]==null?'':sgn(r[3])}">${r[3]==null?'—':arrow(r[3])+' '+Math.abs(r[3])+'%'}</td>
         <td style="padding-left:16px;font-size:9.5px;color:var(--grey)">${r[4]}</td></tr>`).join('')}
     </table>`;
  // the same styles, read as a ranked list instead of a column chart
  const styleRows = (D.styles||[]).slice(0,8);
  const styleMax = Math.max(...styleRows.map(s2=>Math.max(s2.cur,s2.prev)),1);
  /* LEFT-TO-RIGHT BARS (Joe, 2026-08-19). `n` rows deep, and the two bars carry the SAME
     thickness — the prior isn't a footnote to this window, it's the thing being compared. */
  const styleBars = (n,h,cA,cB) => { const rows=(D.styles||[]).slice(0,n);
    const mx=Math.max(...rows.map(s2=>Math.max(s2.cur,s2.prev)),1);
    return rows.map(s2=>`<div style="margin-bottom:${h>7?7:5}px">
       <div style="display:flex;align-items:baseline;gap:8px;white-space:nowrap">
         <span style="font-size:9.8px;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${s2.k}</span>
         <span style="font-size:8px;color:var(--grey2)">${s2.acc} accts</span>
         <span class="fig" style="font-size:11px">${fmt(s2.cur)}</span>
         <span style="font-size:8.6px;font-weight:700;width:38px;text-align:right;color:${s2.pct==null?'var(--new)':s2.pct>0?'var(--up)':s2.pct<0?'var(--dn)':'var(--grey2)'}">${s2.pct==null?'new':arrow(s2.pct)+Math.abs(s2.pct)+'%'}</span></div>
       <div style="margin-top:2px">
         <div style="height:${h}px;background:#F1F3EF;border-radius:2px 2px 0 0;overflow:hidden"><div style="height:100%;width:${Math.max(1.5,s2.cur/mx*100)}%;background:${cA}"></div></div>
         <div style="height:${h}px;background:#F7F8F5;border-radius:0 0 2px 2px;overflow:hidden;margin-top:1px"><div style="height:100%;width:${Math.max(1.5,s2.prev/mx*100)}%;background:${cB}"></div></div>
       </div></div>`).join(''); };
  const styleList = (h) => styleBars(8,h,"var(--green)","#E1E4DF");
  const styleN = Math.min(15, (D.styles||[]).length) || 1;
  const styleH = Math.max(7, Math.min(17, Math.round((566/styleN - 21)/2)));
  // four reads off the same numbers the chart is drawing
  const bsBul = [
    `<b>${D.accts} accounts carry the brand</b>${D.acctsPct!=null?`, ${D.acctsPct>=0?'up':'down'} ${Math.abs(D.acctsPct)}% ${M.over}`:''} — the width of the book.`,
    `<b>${fmt(D.plN)} placements on shelf</b>${D.plcPct!=null?`, ${D.plcPct>=0?'up':'down'} ${Math.abs(D.plcPct)}%`:''} — how much room those accounts give it.`,
    `<b>${D.ros} cases per account per month</b> against ${D.rosPrev} a quarter ago — how hard each one works.`,
    (D.styles&&D.styles[0])?`<b>${D.styles[0].k} leads at ${fmt(D.styles[0].cur)} cases</b> across ${D.styles[0].acc} accounts${D.styles[0].pct!=null?`, ${D.styles[0].pct>=0?'up':'down'} ${Math.abs(D.styles[0].pct)}%`:''}.`:'',
  ].filter(Boolean);

  const BSHAPES = {
    /* BOLD — the ranking left to right, fifteen deep, with the read down the right. Design 2
       already carries the narrative lead over the column chart, so repeating that here made
       two slides that looked the same (Joe, 2026-08-19). Teal, so the three don't share a
       palette either. */
    bold: () => `${bHead}
   <div style="display:flex;align-items:baseline;gap:12px;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:9px 0">
     <span class="lbl">What's carrying it · by style</span>
     <span style="font-size:8.5px;color:var(--grey2)">${M.winShort} against ${M.cmpShort} · ${D.accts} accounts · ${fmt(D.plN)} placements · ${D.ros} cs/acct/mo</span></div>
   <div style="flex:1;display:flex;gap:26px;padding-top:12px;min-height:0">
     <div style="width:58%;min-width:0">${styleBars(15,styleH,"var(--teal)","var(--tealLt)")}</div>
     <div style="width:1px;background:var(--ruleLt)"></div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column;padding-top:2px">
       <div class="lbl" style="margin-bottom:11px">Key insights</div>
       ${bsBul.map((b,i)=>`<div style="display:flex;gap:9px;margin-bottom:13px">
         <span class="fig" style="font-size:12px;color:var(--teal);width:13px;flex-shrink:0">${i+1}</span>
         <span style="font-size:10.6px;line-height:1.5;color:#2B2B2B">${b}</span></div>`).join('')}
     </div>
   </div>
   ${bFoot}`,

    // UTILITARIAN — no lead, no hierarchy: the levers as a table, the styles as a ranked list.
    utilitarian: () => `${bHead}
   <div style="border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:9px 0">
     <span class="lbl">The three levers · ${M.winShort} against ${M.cmpLong}</span></div>
   <div style="flex:1;display:flex;gap:26px;padding-top:13px;min-height:0">
     <div style="width:50%;display:flex;flex-direction:column;min-width:0">
       ${leverTable}
       <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding-top:12px">
         <div class="lbl" style="margin-bottom:7px">The read</div>
         <div style="font-size:11px;line-height:1.5;color:#2B2B2B">${lead}</div>
       </div>
     </div>
     <div style="width:1px;background:var(--ruleLt)"></div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column">
       <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px">
         <span class="lbl">By style · top ${styleRows.length}</span>${legend()}</div>
       ${styleList(8)}
     </div>
   </div>
   ${bFoot}`,

    // MODERN — the chart is the slide; the levers reduce to one quiet strip beneath the lead.
    modern: () => `${bHead}
   <div style="border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:12px 0 11px">
     <div style="font-size:15px;line-height:1.4;max-width:860px">${lead}</div>
     <div style="display:flex;gap:34px;margin-top:11px">
       ${leverRows.map(r=>`<div style="display:flex;align-items:baseline;gap:7px">
         <span class="lbl">${r[0].split(" · ")[0]}</span>
         <span class="fig" style="font-size:19px">${r[1]}</span>
         ${r[3]!=null?'<span class="dlt '+sgn(r[3])+'">'+arrow(r[3])+' '+Math.abs(r[3])+'%</span>':''}</div>`).join('')}
     </div>
   </div>
   <div style="flex:1;display:flex;flex-direction:column;padding-top:12px;min-height:0">
     <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px">
       <span class="lbl">What's carrying it · by style</span>${legend("#C8912A","#EBD9AE")}</div>
     <div style="flex:1;min-height:0">${sv}</div>
   </div>
   ${bFoot}`,
  };
  return wrap((BSHAPES[BDES] || BSHAPES.bold)());
}

/* ---------- assemble ----------------------------------------------------------
   Every slide is built and returned WITH ITS IDENTITY. The Library shows all of
   them, always — a slide is never hidden on the shelf (Joe, 2026-08-18). The
   `rule` on a slide is what a DECK consults at build time to drop it from that
   one run; `met` is whether that rule passes against the data in hand right now.
   These rules were previously buried in this assembly as bare `if`s — surfacing
   them is what lets a deck template act on them.                               */
const SL = [
  { id: "cover",    name: "Cover",            build: sTitle },
  { id: "overview", name: "Overview",         build: sOverview },
  { id: "brand",    name: "The brand story",  build: sBrandStory,
    rule: "Only when there's enough brand history to read",
    met: () => brandStoryOK() },
  /* ONE ITEM SLIDE, NOT TWO (Joe, 2026-08-18). Draft and Package were never two slides — they
     are the same slide reading a different side of the book. So it's one slide with a filter,
     and a deck that wants both duplicates it and sets the other side on the copy. That's the
     general shape for anything that's "the same page, filtered": a setting, plus Duplicate. */
  { id: "items",    name: "Item ranking",    build: (sid) => { const g = packOf(sid); return sItems(g, g === "pkg" ? "Package" : "Draft", sid); },
    rule: "Only when this side of the book is at least 5% of total sales",
    met: (sid) => { const g = packOf(sid), tot = (D.draft.tot || 0) + (D.pkg.tot || 0);
      return D[g].tot >= tot * 0.05 && !!D[g].rows.length; } },
  { id: "bubble",   name: "Then and now",     build: sBubble },
  { id: "stack",    name: "Volume by month",  build: sStacked,
    rule: "Only when monthly product history is available for this scope",
    met: () => !!D.itemWin },
  { id: "universe", name: "Account universe", build: sUniverse },
  { id: "movers",   name: "Account movement", build: sMovers },
  { id: "lapsed",   name: "Lapsed accounts",  build: sLapsed },
  { id: "recap",    name: "Recap",            build: sRecap },
];
/* SAVE-AS COPIES (Joe, 2026-08-18) — "make the design a NEW available slide".
   A copy is not new code. It is the SAME builder pointed at a different settings entry,
   so `{ id:"overview~2", base:"overview", name:"Overview · one graph" }` plus
   settings["overview~2"] is a whole new slide on the shelf. It inherits the base's rule,
   because the rule is about the data, not about the design.                            */
const COPIES = DEFAULT_VARIANTS.concat(variants || []).map(v => {
  const b = SL.find(s => s.id === v.base);
  if (!b) return null;                                        // a copy of a slide that no longer exists is just dropped
  return { id: v.id, name: v.name || (v.dflt ? b.name : b.name + " copy"), base: b.id, dflt: !!v.dflt, ord: v.ord, made: v.made || null, build: b.build, rule: b.rule, met: b.met };
}).filter(Boolean);

return SL.concat(COPIES).map(d => {
  let html = null;
  try { html = d.build(d.id); } catch { html = null; }       // a slide that can't build is reported, not thrown
  let met = true;
  if (d.met) { try { met = !!d.met(d.id); } catch { met = false; } }
  // `base` is which slide's controls the editor should offer; `custom` is whether this one
  // was made by a person (deleting it really deletes) or is code (deleting it retires).
  return { id: d.id, name: d.name, base: d.base || d.id, custom: !!d.base && !d.dflt, design: designOf(d.base || d.id, d.id), ord: (typeof d.ord === "number" ? d.ord : designOrd(d.base || d.id, d.id)),
      made: d.made || null, rule: d.rule || null, met, html, ok: !!html };
});

}

// What a DECK gets: the slides it asked for, in its order, minus any whose rule
// doesn't pass. Pass no order and you get today's default deck, unchanged.
// Bar WIDTH, and nothing else. The old control had two axes hiding in it — corner shape and
// width — and the shape half never earned its keep (Joe, 2026-08-18). Three widths, one row.
export const BAR_KEYS = [["wide", "Wide"], ["normal", "Normal"], ["thin", "Thin"]];

/* ---------- graph colour ------------------------------------------------------
   A ramp is three tones: the pale bar at the left of the chart, the full bar at the
   right, and the ink the value labels ride in. It can be a NUMBER — a hue straight off
   the editor's slider — or one of the named presets, which are just remembered hues.
   Deriving all three from one hue at fixed saturation/lightness is what makes any colour
   on the slider safe: the pale→full ramp and the label contrast hold everywhere.
   This lives at module scope and is exported so the editor's preview swatches are drawn
   by the SAME function as the chart — a preview that can lie is worse than none.        */
const hslHex = (h, s, l) => {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
};
// The five presets keep their ORIGINAL hand-picked tones — they are what every deck built so
// far looks like, and a slider is no reason to repaint them. A generated ramp only ever comes
// from a raw hue, i.e. only when someone actually drags.
const RAMPS = {
  green: ['#E3F1E4', '#52A97B', '#3F8A63'],
  rose:  ['#FCF1F0', '#E5A29D', '#C0817C'],
  teal:  ['#DCEEF1', '#2F7D8C', '#256A78'],
  amber: ['#FAEEDA', '#C8912A', '#8A6A12'],
  slate: ['#E7E9EC', '#6B7683', '#49525D'],
};
const PRESET_HUE = { green: 150, teal: 190, slate: 212, rose: 5, amber: 41 };   // where each sits on the strip
export const RAMP_PRESETS = [["green", "Green"], ["teal", "Teal"], ["slate", "Slate"], ["rose", "Rose"], ["amber", "Amber"]];
// what a saved value means, whatever shape it arrived in
export const hueOf = v => typeof v === "number" ? ((v % 360) + 360) % 360 : (PRESET_HUE[v] != null ? PRESET_HUE[v] : 150);
export const rampOf = v => typeof v === "number"
  ? (h => [hslHex(h, 42, 92), hslHex(h, 40, 47), hslHex(h, 46, 35)])(hueOf(v))
  : (RAMPS[v] || RAMPS.green);

// What each named region is CALLED. Only the editor uses this — it stamps the name onto the
// rendered block so hovering a region can say which one it is, and clicking it can jump to
// the control that changes it. Deliberately not emitted into the deck HTML: the outline is an
// editing affordance, and the printed deck shouldn't carry a byte of it.
export const BLOCK_NAMES = {
  stats: "Stat row", graph1: "First graph", graph2: "Second graph",
  totals: "52-week strip", text: "Write-up",
};
// which control changes which region, so a click on the slide can point at it
export const BLOCK_CONTROL = { stats: "stats", graph1: "chart", graph2: "chart2", text: "words", totals: null };

// The catalogues of named blocks the Overview can draw. These are what an editor control
// offers, and what a saved list is checked against — the id is the contract, the label is
// only what a human reads. Adding a metric here is all a graph picker needs.
export const OVERVIEW_STATS  = [["cases", "Cases"], ["accounts", "Active accounts"], ["placements", "Placements"], ["ros", "Rate of sale"]];
/* THE STANDARD FOR EVERY GRAPH SLIDE (Joe, 2026-08-19: "for all graphs, lets have this
   standard"). Four settings, one renderer, so a graph slide never invents its own text
   handling again:
     sayAt   above · below · left · right
     say     paragraph · 1, 2 or 3 bullets · none
     gsize   expanded (full width) · centered (pulled in, for a calmer page)
   The COPY still belongs to the slide — only the slide knows its own numbers. A slide hands
   over [{info, sell}] and this picks the voice and shapes it. Nothing is generated: both
   phrasings are written, the setting chooses between them.                                */
export const SAY_AT   = [["above","Above"],["below","Below"],["left","Left"],["right","Right"]];
export const SAY_FORM = [["para","Paragraph"],["b1","1 bullet"],["b2","2 bullets"],["b3","3 bullets"],["none","None"]];
export const GRAPH_SIZE = [["expanded","Expanded"],["centered","Centered"]];
export const SAY_SEGS = [
  { k: "sayAt", label: "TEXT PLACEMENT", dflt: "below", options: SAY_AT },
  { k: "say",   label: "TEXT IS",         dflt: "b3", options: SAY_FORM },
  { k: "gsize", label: "GRAPH SIZE",     dflt: "expanded", options: GRAPH_SIZE },
];

export const OVERVIEW_GRAPHS = [["cases", "Cases per month"], ["accounts", "Active accounts"]];
// What each slide lets you change. Capability is DECLARED here — the editor reads this and
// draws the controls, so extending a slide is a line in this table, not new machinery.
// THE THREE DESIGNS ARE AN ORDER, NOT A SET OF NAMES (Joe, 2026-08-18). They run quiet →
// loud, and that position is their whole identity: nobody using this needs to be told which
// one is "the conservative one". The keys stay descriptive because they're code, not labels.
// Editorial is still the default because it is what shipped — a deck built before this
// existed comes out unchanged.
export const DESIGN_KEYS = [["boardroom", "1"], ["modern", "2"], ["editorial", "3"]];

// What each ROW of the shelf is called. A row is a slide type and the tiles across it are its
// designs, so this is the name of the KIND of slide, not of any one of them (Joe, 2026-08-18:
// "you can call the row covers. second row is growth step, third row will be ranks").
// Anything not named here falls back to the slide's own name.
// the cover's removable pieces — the scope name itself is the slide, so it isn't in the list
export const COVER_PARTS = [["eyebrow", "“Business Review”"], ["mark", "Logo"], ["sub", "Subtitle"], ["period", "Date range"], ["source", "Source line"]];
export const TITLE_SIZES = [["s", "Small"], ["m", "Medium"], ["l", "Large"]];

// Three registers per slide type. The ORIGINAL keeps its place in the list — for the item
// ranking that's utilitarian, because the slide grew out of a distributor report.
export const ITEM_DESIGNS = [["utilitarian", "1"], ["modern", "2"], ["bold", "3"]];

/* WHICH THREE EACH TYPE HAS, AND WHICH ONE THE BASE SLIDE ALREADY IS. The base keeps the
   original design — that was the standing rule — so the two default variants carry the other
   two. Generating them here rather than by hand means adding a type is one line in each map. */
const DESIGN_LIST = { cover: DESIGN_KEYS, overview: DESIGN_KEYS, items: ITEM_DESIGNS, brand: ITEM_DESIGNS,
                      universe: ITEM_DESIGNS, movers: ITEM_DESIGNS, lapsed: ITEM_DESIGNS, recap: ITEM_DESIGNS };
const BASE_DESIGN  = { cover: "editorial", overview: "editorial", items: "utilitarian", brand: "bold",
                       universe: "utilitarian", movers: "utilitarian", lapsed: "utilitarian", recap: "bold" };
/* A default variant that differs by more than its register. Item ranking ships one of its
   three on the Package side of the book rather than Draft, and the three growth steps draw in
   three different ramps — Joe, 2026-08-19: "again just visual differentiation. great for
   demos." Anything seeded here is still only a SETTING; the slide is the same builder. */
const SEED = { "items:modern": { pack: "pkg" },
               "overview:boardroom": { chart: "slate", chart2: "teal" },
               "overview:modern":    { chart: "amber", chart2: "amber" } };
export const designListOf = (base) => DESIGN_LIST[base] || DESIGN_KEYS;
for (const base of Object.keys(DESIGN_LIST)) {
  DEFAULT_VARIANT_SETTINGS[base] = { design: BASE_DESIGN[base] };          // the base IS a design
  designListOf(base).map(x => x[0]).filter(k => k !== BASE_DESIGN[base]).forEach((k, i) => {
    const id = `${base}~d${i + 1}`;
    DEFAULT_VARIANTS.push({ id, base, dflt: true });
    DEFAULT_VARIANT_SETTINGS[id] = Object.assign({ design: k }, SEED[`${base}:${k}`] || {});
  });
}

/* THREE PER SET (Joe, 2026-08-19: "only three standard slides per set for now"). The extra
   Package-at-design-1 tile is gone. The standard deck still needs both sides of the book, so it
   now takes Package from `items~d1` — which is already the Package cut, at design 2. See the
   note on STANDARD_DECK below: this is the one place the deck drifts from what Joe specced. */

/* DECK-LEVEL OVERRIDES (Joe, 2026-08-19). A deck entry may change WHAT a slide reads — the side
   of the book, the scope, the measure, the window — and never how it LOOKS. Design, colour and
   the text settings belong to the template, so a deck cannot quietly restyle a slide behind the
   Library's back; edit it in the Library and every deck follows. "Duplicate in the deck and
   customise the other one" is exactly this: the same slide id twice, with a different `over`.

   An override is not a new kind of thing — it is a variant that exists only while that deck
   renders, which is why it costs no new builder and no new shelf tile.                      */
export const DECK_OVERRIDABLE = ["pack", "cut", "measure", "split", "span"];

const normalizeOrder = (order) => (order || []).map((e, i) => {
  if (typeof e === "string") return { id: e, key: e, over: null };
  const over = {};
  for (const k of DECK_OVERRIDABLE) if (e.over && e.over[k] !== undefined) over[k] = e.over[k];
  const any = Object.keys(over).length > 0;
  return { id: e.id, key: any ? `${e.id}#${i}` : e.id, over: any ? over : null };
});

/* THE STANDARD DECK (Joe, 2026-08-19) — booked until he says otherwise. Positions are the ones
   shown in the Library row, so "brand story 2" is literally the second tile in that row. Nothing
   outside this list is exported; the other slides stay on the shelf to be picked by hand. */
export const STANDARD_DECK = [
  "cover",        // 3 · editorial
  "overview",     // 3 · editorial
  "brand~d2",     // 2 · modern
  "items",                                  // 1 · utilitarian, Draft
  // the same slide, the other side of the book — no fourth shelf tile needed for it
  { id: "items", over: { pack: "pkg" } },   // 1 · utilitarian, Package
  "universe~d2",  // 3 · bold
  "movers",       // 1 · utilitarian
  "lapsed~d1",    // 2 · modern
  "recap~d1",     // 1 · utilitarian
];

export const ROW_NAMES = {
  cover: "Covers",
  overview: "Growth step",
  brand: "Brand story",
  items: "Ranks",
  universe: "Account universe",
  movers: "Account movement",
  lapsed: "Lapsed accounts",
  recap: "Recap slides",
  recap: "Recap slides",
};
export const SLIDE_CONTROLS = {
  cover: { design: true, brow: true, titleSize: true, parts: COVER_PARTS },
  items: { pack: true, design: ITEM_DESIGNS, chart: "Bar colours" },
  /* ONE GENERIC `segs` LIST, NOT FIVE BESPOKE CONTROLS. The editor names every control key
     explicitly, so each new knob used to cost an editor block. `segs` renders any [{k,label,
     options}] as chip rows, which means a new slide's settings are now free.              */
  /* THE ORDER JOE SET: Shows · Scope (+ its value) · Time frame · Text placement · Text is ·
     Graph size. `cut` renders the scope pair, so it sits where scope belongs in the list. */
  bubble: { chart: "Circle colour", cut: true, cutAfter: "measure", segs: [
    { k: "measure", label: "SHOWS", dflt: "accounts", options: [["cases","Cases"],["accounts","Accounts"],["placements","Placements"],["ros","Rate of sale"]] },
  ].concat(SAY_SEGS) },
  stack: { chart: "Bar colours", cut: true, cutAfter: "split", segs: [
    { k: "split",  label: "SPLIT BY",  dflt: "package", options: [["package","Draft / package"],["style","Style"],["brand","Brand"]] },
    { k: "span",   label: "TIME FRAME", dflt: "12", options: [["3","3"],["6","6"],["12","12"],["18","18"]] },
    { k: "mode",   label: "COLUMNS",   dflt: "stack", options: [["stack","Stacked"],["share","100%"]] },
    { k: "bands",  label: "SEGMENTS",  dflt: "4", options: [["2","2"],["3","3"],["4","4"],["5","5"],["6","6"]] },
    { k: "labels", label: "NUMBERS",   dflt: "on", options: [["on","On"],["off","Off"]] },
  ].concat(SAY_SEGS) },
  universe: { design: ITEM_DESIGNS, chart: "Chart colour" },
  brand: { design: ITEM_DESIGNS, chart: "Bar colours" },
  movers: { design: ITEM_DESIGNS, chart: "Bar colours" },
  lapsed: { design: ITEM_DESIGNS, chart: "Bar colours" },
  recap: { design: ITEM_DESIGNS, chart: "Chart colour" },
  overview: { voice: true, words: true, cut: true, bullets: [1, 2, 3, 4], title: "Overview", layout: true, bar: true,
              stats: OVERVIEW_STATS, graphs: OVERVIEW_GRAPHS, chart: "Graph 1 color", chart2: "Graph 2 color" },
};

export function selectDeckSlides(all, order) {
  const by = {}; for (const s of all) by[s.id] = s;
  // A deck with no explicit order is the STANDARD deck. It used to mean "every slide", which
  // quietly turned the export into all 24 shelf tiles once each type grew three designs.
  // renderDeck hands over plain keys; a caller reaching straight for STANDARD_DECK gets the
  // bare ids, which is the right fallback — it just loses the per-entry overrides.
  const ids = ((order && order.length) ? order : STANDARD_DECK).map(e => (typeof e === "string" ? e : e.id));
  return ids.map(id => by[id]).filter(s => s && s.ok && s.met);
}

// Back-compat: the deck view and the pptx path still just want HTML, in order.
export function renderDeck(D, logoSrc, brandName, settings, order, variants) {
  const ord = normalizeOrder(order && order.length ? order : STANDARD_DECK);
  // an entry that overrides anything becomes a variant for the length of this render only
  const xVars = [], xSet = Object.assign({}, settings || {});
  for (const e of ord) {
    if (!e.over) continue;
    xVars.push({ id: e.key, base: String(e.id).split("~")[0], dflt: true });
    xSet[e.key] = Object.assign({}, DEFAULT_VARIANT_SETTINGS[e.id] || {}, xSet[e.id] || {}, e.over);
  }
  const all = renderDeckSlides(D, logoSrc, brandName, xSet, (variants || []).concat(xVars));
  return selectDeckSlides(all, ord.map(e => e.key)).map(s => s.html);
}
