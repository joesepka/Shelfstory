"use client";
import { useRef, useState, useCallback } from "react";

// Reusable tap-to-navigate transition. On burst(): the tapped item gives a
// subtle lift, the rest of the screen recedes, then `done` fires (~300ms) to
// navigate — the destination fades in via .pagefade. Deliberately restrained:
// a confident press, not a fireworks "explosion". styleFor(key) returns the
// inline transform/opacity for each item given its unique key.
export function useExplode() {
  const [pop, setPop] = useState(null);
  const animating = useRef(false);

  const burst = useCallback((key, done) => {
    if (animating.current) return;
    animating.current = true;
    setPop({ key, phase: "out" });                          // rest recedes, tapped lifts
    setTimeout(() => setPop({ key, phase: "boom" }), 120);  // tapped fades through
    setTimeout(() => { if (done) done(); }, 300);           // navigate
  }, []);

  const styleFor = useCallback((key) => {
    if (!pop) return null;
    const me = pop.key === key;
    let tf = "scale(1)", op = 1, dur = ".16s", z = 1;
    if (me) {
      if (pop.phase === "boom") { tf = "scale(1.05)"; op = 0; dur = ".22s"; z = 5; }
      else { tf = "scale(1.03)"; z = 5; }
    } else {
      op = 0.25; tf = "scale(.99)";
    }
    return { transform: tf, opacity: op, zIndex: z, transition: `transform ${dur} cubic-bezier(.4,0,.2,1), opacity .2s ease` };
  }, [pop]);

  return { pop, burst, styleFor };
}
