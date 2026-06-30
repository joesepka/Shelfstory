"use client";
// ShelfStory — an account's health drawn as a small tree.
// Health now reads on a 7-beat arc: flowering (hot new) → fruiting (accelerating)
// → thriving → steady → slipping → wilting → bare (lapsed). The ART STYLE follows
// the active skin (classic / cupertino / rounded / clusters / bubble); the same
// state+fullness drives every style. Pure-SVG art lives in treeArt.js.
import { useId } from "react";
import { useTheme } from "../lib/theme";
import { accountArt, tierArt, VB } from "./treeArt";

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
const norm = h => String(h || "").toLowerCase().trim();

// headline (+ momentum) → one of the 7 states
export function plantState(headline, pct) {
  const h = norm(headline);
  if (h === "lapsed") return "bare";
  if (h === "new") return "flowering";
  if (h === "accelerating") return pct != null && pct >= 30 ? "fruiting" : "thriving";
  if (h === "at-risk" || h === "atrisk" || h === "at risk") return "wilting";
  if (h === "decelerating") return "slipping";
  if (pct != null) {
    if (pct >= 30) return "fruiting";
    if (pct >= 8) return "thriving";
    if (pct <= -12) return "wilting";
    if (pct < 0) return "slipping";
  }
  return "steady";
}

// canopy fullness 0..1 — graded within each state by momentum
export function vit(st, pct) {
  if (st === "bare") return 0;
  const base = { flowering: 0.68, fruiting: 0.9, thriving: 0.8, steady: 0.55, slipping: 0.4, wilting: 0.24 }[st];
  if (pct == null) return base;
  if (st === "fruiting") return clamp(0.82 + (pct - 30) / 200, 0.82, 1);
  if (st === "thriving") return clamp(0.62 + pct / 120, 0.6, 0.86);
  if (st === "flowering") return clamp(0.6 + (pct > 0 ? pct / 120 : 0), 0.55, 0.82);
  if (st === "steady") return clamp(0.5 + pct / 300, 0.45, 0.62);
  if (st === "slipping") return clamp(0.45 + pct / 70, 0.32, 0.5);
  if (st === "wilting") return clamp(0.34 + pct / 60, 0.14, 0.34);
  return base;
}

// user-facing labels + accent colors per state
export const stateLabel = { flowering: "New", fruiting: "Accelerating", thriving: "Growing", steady: "Steady", slipping: "Cooling", wilting: "At risk", bare: "Lapsed" };
export const stateColor = { flowering: "#5bb47e", fruiting: "#3f8a5e", thriving: "#4a9068", steady: "#6aa06a", slipping: "#9aa05a", wilting: "#c2922e", bare: "#b0573a" };

// coarse 5-bucket map for the home tier rollup (keeps page.js math stable)
export function tierBucket(headline) {
  const h = norm(headline);
  if (h === "new") return "sapling";
  if (h === "accelerating") return "thriving";
  if (h === "lapsed") return "bare";
  if (h === "at-risk" || h === "atrisk" || h === "at risk" || h === "decelerating") return "wilting";
  return "bearing";
}

export default function TreeGlyph({ headline, pct, h = 40, state }) {
  const { theme } = useTheme();
  const id = useId().replace(/[:]/g, "");
  const st = state || plantState(headline, pct);
  const f = vit(st, pct);
  const W = Math.round((h * 60) / 62);
  return (
    <svg width={W} height={h} viewBox={VB} style={{ display: "block", flexShrink: 0 }} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: accountArt(theme, st, f, id) }} />
  );
}

// TierTree: a single emblem tree for a whole tier — graded by `t` (vitality) and
// carrying the tier `color`, rendered in the active skin's style.
export function TierTree({ t = 0.6, color = "#4a9068", h = 88 }) {
  const { theme } = useTheme();
  const id = useId().replace(/[:]/g, "");
  const W = Math.round((h * 60) / 62);
  return (
    <svg width={W} height={h} viewBox={VB} style={{ display: "block" }} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: tierArt(theme, t, color, id) }} />
  );
}
