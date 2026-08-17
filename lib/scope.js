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
  if (v.startsWith("REP:")) return { kind: "rep", value: v.slice(4) };
  return { kind: "state", value: v };
}

// A remembered scope can outlive the data: territories were re-cut in Aug 2026
// (West / Near City / Northshore / Far West → North / Central / South / House), so a
// phone still holding "REP:West" would filter every screen down to nothing. Hand this
// the freshly loaded account rows; if the saved scope matches none of them it's stale —
// forget it and read as unscoped instead of showing an empty book.
export function pruneScope(rows) {
  const s = parseScope();
  if (!s.kind || !rows || !rows.length) return s;
  const hit = s.kind === "rep" ? rows.some(r => (r.sales_rep || "Unassigned") === s.value)
    : s.kind === "city" ? rows.some(r => r.city === s.value)
      : rows.some(r => r.state === s.value);
  if (hit) return s;
  setScope("");
  return { kind: null, value: "" };
}

// Which label the whole app is reading: "BLIND CORNER" | "TORCH" | "" (both).
// Mirrors the desktop's parent filter so the two apps can be compared like for like.
const LKEY = "ssLabel";
// ONE label at a time — Blind Corner or Torch, never both (Joe, 2026-08-17)
export const LABELS = [["BLIND CORNER", "Blind Corner"], ["TORCH", "Torch"]];
export function getLabel() {
  // Never-set (null) defaults to BLIND CORNER; an explicit "All labels" choice is
  // stored as "" and respected — so distinguish null from the empty string.
  try {
    const v = localStorage.getItem(LKEY);
    return v === null ? "BLIND CORNER" : v;
  } catch { return "BLIND CORNER"; }
}
export function setLabel(v) {
  // Always store — setLabel("") records the empty string so "All labels" sticks.
  try { localStorage.setItem(LKEY, v ?? ""); } catch { /* no-op */ }
}
