"use client";
// Landing "choose your style" screen — shown on each fresh load before the app
// boots. Each card previews the tree in that skin; tapping it applies the skin
// and continues into ShelfStory.
import { useTheme, THEMES } from "../lib/theme";
import { accountArt, VB } from "./treeArt";

export default function ThemeChooser({ onChoose }) {
  const { setTheme } = useTheme();
  function pick(k) { setTheme(k); onChoose && onChoose(k); }
  return (
    <div className="ssChooser" style={{
      position: "fixed", inset: 0, zIndex: 200, overflowY: "auto",
      background: "linear-gradient(180deg,#b6dcf1 0px,#cce4f4 130px,#d7e6df 360px,#f6f7f4 560px)",
      fontFamily: "var(--font-sans)",
    }}>
      <style>{`
        .ssChooser{animation:ssCfade .4s ease both;}
        @keyframes ssCfade{from{opacity:0}to{opacity:1}}
        .ssCcard{animation:ssCrise .5s cubic-bezier(.2,.7,.2,1) both;}
        @keyframes ssCrise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .ssCcard:active{transform:scale(.96);}
        .ssCcard{transition:transform .12s, box-shadow .15s, border-color .15s;}
        @media(hover:hover){.ssCcard:hover{border-color:#bcd4c2;box-shadow:0 10px 26px rgba(30,45,25,.16);}}
      `}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "54px 24px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 600, color: "#1f3326", letterSpacing: "-0.5px" }}>ShelfStory</div>
          <div style={{ fontSize: 14, color: "#5a6a50", marginTop: 6 }}>Pick your tree. Tap one to begin.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {THEMES.map((t, i) => (
            <button key={t.key} onClick={() => pick(t.key)} className="ssCcard" type="button"
              style={{
                animationDelay: `${0.05 + i * 0.06}s`,
                cursor: "pointer", textAlign: "center", border: "1px solid #e2e4df",
                background: "#fff", borderRadius: 16, padding: "16px 10px 13px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                fontFamily: "inherit", boxShadow: "0 2px 8px rgba(40,55,35,.06)",
                gridColumn: i === THEMES.length - 1 && THEMES.length % 2 ? "1 / span 2" : "auto",
              }}>
              <svg width="66" height="68" viewBox={VB} aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: accountArt(t.key, "accelerating", 0.96, "ch" + i) }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.3 }}>{t.blurb}</div>
            </button>
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 11.5, color: "#85937a", marginTop: 18 }}>You can switch styles anytime by reloading.</div>
      </div>
    </div>
  );
}
