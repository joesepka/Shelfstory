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
