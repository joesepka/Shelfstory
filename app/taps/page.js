"use client";
// TAP SAMPLER — five candidate press feelings for the app, one per card. Throwaway page:
// open /taps on the phone, tap each a few times, pick a number. Not linked from anywhere.
import { useCallback } from "react";

const glyph = (
  <svg width="30" height="30" viewBox="0 0 44 44" aria-hidden="true">
    <path d="M20.5 40 L21.5 26 L23.5 26 L24.5 40 Z" fill="#a08b6d" />
    <circle cx="22" cy="19" r="9" fill="#4c9e63" /><circle cx="15" cy="22" r="6" fill="#3f8f58" /><circle cx="29" cy="21" r="6.4" fill="#2f7d52" /><circle cx="18" cy="13" r="5" fill="#67b478" />
  </svg>
);

function Row({ cls, n, title, sub, onPointerDown }) {
  return (
    <div className={`row ${cls}`} onPointerDown={onPointerDown}>
      <span style={{ flexShrink: 0, display: "flex" }}>{glyph}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--text)" }}>{title}</div>
        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{sub}</div>
      </div>
      <div style={{ marginLeft: "auto", flexShrink: 0, display: "grid", gridTemplateColumns: "54px 42px", columnGap: 4, alignItems: "baseline" }}>
        <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>1.7k</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--up)" }}>▲26%</span>
      </div>
      <span className="chev" style={{ color: "var(--border-strong)", fontSize: 14 }}>›</span>
    </div>
  );
}

export default function TapSampler() {
  const ripple = useCallback(e => {
    const host = e.currentTarget;
    const r = host.getBoundingClientRect();
    const s = document.createElement("span");
    s.className = "ink";
    s.style.left = (e.clientX - r.left) + "px";
    s.style.top = (e.clientY - r.top) + "px";
    host.appendChild(s);
    setTimeout(() => s.remove(), 430);
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: "#fdfdfb", padding: "18px 20px 40px", maxWidth: 480, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 700, color: "var(--text)" }}>Tap sampler</div>
      <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 3, marginBottom: 16 }}>Five press feelings. Tap each a few times, pick a number.</div>

      <div className="lbl">1 · Press-in <span>the one live now — quick squash, quick back</span></div>
      <Row cls="opt1" title="Booter · HALF KEG" sub="21 accounts" />

      <div className="lbl">2 · Springback <span>squash, then a tiny overshoot on release</span></div>
      <Row cls="opt2" title="Booter · HALF KEG" sub="21 accounts" />

      <div className="lbl">3 · Ink wash <span>a soft green wash blooms from your finger</span></div>
      <Row cls="opt3" title="Booter · HALF KEG" sub="21 accounts" onPointerDown={ripple} />

      <div className="lbl">4 · Lift <span>the card rises to meet you, shadow deepens</span></div>
      <Row cls="opt4" title="Booter · HALF KEG" sub="21 accounts" />

      <div className="lbl">5 · Nudge <span>barely-there squash + the chevron leads the way</span></div>
      <Row cls="opt5" title="Booter · HALF KEG" sub="21 accounts" />

      <style>{`
        .lbl { font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--text-3); margin: 18px 0 7px; }
        .lbl span { text-transform: none; letter-spacing: 0; font-weight: 500; margin-left: 6px; }
        .row { position: relative; overflow: hidden; background: var(--surface); border: 0.5px solid var(--border); border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; }
        .opt1 { transition: transform .12s cubic-bezier(.3,.7,.4,1); }
        .opt1:active { transform: scale(.985); }
        .opt2 { transition: transform .28s cubic-bezier(.34,1.56,.64,1); }
        .opt2:active { transform: scale(.975); transition: transform .09s ease-out; }
        .opt3 .ink, .ink { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: rgba(63,110,74,.16); transform: translate(-50%,-50%) scale(1); animation: inkGrow .42s ease-out forwards; pointer-events: none; }
        @keyframes inkGrow { to { transform: translate(-50%,-50%) scale(26); opacity: 0; } }
        .opt4 { transition: transform .16s ease, box-shadow .16s ease; }
        .opt4:active { transform: translateY(-1.5px); box-shadow: 0 10px 18px -12px rgba(40,70,50,.45); }
        .opt5 { transition: transform .14s ease; }
        .opt5:active { transform: scale(.995); }
        .opt5 .chev { transition: transform .14s ease, color .14s ease; }
        .opt5:active .chev { transform: translateX(3px); color: var(--accent-deep); }
      `}</style>
    </div>
  );
}
