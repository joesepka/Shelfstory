"use client";
// The Grove "plant language" — one account's health as a tree glyph.
// Maps an account headline to a plant state; size is set by the caller (volume).
const SOIL = "#9a7b52", LEAF = "#4a9068", LEAFLT = "#6aa06a", GOLD = "#c2922e", RUST = "#b0573a", SAP = "#7bc49a", FRUIT = "#cfe6c0";

export function plantState(headline) {
  const h = String(headline || "").toLowerCase().trim();
  if (h === "new") return "sapling";                                   // young & bright
  if (h === "accelerating") return "thriving";                         // full lush canopy
  if (h === "lapsed") return "bare";                                   // leafless
  if (h === "at-risk" || h === "atrisk" || h === "at risk" || h === "decelerating") return "wilting"; // yellowing
  return "bearing";                                                    // steady canopy (stable)
}
export const stateWord = { thriving: "thriving", bearing: "bearing", wilting: "wilting", bare: "bare", sapling: "sapling" };
export const stateColor = { thriving: LEAF, bearing: LEAFLT, wilting: GOLD, bare: RUST, sapling: "#3d6e93" };

export default function TreeGlyph({ headline, h = 42, state }) {
  const st = state || plantState(headline);
  const G = { width: Math.round((h * 30) / 42), height: h, display: "block", flexShrink: 0 };
  if (st === "thriving") return <svg style={G} viewBox="0 0 30 42"><rect x="13.5" y="22" width="3" height="20" fill={SOIL} /><circle cx="15" cy="16" r="14" fill={LEAF} /><circle cx="10" cy="14" r="1.5" fill={FRUIT} /><circle cx="19.5" cy="18" r="1.5" fill={FRUIT} /><circle cx="15" cy="9.5" r="1.5" fill={FRUIT} /></svg>;
  if (st === "bearing") return <svg style={G} viewBox="0 0 30 42"><rect x="13.5" y="26" width="3" height="16" fill={SOIL} /><circle cx="15" cy="20" r="11" fill={LEAFLT} /></svg>;
  if (st === "wilting") return <svg style={G} viewBox="0 0 30 42"><rect x="13.5" y="24" width="3" height="18" fill={SOIL} /><path d="M15 24 q-12 -2 -13 7 q12 1 13 -7" fill={GOLD} /><path d="M15 26 q12 0 13 9 q-12 0 -13 -9" fill={GOLD} /><circle cx="3" cy="38" r="1.3" fill={GOLD} /></svg>;
  if (st === "bare") return <svg style={G} viewBox="0 0 30 42"><rect x="13.5" y="20" width="3" height="22" fill={SOIL} /><line x1="15" y1="22" x2="5" y2="11" stroke={SOIL} strokeWidth="2" /><line x1="15" y1="24" x2="25" y2="13" stroke={SOIL} strokeWidth="2" /><circle cx="8" cy="38" r="1.3" fill={RUST} /></svg>;
  return <svg style={G} viewBox="0 0 30 42"><rect x="13.5" y="16" width="3" height="26" fill={SOIL} /><circle cx="15" cy="12" r="8" fill={SAP} /><circle cx="15" cy="12" r="3.5" fill="#fff" fillOpacity="0.4" /></svg>;
}
