"use client";
// Remembered cross-page scope: the state the user swiped to on home. Each section
// reads this on entry and pre-filters to it. Cleared when home is set back to "All".
const KEY = "ssScopeState";

export function getScope() {
  try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
}
export function setScope(v) {
  try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* no-op */ }
}

// The remembered scope is a state code ("IL") or a city ("CITY:Naperville"). Always read it
// through this — handing a city key to a state filter matches nothing and empties the page.
export function parseScope() {
  const v = getScope();
  if (!v) return { kind: null, value: "" };
  if (v.startsWith("CITY:")) return { kind: "city", value: v.slice(5) };
  return { kind: "state", value: v };
}

// Which label the whole app is reading: "BLIND CORNER" | "TORCH" | "" (both).
// Mirrors the desktop's parent filter so the two apps can be compared like for like.
const LKEY = "ssLabel";
export const LABELS = [["", "All labels"], ["BLIND CORNER", "Blind Corner"], ["TORCH", "Torch"]];
export function getLabel() {
  try { return localStorage.getItem(LKEY) || ""; } catch { return ""; }
}
export function setLabel(v) {
  try { if (v) localStorage.setItem(LKEY, v); else localStorage.removeItem(LKEY); } catch { /* no-op */ }
}
