"use client";
import { useRef, useState, useCallback } from "react";

// Reusable "explode out" click transition, extracted from app/perf/page.js.
// On burst(): the clicked item scales up + fades ("explodes"), every other
// item fades away, then `done` fires (~440ms) to navigate. styleFor(key)
// returns the inline transform/opacity for each item given its unique key.
export function useExplode() {
  const [pop, setPop] = useState(null);
  const animating = useRef(false);

  const burst = useCallback((key, done) => {
    if (animating.current) return;
    animating.current = true;
    setPop({ key, phase: "out" });            // others fade immediately
    setTimeout(() => setPop({ key, phase: "boom" }), 170); // clicked one blows up
    setTimeout(() => { if (done) done(); }, 440);          // navigate
  }, []);

  const styleFor = useCallback((key) => {
    if (!pop) return null;
    const me = pop.key === key;
    let tf = "scale(1)", op = 1, dur = ".18s", z = 1;
    if (me) {
      if (pop.phase === "boom") { tf = "scale(2.2)"; op = 0; dur = ".26s"; z = 6; }
      else { z = 6; }
    } else {
      op = 0; tf = "scale(.97)";
    }
    return { transform: tf, opacity: op, zIndex: z, transition: `transform ${dur} ease, opacity .2s ease` };
  }, [pop]);

  return { pop, burst, styleFor };
}
