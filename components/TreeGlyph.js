"use client";
// ShelfStory — an account's health drawn as a small tree.
// Health now reads on a 7-beat arc: flowering (hot new) → fruiting (accelerating)
// → thriving → steady → slipping → wilting → bare (lapsed). The ART STYLE follows
// the active skin (classic / cupertino / rounded / clusters / bubble); the same
// state+fullness drives every style. Pure-SVG art lives in treeArt.js.
import { useId } from "react";
import { useTheme } from "../lib/theme";
import { accountArt, tierArt, VB, RAMP, NEW_COLOR, LAPSED_COLOR } from "./treeArt";

const norm = h => String(h || "").toLowerCase().trim();

// headline (+ momentum) → one of 10 states along the health ramp
export function plantState(headline, pct) {
  const h = norm(headline);
  if (h === "lapsed") return "lapsed";
  if (h === "new") return "new";
  if (h === "stable") return "steady";   // a stable account always reads green, never yellow
  if (pct != null) {
    if (h === "accelerating" || pct >= 28) return "accelerating";
    if (pct >= 15) return "thriving";
    if (pct >= 5) return "growing";
    if (pct >= -3) return "steady";
    if (h === "at-risk" || h === "atrisk" || h === "at risk") return pct <= -22 ? "declining" : "atrisk";
    if (pct >= -10) return "softening";
    if (pct >= -20) return "slipping";
    if (pct >= -32) return "atrisk";
    return "declining";
  }
  if (h === "accelerating") return "accelerating";
  if (h === "at-risk" || h === "atrisk" || h === "at risk") return "atrisk";
  if (h === "decelerating") return "softening";
  return "steady";
}

// canopy fullness 0..1 — steps down across the ramp (size reinforces color)
const VIT = { accelerating: 0.94, thriving: 0.82, growing: 0.7, steady: 0.56, softening: 0.46, slipping: 0.36, atrisk: 0.26, declining: 0.16 };
export function vit(st, pct) {
  if (st === "lapsed") return 0;
  if (st === "new") return 0.6;
  const base = VIT[st] != null ? VIT[st] : 0.55;
  return pct == null ? base : Math.max(0.12, Math.min(1, base + Math.max(-0.05, Math.min(0.05, pct / 600))));
}

// user-facing labels + accent colors per state
export const stateLabel = { new: "New", accelerating: "Accelerating", thriving: "Thriving", growing: "Growing", steady: "Steady", softening: "Softening", slipping: "Slipping", atrisk: "At risk", declining: "Declining", lapsed: "Lapsed" };
export const stateColor = { new: NEW_COLOR, ...RAMP, lapsed: LAPSED_COLOR };

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
