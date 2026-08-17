// AUTO-PORTED from the approved deck mockups. Each renderer returns one slide's HTML;
// renderDeck(D, logoSrc) returns the slides in order, skipping any with no real data.
/* eslint-disable */
import { SNAP_LABEL } from "../lib/snapshot.js";
export function renderDeck(D, logoSrc) {
  const LOGO = logoSrc || "/blindcorner/mobile/brand/blindcorner/logo.png";
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
const wrap=b=>`<div class="slide"><div style="padding:28px 44px 16px;height:100%;display:flex;flex-direction:column">${b}</div>
 <div style="position:absolute;right:14px;bottom:8px;font-size:6px;font-weight:700;letter-spacing:1.4px;color:#CFCFCF">SHELFSTORY</div></div>`;

/* ---------- charts ---------- */
const CW=600,PL=4,PR=40,PT=18,PB=26;
function barChart(o){
  const H=o.h||150, pw=CW-PL-PR, ph=H-PT-PB, n=o.vals.length, step=pw/n, bw=Math.min(step*0.62,32), mx=Math.max(...o.vals,1);
  let s='<svg viewBox="0 0 '+CW+' '+H+'" style="width:100%;height:'+H+'px;display:block" preserveAspectRatio="none">';
  s+='<line x1="'+PL+'" y1="'+(PT+ph)+'" x2="'+(PL+pw)+'" y2="'+(PT+ph)+'" stroke="#E8E8E8"/>';
  o.vals.forEach((v,i)=>{const t=Math.pow(i/(n-1||1),1.2),c=mix(o.c[0],o.c[1],t),bh=Math.max(2,(v/mx)*ph),x=PL+i*step+(step-bw)/2,y=PT+ph-bh;
    s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="2.5" fill="'+c+'"/>';
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
const casesChart=h=>barChart({vals:D.hist.slice(-12).map(v=>Math.round(v)),labels:D.months,yr:D.yr,c:['#E3F1E4','#52A97B'],lab:'#3F8A63',fmt:kf,h});
const acctChart =h=>barChart({vals:D.accSeries,labels:D.months,yr:D.yr,c:['#FCF1F0','#E5A29D'],lab:'#C0817C',line:D.rosSeries,h});
const gHead=(t,sub,legend)=>'<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1px;padding-right:'+(PR/CW*100).toFixed(2)+'%">'
  +'<span class="lbl">'+t+' <span style="color:#C4C4C4;font-weight:400;letter-spacing:0;text-transform:none">'+sub+'</span></span>'
  +(legend?'<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:14px;height:2.5px;background:var(--up)"></span><span style="font-size:8px;font-weight:700;color:var(--up)">cases / acct / mo</span></span>':'')+'</div>';

/* ---------- 1 · cover (watermark) ---------- */
function sTitle(){
  return `<div class="slide"><div style="height:100%;position:relative;overflow:hidden;padding:52px 56px 38px;display:flex;flex-direction:column">
   <img src="/blindcorner/mobile/brand/blindcorner/logo.png" style="position:absolute;right:-150px;top:-90px;height:720px;opacity:.10">
   <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start">
     <div style="font-size:9.5px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;color:var(--grey2)">Business Review</div>
     ${logo(70)}
   </div>
   <div style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center">
     <div class="fig" style="font-size:92px;letter-spacing:-1.5px;line-height:.9">${D.scope.name.toUpperCase()}</div>
     <div style="height:3px;width:110px;background:var(--pink);margin:24px 0 20px"></div>
     <div style="font-size:16px;color:var(--grey)">${D.scope.sub} &nbsp;·&nbsp; ${PERIOD}</div>
   </div>
   <div style="position:relative;font-size:9.5px;color:var(--grey2)">Prepared from distributor depletion reporting through the snapshot date &nbsp;·&nbsp; Blind Corner Brewery</div>
  </div></div>`;
}

/* ---------- 2 · overview ---------- */
function sOverview(){
  const S4=[[M.stat,fmt(D.cur90),D.casesPct,"vs "+fmt(D.prev90)+" "+M.cmpShort],
            ["Active accounts",fmt(D.accts),D.acctsPct,"of "+D.withHist+" with history"],
            ["Placements",fmt(D.plN),D.plcPct,"account × SKU pairs"],
            ["Cases / acct / mo",D.ros,null,"vs "+D.rosPrev+" prior 90"]];
  const bullets=[
    `<b>Volume is ${D.casesPct>=0?'up':'down'} ${Math.abs(D.casesPct)}% ${M.over}.</b> ${D.scope.name} shipped ${fmt(D.cur90)} cases in the ${PERIOD}, against ${fmt(D.prev90)} in the ${M.cmpShort}.`,
    `<b>${D.accts} accounts ordered in the window</b>${D.acctsPct!=null?` (${D.acctsPct>=0?'up':'down'} ${Math.abs(D.acctsPct)}%)`:''}, carrying ${fmt(D.plN)} placements — the count of account-and-SKU pairs that moved — ${D.plcPct>=0?'up':'down'} ${Math.abs(D.plcPct)}%.`,
    `<b>Rate of sale ${D.ros>=D.rosPrev?'held at':'eased to'} ${D.ros} cases per account per month</b> against ${D.rosPrev} in the prior quarter.`,
    `<b>The trailing 52 weeks total ${fmt(D.l52)} cases</b> versus ${fmt(D.p52)} the year before${D.lapN?`; ${D.lapN} account${D.lapN===1?'':'s'} ${D.lapN===1?'has':'have'} gone quiet and ${D.lapN===1?'is':'are'} counted lapsed.`:'.'}`,
  ];
  return wrap(`${head(D.scope.name.toUpperCase()+" OVERVIEW",PERIOD+" · "+D.scope.sub)}
   <div style="padding:15px 0 13px">${S4.map((s,i)=>'').join('')}
     <div style="display:flex">${S4.map((s,i)=>
      `<div style="flex:1;text-align:center;${i?'border-left:1px solid var(--ruleLt);':''}">
        <div class="lbl">${s[0]}</div>
        <div style="display:flex;align-items:baseline;gap:8px;margin-top:6px;justify-content:center">
          <span class="fig" style="font-size:33px">${s[1]}</span>
          ${s[2]!=null?'<span class="dlt '+sgn(s[2])+'">'+arrow(s[2])+' '+Math.abs(s[2])+'%</span>':''}</div>
        <div style="font-size:8.5px;color:var(--grey2);margin-top:4px">${s[3]}</div></div>`).join('')}</div></div>
   <div style="height:1px;background:var(--rule)"></div>
   <div style="flex:1;display:flex;gap:28px;padding-top:12px;min-height:0">
     <div style="width:31%;display:flex;flex-direction:column;justify-content:center">
       <div class="lbl" style="margin-bottom:12px">What's going on</div>
       ${bullets.map((b,i)=>`<div style="display:flex;gap:10px;margin-bottom:15px">
         <span class="fig" style="font-size:13px;color:var(--pink2);width:14px;flex-shrink:0">${i+1}</span>
         <span style="font-size:11.3px;line-height:1.48;color:#2B2B2B">${b}</span></div>`).join('')}
     </div>
     <div style="width:1px;background:var(--ruleLt)"></div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column">
       <div>${gHead('Cases sold per month','· 12 months')}${casesChart(148)}</div>
       <div style="margin-top:10px">${gHead('Active accounts','· rolling 90 days',1)}${acctChart(148)}</div>
       <div style="border-top:1px solid var(--rule);margin-top:11px;padding-top:11px;display:flex;padding-right:${(PR/CW*100).toFixed(2)}%">
         <div style="flex:1;text-align:center"><div class="lbl">52-week cases · actual</div>
           <div class="fig" style="font-size:25px;margin-top:5px">${fmt(D.l52)}</div>
           <div class="dlt ${sgn(D.l52Pct)}" style="margin-top:5px">${arrow(D.l52Pct)} ${Math.abs(D.l52Pct)}%</div>
           <div style="font-size:8px;color:var(--grey2);margin-top:4px">vs ${fmt(D.p52)} prior year</div></div>
         <div style="width:1px;background:var(--ruleLt)"></div>
         <div style="flex:1;text-align:center"><div class="lbl" style="color:var(--fcBlue)">52-week cases · forecast</div>
           <div class="fig" style="font-size:25px;margin-top:5px;color:var(--fcBlue)">${fmt(D.fc52)}</div>
           <div class="dlt" style="margin-top:5px;color:var(--fcBlue)">${arrow(D.fcPct)} ${Math.abs(D.fcPct)}%</div>
           <div style="font-size:8px;color:#8990BE;margin-top:4px">next 12 months vs trailing 52</div></div>
       </div>
     </div>
   </div>${foot()}`);
}

/* ---------- 3/4 · items ---------- */
function sItems(seg,label){
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
  return wrap(`${head(label.toUpperCase()+" OVERVIEW",D.scope.name+" · "+PERIOD+" · "+s.all+" "+label.toLowerCase()+" brands with volume")}
   <div style="display:flex;align-items:baseline;gap:12px;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:9px 0">
     <span class="lbl">Total ${label.toLowerCase()} cases · ${M.winShort}</span>
     <span class="fig" style="font-size:23px">${fmt(s.tot)}</span>
     <span class="dlt ${sgn(s.pct)}">${arrow(s.pct)} ${Math.abs(s.pct)}%</span>
     <span style="font-size:8.5px;color:var(--grey2)">vs ${fmt(s.totP)} ${M.cmpShort}</span></div>
   <div style="flex:1;display:flex;gap:26px;padding-top:13px;min-height:0">
     <div style="width:50%;display:flex;flex-direction:column;min-width:0">
       <div class="lbl" style="margin-bottom:7px">Top ${s.rows.length} brand${s.rows.length===1?'':'s'} by ${M.stat}</div>
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
       </table>
       <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:12px 0 4px">
         <div class="lbl" style="margin-bottom:8px">What's going on</div>
         ${bullets.map((b,i)=>`<div style="display:flex;gap:9px;margin-bottom:9px">
           <span class="fig" style="font-size:11px;color:var(--pink2);width:12px;flex-shrink:0">${i+1}</span>
           <span style="font-size:10.2px;line-height:1.46;color:#2B2B2B">${b}</span></div>`).join('')}
       </div>
     </div>
     <div style="width:1px;background:var(--ruleLt)"></div>
     <div style="flex:1;min-width:0;display:flex;flex-direction:column">
       <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px">
         <span class="lbl">Rate of sale · top ${top6.length}${M.dflt?'':' · last 90 days'}</span>
         <span style="font-size:8px;color:var(--grey2)">dotted line = ${top6[0].n}</span></div>
       ${rosSvg}
       <!-- (style-mix stacked bar removed 2026-08-16 at Joe's request) -->
     </div>
   </div>${foot(SRC+" Brands aggregate every "+label.toLowerCase()+" format they sell in. Accounts = accounts that ordered the brand in the window.")}`);
}

/* ---------- 5 · universe ---------- */
function sUniverse(){
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
  const typeTot=Math.max(...D.types.map(t=>t.l52),1);
  return wrap(`${head("ACCOUNT UNIVERSE",D.scope.name+" · "+PERIOD+" · "+D.withHist+" accounts with history")}
   <div style="display:flex;align-items:baseline;gap:12px;border-top:2px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:11px;padding:9px 0">
     <span class="lbl">Active accounts · 90 days</span><span class="fig" style="font-size:23px">${D.accts}</span>
     ${D.acctsPct!=null?'<span class="dlt '+sgn(D.acctsPct)+'">'+arrow(D.acctsPct)+' '+Math.abs(D.acctsPct)+'%</span>':''}
     <span style="font-size:8.5px;color:var(--grey2)">of ${D.withHist} with history · ${fmt(D.totL52)} cases over 52 weeks · ${D.ros} cases per account per month</span></div>
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
       <div style="padding-bottom:10px">
         ${bl.map((b,i)=>`<div style="display:flex;gap:9px;margin-bottom:7px">
           <span class="fig" style="font-size:11px;color:var(--pink2);width:12px;flex-shrink:0">${i+1}</span>
           <span style="font-size:10.2px;line-height:1.45;color:#2B2B2B">${b}</span></div>`).join('')}</div>
       <div style="flex:1;min-height:0;border-top:1px solid var(--rule);padding-top:10px;display:flex;flex-direction:column;justify-content:space-evenly">
         ${panels.map(([t,svg],i)=>`<div${i?' style="padding-top:10px;border-top:1px solid var(--ruleLt)"':''}>
           <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px">
             <span class="lbl">${t}</span><span style="font-size:7.8px;color:var(--grey2)">ordered by volume</span></div>
           ${svg}</div>`).join('')}</div>
     </div>
   </div>
   ${foot()}`);
}

/* ---------- 6 · movers ---------- */
function sMovers(){
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
  return wrap(`${head("ACCOUNT MOVEMENT",D.scope.name+" · "+PERIOD+" · "+M.cmpNoun+" ○ against "+M.winNoun+" ●")}
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
   </div>
   ${foot(SRC+" Δ SKUs is the change in the count of distinct items the account bought."+(D.outlier?` <b>${D.outlier.n} (${fmt(D.outlier.prev)} → ${fmt(D.outlier.cur)} cases, +${fmt(D.outlier.d)}) is excluded from the lists</b> because its scale compresses every other account; it remains in all totals above.`:""))}`);
}

/* ---------- 7 · lapsed ---------- */
function sLapsed(){
  if(D.lapN < 2) return "";   // not worth a page
  const mxL=Math.max(...D.lapsed.map(t=>t.life),1);
  const winnable=D.qBands[0].n+D.qBands[1].n, winnableV=D.qBands[0].v+D.qBands[1].v;
  const mxC=Math.max(...D.lapChan.map(c=>c.v),1);
  return wrap(`${head("LAPSED ACCOUNTS",D.scope.name+" · no order in the "+(M.dflt?PERIOD.toLowerCase():"last 90 days"))}
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
   </div>${foot(SRC+" Cases shown are what the account bought across the 24 months on file. Months quiet counts from its last order. Top tier flags the largest by lifetime volume.")}`);
}

/* ---------- 8 · recap ---------- */
function sRecap(){
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
  return wrap(`${head("WHERE TO SPEND THE QUARTER",D.scope.name+" · "+PERIOD+" · opportunities and headwinds")}
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
   </div>${foot("Every figure on this page is drawn from distributor depletion reporting through the snapshot date and appears on an earlier slide. "+SRC.replace('Source: distributor depletion reporting through the snapshot date. ',''))}`);
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
function sBrandStory(){
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
    // prior sits just behind and left, in grey — the movement reads instantly
    sv+='<rect x="'+(cx-bw2*0.94).toFixed(1)+'" y="'+(pt2+ph2-hP).toFixed(1)+'" width="'+(bw2*0.5).toFixed(1)+'" height="'+hP.toFixed(1)+'" rx="2" fill="#E1E4DF"/>';
    sv+='<rect x="'+(cx-bw2*0.4).toFixed(1)+'" y="'+(pt2+ph2-hC).toFixed(1)+'" width="'+bw2.toFixed(1)+'" height="'+hC.toFixed(1)+'" rx="2.5" fill="'+(i===0?'var(--up)':'var(--green)')+'" opacity="'+(i===0?1:0.86-i*0.07)+'"/>';
    sv+='<text x="'+(cx+bw2*0.1).toFixed(1)+'" y="'+(pt2+ph2-hC-7).toFixed(1)+'" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#0A0A0A">'+fmt(s2.cur)+'</text>';
    sv+='<text x="'+cx.toFixed(1)+'" y="'+(pt2+ph2+16)+'" text-anchor="middle" font-family="Arial" font-size="9.6" font-weight="bold" fill="#2B2B2B">'+s2.k+'</text>';
    if(s2.pct!=null) sv+='<text x="'+cx.toFixed(1)+'" y="'+(pt2+ph2+30)+'" text-anchor="middle" font-family="Arial" font-size="9.4" font-weight="bold" fill="'+(s2.pct>0?'#2E7D52':s2.pct<0?'#C0564E':'#9A9A9A')+'">'+arrow(s2.pct)+Math.abs(s2.pct)+'%</text>';
    sv+='<text x="'+cx.toFixed(1)+'" y="'+(pt2+ph2+43)+'" text-anchor="middle" font-family="Arial" font-size="8.4" fill="#9A9A9A">'+s2.acc+' accts</text>';
  });
  sv+='</svg>';
  return wrap(`${head("THE BRAND STORY",D.scope.name+" · "+PERIOD+" · "+D.scope.sub)}
   <div style="border-top:2px solid var(--ink);margin-top:11px;padding:15px 0 14px;border-bottom:1px solid var(--rule)">
     <div style="font-size:20px;line-height:1.32;max-width:840px">${lead}</div>
   </div>
   <div style="display:flex;margin:18px 0 4px">
     ${stat("Accounts carrying",fmt(D.accts),fmt(D.acctsP),D.acctsPct,(D.accts-D.acctsP>0?'+'+(D.accts-D.acctsP)+' accounts':''),false)}
     ${stat("Placements on shelf",fmt(D.plN),fmt(D.plP),D.plcPct,(D.plN-D.plP>0?'+'+fmt(D.plN-D.plP)+' facings':''),true)}
     ${stat("Rate of sale · cases / acct / mo",D.ros,D.rosPrev,rp,"each door working harder",true)}
   </div>
   <div style="flex:1;display:flex;flex-direction:column;border-top:1px solid var(--rule);margin-top:16px;padding-top:14px">
     <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px">
       <span class="lbl">What's carrying it · by style</span>
       <span style="display:inline-flex;align-items:center;gap:12px;font-size:8px;color:var(--grey2)">
         <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:9px;height:9px;background:var(--green);border-radius:2px"></span>${M.winShort}</span>
         <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:9px;height:9px;background:#E1E4DF;border-radius:2px"></span>${M.cmpShort}</span>
       </span></div>
     <div style="flex:1;min-height:0">${sv}</div>
   </div>
   ${foot(SRC+" Placements count account-and-SKU pairs that moved in the window. Styles aggregate every brand and format selling in that style across the scope.")}`);
}

/* ---------- assemble; skip anything with no real data ---------- */
const slides=[sTitle(), sOverview()];
if(brandStoryOK()) slides.push(sBrandStory());
if(D.draft.tot >= D.pkg.tot*0.05 && D.draft.rows.length) slides.push(sItems("draft","Draft"));
if(D.pkg.tot   >= D.draft.tot*0.05 && D.pkg.rows.length) slides.push(sItems("pkg","Package"));
slides.push(sUniverse(), sMovers(), sLapsed(), sRecap());
return slides.filter(Boolean);

}
