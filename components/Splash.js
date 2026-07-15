"use client";
import LogoMark from "./LogoMark";

// The loading logo, shown while a page fetches. It's the SAME mark as the app-open
// splash, just grey — the climbing line draws itself and the leaves sprout, then it
// loops. `fixed` (default true) = full overlay; fixed={false} fills its container.
export default function Splash({ fixed = true }) {
  const outer = fixed
    ? { position: "fixed", inset: 0, zIndex: 50 }
    : { position: "absolute", inset: 0 };
  return (
    <div role="status" aria-label="Loading" style={{ ...outer, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="lmLoad" style={{ opacity: 0.9 }}>
        <LogoMark size={fixed ? 84 : 66} grey />
      </div>
      <style>{`
        .lmLoad .lm-line{stroke-dasharray:30;stroke-dashoffset:30;animation:lmDrawLoop 1.9s ease-in-out infinite;}
        .lmLoad .lm-leaf{opacity:0;transform-box:fill-box;transform-origin:center;animation:lmLeafLoop 1.9s ease-in-out infinite;}
        @keyframes lmDrawLoop{0%{stroke-dashoffset:30}42%{stroke-dashoffset:0}72%{stroke-dashoffset:0}100%{stroke-dashoffset:30}}
        @keyframes lmLeafLoop{0%,28%{opacity:0;transform:scale(.4)}48%{opacity:1;transform:scale(1)}72%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.4)}}
        @media (prefers-reduced-motion: reduce){.lmLoad .lm-line{stroke-dashoffset:0;animation:none}.lmLoad .lm-leaf{opacity:1;animation:none}}
      `}</style>
    </div>
  );
}
