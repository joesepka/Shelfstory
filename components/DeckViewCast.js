"use client";
import { useMemo, useRef } from "react";
import { BASE } from "../lib/basePath";
import { BRANDS } from "../lib/brand";
import { defaultBrandKey } from "../lib/profile";
import { createPortal } from "react-dom";
import { renderDeck } from "./deckSlidesCast";
import { useEffect, useState } from "react";
const X = ({ size = 16, strokeWidth = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
);

// Full-screen deck. PDF export is a REAL file: each slide is re-rendered offscreen at its
// native 940px (no phone zoom in the way), rasterized, and packed into a downloadable PDF —
// on phones this runs automatically as soon as the deck opens (Joe's call: browser
// print-to-PDF mangled the spacing on phones).
export default function DeckView({ data, onClose, brand }) {
  /* All three of these were Blind Corner constants: the asset path, the fallback brand key
     and the display name. On any other client that is a 404 logo and the wrong company on
     every slide (Joe, 2026-08-20). */
  const bk = brand || defaultBrandKey;
  const LOGO = `${BASE}/brand/${bk}/logo.png`;
  const html = useMemo(() => (data ? renderDeck(data, LOGO, (BRANDS[bk] || {}).name || "").join("") : ""), [data, LOGO]);
  // phone: shrink the 940px slides to the screen (the offscreen PDF pass never sees this zoom)
  const [zoom, setZoom] = useState(1);
  const [pdfMsg, setPdfMsg] = useState(null);
  // on a phone the shrunken slides look broken while the PDF is being rasterized —
  // keep them out of sight until the file lands (Joe, 2026-08-16)
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && window.innerWidth < 956);
  const building = useRef(false);
  const autoRan = useRef(false);
  useEffect(() => {
    const m = () => setZoom(Math.min(1, (window.innerWidth - 8) / 956));
    m(); window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);

  const fileName = data ? `${String(data.scope.name).replace(/[^\w]+/g, "_")}_Business_Review` : "Business_Review";

  const buildPdf = async () => {
    if (building.current) return;
    building.current = true;
    setPdfMsg("Preparing PDF…");
    let host = null;
    try {
      const [h2cMod, pdfMod] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const html2canvas = h2cMod.default || h2cMod;
      const { jsPDF } = pdfMod;
      // offscreen, unzoomed copy of the slides — the .deckPages style block applies to it too
      host = document.createElement("div");
      host.className = "deckPages";
      host.style.cssText = "position:fixed;left:-99999px;top:0;width:940px;";
      host.innerHTML = html;
      document.body.appendChild(host);
      const imgs = [...host.querySelectorAll("img")];
      await Promise.all(imgs.map(im => (im.complete ? null : new Promise(res => { im.onload = im.onerror = res; }))));
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await new Promise(r => setTimeout(r, 120));
      const slides = [...host.querySelectorAll(".slide")];
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [940, 726], hotfixes: ["px_scaling"], compress: true });
      for (let i = 0; i < slides.length; i++) {
        setPdfMsg(`Preparing PDF… ${i + 1}/${slides.length}`);
        const cv = await html2canvas(slides[i], { scale: 2, backgroundColor: "#ffffff", logging: false });
        if (i > 0) pdf.addPage([940, 726], "landscape");
        pdf.addImage(cv.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 940, 726);
      }
      pdf.save(`${fileName}.pdf`);
      setPdfMsg(null);
    } catch (err) {
      console.error("pdf export failed", err);
      setPdfMsg("PDF failed — tap PDF to retry");
      setTimeout(() => setPdfMsg(null), 2600);
    }
    if (host) host.remove();
    building.current = false;
    setHidden(false);   // file's done — now the preview is worth looking at
  };

  // phones: the PDF starts building itself the moment the deck opens.
  // No cleanup on purpose — strict-mode's dev double-mount would cancel the timer
  // and the latch would block the re-run, so the build would never start.
  useEffect(() => {
    if (!data || autoRan.current) return;
    if (typeof window !== "undefined" && window.innerWidth < 956) {
      autoRan.current = true;
      setTimeout(buildPdf, 400);
    }
  }, [data]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;

  // Portaled to <body> so the print CSS can isolate the deck (page breaks only work in-flow,
  // and hiding body children would otherwise hide the deck's own ancestors).
  return createPortal(
    <div className="deckRoot" style={{ position: "fixed", inset: 0, zIndex: 60, background: "#8A8A8A", display: "flex", flexDirection: "column" }}>
      <style>{`
        @page { size: 11in 8.5in; margin: .18in; }
        /* the slide markup carries its own palette — scope those tokens to the deck only */
        .deckPages{--ink:#0A0A0A;--pink:#EDB3B0;--pink2:#D98F8A;--pinkPale:#FCF1F0;--grey:#6E6E6E;--grey2:#9A9A9A;
          --rule:#E3E3E3;--ruleLt:#EFEFEF;--up:#2E7D52;--upL:#C7E0D2;--dn:#C0564E;--dnL:#EBCCC7;--green:#52A97B;
          --lite:#BFD9C9;--prior:#BDBDBD;--new:#4F8F52;--teal:#2F7D8C;--tealLt:#A9CFD7;--fcBlue:#5B6BD0;
          --warm:#B5817A;--warmD:#8B3A2B;--disp:'Arial Black','Helvetica Neue',Arial,sans-serif;}
        .deckPages .slide{width:940px;height:726px;background:#fff;margin:0 auto 16px;position:relative;overflow:hidden;
          color:#0A0A0A;font-family:Arial,Helvetica,sans-serif;box-shadow:0 2px 14px rgba(0,0,0,.28)}
        .deckPages .lbl{font-size:8.5px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:#9A9A9A}
        .deckPages .fig{font-family:'Arial Black','Helvetica Neue',Arial,sans-serif;letter-spacing:-1px;line-height:.94}
        .deckPages .dlt{font-size:10.5px;font-weight:700}
        .deckPages .up{color:#2E7D52}.deckPages .dn{color:#C0564E}
        .deckPages .tag{font-size:6.3px;font-weight:700;letter-spacing:.35px;text-transform:uppercase;border-radius:3px;padding:1.2px 4px;white-space:nowrap;flex-shrink:0}
        .deckPages .tier{font-size:6.4px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;border-radius:3px;padding:1.2px 4px;background:#F4EAD6;color:#8A6A12;flex-shrink:0}
        .deckPages .rw{display:flex;align-items:center;gap:8px;height:23px;border-bottom:1px solid #EFEFEF}
        .deckPages .cNm{width:150px;flex-shrink:0;min-width:0;display:flex;align-items:center;gap:5px}
        .deckPages .cNm b{font-size:9.2px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .deckPages .cTrk{flex:1;min-width:0;position:relative;height:14px}
        .deckPages .plot{position:absolute;left:30px;right:30px;top:0;bottom:0}
        .deckPages .cDel{width:34px;text-align:right;font-size:9.5px;font-weight:700;flex-shrink:0}
        .deckPages .cSku{width:44px;text-align:right;font-size:8.8px;flex-shrink:0;white-space:nowrap}
        .deckPages table{border-collapse:collapse}
        .deckScroll{scrollbar-width:none;-ms-overflow-style:none}.deckScroll::-webkit-scrollbar{display:none}
        @media print{
          .deckPages{zoom:1 !important}
          body > *:not(.deckRoot){display:none !important}
          .deckRoot{position:static !important;background:#fff !important;height:auto !important}
          .deckBar{display:none !important}
          .deckPages{overflow:visible !important;padding:0 !important;background:#fff !important}
          .deckPages .slide{margin:0 !important;box-shadow:none !important;page-break-after:always;break-after:page}
          .deckPages .slide:last-child{page-break-after:auto}
        }
      `}</style>
      <div className="deckBar" style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", background: "#1C1C1C", color: "#fff" }}>
        <button onClick={onClose} title="Close"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 999, border: "none", background: "#333", color: "#fff", cursor: "pointer" }}>
          <X size={16} strokeWidth={2.2} />
        </button>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {data.scope.name}<span style={{ color: "#9A9A9A", fontWeight: 400 }}> · business review</span>
        </div>
        <div style={{ flex: 1 }} />
        {zoom >= 1 && <button onClick={async (e) => {
            const btn = e.currentTarget; const t0 = btn.textContent; btn.textContent = "Building…";
            try {
              const [pgMod, builder] = await Promise.all([import("pptxgenjs"), import("../lib/deckPptx")]);
              // brand logo rides along as an embedded image (skipped quietly if the asset is absent)
              let logoData = null;
              try {
                const blob = await fetch(LOGO).then(r => (r.ok ? r.blob() : null));
                if (blob) logoData = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).replace(/^data:/, "")); fr.readAsDataURL(blob); });
              } catch {}
              const pres = await builder.deckToPptx(pgMod.default || pgMod, data, { snapLabel: data.dataThru, universe: brand === "torch" ? "Torch" : "Blind Corner", logoData });   // profile-literal-ok — passes the resolved brand name through, not a literal
              await pres.writeFile({ fileName: `${fileName}.pptx` });
            } catch (err) { console.error("pptx export failed", err); }
            btn.textContent = t0;
          }}
          title="Native PowerPoint — every chart, table and shape stays editable"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, border: "none", background: "#C9D8F0", color: "#0A0A0A", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginRight: 8 }}>
          PowerPoint
        </button>}
        <button onClick={buildPdf}
          title="Download the deck as a PDF file"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, border: "none", background: "#EDB3B0", color: "#0A0A0A", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          {pdfMsg || "PDF"}
        </button>
      </div>
      {hidden && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#fff", padding: 30, textAlign: "center" }}>
          <svg width="46" height="46" viewBox="0 0 50 50" aria-hidden="true" style={{ animation: "deckSpin 1.1s linear infinite" }}>
            <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="4" />
            <path d="M25 5 a20 20 0 0 1 20 20" fill="none" stroke="#EDB3B0" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700 }}>{pdfMsg || "Building your PDF…"}</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "rgba(255,255,255,.6)", maxWidth: 260, lineHeight: 1.45 }}>
            {data.scope.name} · business review. It'll download on its own in a few seconds.
          </div>
          <style>{`@keyframes deckSpin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      <div className="deckPages deckScroll" style={{ flex: 1, overflowY: "auto", padding: "22px 0 40px", zoom, display: hidden ? "none" : "block" }}
        dangerouslySetInnerHTML={{ __html: html }} />
    </div>,
    document.body
  );
}
